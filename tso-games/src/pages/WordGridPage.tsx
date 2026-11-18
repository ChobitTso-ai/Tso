import { Link } from 'react-router-dom'
import WordGrid from '../components/wordgrid/WordGrid'
import './WordGridPage.css'

export default function WordGridPage() {
  document.title = '方陣找找看 | TSO'
  return (
    <div className="wordgrid-page">
      <nav className="wordgrid-nav">
        <Link to="/" className="nav-home">← 首頁</Link>
        <span className="nav-title">🔤 方陣找找看</span>
      </nav>
      <WordGrid />
    </div>
  )
}
