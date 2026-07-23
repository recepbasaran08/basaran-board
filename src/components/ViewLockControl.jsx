import { useEffect, useRef, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import { useRoomChannel } from '../context/RoomChannelContext'
import './ViewLockControl.css'

// Kamera güncellemeleri en fazla ~60fps sıklığında yayınlanır — "sık ve hafif" olsun diye.
const BROADCAST_INTERVAL_MS = 16

export function ViewLockControl({ isTeacher }) {
  const editor = useEditor()
  const channel = useRoomChannel()
  const [locked, setLocked] = useState(false)
  const lastSentRef = useRef(0)

  const camera = useValue('camera', () => editor.getCamera(), [editor])

  // Öğretmen: kilit açıkken kamera her değiştiğinde öğrenciye yayınla.
  useEffect(() => {
    if (!isTeacher || !locked) return
    const now = Date.now()
    if (now - lastSentRef.current < BROADCAST_INTERVAL_MS) return
    lastSentRef.current = now
    channel.send({ type: 'camera-sync', camera: { x: camera.x, y: camera.y, z: camera.z } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, locked, camera.x, camera.y, camera.z, channel])

  // Öğrenci: öğretmenden gelen kilit durumunu ve kamera güncellemelerini uygula.
  useEffect(() => {
    if (isTeacher) return
    const unsubscribe = channel.onMessage((msg) => {
      if (msg.type === 'view-lock') {
        setLocked(msg.locked)
        editor.setCameraOptions({ ...editor.getCameraOptions(), isLocked: msg.locked })
      }
      if (msg.type === 'camera-sync' && msg.camera) {
        editor.setCamera(msg.camera, { force: true })
      }
    })
    return unsubscribe
  }, [isTeacher, channel, editor])

  if (!isTeacher) return null

  function toggleLock() {
    const next = !locked
    setLocked(next)
    channel.send({ type: 'view-lock', locked: next })
    if (next) {
      const c = editor.getCamera()
      channel.send({ type: 'camera-sync', camera: { x: c.x, y: c.y, z: c.z } })
    }
  }

  return (
    <button type="button" className={`view-lock-btn ${locked ? 'active' : ''}`} onClick={toggleLock}>
      {locked ? '🔒 Görünüm Kilitli' : '🔓 Görünümü Kilitle'}
    </button>
  )
}
