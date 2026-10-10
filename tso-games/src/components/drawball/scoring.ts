// 畫線滾球 — 星星評分與墨水上限（純 TS）
//
// par 是參考解法用掉的墨水。門檻刻意放寬，讓小朋友手畫歪歪的線也有機會拿三星：
//   ⭐⭐⭐：墨水 ≤ par × 1.5 + 100
//   ⭐⭐  ：墨水 ≤ par × 2.5 + 200
//   ⭐    ：過關就有
//   有限墨水上限 = par × 3 + 400
// 數值都進位到 50 的倍數，方便顯示。
import type { Level } from './types'

const up50 = (n: number) => Math.ceil(n / 50) * 50

export interface InkRules {
  star3: number
  star2: number
  limit: number
}

export function inkRules(level: Level): InkRules {
  return {
    star3: up50(level.par * 1.5 + 100),
    star2: up50(level.par * 2.5 + 200),
    limit: up50(level.par * 3 + 400),
  }
}

export function starsFor(level: Level, ink: number): number {
  const r = inkRules(level)
  if (ink <= r.star3) return 3
  if (ink <= r.star2) return 2
  return 1
}

/** 給小朋友看的墨水單位：1 點 = 10 像素長的線 */
export const toDots = (px: number) => Math.round(px / 10)
