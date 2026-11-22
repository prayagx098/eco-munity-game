import crypto from 'crypto'
import * as store from './store.js'

/**
 * Accounts for the Eco-munity relay: register / log in with a nickname + password.
 * No email or real name is collected. Passwords are stored only as salted scrypt hashes; a login gives a random
 * session token (only its SHA-256 hash is stored) that the browser sends as "Authorization: Bearer <token>".
 *
 * Each user document keeps that player's saved game: profile (look), wallet (coins, items, projects ...), badges and story.
 */

const SESSION_DAYS = 30
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

const scrypt = (password, salt) =>
  new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))))

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  return `scrypt$${salt.toString('hex')}$${(await scrypt(password, salt)).toString('hex')}`
}
async function verifyPassword(password, stored) {
  const [kind, saltHex, hashHex] = String(stored).split('$')
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'))
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

/* very small in-memory rate limiter (per IP / per account name) */
const hits = new Map()
function limited(key, max, windowMs) {
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (list.length >= max) {
    hits.set(key, list)
    return true
  }
  list.push(now)
  hits.set(key, list)
  return false
}
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of hits) if (!v.some((t) => now - t < 3600_000)) hits.delete(k)
}, 600_000).unref()

const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()

function readBody(req, limit = 40000) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > limit) {
        reject(new Error('too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('bad json'))
      }
    })
    req.on('error', reject)
  })
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
const COLOR = /^#[0-9a-fA-F]{6}$/

/** keep only the saved-game shape we expect (and a size cap) before it goes into the database */
export function sanitizeData(d) {
  if (!d || typeof d !== 'object') return null
  const out = {}
  if (d.profile && typeof d.profile === 'object') {
    out.profile = {
      name: str(d.profile.name, 14) || 'Eco Hero',
      shirt: COLOR.test(d.profile.shirt) ? d.profile.shirt : '#3b82f6',
      hair: COLOR.test(d.profile.hair) ? d.profile.hair : '#7c3f12',
      pants: COLOR.test(d.profile.pants) ? d.profile.pants : '#1e3a8a',
    }
  }
  if (d.wallet && typeof d.wallet === 'object') {
    const w = d.wallet
    if (JSON.stringify(w).length > 30000) return null
    out.wallet = {
      coins: Number.isFinite(w.coins) ? Math.max(0, Math.min(10_000_000, Math.floor(w.coins))) : 0,
      owned: Array.isArray(w.owned) ? w.owned.filter((x) => typeof x === 'string').slice(0, 300) : [],
      equipped: w.equipped && typeof w.equipped === 'object' ? w.equipped : {},
      base: w.base && typeof w.base === 'object' ? w.base : null,
      paid: Array.isArray(w.paid) ? w.paid.filter((x) => typeof x === 'string').slice(0, 500) : [],
      inv: w.inv && typeof w.inv === 'object' ? w.inv : {},
      projects: Array.isArray(w.projects) ? w.projects.slice(0, 60) : [],
      built: Array.isArray(w.built) ? w.built.filter((x) => typeof x === 'string').slice(0, 200) : [],
      daily: w.daily && typeof w.daily === 'object' ? w.daily : null,
    }
  }
  const meta = sanitizeMeta(d.meta)
  if (meta) out.meta = meta
  if (Array.isArray(d.badges)) out.badges = d.badges.filter((x) => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 100)
  return out
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const ID = /^[a-z0-9-]{1,24}$/
const int = (v, min, max) => (Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : min)
const idList = (a, n) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && ID.test(x)).slice(0, n) : [])

