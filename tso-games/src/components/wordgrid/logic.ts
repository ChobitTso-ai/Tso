// 方陣找找看：盤面產生、求解與計分（純 TypeScript，不 import React）

export type Mode = 'word' | 'math'
export type Size = 3 | 4 | 5
export type Difficulty = 'easy' | 'hard' | 'extreme'
export type Op = '+' | '−' | '×' | '÷'

export const SIZES: Size[] = [3, 4, 5]
export const OPS: Op[] = ['+', '−', '×', '÷']
export const PASS_RATIO: Record<Difficulty, number> = { easy: 0.3, hard: 0.6, extreme: 0.9 }
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: '簡單', hard: '困難', extreme: '極限' }
export const MODE_LABELS: Record<Mode, string> = { word: '🔤 英文單字', math: '🔢 數學算式' }

export const MIN_WORD_LETTERS = 3
export const MAX_MATH_NUMBERS = 4

export interface Solution {
  text: string     // 單字（小寫）或算式（例如 3+4×2）
  path: number[]   // 其中一種連法，看答案時用來標出位置
  points: number
  group: number    // 英文：字母數；數學：用了幾個數字
  common: boolean  // 英文：是否為常用字（只有常用字計入過關門檻）；數學一律 true
}

// ── 盤面幾何 ────────────────────────────────────────

export function isAdjacent(size: number, a: number, b: number): boolean {
  const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size))
  const dc = Math.abs((a % size) - (b % size))
  return a !== b && dr <= 1 && dc <= 1
}

function neighborList(size: number): number[][] {
  const list: number[][] = []
  for (let i = 0; i < size * size; i++) {
    list.push([])
    for (let j = 0; j < size * size; j++) if (isAdjacent(size, i, j)) list[i].push(j)
  }
  return list
}

// ── 英文單字 ────────────────────────────────────────

interface TrieNode {
  next: Map<string, TrieNode>
  kind: 0 | 1 | 2  // 0 不是單字、1 常用字、2 額外字
}

export interface Dictionary {
  root: TrieNode
}

export function buildDictionary(common: string, extra: string): Dictionary {
  const root: TrieNode = { next: new Map(), kind: 0 }
  const add = (word: string, kind: 1 | 2) => {
    let node = root
    for (const ch of word) {
      let child = node.next.get(ch)
      if (!child) {
        child = { next: new Map(), kind: 0 }
        node.next.set(ch, child)
      }
      node = child
    }
    if (node.kind === 0) node.kind = kind
  }
  for (const w of common.split(' ')) add(w, 1)
  for (const w of extra.split(' ')) add(w, 2)
  return { root }
}

// 3–4 個字母 1 分，越長越多（沿用找字遊戲常見的級距）
export function wordPoints(letters: number): number {
  if (letters <= 4) return 1
  if (letters === 5) return 2
  if (letters === 6) return 3
  if (letters === 7) return 5
  return 11
}

export function solveWords(tiles: string[], size: number, dict: Dictionary): Map<string, Solution> {
  const nbrs = neighborList(size)
  const found = new Map<string, Solution>()
  const used = new Array<boolean>(tiles.length).fill(false)
  const path: number[] = []

  const visit = (i: number, node: TrieNode, word: string) => {
    let cur: TrieNode | undefined = node
    for (const ch of tiles[i].toLowerCase()) {
      cur = cur.next.get(ch)
      if (!cur) return
    }
    const next = word + tiles[i].toLowerCase()
    used[i] = true
    path.push(i)
    if (cur.kind !== 0 && next.length >= MIN_WORD_LETTERS && !found.has(next)) {
      found.set(next, {
        text: next,
        path: [...path],
        points: wordPoints(next.length),
        group: Math.min(next.length, 8),
        common: cur.kind === 1,
      })
    }
    for (const n of nbrs[i]) if (!used[n]) visit(n, cur, next)
    used[i] = false
    path.pop()
  }

  for (let i = 0; i < tiles.length; i++) visit(i, dict.root, '')
  return found
}

// 依英文字母常見程度抽字母；不放 Q（它幾乎都要接 U，單獨出現很難拼出字）
const LETTER_WEIGHTS: [string, number][] = [
  ['E', 120], ['T', 90], ['A', 82], ['O', 75], ['I', 70], ['N', 67], ['S', 63], ['R', 60],
  ['H', 50], ['D', 43], ['L', 40], ['C', 28], ['U', 28], ['M', 24], ['W', 20], ['F', 22],
  ['G', 20], ['Y', 18], ['P', 19], ['B', 15], ['V', 10], ['K', 8], ['J', 2], ['X', 2],
  ['Z', 2],
]
const LETTER_TOTAL = LETTER_WEIGHTS.reduce((s, [, w]) => s + w, 0)
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

function randomLetter(): string {
  let r = Math.random() * LETTER_TOTAL
  for (const [letter, w] of LETTER_WEIGHTS) {
    r -= w
    if (r < 0) return letter
  }
  return 'E'
}

