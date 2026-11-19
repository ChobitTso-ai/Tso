// 軍師戰棋 — 畫布繪製（純 Canvas，不依賴 React）
// 戰場與小兵畫在半解析度的「像素畫布」上，再放大兩倍貼到主畫布，做出像素風；
// 旗幟、數字、文字這些要清楚的東西，才直接畫在原解析度上。
import { parseMap } from './battle'
import { GENERALS, LEVELS, TACTICS, UNIT_STATS } from './data'
import type { Battle, BattleEvent, Side, Squad, TacticId, Terrain, UnitType } from './types'
import { DEPLOY_COLS, MAP_H, MAP_W } from './types'

export const TILE = 48
export const VIEW_W = MAP_W * TILE
export const VIEW_H = MAP_H * TILE
const PX = 2 // 像素畫布放大倍數
const PT = TILE / PX // 像素畫布上一格 24 px
const PW = VIEW_W / PX
const PH = VIEW_H / PX

const FONT = "'PingFang TC', 'Microsoft JhengHei', 'Noto Sans CJK TC', sans-serif"

const SIDE_PAL: Record<Side, { main: string; dark: string; light: string; deep: string }> = {
  player: { main: '#3f9b5b', dark: '#25693c', light: '#86dca0', deep: '#163f24' },
  enemy: { main: '#3b6fb6', dark: '#244e8c', light: '#93bdf0', deep: '#14305a' },
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 小兵像素圖（面向右，往左時水平翻轉） ─────────────────
// H/h 頭盔、K/k 皮膚、B/b/L 軍服、D 盾面、R 盾緣、P 褲、W 木、S/s 鐵、M/m/N 馬、G 金、x 深色、o 影子

const SPEAR_TOP = ['......S', '......S', '..HH..W', '.HhhH.W', '.KKKx.W', '.kKKK.W', 'LBBBBKW', '.BBBB.W', '.bBBb.W', '..PP..W']
const ARCHER_TOP = ['.......', '.......', '..HH...', '.HhhHW.', '.KKKx.W', '.kKKKKW', 'LBBBB.W', '.BBBB.W', '.bBBbW.', '..PP...']
const SHIELD_TOP = ['........', '........', '..HH....', '.HhhH...', '.KKKxRRR', '.kKKKRDR', 'LBBBBRDR', '.BBBBRsR', '.bBBbRDR', '..PP.RDR']
const CAVALRY_TOP = [
  '...........S',
  '....HH....W.',
  '...HhhH..W..',
  '...KKKx.W...',
  '...kKKKKW...',
  '..LBBBB..MN.',
  '...bBBb.MMxM',
  'mNMMPMMMMM..',
  'mMMMPMMMMm..',
  '.mMMMMMMMm..',
]

const SPRITE_ROWS: Record<UnitType, [string[], string[]]> = {
  spear: [
    [...SPEAR_TOP, '..P.P..', '..x.x..', '.ooooo.'],
    [...SPEAR_TOP, '.P..P..', '.x...x.', '.ooooo.'],
  ],
  archer: [
    [...ARCHER_TOP, '..P.P..', '..x.x..', '.ooooo.'],
    [...ARCHER_TOP, '.P..P..', '.x...x.', '.ooooo.'],
  ],
  shield: [
    [...SHIELD_TOP, '..P.PRRR', '..x.x...', '.ooooooo'],
    [...SHIELD_TOP, '.P..PRRR', '.x...x..', '.ooooooo'],
  ],
  cavalry: [
    [...CAVALRY_TOP, '..m.m..m.m..', '..x.x..x.x..', '.oooooooooo.'],
    [...CAVALRY_TOP, '.m..m.m..m..', '.x..x.x..x..', '.oooooooooo.'],
  ],
}

const COMMON_PAL: Record<string, string> = {
  K: '#f1c9a0', k: '#d6a77a', x: '#2a2420', P: '#3b2c22', W: '#7a5230', S: '#e3e7ec', s: '#8f98a3',
  M: '#7b5636', m: '#4e3420', N: '#a07a4e', G: '#e8c04a', R: '#6b4a22', o: 'rgba(0,0,0,0.28)',
}

const spriteCache = new Map<string, HTMLCanvasElement>()

function sprite(type: UnitType, side: Side, frame: number, facing: number): HTMLCanvasElement {
  const key = `${type}${side}${frame}${facing}`
  const hit = spriteCache.get(key)
  if (hit) return hit
  const rows = SPRITE_ROWS[type][frame]
  const c = SIDE_PAL[side]
  const pal: Record<string, string> = { ...COMMON_PAL, H: c.dark, h: c.main, B: c.main, b: c.dark, L: c.light, D: c.dark }
  const w = Math.max(...rows.map(r => r.length))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = rows.length
  const g = canvas.getContext('2d')
  if (g) {
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const col = pal[ch]
        if (!col) return
        g.fillStyle = col
        g.fillRect(facing > 0 ? x : w - 1 - x, y, 1, 1)
      }),
    )
  }
  spriteCache.set(key, canvas)
  return canvas
}

