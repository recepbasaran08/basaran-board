import { TLSocketRoom } from '@tldraw/sync-core'

// Her ders odası için bir Durable Object örneği. Aynı obje hem tldraw çizim
// senkronunu (/connect/:roomId) hem de lobi sinyalleşmesini (/lobby/:roomId —
// ders katılma isteği / onay / red / ders sonu) yönetir, çünkü ikisi de aynı
// odanın yaşam döngüsüne bağlı.
export class BasaranBoardRoom {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.tlRoom = null
    this.lobbyPeers = new Set()
  }

  getTlRoom() {
    if (!this.tlRoom) {
      this.tlRoom = new TLSocketRoom({
        onSessionRemoved: (room, { numSessionsRemaining }) => {
          if (numSessionsRemaining === 0) {
            room.close()
            this.tlRoom = null
          }
        },
      })
    }
    return this.tlRoom
  }

  async fetch(request) {
    const url = new URL(request.url)
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    server.accept()

    if (url.pathname.startsWith('/connect/')) {
      const sessionId = url.searchParams.get('sessionId') || crypto.randomUUID()
      this.getTlRoom().handleSocketConnect({ sessionId, socket: server })
    } else if (url.pathname.startsWith('/lobby/')) {
      this.lobbyPeers.add(server)
      server.addEventListener('message', (event) => {
        const text = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)
        for (const peer of this.lobbyPeers) {
          if (peer !== server && peer.readyState === WebSocket.OPEN) {
            peer.send(text)
          }
        }
      })
      server.addEventListener('close', () => {
        this.lobbyPeers.delete(server)
      })
    } else {
      server.close(1008, 'Unknown path')
      return new Response(null, { status: 101, webSocket: client })
    }

    return new Response(null, { status: 101, webSocket: client })
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const match = url.pathname.match(/^\/(connect|lobby)\/([^/]+)$/)
    if (!match) {
      return new Response('BaşaranBoard sync server çalışıyor.', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    const roomId = match[2]
    const id = env.ROOMS.idFromName(roomId)
    const stub = env.ROOMS.get(id)
    return stub.fetch(request)
  },
}
