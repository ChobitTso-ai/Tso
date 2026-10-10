import { Link } from 'react-router-dom'
import DrawBall from '../components/drawball/DrawBall'
import './DrawBallPage.css'

export default function DrawBallPage() {
  document.title = '畫線滾球 | TSO'
  return (
    <div className="drawball-page">
      <nav className="drawball-nav">
        <Link to="/" className="nav-home">← 首頁</Link>
        <span className="nav-title">✏️ 畫線滾球</span>
      </nav>
      <DrawBall />
    </div>
  )
}