// ── 方陣 ──────────────────────────────────────────

const FORMATION: Record<UnitType, { per: number; cols: number; gx: number; gy: number }> = {
  spear: { per: 6, cols: 6, gx: 4, gy: 3 },
  archer: { per: 6, cols: 6, gx: 4, gy: 3 },
  shield: { per: 6, cols: 5, gx: 5, gy: 3 },
  cavalry: { per: 8, cols: 4, gx: 7, gy: 4 },
}

const SPRITE_H = 13

function geometry(s: Squad) {
  const f = FORMATION[s.type]
  const total = Math.max(1, Math.ceil(s.maxTroops / f.per))
  const rows = Math.ceil(total / f.cols)
  // 貼在地圖邊上的部隊，畫的時候往內收，方陣才不會被切掉一半
  const half = (f.cols * f.gx) / 2 + 3
  const cx = Math.min(PW - half, Math.max(half, s.x * PT))
  const cy = s.y * PT
  // 讓整群人（腳到頭）的中心落在部隊座標上
  const feetTop = cy - ((rows - 1) * f.gy - SPRITE_H + 1) / 2
  return { f, total, rows, cx, feetTop, feetBottom: feetTop + (rows - 1) * f.gy }
}

const slotCache = new Map<string, number[]>()

/** 每隊固定的「陣亡順序」，兵力減少時從方陣裡零星消失，而不是整排一起不見 */
function slotOrder(id: number, total: number) {
  const key = `${id}-${total}`
  let order = slotCache.get(key)
  if (!order) {
    const rnd = mulberry32(id * 7919 + total)
    order = Array.from({ length: total }, (_, i) => i)
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    slotCache.set(key, order)
  }
  return order
}

function drawFormation(p: CanvasRenderingContext2D, s: Squad, t: number) {
  const { f, total, rows, cx, feetTop } = geometry(s)
  const n = Math.max(1, Math.ceil(s.troops / f.per))
  const shown = slotOrder(s.id, total).slice(0, n).sort((a, b) => a - b)
  const st = UNIT_STATS[s.type]
  // 剛出手的那一瞬間整隊往前一步，看得出在交戰
  const lunge = s.cooldown > st.cooldown - 0.15 ? s.facing : 0

  p.fillStyle = 'rgba(0,0,0,0.13)'
  p.beginPath()
  p.ellipse(cx, feetTop + ((rows - 1) * f.gy) / 2 + 1, (f.cols * f.gx) / 2 + 3, ((rows - 1) * f.gy) / 2 + 3, 0, 0, Math.PI * 2)
  p.fill()

  for (const slot of shown) {
    const row = Math.floor(slot / f.cols)
    const col = slot % f.cols
    const stagger = row % 2 ? f.gx / 2 : 0
    const x = cx + (col - (f.cols - 1) / 2) * f.gx + stagger - f.gx / 4 + lunge
    const y = feetTop + row * f.gy
    const frame = s.moving ? Math.floor(t * 8 + slot * 0.37) % 2 : 0
    const img = sprite(s.type, s.side, frame, s.facing)
    p.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 2))
  }
}

// ── 地形：每關畫一次存成像素圖層 ──────────────────────

function valueNoise(seed: number, cell: number) {
  const rnd = mulberry32(seed)
  const gw = Math.ceil(PW / cell) + 2
  const gh = Math.ceil(PH / cell) + 2
  const g = Array.from({ length: gw * gh }, () => rnd())
  const at = (a: number, b: number) => g[Math.min(gh - 1, Math.max(0, b)) * gw + Math.min(gw - 1, Math.max(0, a))]
  return (x: number, y: number) => {
    const fx = x / cell
    const fy = y / cell
    const ix = Math.floor(fx)
    const iy = Math.floor(fy)
    const sx = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix))
    const sy = (fy - iy) * (fy - iy) * (3 - 2 * (fy - iy))
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx
    const bot = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx
    return top + (bot - top) * sy
  }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16)

/** 到最近一個 mask 為 target 的像素的距離（兩趟掃描的近似距離轉換） */
function distanceTo(mask: Uint8Array, target: number) {
  const d = new Float32Array(PW * PH)
  for (let i = 0; i < d.length; i++) d[i] = mask[i] === target ? 0 : 99
  const pass = (dirs: number[][], reverse: boolean) => {
    for (let k = 0; k < d.length; k++) {
      const i = reverse ? d.length - 1 - k : k
      const x = i % PW
      const y = (i - x) / PW
      for (const [dx, dy, w] of dirs) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= PW || ny >= PH) continue
        const v = d[ny * PW + nx] + w
        if (v < d[i]) d[i] = v
      }
    }
  }
  pass([[-1, 0, 1], [0, -1, 1], [-1, -1, 1.4], [1, -1, 1.4]], false)
  pass([[1, 0, 1], [0, 1, 1], [1, 1, 1.4], [-1, 1, 1.4]], true)
  return d
}

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
}

