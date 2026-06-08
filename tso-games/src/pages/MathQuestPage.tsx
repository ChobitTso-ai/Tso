import { Link } from 'react-router-dom'
import MathQuest from '../components/mathquest/MathQuest'

export default function MathQuestPage() {
  document.title = '數學冒險 | TSO'
  return (
    <div>
      <nav style={{ padding: '8px 16px', background: '#16213e' }}>
        <Link to="/" style={{ color: '#88aaff', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← 回首頁
        </Link>
      </nav>
      <MathQuest />
    </div>
  )
}
