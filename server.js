import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer, WebSocket } from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, 'dist')
const DATA_DIR = path.join(__dirname, 'data', 'rooms')
const PORT = process.env.PORT || 8080

// Ensure persistent data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

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

  getFilePath(safeRoom) {
    return path.join(DATA_DIR, `${safeRoom}.json`)
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
      }

      // Try loading existing saved state from disk
      const filePath = this.getFilePath(name)
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8')
          room.world = JSON.parse(raw)
          console.log(`💾 [Storage] Loaded persistent live data for room "${name}"`)
        } catch (err) {
          console.error(`⚠️ [Storage] Could not load ${filePath}:`, err.message)
        }
      }

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

    try {
      const filePath = this.getFilePath(room.name)
      const tmpPath = `${filePath}.tmp`
      fs.writeFileSync(tmpPath, JSON.stringify(room.world, null, 2), 'utf-8')
      fs.renameSync(tmpPath, filePath)
      room.dirty = false
      room.lastSaved = Date.now()
      console.log(`💾 [Storage] Successfully saved live data for room "${room.name}"`)
    } catch (err) {
      console.error(`⚠️ [Storage] Failed to save room "${room.name}":`, err.message)
    }
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

    const filePath = this.getFilePath(name)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`🧹 [Storage] Reset saved data for room "${name}"`)
      } catch (err) {
        console.error(`⚠️ [Storage] Failed to delete ${filePath}:`, err.message)
      }
    }

    // Broadcast reset to active players
    const resetMsg = JSON.stringify({ t: 'reset', from: 'server' })
    for (const ws of room.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(resetMsg)
      }
    }
  }

  flushAll() {
    for (const room of this.rooms.values()) {
      if (room.dirty) {
        this.saveRoomImmediate(room)
      }
    }
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

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

  // 1. Immediately send saved authoritative world state to the joining player
  if (room.world) {
    ws.send(JSON.stringify({ t: 'world', s: room.world, from: 'server' }))
    console.log(`📤 [WS] Dispatched saved world data to ${ws.clientId} in "${room.name}"`)
  }

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
process.on('SIGINT', () => {
  console.log('🛑 [Server] Shutting down, saving live room data...')
  roomManager.flushAll()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('🛑 [Server] Received SIGTERM, saving live room data...')
  roomManager.flushAll()
  process.exit(0)
})

server.listen(PORT, () => {
  console.log(`🌍 Eco-munity Relay & Storage Server running on http://localhost:${PORT}`)
  console.log(`📁 Persistent storage path: ${DATA_DIR}`)
})