const GRASS = ['#6a9a45', '#76a64e', '#81b157', '#8dbc60'].map(hex)
const FOREST_FLOOR = ['#4b7a34', '#55853b', '#5f8f41', '#69994a'].map(hex)
const SAND = hex('#e0cd96')
const SAND_DARK = hex('#cdb57d')
const FOAM = hex('#d4ecf8')
const SHALLOW = hex('#78b5e0')
const WATER = hex('#4f93cb')
const DEEP = ['#4486c0', '#3d7db8'].map(hex)

function circle(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  g.fillStyle = color
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5)
    g.fillRect(cx - half, cy + dy, half * 2 + 1, 1)
  }
}

function drawTree(g: CanvasRenderingContext2D, x: number, y: number, r: number, pine: boolean) {
  g.fillStyle = 'rgba(0,0,0,0.22)'
  g.beginPath()
  g.ellipse(x + 1, y, r + 1, 2.5, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#5b3d22'
  g.fillRect(x - 1, y - 3, 2, 3)
  if (pine) {
    const layers: [number, number, string][] = [[0, r + 1, '#1f4d2c'], [-3, r, '#2a6439'], [-6, r - 2, '#33744a']]
    for (const [dy, half, col] of layers) {
      g.fillStyle = col
      for (let k = 0; k <= half + 1; k++) {
        const w = Math.max(0, half - Math.floor(k * 0.9))
        g.fillRect(x - w, y - 3 + dy - k, w * 2 + 1, 1)
      }
    }
    g.fillStyle = '#4c9a5e'
    g.fillRect(x - 1, y - r - 9, 1, 2)
    return
  }
  circle(g, x, y - r - 1, r, '#1f4d24')
  circle(g, x, y - r - 2, r, '#2d6630')
  circle(g, x - 1, y - r - 3, r - 1, '#3a7d3c')
  circle(g, x - Math.round(r * 0.35), y - r - Math.round(r * 0.55) - 2, Math.max(1, Math.round(r * 0.45)), '#4f9a4c')
  g.fillStyle = '#7cc46e'
  g.fillRect(x - Math.round(r * 0.5), y - r * 2, 2, 1)
}

function createTerrainLayer(grid: Terrain[][], seed: number): HTMLCanvasElement {
  const layer = document.createElement('canvas')
  layer.width = PW
  layer.height = PH
  const g = layer.getContext('2d')
  if (!g) return layer
  const rnd = mulberry32(seed * 101 + 17)
  const n1 = valueNoise(seed + 1, 28)
  const n2 = valueNoise(seed + 2, 9)
  const wobX = valueNoise(seed + 3, 11)
  const wobY = valueNoise(seed + 4, 11)

  // 地形邊界加一點抖動，河岸與樹林邊才不會是方格
  const terr: Terrain[] = new Array(PW * PH)
  const wet = new Uint8Array(PW * PH)
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const ox = Math.round((wobX(x, y) - 0.5) * 8)
      const oy = Math.round((wobY(x, y) - 0.5) * 8)
      const tx = Math.min(MAP_W - 1, Math.max(0, Math.floor((x + ox) / PT)))
      const ty = Math.min(MAP_H - 1, Math.max(0, Math.floor((y + oy) / PT)))
      const t = grid[ty][tx]
      terr[y * PW + x] = t
      wet[y * PW + x] = t === 'water' || t === 'bridge' ? 1 : 0
    }
  }
  const toWater = distanceTo(wet, 1)
  const toLand = distanceTo(wet, 0)

  const img = g.createImageData(PW, PH)
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const i = y * PW + x
      const bayer = BAYER[(y % 4) * 4 + (x % 4)]
      let c: [number, number, number]
      if (wet[i]) {
        const d = toLand[i]
        if (d <= 1.5) c = rnd() < 0.55 ? FOAM : SHALLOW
        else if (d <= 3.5) c = SHALLOW
        else if (d <= 7) c = WATER
        else c = DEEP[n2(x, y) + (bayer - 0.5) * 0.3 > 0.5 ? 1 : 0]
      } else if (toWater[i] <= 1.5) {
        c = SAND
      } else if (toWater[i] <= 3) {
        c = bayer < 0.5 ? SAND_DARK : GRASS[1]
      } else {
        const pal = terr[i] === 'forest' ? FOREST_FLOOR : GRASS
        const v = n1(x, y) * 0.65 + n2(x, y) * 0.35
        const lvl = Math.min(3, Math.max(0, Math.floor(v * 4 + (bayer - 0.5) * 0.9 - 0.3)))
        c = pal[lvl]
      }
      img.data[i * 4] = c[0]
      img.data[i * 4 + 1] = c[1]
      img.data[i * 4 + 2] = c[2]
      img.data[i * 4 + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)

  const dryOpen = (x: number, y: number) => {
    const i = Math.floor(y) * PW + Math.floor(x)
    return !wet[i] && toWater[i] > 4 && terr[i] === 'grass'
  }
  // 水面波光
  g.fillStyle = 'rgba(200,232,250,0.55)'
  for (let k = 0; k < 900; k++) {
    const x = Math.floor(rnd() * PW)
    const y = Math.floor(rnd() * PH)
    if (wet[y * PW + x] && toLand[y * PW + x] > 3) g.fillRect(x, y, 2 + Math.floor(rnd() * 3), 1)
  }
  // 草叢、小花、石頭
  for (let k = 0; k < 420; k++) {
    const x = Math.floor(rnd() * (PW - 3))
    const y = Math.floor(rnd() * (PH - 2)) + 1
    if (!dryOpen(x, y)) continue
    g.fillStyle = '#5b8a3a'
    g.fillRect(x, y, 1, 1)
    g.fillRect(x + 2, y, 1, 1)
    g.fillRect(x + 1, y + 1, 1, 1)
    g.fillStyle = '#9ccb6b'
    g.fillRect(x + 1, y - 1, 1, 1)
  }
  const flowers = ['#f4f1ea', '#ffd84d', '#f29bb5', '#c9a6f2']
  for (let k = 0; k < 110; k++) {
    const x = Math.floor(rnd() * PW)
    const y = Math.floor(rnd() * PH)
    if (!dryOpen(x, y)) continue
    g.fillStyle = flowers[k % flowers.length]
    g.fillRect(x, y, 1, 1)
  }
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(rnd() * (PW - 4))
    const y = Math.floor(rnd() * (PH - 3))
    if (!dryOpen(x, y) || !dryOpen(x + 3, y + 2)) continue
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.fillRect(x, y + 2, 4, 1)
    g.fillStyle = '#8e8e86'
    g.fillRect(x, y, 4, 2)
    g.fillStyle = '#c2c2b8'
    g.fillRect(x + 1, y, 2, 1)
  }

  // 木橋：同一列連續的橋格畫成一座，兩端搭到岸上
  for (let ty = 0; ty < MAP_H; ty++) {
    let tx = 0
    while (tx < MAP_W) {
      if (grid[ty][tx] !== 'bridge') {
        tx++
        continue
      }
      const start = tx
      while (tx < MAP_W && grid[ty][tx] === 'bridge') tx++
      const x0 = start * PT - 6
      const x1 = tx * PT + 6
      const y0 = ty * PT + 5
      const y1 = ty * PT + PT - 5
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.fillRect(x0 + 2, y1, x1 - x0 - 4, 3)
      for (let x = x0; x < x1; x++) {
        const k = x - x0
        g.fillStyle = k % 4 === 3 ? '#76491f' : (k >> 2) % 2 ? '#a8763f' : '#b48249'
        g.fillRect(x, y0 + 2, 1, y1 - y0 - 4)
      }
      g.fillStyle = '#cf9f62'
      g.fillRect(x0, y0 + 2, x1 - x0, 1)
      g.fillStyle = '#5b3a1c'
      g.fillRect(x0, y0, x1 - x0, 2)
      g.fillRect(x0, y1 - 2, x1 - x0, 2)
      g.fillStyle = '#4a2e15'
      for (let x = x0; x < x1; x += 10) {
        g.fillRect(x, y0 - 2, 2, 3)
        g.fillRect(x, y1 - 1, 2, 3)
      }
    }
  }

  // 樹林：每格擺幾棵圓樹或松樹，由上往下畫才不會互相蓋錯
  const trees: { x: number; y: number; r: number; pine: boolean }[] = []
  const spots = [[0.22, 0.3], [0.72, 0.25], [0.47, 0.58], [0.18, 0.86], [0.8, 0.8]]
  for (let ty = 0; ty < MAP_H; ty++)
    for (let tx = 0; tx < MAP_W; tx++) {
      if (grid[ty][tx] !== 'forest') continue
      for (const [sx, sy] of spots)
        trees.push({
          x: Math.round(tx * PT + sx * PT + (rnd() - 0.5) * 5),
          y: Math.round(ty * PT + sy * PT + (rnd() - 0.5) * 4),
          r: 4 + Math.floor(rnd() * 3),
          pine: rnd() < 0.25,
        })
    }
  trees.sort((a, b) => a.y - b.y)
  for (const t of trees) drawTree(g, t.x, t.y, t.r, t.pine)
  return layer
}

