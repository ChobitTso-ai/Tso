import { Link } from 'react-router-dom'
import Drill from '../components/drill/Drill'
import './DrillPage.css'

export default function DrillPage() {
  document.title = '無限出題 | TSO'
  return (
    <div className="dr-page">
      <nav className="dr-nav">
        <Link to="/education" className="nav-home">← 教育區</Link>
        <span className="nav-title">📝 無限出題</span>
      </nav>
      <Drill />
    </div>
  )
}
