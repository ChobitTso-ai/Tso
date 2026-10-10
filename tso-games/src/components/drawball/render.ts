// 畫線滾球 — 畫布繪製（純 Canvas，不依賴 React）
import { BALL_R, LINE_HALF, cupWalls, moverSeg, segLength } from './physics'
import type { World } from './physics'
import type { Ball, Goal, Level, Mover, Phase, Segment, Vec } from './types'
import { WORLD_H, WORLD_W } from './types'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  color: string
  life: number // 剩餘秒數
}

/** 純視覺用的動態資料，不影響物理 */
export interface FxState {
  angles: number[] // 每顆球的滾動角度，用來轉動球上的笑臉
  trails: Vec[][]
  particles: Particle[]
}

export function createFx(level: Level): FxState {
  return { angles: level.starts.map(() => 0), trails: level.starts.map(() => []), particles: [] }
}

const CONFETTI_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c']

export function burstConfetti(fx: FxState, g: Goal) {
  for (let i = 0; i < 70; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
    const v = 250 + Math.random() * 300
    fx.particles.push({
      x: g.x + g.w / 2,
      y: g.y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: Math.random() * Math.PI,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      life: 1.6 + Math.random() * 0.8,
    })
  }
}

export function updateFx(fx: FxState, world: World, phase: Phase, dt: number) {
  world.balls.forEach((ball, i) => {
    const trail = fx.trails[i]
    if (phase === 'rolling' && !ball.done) {
      fx.angles[i] += (ball.vel.x * dt) / BALL_R
      trail.push({ ...ball.pos })
      if (trail.length > 12) trail.shift()
    } else if (trail.length > 0) {
      trail.shift()
    }
  })
  for (const p of fx.particles) {
    p.vy += 600 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += 6 * dt
    p.life -= dt
  }
  fx.particles = fx.particles.filter(p => p.life > 0)
}

type Painter = (ctx: CanvasRenderingContext2D) => void

function skyGradient(ctx: CanvasRenderingContext2D, stops: string[]) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H)
  stops.forEach((c, i) => sky.addColorStop(i / (stops.length - 1), c))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)
}

function clouds(ctx: CanvasRenderingContext2D, color: string) {
  const list: [number, number, number][] = [
    [90, 70, 1], [330, 40, 0.8], [520, 95, 1.1], [740, 55, 0.9], [230, 210, 0.7], [640, 250, 0.75],
  ]
  ctx.fillStyle = color
  for (const [cx, cy, k] of list) {
    ctx.beginPath()
    ctx.ellipse(cx, cy, 46 * k, 16 * k, 0, 0, Math.PI * 2)
    ctx.ellipse(cx - 22 * k, cy - 8 * k, 24 * k, 18 * k, 0, 0, Math.PI * 2)
    ctx.ellipse(cx + 16 * k, cy - 12 * k, 28 * k, 22 * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** 遠景起伏的山丘或沙丘，顏色很淡，避免被誤認成可以踩的地面 */
function hills(ctx: CanvasRenderingContext2D, color: string, base: number, amp: number, waves: number) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, WORLD_H)
  for (let x = 0; x <= WORLD_W; x += 10) {
    ctx.lineTo(x, base - Math.sin((x / WORLD_W) * Math.PI * waves) * amp)
  }
  ctx.lineTo(WORLD_W, WORLD_H)
  ctx.closePath()
  ctx.fill()
}

function emojiDeco(ctx: CanvasRenderingContext2D, items: [string, number, number, number][], alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const [e, x, y, size] of items) {
    ctx.font = `${size}px sans-serif`
    ctx.fillText(e, x, y)
  }
  ctx.restore()
}