const layerCache = new Map<number, HTMLCanvasElement>()

export function levelLayer(levelIdx: number) {
  let layer = layerCache.get(levelIdx)
  if (!layer) {
    layer = createTerrainLayer(parseMap(LEVELS[levelIdx].map), levelIdx + 1)
    layerCache.set(levelIdx, layer)
  }
  return layer
}

/** 選關卡片上的小地圖：地形＋佈陣區＋敵軍位置 */
export function drawLevelThumb(canvas: HTMLCanvasElement, levelIdx: number) {
  const g = canvas.getContext('2d')
  if (!g) return
  const sx = canvas.width / PW
  const sy = canvas.height / PH
  g.imageSmoothingEnabled = false
  g.drawImage(levelLayer(levelIdx), 0, 0, canvas.width, canvas.height)
  const tw = canvas.width / MAP_W
  const th = canvas.height / MAP_H
  g.fillStyle = 'rgba(134,220,160,0.22)'
  g.fillRect(0, 0, DEPLOY_COLS * tw, canvas.height)
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  g.setLineDash([4 * sx, 3 * sx])
  g.lineWidth = sx
  g.beginPath()
  g.moveTo(DEPLOY_COLS * tw, 0)
  g.lineTo(DEPLOY_COLS * tw, canvas.height)
  g.stroke()
  g.setLineDash([])
  for (const e of LEVELS[levelIdx].enemies) {
    const x = (e.x + 0.5) * tw
    const y = (e.y + 0.5) * th
    const w = (e.commander ? 9 : 7) * sx
    g.fillStyle = 'rgba(0,0,0,0.3)'
    g.fillRect(x - w / 2 + sx, y - w / 2 + sy, w, w)
    g.fillStyle = SIDE_PAL.enemy.main
    g.fillRect(x - w / 2, y - w / 2, w, w)
    g.strokeStyle = e.commander ? '#f2c94c' : SIDE_PAL.enemy.deep
    g.lineWidth = sx
    g.strokeRect(x - w / 2, y - w / 2, w, w)
  }
}

