import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ChessPage from './pages/ChessPage'
import MinecraftQuiz from './pages/MinecraftQuiz'
import KidibotPage from './pages/KidibotPage'
import EndgamePage from './pages/EndgamePage'
import MathQuestPage from './pages/MathQuestPage'
import BattleshipPage from './pages/BattleshipPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chess" element={<ChessPage />} />
        <Route path="/endgames" element={<EndgamePage />} />
        <Route path="/minecraft" element={<MinecraftQuiz />} />
        <Route path="/kidibot" element={<KidibotPage />} />
        <Route path="/mathquest" element={<MathQuestPage />} />
        <Route path="/battleship" element={<BattleshipPage />} />
      </Routes>
    </HashRouter>
  )
}
