import { Link } from 'react-router-dom'
import StrategistGame from '../components/strategist/StrategistGame'
import './StrategistPage.css'

export default function StrategistPage() {
  document.title = '軍師戰棋 | TSO'
  return (
    <div className="strategist-page">
      <nav className="strategist-nav">
        <Link to="/threekingdoms" className="nav-home">← 三國演義</Link>
        <span className="nav-title">🏯 軍師戰棋</span>
      </nav>
      <StrategistGame />
    </div>
  )
}
