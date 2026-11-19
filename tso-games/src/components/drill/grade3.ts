// 無限出題 — 三年級上學期（Alan）：毫米、乘法、除法
import type { Grade, Rng } from './types'
import { cmp, num } from './util'

/** 毫米數寫成「幾公分幾毫米」，整公分或不到 1 公分時省略另一個單位 */
const len = (mm: number) =>
  mm % 10 === 0 ? `${mm / 10} 公分` : mm < 10 ? `${mm} 毫米` : `${Math.floor(mm / 10)} 公分 ${mm % 10} 毫米`

/** 毫米數寫成「幾公尺幾公分幾毫米」，是 0 的單位省略 */
function lenM(mm: number): string {
  const parts: string[] = []
  if (mm >= 1000) parts.push(`${Math.floor(mm / 1000)} 公尺`)
  if (Math.floor(mm / 10) % 100) parts.push(`${Math.floor(mm / 10) % 100} 公分`)
  if (mm % 10) parts.push(`${mm % 10} 毫米`)
  return parts.join(' ')
}

const mcm = (mm: number) => [num(Math.floor(mm / 1000)), num(Math.floor(mm / 10) % 100), num(mm % 10)]

/** 三位數除以一位數的商（被除數 100–999）；三成是商的中間有 0（如 624 ÷ 6 = 104），最容易漏寫 0 */
function quot3(r: Rng, b: number, rem: number): number {
  const hi = Math.floor((999 - rem) / b)
  if (hi >= 101 && r.chance(0.3)) {
    for (;;) {
      const q = r.int(1, Math.floor(hi / 100)) * 100 + r.int(1, 9)
      if (q <= hi) return q
    }
  }
  return r.int(Math.ceil((100 - rem) / b), hi)
}

const ITEMS = [
  ['盒', '枝', '色鉛筆'],
  ['包', '張', '貼紙'],
  ['袋', '顆', '彈珠'],
  ['箱', '瓶', '牛奶'],
] as const

