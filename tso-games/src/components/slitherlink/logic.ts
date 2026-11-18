// 數迴：盤面幾何、出題與推理解題（純 TypeScript，不 import React）
//
// 邊的編號：先排橫邊，再排直邊
//   橫邊 (r, c)：第 r 條橫線（0..rows）上、第 c 格的上緣，編號 r * cols + c
//   直邊 (r, c)：第 r 列、第 c 條直線（0..cols），編號 H + r * (cols + 1) + c
// 點 (r, c) 的編號為 r * (cols + 1) + c

export type Level = 'normal' | 'hard'
export type Mark = 0 | 1 | 2 // 0 空白、1 線、2 打叉

export const SIZES = [5, 7, 10] as const
export type Size = (typeof SIZES)[number]
export const LEVELS: Level[] = ['normal', 'hard']
export const LEVEL_LABELS: Record<Level, string> = { normal: '普通', hard: '困難' }

export interface Puzzle {
  size: Size
  level: Level
  clues: (number | null)[] // 每格的提示數字，null 為空白格
  solution: number[]       // 每條邊是否在迴路上（1／0）
}

export interface Topology {
  rows: number
  cols: number
  edgeCount: number
  cellEdges: number[][]  // 每格的上、下、左、右邊
  vertEdges: number[][]  // 每個點連出的邊
  edgeVerts: number[][]  // 每條邊的兩個端點
  edgeCells: number[][]  // 每條邊相鄰的格子（1 或 2 格）
}

const topoCache = new Map<number, Topology>()

export function topology(size: number): Topology {
  const cached = topoCache.get(size)
  if (cached) return cached
  const rows = size
  const cols = size
  const H = (rows + 1) * cols
  const edgeCount = H + rows * (cols + 1)
  const vid = (r: number, c: number) => r * (cols + 1) + c
  const hEdge = (r: number, c: number) => r * cols + c
  const vEdge = (r: number, c: number) => H + r * (cols + 1) + c

  const cellEdges: number[][] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cellEdges.push([hEdge(r, c), hEdge(r + 1, c), vEdge(r, c), vEdge(r, c + 1)])
  }
  const edgeVerts: number[][] = []
  const edgeCells: number[][] = Array.from({ length: edgeCount }, () => [])
  for (let r = 0; r <= rows; r++) for (let c = 0; c < cols; c++) edgeVerts[hEdge(r, c)] = [vid(r, c), vid(r, c + 1)]
  for (let r = 0; r < rows; r++) for (let c = 0; c <= cols; c++) edgeVerts[vEdge(r, c)] = [vid(r, c), vid(r + 1, c)]
  cellEdges.forEach((edges, cell) => edges.forEach(e => edgeCells[e].push(cell)))
  const vertEdges: number[][] = Array.from({ length: (rows + 1) * (cols + 1) }, () => [])
  edgeVerts.forEach(([a, b], e) => {
    vertEdges[a].push(e)
    vertEdges[b].push(e)
  })

  const topo = { rows, cols, edgeCount, cellEdges, vertEdges, edgeVerts, edgeCells }
  topoCache.set(size, topo)
  return topo
}

// ── 出題：先長出一塊「圈內」區域，它的外框就是答案迴路 ─────────────

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function cellNeighbors(size: number, i: number): number[] {
  const r = Math.floor(i / size)
  const c = i % size
  const out: number[] = []
  if (r > 0) out.push(i - size)
  if (r < size - 1) out.push(i + size)
  if (c > 0) out.push(i - 1)
  if (c < size - 1) out.push(i + 1)
  return out
}

// 圈內要連成一塊；圈外的每一格都要能走到盤面邊緣（不能有洞）；
// 而且不能有「棋盤格」狀的 2×2，否則迴路會在那個點碰到自己
function regionValid(size: number, inside: boolean[]): boolean {
  const n = size * size
  const start = inside.indexOf(true)
  if (start < 0) return false
  const seen = new Array<boolean>(n).fill(false)
  const stack = [start]
  seen[start] = true
  let count = 0
  while (stack.length) {
    const i = stack.pop()!
    count++
    for (const j of cellNeighbors(size, i)) {
      if (inside[j] && !seen[j]) {
        seen[j] = true
        stack.push(j)
      }
    }
  }
  if (count !== inside.filter(Boolean).length) return false

  const out = new Array<boolean>(n).fill(false)
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / size)
    const c = i % size
    if (!inside[i] && (r === 0 || c === 0 || r === size - 1 || c === size - 1)) {
      out[i] = true
      stack.push(i)
    }
  }
  while (stack.length) {
    const i = stack.pop()!
    for (const j of cellNeighbors(size, i)) {
      if (!inside[j] && !out[j]) {
        out[j] = true
        stack.push(j)
      }
    }
  }
  for (let i = 0; i < n; i++) if (!inside[i] && !out[i]) return false

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const a = inside[r * size + c]
      const b = inside[r * size + c + 1]
      const d = inside[(r + 1) * size + c]
      const e = inside[(r + 1) * size + c + 1]
      if (a === e && b === d && a !== b) return false
    }
  }
  return true
}

