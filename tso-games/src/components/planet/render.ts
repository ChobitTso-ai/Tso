// 遊戲星球的繪製：依目前角度把星空、光環、月亮、海洋與群島畫到 canvas。純 TypeScript，不 import React。
import { fromLatLon, toView } from './geometry'
import type { Isle, PlanetScene, Vec3 } from './geometry'

/** 畫布高 ÷ 寬；要和 PlanetGlobe.css 的 .pl-globe aspect-ratio 一致 */
export const CANVAS_RATIO = 0.75

export interface Frame {
  yaw: number
  pitch: number
  /** canvas 的 CSS 寬度 */
  width: number
  dpr: number
  /** 秒；驅動星星閃爍、旗子飄動與月亮公轉 */
  time: number
  hoverId: string | null
}

/** 每座遊戲島的標籤位置（CSS 像素）；depth 越接近 1 越靠正面 */
export interface TagSpot {
  id: string
  x: number
  y: number
  depth: number
  /** 主島名牌在島的上方、周圍小島在下方，同群島的名牌才不會疊在一起 */
  below: boolean
}

interface Layout {
  w: number
  h: number
  cx: number
  cy: number
  r: number
}

type Point = [number, number]

const GOLD = '228, 201, 126'
const RING_TILT = -0.28
const RING_FLAT = 0.24
// [半徑倍數, 透明度, 線寬倍數]：三圈粗細不同的金色光環
const RING_BANDS: [number, number, number][] = [
  [1.42, 0.16, 0.07],
  [1.55, 0.4, 0.035],
  [1.66, 0.22, 0.018],
]
const ISLE_FILLS = ['rgba(140, 225, 255, 0.16)', '#eadfb4', '', 'rgba(255, 255, 255, 0.22)']

/** 星球半徑（CSS 像素）；拖曳時用它換算滑動距離與旋轉角度 */
export const planetRadius = (width: number) => width * CANVAS_RATIO * 0.38

const layoutOf = (width: number): Layout => {
  const h = width * CANVAS_RATIO
  return { w: width, h, cx: width / 2, cy: h / 2, r: planetRadius(width) }
}

// 固定的星空：同一個 i 永遠得到同一顆星
const hash = (n: number) => {
  const x = Math.sin(n) * 43758.5453
  return x - Math.floor(x)
}
const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: hash(i + 1),
  y: hash(i + 101),
  size: 0.5 + hash(i + 201) * 1.3,
  phase: hash(i + 301) * 6.3,
}))

// 經緯線：經線每 30°、緯線 -60°～60°
const GRID: Vec3[][] = []
for (let lon = 0; lon < 360; lon += 30) {
  GRID.push(Array.from({ length: 37 }, (_, i) => fromLatLon(-90 + i * 5, lon)))
}
for (let lat = -60; lat <= 60; lat += 30) {
  GRID.push(Array.from({ length: 73 }, (_, i) => fromLatLon(lat, i * 5)))
}

function project(p: Vec3, f: Frame, L: Layout): [number, number, number] {
  const q = toView(p, f.yaw, f.pitch)
  return [L.cx + q[0] * L.r, L.cy - q[1] * L.r, q[2]]
}

// 島的輪廓：轉到背面的點貼齊星球邊緣，島跨過邊緣時才會被整齊切掉
function outline(pts: Vec3[], f: Frame, L: Layout): Point[] {
  return pts.map(p => {
    const q = toView(p, f.yaw, f.pitch)
    let x = q[0]
    let y = q[1]
    if (q[2] < 0) {
      const len = Math.hypot(x, y) || 1
      x /= len
      y /= len
    }
    return [L.cx + x * L.r, L.cy - y * L.r]
  })
}

// 以相鄰兩點的中點為節點畫二次曲線，海岸線才不會有尖角
function smoothPath(ctx: CanvasRenderingContext2D, pts: Point[]) {
  const n = pts.length
  ctx.beginPath()
  ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2)
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i]
    const [nx, ny] = pts[(i + 1) % n]
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
  }
  ctx.closePath()
}

