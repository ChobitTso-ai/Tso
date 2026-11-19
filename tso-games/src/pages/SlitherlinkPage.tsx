import { Link } from 'react-router-dom'
import Slitherlink from '../components/slitherlink/Slitherlink'
import './SlitherlinkPage.css'

export default function SlitherlinkPage() {
  document.title = '數迴 | TSO'
  return (
    <div className="slitherlink-page">
      <nav className="slitherlink-nav">
        <Link to="/" className="nav-home">← 首頁</Link>
        <span className="nav-title">➰ 數迴</span>
      </nav>
      <Slitherlink />
    </div>
  )
}
