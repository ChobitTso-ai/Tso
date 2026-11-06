// 軍師戰棋 — 畫布繪製（純 Canvas，不依賴 React）
import { GENERALS, TACTICS, UNIT_STATS } from './data'
import type { Battle, BattleEvent, Side, Squad, TacticId, Terrain, UnitType } from './types'
import { DEPLOY_COLS, MAP_H, MAP_W } from './types'

export const TILE = 48
export const VIEW_W = MAP_W * TILE
export const VIEW_H = MAP_H * TILE

export const SIDE_COLORS: Record<Side, { main: string; dark: string; light: string }> = {
  player: { main: '#3f9b5b', dark: '#1f5a33', light: '#8fe0a8' },
  enemy: { main: '#3b6fb6', dark: '#1d3f75', light: '#9cc0f0' },
}

const SKIN = '#f1c9a0'
const WOOD = '#6b4a2b'
const FONT = "'PingFang TC', 'Microsoft JhengHei', 'Noto Sans CJK TC', sans-serif"

// ── 特效（純視覺，不影響模擬） ──────────────────────

interface Arrow { x0: number; y0: number; x1: number; y1: number; t: number }
interface Spark { x: number; y: number; t: number }
interface FloatText { x: number; y: number; text: string; color: string; size: number; t: number }
interface Zone { kind: 'fire' | 'confuse'; x: number; y: number; r: number; t: number }

export interface Fx {
  arrows: Arrow[]
  sparks: Spark[]
  texts: FloatText[]
  zones: Zone[]
}

export const createFx = (): Fx => ({ arrows: [], sparks: [], texts: [], zones: [] })

const ARROW_TIME = 0.35
const SPARK_TIME = 0.25
const TEXT_TIME = 1.3

export function pushEvents(fx: Fx, events: BattleEvent[]) {
  for (const e of events) {
    switch (e.kind) {
      case 'arrow':
        fx.arrows.push({ x0: e.x0, y0: e.y0, x1: e.x1, y1: e.y1, t: 0 })
        break
      case 'hit':
        fx.sparks.push({ x: e.x + (Math.random() - 0.5) * 0.4, y: e.y + (Math.random() - 0.5) * 0.4, t: 0 })
        break
      case 'charge':
        fx.texts.push({ x: e.x, y: e.y - 0.6, text: '衝鋒！', color: '#ffd84d', size: 14, t: 0 })
        break
      case 'rout':
        fx.texts.push({
          x: e.x, y: e.y - 0.4, text: `${e.label}潰散`, size: 15, t: 0,
          color: e.side === 'player' ? '#ffb3a8' : '#fff1a8',
        })
        break
      case 'fire':
      case 'confuse':
        fx.zones.push({ kind: e.kind, x: e.x, y: e.y, r: e.r, t: 0 })
        fx.texts.push({ x: e.x, y: e.y - 0.3, text: TACTICS[e.kind].name, color: '#fff', size: 20, t: 0 })
        break
      case 'rally':
        fx.texts.push({ x: MAP_W / 2, y: MAP_H / 2, text: '全軍鼓舞！', color: '#ffd84d', size: 26, t: 0 })
        break
    }
  }
}

export function updateFx(fx: Fx, dt: number) {
  for (const a of fx.arrows) a.t += dt
  for (const s of fx.sparks) s.t += dt
  for (const t of fx.texts) t.t += dt
  for (const z of fx.zones) z.t += dt
  fx.arrows = fx.arrows.filter(a => a.t < ARROW_TIME)
  fx.sparks = fx.sparks.filter(s => s.t < SPARK_TIME)
  fx.texts = fx.texts.filter(t => t.t < TEXT_TIME)
  fx.zones = fx.zones.filter(z => z.t < (z.kind === 'fire' ? 4 : 0.8))
}

