import { Link } from 'react-router-dom'
import './ThreeKingdomsPage.css'

interface MiniGame {
  id: string
  title: string
  description: string
  icon: string
  path: string
  available: boolean
  tag?: string
}

const MINI_GAMES: MiniGame[] = []

export default function ThreeKingdomsPage() {
  document.title = '三國演義 | TSO'
  return (
    <div className="three-kingdoms">
      <nav className="tk-nav">
        <Link to="/" className="nav-home">← 首頁</Link>
        <span className="nav-title">三國演義</span>
      </nav>

      <header className="tk-header">
        <h1 className="tk-title">⚔️ 三國演義</h1>
        <p className="tk-subtitle">策略、謀略、決戰天下</p>
      </header>

      {MINI_GAMES.length === 0 ? (
        <div className="tk-empty">
          <p>小遊戲陸續加入中，敬請期待…</p>
        </div>
      ) : (
        <div className="tk-grid">
          {MINI_GAMES.map(game => (
            <div key={game.id} className={`tk-card ${!game.available ? 'unavailable' : ''}`}>
              {game.tag && <span className="tk-tag">{game.tag}</span>}
              <div className="tk-icon">{game.icon}</div>
              <h2 className="tk-name">{game.title}</h2>
              <p className="tk-desc">{game.description}</p>
              {game.available ? (
                <Link to={game.path} className="tk-btn">開始遊戲</Link>
              ) : (
                <span className="tk-btn-disabled">敬請期待</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
