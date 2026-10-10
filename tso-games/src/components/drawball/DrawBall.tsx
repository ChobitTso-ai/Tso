import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { LEVELS, cupWalls } from './levels'
import { segLength, step } from './physics'
import { burstConfetti, createBackground, render, updateFx } from './render'
import type { FxState } from './render'
import type { Ball, InkMode, Level, Phase, Progress, Segment, Vec } from './types'
import { WORLD_H, WORLD_W } from './types'
import './DrawBall.css'

const STORAGE_KEY = 'drawBallProgress'
const MIN_POINT_GAP = 8 // 筆畫取樣間距，太密會讓線段過多、碰撞變慢

type FailReason = 'spike' | 'out'

const FAIL_INFO: Record<FailReason, { emoji: string; text: string }> = {
  spike: { emoji: '💥', text: '碰到尖刺了！' },
  out: { emoji: '😵', text: '球掉出去了！' },
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

export default function DrawBall() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [levelIdx, setLevelIdx] = useState(() => progress.unlocked)
  const [phase, setPhase] = useState<Phase>('ready')
  const [failReason, setFailReason] = useState<FailReason>('out')
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
  const fxRef = useRef<FxState>({ angle: 0, trail: [], particles: [] })

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
    const bg = createBackground(dpr)

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
          burstConfetti(fxRef.current, lv.goal)
          const next = Math.min(levelIdxRef.current + 1, LEVELS.length - 1)
          setProgress(p => ({ ...p, unlocked: Math.max(p.unlocked, next) }))
        } else if (result !== 'ok') {
          phaseRef.current = 'failed'
          setPhase('failed')
          setFailReason(result)
        }
      }
      updateFx(fxRef.current, ballRef.current, phaseRef.current, Math.min(dt, 1 / 30))
      render(ctx, bg, lv, strokesRef.current, ballRef.current, fxRef.current, phaseRef.current, now / 1000)
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
    fxRef.current.angle = 0
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

  const inkPct = Math.round((inkLeft / level.inkLimit) * 100)

  return (
    <div className="db-game">
      <div className="db-top">
        <div className="db-levels">
          {LEVELS.map((lv, i) => {
            const locked = i > progress.unlocked
            const cleared = i < progress.unlocked
            return (
              <button
                key={lv.name}
                className={['db-level-btn', i === levelIdx ? 'active' : '', cleared ? 'cleared' : '']
                  .filter(Boolean)
                  .join(' ')}
                disabled={locked}
                onClick={() => selectLevel(i)}
                title={lv.name}
              >
                {locked ? '🔒' : i + 1}
                {cleared && <span className="db-level-star">⭐</span>}
              </button>
            )
          })}
        </div>
        <div className="db-ink-toggle" role="group" aria-label="墨水模式">
          <button className={limited ? 'active' : ''} onClick={() => setInkMode('limited')}>
            🖍️ 有限墨水
          </button>
          <button className={!limited ? 'active' : ''} onClick={() => setInkMode('unlimited')}>
            ♾️ 無限墨水
          </button>
        </div>
      </div>

      <div className="db-card">
        <div className="db-info">
          <span className="db-level-badge">第 {levelIdx + 1} 關</span>
          <h2 className="db-level-name">{level.name}</h2>
        </div>
        <p className="db-hint">💡 {level.hint}</p>

        {limited && (
          <div className="db-ink-row">
            <span className="db-ink-icon">🖍️</span>
            <div className="db-ink-bar" title={`剩餘墨水 ${Math.round(inkLeft)}`}>
              <div
                className={`db-ink-fill ${inkPct <= 20 ? 'low' : ''}`}
                style={{ width: `${inkPct}%` }}
              />
            </div>
            <span className="db-ink-pct">{inkPct}%</span>
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
              <div className="db-overlay-box win">
                <div className="db-overlay-emoji">{isLast ? '🏆' : '🎉'}</div>
                <p className="db-overlay-title">{isLast ? '全部破關！太厲害了！' : '過關！'}</p>
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
          {phase === 'ready' && (
            <button className="db-btn primary big" onClick={() => changePhase('rolling')}>
              ▶ 放球！
            </button>
          )}
          {phase === 'rolling' && (
            <button className="db-btn secondary big" onClick={resetBall}>
              ↺ 重新放球
            </button>
          )}
          <button className="db-btn danger" onClick={clearLines}>
            🧽 清除線條
          </button>
        </div>
        )}
      </div>
    </div>
  )
}