/** a player's missions / streak / tree record / home – only the shapes and ranges the game uses */
export function sanitizeMeta(m) {
  if (!m || typeof m !== 'object') return null
  const out = {
    day: DAY.test(m.day) ? m.day : '',
    missions: Array.isArray(m.missions)
      ? m.missions
          .filter((x) => x && typeof x.id === 'string' && ID.test(x.id))
          .slice(0, 5)
          .map((x) => ({ id: x.id, n: int(x.n, 1, 50), got: int(x.got, 0, 50), coins: int(x.coins, 0, 100), claimed: !!x.claimed }))
      : [],
    streak: {
      count: int(m.streak?.count, 0, 3650),
      best: int(m.streak?.best, 0, 3650),
      lastDay: DAY.test(m.streak?.lastDay) ? m.streak.lastDay : '',
      paid: int(m.streak?.paid, 0, 3650),
    },
    week: { key: DAY.test(m.week?.key) ? m.week.key : '', done: int(m.week?.done, 0, 100), claimed: !!m.week?.claimed },
    forest: { planted: int(m.forest?.planted, 0, 1_000_000), harvested: int(m.forest?.harvested, 0, 1_000_000) },
    home: {
      house: typeof m.home?.house === 'string' && /^house-\d{1,2}$/.test(m.home.house) ? m.home.house : null,
      decor: {
        wall: typeof m.home?.decor?.wall === 'string' && ID.test(m.home.decor.wall) ? m.home.decor.wall : undefined,
        roof: typeof m.home?.decor?.roof === 'string' && ID.test(m.home.decor.roof) ? m.home.decor.roof : undefined,
        door: typeof m.home?.decor?.door === 'string' && ID.test(m.home.decor.door) ? m.home.decor.door : undefined,
        extras: idList(m.home?.decor?.extras, 8),
      },
      owned: idList(m.home?.owned, 60),
    },
  }
  return out
}

export function sanitizeStory(s) {
  if (!s || typeof s !== 'object') return null
  const STAGES = ['new', 'intro', 'active', 'outro', 'finished']
  if (!STAGES.includes(s.stage)) return null
  const chapter = Number.isInteger(s.chapter) ? Math.max(0, Math.min(20, s.chapter)) : 0
  const strs = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 40) : [])
  let base = null
  if (s.base && typeof s.base === 'object') {
    base = {}
    for (const [k, v] of Object.entries(s.base).slice(0, 30)) if (/^[a-zA-Z]{1,20}$/.test(k) && Number.isFinite(v)) base[k] = v
  }
  return {
    chapter,
    stage: s.stage,
    base,
    baseDelivered: Number.isFinite(s.baseDelivered) ? s.baseDelivered : 0,
    seen: strs(s.seen),
    startZone: typeof s.startZone === 'string' ? s.startZone.slice(0, 40) : null,
    completed: strs(s.completed),
  }
}

/** the logged-in user for a request, or null */
export async function userOf(req) {
  const m = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(req.headers.authorization || '')
  if (!m) return null
  const hash = sha256(m[1])
  const session = await store.findSession(hash)
  if (!session) return null
  const user = await store.findUserById(session.userId)
  return user ? { user, hash } : null
}

/** the user behind a raw bearer token (used by the WebSocket join), or null */
export async function userByToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null
  const session = await store.findSession(sha256(token))
  if (!session) return null
  return (await store.findUserById(session.userId)) || null
}

const publicUser = (u) => ({ id: u._id, username: u.username, createdAt: u.createdAt })

async function startSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  await store.createSession({ _id: sha256(token), userId, createdAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000) })
  return token
}

