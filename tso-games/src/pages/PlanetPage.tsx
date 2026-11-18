import { useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PlanetGlobe from '../components/planet/PlanetGlobe'
import { ARCHIPELAGOS } from '../components/planet/data'
import { saveEntry } from '../components/entry/entry'
import './PlanetPage.css'

export default function PlanetPage() {
  document.title = '遊戲星球 | TSO'
  const navigate = useNavigate()
  const [frontId, setFrontId] = useState(() => ARCHIPELAGOS[0]?.id ?? '')
  const [highlightId, setHighlightId] = useState<string | null>(null)

  // 星球版本身就是首頁，「← 首頁」會繞回這裡，所以改放切換到卡片版的按鈕（與遊戲島相同）
  const toCards = () => {
    saveEntry('cards')
    navigate('/')
  }

  // 觸控沒有「指著」的狀態，只有滑鼠移上清單時才轉動星球
  const pointAt = (e: PointerEvent, id: string) => {
    if (e.pointerType === 'mouse') setHighlightId(id)
  }

  return (
    <div className="pl-page">
      <nav className="pl-nav">
        <span className="nav-title">
          🪐 TSO 遊戲星球 <span className="pl-beta">測試版</span>
        </span>
        <button type="button" className="pl-switch" onClick={toCards}>
          🗂️ 卡片版
        </button>
      </nav>

      <main className="pl-main">
        <div className="pl-stage">
          <PlanetGlobe highlightId={highlightId} onFrontChange={setFrontId} />
          <p className="pl-hint">拖曳轉動星球，點小島開始玩</p>
        </div>

        <aside className="pl-side" aria-label="遊戲清單">
          {ARCHIPELAGOS.map(arch => (
            <section
              key={arch.id}
              className={`pl-group ${arch.id === frontId ? 'on' : ''}`}
              style={{ '--pl-c': arch.color } as CSSProperties}
            >
              <h2 className="pl-group-name">{arch.name}</h2>
              {arch.summary && <p className="pl-group-summary">{arch.summary}</p>}
              <ul className="pl-games">
                {arch.games.map(game => (
                  <li key={game.id}>
                    <Link
                      to={game.path}
                      className={`pl-game ${game.id === highlightId ? 'on' : ''}`}
                      onPointerEnter={e => pointAt(e, game.id)}
                      onPointerLeave={() => setHighlightId(null)}
                      onFocus={() => setHighlightId(game.id)}
                      onBlur={() => setHighlightId(null)}
                    >
                      <span className="pl-game-name">
                        {game.name}
                        {game.heat === 3 && <span className="pl-new">NEW</span>}
                      </span>
                      <span className="pl-game-what">{game.what}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </aside>
      </main>
    </div>
  )
}