function randomRegion(size: number): boolean[] {
  const n = size * size
  const inside = new Array<boolean>(n).fill(false)
  inside[Math.floor(Math.random() * n)] = true
  const goal = Math.round(n * (0.45 + Math.random() * 0.15))
  let count = 1
  for (let step = 0; step < n * 60 && count < goal; step++) {
    const i = Math.floor(Math.random() * n)
    if (inside[i] || !cellNeighbors(size, i).some(j => inside[j])) continue
    inside[i] = true
    if (regionValid(size, inside)) count++
    else inside[i] = false
  }
  return inside
}

function regionToSolution(size: number, inside: boolean[]): number[] {
  const topo = topology(size)
  return topo.edgeCells.map(cells => {
    const a = inside[cells[0]]
    const b = cells.length > 1 ? inside[cells[1]] : false
    return a !== b ? 1 : 0
  })
}

export function cluesFromSolution(size: number, solution: number[]): number[] {
  return topology(size).cellEdges.map(edges => edges.reduce((s, e) => s + solution[e], 0))
}

// ── 推理解題 ─────────────────────────────────────────

// 解題時邊的狀態：0 未知、1 線、-1 打叉
type State = Int8Array

// 反覆套用基本規則直到沒有新進展；發現矛盾回傳 false
//   格子：線數不能超過提示數，也不能少到湊不滿
//   點：每個點只能連 0 或 2 條線
//   迴路：不能提早圍成小圈
function propagate(topo: Topology, clues: (number | null)[], s: State): boolean {
  const { cellEdges, vertEdges, edgeVerts } = topo
  let changed = true
  while (changed) {
    changed = false

    for (let cell = 0; cell < cellEdges.length; cell++) {
      const k = clues[cell]
      if (k === null) continue
      let lines = 0
      let unknown = 0
      for (const e of cellEdges[cell]) {
        if (s[e] === 1) lines++
        else if (s[e] === 0) unknown++
      }
      if (lines > k || lines + unknown < k) return false
      if (unknown === 0) continue
      if (lines === k) {
        for (const e of cellEdges[cell]) if (s[e] === 0) s[e] = -1
        changed = true
      } else if (lines + unknown === k) {
        for (const e of cellEdges[cell]) if (s[e] === 0) s[e] = 1
        changed = true
      }
    }

    for (let v = 0; v < vertEdges.length; v++) {
      let lines = 0
      let unknown = 0
      let last = -1
      for (const e of vertEdges[v]) {
        if (s[e] === 1) lines++
        else if (s[e] === 0) {
          unknown++
          last = e
        }
      }
      if (lines > 2 || (lines === 1 && unknown === 0)) return false
      if (unknown === 0) continue
      if (lines === 2) {
        for (const e of vertEdges[v]) if (s[e] === 0) s[e] = -1
        changed = true
      } else if (lines === 1 && unknown === 1) {
        s[last] = 1
        changed = true
      } else if (lines === 0 && unknown === 1) {
        s[last] = -1
        changed = true
      }
    }

    // 把線段連成的片段找出來：片段兩端若只差一條邊就會圍起來，
    // 除非它已經包含所有的線，否則那條邊必須打叉
    const parent = vertEdges.map((_, i) => i)
    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]]
        x = parent[x]
      }
      return x
    }
    let totalLines = 0
    for (let e = 0; e < s.length; e++) {
      if (s[e] !== 1) continue
      totalLines++
      parent[find(edgeVerts[e][0])] = find(edgeVerts[e][1])
    }
    if (totalLines === 0) continue
    const compEdges = new Map<number, number>()
    for (let e = 0; e < s.length; e++) {
      if (s[e] !== 1) continue
      const root = find(edgeVerts[e][0])
      compEdges.set(root, (compEdges.get(root) ?? 0) + 1)
    }
    const compVerts = new Map<number, number>()
    for (let v = 0; v < vertEdges.length; v++) {
      if (!vertEdges[v].some(e => s[e] === 1)) continue
      const root = find(v)
      compVerts.set(root, (compVerts.get(root) ?? 0) + 1)
    }
    for (const [root, edges] of compEdges) {
      if (edges !== compVerts.get(root)) continue
      // 這一片已經圍成一圈：它必須就是全部的線
      if (edges !== totalLines) return false
      for (let e = 0; e < s.length; e++) {
        if (s[e] === 0) {
          s[e] = -1
          changed = true
        }
      }
    }
    for (let e = 0; e < s.length; e++) {
      if (s[e] !== 0) continue
      const [a, b] = edgeVerts[e]
      const ra = find(a)
      if (ra !== find(b) || !vertEdges[a].some(x => s[x] === 1)) continue
      if ((compEdges.get(ra) ?? 0) < totalLines) {
        s[e] = -1
        changed = true
      }
    }
  }
  return true
}

