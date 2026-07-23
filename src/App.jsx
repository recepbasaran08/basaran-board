import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TeacherLobby } from './routes/TeacherLobby'
import { TeacherRoom } from './routes/TeacherRoom'
import { StudentJoin } from './routes/StudentJoin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TeacherLobby />} />
        <Route path="/ders/:roomId" element={<TeacherRoom />} />
        <Route path="/katil/:roomId" element={<StudentJoin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
