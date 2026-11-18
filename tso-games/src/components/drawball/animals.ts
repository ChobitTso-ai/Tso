// 畫線滾球 — 主角小動物（蠟筆畫，純 Canvas）
// 每隻都畫成縮成一團的圓形，物理上仍是同一顆球，只換外觀。
// 繪製時以 (0, 0) 為中心、半徑 r；呼叫端負責平移與滾動旋轉。
import { crayonCircle, crayonLine, hatch } from './crayon'

type Draw = (ctx: CanvasRenderingContext2D, r: number) => void

export interface Animal {
  id: string
  name: string
  emoji: string
  color: string // 拖尾、畫面外箭頭用的代表色
  draw: Draw
}

const INK = '#3a2412'

function body(ctx: CanvasRenderingContext2D, r: number, fill: string, edge: string, seed: number) {
  hatch(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2) }, [-r, -r, r, r], fill, { gap: 2.4, seed, alpha: 0.75 })
  crayonCircle(ctx, 0, 0, r, edge, Math.max(2, r * 0.2), seed)
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, color = INK) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, rad, 0, Math.PI * 2)
  ctx.fill()
}

function eyes(ctx: CanvasRenderingContext2D, r: number, dy = -0.2, gap = 0.36) {
  dot(ctx, -r * gap, r * dy, Math.max(1.3, r * 0.13))
  dot(ctx, r * gap, r * dy, Math.max(1.3, r * 0.13))
}

function blush(ctx: CanvasRenderingContext2D, r: number, color = 'rgba(255,110,120,0.45)') {
  dot(ctx, -r * 0.58, r * 0.18, r * 0.16, color)
  dot(ctx, r * 0.58, r * 0.18, r * 0.16, color)
}

function smile(ctx: CanvasRenderingContext2D, r: number, y = 0.22) {
  crayonLine(ctx, [[-r * 0.22, r * y], [0, r * (y + 0.16)], [r * 0.22, r * y]], INK, Math.max(1.4, r * 0.12), { passes: 2, grain: '' })
}

function tri(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string, edge: string, r: number) {
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  hatch(ctx, () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath() },
    [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], fill, { gap: 2, alpha: 0.8 })
  crayonLine(ctx, [...pts, pts[0]], edge, Math.max(1.6, r * 0.14), { passes: 2, grain: '' })
}

