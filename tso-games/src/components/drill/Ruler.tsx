// 看尺量長度的圖：座標單位是毫米，列印時用實際大小，欄寬不夠才等比縮小
import type { RulerFig } from './types'

const PAD = 4

export default function Ruler({ fig }: { fig: RulerFig }) {
  const cm = Math.max(3, Math.ceil(fig.to / 10) + 1)
  const w = cm * 10 + PAD * 2
  const h = 22
  const ticks = []
  for (let i = 0; i <= cm * 10; i++) {
    const len = i % 10 === 0 ? 4.5 : i % 5 === 0 ? 3.2 : 2
    ticks.push(<line key={i} x1={PAD + i} y1={9} x2={PAD + i} y2={9 + len} />)
  }
  const labels = []
  for (let i = 0; i <= cm; i++) {
    labels.push(
      <text key={i} x={PAD + i * 10} y={18.6}>
        {i}
      </text>,
    )
  }
  return (
    <svg
      className="dr-ruler"
      viewBox={`0 0 ${w} ${h}`}
      width={`${w}mm`}
      height={`${h}mm`}
      role="img"
      aria-label="尺和紅色紙條"
    >
      <rect className="dr-ruler-strip" x={PAD + fig.from} y={1} width={fig.to - fig.from} height={5} rx={0.6} />
      <line className="dr-ruler-guide" x1={PAD + fig.from} y1={6} x2={PAD + fig.from} y2={9} />
      <line className="dr-ruler-guide" x1={PAD + fig.to} y1={6} x2={PAD + fig.to} y2={9} />
      <rect className="dr-ruler-body" x={PAD - 3} y={9} width={cm * 10 + 6} height={12} rx={1} />
      <g className="dr-ruler-ticks">{ticks}</g>
      <g className="dr-ruler-labels">{labels}</g>
    </svg>
  )
}
