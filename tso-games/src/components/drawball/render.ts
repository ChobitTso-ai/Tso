// 畫線滾球 — 畫布繪製（蠟筆繪本風，純 Canvas，不依賴 React）
import { animalFor } from './animals'
import { crayonCircle, crayonLine, hash, hatch, paper } from './crayon'
import { BALL_R, LINE_HALF, cupWalls, moverSeg, segLength } from './physics'
import type { World } from './physics'
import type { Goal, Level, Mover, Phase, Segment, Vec } from './types'
import { WORLD_H, WORLD_W } from './types'

type Pt = [number, number]

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
  angles: number[] // 每顆球的滾動角度，用來轉動小動物
  trails: Vec[][]
  particles: Particle[]
}

export function createFx(level: Level): FxState {
  return { angles: level.starts.map(() => 0), trails: level.starts.map(() => []), particles: [] }
}

const CONFETTI_COLORS = ['#e8553e', '#f6c90e', '#7cc35b', '#5aa9e6', '#9b7bd9', '#f08c4a']

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
      if (trail.length > 10) trail.shift()
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

/* ── 各章紙張與塗鴉（順序對應 CHAPTERS，與關卡地圖主題一致） ── */

interface Theme {
  paper: string
  grain: string // 蠟筆顆粒用紙色，才像沒塗到的空隙
  ink: string // 玩家畫線顏色
  pencil: string // 待放球時的虛線圈
  doodle: (ctx: CanvasRenderingContext2D, g: string) => void
}

function sun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, edge: string, g: string) {
  hatch(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2) }, [x - r, y - r, x + r, y + r], fill, { gap: 3, alpha: 0.7 })
  crayonCircle(ctx, x, y, r, edge, 4, 11)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    crayonLine(ctx, [[x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10)], [x + Math.cos(a) * (r + 25), y + Math.sin(a) * (r + 25)]], edge, 4, { passes: 2, grain: g })
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, g: string) {
  const pts: Pt[] = []
  for (let a = Math.PI; a <= Math.PI * 3.05; a += 0.25) {
    const bump = 1 + 0.18 * Math.abs(Math.sin(a * 3))
    pts.push([x + Math.cos(a) * 60 * s * bump, y + Math.sin(a) * 22 * s * bump])
  }
  crayonLine(ctx, pts, color, 3.5, { passes: 2, grain: g, seed: x })
}

function grass(ctx: CanvasRenderingContext2D, y: number, color: string, g: string) {
  for (let x = 20; x < WORLD_W; x += 75) {
    crayonLine(ctx, [[x, y], [x + 6, y - 16], [x + 10, y], [x + 16, y - 13], [x + 20, y]], color, 3, { passes: 2, grain: g, seed: x })
  }
}

