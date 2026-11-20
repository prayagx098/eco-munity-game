import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer, WebSocket } from 'ws'
import * as store from './store.js'
import { handleAuth, sanitizeStory } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, 'dist')
const PORT = process.env.PORT || 8080

store.connect()

/**
 * In-memory room manager backed by persistent JSON files on disk.
 * Each room stores its live authoritative world snapshot, connected clients, and save timer.
 */
class RoomManager {
  constructor() {
    /** @type {Map<string, { world: any, clients: Set<WebSocket>, saveTimer: any, dirty: boolean, lastSaved: number }>} */
    this.rooms = new Map()
  }

  cleanRoomName(raw) {
    if (!raw || typeof raw !== 'string') return 'default'
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32) || 'default'
  }

  getRoom(rawName) {
    const name = this.cleanRoomName(rawName)
    let room = this.rooms.get(name)
    if (!room) {
      room = {
        name,
        world: null,
        clients: new Set(),
        saveTimer: null,
        dirty: false,
        lastSaved: 0,
        loading: Promise.resolve(),
      }

      // Load the saved world (MongoDB, or local files in development). Players wait for this before they get the world.
      room.loading = store
        .loadWorld(name)
        .then((world) => {
          if (world && !room.world) {
            room.world = world
            console.log(`💾 [Storage] Loaded persistent live data for room "${name}"`)
          }
        })
        .catch((err) => console.error(`⚠️ [Storage] Could not load room "${name}":`, err.message))

      this.rooms.set(name, room)
    }
    return room
  }

  saveRoomImmediate(room) {
    if (!room || !room.world) return
    if (room.saveTimer) {
      clearTimeout(room.saveTimer)
      room.saveTimer = null
    }

    room.dirty = false
    room.lastSaved = Date.now()
    return store
      .saveWorld(room.name, room.world)
      .then(() => console.log(`💾 [Storage] Saved live data for room "${room.name}"`))
      .catch((err) => {
        room.dirty = true
        console.error(`⚠️ [Storage] Failed to save room "${room.name}":`, err.message)
      })
  }

  queueSave(room) {
    room.dirty = true
    if (room.saveTimer) return
    // Debounce save by 1.5 seconds so frequent physics updates don't thrash disk
    room.saveTimer = setTimeout(() => {
      room.saveTimer = null
      this.saveRoomImmediate(room)
    }, 1500)
  }

  resetRoom(rawName) {
    const name = this.cleanRoomName(rawName)
    const room = this.getRoom(name)
    room.world = null
    room.dirty = false
    if (room.saveTimer) {
      clearTimeout(room.saveTimer)
      room.saveTimer = null
    }

    store
      .deleteWorld(name)
      .then(() => console.log(`🧹 [Storage] Reset saved data for room "${name}"`))
      .catch((err) => console.error(`⚠️ [Storage] Failed to reset room "${name}":`, err.message))

    // Broadcast reset to active players
    const resetMsg = JSON.stringify({ t: 'reset', from: 'server' })
    for (const ws of room.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(resetMsg)
      }
    }
  }

  async flushAll() {
    await Promise.all([...this.rooms.values()].filter((r) => r.dirty).map((r) => this.saveRoomImmediate(r)))
  }
}

