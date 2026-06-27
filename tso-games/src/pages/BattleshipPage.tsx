import { Link } from 'react-router-dom'
import Battleship from '../components/battleship/Battleship'
import './BattleshipPage.css'

export default function BattleshipPage() {
  document.title = '戰艦海戰棋 | TSO'
  return (
    <div className="bs-page">
      <nav className="bs-nav">
        <Link to="/" className="bs-back">
          ← 返回首頁
        </Link>
        <h1 className="bs-nav-title">🚢 戰艦海戰棋</h1>
        <span className="bs-nav-sub">佈署艦隊 · 擊沉敵軍</span>
      </nav>
      <Battleship />
    </div>
  )
}