const THEMES: Theme[] = [
  // 草原
  {
    paper: '#fbf4e2', grain: 'rgba(251,244,226,0.6)', ink: '#6a4bd0', pencil: 'rgba(74,53,32,0.6)',
    doodle: (ctx, g) => {
      sun(ctx, 700, 70, 32, '#ffcf3f', '#f0a020', g)
      cloud(ctx, 130, 70, 1, '#7fb8e8', g)
      cloud(ctx, 420, 55, 0.8, '#7fb8e8', g)
      cloud(ctx, 260, 250, 0.65, '#a9cff0', g)
      grass(ctx, 478, 'rgba(124,195,91,0.7)', g)
    },
  },
  // 沙漠
  {
    paper: '#fbecd0', grain: 'rgba(251,236,208,0.6)', ink: '#6a4bd0', pencil: 'rgba(74,53,32,0.6)',
    doodle: (ctx, g) => {
      sun(ctx, 690, 80, 42, '#ffa94d', '#e8590c', g)
      for (const [base, amp] of [[440, 26], [470, 18]]) {
        const pts: Pt[] = []
        for (let x = 0; x <= WORLD_W; x += 20) pts.push([x, base - Math.sin(x / 130) * amp])
        crayonLine(ctx, pts, 'rgba(214,150,70,0.6)', 4, { passes: 2, grain: g, seed: base })
      }
      for (const [x, y, s] of [[60, 420, 1], [470, 440, 0.7], [760, 410, 0.9]]) {
        crayonLine(ctx, [[x, y + 30 * s], [x, y - 30 * s]], 'rgba(95,160,80,0.75)', 9 * s, { passes: 2, grain: g, seed: x })
        crayonLine(ctx, [[x, y], [x - 14 * s, y], [x - 14 * s, y - 16 * s]], 'rgba(95,160,80,0.75)', 6 * s, { passes: 2, grain: g, seed: x + 1 })
        crayonLine(ctx, [[x, y - 8 * s], [x + 13 * s, y - 8 * s], [x + 13 * s, y - 22 * s]], 'rgba(95,160,80,0.75)', 6 * s, { passes: 2, grain: g, seed: x + 2 })
      }
    },
  },
  // 遊樂園
  {
    paper: '#fdeff4', grain: 'rgba(253,239,244,0.6)', ink: '#6a4bd0', pencil: 'rgba(74,53,32,0.6)',
    doodle: (ctx, g) => {
      const fx = 690
      const fy = 360
      crayonCircle(ctx, fx, fy, 90, 'rgba(224,85,143,0.45)', 4, 21)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        crayonLine(ctx, [[fx, fy], [fx + Math.cos(a) * 90, fy + Math.sin(a) * 90]], 'rgba(224,85,143,0.35)', 2.5, { passes: 1, grain: '' })
        crayonCircle(ctx, fx + Math.cos(a) * 90, fy + Math.sin(a) * 90, 9, 'rgba(90,169,230,0.55)', 2.5, 22 + i)
      }
      crayonLine(ctx, [[fx - 40, 495], [fx, fy], [fx + 40, 495]], 'rgba(224,85,143,0.45)', 4, { passes: 2, grain: g })
      for (const [x, y, c] of [[70, 110, 'rgba(232,85,62,0.6)'], [130, 80, 'rgba(246,201,14,0.7)'], [420, 70, 'rgba(90,169,230,0.6)']] as [number, number, string][]) {
        hatch(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, 16, 20, 0, 0, Math.PI * 2) }, [x - 16, y - 20, x + 16, y + 20], c, { gap: 2.5 })
        crayonLine(ctx, [[x, y + 20], [x - 4, y + 40], [x + 3, y + 60]], 'rgba(74,53,32,0.5)', 1.6, { passes: 1, grain: '' })
      }
    },
  },
  // 機械城
  {
    paper: '#eef0f2', grain: 'rgba(238,240,242,0.6)', ink: '#6a4bd0', pencil: 'rgba(74,53,32,0.6)',
    doodle: (ctx, g) => {
      const towers: [number, number][] = [[30, 340], [110, 390], [200, 310], [290, 370], [380, 290], [470, 350], [560, 320], [650, 380], [730, 300]]
      for (const [x, y] of towers) {
        crayonLine(ctx, [[x, 500], [x, y], [x + 60, y], [x + 60, 500]], 'rgba(110,125,150,0.45)', 3, { passes: 2, grain: g, seed: x })
        for (let wy = y + 18; wy < 480; wy += 28) crayonLine(ctx, [[x + 14, wy], [x + 24, wy]], 'rgba(110,125,150,0.35)', 3, { passes: 1, grain: '' })
      }
      for (const [x, y, r] of [[90, 90, 34], [150, 140, 20], [700, 110, 30]]) {
        crayonCircle(ctx, x, y, r, 'rgba(120,130,145,0.55)', 4, x)
        crayonCircle(ctx, x, y, r * 0.35, 'rgba(120,130,145,0.55)', 3, x + 1)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          crayonLine(ctx, [[x + Math.cos(a) * r, y + Math.sin(a) * r], [x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)]], 'rgba(120,130,145,0.55)', 5, { passes: 1, grain: '' })
        }
      }
    },
  },
  // 彩虹
  {
    paper: '#f4f0ff', grain: 'rgba(244,240,255,0.6)', ink: '#6a4bd0', pencil: 'rgba(74,53,32,0.6)',
    doodle: (ctx, g) => {
      const colors = ['#ff8787', '#ffa94d', '#ffd43b', '#8ce99a', '#74c0fc', '#b197fc']
      colors.forEach((c, i) => {
        const pts: Pt[] = []
        const r = 380 - i * 13
        for (let a = Math.PI; a <= Math.PI * 2.001; a += 0.08) pts.push([400 + Math.cos(a) * r, 520 + Math.sin(a) * r])
        ctx.globalAlpha = 0.55
        crayonLine(ctx, pts, c, 11, { passes: 2, grain: g, seed: i })
        ctx.globalAlpha = 1
      })
      cloud(ctx, 110, 470, 0.9, '#a9cff0', g)
      cloud(ctx, 690, 470, 0.9, '#a9cff0', g)
    },
  },
  // 星空山頂：深色圖畫紙，配亮色蠟筆
  {
    paper: '#262a55', grain: 'rgba(38,42,85,0.6)', ink: '#ffd43b', pencil: 'rgba(255,244,200,0.8)',
    doodle: (ctx, g) => {
      for (let i = 0; i < 40; i++) {
        const x = hash(i, 1) * WORLD_W
        const y = hash(i, 2) * 360
        const s = 2 + hash(i, 3) * 4
        crayonLine(ctx, [[x - s, y], [x + s, y]], 'rgba(255,244,200,0.8)', 2, { passes: 1, grain: '' })
        crayonLine(ctx, [[x, y - s], [x, y + s]], 'rgba(255,244,200,0.8)', 2, { passes: 1, grain: '' })
      }
      hatch(ctx, () => { ctx.beginPath(); ctx.arc(700, 80, 34, 0, Math.PI * 2); ctx.arc(716, 70, 30, 0, Math.PI * 2, true) }, [660, 40, 740, 120], '#fff3bf', { gap: 2.5, alpha: 0.85 })
      const pts: Pt[] = []
      for (let x = 0; x <= WORLD_W; x += 40) pts.push([x, 440 - Math.abs(Math.sin(x / 160)) * 70])
      crayonLine(ctx, pts, 'rgba(180,180,240,0.45)', 4, { passes: 2, grain: g })
    },
  },
]

