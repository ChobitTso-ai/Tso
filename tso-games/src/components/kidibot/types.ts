export type TileType =
  | 'empty'
  | 'floor'
  | 'go'
  | 'home'
  | 'monster'
  | 'fire'
  | 'trap'
  | 'heart'
  | 'star'
  | 'path_up'
  | 'path_down'
  | 'path_left'
  | 'path_right'
  | 'path_turn_ul'   // up ↔ left
  | 'path_turn_ur'   // up ↔ right
  | 'path_turn_dl'   // down ↔ left
  | 'path_turn_dr'   // down ↔ right

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Cell {
  row: number
  col: number
}

export interface GridCell {
  fixed: TileType    // from level definition, cannot be moved
  placed: TileType   // player-placed path tile
}

export interface Level {
  id: number
  name: string
  size: number
  grid: TileType[][]   // fixed tiles; 'floor' = walkable empty, 'empty' = out of bounds
  hand: TileType[]     // tiles available to the player this level
  startDir: Direction  // explicit starting direction from GO
  hint?: string
}

export const TILE_EMOJI: Record<TileType, string> = {
  empty: '',
  floor: '',
  go: '🟢',
  home: '🏠',
  monster: '👾',
  fire: '🔥',
  trap: '⚠️',
  heart: '❤️',
  star: '⭐',
  path_up: '↑',
  path_down: '↓',
  path_left: '←',
  path_right: '→',
  path_turn_ul: '↰',
  path_turn_ur: '↱',
  path_turn_dl: '↲',
  path_turn_dr: '↳',
}

export const TILE_LABEL: Record<TileType, string> = {
  empty: '',
  floor: '',
  go: 'GO',
  home: '到家',
  monster: '怪獸',
  fire: '火焰',
  trap: '陷阱',
  heart: '愛心',
  star: '星星',
  path_up: '上',
  path_down: '下',
  path_left: '左',
  path_right: '右',
  path_turn_ul: '→↑ ↓←',
  path_turn_ur: '←↑ ↓→',
  path_turn_dl: '→↓ ↑←',
  path_turn_dr: '←↓ ↑→',
}

// given a tile, returns [entryDir, exitDir] pairs (can enter from, exits toward)
export const PATH_CONNECTIONS: Partial<Record<TileType, [Direction, Direction][]>> = {
  path_up:      [['down', 'up'],   ['up', 'down']],
  path_down:    [['up', 'down'],   ['down', 'up']],
  path_left:    [['right', 'left'],['left', 'right']],
  path_right:   [['left', 'right'],['right', 'left']],
  path_turn_ul: [['right', 'up'],  ['down', 'left']],
  path_turn_ur: [['left', 'up'],   ['down', 'right']],
  path_turn_dl: [['right', 'down'],['up', 'left']],
  path_turn_dr: [['left', 'down'], ['up', 'right']],
}
