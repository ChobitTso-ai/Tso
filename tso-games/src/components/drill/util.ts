// 無限出題 — 亂數、數學工具與填空建構（純函式）
import type { Blank, Rng } from './types'

/** 字串雜湊（FNV-1a）：把「小節|卷號|難度|第幾題」變成亂數種子 */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 可重現的亂數（mulberry32）：同一個卷號永遠出同一份卷，題目卷和答案卷才對得起來 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(next() * arr.length)]
    },
    chance: p => next() < p,
  }
}

export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b

export function factors(n: number): number[] {
  const out: number[] = []
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i)
  return out
}

/** 分數寫成題幹記號：整數直接寫，大於 1 寫成帶分數 {1 3/4} */
export function fracTok(n: number, d: number): string {
  const g = gcd(n, d)
  n /= g
  d /= g
  if (d === 1) return String(n)
  const w = Math.floor(n / d)
  return w ? `{${w} ${n % d}/${d}}` : `{${n}/${d}}`
}

export const num = (answer: number): Blank => ({ kind: 'num', answer })
export const list = (answer: number[]): Blank => ({ kind: 'list', answer })
export const choice = (answer: string, options: string[]): Blank => ({ kind: 'choice', answer, options })
export const cmp = (a: number, b: number): Blank => choice(a > b ? '>' : a < b ? '<' : '=', ['>', '<', '='])

export function frac(n: number, d: number): Blank {
  const g = gcd(n, d)
  return { kind: 'frac', n: n / g, d: d / g }
}