const theme = (i: number) => THEMES[i % THEMES.length]

/* ── 關卡固定物件（木板、尖刺、彈簧、杯子） ── */

const segPts = (s: Segment): Pt[] => [[s.a.x, s.a.y], [s.b.x, s.b.y]]

function drawPlank(ctx: CanvasRenderingContext2D, s: Segment, g: string) {
  crayonLine(ctx, segPts(s), '#b0743a', 15, { passes: 4, grain: g, seed: s.a.x })
  // 木紋：沿著木板方向的幾條細線
  const len = segLength(s)
  const ux = (s.b.x - s.a.x) / len
  const uy = (s.b.y - s.a.y) / len
  for (const off of [-3, 3]) {
    for (let d = 8; d < len - 8; d += 34) {
      const x = s.a.x + ux * d - uy * off
      const y = s.a.y + uy * d + ux * off
      crayonLine(ctx, [[x, y], [x + ux * 16, y + uy * 16]], '#6b3f1d', 1.6, { passes: 1, grain: '' })
    }
  }
  crayonLine(ctx, segPts(s), 'rgba(107,63,29,0.55)', 17, { passes: 1, grain: '', seed: s.a.y })
}

function drawSpikes(ctx: CanvasRenderingContext2D, s: Segment) {
  const len = segLength(s)
  const ux = (s.b.x - s.a.x) / len
  const uy = (s.b.y - s.a.y) / len
  const size = 14
  const tip = 15
  crayonLine(ctx, segPts(s), '#5c636b', 5, { passes: 2, grain: '' })
  for (let d = 0; d < len - 2; d += size) {
    const w = Math.min(size, len - d)
    const x = s.a.x + ux * d
    const y = s.a.y + uy * d
    const mx = x + ux * (w / 2)
    const my = y + uy * (w / 2)
    for (const side of [1, -1]) {
      const tri: Pt[] = [[x, y], [mx - uy * tip * side, my + ux * tip * side], [x + ux * w, y + uy * w]]
      const xs = tri.map(p => p[0])
      const ys = tri.map(p => p[1])
      const path = () => { ctx.beginPath(); ctx.moveTo(...tri[0]); ctx.lineTo(...tri[1]); ctx.lineTo(...tri[2]); ctx.closePath() }
      hatch(ctx, path, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], '#9aa0a8', { gap: 2.4, seed: d })
      crayonLine(ctx, [...tri, tri[0]], '#4d545c', 2, { passes: 1, grain: '' })
      // 刀尖塗紅，提醒危險
      const [tx, ty] = tri[1]
      crayonLine(ctx, [[tx, ty], [tx + (mx - tx) * 0.35, ty + (my - ty) * 0.35]], '#e03131', 3, { passes: 1, grain: '' })
    }
  }
}

