import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ChessPage from './pages/ChessPage'
import MinecraftQuiz from './pages/MinecraftQuiz'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chess" element={<ChessPage />} />
        <Route path="/minecraft" element={<MinecraftQuiz />} />
      </Routes>
    </HashRouter>
  )
}
