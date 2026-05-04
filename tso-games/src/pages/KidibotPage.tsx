import { Link } from 'react-router-dom'
import KidibotGame from '../components/kidibot/KidibotGame'
import './KidibotPage.css'

export default function KidibotPage() {
  document.title = '回家之路 | TSO'
  return (
    <div className="kidibot-page">
      <nav className="kidibot-nav">
        <Link to="/" className="kidibot-back">← 返回首頁</Link>
        <h1 className="kidibot-nav-title">🤖 回家之路</h1>
        <span className="kidibot-nav-sub">程式思維 · 邏輯冒險</span>
      </nav>
      <KidibotGame />
    </div>
  )
}
