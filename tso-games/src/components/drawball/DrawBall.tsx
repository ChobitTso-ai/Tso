import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { LEVELS, cupWalls } from './levels'
import { BALL_R, LINE_HALF, segLength, step } from './physics'
import type { Ball, InkMode, Level, Phase, Progress, Segment, Vec } from './types'
import { WORLD_H, WORLD_W } from './types'
import './DrawBall.css'

const STORAGE_KEY = 'drawBallProgress'
const MIN_POINT_GAP = 8 // 筆畫取樣間距，太密會讓線段過多、碰撞變慢

const FAIL_TEXT: Record<'spike' | 'out', string> = {
  spike: '💥 碰到尖刺了！',
  out: '😵 球掉出去了！',
}

function loadProgress(): Progress {
  const fallback: Progress = { unlocked: 0, inkMode: 'limited' }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return fallback
    const p = JSON.parse(saved) as Partial<Progress>
    const u = p.unlocked
    const unlocked = typeof u === 'number' && Number.isInteger(u) && u >= 0 && u < LEVELS.length ? u : 0
    const inkMode: InkMode = p.inkMode === 'unlimited' ? 'unlimited' : 'limited'
    return { unlocked, inkMode }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return fallback
  }
}

function newBall(level: Level): Ball {
  return { pos: { ...level.start }, vel: { x: 0, y: 0 } }
}

function drawSegments(ctx: CanvasRenderingContext2D, segs: Segment[], color: string, width: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const s of segs) {
    ctx.moveTo(s.a.x, s.a.y)
    ctx.lineTo(s.b.x, s.b.y)
  }
  ctx.stroke()
}

function drawSpikes(ctx: CanvasRenderingContext2D, s: Segment) {
  const len = segLength(s)
  const ux = (s.b.x - s.a.x) / len
  const uy = (s.b.y - s.a.y) / len
  const size = 10
  ctx.fillStyle = '#ff5c5c'
  for (let d = 0; d < len; d += size) {
    const x = s.a.x + ux * d
    const y = s.a.y + uy * d
    const tip = size * 0.9
    ctx.beginPath()
    ctx.moveTo(x - uy * tip, y + ux * tip)
    ctx.lineTo(x + uy * tip, y - ux * tip)
    ctx.lineTo(x + ux * size, y + uy * size)
    ctx.closePath()
    ctx.fill()
  }
}

function render(ctx: CanvasRenderingContext2D, level: Level, strokes: Segment[], ball: Ball) {
  ctx.fillStyle = '#13213b'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)

  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= WORLD_W; x += 40) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, WORLD_H)
  }
  for (let y = 0; y <= WORLD_H; y += 40) {
    ctx.moveTo(0, y)
    ctx.lineTo(WORLD_W, y)
  }
  ctx.stroke()

  const g = level.goal
  ctx.fillStyle = 'rgba(6,214,160,0.18)'
  ctx.fillRect(g.x, g.y, g.w, g.h)
  drawSegments(ctx, cupWalls(g), '#06d6a0', 6)
  ctx.font = '26px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('🏁', g.x + g.w / 2, g.y - 8)

  drawSegments(ctx, level.walls, '#8ecae6', 8)
  level.spikes.forEach(s => drawSpikes(ctx, s))
  drawSegments(ctx, strokes, '#ffd166', LINE_HALF * 2)

  const { x, y } = ball.pos
  ctx.fillStyle = '#ef476f'
  ctx.beginPath()
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.arc(x - 4, y - 4, 4, 0, Math.PI * 2)
  ctx.fill()
}