// ── 特效（純視覺，不影響模擬） ──────────────────────

interface Arrow { x0: number; y0: number; x1: number; y1: number; t: number }
interface Dust { x: number; y: number; vx: number; vy: number; t: number; life: number; color: string }
interface Fleer { x: number; y: number; vx: number; vy: number; side: Side; unit: UnitType; t: number }
interface FloatText { x: number; y: number; text: string; color: string; size: number; t: number }
interface Zone { kind: 'fire' | 'confuse'; x: number; y: number; r: number; t: number }

export interface Fx {
  arrows: Arrow[]
  dust: Dust[]
  fleers: Fleer[]
  texts: FloatText[]
  zones: Zone[]
}

export const createFx = (): Fx => ({ arrows: [], dust: [], fleers: [], texts: [], zones: [] })

const ARROW_TIME = 0.45
const TEXT_TIME = 1.3
const FLEE_TIME = 1.2
const FIRE_TIME = 4
const jit = (r: number) => (Math.random() - 0.5) * r

function puff(fx: Fx, x: number, y: number, n: number, color: string) {
  for (let i = 0; i < n; i++)
    fx.dust.push({ x: x + jit(0.4), y: y + jit(0.3), vx: jit(0.8), vy: -0.2 - Math.random() * 0.4, t: 0, life: 0.35 + Math.random() * 0.25, color })
}

export function pushEvents(fx: Fx, events: BattleEvent[]) {
  for (const e of events) {
    switch (e.kind) {
      case 'arrow':
        // 一次放箭畫成一小波箭雨
        for (let k = 0; k < 3; k++)
          fx.arrows.push({ x0: e.x0 + jit(0.4), y0: e.y0 + jit(0.3), x1: e.x1 + jit(0.6), y1: e.y1 + jit(0.4), t: -k * 0.07 })
        break
      case 'hit':
        puff(fx, e.x, e.y + 0.15, 3, '#efe3c4')
        break
      case 'charge':
        puff(fx, e.x, e.y + 0.2, 7, '#d9c79c')
        fx.texts.push({ x: e.x, y: e.y - 0.9, text: '衝鋒！', color: '#ffd84d', size: 14, t: 0 })
        break
      case 'rout': {
        const dir = e.side === 'player' ? -1 : 1
        for (let k = 0; k < 6; k++)
          fx.fleers.push({ x: e.x + jit(0.7), y: e.y + jit(0.5), vx: dir * (1.4 + Math.random() * 0.8), vy: jit(0.8), side: e.side, unit: e.unit, t: -Math.random() * 0.15 })
        fx.texts.push({
          x: e.x, y: e.y - 0.7, text: `${e.label}潰散`, size: 15, t: 0,
          color: e.side === 'player' ? '#ffb3a8' : '#fff1a8',
        })
        break
      }
      case 'fire':
      case 'confuse':
        fx.zones.push({ kind: e.kind, x: e.x, y: e.y, r: e.r, t: 0 })
        fx.texts.push({ x: e.x, y: e.y - 0.5, text: TACTICS[e.kind].name, color: '#fff', size: 22, t: 0 })
        break
      case 'rally':
        fx.texts.push({ x: MAP_W / 2, y: MAP_H / 2, text: '全軍鼓舞！', color: '#ffd84d', size: 28, t: 0 })
        break
    }
  }
}

