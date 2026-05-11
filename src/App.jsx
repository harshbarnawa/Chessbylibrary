import { Routes, Route } from 'react-router-dom'
import ChessGame from './ChessGame'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ChessGame />} />
      <Route path="/room/:roomId" element={<ChessGame />} />
    </Routes>
  )
}

export default App