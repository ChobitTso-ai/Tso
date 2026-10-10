import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CHAPTERS } from './levels'
import { BALL_R, LINE_HALF, createWorld, distToSeg, segLength, step } from './physics'
import type { World } from './physics'
import { burstConfetti, createBackground, createFx, render, updateFx } from './render'
import type { FxState } from './render'
import LevelMap from './LevelMap'
import { inkRules, starsFor, toDots } from './scoring'
import { Sfx } from './sounds'
import type { FailReason, InkMode, Phase, Progress, Segment, Vec } from './types'
import { WORLD_H, WORLD_W } from './types'
import './DrawBall.css'

const STORAGE_KEY = 'drawBallProgress'
const MIN_POINT_GAP = 8 // 筆畫取樣間距，太密會讓線段過多、碰撞變慢
const BALL_CLEARANCE = BALL_R + LINE_HALF + 4 // 線畫在球身上會把球卡住，這個距離內的筆畫不生效

const LEVELS = CHAPTERS.flatMap(c => c.levels)
const LEVEL_CHAPTER = CHAPTERS.flatMap((c, ci) => c.levels.map(() => ci))

const FAIL_INFO: Record<FailReason, { emoji: string; text: string }> = {
  spike: { emoji: '💥', text: '碰到尖刺了！' },
  out: { emoji: '😵', text: '球掉出去了！' },
  stuck: { emoji: '😴', text: '球停住不動了！' },
}

interface WinResult {
  stars: number
  ink: number
  newBest: boolean
}

function loadProgress(): Progress {
  const fallback: Progress = { stars: LEVELS.map(() => 0), inkMode: 'limited', muted: false }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return fallback
    const p = JSON.parse(saved) as Partial<Progress> & { unlocked?: unknown }
    let stars = fallback.stars
    if (Array.isArray(p.stars)) {
      stars = LEVELS.map((_, i) => {
        const v = p.stars?.[i]
        return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3 ? v : 0
      })
    } else if (typeof p.unlocked === 'number' && Number.isInteger(p.unlocked)) {
      // 舊版存檔只記「解鎖到第幾關」：之前的關卡視為已過關（1 星），保留進度
      const unlocked = p.unlocked
      stars = LEVELS.map((_, i) => (i < unlocked ? 1 : 0))
    }
    return {
      stars,
      inkMode: p.inkMode === 'unlimited' ? 'unlimited' : 'limited',
      muted: p.muted === true,
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return fallback
  }
}

const isUnlocked = (stars: number[], i: number) => i === 0 || stars[i - 1] > 0

/** 第一個還沒過關的關卡，地圖上的小球停在這裡；全破時停在最後一關 */
function firstOpenLevel(stars: number[]): number {
  const i = stars.findIndex(s => s === 0)
  return i === -1 ? stars.length - 1 : i
}

