import http from 'node:http'
import { randomUUID } from 'node:crypto'
import WebSocket, { WebSocketServer } from 'ws'
import { TLSocketRoom } from '@tldraw/sync-core'

const PORT = process.env.SYNC_PORT || 5858

// Oda başına bellek-içi (in-memory) tldraw sync odası.
// NOT: Süreç kapanınca / yeniden başlayınca içerik kaybolur — bu geçici bir MVP kurulumu.
// İleride kalıcılık gerekirse `storage` opsiyonu ile bir kayıt katmanı eklenebilir.
const rooms = new Map()

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId)
  if (!room) {
    room = new TLSocketRoom({
      onSessionRemoved(r, { numSessionsRemaining }) {
        if (numSessionsRemaining === 0) {
          r.close()
          rooms.delete(roomId)
        }
      },
    })
    rooms.set(roomId, room)
  }
  return room
}

// Lobi sinyalleşmesi (ders katılma isteği / onay / red) için basit bir yayın (broadcast)
// odası. Her mesajı, gönderen hariç, aynı odadaki diğer herkese aynen iletir.
const lobbyRooms = new Map()

function handleLobbyConnection(socket, roomId) {
  let peers = lobbyRooms.get(roomId)
  if (!peers) {
    peers = new Set()
    lobbyRooms.set(roomId, peers)
  }
  peers.add(socket)

  socket.on('message', (data) => {
    const text = data.toString()
    for (const peer of peers) {
      if (peer !== socket && peer.readyState === WebSocket.OPEN) {
        peer.send(text)
      }
    }
  })

  socket.on('close', () => {
    peers.delete(socket)
    if (peers.size === 0) lobbyRooms.delete(roomId)
  })
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('BaşaranBoard sync server çalışıyor.')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (socket, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`)

  const syncMatch = url.pathname.match(/^\/connect\/([^/]+)$/)
  if (syncMatch) {
    const roomId = syncMatch[1]
    const sessionId = url.searchParams.get('sessionId') || randomUUID()
    const room = getOrCreateRoom(roomId)
    room.handleSocketConnect({ sessionId, socket })
    return
  }

  const lobbyMatch = url.pathname.match(/^\/lobby\/([^/]+)$/)
  if (lobbyMatch) {
    handleLobbyConnection(socket, lobbyMatch[1])
    return
  }

  socket.close()
})

server.listen(PORT, () => {
  console.log(`BaşaranBoard sync server ws://localhost:${PORT}`)
})