export const ANIMALS: Animal[] = [
  {
    id: 'chick', name: '小雞', emoji: '🐥', color: '#f2b705',
    draw: (ctx, r) => {
      body(ctx, r, '#f6c90e', '#c99400', 1)
      crayonLine(ctx, [[-r * 0.1, -r], [-r * 0.3, -r * 1.5], [r * 0.05, -r * 1.1], [r * 0.25, -r * 1.55]], '#c99400', r * 0.16, { passes: 2, grain: '' })
      tri(ctx, [[r * 0.15, 0], [r * 0.75, r * 0.15], [r * 0.15, r * 0.32]], '#f07c1c', '#c2560f', r)
      eyes(ctx, r, -0.25, 0.32)
      blush(ctx, r)
    },
  },
  {
    id: 'pig', name: '小豬', emoji: '🐷', color: '#f783ac',
    draw: (ctx, r) => {
      tri(ctx, [[-r * 0.75, -r * 0.55], [-r * 0.6, -r * 1.25], [-r * 0.15, -r * 0.85]], '#ffb3c6', '#d6577a', r)
      tri(ctx, [[r * 0.75, -r * 0.55], [r * 0.6, -r * 1.25], [r * 0.15, -r * 0.85]], '#ffb3c6', '#d6577a', r)
      body(ctx, r, '#ffb3c6', '#d6577a', 2)
      hatch(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.38, r * 0.26, 0, 0, Math.PI * 2) }, [-r * 0.4, 0, r * 0.4, r * 0.5], '#f06595', { gap: 1.8 })
      dot(ctx, -r * 0.13, r * 0.2, r * 0.08)
      dot(ctx, r * 0.13, r * 0.2, r * 0.08)
      eyes(ctx, r, -0.28, 0.34)
    },
  },
  {
    id: 'frog', name: '青蛙', emoji: '🐸', color: '#69b34c',
    draw: (ctx, r) => {
      for (const s of [-1, 1]) {
        hatch(ctx, () => { ctx.beginPath(); ctx.arc(s * r * 0.45, -r * 0.8, r * 0.36, 0, Math.PI * 2) }, [s * r * 0.45 - r * 0.4, -r * 1.2, s * r * 0.45 + r * 0.4, -r * 0.4], '#7ccf5a', { gap: 2 })
        crayonCircle(ctx, s * r * 0.45, -r * 0.8, r * 0.36, '#3f8f2a', r * 0.14, 3 + s)
      }
      body(ctx, r, '#7ccf5a', '#3f8f2a', 3)
      for (const s of [-1, 1]) {
        dot(ctx, s * r * 0.45, -r * 0.8, r * 0.22, '#fff')
        dot(ctx, s * r * 0.45, -r * 0.78, r * 0.12)
      }
      crayonLine(ctx, [[-r * 0.45, r * 0.15], [0, r * 0.42], [r * 0.45, r * 0.15]], INK, Math.max(1.4, r * 0.12), { passes: 2, grain: '' })
      blush(ctx, r)
    },
  },
  {
    id: 'panda', name: '熊貓', emoji: '🐼', color: '#495057',
    draw: (ctx, r) => {
      for (const s of [-1, 1]) dot(ctx, s * r * 0.68, -r * 0.72, r * 0.3, '#2b2b2b')
      body(ctx, r, '#e9ecef', '#495057', 4)
      for (const s of [-1, 1]) {
        ctx.save()
        ctx.translate(s * r * 0.36, -r * 0.12)
        ctx.rotate(s * 0.5)
        ctx.fillStyle = '#2b2b2b'
        ctx.beginPath()
        ctx.ellipse(0, 0, r * 0.22, r * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        dot(ctx, s * r * 0.34, -r * 0.16, r * 0.08, '#fff')
      }
      dot(ctx, 0, r * 0.2, r * 0.1)
      smile(ctx, r, 0.3)
    },
  },
  {
    id: 'cat', name: '小貓', emoji: '🐱', color: '#f08c00',
    draw: (ctx, r) => {
      tri(ctx, [[-r * 0.85, -r * 0.35], [-r * 0.8, -r * 1.3], [-r * 0.2, -r * 0.9]], '#ffa94d', '#d9480f', r)
      tri(ctx, [[r * 0.85, -r * 0.35], [r * 0.8, -r * 1.3], [r * 0.2, -r * 0.9]], '#ffa94d', '#d9480f', r)
      body(ctx, r, '#ffa94d', '#d9480f', 5)
      for (const dx of [-0.3, 0, 0.3]) crayonLine(ctx, [[r * dx, -r * 0.95], [r * dx, -r * 0.6]], '#d9480f', r * 0.12, { passes: 2, grain: '' })
      eyes(ctx, r, -0.15, 0.36)
      dot(ctx, 0, r * 0.12, r * 0.09, '#e8590c')
      for (const s of [-1, 1]) for (const dy of [0.12, 0.3]) crayonLine(ctx, [[s * r * 0.35, r * dy], [s * r * 1.05, r * (dy - 0.06)]], INK, Math.max(1, r * 0.07), { passes: 1, grain: '' })
    },
  },
  {
    id: 'rabbit', name: '兔子', emoji: '🐰', color: '#b197fc',
    draw: (ctx, r) => {
      for (const s of [-1, 1]) {
        ctx.save()
        ctx.translate(s * r * 0.35, -r * 1.1)
        ctx.rotate(s * 0.25)
        hatch(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.26, r * 0.6, 0, 0, Math.PI * 2) }, [-r * 0.3, -r * 0.65, r * 0.3, r * 0.65], '#f3f0ff', { gap: 2 })
        hatch(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.12, r * 0.42, 0, 0, Math.PI * 2) }, [-r * 0.15, -r * 0.45, r * 0.15, r * 0.45], '#faa2c1', { gap: 1.6 })
        ctx.strokeStyle = '#8a7aa8'
        ctx.lineWidth = Math.max(1.4, r * 0.12)
        ctx.beginPath()
        ctx.ellipse(0, 0, r * 0.26, r * 0.6, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      body(ctx, r, '#f3f0ff', '#8a7aa8', 6)
      eyes(ctx, r, -0.15, 0.34)
      dot(ctx, 0, r * 0.12, r * 0.1, '#f06595')
      smile(ctx, r, 0.26)
      blush(ctx, r)
    },
  },
  {
    id: 'bear', name: '小熊', emoji: '🐻', color: '#a0703f',
    draw: (ctx, r) => {
      for (const s of [-1, 1]) {
        dot(ctx, s * r * 0.68, -r * 0.7, r * 0.32, '#8b5a2b')
        dot(ctx, s * r * 0.68, -r * 0.7, r * 0.16, '#d9a066')
      }
      body(ctx, r, '#b07a4a', '#6b3f1d', 7)
      hatch(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.42, r * 0.32, 0, 0, Math.PI * 2) }, [-r * 0.45, -r * 0.1, r * 0.45, r * 0.6], '#f0c99a', { gap: 1.8, alpha: 0.85 })
      eyes(ctx, r, -0.2, 0.36)
      dot(ctx, 0, r * 0.15, r * 0.11)
      smile(ctx, r, 0.3)
    },
  },
  {
    id: 'penguin', name: '企鵝', emoji: '🐧', color: '#3b5bdb',
    draw: (ctx, r) => {
      body(ctx, r, '#3b5bdb', '#1c2f7a', 8)
      hatch(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.62, r * 0.7, 0, 0, Math.PI * 2) }, [-r * 0.65, -r * 0.6, r * 0.65, r * 0.85], '#ffffff', { gap: 1.6, alpha: 0.9 })
      eyes(ctx, r, -0.18, 0.28)
      tri(ctx, [[-r * 0.18, r * 0.05], [r * 0.18, r * 0.05], [0, r * 0.3]], '#ffa94d', '#d9480f', r)
      blush(ctx, r)
    },
  },
]

/** 依關卡挑主角；第二顆球錯開半圈，兩隻一定不同 */
export function animalFor(levelIdx: number, ballIdx: number): Animal {
  return ANIMALS[(levelIdx + ballIdx * (ANIMALS.length / 2)) % ANIMALS.length]
}

/** 地圖、提示列用的小頭像 */
export function drawAnimalIcon(canvas: HTMLCanvasElement, animal: Animal) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const size = canvas.clientWidth || 40
  canvas.width = size * dpr
  canvas.height = size * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, size, size)
  ctx.translate(size / 2, size * 0.58)
  animal.draw(ctx, size * 0.3)
}