export const GRADE3: Grade = {
  id: 'g3',
  short: '三上',
  label: '三年級上學期',
  who: 'Alan',
  chapters: [
    {
      title: '毫米',
      sections: [
        {
          id: 'g3-mm-1',
          title: '看尺量長度',
          gen: (r, lv) => {
            // 挑戰：紙條不從 0 開始，要用「終點 − 起點」
            const from = lv === 3 ? r.int(10, 39) : 0
            const mm = lv === 1 ? r.int(10, 59) : lv === 2 ? r.int(11, 99) : r.int(11, 69)
            return {
              text: '紙條長 [?] 公分 [?] 毫米。',
              blanks: [num(Math.floor(mm / 10)), num(mm % 10)],
              fig: { from, to: from + mm },
              sol: from ? `${len(from + mm)} − ${len(from)} = ${len(mm)}` : undefined,
            }
          },
        },
        {
          id: 'g3-mm-2',
          title: '公分和毫米的換算',
          gen: (r, lv) => {
            const mm = lv === 1 ? r.int(21, 99) : lv === 2 ? r.int(21, 300) : r.int(100, 999)
            const k = r.int(0, 2)
            if (k === 0) return { text: `${len(mm)} = [?] 毫米`, blanks: [num(mm)] }
            if (k === 1) {
              return {
                text: `${mm} 毫米 = [?] 公分 [?] 毫米`,
                blanks: [num(Math.floor(mm / 10)), num(mm % 10)],
              }
            }
            // 比大小：只差一點點的兩個長度，最容易看錯單位
            const other = r.chance(0.2) ? mm : mm + r.pick([-11, -10, -9, -1, 1, 9, 10, 11])
            return r.chance(0.5)
              ? { text: `${len(mm)} [?] ${other} 毫米`, blanks: [cmp(mm, other)] }
              : { text: `${other} 毫米 [?] ${len(mm)}`, blanks: [cmp(other, mm)] }
          },
        },
        {
          id: 'g3-mm-3',
          title: '公分和毫米的加減',
          gen: (r, lv) => {
            // 基礎不進位、不退位；挑戰一定要進位或退位，一半是應用題
            for (;;) {
              const add = r.chance(0.5)
              let a = r.int(11, lv === 3 ? 199 : 99)
              let b = r.int(11, lv === 1 ? 49 : 99)
              if (!add && a < b) [a, b] = [b, a]
              const regroup = add ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10
              const ans = add ? a + b : a - b
              if (ans < 10 || (lv === 1 && regroup) || (lv === 3 && !regroup)) continue
              const blanks = [num(Math.floor(ans / 10)), num(ans % 10)]
              const sol = `換成毫米：${a} ${add ? '+' : '−'} ${b} = ${ans}，${ans} 毫米 = ${len(ans)}`
              if (lv === 3 && r.chance(0.5)) {
                return {
                  text: add
                    ? `紅緞帶長 ${len(a)}，藍緞帶長 ${len(b)}，兩條接起來共長 [?] 公分 [?] 毫米。`
                    : `一條緞帶長 ${len(a)}，剪掉 ${len(b)} 後，還剩下 [?] 公分 [?] 毫米。`,
                  blanks,
                  sol,
                  work: true,
                }
              }
              return { text: `${len(a)} ${add ? '+' : '−'} ${len(b)} = [?] 公分 [?] 毫米`, blanks, sol }
            }
          },
        },
        {
          id: 'g3-mm-4',
          title: '公尺、公分和毫米',
          note: '1 公尺 = 100 公分 = 1000 毫米',
          gen: (r, lv) => {
            if (lv === 1) {
              const n = r.int(1, 9)
              return r.pick([
                { text: `${n} 公尺 = [?] 公分`, blanks: [num(n * 100)] },
                { text: `${n} 公尺 = [?] 毫米`, blanks: [num(n * 1000)] },
                { text: `${n * 100} 公分 = [?] 公尺`, blanks: [num(n)] },
                { text: `${n * 1000} 毫米 = [?] 公尺`, blanks: [num(n)] },
              ])
            }
            if (lv === 2) {
              // 複名數的化聚
              const k = r.int(0, 2)
              if (k === 2) {
                const cm = r.int(1, 9) * 100 + r.int(1, 99)
                return r.chance(0.5)
                  ? { text: `${lenM(cm * 10)} = [?] 公分`, blanks: [num(cm)] }
                  : { text: `${cm} 公分 = [?] 公尺 [?] 公分`, blanks: [num(Math.floor(cm / 100)), num(cm % 100)] }
              }
              const mm = r.int(1, 9) * 1000 + r.int(0, 99) * 10 + r.int(0, 9)
              return k === 0
                ? { text: `${lenM(mm)} = [?] 毫米`, blanks: [num(mm)] }
                : { text: `${mm} 毫米 = [?] 公尺 [?] 公分 [?] 毫米`, blanks: mcm(mm) }
            }
            // 挑戰：複名數加減，一定要跨單位進位或退位，一半是應用題
            for (;;) {
              const add = r.chance(0.5)
              let a = r.int(1, 5) * 1000 + r.int(0, 99) * 10 + r.int(0, 9)
              let b = r.int(0, 3) * 1000 + r.int(0, 99) * 10 + r.int(1, 9)
              if (!add && a < b) [a, b] = [b, a]
              const cmA = Math.floor(a / 10) % 100
              const cmB = Math.floor(b / 10) % 100
              const regroup = add
                ? (a % 10) + (b % 10) >= 10 || cmA + cmB >= 100
                : a % 10 < b % 10 || cmA < cmB
              const ans = add ? a + b : a - b
              if (ans < 1000 || !regroup) continue
              const sol = `換成毫米：${a} ${add ? '+' : '−'} ${b} = ${ans}，${ans} 毫米 = ${lenM(ans)}`
              if (r.chance(0.5)) {
                return {
                  text: add
                    ? `一條繩子長 ${lenM(a)}，再接上 ${lenM(b)}，共長 [?] 公尺 [?] 公分 [?] 毫米。`
                    : `一捲緞帶長 ${lenM(a)}，用掉 ${lenM(b)} 後，還剩下 [?] 公尺 [?] 公分 [?] 毫米。`,
                  blanks: mcm(ans),
                  sol,
                  work: true,
                }
              }
              return {
                text: `${lenM(a)} ${add ? '+' : '−'} ${lenM(b)} = [?] 公尺 [?] 公分 [?] 毫米`,
                blanks: mcm(ans),
                sol,
                work: true,
              }
            }
          },
        },
      ],
    },
    {
      title: '乘法',
      sections: [
        {
          id: 'g3-mul-1',
          title: '二位數乘以一位數',
          gen: (r, lv) => {
            for (;;) {
              const a = r.int(11, 99)
              const b = r.int(2, 9)
              const unitsCarry = (a % 10) * b >= 10
              // 基礎完全不進位；挑戰個位要進位、積是三位數
              if (lv === 1 && (unitsCarry || a * b >= 100)) continue
              if (lv === 3 && (!unitsCarry || a * b < 100)) continue
              return { text: `用直式計算：${a} × ${b} = [?]`, blanks: [num(a * b)], work: true }
            }
          },
        },
        {
          id: 'g3-mul-2',
          title: '三位數乘以一位數',
          gen: (r, lv) => {
            for (;;) {
              // 挑戰有一半是十位為 0 的數（如 407），最容易漏掉進位
              const a = lv === 3 && r.chance(0.5) ? r.int(1, 9) * 100 + r.int(1, 9) : r.int(100, 999)
              const b = r.int(2, 9)
              if (lv === 1 && String(a).split('').some(x => Number(x) * b >= 10)) continue
              if (lv === 3 && a * b < 1000) continue
              return { text: `用直式計算：${a} × ${b} = [?]`, blanks: [num(a * b)], work: true }
            }
          },
        },
        {
          id: 'g3-mul-3',
          title: '乘法應用題',
          gen: (r, lv) => {
            if (lv === 3) {
              // 兩步驟：先乘再減
              if (r.chance(0.5)) {
                const n = r.int(2, 9)
                const price = r.int(25, Math.floor(999 / n))
                const pay = price * n
                return {
                  text: `一張門票 ${price} 元，買 ${n} 張，付 1000 元，可以找回 [?] 元。`,
                  blanks: [num(1000 - pay)],
                  sol: `${price} × ${n} = ${pay}，1000 − ${pay} = ${1000 - pay}`,
                  work: true,
                }
              }
              const seats = r.int(12, 45)
              const rows = r.int(3, 9)
              const sat = r.int(10, seats * rows - 1)
              return {
                text: `禮堂每排有 ${seats} 個座位，共有 ${rows} 排，已經坐了 ${sat} 人，還有 [?] 個空位。`,
                blanks: [num(seats * rows - sat)],
                sol: `${seats} × ${rows} = ${seats * rows}，${seats * rows} − ${sat} = ${seats * rows - sat}`,
                work: true,
              }
            }
            const [box, mw, thing] = r.pick(ITEMS)
            const each = lv === 1 ? r.int(11, 40) : r.int(12, 250)
            const n = lv === 1 ? r.int(2, 4) : r.int(2, 9)
            return {
              text: `每${box}有 ${each} ${mw}${thing}，${n} ${box}共有 [?] ${mw}。`,
              blanks: [num(each * n)],
              sol: `${each} × ${n} = ${each * n}`,
              work: true,
            }
          },
        },
      ],
    },
    {
      title: '除法',
      sections: [
        {
          id: 'g3-div-1',
          title: '整除的除法',
          gen: (r, lv) => {
            const b = r.int(2, 9)
            if (lv === 1) {
              const q = r.int(2, 9)
              return { text: `${b * q} ÷ ${b} = [?]`, blanks: [num(q)] }
            }
            if (lv === 2) {
              const q = r.int(10, Math.floor(99 / b))
              return { text: `用直式計算：${b * q} ÷ ${b} = [?]`, blanks: [num(q)], work: true }
            }
            // 挑戰：三位數除以一位數，或反過來用「除數 × 商 = 被除數」找被除數、除數
            const t = r.int(0, 2)
            if (t === 0) {
              const q = quot3(r, b, 0)
              return { text: `用直式計算：${b * q} ÷ ${b} = [?]`, blanks: [num(q)], work: true }
            }
            const q = r.int(10, Math.floor(99 / b))
            return t === 1
              ? { text: `[?] ÷ ${b} = ${q}`, blanks: [num(b * q)], sol: `${b} × ${q} = ${b * q}` }
              : { text: `${b * q} ÷ [?] = ${q}`, blanks: [num(b)], sol: `${b} × ${q} = ${b * q}` }
          },
        },
        {
          id: 'g3-div-2',
          title: '有餘數的除法',
          note: '餘數要比除數小',
          gen: (r, lv) => {
            const b = r.int(2, 9)
            const rem = r.int(1, b - 1)
            if (lv === 3 && r.chance(0.5)) {
              const q = r.int(10, Math.floor((99 - rem) / b))
              const a = b * q + rem
              return { text: `[?] ÷ ${b} = ${q} … ${rem}`, blanks: [num(a)], sol: `${b} × ${q} + ${rem} = ${a}` }
            }
            // 挑戰的直式是三位數除以一位數
            const q = lv === 1 ? r.int(1, 9) : lv === 2 ? r.int(10, Math.floor((99 - rem) / b)) : quot3(r, b, rem)
            const a = b * q + rem
            return {
              text: `${lv === 1 ? '' : '用直式計算：'}${a} ÷ ${b} = [?] … [?]`,
              blanks: [num(q), num(rem)],
              work: lv > 1,
            }
          },
        },
        {
          id: 'g3-div-3',
          title: '除法應用題',
          gen: (r, lv) => {
            const b = r.int(3, 9)
            if (lv === 1) {
              const q = r.int(2, 9)
              return {
                text: `有 ${b * q} 顆糖果，平分給 ${b} 人，每人分到 [?] 顆。`,
                blanks: [num(q)],
                sol: `${b * q} ÷ ${b} = ${q}`,
                work: true,
              }
            }
            const rem = r.int(1, b - 1)
            const q = r.int(2, Math.floor((99 - rem) / b))
            const a = b * q + rem
            if (lv === 2) {
              return {
                text: `有 ${a} 顆糖果，每人分 ${b} 顆，可以分給 [?] 人，還剩下 [?] 顆。`,
                blanks: [num(q), num(rem)],
                sol: `${a} ÷ ${b} = ${q} … ${rem}`,
                work: true,
              }
            }
            // 挑戰：有餘數時要判斷「多加 1」還是「捨去」
            return r.chance(0.5)
              ? {
                  text: `有 ${a} 位同學要搭車，每輛車最多坐 ${b} 人，至少需要 [?] 輛車。`,
                  blanks: [num(q + 1)],
                  sol: `${a} ÷ ${b} = ${q} … ${rem}，剩下的 ${rem} 人還要 1 輛，${q} + 1 = ${q + 1}`,
                  work: true,
                }
              : {
                  text: `一條繩子長 ${a} 公分，每 ${b} 公分剪成一段，最多可以剪成 [?] 段。`,
                  blanks: [num(q)],
                  sol: `${a} ÷ ${b} = ${q} … ${rem}，剩下的 ${rem} 公分不夠一段`,
                  work: true,
                }
          },
        },
      ],
    },
  ],
}