const roomManager = new RoomManager()

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(parsedUrl.pathname)

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  // API 1: Health check & active summary
  if (pathname === '/api/health' || pathname === '/status') {
    const roomsSummary = {}
    for (const [name, r] of roomManager.rooms.entries()) {
      roomsSummary[name] = {
        playersOnline: r.clients.size,
        hasSavedWorld: !!r.world,
        lastSaved: r.lastSaved ? new Date(r.lastSaved).toISOString() : null,
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(
      JSON.stringify({
        status: 'ok',
        app: 'eco-munity-relay',
        activeConnections: wss.clients.size,
        rooms: roomsSummary,
      })
    )
  }

  // API 2: Query room live status / data
  if (pathname === '/api/room') {
    const roomName = parsedUrl.searchParams.get('room') || 'default'
    const room = roomManager.getRoom(roomName)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(
      JSON.stringify({
        room: room.name,
        playersOnline: room.clients.size,
        hasSavedWorld: !!room.world,
        lastSaved: room.lastSaved ? new Date(room.lastSaved).toISOString() : null,
        worldSummary: room.world
          ? {
              points: room.world.points ?? 0,
              energy: room.world.energy ?? 0,
              happiness: room.world.happiness ?? 0,
              round: room.world.round ?? 0,
              trashRemaining: room.world.trash?.length ?? 0,
              stats: room.world.stats ?? null,
            }
          : null,
      })
    )
  }

  // API 3: Reset a room (e.g. for a new class session)
  if (pathname === '/api/room/reset' && req.method === 'POST') {
    const roomName = parsedUrl.searchParams.get('room') || 'default'
    roomManager.resetRoom(roomName)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ status: 'ok', message: `Room "${roomName}" reset successfully.` }))
  }

  // Accounts: /api/auth/* and /api/me*
  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/me')) {
    handleAuth(req, res, pathname)
    return
  }

  // API 4: a player's story progress (stored in MongoDB). The id is a random per-browser id.
  if (pathname === '/api/story') {
    const pid = parsedUrl.searchParams.get('pid') || ''
    const json = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(pid)) return json(400, { error: 'bad player id' })
    if (req.method === 'GET') {
      store
        .loadStory(pid)
        .then((state) => json(200, { state }))
        .catch((err) => (console.error('⚠️ [Story] load failed:', err.message), json(503, { error: 'storage unavailable' })))
      return
    }
    if (req.method === 'DELETE') {
      store
        .deleteStory(pid)
        .then(() => json(200, { ok: true }))
        .catch(() => json(503, { error: 'storage unavailable' }))
      return
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      let body = ''
      req.on('data', (c) => {
        body += c
        if (body.length > 20000) req.destroy()
      })
      req.on('end', () => {
        let parsed
        try {
          parsed = JSON.parse(body)
        } catch {
          return json(400, { error: 'bad json' })
        }
        const state = sanitizeStory(parsed?.state)
        if (!state) return json(400, { error: 'bad story state' })
        store
          .saveStory(pid, state)
          .then(() => json(200, { ok: true }))
          .catch((err) => (console.error('⚠️ [Story] save failed:', err.message), json(503, { error: 'storage unavailable' })))
      })
      return
    }
    return json(405, { error: 'method not allowed' })
  }

  // If dist doesn't exist, return relay status
  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(
      JSON.stringify({
        status: 'ok',
        app: 'eco-munity-relay',
        activeConnections: wss.clients.size,
        notice: 'Static frontend not built yet. Run npm run build if hosting frontend here.',
      })
    )
  }

  // Serve static files from dist/ (SPA fallback to index.html)
  let filePath = path.normalize(path.join(DIST_DIR, pathname))
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    return res.end('Forbidden')
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html')
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('Not Found')
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  fs.createReadStream(filePath).pipe(res)
})

const wss = new WebSocketServer({ server })

// Handle WebSocket connections and persistent live rooms
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
  const rawRoom = url.searchParams.get('room') || 'default'
  const room = roomManager.getRoom(rawRoom)

  ws.room = room.name
  ws.clientId = `client-${Math.random().toString(36).slice(2, 9)}`
  room.clients.add(ws)

  console.log(`🔌 [WS] Client ${ws.clientId} joined room "${room.name}" (${room.clients.size} online)`)

  // 1. Send the saved authoritative world state to the joining player (once it has been loaded from storage)
  room.loading.then(() => {
    if (room.world && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: 'world', s: room.world, from: 'server' }))
      console.log(`📤 [WS] Dispatched saved world data to ${ws.clientId} in "${room.name}"`)
    }
  })

  // 2. Handle incoming messages from this client
  ws.on('message', (message, isBinary) => {
    let parsed = null
    try {
      parsed = JSON.parse(message.toString())
    } catch {
      // Binary or invalid JSON: just relay to room
    }

    if (parsed && typeof parsed === 'object') {
      // Whenever a world snapshot arrives (from the room host or saving player), save & persist it!
      if (parsed.t === 'world' && parsed.s) {
        room.world = parsed.s
        roomManager.queueSave(room)
      }
    }

    // Relay message to all OTHER clients in the same room
    for (const client of room.clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message, { binary: isBinary })
      }
    }
  })

  // 3. Handle disconnect
  ws.on('close', () => {
    room.clients.delete(ws)
    console.log(`👋 [WS] Client ${ws.clientId} left room "${room.name}" (${room.clients.size} remaining)`)

    // Notify other peers in the room
    const byeMsg = JSON.stringify({ t: 'bye', from: ws.clientId })
    for (const client of room.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(byeMsg)
      }
    }

    // If no players are left in the room, ensure all pending saves are flushed immediately!
    if (room.clients.size === 0 && room.dirty) {
      roomManager.saveRoomImmediate(room)
    }
  })

  ws.on('error', (err) => {
    console.error(`⚠️ [WS Error] Client ${ws.clientId}:`, err.message)
  })
})

// Graceful process shutdown: flush all saves to disk
process.on('SIGINT', async () => {
  console.log('🛑 [Server] Shutting down, saving live room data...')
  await roomManager.flushAll()
  await store.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('🛑 [Server] Received SIGTERM, saving live room data...')
  await roomManager.flushAll()
  await store.close()
  process.exit(0)
})

server.listen(PORT, () => {
  console.log(`🌍 Eco-munity Relay & Storage Server running on http://localhost:${PORT}`)
  console.log(`💾 Storage: ${store.usingMongo ? 'MongoDB Atlas' : 'local JSON files (set MONGODB_URI to use MongoDB)'}`)
})
