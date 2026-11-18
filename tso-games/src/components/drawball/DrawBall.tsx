import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CHAPTERS } from './levels'
import { BALL_R, LINE_HALF, createWorld, distToSeg, segLength, step } from './physics'
import type { World } from './physics'
import { DEFAULT_CAMERA, MAX_ZOOM, MIN_ZOOM, clampCamera, screenToWorld, stepZoom, zoomAt } from './camera'
import type { Camera } from './camera'
import AnimalIcon from './AnimalIcon'
import { animalFor } from './animals'
import { burstConfetti, createFx, createLevelLayer, drawOffscreenMarkers, render, updateFx } from './render'
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

const FAIL_INFO: Record<FailReason, { emoji: string; text: (who: string) => string }> = {
  spike: { emoji: '💥', text: who => `${who}碰到尖刺了！` },
  out: { emoji: '😵', text: who => `${who}掉出去了！` },
  stuck: { emoji: '😴', text: who => `${who}停住不動了！` },
}

/** 關卡提示裡的 {A} 換成這一關主角的名字 */
const hintFor = (hint: string, levelIdx: number) => hint.replaceAll('{A}', animalFor(levelIdx, 0).name)


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
  const cardRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<Camera>(DEFAULT_CAMERA)
  // 觸控／滑鼠手勢：記錄每個按下中的指標位置，用來判斷是畫線、拖曳還是雙指縮放
  const pointersRef = useRef(new Map<number, Vec>())
  const gestureRef = useRef<
    | { kind: 'draw'; strokesBefore: number }
    | { kind: 'pan'; last: Vec }
    | { kind: 'pinch'; dist0: number; z0: number; anchor: Vec }
    | { kind: 'idle' }
  >({ kind: 'idle' })
  const [zoom, setZoom] = useState(1)
  const [panMode, setPanMode] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

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
    // 紙張與關卡固定物件只在換關時重畫一次；解析度取 2 倍，放大鏡頭時筆觸才清楚
    const layerScale = Math.min(4, dpr * 2)
    let layer: { idx: number; canvas: HTMLCanvasElement } | null = null
    const layerFor = (idx: number) => {
      if (!layer || layer.idx !== idx) layer = { idx, canvas: createLevelLayer(LEVELS[idx], LEVEL_CHAPTER[idx], layerScale) }
      return layer.canvas
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
      const cam = cameraRef.current
      ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, -cam.x * dpr * cam.z, -cam.y * dpr * cam.z)
      render(ctx, layerFor(idx), lv, idx, strokes, world, fxRef.current, phaseRef.current, now / 1000, theme)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawOffscreenMarkers(ctx, cam, world, lv.goal, idx)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const setCamera = (c: Camera) => {
    cameraRef.current = clampCamera(c)
    setZoom(cameraRef.current.z)
  }

  const resetView = () => {
    setCamera(DEFAULT_CAMERA)
    setPanMode(false)
  }

  // 滑鼠滾輪以游標為中心縮放；React 的 wheel 事件無法 preventDefault，改用原生監聽
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const sx = ((e.clientX - rect.left) / rect.width) * WORLD_W
      const sy = ((e.clientY - rect.top) / rect.height) * WORLD_H
      const c = cameraRef.current
      cameraRef.current = zoomAt(c, c.z * Math.exp(-e.deltaY * 0.0015), sx, sy)
      setZoom(cameraRef.current.z)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  // 使用者按 Esc 離開瀏覽器全螢幕時，同步收起全螢幕版面
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    setFullscreen(false)
  }

  // iPhone Safari 不支援讓一般元素全螢幕，這時只靠 CSS 把遊戲區撐滿畫面
  const toggleFullscreen = () => {
    if (fullscreen) {
      exitFullscreen()
      return
    }
    cardRef.current?.requestFullscreen?.().catch(() => {})
    setFullscreen(true)
  }

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
    resetView()
    clearLines()
    resetBall()
    // 從地圖深處點進來時頁面還捲在下方，遊戲區會被推出畫面頂端
    window.scrollTo(0, 0)
  }

  const openMap = () => {
    exitFullscreen()
    resetBall()
    setView('map')
  }

  const dropBall = () => {
    Sfx.start()
    changePhase('rolling')
  }

  /** 指標位置轉成畫布邏輯座標（尚未套用鏡頭） */
  const toScreen = (e: ReactPointerEvent<HTMLCanvasElement>): Vec => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * WORLD_W,
      y: ((e.clientY - rect.top) / rect.height) * WORLD_H,
    }
  }

  const startPinch = () => {
    const [p1, p2] = [...pointersRef.current.values()]
    const c = cameraRef.current
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    gestureRef.current = {
      kind: 'pinch',
      dist0: Math.max(1, Math.hypot(p1.x - p2.x, p1.y - p2.y)),
      z0: c.z,
      anchor: screenToWorld(c, mid.x, mid.y),
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const sp = toScreen(e)
    pointersRef.current.set(e.pointerId, sp)
    const g = gestureRef.current
    if (pointersRef.current.size === 2) {
      // 第二根手指放下：改為雙指縮放，並撤回第一根手指剛畫出的線
      if (g.kind === 'draw' && strokesRef.current.length > g.strokesBefore) {
        strokesRef.current = strokesRef.current.slice(0, g.strokesBefore)
        syncInk()
      }
      endStroke()
      startPinch()
      return
    }
    if (pointersRef.current.size > 2) return
    // 右鍵、中鍵或「✋ 移動」模式：拖曳畫面
    if (e.button === 1 || e.button === 2 || panMode) {
      gestureRef.current = { kind: 'pan', last: sp }
      return
    }
    if (phaseRef.current !== 'ready' && phaseRef.current !== 'rolling') return
    gestureRef.current = { kind: 'draw', strokesBefore: strokesRef.current.length }
    lastPointRef.current = screenToWorld(cameraRef.current, sp.x, sp.y)
    drawingRef.current = null
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    const sp = toScreen(e)
    pointersRef.current.set(e.pointerId, sp)
    const g = gestureRef.current
    if (g.kind === 'pinch' && pointersRef.current.size >= 2) {
      const [p1, p2] = [...pointersRef.current.values()]
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.z0 * (Math.hypot(p1.x - p2.x, p1.y - p2.y) / g.dist0)))
      // 讓一開始兩指中間的那個世界位置一直跟著兩指中點走，同時完成縮放與平移
      setCamera({ z, x: g.anchor.x - mid.x / z, y: g.anchor.y - mid.y / z })
      return
    }
    if (g.kind === 'pan') {
      const c = cameraRef.current
      setCamera({ z: c.z, x: c.x - (sp.x - g.last.x) / c.z, y: c.y - (sp.y - g.last.y) / c.z })
      gestureRef.current = { kind: 'pan', last: sp }
      return
    }
    if (g.kind === 'draw') drawTo(screenToWorld(cameraRef.current, sp.x, sp.y))
  }

  const drawTo = (p: Vec) => {
    const last = lastPointRef.current
    if (!last) return
    if (phaseRef.current !== 'ready' && phaseRef.current !== 'rolling') {
      lastPointRef.current = null
      return
    }
    const seg = { a: last, b: p }
    const len = segLength(seg)
    // 取樣間距以螢幕上的距離為準，放大時線才不會變得一段一段
    if (len < MIN_POINT_GAP / cameraRef.current.z) return
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

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId)
    endStroke()
    // 雙指縮放放開一根手指時不接著畫線，等全部放開才回到待命
    if (pointersRef.current.size === 0) gestureRef.current = { kind: 'idle' }
    else if (gestureRef.current.kind === 'pinch' && pointersRef.current.size === 1) {
      const [rest] = [...pointersRef.current.values()]
      gestureRef.current = { kind: 'pan', last: rest }
    }
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
      <div ref={cardRef} className={`db-card ${fullscreen ? 'fs' : ''}`} hidden={view !== 'play'}>
        <div className="db-info">
          <span className="db-level-badge">第 {levelIdx + 1} 關</span>
          <h2 className="db-level-name">{level.name}</h2>
          <span className="db-cast" title="這一關的主角">
            {level.starts.map((_, i) => (
              <span key={i} className="db-cast-item">
                <AnimalIcon animal={animalFor(levelIdx, i)} />
                {animalFor(levelIdx, i).name}
              </span>
            ))}
          </span>
          {progress.stars[levelIdx] > 0 && (
            <span className="db-best" title="這關的最佳紀錄">
              最佳 <StarRow n={progress.stars[levelIdx]} />
            </span>
          )}
        </div>
        <p className="db-hint">💡 {hintFor(level.hint, levelIdx)}</p>

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
        {inkOut && <p className="db-toast">🖍️ 墨水用完了！按「↶ 上一步」或「清除線條」把墨水拿回來。</p>}

        <div className="db-stage">
          <canvas
            ref={canvasRef}
            className={`db-canvas ${canDraw ? '' : 'locked'}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={e => e.preventDefault()}
          />
          <div className="db-view-ctrls">
            <button onClick={() => setCamera(stepZoom(cameraRef.current, 1))} disabled={zoom >= MAX_ZOOM} title="放大" aria-label="放大">
              ＋
            </button>
            <button onClick={() => setCamera(stepZoom(cameraRef.current, -1))} disabled={zoom <= MIN_ZOOM} title="縮小" aria-label="縮小">
              －
            </button>
            {zoom > MIN_ZOOM && (
              <>
                <button onClick={resetView} title="看整關" aria-label="看整關">
                  ⟲
                </button>
                <button
                  className={panMode ? 'active' : ''}
                  onClick={() => setPanMode(m => !m)}
                  title={panMode ? '切回畫線' : '拖曳移動畫面'}
                  aria-label="移動畫面"
                >
                  {panMode ? '✏️' : '✋'}
                </button>
              </>
            )}
            <button onClick={toggleFullscreen} title={fullscreen ? '離開全螢幕' : '全螢幕'} aria-label="全螢幕">
              {fullscreen ? '🗗' : '⛶'}
            </button>
          </div>
          {zoom > MIN_ZOOM && <span className="db-zoom-badge">🔍 {Math.round(zoom * 100)}%{panMode && '・移動中'}</span>}
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
                <p className="db-overlay-title">{FAIL_INFO[failReason].text(level.starts.length > 1 ? '小動物' : animalFor(levelIdx, 0).name)}</p>
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
                ▶ 出發！
              </button>
            ) : (
              <button className="db-btn secondary big" onClick={resetBall}>
                ↺ 重新出發
              </button>
            )}
            <button className="db-btn secondary" onClick={undo} disabled={strokeCount === 0}>
              ↶ 上一步
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
              <li>墨水只算<b>過關那一刻</b>畫面上的線。按「↶ 上一步」或「清除線條」，墨水會還給你。</li>
              <li>每一關會記住你拿過<b>最多</b>的星星，可以回去重玩刷新紀錄。</li>
              <li>選「♾️ 無限墨水」也一樣算星星，只是不會畫到一半沒墨水。</li>
              <li>1 點墨水 = 一小段線（約小動物身體的一半長）。</li>
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