function drawSpring(ctx: CanvasRenderingContext2D, s: Segment, g: string) {
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
  const zz: Pt[] = []
  const n = Math.max(6, Math.round(len / 14))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const off = 10 + (i % 2 ? -6 : 6)
    zz.push([s.a.x + ux * len * t - nx * off, s.a.y + uy * len * t - ny * off])
  }
  crayonLine(ctx, zz, '#c2255c', 3.5, { passes: 2, grain: g })
  crayonLine(ctx, segPts(s), '#f06595', 10, { passes: 4, grain: g, seed: s.a.x })
}

function drawGoal(ctx: CanvasRenderingContext2D, gl: Goal, g: string) {
  // 手繪竹籃：兩層交叉斜線做出編織感
  const box = () => { ctx.beginPath(); ctx.rect(gl.x, gl.y, gl.w, gl.h) }
  const bb: [number, number, number, number] = [gl.x, gl.y, gl.x + gl.w, gl.y + gl.h]
  hatch(ctx, box, bb, '#d6a35a', { gap: 6, alpha: 0.7 })
  ctx.save()
  ctx.translate(gl.x + gl.w, 0)
  ctx.scale(-1, 1)
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(0, gl.y, gl.w, gl.h) }, [0, gl.y, gl.w, gl.y + gl.h], '#b07d3a', { gap: 9, alpha: 0.6 })
  ctx.restore()
  for (const s of cupWalls(gl)) crayonLine(ctx, segPts(s), '#7a4b1c', 6, { passes: 3, grain: g, seed: s.a.x })
  crayonLine(ctx, [[gl.x - 3, gl.y], [gl.x + gl.w + 3, gl.y]], '#7a4b1c', 3, { passes: 1, grain: '' })
  const px = gl.x + gl.w - 4
  crayonLine(ctx, [[px, gl.y], [px, gl.y - 50]], '#4a3520', 3, { passes: 2, grain: '' })
  const flag: Pt[] = [[px, gl.y - 50], [px + 30, gl.y - 41], [px, gl.y - 32]]
  hatch(ctx, () => { ctx.beginPath(); ctx.moveTo(...flag[0]); ctx.lineTo(...flag[1]); ctx.lineTo(...flag[2]); ctx.closePath() }, [px, gl.y - 50, px + 30, gl.y - 32], '#e8553e', { gap: 2 })
  ctx.font = '20px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⭐', gl.x + gl.w / 2, gl.y + gl.h / 2 + 4)
}

/**
 * 紙張、背景塗鴉與關卡固定物件只畫一次，存成離屏畫布。
 * scale 取高一點，放大鏡頭時蠟筆筆觸才不會糊掉。
 */
export function createLevelLayer(level: Level, themeIdx: number, scale: number): HTMLCanvasElement {
  const layer = document.createElement('canvas')
  layer.width = WORLD_W * scale
  layer.height = WORLD_H * scale
  const ctx = layer.getContext('2d')
  if (!ctx) return layer
  ctx.scale(scale, scale)
  const th = theme(themeIdx)
  paper(ctx, WORLD_W, WORLD_H, th.paper, themeIdx)
  th.doodle(ctx, th.grain)
  drawGoal(ctx, level.goal, th.grain)
  level.walls.forEach(s => drawPlank(ctx, s, th.grain))
  level.spikes.forEach(s => drawSpikes(ctx, s))
  ;(level.springs ?? []).forEach(s => drawSpring(ctx, s, th.grain))
  return layer
}

/* ── 每一幀會變的東西 ── */

function drawMoverTrack(ctx: CanvasRenderingContext2D, m: Mover) {
  const cx = (m.seg.a.x + m.seg.b.x) / 2
  const cy = (m.seg.a.y + m.seg.b.y) / 2
  ctx.save()
  ctx.strokeStyle = 'rgba(120,100,80,0.55)'
  ctx.lineWidth = 2.5
  ctx.setLineDash([3, 8])
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - m.dx, cy - m.dy)
  ctx.lineTo(cx + m.dx, cy + m.dy)
  ctx.stroke()
  ctx.restore()
  const len = Math.hypot(m.dx, m.dy)
  const ux = m.dx / len
  const uy = m.dy / len
  for (const dir of [1, -1]) {
    const tx = cx + m.dx * dir
    const ty = cy + m.dy * dir
    crayonLine(ctx, [[tx - uy * 7 - ux * 7 * dir, ty + ux * 7 - uy * 7 * dir], [tx, ty], [tx + uy * 7 - ux * 7 * dir, ty - ux * 7 - uy * 7 * dir]], 'rgba(120,100,80,0.7)', 3, { passes: 1, grain: '' })
  }
}