function isComplete(s: State): boolean {
  return !s.includes(0)
}

// 填完之後，必須剛好是一條迴路（propagate 已確保每點 0 或 2 條線、沒有提早圍圈）
function isSingleLoop(topo: Topology, s: State): boolean {
  return s.some(x => x === 1) && topo.vertEdges.every(es => {
    const n = es.filter(e => s[e] === 1).length
    return n === 0 || n === 2
  })
}

// 用人能做到的推理解題：普通只用基本規則；困難再加上「試填一條邊，看會不會立刻矛盾」
// 能解到底，就代表答案唯一（每一步推理都是必然成立的）
export function solveLogically(size: number, clues: (number | null)[], level: Level): number[] | null {
  const topo = topology(size)
  const s: State = new Int8Array(topo.edgeCount)
  for (;;) {
    if (!propagate(topo, clues, s)) return null
    if (isComplete(s)) return isSingleLoop(topo, s) ? Array.from(s, x => (x === 1 ? 1 : 0)) : null
    if (level === 'normal') return null

    let progress = false
    for (let e = 0; e < s.length && !progress; e++) {
      if (s[e] !== 0) continue
      for (const guess of [1, -1] as const) {
        const trial = s.slice()
        trial[e] = guess
        const ok = propagate(topo, clues, trial) && (!isComplete(trial) || isSingleLoop(topo, trial))
        if (!ok) {
          s[e] = guess === 1 ? -1 : 1
          progress = true
          break
        }
      }
    }
    if (!progress) return null
  }
}

// 從「每格都有數字」開始，隨機拿掉數字，只要還解得出來就拿掉
export function generatePuzzle(size: Size, level: Level): Puzzle {
  for (;;) {
    const solution = regionToSolution(size, randomRegion(size))
    const full = cluesFromSolution(size, solution)
    const clues: (number | null)[] = [...full]
    if (!solveLogically(size, clues, level)) continue
    for (const cell of shuffle(clues.map((_, i) => i))) {
      clues[cell] = null
      if (!solveLogically(size, clues, level)) clues[cell] = full[cell]
    }
    return { size, level, clues, solution }
  }
}

// ── 給畫面用的檢查 ───────────────────────────────────

export interface Problems {
  cells: Set<number>
  verts: Set<number>
}

// 玩家畫的線已經確定錯的地方：格子線太多或剩下的邊不夠湊；點連了 3 條以上，或走進死路
export function findProblems(size: number, clues: (number | null)[], marks: Mark[]): Problems {
  const topo = topology(size)
  const cells = new Set<number>()
  const verts = new Set<number>()
  topo.cellEdges.forEach((edges, cell) => {
    const k = clues[cell]
    if (k === null) return
    const lines = edges.filter(e => marks[e] === 1).length
    const open = edges.filter(e => marks[e] === 0).length
    if (lines > k || lines + open < k) cells.add(cell)
  })
  topo.vertEdges.forEach((edges, v) => {
    const lines = edges.filter(e => marks[e] === 1).length
    const open = edges.filter(e => marks[e] === 0).length
    if (lines > 2 || (lines === 1 && open === 0)) verts.add(v)
  })
  return { cells, verts }
}

export function isSolved(solution: number[], marks: Mark[]): boolean {
  return solution.every((x, e) => (x === 1) === (marks[e] === 1))
}

// 提示：先修正畫錯的邊，再補一條還沒畫的線
export function hintEdge(solution: number[], marks: Mark[]): number | null {
  const wrong = marks.findIndex((m, e) => (m === 1 && solution[e] === 0) || (m === 2 && solution[e] === 1))
  if (wrong >= 0) return wrong
  const missing = marks.findIndex((m, e) => m === 0 && solution[e] === 1)
  return missing >= 0 ? missing : null
}
