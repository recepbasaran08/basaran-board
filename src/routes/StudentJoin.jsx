import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { generateStudentId } from '../lib/roomChannel'
import { RoomChannelProvider, useRoomChannel } from '../context/RoomChannelContext'
import { Whiteboard } from '../components/Whiteboard'
import './Lobby.css'

export function StudentJoin() {
  const { roomId } = useParams()
  return (
    <RoomChannelProvider roomId={roomId}>
      <StudentJoinInner roomId={roomId} />
    </RoomChannelProvider>
  )
}

function StudentJoinInner({ roomId }) {
  const channel = useRoomChannel()
  const [phase, setPhase] = useState('name')
  const [name, setName] = useState('')
  const studentIdRef = useRef(generateStudentId())

  useEffect(() => {
    const unsubscribe = channel.onMessage((msg) => {
      if (msg.type === 'lesson-ended') {
        setPhase('ended')
        return
      }
      if (msg.studentId !== studentIdRef.current) return
      if (msg.type === 'join-approved') setPhase('approved')
      if (msg.type === 'join-rejected') setPhase('rejected')
    })

    return unsubscribe
  }, [channel])

  useEffect(() => {
    if (phase !== 'approved') return
    function announceLeave() {
      channel.send({ type: 'student-left', studentId: studentIdRef.current })
    }
    window.addEventListener('beforeunload', announceLeave)
    return () => window.removeEventListener('beforeunload', announceLeave)
  }, [phase, channel])

  function submitJoin(e) {
    e.preventDefault()
    if (!name.trim()) return
    channel.send({ type: 'join-request', studentId: studentIdRef.current, name: name.trim() })
    setPhase('waiting')
  }

  if (phase === 'approved') {
    return <Whiteboard roomId={roomId} restricted roomStatus="Derse Katıldın - Canlı" />
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-panel">
        {phase === 'name' && (
          <form onSubmit={submitJoin}>
            <h1>📐 BaşaranBoard</h1>
            <p>Derse katılmak için adını yaz.</p>
            <input
              className="lobby-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adını Yaz"
              autoFocus
            />
            <button type="submit" className="lobby-primary-btn">
              Derse Katıl
            </button>
          </form>
        )}
        {phase === 'waiting' && (
          <>
            <h1>Bekleniyor…</h1>
            <p className="lobby-spinner-text">Öğretmenin onay vermesi bekleniyor…</p>
          </>
        )}
        {phase === 'rejected' && (
          <>
            <h1>Katılım Reddedildi</h1>
            <p>Öğretmen bu isteği onaylamadı.</p>
          </>
        )}
        {phase === 'ended' && (
          <>
            <h1>Ders Sona Erdi</h1>
            <p>Öğretmen dersi sonlandırdı. Yeni bir ders için öğretmeninden yeni bir link iste.</p>
          </>
        )}
      </div>
    </div>
  )
}