function randomLetters(count: number): string[] {
  for (;;) {
    const tiles = Array.from({ length: count }, randomLetter)
    const vowels = tiles.filter(t => VOWELS.has(t)).length
    // 母音太少拼不出字、太多又太單調
    if (vowels >= Math.ceil(count * 0.3) && vowels <= Math.ceil(count * 0.5)) return tiles
  }
}

// 每種大小至少要有幾個常用字，盤面才夠找
const MIN_COMMON_WORDS: Record<Size, number> = { 3: 8, 4: 30, 5: 60 }

export function generateWordTiles(size: Size, dict: Dictionary): string[] {
  let best: string[] = []
  let bestCount = -1
  for (let attempt = 0; attempt < 300; attempt++) {
    const tiles = randomLetters(size * size)
    let count = 0
    for (const s of solveWords(tiles, size, dict).values()) if (s.common) count++
    if (count >= MIN_COMMON_WORDS[size]) return tiles
    if (count > bestCount) {
      best = tiles
      bestCount = count
    }
  }
  return best
}

// ── 數學算式 ────────────────────────────────────────

// 先乘除後加減；除法必須整除，否則整條算式不成立
export function evaluate(nums: number[], ops: Op[]): number | null {
  let total = 0
  let sign = 1
  let term = nums[0]
  for (let k = 0; k < ops.length; k++) {
    const n = nums[k + 1]
    const op = ops[k]
    if (op === '×') term *= n
    else if (op === '÷') {
      if (term % n !== 0) return null
      term /= n
    } else {
      total += sign * term
      sign = op === '+' ? 1 : -1
      term = n
    }
  }
  return total + sign * term
}

export function expressionText(nums: number[], ops: Op[]): string {
  return nums.map((n, k) => (k === 0 ? `${n}` : `${ops[k - 1]}${n}`)).join('')
}

// 2 個數字 1 分、3 個 2 分、4 個 4 分
export function mathPoints(numbers: number): number {
  return numbers === 2 ? 1 : numbers === 3 ? 2 : 4
}

// 走遍所有 2–4 個相鄰數字的連法與所有運算組合，onExpr 收到每一條成立的算式
function forEachExpression(
  tiles: string[],
  size: number,
  onExpr: (value: number, nums: number[], ops: Op[], path: number[]) => void,
) {
  const nbrs = neighborList(size)
  const values = tiles.map(Number)
  const used = new Array<boolean>(tiles.length).fill(false)
  const path: number[] = []
  const nums: number[] = []
  const ops: Op[] = []

  const visit = (i: number) => {
    used[i] = true
    path.push(i)
    nums.push(values[i])
    if (nums.length >= 2) {
      const v = evaluate(nums, ops)
      if (v !== null) onExpr(v, nums, ops, path)
    }
    if (nums.length < MAX_MATH_NUMBERS) {
      for (const n of nbrs[i]) {
        if (used[n]) continue
        for (const op of OPS) {
          ops.push(op)
          visit(n)
          ops.pop()
        }
      }
    }
    used[i] = false
    path.pop()
    nums.pop()
  }

  for (let i = 0; i < tiles.length; i++) visit(i)
}

export function solveMath(tiles: string[], size: number, target: number): Map<string, Solution> {
  const found = new Map<string, Solution>()
  forEachExpression(tiles, size, (v, nums, ops, path) => {
    if (v !== target) return
    const text = expressionText(nums, ops)
    if (!found.has(text)) {
      found.set(text, { text, path: [...path], points: mathPoints(nums.length), group: nums.length, common: true })
    }
  })
  return found
}

// 目標數的範圍，以及這個目標在盤面上要有幾條算式（太少不夠找、太多找不完）
const TARGET_RANGE: Record<Size, [number, number]> = { 3: [5, 30], 4: [10, 40], 5: [10, 60] }
const TARGET_COUNT: Record<Size, [number, number]> = { 3: [8, 20], 4: [15, 35], 5: [25, 50] }

export function generateMathBoard(size: Size): { tiles: string[]; target: number } {
  const [lo, hi] = TARGET_RANGE[size]
  const [minCount, maxCount] = TARGET_COUNT[size]
  for (;;) {
    const tiles = Array.from({ length: size * size }, () => `${1 + Math.floor(Math.random() * 9)}`)
    const byValue = new Map<number, Set<string>>()
    forEachExpression(tiles, size, (v, nums, ops) => {
      if (v < lo || v > hi) return
      let set = byValue.get(v)
      if (!set) {
        set = new Set()
        byValue.set(v, set)
      }
      set.add(expressionText(nums, ops))
    })
    const candidates = [...byValue].filter(([, s]) => s.size >= minCount && s.size <= maxCount).map(([v]) => v)
    if (candidates.length > 0) {
      return { tiles, target: candidates[Math.floor(Math.random() * candidates.length)] }
    }
  }
}

// ── 計分 ────────────────────────────────────────────

export function totalPoints(solutions: Map<string, Solution>): number {
  let sum = 0
  for (const s of solutions.values()) if (s.common) sum += s.points
  return sum
}

export function passPoints(total: number, difficulty: Difficulty): number {
  return Math.max(1, Math.ceil(total * PASS_RATIO[difficulty]))
}
