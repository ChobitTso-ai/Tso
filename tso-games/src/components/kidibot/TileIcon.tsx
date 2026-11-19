import type { TileType, Direction } from './types'

// 路徑片的進入邊 → 離開邊（箭頭畫在離開端）
const PATH_EDGES: Partial<Record<TileType, [Direction, Direction]>> = {
  path_up:      ['down', 'up'],
  path_down:    ['up', 'down'],
  path_left:    ['right', 'left'],
  path_right:   ['left', 'right'],
  path_turn_ul: ['right', 'up'],
  path_turn_ur: ['left', 'up'],
  path_turn_dl: ['right', 'down'],
  path_turn_dr: ['left', 'down'],
}

const EDGE_POINT: Record<Direction, [number, number]> = {
  up: [20, 1], down: [20, 39], left: [1, 20], right: [39, 20],
}
const EDGE_ANGLE: Record<Direction, number> = {
  right: 0, down: 90, left: 180, up: -90,
}

interface Props {
  type: TileType
  emoji: string
}

// 路徑片用 SVG 畫出「邊到邊」的線與箭頭，比 ↰↱↲↳ 等字元更清楚
export default function TileIcon({ type, emoji }: Props) {
  const edges = PATH_EDGES[type]
  if (!edges) return <>{emoji}</>

  const [from, to] = edges
  const [fx, fy] = EDGE_POINT[from]
  const [tx, ty] = EDGE_POINT[to]
  return (
    <svg className="kb-arrow" viewBox="0 0 40 40" aria-hidden="true">
      <path
        d={`M${fx},${fy} L20,20 L${tx},${ty}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <polygon
        points="-14,-10 0,0 -14,10"
        fill="currentColor"
        transform={`translate(${tx},${ty}) rotate(${EDGE_ANGLE[to]})`}
      />
    </svg>
  )
}
