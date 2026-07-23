import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RoomChannelProvider, useRoomChannel } from '../context/RoomChannelContext'
import { Whiteboard } from '../components/Whiteboard'
import './Lobby.css'

export function TeacherRoom() {
  const { roomId } = useParams()
  return (
    <RoomChannelProvider roomId={roomId}>
      <TeacherRoomInner roomId={roomId} />
    </RoomChannelProvider>
  )
}

function TeacherRoomInner({ roomId }) {
  const navigate = useNavigate()
  const channel = useRoomChannel()
  const [pending, setPending] = useState([])
  const [connected, setConnected] = useState([])
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  useEffect(() => {
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

    return unsubscribe
  }, [channel])

  function approve(request) {
    channel.send({ type: 'join-approved', studentId: request.studentId })
    setPending((prev) => prev.filter((p) => p.studentId !== request.studentId))
    setConnected((prev) => [...prev, request])
  }

  function reject(request) {
    channel.send({ type: 'join-rejected', studentId: request.studentId })
    setPending((prev) => prev.filter((p) => p.studentId !== request.studentId))
  }

  function confirmEndLesson() {
    channel.send({ type: 'lesson-ended' })
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
        isTeacher
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
