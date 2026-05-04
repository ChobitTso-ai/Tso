import { Link } from 'react-router-dom'
import ChessGame from '../components/chess/ChessGame'
import './ChessPage.css'

export default function ChessPage() {
  document.title = '西洋棋 | TSO'
  return (
    <div className="chess-page">
      <nav className="chess-nav">
        <Link to="/" className="nav-home">← 首頁</Link>
        <span className="nav-title">西洋棋</span>
      </nav>
      <ChessGame />
    </div>
  )
}
