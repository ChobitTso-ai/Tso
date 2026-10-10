// 畫線滾球 — 畫布繪製（純 Canvas，不依賴 React）
import { cupWalls } from './levels'
import { BALL_R, LINE_HALF, segLength } from './physics'
import type { Ball, Goal, Level, Phase, Segment, Vec } from './types'
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
  angle: number // 球的滾動角度，用來轉動球上的花紋
  trail: Vec[]
  particles: Particle[]
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

export function updateFx(fx: FxState, ball: Ball, phase: Phase, dt: number) {
  if (phase === 'rolling') {
    fx.angle += (ball.vel.x * dt) / BALL_R
    fx.trail.push({ ...ball.pos })
    if (fx.trail.length > 12) fx.trail.shift()
  } else if (phase === 'ready') {
    fx.trail = []
  }
  for (const p of fx.particles) {
    p.vy += 600 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += 6 * dt
    p.life -= dt
  }
  fx.particles = fx.particles.filter(p => p.life > 0)
}

/** 天空背景只畫一次，存在離屏畫布重複使用 */
export function createBackground(dpr: number): HTMLCanvasElement {
  const bg = document.createElement('canvas')
  bg.width = WORLD_W * dpr
  bg.height = WORLD_H * dpr
  const ctx = bg.getContext('2d')
  if (!ctx) return bg
  ctx.scale(dpr, dpr)

  const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H)
  sky.addColorStop(0, '#5fb8f5')
  sky.addColorStop(0.65, '#a9dcfb')
  sky.addColorStop(1, '#e3f4ff')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)

  const clouds: [number, number, number][] = [
    [90, 70, 1], [330, 40, 0.8], [520, 95, 1.1], [740, 55, 0.9], [230, 210, 0.7], [640, 250, 0.75],
  ]
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (const [cx, cy, s] of clouds) {
    ctx.beginPath()
    ctx.ellipse(cx, cy, 46 * s, 16 * s, 0, 0, Math.PI * 2)
    ctx.ellipse(cx - 22 * s, cy - 8 * s, 24 * s, 18 * s, 0, 0, Math.PI * 2)
    ctx.ellipse(cx + 16 * s, cy - 12 * s, 28 * s, 22 * s, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // 淡淡的點陣，讓畫面有「畫紙」的感覺，也方便估算距離
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
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
function drawInk(ctx: CanvasRenderingContext2D, segs: Segment[]) {
  if (segs.length === 0) return
  ctx.save()
  ctx.shadowColor = 'rgba(30,20,80,0.3)'
  ctx.shadowOffsetY = 3
  ctx.shadowBlur = 4
  strokePath(ctx, segs, '#3c1a8f', LINE_HALF * 2 + 4)
  ctx.restore()
  strokePath(ctx, segs, '#7b4dff', LINE_HALF * 2)
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

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, fx: FxState, phase: Phase, t: number) {
  fx.trail.forEach((p, i) => {
    const a = (i + 1) / fx.trail.length
    ctx.fillStyle = `rgba(255,120,120,${a * 0.25})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, BALL_R * a, 0, Math.PI * 2)
    ctx.fill()
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
  body.addColorStop(0, '#ff8fa3')
  body.addColorStop(0.6, '#ef233c')
  body.addColorStop(1, '#a4161a')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 笑臉跟著滾動角度轉，看得出球在滾
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(fx.angle)
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
  ball: Ball,
  fx: FxState,
  phase: Phase,
  t: number,
) {
  ctx.drawImage(bg, 0, 0, WORLD_W, WORLD_H)
  drawGoal(ctx, level.goal, t)
  drawPlanks(ctx, level.walls)
  level.spikes.forEach(s => drawSpikes(ctx, s))
  drawInk(ctx, strokes)
  drawBall(ctx, ball, fx, phase, t)

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