/** 把相連的線段串成折線，蠟筆筆觸才連貫 */
function toPolylines(segs: Segment[]): Pt[][] {
  const out: Pt[][] = []
  let cur: Pt[] = []
  let last: Vec | null = null
  for (const s of segs) {
    if (!last || last.x !== s.a.x || last.y !== s.a.y) {
      if (cur.length > 1) out.push(cur)
      cur = [[s.a.x, s.a.y]]
    }
    cur.push([s.b.x, s.b.y])
    last = s.b
  }
  if (cur.length > 1) out.push(cur)
  return out
}

function drawHero(ctx: CanvasRenderingContext2D, world: World, idx: number, levelIdx: number, fx: FxState, phase: Phase, t: number, ring: string) {
  const ball = world.balls[idx]
  const animal = animalFor(levelIdx, idx)
  const trail = fx.trails[idx]
  trail.forEach((p, i) => {
    const a = (i + 1) / trail.length
    ctx.globalAlpha = a * 0.5
    crayonCircle(ctx, p.x, p.y, BALL_R * a * 0.8, animal.color, 2, i)
    ctx.globalAlpha = 1
  })
  const { x, y } = ball.pos
  if (phase === 'ready') {
    ctx.save()
    ctx.strokeStyle = ring
    ctx.lineWidth = 2.5
    ctx.setLineDash([5, 6])
    ctx.lineDashOffset = -t * 20
    ctx.beginPath()
    ctx.arc(x, y, BALL_R + 9 + Math.sin(t * 4) * 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(fx.angles[idx])
  // 畫得比碰撞半徑稍大一點，蠟筆細節才看得清楚
  animal.draw(ctx, BALL_R * 1.15)
  ctx.restore()
}

export function render(
  ctx: CanvasRenderingContext2D,
  layer: HTMLCanvasElement,
  level: Level,
  levelIdx: number,
  strokes: Segment[],
  world: World,
  fx: FxState,
  phase: Phase,
  t: number,
  themeIdx: number,
) {
  const th = theme(themeIdx)
  ctx.drawImage(layer, 0, 0, WORLD_W, WORLD_H)
  const movers = level.movers ?? []
  movers.forEach(m => drawMoverTrack(ctx, m))
  for (const m of movers) {
    const seg = moverSeg(m, world.time)
    if (m.kind === 'wall') drawPlank(ctx, seg, th.grain)
    else drawSpikes(ctx, seg)
  }
  for (const pl of toPolylines(strokes)) crayonLine(ctx, pl, th.ink, LINE_HALF * 2 + 4, { passes: 3, grain: th.grain })
  world.balls.forEach((_, i) => drawHero(ctx, world, i, levelIdx, fx, phase, t, th.pencil))

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

/**
 * 放大後小動物或杯子跑到畫面外時，在畫面邊緣畫箭頭指出方向。
 * 呼叫前畫布座標須為「螢幕邏輯座標」（未套用鏡頭變換）。
 */
export function drawOffscreenMarkers(
  ctx: CanvasRenderingContext2D,
  cam: { x: number; y: number; z: number },
  world: World,
  goal: Goal,
  levelIdx: number,
) {
  if (cam.z <= 1) return
  const targets: { p: Vec; color: string; label: string }[] = [
    { p: { x: goal.x + goal.w / 2, y: goal.y + goal.h / 2 }, color: '#b07d3a', label: '⭐' },
  ]
  world.balls.forEach((b, i) => {
    if (!b.done) targets.push({ p: b.pos, color: animalFor(levelIdx, i).color, label: '' })
  })
  const margin = 22
  for (const tg of targets) {
    const sx = (tg.p.x - cam.x) * cam.z
    const sy = (tg.p.y - cam.y) * cam.z
    if (sx >= 0 && sx <= WORLD_W && sy >= 0 && sy <= WORLD_H) continue
    const cx = Math.min(WORLD_W - margin, Math.max(margin, sx))
    const cy = Math.min(WORLD_H - margin, Math.max(margin, sy))
    const ang = Math.atan2(sy - cy, sx - cx)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.fillStyle = 'rgba(253,248,236,0.95)'
    ctx.beginPath()
    ctx.arc(0, 0, 15, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#4a3520'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.rotate(ang)
    ctx.fillStyle = tg.color
    ctx.beginPath()
    ctx.moveTo(12, 0)
    ctx.lineTo(-6, -8)
    ctx.lineTo(-6, 8)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    if (tg.label) {
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(tg.label, cx, Math.max(10, cy - 22))
    }
  }
}
