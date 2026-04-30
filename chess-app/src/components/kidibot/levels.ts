import type { Level, TileType } from './types'

const E: TileType = 'empty'
const F: TileType = 'floor'
const G: TileType = 'go'
const H: TileType = 'home'
const M: TileType = 'monster'
const FR: TileType = 'fire'
const HT: TileType = 'heart'
const ST: TileType = 'star'

// All paths verified by hand-tracing before inclusion.
// path_turn_dr: enter-left→exit-down, enter-up→exit-right
// path_turn_dl: enter-right→exit-down, enter-up→exit-left
// path_turn_ur: enter-left→exit-up, enter-down→exit-right
// path_turn_ul: enter-right→exit-up, enter-down→exit-left
// path_right:   enter-left→exit-right (and reverse)
// path_down:    enter-up→exit-down (and reverse)

export const LEVELS: Level[] = [
  // ── L1: single straight tile ──────────────────────────────────────
  // Path: GO[1,1]→R→[1,2](path_right,L→R)→R→HOME[1,3]
  {
    id: 1, name: '第一關：直走回家', size: 4, startDir: 'right',
    grid: [
      [E, E, E, E],
      [E, G, F, H],
      [E, E, E, E],
      [E, E, E, E],
    ],
    hand: ['path_right'],
    hint: '放一塊往右的磁力片，讓機器人走回家！',
  },

  // ── L2: L-shape right-then-down ──────────────────────────────────
  // Path: GO[1,1]→R→[1,2](turn_dr,L→D)→D→[2,2](path_down,U→D)→D→HOME[3,2]
  {
    id: 2, name: '第二關：轉個彎', size: 4, startDir: 'right',
    grid: [
      [E, E, E, E],
      [E, G, F, E],
      [E, E, F, E],
      [E, E, H, E],
    ],
    hand: ['path_turn_dr', 'path_down', 'path_right'],
    hint: '向右走後需要轉彎往下',
  },

  // ── L3: right-right-down-down ────────────────────────────────────
  // Path: GO→R→[1,2](right)→R→[1,3](turn_dr)→D→[2,3](down)→D→HOME[3,3]
  {
    id: 3, name: '第三關：更長的路', size: 5, startDir: 'right',
    grid: [
      [E, E, E, E, E],
      [E, G, F, F, E],
      [E, E, E, F, E],
      [E, E, E, H, E],
      [E, E, E, E, E],
    ],
    hand: ['path_right', 'path_turn_dr', 'path_down'],
    hint: '先直走兩格，再轉彎向下',
  },

  // ── L4: avoid monster (go down first) ────────────────────────────
  // Path: GO[1,1]→D→[2,1](turn_dr,U→R)→R→[2,2](right,L→R)→R→HOME[2,3]
  {
    id: 4, name: '第四關：避開怪獸', size: 5, startDir: 'down',
    grid: [
      [E, E, E, E, E],
      [E, G, M, E, E],
      [E, F, F, H, E],
      [E, E, E, E, E],
      [E, E, E, E, E],
    ],
    hand: ['path_turn_dr', 'path_right', 'path_down'],
    hint: '怪獸擋路！先向下繞過牠',
  },

  // ── L5: collect heart on path ─────────────────────────────────────
  // Path: GO→R→[1,2](right)→R→[1,3]=HT(turn_dr,L→D,collect)→D→[2,3](down)→D→HOME[3,3]
  {
    id: 5, name: '第五關：收集愛心', size: 5, startDir: 'right',
    grid: [
      [E,  E,  E,  E,  E],
      [E,  G,  F,  HT, E],
      [E,  E,  E,  F,  E],
      [E,  E,  E,  H,  E],
      [E,  E,  E,  E,  E],
    ],
    hand: ['path_right', 'path_turn_dr', 'path_down'],
    hint: '放路徑片在愛心格上，機器人經過就能收集！',
  },

  // ── L6: avoid fire (go down first) ───────────────────────────────
  // Path: GO[1,1]→D→[2,1](down,U→D)→D→[3,1](turn_dr,U→R)→R→[3,2](right,L→R)→R→HOME[3,3]
  {
    id: 6, name: '第六關：火焰陷阱', size: 5, startDir: 'down',
    grid: [
      [E,  E,  E,  E,  E],
      [E,  G,  E,  E,  E],
      [E,  F,  FR, E,  E],
      [E,  F,  F,  H,  E],
      [E,  E,  E,  E,  E],
    ],
    hand: ['path_down', 'path_turn_dr', 'path_right'],
    hint: '火焰在右邊，要先向下再繞過去',
  },

  // ── L7: collect star, avoid nothing ──────────────────────────────
  // Path: GO→R→[1,2]=ST(right,L→R,collect)→R→[1,3](turn_dr,L→D)→D→[2,3](down,U→D)→D→HOME[3,3]
  {
    id: 7, name: '第七關：收集星星', size: 6, startDir: 'right',
    grid: [
      [E, E, E,  E, E, E],
      [E, G, ST, F, E, E],
      [E, E, E,  F, E, E],
      [E, E, E,  H, E, E],
      [E, E, E,  E, E, E],
      [E, E, E,  E, E, E],
    ],
    hand: ['path_right', 'path_turn_dr', 'path_down', 'path_turn_ul'],
    hint: '星星在路上，記得放路徑片收集它！',
  },

  // ── L8: longer path around monster ───────────────────────────────
  // Path: GO[1,1]→R→[1,2](right,L→R)→R→[1,3](right,L→R)→R→[1,4](turn_dr,L→D)
  //       →D→[2,4](down,U→D)→D→HOME[3,4]
  {
    id: 8, name: '第八關：繞路高手', size: 6, startDir: 'right',
    grid: [
      [E, E,  E,  E,  E,  E],
      [E, G,  F,  F,  F,  E],
      [E, F,  M,  E,  F,  E],
      [E, F,  F,  F,  H,  E],
      [E, E,  E,  E,  E,  E],
      [E, E,  E,  E,  E,  E],
    ],
    hand: ['path_right', 'path_right', 'path_turn_dr', 'path_down', 'path_down'],
    hint: '怪獸在下方！沿上方路線繞過，再轉彎往下到家',
  },

  // ── L9: zigzag with star ──────────────────────────────────────────
  // Path: GO[1,1]→R→[1,2](turn_dr,L→D)→D→[2,2](down,U→D)→D→[3,2]=ST(turn_dr,U→R,collect)
  //       →R→[3,3](right,L→R)→R→[3,4](turn_dr,L→D)→D→HOME[4,4]
  {
    id: 9, name: '第九關：Z字冒險', size: 6, startDir: 'right',
    grid: [
      [E, E,  E,  E,  E,  E],
      [E, G,  F,  E,  F,  E],
      [E, F,  F,  M,  F,  E],
      [E, E,  ST, F,  F,  E],
      [E, E,  E,  E,  H,  E],
      [E, E,  E,  E,  E,  E],
    ],
    hand: ['path_turn_dr', 'path_turn_dr', 'path_turn_dr', 'path_down', 'path_right'],
    hint: '先向下，再右轉收集星星，最後轉彎到家！',
  },

  // ── L10: final challenge with heart + star + monsters ────────────
  // Path: GO[1,1]→R→[1,2](right,L→R)→R→[1,3]=HT(turn_dr,L→D,collect heart)
  //       →D→[2,3](down,U→D)→D→[3,3](turn_dr,U→R)→R→[3,4](turn_dr,L→D)
  //       →D→[4,4]=ST(down,U→D,collect star)→D→HOME[5,4]
  // NOTE: [3,3] entered from UP (not left), needs turn_dr (U→R), NOT path_right
  {
    id: 10, name: '第十關：終極挑戰', size: 7, startDir: 'right',
    grid: [
      [E,  E,  E,  E,  E,  E,  E],
      [E,  G,  F,  HT, E,  E,  E],
      [E,  F,  M,  F,  F,  E,  E],
      [E,  F,  F,  F,  F,  E,  E],
      [E,  E,  M,  F,  ST, E,  E],
      [E,  E,  E,  F,  H,  E,  E],
      [E,  E,  E,  E,  E,  E,  E],
    ],
    hand: ['path_right', 'path_turn_dr', 'path_turn_dr', 'path_turn_dr', 'path_down', 'path_down'],
    hint: '收集愛心和星星，繞過怪獸，安全回家！',
  },
]
