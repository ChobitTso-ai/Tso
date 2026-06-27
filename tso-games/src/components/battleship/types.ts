// 戰艦海戰棋 — 型別定義

export const BOARD_SIZE = 10

export type Orientation = 'h' | 'v'

export interface Coord {
  r: number
  c: number
}

/** 單一射擊格的狀態（none = 尚未開火） */
export type ShotState = 'none' | 'hit' | 'miss'

export interface Ship {
  id: string
  name: string
  size: number
  cells: Coord[] // 佔據的格子，尚未佈署時為空陣列
  hits: number // 被命中的次數，達到 size 即沉沒
}

export interface Board {
  ships: Ship[]
  shots: ShotState[][] // BOARD_SIZE x BOARD_SIZE，記錄此格被開火的結果
}

/** AI 的內部記憶：獵殺/追擊策略所需的待打目標佇列 */
export interface AiMemory {
  queue: Coord[]
}

/** 開火結果 */
export interface FireResult {
  hit: boolean
  sunk: Ship | null
}
