import { Link } from 'react-router-dom'
import MinecraftGame from '../components/minecraft/MinecraftGame'
import './MinecraftQuiz.css'

export default function MinecraftQuiz() {
  document.title = 'Minecraft 知識競賽 | TSO'
  return (
    <div className="minecraft-page">
      <nav className="minecraft-nav">
        <Link to="/" className="nav-home">← 首頁</Link>
        <span className="nav-title">Minecraft 知識競賽</span>
      </nav>
      <MinecraftGame />
    </div>
  )
}
