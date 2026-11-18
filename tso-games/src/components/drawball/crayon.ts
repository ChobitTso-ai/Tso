// 畫線滾球 — 蠟筆筆觸工具（純 Canvas）
// 抖動量由座標算出（雜湊），不是依序取亂數：同一條線每一幀畫出來都一樣，
// 畫線時新增一段也不會讓前面已畫好的部分跟著抖動。

type Pt = [number, number]

/** 由數字算出 0～1 的固定偽亂數 */
export function hash(a: number, b = 0, c = 0): number {
  let h = Math.imul(Math.round(a * 7) ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul(Math.round(b * 7) + 0x632be5ab, 0xc2b2ae35)
  h = Math.imul(h ^ Math.imul(Math.round(c * 13) + 0x27d4eb2f, 0x165667b1), 0x9e3779b1)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  return (h >>> 0) / 4294967296
}

/**
 * 蠟筆線：幾條略微抖動的半透明筆觸疊在一起，再撒上紙色顆粒做出蠟的質感。
 * grain 填紙張顏色，才能做出「沒塗到」的空隙。
 */
export function crayonLine(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  color: string,
  width: number,
  opts: { passes?: number; grain?: string; seed?: number } = {},
) {
  if (pts.length < 2) return
  const { passes = 3, grain = 'rgba(251,244,226,0.6)', seed = 0 } = opts
  const j = width * 0.32
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  for (let k = 0; k < passes; k++) {
    ctx.globalAlpha = 0.5
    ctx.lineWidth = width * (0.7 + hash(seed, k, 1) * 0.4)
    ctx.beginPath()
    pts.forEach(([x, y], i) => {
      const jx = x + (hash(x, y, k + seed) - 0.5) * j
      const jy = y + (hash(y, x, k + seed + 7) - 0.5) * j
      if (i) ctx.lineTo(jx, jy)
      else ctx.moveTo(jx, jy)
    })
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  if (!grain) return
  ctx.fillStyle = grain
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const len = Math.hypot(bx - ax, by - ay)
    for (let d = 0; d < len; d += 2.5) {
      const t = d / len
      const x = ax + (bx - ax) * t
      const y = ay + (by - ay) * t
      if (hash(x, y, 3) < 0.5) continue
      ctx.fillRect(x + (hash(x, y, 4) - 0.5) * width, y + (hash(y, x, 5) - 0.5) * width, 1.4, 1.4)
    }
  }
}

/** 手畫感的圓：半徑略有起伏，頭尾稍微重疊 */
export function crayonCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width: number, seed = 0) {
  const pts: Pt[] = []
  for (let a = 0; a <= Math.PI * 2 + 0.35; a += 0.3) {
    const rr = r + (hash(a, seed, 2) - 0.5) * Math.max(1.2, r * 0.08)
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr])
  }
  crayonLine(ctx, pts, color, width, { passes: 2, grain: '', seed })
}

/**
 * 蠟筆斜線塗色：只在 path 範圍內畫斜線。
 * bbox 限定掃描範圍，避免每次都掃整張畫布。
 */
export function hatch(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  bbox: [number, number, number, number],
  color: string,
  opts: { gap?: number; width?: number; seed?: number; alpha?: number } = {},
) {
  const { gap = 3, width = 2.2, seed = 0, alpha = 0.6 } = opts
  const [x0, y0, x1, y1] = bbox
  const h = y1 - y0
  ctx.save()
  path()
  ctx.clip()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.beginPath()
  // 斜線由左下往右上，起點從 bbox 左邊再往左推一個高度，才能蓋滿整個範圍
  for (let x = x0 - h; x <= x1; x += gap) {
    const wob = (hash(x, seed, 9) - 0.5) * 1.6
    ctx.moveTo(x + wob, y1 + 2)
    ctx.lineTo(x + h + wob, y0 - 2)
  }
  ctx.stroke()
  ctx.restore()
}

/** 紙張底色與細小纖維顆粒 */
export function paper(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, seed = 0) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < (w * h) / 45; i++) {
    const x = hash(i, seed, 1) * w
    const y = hash(i, seed, 2) * h
    ctx.fillStyle = hash(i, seed, 3) < 0.5 ? 'rgba(120,90,40,0.06)' : 'rgba(255,255,255,0.45)'
    ctx.fillRect(x, y, 1.5, 1.5)
  }
}