export function updateFx(fx: Fx, dt: number, b?: Battle) {
  for (const a of fx.arrows) a.t += dt
  for (const d of fx.dust) {
    d.t += dt
    d.x += d.vx * dt
    d.y += d.vy * dt
  }
  for (const f of fx.fleers) {
    f.t += dt
    if (f.t > 0) {
      f.x += f.vx * dt
      f.y += f.vy * dt
    }
  }
  for (const t of fx.texts) t.t += dt
  for (const z of fx.zones) z.t += dt
  // 騎兵奔馳揚起塵土
  if (b && dt > 0)
    for (const s of b.squads)
      if (s.alive && s.moving && s.type === 'cavalry' && Math.random() < dt * 9)
        puff(fx, s.x - s.facing * 0.35, s.y + 0.3, 1, '#d9c79c')
  fx.arrows = fx.arrows.filter(a => a.t < ARROW_TIME)
  fx.dust = fx.dust.filter(d => d.t < d.life)
  fx.fleers = fx.fleers.filter(f => f.t < FLEE_TIME)
  fx.texts = fx.texts.filter(t => t.t < TEXT_TIME)
  fx.zones = fx.zones.filter(z => z.t < (z.kind === 'fire' ? FIRE_TIME : 0.8))
}

function drawFlame(p: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const cols = ['#c0392b', '#ff7a1a', '#ffb02e', '#ffe27a']
  for (let k = 0; k < h; k++) {
    const w = k < h * 0.4 ? 3 : k < h * 0.75 ? 2 : 1
    p.fillStyle = cols[Math.min(3, Math.floor((k / h) * 4))]
    p.fillRect(Math.round(x - w / 2 + Math.sin(k * 1.7 + x) * 0.6), Math.round(y - k), w, 1)
  }
}

function drawFireZone(p: CanvasRenderingContext2D, z: Zone, t: number) {
  const fade = Math.min(1, (FIRE_TIME - z.t) / 0.8)
  const cx = z.x * PT
  const cy = z.y * PT
  const r = z.r * PT
  p.globalAlpha = fade
  const rnd = mulberry32(Math.round(z.x * 1000 + z.y * 7))
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2
    const d = Math.sqrt(rnd()) * r * 0.9
    const x = cx + Math.cos(a) * d
    const y = cy + Math.sin(a) * d * 0.8
    const h = 4 + Math.floor((Math.sin(t * 13 + i * 2.1) * 0.5 + 0.5) * 6)
    drawFlame(p, x, y, h)
    // 煙往上飄，循環出現
    const phase = (t * 0.7 + rnd()) % 1
    if (i % 3 === 0) {
      p.fillStyle = `rgba(70,70,70,${0.35 * (1 - phase)})`
      const sz = 2 + Math.floor(phase * 4)
      p.fillRect(Math.round(x + Math.sin(t + i) * 3), Math.round(y - 8 - phase * 22), sz, sz)
    }
  }
  p.globalAlpha = 1
}

function drawPixelFx(p: CanvasRenderingContext2D, fx: Fx, b: Battle, t: number) {
  for (const s of b.squads) {
    if (!s.alive) continue
    const { cx, feetTop } = geometry(s)
    if (s.burnUntil > b.time)
      for (let i = 0; i < 5; i++)
        drawFlame(p, cx - 9 + i * 4.5, feetTop + 2 + (i % 2) * 3, 4 + Math.floor((Math.sin(t * 14 + i) * 0.5 + 0.5) * 4))
    if (s.stunUntil > b.time)
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * Math.PI * 2) / 3
        const x = Math.round(cx + Math.cos(a) * 8)
        const y = Math.round(feetTop - 16 + Math.sin(a) * 2)
        p.fillStyle = '#ffe066'
        p.fillRect(x - 1, y, 3, 1)
        p.fillRect(x, y - 1, 1, 3)
      }
    if (s.side === 'player' && b.rallyUntil > b.time)
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.9 + i * 0.25 + s.id * 0.13) % 1
        p.fillStyle = `rgba(255,226,120,${1 - ph})`
        p.fillRect(Math.round(cx - 10 + ((i * 7 + s.id * 3) % 20)), Math.round(feetTop + 4 - ph * 18), 1, 2)
      }
  }
  for (const z of fx.zones) if (z.kind === 'fire') drawFireZone(p, z, t)
  for (const f of fx.fleers) {
    if (f.t < 0) continue
    p.globalAlpha = Math.max(0, 1 - f.t / FLEE_TIME)
    const img = sprite(f.unit, f.side, Math.floor(f.t * 14) % 2, f.vx > 0 ? 1 : -1)
    p.drawImage(img, Math.round(f.x * PT - img.width / 2), Math.round(f.y * PT - img.height + 2))
  }
  p.globalAlpha = 1
  for (const d of fx.dust) {
    const k = d.t / d.life
    p.fillStyle = d.color
    p.globalAlpha = 0.75 * (1 - k)
    const sz = 1 + Math.floor(k * 3)
    p.fillRect(Math.round(d.x * PT), Math.round(d.y * PT), sz, sz)
  }
  p.globalAlpha = 1
  for (const a of fx.arrows) {
    if (a.t < 0) continue
    const k = a.t / ARROW_TIME
    const lift = Math.sin(k * Math.PI) * PT * 0.9
    const x = (a.x0 + (a.x1 - a.x0) * k) * PT
    const y = (a.y0 + (a.y1 - a.y0) * k) * PT - lift
    const dx = (a.x1 - a.x0) * PT
    const dy = (a.y1 - a.y0) * PT - Math.cos(k * Math.PI) * Math.PI * PT * 0.9
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    p.fillStyle = '#2b1d10'
    for (let i = 0; i < 4; i++) p.fillRect(Math.round(x - ux * i), Math.round(y - uy * i), 1, 1)
    p.fillStyle = '#f4f1ea'
    p.fillRect(Math.round(x - ux * 4), Math.round(y - uy * 4), 1, 1)
  }
}