export default function DrawBall() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [levelIdx, setLevelIdx] = useState(() => progress.unlocked)
  const [phase, setPhase] = useState<Phase>('ready')
  const [failText, setFailText] = useState('')
  const [inkUsed, setInkUsed] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 遊戲世界放在 ref，由 requestAnimationFrame 迴圈直接讀寫，不經過 React 重繪
  const levelIdxRef = useRef(levelIdx)
  const phaseRef = useRef<Phase>('ready')
  const ballRef = useRef<Ball>(newBall(LEVELS[levelIdx]))
  const strokesRef = useRef<Segment[]>([])
  const inkRef = useRef(0)
  const lastPointRef = useRef<Vec | null>(null)
  const inkModeRef = useRef<InkMode>(progress.inkMode)

  const level = LEVELS[levelIdx]
  const limited = progress.inkMode === 'limited'
  const canDraw = phase === 'ready' || phase === 'rolling'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    inkModeRef.current = progress.inkMode
  }, [progress])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = WORLD_W * dpr
    canvas.height = WORLD_H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const lv = LEVELS[levelIdxRef.current]
      if (phaseRef.current === 'rolling') {
        const solids = [...lv.walls, ...cupWalls(lv.goal), ...strokesRef.current]
        const result = step(ballRef.current, solids, lv.spikes, lv.goal, dt)
        if (result === 'goal') {
          phaseRef.current = 'won'
          setPhase('won')
          const next = Math.min(levelIdxRef.current + 1, LEVELS.length - 1)
          setProgress(p => ({ ...p, unlocked: Math.max(p.unlocked, next) }))
        } else if (result !== 'ok') {
          phaseRef.current = 'failed'
          setPhase('failed')
          setFailText(FAIL_TEXT[result])
        }
      }
      render(ctx, lv, strokesRef.current, ballRef.current)
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
    ballRef.current = newBall(LEVELS[levelIdxRef.current])
    changePhase('ready')
  }

  const clearLines = () => {
    strokesRef.current = []
    inkRef.current = 0
    setInkUsed(0)
  }

  const selectLevel = (i: number) => {
    levelIdxRef.current = i
    setLevelIdx(i)
    clearLines()
    resetBall()
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
    const limit = LEVELS[levelIdxRef.current].inkLimit
    if (inkModeRef.current === 'limited' && inkRef.current + len > limit) return
    strokesRef.current.push(seg)
    inkRef.current += len
    setInkUsed(inkRef.current)
    lastPointRef.current = p
  }

  const endStroke = () => {
    lastPointRef.current = null
  }

  const setInkMode = (inkMode: InkMode) => setProgress(p => ({ ...p, inkMode }))

  const inkLeft = Math.max(0, level.inkLimit - inkUsed)
  const isLast = levelIdx === LEVELS.length - 1

  return (
    <div className="db-game">
      <div className="db-toolbar">
        <div className="db-levels">
          {LEVELS.map((lv, i) => (
            <button
              key={lv.name}
              className={`db-level-btn ${i === levelIdx ? 'active' : ''}`}
              disabled={i > progress.unlocked}
              onClick={() => selectLevel(i)}
              title={lv.name}
            >
              {i > progress.unlocked ? '🔒' : i + 1}
            </button>
          ))}
        </div>
        <div className="db-ink-toggle">
          <span>墨水：</span>
          <button className={limited ? 'active' : ''} onClick={() => setInkMode('limited')}>
            有限
          </button>
          <button className={!limited ? 'active' : ''} onClick={() => setInkMode('unlimited')}>
            無限
          </button>
        </div>
      </div>

      <div className="db-info">
        <h2 className="db-level-name">
          第 {levelIdx + 1} 關：{level.name}
        </h2>
        <p className="db-hint">{level.hint}</p>
      </div>

      {limited && (
        <div className="db-ink-bar" title={`剩餘墨水 ${Math.round(inkLeft)}`}>
          <div className="db-ink-fill" style={{ width: `${(inkLeft / level.inkLimit) * 100}%` }} />
          <span className="db-ink-label">🖍️ 墨水 {Math.round((inkLeft / level.inkLimit) * 100)}%</span>
        </div>
      )}

      <div className="db-stage">
        <canvas
          ref={canvasRef}
          className={`db-canvas ${canDraw ? '' : 'locked'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
        {phase === 'won' && (
          <div className="db-overlay">
            <div className="db-overlay-box">
              <p className="db-overlay-title">{isLast ? '🎉 全部破關！太厲害了！' : '⭐ 過關！'}</p>
              <div className="db-overlay-actions">
                <button className="db-btn secondary" onClick={resetBall}>
                  再玩一次
                </button>
                {!isLast && (
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
            <div className="db-overlay-box">
              <p className="db-overlay-title">{failText}</p>
              <p className="db-overlay-sub">畫好的線會保留，可以修改後再試。</p>
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

      <div className="db-controls">
        {phase === 'ready' && (
          <button className="db-btn primary" onClick={() => changePhase('rolling')}>
            ▶ 放球
          </button>
        )}
        {phase === 'rolling' && (
          <button className="db-btn secondary" onClick={resetBall}>
            ↺ 重新放球
          </button>
        )}
        <button className="db-btn danger" onClick={clearLines} disabled={!canDraw}>
          🧽 清除線條
        </button>
      </div>
    </div>
  )
}