function StarRow({ n, size = '' }: { n: number; size?: string }) {
  return (
    <span className={`db-stars ${size}`}>
      {[0, 1, 2].map(i => (
        <span key={i} className={i < n ? 'on' : 'off'}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function DrawBall() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [levelIdx, setLevelIdx] = useState(() => firstOpenLevel(progress.stars))
  const [phase, setPhase] = useState<Phase>('ready')
  const [failReason, setFailReason] = useState<FailReason>('out')
  const [winResult, setWinResult] = useState<WinResult | null>(null)
  const [inkUsed, setInkUsed] = useState(0)
  const [strokeCount, setStrokeCount] = useState(0)
  const [inkOut, setInkOut] = useState(false)
  const [view, setView] = useState<'map' | 'play'>('map')
  const [showRules, setShowRules] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 遊戲世界放在 ref，由 requestAnimationFrame 迴圈直接讀寫，不經過 React 重繪
  const levelIdxRef = useRef(levelIdx)
  const phaseRef = useRef<Phase>('ready')
  const worldRef = useRef<World>(createWorld(LEVELS[levelIdx]))
  const strokesRef = useRef<Segment[][]>([])
  const drawingRef = useRef<Segment[] | null>(null) // 正在畫的這一筆，第一段生效時才放進 strokesRef
  const inkRef = useRef(0)
  const lastPointRef = useRef<Vec | null>(null)
  const inkModeRef = useRef<InkMode>(progress.inkMode)
  const fxRef = useRef<FxState>(createFx(LEVELS[levelIdx]))
  const bestRef = useRef(progress.stars)

  const level = LEVELS[levelIdx]
  const rules = inkRules(level)
  const limited = progress.inkMode === 'limited'
  const canDraw = phase === 'ready' || phase === 'rolling'
  const totalStars = progress.stars.reduce((a, b) => a + b, 0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    inkModeRef.current = progress.inkMode
    bestRef.current = progress.stars
    Sfx.setEnabled(!progress.muted)
  }, [progress])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = WORLD_W * dpr
    canvas.height = WORLD_H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // 各章背景第一次用到時才畫，之後重複使用
    const backgrounds = new Map<number, HTMLCanvasElement>()
    const backgroundFor = (theme: number) => {
      let bg = backgrounds.get(theme)
      if (!bg) {
        bg = createBackground(dpr, theme)
        backgrounds.set(theme, bg)
      }
      return bg
    }

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const idx = levelIdxRef.current
      const lv = LEVELS[idx]
      const world = worldRef.current
      const strokes = strokesRef.current.flat()
      if (phaseRef.current === 'rolling') {
        const ev = step(world, lv, strokes, dt)
        Sfx.bump(ev.impact)
        if (ev.spring) Sfx.spring()
        if (ev.captured) Sfx.capture()
        if (ev.result === 'won') {
          phaseRef.current = 'won'
          setPhase('won')
          burstConfetti(fxRef.current, lv.goal)
          const stars = starsFor(lv, inkRef.current)
          const prev = bestRef.current[idx]
          setWinResult({ stars, ink: inkRef.current, newBest: prev > 0 && stars > prev })
          setProgress(p => ({ ...p, stars: p.stars.map((v, i) => (i === idx ? Math.max(v, stars) : v)) }))
          Sfx.win()
          for (let i = 0; i < stars; i++) setTimeout(() => Sfx.star(i), 500 + i * 250)
        } else if (ev.result !== 'ok') {
          phaseRef.current = 'failed'
          setPhase('failed')
          setFailReason(ev.result)
          Sfx.fail()
        }
      }
      updateFx(fxRef.current, world, phaseRef.current, Math.min(dt, 1 / 30))
      const theme = LEVEL_CHAPTER[idx]
      render(ctx, backgroundFor(theme), lv, strokes, world, fxRef.current, phaseRef.current, now / 1000, theme)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const changePhase = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  // 重新放球但保留已畫的線，方便小朋友微調
  const resetBall = () => {
    const lv = LEVELS[levelIdxRef.current]
    worldRef.current = createWorld(lv)
    fxRef.current = { ...createFx(lv), particles: fxRef.current.particles }
    lastPointRef.current = null
    changePhase('ready')
  }

  const syncInk = () => {
    inkRef.current = strokesRef.current.flat().reduce((a, sg) => a + segLength(sg), 0)
    setInkUsed(inkRef.current)
    setStrokeCount(strokesRef.current.length)
    setInkOut(false)
  }

  const clearLines = () => {
    strokesRef.current = []
    syncInk()
  }

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1)
    syncInk()
  }

  const selectLevel = (i: number) => {
    levelIdxRef.current = i
    setLevelIdx(i)
    setView('play')
    setWinResult(null)
    clearLines()
    resetBall()
  }

  const openMap = () => {
    resetBall()
    setView('map')
  }

  const dropBall = () => {
    Sfx.start()
    changePhase('rolling')
  }

  const toWorld = (e: ReactPointerEvent<HTMLCanvasElement>): Vec => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * WORLD_W,
      y: ((e.clientY - rect.top) / rect.height) * WORLD_H,
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'ready' && phaseRef.current !== 'rolling') return
    e.currentTarget.setPointerCapture(e.pointerId)
    lastPointRef.current = toWorld(e)
    drawingRef.current = null
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const last = lastPointRef.current
    if (!last) return
    if (phaseRef.current !== 'ready' && phaseRef.current !== 'rolling') {
      lastPointRef.current = null
      return
    }
    const p = toWorld(e)
    const seg = { a: last, b: p }
    const len = segLength(seg)
    if (len < MIN_POINT_GAP) return
    lastPointRef.current = p
    const onBall = worldRef.current.balls.some(b => !b.done && distToSeg(b.pos, seg) < BALL_CLEARANCE)
    if (onBall) {
      drawingRef.current = null // 跳過球身那一段，之後的線另起一筆
      return
    }
    const limit = inkRules(LEVELS[levelIdxRef.current]).limit
    if (inkModeRef.current === 'limited' && inkRef.current + len > limit) {
      if (!inkOut) Sfx.inkOut()
      setInkOut(true)
      lastPointRef.current = null
      return
    }
    if (!drawingRef.current) {
      drawingRef.current = []
      strokesRef.current = [...strokesRef.current, drawingRef.current]
      setStrokeCount(strokesRef.current.length)
    }
    drawingRef.current.push(seg)
    inkRef.current += len
    setInkUsed(inkRef.current)
  }

  const endStroke = () => {
    lastPointRef.current = null
    drawingRef.current = null
  }

  const setInkMode = (inkMode: InkMode) => setProgress(p => ({ ...p, inkMode }))
  const toggleMute = () => setProgress(p => ({ ...p, muted: !p.muted }))

  // 墨水條以「有限墨水上限」為全長；無限模式超過上限時填滿
  const pct = (v: number) => `${Math.min(100, (v / rules.limit) * 100)}%`
  const liveStars = starsFor(level, inkUsed)
  const isLast = levelIdx === LEVELS.length - 1
  const nextUnlocked = !isLast && isUnlocked(progress.stars, levelIdx + 1)

  return (
    <div className="db-game">
      <div className="db-rotate-hint">📱↻ 把手機橫放，畫面更大更好玩！</div>

      <div className="db-top">
        {view === 'play' ? (
          <button className="db-chip" onClick={openMap}>
            🗺️ 地圖 <span className="db-chip-sub">⭐ {totalStars}/{LEVELS.length * 3}</span>
          </button>
        ) : (
          <span className="db-chip static">
            🗺️ 關卡地圖 <span className="db-chip-sub">⭐ {totalStars}/{LEVELS.length * 3}</span>
          </span>
        )}
        <div className="db-top-right">
          <button className="db-chip" onClick={() => setShowRules(true)}>
            ⭐ 星星怎麼拿？
          </button>
          <button className="db-chip icon" onClick={toggleMute} title={progress.muted ? '開啟音效' : '關閉音效'}>
            {progress.muted ? '🔇' : '🔊'}
          </button>
          <div className="db-ink-toggle" role="group" aria-label="墨水模式">
            <button className={limited ? 'active' : ''} onClick={() => setInkMode('limited')}>
              🖍️ 有限
            </button>
            <button className={!limited ? 'active' : ''} onClick={() => setInkMode('unlimited')}>
              ♾️ 無限
            </button>
          </div>
        </div>
      </div>

      {view === 'map' && (
        <LevelMap
          chapters={CHAPTERS}
          stars={progress.stars}
          current={firstOpenLevel(progress.stars)}
          isUnlocked={i => isUnlocked(progress.stars, i)}
          onSelect={selectLevel}
        />
      )}

      {/* 畫布常駐以維持繪圖迴圈，地圖模式時只是隱藏 */}
      <div className="db-card" hidden={view !== 'play'}>
        <div className="db-info">
          <span className="db-level-badge">第 {levelIdx + 1} 關</span>
          <h2 className="db-level-name">{level.name}</h2>
          {progress.stars[levelIdx] > 0 && (
            <span className="db-best" title="這關的最佳紀錄">
              最佳 <StarRow n={progress.stars[levelIdx]} />
            </span>
          )}
        </div>
        <p className="db-hint">💡 {level.hint}</p>

        <div className={`db-ink-row ${inkOut ? 'out' : ''}`}>
          <div className="db-ink-bar">
            <div className="db-zone z3" style={{ width: pct(rules.star3) }} />
            <div className="db-zone z2" style={{ left: pct(rules.star3), width: `calc(${pct(rules.star2)} - ${pct(rules.star3)})` }} />
            <div className="db-zone z1" style={{ left: pct(rules.star2), right: 0 }} />
            <div className="db-ink-fill" style={{ width: pct(inkUsed) }} />
            <span className="db-zone-label" style={{ left: 0, width: pct(rules.star3) }}>★★★</span>
            <span className="db-zone-label" style={{ left: pct(rules.star3), width: `calc(${pct(rules.star2)} - ${pct(rules.star3)})` }}>★★</span>
            <span className="db-zone-label" style={{ left: pct(rules.star2), right: 0 }}>★</span>
          </div>
          <div className="db-ink-text">
            <span>🖍️ {toDots(inkUsed)}{limited && ` / ${toDots(rules.limit)}`}</span>
            <StarRow n={liveStars} size="small" />
          </div>
        </div>
        {inkOut && <p className="db-toast">🖍️ 墨水用完了！按「↶ 復原」或「清除線條」把墨水拿回來。</p>}

        <div className="db-stage">
          <canvas
            ref={canvasRef}
            className={`db-canvas ${canDraw ? '' : 'locked'}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
          />
          {phase === 'won' && winResult && (
            <div className="db-overlay">
              <div className="db-overlay-box win">
                <div className="db-win-stars">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className={i < winResult.stars ? 'on' : 'off'}
                      style={{ animationDelay: `${0.4 + i * 0.25}s` }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="db-overlay-title">
                  {isLast ? '全部破關！太厲害了！' : '過關！'}
                  {winResult.newBest && <span className="db-new-best">新紀錄！</span>}
                </p>
                <p className="db-overlay-sub">
                  用了 {toDots(winResult.ink)} 點墨水
                  {winResult.stars < 3 &&
                    `，再少用 ${toDots(winResult.ink - (winResult.stars === 2 ? rules.star3 : rules.star2))} 點就能拿 ${winResult.stars + 1} 顆星！`}
                </p>
                <div className="db-overlay-actions">
                  <button className="db-btn secondary" onClick={openMap}>
                    🗺️ 地圖
                  </button>
                  <button className="db-btn secondary" onClick={resetBall}>
                    再玩一次
                  </button>
                  {nextUnlocked && (
                    <button className="db-btn primary" onClick={() => selectLevel(levelIdx + 1)}>
                      下一關 →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {phase === 'failed' && (
            <div className="db-overlay">
              <div className="db-overlay-box fail">
                <div className="db-overlay-emoji">{FAIL_INFO[failReason].emoji}</div>
                <p className="db-overlay-title">{FAIL_INFO[failReason].text}</p>
                <p className="db-overlay-sub">畫好的線會保留，改一改再試試看！</p>
                <div className="db-overlay-actions">
                  <button className="db-btn danger" onClick={() => { clearLines(); resetBall() }}>
                    清除重畫
                  </button>
                  <button className="db-btn primary" onClick={resetBall}>
                    再試一次
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {canDraw && (
          <div className="db-controls">
            {phase === 'ready' ? (
              <button className="db-btn primary big" onClick={dropBall}>
                ▶ 放球！
              </button>
            ) : (
              <button className="db-btn secondary big" onClick={resetBall}>
                ↺ 重新放球
              </button>
            )}
            <button className="db-btn secondary" onClick={undo} disabled={strokeCount === 0}>
              ↶ 復原
            </button>
            <button className="db-btn danger" onClick={clearLines} disabled={strokeCount === 0}>
              🧽 清除線條
            </button>
          </div>
        )}
      </div>

      {showRules && (
        <div className="db-modal" onClick={() => setShowRules(false)}>
          <div className="db-modal-box rules" onClick={e => e.stopPropagation()}>
            <div className="db-modal-head">
              <h3>⭐ 星星怎麼拿？</h3>
              <button className="db-close" onClick={() => setShowRules(false)} aria-label="關閉">
                ✕
              </button>
            </div>
            <p>
              <b>過關就有 1 顆星。</b>用的墨水越少，星星越多！
            </p>
            <ul className="db-rule-list">
              <li>
                <span className="db-swatch z3" /> 墨水條在<b>綠色區</b>就過關 → <StarRow n={3} />
              </li>
              <li>
                <span className="db-swatch z2" /> 在<b>黃色區</b>過關 → <StarRow n={2} />
              </li>
              <li>
                <span className="db-swatch z1" /> 在<b>紅色區</b>過關 → <StarRow n={1} />
              </li>
            </ul>
            <div className="db-rule-level">
              <b>這一關（第 {levelIdx + 1} 關）：</b>
              <br />
              墨水 ≤ {toDots(rules.star3)} 點 → 3 顆星；≤ {toDots(rules.star2)} 點 → 2 顆星
              {limited && <>；有限墨水最多 {toDots(rules.limit)} 點</>}
            </div>
            <ul className="db-rule-notes">
              <li>墨水只算<b>過關那一刻</b>畫面上的線。按「↶ 復原」或「清除線條」，墨水會還給你。</li>
              <li>每一關會記住你拿過<b>最多</b>的星星，可以回去重玩刷新紀錄。</li>
              <li>選「♾️ 無限墨水」也一樣算星星，只是不會畫到一半沒墨水。</li>
              <li>1 點墨水 = 一小段線（約一顆球的一半長）。</li>
            </ul>
            <button className="db-btn primary" onClick={() => setShowRules(false)}>
              知道了！
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