// 每章一種背景，順序對應 CHAPTERS（與關卡地圖的主題一致）
const PAINTERS: Painter[] = [
  // 草原
  ctx => {
    skyGradient(ctx, ['#5fb8f5', '#a9dcfb', '#e3f4ff'])
    clouds(ctx, 'rgba(255,255,255,0.55)')
    hills(ctx, 'rgba(120,200,110,0.18)', 470, 25, 3)
  },
  // 沙漠
  ctx => {
    skyGradient(ctx, ['#ffb56b', '#ffd59a', '#fff1d6'])
    ctx.fillStyle = 'rgba(255,240,180,0.7)'
    ctx.beginPath()
    ctx.arc(690, 80, 46, 0, Math.PI * 2)
    ctx.fill()
    hills(ctx, 'rgba(214,150,70,0.18)', 460, 30, 2.5)
    emojiDeco(ctx, [['🌵', 60, 430, 40], ['🌵', 470, 445, 30], ['🌵', 760, 420, 36]], 0.22)
  },
  // 遊樂園
  ctx => {
    skyGradient(ctx, ['#f59ad0', '#ffc6e4', '#fff0f7'])
    clouds(ctx, 'rgba(255,255,255,0.45)')
    emojiDeco(ctx, [['🎡', 700, 380, 120], ['🎈', 60, 120, 34], ['🎈', 420, 60, 28], ['🎪', 120, 430, 70]], 0.18)
  },
  // 機械城
  ctx => {
    skyGradient(ctx, ['#7f91ab', '#b7c3d3', '#e4e9f0'])
    ctx.fillStyle = 'rgba(70,85,110,0.15)'
    const towers = [[40, 330], [120, 380], [210, 300], [300, 360], [380, 270], [470, 340], [560, 310], [650, 370], [730, 290]]
    for (const [x, y] of towers) ctx.fillRect(x, y, 70, WORLD_H - y)
    emojiDeco(ctx, [['⚙️', 90, 90, 70], ['⚙️', 150, 140, 40], ['⚙️', 700, 120, 60]], 0.16)
  },
  // 彩虹
  ctx => {
    skyGradient(ctx, ['#a994f5', '#cfc2ff', '#f1edff'])
    const colors = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa']
    ctx.lineWidth = 12
    colors.forEach((c, i) => {
      ctx.strokeStyle = c
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.arc(400, 520, 380 - i * 12, Math.PI, 0)
      ctx.stroke()
    })
    ctx.globalAlpha = 1
    clouds(ctx, 'rgba(255,255,255,0.5)')
  },
  // 星空山頂
  ctx => {
    skyGradient(ctx, ['#11153f', '#262a6b', '#3d3a8a'])
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    for (let i = 0; i < 70; i++) {
      // 固定公式打散星星位置，每次畫出來都一樣
      const x = (i * 137) % WORLD_W
      const y = (i * 71) % 380
      ctx.beginPath()
      ctx.arc(x, y, (i % 3) * 0.6 + 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,244,200,0.85)'
    ctx.beginPath()
    ctx.arc(700, 80, 34, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#262a6b'
    ctx.beginPath()
    ctx.arc(715, 70, 30, 0, Math.PI * 2)
    ctx.fill()
    hills(ctx, 'rgba(140,140,220,0.16)', 440, 50, 2)
  },
]

/** 玩家畫線的顏色（外框、主色）：夜空背景改用亮黃色才看得清楚 */
const INK_COLORS: [string, string][] = [
  ['#3c1a8f', '#7b4dff'],
  ['#3c1a8f', '#7b4dff'],
  ['#3c1a8f', '#7b4dff'],
  ['#3c1a8f', '#7b4dff'],
  ['#3c1a8f', '#7b4dff'],
  ['#8a5a00', '#ffd43b'],
]

/** 背景只畫一次，存在離屏畫布重複使用 */
export function createBackground(dpr: number, theme: number): HTMLCanvasElement {
  const bg = document.createElement('canvas')
  bg.width = WORLD_W * dpr
  bg.height = WORLD_H * dpr
  const ctx = bg.getContext('2d')
  if (!ctx) return bg
  ctx.scale(dpr, dpr)
  PAINTERS[theme % PAINTERS.length](ctx)

  // 淡淡的點陣，讓畫面有「畫紙」的感覺，也方便估算距離
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  for (let x = 20; x < WORLD_W; x += 40) {
    for (let y = 20; y < WORLD_H; y += 40) {
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return bg
}

function strokePath(ctx: CanvasRenderingContext2D, segs: Segment[], color: string, width: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (const s of segs) {
    ctx.moveTo(s.a.x, s.a.y)
    ctx.lineTo(s.b.x, s.b.y)
  }
  ctx.stroke()
}

/** 木板：深色外框 ＋ 木頭色 ＋ 高光 */
function drawPlanks(ctx: CanvasRenderingContext2D, segs: Segment[]) {
  if (segs.length === 0) return
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowOffsetY = 4
  ctx.shadowBlur = 6
  strokePath(ctx, segs, '#6b3f1d', 16)
  ctx.restore()
  strokePath(ctx, segs, '#c98a4b', 11)
  ctx.save()
  ctx.translate(0, -2)
  strokePath(ctx, segs, 'rgba(255,230,190,0.55)', 3)
  ctx.restore()
}

/** 玩家畫的線：像粗麥克筆 */
function drawInk(ctx: CanvasRenderingContext2D, segs: Segment[], theme: number) {
  if (segs.length === 0) return
  const [outer, inner] = INK_COLORS[theme % INK_COLORS.length]
  ctx.save()
  ctx.shadowColor = 'rgba(30,20,80,0.3)'
  ctx.shadowOffsetY = 3
  ctx.shadowBlur = 4
  strokePath(ctx, segs, outer, LINE_HALF * 2 + 4)
  ctx.restore()
  strokePath(ctx, segs, inner, LINE_HALF * 2)
  strokePath(ctx, segs, 'rgba(255,255,255,0.35)', 1.5)
}

function drawSpikes(ctx: CanvasRenderingContext2D, s: Segment) {
  const len = segLength(s)
  const ux = (s.b.x - s.a.x) / len
  const uy = (s.b.y - s.a.y) / len
  const size = 14
  const tip = 15
  strokePath(ctx, [s], '#495057', 6)
  for (let d = 0; d < len - 2; d += size) {
    const w = Math.min(size, len - d)
    const x = s.a.x + ux * d
    const y = s.a.y + uy * d
    const mx = x + ux * (w / 2)
    const my = y + uy * (w / 2)
    // 尖刺朝向線段兩側
    for (const side of [1, -1]) {
      const tx = mx - uy * tip * side
      const ty = my + ux * tip * side
      const grad = ctx.createLinearGradient(mx, my, tx, ty)
      grad.addColorStop(0, '#868e96')
      grad.addColorStop(0.45, '#dee2e6')
      grad.addColorStop(0.6, '#ff8787')
      grad.addColorStop(1, '#e03131')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(tx, ty)
      ctx.lineTo(x + ux * w, y + uy * w)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#495057'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
}

/** 彈簧：底座＋鋸齒彈簧＋粉紅色彈板 */
function drawSpring(ctx: CanvasRenderingContext2D, s: Segment) {
  const len = segLength(s)
  const ux = (s.b.x - s.a.x) / len
  const uy = (s.b.y - s.a.y) / len
  // 彈板朝上的那一側（法向量取 y 較小的方向）
  let nx = uy
  let ny = -ux
  if (ny > 0 || (ny === 0 && nx < 0)) {
    nx = -nx
    ny = -ny
  }
  const coil = 10
  ctx.strokeStyle = '#868e96'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const steps = Math.max(4, Math.floor(len / 14))
  for (const side of [0.2, 0.8]) {
    const bx = s.a.x + ux * len * side
    const by = s.a.y + uy * len * side
    ctx.moveTo(bx - nx * 2, by - ny * 2)
    for (let i = 1; i <= 4; i++) {
      const off = i % 2 ? 6 : -6
      ctx.lineTo(bx - nx * (2 + (i * coil) / 4) + ux * off, by - ny * (2 + (i * coil) / 4) + uy * off)
    }
  }
  ctx.stroke()
  strokePath(ctx, [s], '#a61e4d', 10)
  strokePath(ctx, [s], '#f06595', 6)
  ctx.fillStyle = '#fff'
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    ctx.beginPath()
    ctx.arc(s.a.x + ux * len * t, s.a.y + uy * len * t, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** 移動機關：先畫虛線軌道與兩端箭頭，提示它會怎麼動 */
function drawMoverTrack(ctx: CanvasRenderingContext2D, m: Mover) {
  const cx = (m.seg.a.x + m.seg.b.x) / 2
  const cy = (m.seg.a.y + m.seg.b.y) / 2
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(cx - m.dx, cy - m.dy)
  ctx.lineTo(cx + m.dx, cy + m.dy)
  ctx.stroke()
  ctx.restore()
  const len = Math.hypot(m.dx, m.dy)
  const ux = m.dx / len
  const uy = m.dy / len
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  for (const dir of [1, -1]) {
    const tx = cx + m.dx * dir
    const ty = cy + m.dy * dir
    ctx.beginPath()
    ctx.moveTo(tx + ux * 7 * dir, ty + uy * 7 * dir)
    ctx.lineTo(tx - uy * 6, ty + ux * 6)
    ctx.lineTo(tx + uy * 6, ty - ux * 6)
    ctx.closePath()
    ctx.fill()
  }
}

function drawGoal(ctx: CanvasRenderingContext2D, g: Goal, t: number) {
  const cx = g.x + g.w / 2
  const pulse = 0.5 + 0.5 * Math.sin(t * 3)

  const glow = ctx.createRadialGradient(cx, g.y + g.h / 2, 5, cx, g.y + g.h / 2, g.w)
  glow.addColorStop(0, `rgba(255,236,120,${0.35 + 0.25 * pulse})`)
  glow.addColorStop(1, 'rgba(255,236,120,0)')
  ctx.fillStyle = glow
  ctx.fillRect(g.x - g.w / 2, g.y - g.h, g.w * 2, g.h * 2.5)

  const inside = ctx.createLinearGradient(0, g.y, 0, g.y + g.h)
  inside.addColorStop(0, 'rgba(56,217,169,0.25)')
  inside.addColorStop(1, 'rgba(18,184,134,0.6)')
  ctx.fillStyle = inside
  ctx.fillRect(g.x, g.y, g.w, g.h)
  strokePath(ctx, cupWalls(g), '#087f5b', 10)
  strokePath(ctx, cupWalls(g), '#20c997', 6)

  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⭐', cx, g.y + g.h / 2 + 4)

  // 旗子插在杯子右上角並隨時間飄動
  const px = g.x + g.w
  const top = g.y - 46
  strokePath(ctx, [{ a: { x: px, y: g.y }, b: { x: px, y: top } }], '#495057', 3)
  ctx.fillStyle = '#ff595e'
  ctx.beginPath()
  ctx.moveTo(px, top)
  for (let i = 0; i <= 8; i++) {
    const fx = px + i * 3.5
    ctx.lineTo(fx, top + 9 + Math.sin(t * 6 + i * 0.7) * 2 - i * 0.3)
  }
  ctx.lineTo(px, top + 18)
  ctx.closePath()
  ctx.fill()
}

const BALL_COLORS: [string, string, string][] = [
  ['#ff8fa3', '#ef233c', '#a4161a'],
  ['#8fd3ff', '#1c7ed6', '#0b4f8a'],
]

function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  idx: number,
  fx: FxState,
  phase: Phase,
  t: number,
) {
  const trail = fx.trails[idx]
  const [light, mid, dark] = BALL_COLORS[idx % BALL_COLORS.length]
  trail.forEach((p, i) => {
    const a = (i + 1) / trail.length
    ctx.globalAlpha = a * 0.25
    ctx.fillStyle = mid
    ctx.beginPath()
    ctx.arc(p.x, p.y, BALL_R * a, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  })

  const { x, y } = ball.pos
  if (phase === 'ready') {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2.5
    ctx.setLineDash([6, 5])
    ctx.lineDashOffset = -t * 20
    ctx.beginPath()
    ctx.arc(x, y, BALL_R + 7 + Math.sin(t * 4) * 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowOffsetY = 3
  ctx.shadowBlur = 6
  const body = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, BALL_R)
  body.addColorStop(0, light)
  body.addColorStop(0.6, mid)
  body.addColorStop(1, dark)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 笑臉跟著滾動角度轉，看得出球在滾
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(fx.angles[idx])
  ctx.fillStyle = '#2b0a0a'
  ctx.beginPath()
  ctx.arc(-4, -3, 1.8, 0, Math.PI * 2)
  ctx.arc(4, -3, 1.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#2b0a0a'
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, 1, 5, 0.2 * Math.PI, 0.8 * Math.PI)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.ellipse(x - 5, y - 7, 3, 1.8, -0.5, 0, Math.PI * 2)
  ctx.fill()
}

export function render(
  ctx: CanvasRenderingContext2D,
  bg: HTMLCanvasElement,
  level: Level,
  strokes: Segment[],
  world: World,
  fx: FxState,
  phase: Phase,
  t: number,
  theme: number,
) {
  ctx.drawImage(bg, 0, 0, WORLD_W, WORLD_H)
  const movers = level.movers ?? []
  movers.forEach(m => drawMoverTrack(ctx, m))
  drawGoal(ctx, level.goal, t)
  drawPlanks(ctx, level.walls)
  level.spikes.forEach(s => drawSpikes(ctx, s))
  ;(level.springs ?? []).forEach(s => drawSpring(ctx, s))
  for (const m of movers) {
    const seg = moverSeg(m, world.time)
    if (m.kind === 'wall') drawPlanks(ctx, [seg])
    else drawSpikes(ctx, seg)
  }
  drawInk(ctx, strokes, theme)
  world.balls.forEach((b, i) => drawBall(ctx, b, i, fx, phase, t))

  for (const p of fx.particles) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, p.life)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    ctx.fillRect(-4, -2.5, 8, 5)
    ctx.restore()
  }
}