// ── 地形：每關畫一次存成圖層 ──────────────────────

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(x + 2, y + r * 0.9, r * 0.9, r * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#5b3d22'
  ctx.fillRect(x - 1.5, y, 3, r * 0.9)
  ctx.fillStyle = '#2d6a35'
  ctx.beginPath()
  ctx.arc(x, y - r * 0.2, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3f8b45'
  ctx.beginPath()
  ctx.arc(x - r * 0.3, y - r * 0.45, r * 0.55, 0, Math.PI * 2)
  ctx.fill()
}

export function createTerrainLayer(grid: Terrain[][], dpr: number, seed: number): HTMLCanvasElement {
  const layer = document.createElement('canvas')
  layer.width = VIEW_W * dpr
  layer.height = VIEW_H * dpr
  const ctx = layer.getContext('2d')
  if (!ctx) return layer
  ctx.scale(dpr, dpr)
  const rnd = seeded(seed + 7)
  const at = (x: number, y: number) => grid[y]?.[x]
  const isWet = (x: number, y: number) => at(x, y) === 'water' || at(x, y) === 'bridge'

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const px = x * TILE
      const py = y * TILE
      const t = grid[y][x]
      if (t === 'water' || t === 'bridge') {
        ctx.fillStyle = '#4f8fc0'
        ctx.fillRect(px, py, TILE, TILE)
        ctx.strokeStyle = 'rgba(200,230,255,0.45)'
        ctx.lineWidth = 1.5
        for (let i = 0; i < 3; i++) {
          const wx = px + 6 + rnd() * (TILE - 20)
          const wy = py + 8 + i * 14 + rnd() * 4
          ctx.beginPath()
          ctx.moveTo(wx, wy)
          ctx.quadraticCurveTo(wx + 5, wy - 3, wx + 10, wy)
          ctx.stroke()
        }
        // 河岸
        ctx.fillStyle = '#c9b27c'
        if (!isWet(x - 1, y) && x > 0) ctx.fillRect(px, py, 3, TILE)
        if (!isWet(x + 1, y) && x < MAP_W - 1) ctx.fillRect(px + TILE - 3, py, 3, TILE)
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#86ad5c' : '#80a757'
        ctx.fillRect(px, py, TILE, TILE)
        ctx.strokeStyle = 'rgba(60,100,40,0.35)'
        ctx.lineWidth = 1
        for (let i = 0; i < 3; i++) {
          const gx = px + 4 + rnd() * (TILE - 8)
          const gy = py + 6 + rnd() * (TILE - 10)
          ctx.beginPath()
          ctx.moveTo(gx - 2, gy - 3)
          ctx.lineTo(gx, gy)
          ctx.lineTo(gx + 2, gy - 3)
          ctx.stroke()
        }
      }
      if (t === 'bridge') {
        ctx.fillStyle = '#a4733f'
        ctx.fillRect(px - 2, py + 7, TILE + 4, TILE - 14)
        ctx.strokeStyle = 'rgba(70,40,15,0.55)'
        ctx.lineWidth = 1
        for (let i = 1; i < 8; i++) {
          ctx.beginPath()
          ctx.moveTo(px - 2 + i * 6.5, py + 7)
          ctx.lineTo(px - 2 + i * 6.5, py + TILE - 7)
          ctx.stroke()
        }
        ctx.fillStyle = '#6b4520'
        ctx.fillRect(px - 2, py + 5, TILE + 4, 3)
        ctx.fillRect(px - 2, py + TILE - 8, TILE + 4, 3)
      }
    }
  }
  // 樹最後畫，樹冠可以超出格子
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (grid[y][x] !== 'forest') continue
      const px = x * TILE
      const py = y * TILE
      ctx.fillStyle = 'rgba(30,70,25,0.25)'
      ctx.fillRect(px, py, TILE, TILE)
      const spots: [number, number][] = [[0.28, 0.32], [0.72, 0.3], [0.5, 0.68], [0.2, 0.78], [0.8, 0.76]]
      for (const [sx, sy] of spots) drawTree(ctx, px + sx * TILE + (rnd() - 0.5) * 6, py + sy * TILE + (rnd() - 0.5) * 6, 7 + rnd() * 3)
    }
  }
  return layer
}

// ── 部隊 ──────────────────────────────────────────

