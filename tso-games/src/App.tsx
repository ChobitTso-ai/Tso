import { HashRouter, Routes, Route } from 'react-router-dom'
import LoginGate from './components/auth/LoginGate'
import Home from './pages/Home'
import ChessPage from './pages/ChessPage'
import MinecraftQuiz from './pages/MinecraftQuiz'
import KidibotPage from './pages/KidibotPage'
import EndgamePage from './pages/EndgamePage'
import MathQuestPage from './pages/MathQuestPage'
import BattleshipPage from './pages/BattleshipPage'
import ThreeKingdomsPage from './pages/ThreeKingdomsPage'
import DrawBallPage from './pages/DrawBallPage'
import SanguoGamePage from './pages/SanguoGamePage'
import { SANGUO_GAMES } from './components/sanguo/games'

export default function App() {
  return (
    <LoginGate>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chess" element={<ChessPage />} />
          <Route path="/endgames" element={<EndgamePage />} />
          <Route path="/minecraft" element={<MinecraftQuiz />} />
          <Route path="/kidibot" element={<KidibotPage />} />
          <Route path="/mathquest" element={<MathQuestPage />} />
          <Route path="/battleship" element={<BattleshipPage />} />
          <Route path="/threekingdoms" element={<ThreeKingdomsPage />} />
          {SANGUO_GAMES.map(game => (
            <Route key={game.id} path={game.path} element={<SanguoGamePage key={game.id} game={game} />} />
          ))}
          <Route path="/drawball" element={<DrawBallPage />} />
        </Routes>
      </HashRouter>
    </LoginGate>
  )
}
