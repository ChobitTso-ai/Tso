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
  {
    id: 'kidibot',
    title: '回家之路',
    description: '排列路徑磁力片，引導機器人避開怪獸與陷阱，安全回家！10 關程式思維冒險。',
    icon: '🤖',
    path: '/kidibot',
    available: true,
    tag: 'NEW',
  },
  {
    id: 'endgames',
    title: '西洋棋殘局練習',
    description: '100 題經典殘局——兵局、車局、象局、馬局、后局與複合殘局，搭配 AI 對手與提示。',
    icon: '♜',
    path: '/endgames',
    available: true,
    tag: 'NEW',
  },
]

export default function Home() {
  document.title = 'TSO'
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
