import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer, WebSocket } from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, 'dist')
const PORT = process.env.PORT || 8080

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

  // API status check
  if (pathname === '/api/health' || pathname === '/status') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    return res.end(JSON.stringify({ status: 'ok', app: 'eco-munity', connections: wss.clients.size }))
  }

  // Check if dist exists
  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      status: 'ok',
      app: 'eco-munity-relay',
      message: 'Run npm run build to generate the web frontend assets',
      connections: wss.clients.size,
    }))
  }

  // Prevent directory traversal
  let filePath = path.normalize(path.join(DIST_DIR, pathname))
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    return res.end('Forbidden')
  }

  // Serve static files with fallback to index.html for SPA
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

// Relay messages to all peers in the same room
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
  const room = url.searchParams.get('room') || 'default'
  ws.room = room

  ws.on('message', (message, isBinary) => {
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN && client.room === room) {
        client.send(message, { binary: isBinary })
      }
    }
  })

  ws.on('error', (err) => {
    console.error('Socket error:', err.message)
  })
})

server.listen(PORT, () => {
  console.log(`🌍 Eco-munity running on http://localhost:${PORT}`)
})