function drawFigure(ctx: CanvasRenderingContext2D, type: UnitType, x: number, y: number, side: Side, f: number) {
  const c = SIDE_COLORS[side]
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(x, y + 1, type === 'cavalry' ? 6 : 3.5, 1.6, 0, 0, Math.PI * 2)
  ctx.fill()
  if (type === 'cavalry') {
    ctx.fillStyle = '#7b5636'
    ctx.beginPath()
    ctx.ellipse(x, y - 3, 5.5, 2.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x + 4 * f - 1.5, y - 7.5, 3, 4)
    ctx.fillStyle = '#4a3220'
    ctx.fillRect(x - 4, y - 1, 1.5, 2.5)
    ctx.fillRect(x + 3, y - 1, 1.5, 2.5)
    ctx.fillStyle = c.main
    ctx.fillRect(x - 1.8, y - 10, 3.6, 5)
    ctx.fillStyle = SKIN
    ctx.beginPath()
    ctx.arc(x, y - 11.5, 1.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = WOOD
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 2 * f, y - 13)
    ctx.lineTo(x + 7 * f, y - 6)
    ctx.stroke()
    return
  }
  ctx.fillStyle = '#3a2a1e'
  ctx.fillRect(x - 2, y - 2, 1.6, 3)
  ctx.fillRect(x + 0.4, y - 2, 1.6, 3)
  ctx.fillStyle = c.main
  ctx.fillRect(x - 2.4, y - 7.5, 4.8, 6)
  ctx.fillStyle = SKIN
  ctx.beginPath()
  ctx.arc(x, y - 9.5, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c.dark
  ctx.fillRect(x - 2.3, y - 12, 4.6, 1.8)
  if (type === 'spear') {
    ctx.strokeStyle = WOOD
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 3 * f, y + 1)
    ctx.lineTo(x + 3 * f, y - 15)
    ctx.stroke()
    ctx.fillStyle = '#d8d8d8'
    ctx.beginPath()
    ctx.moveTo(x + 3 * f - 1.5, y - 14)
    ctx.lineTo(x + 3 * f, y - 18)
    ctx.lineTo(x + 3 * f + 1.5, y - 14)
    ctx.fill()
  } else if (type === 'archer') {
    ctx.strokeStyle = '#8a5a2b'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(x + 2.5 * f, y - 6, 4, f > 0 ? -1.3 : Math.PI - 1.3, f > 0 ? 1.3 : Math.PI + 1.3)
    ctx.stroke()
  } else {
    ctx.fillStyle = c.dark
    ctx.fillRect(x + (f > 0 ? 1.5 : -5.5), y - 8.5, 4, 7.5)
    ctx.strokeStyle = '#e3b94d'
    ctx.lineWidth = 0.8
    ctx.strokeRect(x + (f > 0 ? 1.5 : -5.5), y - 8.5, 4, 7.5)
  }
}

function drawFormation(ctx: CanvasRenderingContext2D, s: Squad, time: number) {
  const n = Math.max(1, Math.ceil(s.troops / 10))
  const cols = 4
  const rows = Math.ceil(n / cols)
  const gapX = s.type === 'cavalry' ? 10.5 : 9
  const gapY = 8
  const cx = s.x * TILE
  const cy = s.y * TILE + 6
  for (let i = 0; i < n; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    // 後排往後縮，看起來像朝著敵人的方陣
    const fx = cx + (col - (cols - 1) / 2) * gapX - (row - (rows - 1) / 2) * 2 * s.facing
    const fy = cy + (row - (rows - 1) / 2) * gapY
    const bob = s.moving ? Math.sin(time * 14 + i * 1.7) * 1.2 : 0
    drawFigure(ctx, s.type, fx, fy + bob, s.side, s.facing)
  }
}

