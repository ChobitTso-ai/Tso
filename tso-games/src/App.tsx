import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ChessPage from './pages/ChessPage'
import MinecraftQuiz from './pages/MinecraftQuiz'
import KidibotPage from './pages/KidibotPage'
import EndgamePage from './pages/EndgamePage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chess" element={<ChessPage />} />
        <Route path="/endgames" element={<EndgamePage />} />
        <Route path="/minecraft" element={<MinecraftQuiz />} />
        <Route path="/kidibot" element={<KidibotPage />} />
      </Routes>
    </HashRouter>
  )
}