function insidePolygon(pts: Point[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function drawStars(ctx: CanvasRenderingContext2D, f: Frame, L: Layout) {
  ctx.fillStyle = '#fff'
  for (const s of STARS) {
    const x = s.x * L.w
    const y = s.y * L.h
    if (Math.hypot(x - L.cx, y - L.cy) < L.r * 1.1) continue
    ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(f.time * 1.3 + s.phase))
    ctx.beginPath()
    ctx.arc(x, y, s.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// 光環分前後兩半：後半圈先畫、被星球擋住；前半圈最後畫、蓋在星球上
function drawRing(ctx: CanvasRenderingContext2D, L: Layout, back: boolean) {
  const [from, to] = back ? [Math.PI, Math.PI * 2] : [0, Math.PI]
  for (const [k, alpha, width] of RING_BANDS) {
    ctx.strokeStyle = `rgba(${GOLD}, ${alpha})`
    ctx.lineWidth = L.r * width
    ctx.beginPath()
    ctx.ellipse(L.cx, L.cy, L.r * k, L.r * k * RING_FLAT, RING_TILT, from, to)
    ctx.stroke()
  }
}

// 月亮沿光環平面公轉；sin(角度) > 0 時在星球前方
function drawMoon(ctx: CanvasRenderingContext2D, f: Frame, L: Layout, front: boolean) {
  const a = f.time * 0.22 + 1
  if (Math.sin(a) > 0 !== front) return
  const mx = L.r * 1.3 * Math.cos(a)
  const my = L.r * 1.3 * RING_FLAT * Math.sin(a)
  const x = L.cx + mx * Math.cos(RING_TILT) - my * Math.sin(RING_TILT)
  const y = L.cy + mx * Math.sin(RING_TILT) + my * Math.cos(RING_TILT)
  const s = L.r * 0.08
  const g = ctx.createRadialGradient(x - s * 0.4, y - s * 0.4, s * 0.1, x, y, s)
  g.addColorStop(0, '#f4efe2')
  g.addColorStop(1, '#a9a395')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(80, 70, 60, 0.22)'
  for (const [dx, dy, cr] of [[0.25, -0.2, 0.22], [-0.3, 0.25, 0.16], [0.15, 0.45, 0.12]]) {
    ctx.beginPath()
    ctx.arc(x + dx * s, y + dy * s, cr * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, f: Frame, L: Layout) {
  ctx.strokeStyle = `rgba(${GOLD}, 0.12)`
  ctx.lineWidth = 1
  for (const line of GRID) {
    ctx.beginPath()
    let pen = false
    for (const p of line) {
      const [x, y, z] = project(p, f, L)
      if (z <= 0) {
        pen = false
        continue
      }
      if (pen) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
      pen = true
    }
    ctx.stroke()
  }
}

function drawIsle(ctx: CanvasRenderingContext2D, isle: Isle, f: Frame, L: Layout) {
  if (toView(isle.center, f.yaw, f.pitch)[2] < -0.3) return
  isle.layers.forEach((layer, i) => {
    smoothPath(ctx, outline(layer, f, L))
    ctx.fillStyle = i === 2 ? isle.color : ISLE_FILLS[i]
    ctx.fill()
    if (i === 2) {
      ctx.strokeStyle = 'rgba(10, 30, 50, 0.35)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  })
  if (isle.game && isle.game.id === f.hoverId) {
    smoothPath(ctx, outline(isle.layers[1], f, L))
    ctx.strokeStyle = `rgb(${GOLD})`
    ctx.lineWidth = 2.5
    ctx.stroke()
  }
}

// 每座遊戲島有一棟小房子；熱度 3 的新遊戲另外插紅旗（與遊戲島的規則相同）
function drawLandmark(ctx: CanvasRenderingContext2D, isle: Isle, f: Frame, L: Layout) {
  if (!isle.game) return
  const [x, y, z] = project(isle.center, f, L)
  if (z < 0.2) return
  ctx.globalAlpha = Math.min(1, (z - 0.2) / 0.2)
  const s = L.r * (isle.main ? 0.075 : 0.055) * (0.6 + 0.4 * z)
  ctx.fillStyle = '#fff4dc'
  ctx.fillRect(x - s / 2, y - s * 0.55, s, s * 0.55)
  ctx.fillStyle = '#b5523b'
  ctx.beginPath()
  ctx.moveTo(x - s * 0.68, y - s * 0.5)
  ctx.lineTo(x, y - s * 1.05)
  ctx.lineTo(x + s * 0.68, y - s * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#4a3428'
  ctx.fillRect(x - s * 0.12, y - s * 0.3, s * 0.24, s * 0.3)
  if (isle.game.heat === 3) {
    const px = x + s * 0.85
    const top = y - s * 1.7
    ctx.strokeStyle = '#3b2a20'
    ctx.lineWidth = Math.max(1, s * 0.08)
    ctx.beginPath()
    ctx.moveTo(px, y)
    ctx.lineTo(px, top)
    ctx.stroke()
    const wave = Math.sin(f.time * 3 + x) * s * 0.08
    ctx.fillStyle = '#e74c3c'
    ctx.beginPath()
    ctx.moveTo(px, top)
    ctx.lineTo(px + s * 0.75, top + s * 0.22 + wave)
    ctx.lineTo(px, top + s * 0.45)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** 畫一幀，回傳各遊戲島標籤該放的位置 */
export function drawPlanet(ctx: CanvasRenderingContext2D, scene: PlanetScene, f: Frame): TagSpot[] {
  const L = layoutOf(f.width)
  ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0)
  ctx.clearRect(0, 0, L.w, L.h)
  drawStars(ctx, f, L)

  const halo = ctx.createRadialGradient(L.cx, L.cy, L.r * 0.95, L.cx, L.cy, L.r * 1.3)
  halo.addColorStop(0, 'rgba(120, 190, 255, 0.35)')
  halo.addColorStop(1, 'rgba(120, 190, 255, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(L.cx, L.cy, L.r * 1.3, 0, Math.PI * 2)
  ctx.fill()

  drawRing(ctx, L, true)
  drawMoon(ctx, f, L, false)

  const ocean = ctx.createRadialGradient(L.cx - L.r * 0.35, L.cy - L.r * 0.4, L.r * 0.1, L.cx, L.cy, L.r)
  ocean.addColorStop(0, '#2f86c4')
  ocean.addColorStop(1, '#0b2c4f')
  ctx.fillStyle = ocean
  ctx.beginPath()
  ctx.arc(L.cx, L.cy, L.r, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(L.cx, L.cy, L.r, 0, Math.PI * 2)
  ctx.clip()
  drawGrid(ctx, f, L)
  for (const isle of scene.isles) drawIsle(ctx, isle, f, L)
  for (const isle of scene.isles) drawLandmark(ctx, isle, f, L)
  // 左上受光、右下背光，讓星球看起來是圓的
  const shade = ctx.createRadialGradient(L.cx - L.r * 0.4, L.cy - L.r * 0.45, L.r * 0.15, L.cx, L.cy, L.r * 1.05)
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.14)')
  shade.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  shade.addColorStop(1, 'rgba(3, 10, 26, 0.55)')
  ctx.fillStyle = shade
  ctx.fillRect(L.cx - L.r, L.cy - L.r, L.r * 2, L.r * 2)
  ctx.restore()

  drawRing(ctx, L, false)
  drawMoon(ctx, f, L, true)

  const tags: TagSpot[] = []
  for (const isle of scene.isles) {
    if (!isle.game) continue
    const [x, y, depth] = project(isle.center, f, L)
    const below = !isle.main
    tags.push({ id: isle.game.id, x, y: below ? y + L.r * 0.1 : y - L.r * 0.13, depth, below })
  }
  return tags
}

/** 點擊位置（CSS 像素）落在哪座遊戲島上；只算朝向正面的島，重疊時取較靠前的 */
export function hitTest(scene: PlanetScene, f: Frame, x: number, y: number): Isle | null {
  const L = layoutOf(f.width)
  let best: Isle | null = null
  let bestDepth = 0.15
  for (const isle of scene.isles) {
    if (!isle.game) continue
    const depth = toView(isle.center, f.yaw, f.pitch)[2]
    if (depth <= bestDepth) continue
    if (insidePolygon(outline(isle.layers[1], f, L), x, y)) {
      best = isle
      bestDepth = depth
    }
  }
  return best
}
