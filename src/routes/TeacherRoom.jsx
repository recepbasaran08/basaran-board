import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createRoomChannel } from '../lib/roomChannel'
import { Whiteboard } from '../components/Whiteboard'
import './Lobby.css'

export function TeacherRoom() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [pending, setPending] = useState([])
  const [connected, setConnected] = useState([])
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    const channel = createRoomChannel(roomId)
    channelRef.current = channel

    const unsubscribe = channel.onMessage((msg) => {
      if (msg.type === 'join-request') {
        setPending((prev) =>
          prev.some((p) => p.studentId === msg.studentId) ? prev : [...prev, { studentId: msg.studentId, name: msg.name }]
        )
      }
      if (msg.type === 'student-left') {
        setConnected((prev) => prev.filter((s) => s.studentId !== msg.studentId))
      }
    })

    return () => {
      unsubscribe()
      channel.close()
    }
  }, [roomId])

  function approve(request) {
    channelRef.current.send({ type: 'join-approved', studentId: request.studentId })
    setPending((prev) => prev.filter((p) => p.studentId !== request.studentId))
    setConnected((prev) => [...prev, request])
  }

  function reject(request) {
    channelRef.current.send({ type: 'join-rejected', studentId: request.studentId })
    setPending((prev) => prev.filter((p) => p.studentId !== request.studentId))
  }

  function confirmEndLesson() {
    channelRef.current.send({ type: 'lesson-ended' })
    setConfirmingEnd(false)
    navigate('/')
  }

  const studentLink = `${window.location.origin}/katil/${roomId}`
  const roomStatus =
    connected.length === 0
      ? null
      : connected.length === 1
        ? `Öğrenci: ${connected[0].name} Bağlandı - Canlı`
        : `${connected.length} Öğrenci Bağlı - Canlı`

  return (
    <>
      <Whiteboard
        roomId={roomId}
        studentLink={studentLink}
        roomStatus={roomStatus}
        onEndLesson={() => setConfirmingEnd(true)}
      />
      {pending.length > 0 && (
        <div className="join-requests">
          {pending.map((r) => (
            <div key={r.studentId} className="join-request-card">
              <p>
                <strong>{r.name}</strong> derse katılmak istiyor.
              </p>
              <div className="join-request-actions">
                <button type="button" onClick={() => reject(r)}>
                  Reddet
                </button>
                <button type="button" className="approve" onClick={() => approve(r)}>
                  Onayla
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmingEnd && (
        <div className="lt-modal-backdrop" onClick={() => setConfirmingEnd(false)}>
          <div className="lt-modal" onClick={(e) => e.stopPropagation()}>
            <p>Dersi sonlandırmak istediğine emin misin? Bağlı öğrenciler dersten çıkarılacak.</p>
            <div className="lt-modal-actions">
              <button type="button" onClick={() => setConfirmingEnd(false)}>
                İptal
              </button>
              <button type="button" className="danger" onClick={confirmEndLesson}>
                Evet, Sonlandır
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
