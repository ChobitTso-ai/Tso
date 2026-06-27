// 戰艦海戰棋 — 純邏輯（無 React 依賴，方便測試與重用）

import { BOARD_SIZE } from './types'
import type { AiMemory, Board, Coord, FireResult, Orientation, Ship, ShotState } from './types'

/** 標準艦隊配置（經典戰艦規則） */
export const FLEET: ReadonlyArray<{ id: string; name: string; size: number }> = [
  { id: 'carrier', name: '航空母艦', size: 5 },
  { id: 'battleship', name: '戰艦', size: 4 },
  { id: 'cruiser', name: '巡洋艦', size: 3 },
  { id: 'submarine', name: '潛艇', size: 3 },
  { id: 'destroyer', name: '驅逐艦', size: 2 },
]

/** 全部艦艇的總格數，用於進度顯示 */
export const TOTAL_SHIP_CELLS = FLEET.reduce((sum, s) => sum + s.size, 0)

export function createEmptyShots(): ShotState[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 'none' as ShotState),
  )
}

/** 建立一份全新、尚未佈署的艦隊 */
export function makeFleet(): Ship[] {
  return FLEET.map(s => ({ ...s, cells: [], hits: 0 }))
}

export function inBounds({ r, c }: Coord): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE
}

/** 計算某艦從 start 沿 orientation 延伸會佔據的格子 */
export function shipCells(start: Coord, size: number, orientation: Orientation): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < size; i++) {
    cells.push(
      orientation === 'h' ? { r: start.r, c: start.c + i } : { r: start.r + i, c: start.c },
    )
  }
  return cells
}

/** 判斷一組格子是否可佈署（在界內，且不與已佈署艦艇重疊） */
export function canPlace(ships: Ship[], candidate: Coord[]): boolean {
  if (!candidate.every(inBounds)) return false
  const occupied = new Set(ships.flatMap(s => s.cells).map(c => `${c.r},${c.c}`))
  return candidate.every(c => !occupied.has(`${c.r},${c.c}`))
}

/** 在指定位置佈署某艘艦艇（回傳新的艦隊；若無法佈署回傳 null） */
export function placeShip(
  ships: Ship[],
  shipId: string,
  start: Coord,
  orientation: Orientation,
): Ship[] | null {
  const target = ships.find(s => s.id === shipId)
  if (!target) return null
  const candidate = shipCells(start, target.size, orientation)
  const others = ships.filter(s => s.id !== shipId)
  if (!canPlace(others, candidate)) return null
  return ships.map(s => (s.id === shipId ? { ...s, cells: candidate } : s))
}

/** 隨機佈署整支艦隊 */
export function randomFleet(): Ship[] {
  let ships = makeFleet()
  for (const ship of ships) {
    // 反覆嘗試直到找到合法位置（10x10 棋盤永遠有解）
    for (;;) {
      const orientation: Orientation = Math.random() < 0.5 ? 'h' : 'v'
      const start: Coord = {
        r: Math.floor(Math.random() * BOARD_SIZE),
        c: Math.floor(Math.random() * BOARD_SIZE),
      }
      const next = placeShip(ships, ship.id, start, orientation)
      if (next) {
        ships = next
        break
      }
    }
  }
  return ships
}

/** 回傳佔據 (r,c) 的艦艇，沒有則 null */
export function shipAt(ships: Ship[], r: number, c: number): Ship | null {
  return ships.find(s => s.cells.some(cell => cell.r === r && cell.c === c)) ?? null
}

/** 對棋盤的某格開火，回傳是否命中與是否擊沉（會就地更新 board） */
export function fire(board: Board, r: number, c: number): FireResult {
  const hitShip = shipAt(board.ships, r, c)
  if (hitShip) {
    board.shots[r][c] = 'hit'
    hitShip.hits += 1
    const sunk = hitShip.hits >= hitShip.size ? hitShip : null
    return { hit: true, sunk }
  }
  board.shots[r][c] = 'miss'
  return { hit: false, sunk: null }
}

/** 全部艦艇是否皆已沉沒 */
export function allSunk(ships: Ship[]): boolean {
  return ships.every(s => s.hits >= s.size)
}

const NEIGHBORS: Coord[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
]

/**
 * AI 選擇下一個攻擊座標。
 * 採「獵殺 / 追擊」策略：命中後將周圍格子排入佇列優先攻擊，
 * 否則以棋盤格（parity）方式隨機搜尋，提高效率。
 */
export function aiChooseTarget(board: Board, memory: AiMemory): Coord {
  // 追擊模式：優先打佇列中尚未開火的格子
  while (memory.queue.length > 0) {
    const cell = memory.queue.shift()!
    if (board.shots[cell.r][cell.c] === 'none') return cell
  }

  // 獵殺模式：在尚未開火的格子中，優先選棋盤格位置（(r+c) 為偶數）
  const available: Coord[] = []
  const parity: Coord[] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board.shots[r][c] === 'none') {
        available.push({ r, c })
        if ((r + c) % 2 === 0) parity.push({ r, c })
      }
    }
  }
  const pool = parity.length > 0 ? parity : available
  return pool[Math.floor(Math.random() * pool.length)]
}

/** AI 開火後更新記憶：命中未沉則把鄰格排入追擊佇列；擊沉則清空佇列 */
export function updateAiMemory(
  memory: AiMemory,
  board: Board,
  shot: Coord,
  result: FireResult,
): void {
  if (result.sunk) {
    memory.queue = []
    return
  }
  if (result.hit) {
    for (const d of NEIGHBORS) {
      const cell = { r: shot.r + d.r, c: shot.c + d.c }
      if (inBounds(cell) && board.shots[cell.r][cell.c] === 'none') {
        memory.queue.push(cell)
      }
    }
  }
}
