import { useEffect, useRef } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ARCHIPELAGOS } from './data'
import { anglesFacing, buildScene, frontArchId, wrapAngle } from './geometry'
import type { Angles, GameIsle } from './geometry'
import { CANVAS_RATIO, drawPlanet, hitTest, planetRadius } from './render'
import type { Frame } from './render'
import './PlanetGlobe.css'

const SCENE = buildScene(ARCHIPELAGOS)
const GAME_ISLES = SCENE.isles.filter((i): i is GameIsle => i.game !== null)

const AUTO_SPIN = 0.12 // 閒置時的自轉速度（弧度／秒）
const IDLE_BEFORE_SPIN = 4000 // 停手幾毫秒後才開始自轉
const DRAG_THRESHOLD = 6 // 移動超過幾像素才算拖曳，否則當作點擊
const PITCH_LIMIT = 1.1
const KEY_STEP = 0.2
const NARROW = 600 // 星球寬度小於此值（手機）時，只顯示靠近正面的名牌，避免擠成一團

interface Props {
  /** 清單上正被指著的遊戲；有值時星球轉過去並標出那座島 */
  highlightId: string | null
  /** 最靠正面的群島改變時通知清單 */
  onFrontChange: (archId: string) => void
}

// 每一幀都會讀寫的狀態放在 ref，不經過 React 重新渲染
interface Motion extends Angles {
  target: Angles | null
  time: number
  idleSince: number
  hoverId: string | null
  holdId: string | null
  drag: { id: number; x: number; y: number; moved: boolean } | null
  width: number
  dpr: number
  front: string
  request: () => void
}

function initialMotion(): Motion {
  const start = anglesFacing(SCENE.groups[0]?.center ?? [0, 0, 1])
  return {
    // 一開始稍微偏一點，看得到第一座群島也看得到下一座
    yaw: start.yaw + 0.35,
    pitch: start.pitch * 0.6,
    target: null,
    time: 0,
    idleSince: 0,
    hoverId: null,
    holdId: null,
    drag: null,
    width: 0,
    dpr: 1,
    front: '',
    request: () => {},
  }
}

const clampPitch = (p: number) => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p))

const frameOf = (m: Motion): Frame => ({
  yaw: m.yaw,
  pitch: m.pitch,
  width: m.width,
  dpr: m.dpr,
  time: m.time,
  hoverId: m.hoverId ?? m.holdId,
})

const localPoint = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
  const rect = e.currentTarget.getBoundingClientRect()
  return [e.clientX - rect.left, e.clientY - rect.top]
}