function drawBanner(ctx: CanvasRenderingContext2D, s: Squad) {
  const c = SIDE_COLORS[s.side]
  const size = s.commander ? 24 : 19
  const poleX = s.x * TILE + (s.side === 'player' ? -14 : 14)
  const top = s.y * TILE - 28 - (s.commander ? 6 : 0)
  ctx.strokeStyle = '#4a321c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(poleX, top - 2)
  ctx.lineTo(poleX, s.y * TILE + 2)
  ctx.stroke()
  // 旗面掛在旗桿朝向戰場中央的那一側
  const fx = s.side === 'player' ? poleX : poleX - size
  ctx.fillStyle = c.main
  ctx.beginPath()
  ctx.moveTo(fx, top)
  ctx.lineTo(fx + size, top)
  ctx.lineTo(fx + size, top + size + 4)
  ctx.lineTo(fx + size / 2, top + size - 1)
  ctx.lineTo(fx, top + size + 4)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = s.commander ? '#f2c94c' : c.dark
  ctx.lineWidth = s.commander ? 2 : 1.2
  ctx.stroke()
  const char = s.general ? GENERALS[s.general].char : UNIT_STATS[s.type].char
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${s.commander ? 16 : 13}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(char, fx + size / 2, top + size / 2 + 1)
  if (s.commander) {
    ctx.fillStyle = '#f2c94c'
    ctx.font = `bold 13px ${FONT}`
    ctx.fillText('★', fx + size / 2, top - 7)
  }
  if (s.stance === 'hold') {
    // 標在旗面朝戰場中央那一側，貼邊的部隊才不會被切掉
    const bx = s.side === 'player' ? fx + size + 7 : fx - 7
    const by = top + size + 2
    ctx.fillStyle = 'rgba(20,20,20,0.75)'
    ctx.beginPath()
    ctx.arc(bx, by, 6.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `bold 9px ${FONT}`
    ctx.fillText('守', bx, by + 0.5)
  }
}

function drawTroopBar(ctx: CanvasRenderingContext2D, s: Squad) {
  const w = 30
  const x = s.x * TILE - w / 2
  const y = s.y * TILE + 22
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(x - 1, y - 1, w + 2, 5)
  ctx.fillStyle = SIDE_COLORS[s.side].light
  ctx.fillRect(x, y, w * (s.troops / s.maxTroops), 3)
}

function drawStatus(ctx: CanvasRenderingContext2D, s: Squad, b: Battle, time: number) {
  const cx = s.x * TILE
  const cy = s.y * TILE
  if (s.side === 'player' && b.rallyUntil > b.time) {
    ctx.strokeStyle = `rgba(255,216,77,${0.55 + Math.sin(time * 8) * 0.3})`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.ellipse(cx, cy + 10, 22, 11, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (s.burnUntil > b.time) {
    for (let i = 0; i < 4; i++) {
      const fx = cx + Math.sin(time * 5 + i * 2) * 12
      const fy = cy + 4 + Math.cos(time * 7 + i) * 6
      const h = 7 + Math.sin(time * 20 + i) * 3
      ctx.fillStyle = i % 2 ? '#ff9a3c' : '#ffd84d'
      ctx.beginPath()
      ctx.moveTo(fx - 3, fy)
      ctx.lineTo(fx, fy - h)
      ctx.lineTo(fx + 3, fy)
      ctx.fill()
    }
  }
  if (s.stunUntil > b.time) {
    for (let i = 0; i < 3; i++) {
      const a = time * 4 + (i * Math.PI * 2) / 3
      ctx.fillStyle = '#ffe066'
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * 12, cy - 34 + Math.sin(a) * 4, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ── 主繪製 ────────────────────────────────────────

export interface DrawOptions {
  phase: 'deploy' | 'battle'
  selectedId: number | null
  hover: { x: number; y: number } | null
  targeting: TacticId | null
  time: number // 動畫用的真實時間（秒）
}

export function render(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, b: Battle, fx: Fx, o: DrawOptions) {
  ctx.drawImage(layer, 0, 0, VIEW_W, VIEW_H)

  if (o.phase === 'deploy') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < DEPLOY_COLS; x++) if (b.grid[y][x] !== 'water') ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1
    for (let x = 1; x < MAP_W; x++) {
      ctx.beginPath()
      ctx.moveTo(x * TILE + 0.5, 0)
      ctx.lineTo(x * TILE + 0.5, VIEW_H)
      ctx.stroke()
    }
    for (let y = 1; y < MAP_H; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * TILE + 0.5)
      ctx.lineTo(VIEW_W, y * TILE + 0.5)
      ctx.stroke()
    }
    ctx.setLineDash([8, 6])
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(DEPLOY_COLS * TILE, 0)
    ctx.lineTo(DEPLOY_COLS * TILE, VIEW_H)
    ctx.stroke()
    ctx.setLineDash([])
    if (o.hover && Math.floor(o.hover.x) < DEPLOY_COLS) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(Math.floor(o.hover.x) * TILE + 2, Math.floor(o.hover.y) * TILE + 2, TILE - 4, TILE - 4)
    }
  }

  for (const z of fx.zones) {
    const px = z.x * TILE
    const py = z.y * TILE
    if (z.kind === 'fire') {
      const fade = Math.min(1, (4 - z.t) / 0.6)
      const g = ctx.createRadialGradient(px, py, 4, px, py, z.r * TILE)
      g.addColorStop(0, `rgba(255,200,60,${0.55 * fade})`)
      g.addColorStop(1, 'rgba(255,90,20,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(px, py, z.r * TILE, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const p = z.t / 0.8
      ctx.strokeStyle = `rgba(190,120,255,${1 - p})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(px, py, z.r * TILE * (0.3 + p * 0.7), 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const alive = b.squads.filter(s => s.alive).sort((a, c) => a.y - c.y)
  const sel = o.selectedId === null ? undefined : alive.find(s => s.id === o.selectedId)
  if (sel) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.ellipse(sel.x * TILE, sel.y * TILE + 10, 24, 12, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  for (const s of alive) drawFormation(ctx, s, o.time)
  for (const s of alive) drawStatus(ctx, s, b, o.time)
  for (const s of alive) drawBanner(ctx, s)
  for (const s of alive) drawTroopBar(ctx, s)

  ctx.strokeStyle = '#2b1d10'
  ctx.lineWidth = 1.5
  for (const a of fx.arrows) {
    const p = a.t / ARROW_TIME
    const lift = Math.sin(p * Math.PI) * TILE * 0.5
    const x = (a.x0 + (a.x1 - a.x0) * p) * TILE
    const y = (a.y0 + (a.y1 - a.y0) * p) * TILE - lift
    const ang = Math.atan2((a.y1 - a.y0) * TILE - Math.cos(p * Math.PI) * Math.PI * TILE * 0.5, (a.x1 - a.x0) * TILE)
    ctx.beginPath()
    ctx.moveTo(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6)
    ctx.lineTo(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6)
    ctx.stroke()
  }
  for (const s of fx.sparks) {
    const p = s.t / SPARK_TIME
    ctx.fillStyle = `rgba(255,250,220,${1 - p})`
    ctx.beginPath()
    ctx.arc(s.x * TILE, s.y * TILE, 3 + p * 6, 0, Math.PI * 2)
    ctx.fill()
  }

  if (o.targeting && o.hover) {
    const r = TACTICS[o.targeting].radius * TILE
    ctx.fillStyle = o.targeting === 'fire' ? 'rgba(255,120,40,0.25)' : 'rgba(170,110,255,0.25)'
    ctx.strokeStyle = o.targeting === 'fire' ? '#ff8a3c' : '#c08cff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(o.hover.x * TILE, o.hover.y * TILE, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const t of fx.texts) {
    const p = t.t / TEXT_TIME
    ctx.globalAlpha = p < 0.7 ? 1 : (1 - p) / 0.3
    ctx.font = `bold ${t.size}px ${FONT}`
    ctx.lineWidth = 3.5
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'
    const y = t.y * TILE - p * 22
    ctx.strokeText(t.text, t.x * TILE, y)
    ctx.fillStyle = t.color
    ctx.fillText(t.text, t.x * TILE, y)
  }
  ctx.globalAlpha = 1
}