/** handles /api/auth/* and /api/me*. Returns true when the request was handled. */
export async function handleAuth(req, res, pathname) {
  if (!pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/me')) return false
  const json = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }
  try {
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      if (limited(`reg:${ipOf(req)}`, 20, 3600_000)) return json(429, { error: 'Too many sign-ups from this network. Try again later.' }), true
      const b = await readBody(req)
      const username = str(b.username, 40).trim().toLowerCase()
      const password = str(b.password, 100)
      if (!USERNAME_RE.test(username)) return json(400, { error: 'Nickname must be 3–20 letters, numbers or _ (no spaces).' }), true
      if (password.length < 6) return json(400, { error: 'Password must be at least 6 characters.' }), true
      const user = { _id: crypto.randomUUID(), username, pass: await hashPassword(password), createdAt: new Date(), data: {}, story: null }
      // keep progress a child made as a guest on this device
      if (typeof b.guestPid === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(b.guestPid)) user.story = await store.loadStory(b.guestPid).catch(() => null)
      if (b.guestData) user.data = sanitizeData(b.guestData) ?? {}
      if (!(await store.createUser(user))) return json(409, { error: 'That nickname is taken. Try another.' }), true
      return json(200, { token: await startSession(user._id), user: publicUser(user), data: user.data, story: user.story }), true
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const b = await readBody(req)
      const username = str(b.username, 40).trim().toLowerCase()
      const password = str(b.password, 100)
      if (limited(`login-ip:${ipOf(req)}`, 40, 600_000) || limited(`login:${username}`, 8, 600_000)) return json(429, { error: 'Too many tries. Wait a few minutes and try again.' }), true
      const user = USERNAME_RE.test(username) ? await store.findUserByName(username) : null
      // always hash, so the response time does not reveal whether the nickname exists
      const ok = user ? await verifyPassword(password, user.pass) : (await verifyPassword(password, 'scrypt$00$00'), false)
      if (!user || !ok) return json(401, { error: 'Wrong nickname or password.' }), true
      return json(200, { token: await startSession(user._id), user: publicUser(user), data: user.data ?? {}, story: user.story ?? null }), true
    }

    // everything below needs a valid session
    const auth = await userOf(req)
    if (!auth) return json(401, { error: 'Please log in again.' }), true
    const { user, hash } = auth

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      await store.deleteSession(hash)
      return json(200, { ok: true }), true
    }
    // "log out of all other devices": every other login of this account is ended (this one stays)
    if (pathname === '/api/me/logout-others' && req.method === 'POST') {
      await store.deleteOtherSessions(user._id, hash)
      return json(200, { ok: true }), true
    }
    if (pathname === '/api/me' && req.method === 'GET') return json(200, { user: publicUser(user), data: user.data ?? {}, story: user.story ?? null }), true
    if (pathname === '/api/me/data' && req.method === 'PUT') {
      const b = await readBody(req)
      const data = sanitizeData(b.data)
      if (!data) return json(400, { error: 'bad data' }), true
      await store.updateUser(user._id, { data: { ...(user.data ?? {}), ...data }, updatedAt: new Date() })
      return json(200, { ok: true }), true
    }
    if (pathname === '/api/me/story' && req.method === 'PUT') {
      const b = await readBody(req)
      const story = sanitizeStory(b.state)
      if (!story) return json(400, { error: 'bad story state' }), true
      await store.updateUser(user._id, { story, updatedAt: new Date() })
      return json(200, { ok: true }), true
    }
    if (pathname === '/api/me/password' && req.method === 'POST') {
      const b = await readBody(req)
      if (limited(`pw:${user._id}`, 8, 600_000)) return json(429, { error: 'Too many tries. Wait a few minutes.' }), true
      if (!(await verifyPassword(str(b.oldPassword, 100), user.pass))) return json(401, { error: 'Your current password is wrong.' }), true
      const next = str(b.newPassword, 100)
      if (next.length < 6) return json(400, { error: 'New password must be at least 6 characters.' }), true
      await store.updateUser(user._id, { pass: await hashPassword(next) })
      await store.deleteOtherSessions(user._id, hash)
      return json(200, { ok: true }), true
    }
    if (pathname === '/api/me' && req.method === 'DELETE') {
      const b = await readBody(req)
      if (limited(`del:${user._id}`, 5, 600_000)) return json(429, { error: 'Too many tries. Wait a few minutes.' }), true
      if (!(await verifyPassword(str(b.password, 100), user.pass))) return json(401, { error: 'Wrong password.' }), true
      await store.deleteUser(user._id)
      return json(200, { ok: true }), true
    }
    return json(404, { error: 'not found' }), true
  } catch (err) {
    if (err.message === 'bad json' || err.message === 'too large') return json(400, { error: err.message }), true
    console.error('⚠️ [Auth] error:', err.message)
    return json(503, { error: 'Server problem. Please try again.' }), true
  }
}