export default function PlanetGlobe({ highlightId, onFrontChange }: Props) {
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tagRefs = useRef(new Map<string, HTMLAnchorElement>())
  const onFrontRef = useRef(onFrontChange)
  const motion = useRef<Motion>(initialMotion())

  useEffect(() => {
    onFrontRef.current = onFrontChange
  }, [onFrontChange])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !wrap || !ctx) return
    const m = motion.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = 0

    const step = (now: number, dt: number) => {
      if (!reduce) m.time += dt
      if (m.target) {
        const dy = wrapAngle(m.target.yaw - m.yaw)
        const dp = m.target.pitch - m.pitch
        // 依經過時間緩動，約一秒轉到位，不受螢幕更新率影響
        const k = reduce ? 1 : 1 - Math.pow(0.0005, dt)
        m.yaw += dy * k
        m.pitch += dp * k
        if (reduce || (Math.abs(dy) < 0.002 && Math.abs(dp) < 0.002)) {
          m.target = null
          m.idleSince = now
        }
      } else if (!reduce && !m.drag && !m.holdId && now - m.idleSince > IDLE_BEFORE_SPIN) {
        m.yaw += AUTO_SPIN * dt
      }
    }

    const paint = () => {
      const tags = drawPlanet(ctx, SCENE, frameOf(m))
      const lit = m.hoverId ?? m.holdId
      const fadeFrom = m.width < NARROW ? 0.5 : 0.15
      for (const t of tags) {
        const el = tagRefs.current.get(t.id)
        if (!el) continue
        const o = Math.max(0, Math.min(1, (t.depth - fadeFrom) / 0.25))
        el.style.opacity = o.toFixed(2)
        el.style.visibility = o > 0 ? 'visible' : 'hidden'
        el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
        el.style.zIndex = String(10 + Math.round(t.depth * 10))
        el.style.transform =
          `translate(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px) translate(-50%, ${t.below ? '0' : '-100%'})`
        el.classList.toggle('on', t.id === lit)
      }
      const front = frontArchId(SCENE, m)
      if (front !== m.front) {
        m.front = front
        onFrontRef.current(front)
      }
    }

    const frame = (now: number) => {
      raf = 0
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      step(now, dt)
      paint()
      // 平常持續轉動；使用者開啟「減少動態效果」時不自轉，只在操作後重畫一次
      if (!reduce) raf = requestAnimationFrame(frame)
    }
    m.request = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      m.width = wrap.clientWidth
      m.dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(m.width * m.dpr)
      canvas.height = Math.round(m.width * CANVAS_RATIO * m.dpr)
      m.request()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    resize()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      m.request = () => {}
    }
  }, [])

  useEffect(() => {
    const m = motion.current
    m.holdId = highlightId
    const isle = highlightId ? GAME_ISLES.find(i => i.game.id === highlightId) : undefined
    if (isle) m.target = anglesFacing(isle.center)
    else m.idleSince = performance.now()
    m.request()
  }, [highlightId])

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const m = motion.current
    e.currentTarget.setPointerCapture(e.pointerId)
    m.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
    m.target = null
  }

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const m = motion.current
    const d = m.drag
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      d.moved = true
      const k = 1 / (planetRadius(m.width) || 200)
      m.yaw += dx * k
      m.pitch = clampPitch(m.pitch + dy * k)
      d.x = e.clientX
      d.y = e.clientY
      m.request()
      return
    }
    if (e.pointerType !== 'mouse') return
    const [x, y] = localPoint(e)
    const id = hitTest(SCENE, frameOf(m), x, y)?.game?.id ?? null
    if (id !== m.hoverId) {
      m.hoverId = id
      e.currentTarget.style.cursor = id ? 'pointer' : ''
      m.request()
    }
  }

  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const m = motion.current
    const d = m.drag
    if (!d || d.id !== e.pointerId) return
    m.drag = null
    m.idleSince = performance.now()
    if (d.moved) return
    const [x, y] = localPoint(e)
    const game = hitTest(SCENE, frameOf(m), x, y)?.game
    if (game) navigate(game.path)
  }

  const onPointerCancel = () => {
    const m = motion.current
    m.drag = null
    m.idleSince = performance.now()
  }

  const onPointerLeave = (e: PointerEvent<HTMLCanvasElement>) => {
    const m = motion.current
    if (!m.hoverId) return
    m.hoverId = null
    e.currentTarget.style.cursor = ''
    m.request()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const m = motion.current
    if (e.key === 'ArrowLeft') m.yaw -= KEY_STEP
    else if (e.key === 'ArrowRight') m.yaw += KEY_STEP
    else if (e.key === 'ArrowUp') m.pitch = clampPitch(m.pitch - KEY_STEP)
    else if (e.key === 'ArrowDown') m.pitch = clampPitch(m.pitch + KEY_STEP)
    else return
    e.preventDefault()
    m.target = null
    m.idleSince = performance.now()
    m.request()
  }

  return (
    <div className="pl-globe" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="pl-canvas"
        tabIndex={0}
        role="img"
        aria-label="可旋轉的遊戲星球，上面有各類遊戲的群島。可用方向鍵旋轉，或使用旁邊的遊戲清單進入遊戲。"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
      />
      {/* 島上的名牌只是滑鼠捷徑；鍵盤與螢幕閱讀器使用旁邊的清單 */}
      {GAME_ISLES.map(isle => (
        <Link
          key={isle.game.id}
          to={isle.game.path}
          className="pl-tag"
          tabIndex={-1}
          aria-hidden="true"
          draggable={false}
          style={{ '--pl-c': isle.color } as CSSProperties}
          ref={el => {
            if (el) tagRefs.current.set(isle.game.id, el)
            else tagRefs.current.delete(isle.game.id)
          }}
        >
          {isle.game.name}
        </Link>
      ))}
    </div>
  )
}
