// Oda iletişim katmanı — kendi senkron sunucumuz üzerinden gerçek bir WebSocket kullanır.
// Ders katılma isteği / onay / red gibi lobi sinyalleri için kullanılır.
// (Önceki sürüm BroadcastChannel kullanıyordu, sadece aynı tarayıcıda çalışıyordu.
// Bu sürüm farklı tarayıcılar/cihazlar arasında da çalışır.)

import { SYNC_SERVER_URL } from './syncConfig'

export function createRoomChannel(roomId) {
  const ws = new WebSocket(`${SYNC_SERVER_URL}/lobby/${roomId}`)
  const pendingQueue = []
  let isOpen = false

  ws.addEventListener('open', () => {
    isOpen = true
    for (const message of pendingQueue.splice(0)) {
      ws.send(JSON.stringify(message))
    }
  })

  return {
    send(message) {
      if (isOpen) {
        ws.send(JSON.stringify(message))
      } else {
        pendingQueue.push(message)
      }
    },
    onMessage(callback) {
      function handler(event) {
        try {
          callback(JSON.parse(event.data))
        } catch {
          // ignore malformed messages
        }
      }
      ws.addEventListener('message', handler)
      return () => ws.removeEventListener('message', handler)
    },
    close() {
      ws.close()
    },
  }
}

// crypto.randomUUID() sadece "güvenli bağlam"da (HTTPS veya localhost) çalışır.
// Öğretmen-öğrenci testleri LAN üzerinden düz HTTP ile yapıldığından (örn. iPad),
// güvenli bağlam gerektirmeyen crypto.getRandomValues() kullanıyoruz.
function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateRoomId() {
  return randomHex(4)
}

export function generateStudentId() {
  return randomHex(16)
}
