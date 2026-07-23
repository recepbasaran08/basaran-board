import { useNavigate } from 'react-router-dom'
import { generateRoomId } from '../lib/roomChannel'
import './Lobby.css'

export function TeacherLobby() {
  const navigate = useNavigate()

  function startLesson() {
    const roomId = generateRoomId()
    navigate(`/ders/${roomId}`)
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-panel">
        <h1>📐 BaşaranBoard</h1>
        <p>Öğretmen kontrollü, sıfır şifreli canlı ders tahtası.</p>
        <button type="button" className="lobby-primary-btn" onClick={startLesson}>
          Yeni Ders Başlat
        </button>
      </div>
    </div>
  )
}
