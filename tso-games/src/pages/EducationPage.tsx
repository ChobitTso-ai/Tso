import { Link } from 'react-router-dom'
import './EducationPage.css'

interface Tool {
  id: string
  title: string
  description: string
  icon: string
  path: string
  available: boolean
  tag?: string
}

const TOOLS: Tool[] = [
  {
    id: 'drill',
    title: '無限出題',
    description: '國小數學練習卷：三上（Alan）、五上（Ryan）共 6 章，可列印 A4 題目卷與答案卷，也能線上作答、當場批改。',
    icon: '📝',
    path: '/drill',
    available: true,
    tag: 'NEW',
  },
]

export default function EducationPage() {
  document.title = '教育區 | TSO'
  return (
    <div className="education">
      <nav className="edu-nav">
        <Link to="/" className="nav-home">← 首頁</Link>
        <span className="nav-title">教育區</span>
      </nav>

      <header className="edu-header">
        <h1 className="edu-title">📚 教育區</h1>
        <p className="edu-subtitle">學習工具與練習，陸續加入中</p>
      </header>

      <div className="edu-grid">
        {TOOLS.map(tool => (
          <div key={tool.id} className={`edu-card ${!tool.available ? 'unavailable' : ''}`}>
            {tool.tag && <span className="edu-tag">{tool.tag}</span>}
            <div className="edu-icon">{tool.icon}</div>
            <h2 className="edu-name">{tool.title}</h2>
            <p className="edu-desc">{tool.description}</p>
            {tool.available ? (
              <Link to={tool.path} className="edu-btn">開始使用</Link>
            ) : (
              <span className="edu-btn-disabled">敬請期待</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
