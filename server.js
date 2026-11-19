import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = process.env.PORT || 8080

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify({ status: 'ok', app: 'eco-munity-relay', connections: wss.clients.size }))
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
  console.log(`🌍 Eco-munity WebSocket Relay running on http://localhost:${PORT}`)
})
