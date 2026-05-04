import { Link } from 'react-router-dom'
import './Home.css'

interface GameCard {
  id: string
  title: string
  description: string
  icon: string
  path: string
  available: boolean
  tag?: string
}

const GAMES: GameCard[] = [
  {
    id: 'chess',
    title: '西洋棋',
    description: '支援雙人對戰與人機對戰，五種 AI 難度，含存檔、分享連結與棋譜匯出。',
    icon: '♟',
    path: '/chess',
    available: true,
  },
  {
    id: 'minecraft',
    title: 'Minecraft 知識競賽',
    description: '測試你對 Minecraft 的了解，包含中英文題庫與多種題型。',
    icon: '⛏',
    path: '/minecraft',
    available: true,
  },
]

export default function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">🎮 TSO Games</h1>
        <p className="home-subtitle">免費、無需登入，打開即玩</p>
      </header>

      <div className="game-grid">
        {GAMES.map(game => (
          <div key={game.id} className={`game-card ${!game.available ? 'unavailable' : ''}`}>
            {game.tag && <span className="game-tag">{game.tag}</span>}
            <div className="game-icon">{game.icon}</div>
            <h2 className="game-name">{game.title}</h2>
            <p className="game-desc">{game.description}</p>
            {game.available ? (
              <Link to={game.path} className="game-btn">開始遊戲</Link>
            ) : (
              <span className="game-btn-disabled">敬請期待</span>
            )}
          </div>
        ))}
      </div>

      <footer className="home-footer">
        <a href="https://github.com/chobittso-ai/tso" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  )
}