// ── 原解析度：旗幟、兵力條、文字 ──────────────────────

function drawBanner(ctx: CanvasRenderingContext2D, s: Squad, t: number) {
  const c = SIDE_PAL[s.side]
  const { cx, feetTop } = geometry(s)
  const w = s.commander ? 28 : 21
  const h = s.commander ? 30 : 23
  const bottom = (feetTop - 9) * PX
  const top = bottom - h
  const poleX = Math.round(cx * PX - w / 2)
  ctx.fillStyle = '#3b2614'
  ctx.fillRect(poleX - 1.5, top - 5, 3, (feetTop + 1) * PX - (top - 5))
  ctx.fillStyle = '#e8c04a'
  ctx.beginPath()
  ctx.moveTo(poleX - 3, top - 4)
  ctx.lineTo(poleX, top - 11)
  ctx.lineTo(poleX + 3, top - 4)
  ctx.fill()

  // 旗面隨風擺動：右緣與燕尾跟著時間起伏
  const wave = (k: number) => Math.sin(t * 3.2 + k * 2.4 + s.id * 1.3) * 1.6
  const x0 = poleX + 1
  ctx.beginPath()
  ctx.moveTo(x0, top)
  ctx.quadraticCurveTo(x0 + w / 2, top + wave(0) * 0.6, x0 + w + wave(0.2), top + 1)
  ctx.lineTo(x0 + w + wave(1), top + h)
  ctx.lineTo(x0 + w / 2 + wave(0.7), top + h - 7)
  ctx.lineTo(x0, top + h)
  ctx.closePath()
  const grad = ctx.createLinearGradient(x0, top, x0 + w, top + h)
  grad.addColorStop(0, c.light)
  grad.addColorStop(0.35, c.main)
  grad.addColorStop(1, c.dark)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.lineWidth = s.commander ? 2.5 : 1.5
  ctx.strokeStyle = s.commander ? '#f2c94c' : c.deep
  ctx.stroke()

  const char = s.general ? GENERALS[s.general].char : UNIT_STATS[s.type].char
  ctx.font = `900 ${s.commander ? 18 : 14}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.strokeText(char, x0 + w / 2 + wave(0.5) * 0.5, top + h / 2 - 2)
  ctx.fillStyle = '#fff'
  ctx.fillText(char, x0 + w / 2 + wave(0.5) * 0.5, top + h / 2 - 2)
  if (s.commander) {
    ctx.font = `bold 15px ${FONT}`
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.strokeText('★', x0 + w / 2, top - 9)
    ctx.fillStyle = '#f2c94c'
    ctx.fillText('★', x0 + w / 2, top - 9)
  }
  if (s.stance === 'hold') {
    const bx = x0 + w + 6
    const by = top + 5
    ctx.fillStyle = 'rgba(20,20,20,0.82)'
    ctx.beginPath()
    ctx.arc(bx, by, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = `bold 9px ${FONT}`
    ctx.fillText('守', bx, by + 0.5)
  }
}

function drawTroopBar(ctx: CanvasRenderingContext2D, s: Squad) {
  const { cx, feetBottom } = geometry(s)
  const w = 30
  const x = Math.round(cx * PX - w / 2)
  const y = Math.round((feetBottom + 4) * PX)
  ctx.fillStyle = 'rgba(10,10,10,0.7)'
  ctx.fillRect(x - 1, y - 1, w + 2, 6)
  ctx.fillStyle = SIDE_PAL[s.side].light
  ctx.fillRect(x, y, Math.max(0, w * (s.troops / s.maxTroops)), 4)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(x, y, Math.max(0, w * (s.troops / s.maxTroops)), 1)
}

// ── 主繪製 ────────────────────────────────────────

export interface DrawOptions {
  phase: 'deploy' | 'battle'
  selectedId: number | null
  hover: { x: number; y: number } | null
  targeting: TacticId | null
  time: number // 動畫用的時間（秒）
}

let pix: { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D } | null = null

function pixelCanvas() {
  if (!pix) {
    const canvas = document.createElement('canvas')
    canvas.width = PW
    canvas.height = PH
    const g = canvas.getContext('2d')
    if (!g) return null
    pix = { canvas, g }
  }
  return pix
}

export function render(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, b: Battle, fx: Fx, o: DrawOptions) {
  const buf = pixelCanvas()
  if (!buf) return
  const p = buf.g
  p.drawImage(layer, 0, 0)

  if (o.phase === 'deploy') {
    p.fillStyle = 'rgba(255,255,255,0.13)'
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < DEPLOY_COLS; x++) if (b.grid[y][x] !== 'water') p.fillRect(x * PT, y * PT, PT, PT)
    p.fillStyle = 'rgba(255,255,255,0.1)'
    for (let x = 1; x < MAP_W; x++) p.fillRect(x * PT, 0, 1, PH)
    for (let y = 1; y < MAP_H; y++) p.fillRect(0, y * PT, PW, 1)
    p.fillStyle = 'rgba(255,255,255,0.85)'
    for (let y = 0; y < PH; y += 6) p.fillRect(DEPLOY_COLS * PT, y, 1, 3)
    if (o.hover && Math.floor(o.hover.x) < DEPLOY_COLS) {
      p.strokeStyle = '#fff'
      p.lineWidth = 1
      p.strokeRect(Math.floor(o.hover.x) * PT + 1.5, Math.floor(o.hover.y) * PT + 1.5, PT - 3, PT - 3)
    }
  }
  for (const z of fx.zones)
    if (z.kind === 'fire') {
      p.fillStyle = `rgba(40,20,10,${0.3 * Math.min(1, (FIRE_TIME - z.t) / 0.8)})`
      p.beginPath()
      p.ellipse(z.x * PT, z.y * PT, z.r * PT, z.r * PT * 0.8, 0, 0, Math.PI * 2)
      p.fill()
    }

  const alive = b.squads.filter(s => s.alive).sort((a, c) => a.y - c.y)
  const sel = o.selectedId === null ? undefined : alive.find(s => s.id === o.selectedId)
  if (sel) {
    const { cx, feetTop, feetBottom } = geometry(sel)
    p.strokeStyle = '#fff'
    p.lineWidth = 1
    p.setLineDash([3, 2])
    p.beginPath()
    p.ellipse(cx, (feetTop + feetBottom) / 2 + 2, 17, (feetBottom - feetTop) / 2 + 6, 0, 0, Math.PI * 2)
    p.stroke()
    p.setLineDash([])
  }
  for (const s of alive) drawFormation(p, s, o.time)
  drawPixelFx(p, fx, b, o.time)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(buf.canvas, 0, 0, VIEW_W, VIEW_H)
  ctx.imageSmoothingEnabled = true

  // 火光與擾亂：疊在像素畫面上
  for (const z of fx.zones) {
    const px = z.x * TILE
    const py = z.y * TILE
    if (z.kind === 'fire') {
      const fade = Math.min(1, (FIRE_TIME - z.t) / 0.8)
      ctx.globalCompositeOperation = 'lighter'
      const gl = ctx.createRadialGradient(px, py, 4, px, py, z.r * TILE * 1.2)
      gl.addColorStop(0, `rgba(255,150,40,${0.35 * fade * (0.85 + Math.sin(o.time * 9) * 0.15)})`)
      gl.addColorStop(1, 'rgba(255,90,20,0)')
      ctx.fillStyle = gl
      ctx.beginPath()
      ctx.arc(px, py, z.r * TILE * 1.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    } else {
      for (let k = 0; k < 2; k++) {
        const ph = Math.min(1, z.t / 0.8 + k * 0.25)
        ctx.strokeStyle = `rgba(190,120,255,${1 - ph})`
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.ellipse(px, py, z.r * TILE * (0.3 + ph * 0.7), z.r * TILE * (0.3 + ph * 0.7) * 0.8, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }
  if (b.rallyUntil > b.time)
    for (const s of alive) {
      if (s.side !== 'player') continue
      const { cx, feetTop, feetBottom } = geometry(s)
      ctx.strokeStyle = `rgba(255,216,77,${0.5 + Math.sin(o.time * 8) * 0.25})`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.ellipse(cx * PX, ((feetTop + feetBottom) / 2 + 2) * PX, 36, ((feetBottom - feetTop) / 2 + 7) * PX, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

  for (const s of alive) drawBanner(ctx, s, o.time)
  for (const s of alive) drawTroopBar(ctx, s)

  if (o.targeting && o.hover) {
    const r = TACTICS[o.targeting].radius * TILE
    ctx.fillStyle = o.targeting === 'fire' ? 'rgba(255,120,40,0.22)' : 'rgba(170,110,255,0.22)'
    ctx.strokeStyle = o.targeting === 'fire' ? '#ff8a3c' : '#c08cff'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 5])
    ctx.beginPath()
    ctx.arc(o.hover.x * TILE, o.hover.y * TILE, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const t of fx.texts) {
    const k = t.t / TEXT_TIME
    ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3
    ctx.font = `900 ${t.size}px ${FONT}`
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'
    const y = t.y * TILE - k * 22
    ctx.strokeText(t.text, t.x * TILE, y)
    ctx.fillStyle = t.color
    ctx.fillText(t.text, t.x * TILE, y)
  }
  ctx.globalAlpha = 1

  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62)
  vg.addColorStop(0, 'rgba(20,25,10,0)')
  vg.addColorStop(1, 'rgba(20,25,10,0.32)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
}
