import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { MongoClient } from 'mongodb'

/**
 * Persistence for the relay server.
 *  - With MONGODB_URI set (Render env var, or a local .env file) everything lives in MongoDB Atlas:
 *      collection "rooms"  – the live world snapshot of every room
 *      collection "story"  – each player's story progress
 *  - Without it (plain local development) it falls back to JSON files under ./data
 * The connection string is a secret: it is read from the environment only and is never sent to the browser.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
try {
  process.loadEnvFile(path.join(__dirname, '.env'))
} catch {
  /* no .env file: use real environment variables */
}

const URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB || 'ecomunity'
const ROOM_DIR = path.join(__dirname, 'data', 'rooms')
const STORY_DIR = path.join(__dirname, 'data', 'story')

export const usingMongo = !!URI

let clientPromise = null
function db() {
  if (!clientPromise) {
    const client = new MongoClient(URI, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
    clientPromise = client
      .connect()
      .then(async (c) => {
        const d = c.db(DB_NAME)
        await d.collection('story').createIndex({ updatedAt: 1 }).catch(() => {})
        console.log(`🍃 [MongoDB] Connected, database "${DB_NAME}"`)
        return d
      })
      .catch((err) => {
        clientPromise = null // try again next time
        if (/ssl|tls|ReplicaSetNoPrimary|ServerSelection/i.test(err.message)) {
          console.error('⚠️ [MongoDB] Cannot reach Atlas. This is almost always the Network Access list: in Atlas open Security → Network Access and allow 0.0.0.0/0 (Render has no fixed IP).')
        }
        throw err
      })
  }
  return clientPromise
}

const readJson = (file) => {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null
  } catch {
    return null
  }
}
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data), 'utf-8')
  fs.renameSync(tmp, file)
}

export async function connect() {
  if (!usingMongo) {
    console.log(`📁 [Storage] No MONGODB_URI set – using local JSON files in ${path.join(__dirname, 'data')}`)
    return
  }
  try {
    await db()
  } catch (err) {
    console.error('⚠️ [MongoDB] Could not connect:', err.message)
  }
}

export async function loadWorld(name) {
  if (!usingMongo) return readJson(path.join(ROOM_DIR, `${name}.json`))
  const doc = await (await db()).collection('rooms').findOne({ _id: name })
  return doc?.world ?? null
}

export async function saveWorld(name, world) {
  if (!usingMongo) return writeJson(path.join(ROOM_DIR, `${name}.json`), world)
  await (await db()).collection('rooms').updateOne({ _id: name }, { $set: { world, updatedAt: new Date() } }, { upsert: true })
}

export async function deleteWorld(name) {
  if (!usingMongo) {
    fs.rmSync(path.join(ROOM_DIR, `${name}.json`), { force: true })
    return
  }
  await (await db()).collection('rooms').deleteOne({ _id: name })
}

export async function loadStory(pid) {
  if (!usingMongo) return readJson(path.join(STORY_DIR, `${pid}.json`))
  const doc = await (await db()).collection('story').findOne({ _id: pid })
  return doc?.state ?? null
}

export async function saveStory(pid, state) {
  if (!usingMongo) return writeJson(path.join(STORY_DIR, `${pid}.json`), state)
  await (await db()).collection('story').updateOne({ _id: pid }, { $set: { state, updatedAt: new Date() } }, { upsert: true })
}

export async function deleteStory(pid) {
  if (!usingMongo) {
    fs.rmSync(path.join(STORY_DIR, `${pid}.json`), { force: true })
    return
  }
  await (await db()).collection('story').deleteOne({ _id: pid })
}

export async function close() {
  if (clientPromise) {
    try {
      await (await clientPromise).client.close()
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Accounts: users (with their saved game data) and login sessions     */
/* ------------------------------------------------------------------ */

const ACCOUNTS_FILE = path.join(__dirname, 'data', 'accounts.json')
let fileAccounts = null
const accountsFile = () => {
  if (!fileAccounts) fileAccounts = readJson(ACCOUNTS_FILE) ?? { users: {}, sessions: {} }
  return fileAccounts
}
const flushAccounts = () => writeJson(ACCOUNTS_FILE, fileAccounts)

let indexed = false
async function accountsDb() {
  const d = await db()
  if (!indexed) {
    indexed = true
    await d.collection('users').createIndex({ username: 1 }, { unique: true }).catch(() => {})
    await d.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {})
    await d.collection('sessions').createIndex({ userId: 1 }).catch(() => {})
  }
  return d
}

/** user = { _id, username, pass, createdAt, data: { profile, wallet, badges }, story } */
export async function findUserByName(username) {
  if (!usingMongo) return Object.values(accountsFile().users).find((u) => u.username === username) ?? null
  return (await accountsDb()).collection('users').findOne({ username })
}
export async function findUserById(id) {
  if (!usingMongo) return accountsFile().users[id] ?? null
  return (await accountsDb()).collection('users').findOne({ _id: id })
}
/** returns false when the username is already taken */
export async function createUser(user) {
  if (!usingMongo) {
    const a = accountsFile()
    if (Object.values(a.users).some((u) => u.username === user.username)) return false
    a.users[user._id] = user
    flushAccounts()
    return true
  }
  try {
    await (await accountsDb()).collection('users').insertOne(user)
    return true
  } catch (err) {
    if (err?.code === 11000) return false
    throw err
  }
}
export async function updateUser(id, set) {
  if (!usingMongo) {
    const a = accountsFile()
    if (a.users[id]) Object.assign(a.users[id], set)
    return flushAccounts()
  }
  await (await accountsDb()).collection('users').updateOne({ _id: id }, { $set: set })
}
export async function deleteUser(id) {
  if (!usingMongo) {
    const a = accountsFile()
    delete a.users[id]
    for (const [h, s] of Object.entries(a.sessions)) if (s.userId === id) delete a.sessions[h]
    return flushAccounts()
  }
  const d = await accountsDb()
  await d.collection('users').deleteOne({ _id: id })
  await d.collection('sessions').deleteMany({ userId: id })
}
export async function createSession(s) {
  if (!usingMongo) {
    accountsFile().sessions[s._id] = s
    return flushAccounts()
  }
  await (await accountsDb()).collection('sessions').insertOne(s)
}
export async function findSession(hash) {
  if (!usingMongo) {
    const s = accountsFile().sessions[hash]
    return s && new Date(s.expiresAt) > new Date() ? s : null
  }
  const s = await (await accountsDb()).collection('sessions').findOne({ _id: hash })
  return s && s.expiresAt > new Date() ? s : null
}
export async function deleteSession(hash) {
  if (!usingMongo) {
    delete accountsFile().sessions[hash]
    return flushAccounts()
  }
  await (await accountsDb()).collection('sessions').deleteOne({ _id: hash })
}
export async function deleteOtherSessions(userId, keepHash) {
  if (!usingMongo) {
    const a = accountsFile()
    for (const [h, s] of Object.entries(a.sessions)) if (s.userId === userId && h !== keepHash) delete a.sessions[h]
    return flushAccounts()
  }
  await (await accountsDb()).collection('sessions').deleteMany({ userId, _id: { $ne: keepHash } })
}
