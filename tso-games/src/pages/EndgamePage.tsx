import { Link } from 'react-router-dom'
import EndgamePractice from '../components/chess/EndgamePractice'
import './EndgamePage.css'

export default function EndgamePage() {
  document.title = '殘局練習 | TSO'
  return (
    <div className="endgame-page">
      <nav className="endgame-nav">
        <Link to="/" className="nav-home">← 首頁</Link>
        <span className="nav-title">殘局練習（100題）</span>
        <Link to="/chess" className="nav-chess">西洋棋</Link>
      </nav>
      <EndgamePractice />
    </div>
  )
}
