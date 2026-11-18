import { Link } from 'react-router-dom'
import type { SanguoGame } from '../components/sanguo/games'
import './SanguoGamePage.css'

// 遊戲本體是作者的單檔 HTML，原樣以 iframe 嵌入，不改寫成 React
export default function SanguoGamePage({ game }: { game: SanguoGame }) {
  document.title = `${game.title} | TSO`
  return (
    <div className="sg-page">
      <nav className="sg-nav">
        <Link to="/threekingdoms" className="nav-home">← 三國演義</Link>
        <span className="nav-title">{game.title}</span>
      </nav>
      <iframe
        className="sg-frame"
        src={`${import.meta.env.BASE_URL}sanguo/${game.file}`}
        title={game.title}
      />
    </div>
  )
}
