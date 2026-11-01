// 無限出題 — 五年級上學期（Ryan）：因數與倍數、擴分約分與通分、異分母分數的加減
import type { Grade, Level, Rng } from './types'
import { choice, cmp, factors, frac, fracTok, gcd, lcm, list, num } from './util'

/** 挑兩個不同的分母：基礎是倍數關係（如 3 和 6）；挑戰的最小公分母不是兩數相乘（如 6 和 8 → 24） */
function pairDen(r: Rng, lv: Level): [number, number] {
  for (;;) {
    let b: number
    let d: number
    if (lv === 1) {
      b = r.int(2, 6)
      d = b * r.int(2, 3)
    } else {
      b = r.int(2, lv === 2 ? 10 : 12)
      d = r.int(2, lv === 2 ? 10 : 12)
      if (b === d || b % d === 0 || d % b === 0 || lcm(b, d) > (lv === 2 ? 40 : 72)) continue
      if (lv === 3 && gcd(b, d) === 1) continue
    }
    return r.chance(0.5) ? [b, d] : [d, b]
  }
}

/** 分母是 d 的最簡真分數的分子 */
function coprimeNum(r: Rng, d: number): number {
  for (;;) {
    const n = r.int(1, d - 1)
    if (gcd(n, d) === 1) return n
  }
}

const mixed = (w: number, n: number, d: number) => (w ? `{${w} ${n}/${d}}` : `{${n}/${d}}`)

const SIMPLEST = '答案要約成最簡分數，寫成假分數或帶分數都可以'

export const GRADE5: Grade = {
  id: 'g5',
  short: '五上',
  label: '五年級上學期',
  who: 'Ryan',
  chapters: [
    {
      title: '因數與倍數',
      sections: [
        {
          id: 'g5-fm-1',
          title: '因數和倍數',
          gen: (r, lv) => {
            if (r.chance(0.6)) {
              const n = lv === 1 ? r.int(6, 30) : lv === 2 ? r.int(24, 60) : r.int(48, 100)
              return { text: `寫出 ${n} 的所有因數：[?]`, blanks: [list(factors(n))] }
            }
            const a = r.int(lv === 1 ? 2 : 3, lv === 3 ? 15 : 9)
            const k = r.int(3, lv === 1 ? 12 : 20)
            const m = r.chance(0.5) ? a * k : a * k + r.int(1, a - 1)
            return {
              text: `${m} 是不是 ${a} 的倍數？[?]`,
              blanks: [choice(m % a === 0 ? '是' : '不是', ['是', '不是'])],
              sol: m % a === 0 ? `${m} ÷ ${a} = ${m / a}，整除` : `${m} ÷ ${a} = ${Math.floor(m / a)} … ${m % a}，不整除`,
            }
          },
        },
        {
          id: 'g5-fm-2',
          title: '公因數與最大公因數',
          gen: (r, lv) => {
            const max = lv === 1 ? 30 : lv === 2 ? 60 : 100
            let a: number
            let b: number
            do {
              a = r.int(6, max)
              b = r.int(6, max)
            } while (a === b || gcd(a, b) === 1)
            const g = gcd(a, b)
            if (lv === 3 && r.chance(0.5)) {
              return {
                text: `一張長方形紙長 ${Math.max(a, b)} 公分、寬 ${Math.min(a, b)} 公分，要剪成大小一樣的正方形而且沒有剩下，正方形的邊長最長是 [?] 公分。`,
                blanks: [num(g)],
                sol: `${a} 和 ${b} 的最大公因數是 ${g}`,
                work: true,
              }
            }
            if (lv > 1 && r.chance(0.4)) {
              return { text: `寫出 ${a} 和 ${b} 的所有公因數：[?]`, blanks: [list(factors(g))] }
            }
            return { text: `${a} 和 ${b} 的最大公因數是 [?]`, blanks: [num(g)] }
          },
        },
        {
          id: 'g5-fm-3',
          title: '公倍數與最小公倍數',
          gen: (r, lv) => {
            let a: number
            let b: number
            do {
              a = r.int(2, lv === 1 ? 10 : 20)
              b = r.int(2, lv === 1 ? 10 : 20)
            } while (a === b || (lv > 1 && (a % b === 0 || b % a === 0)) || lcm(a, b) > (lv === 1 ? 60 : 120))
            const l = lcm(a, b)
            if (lv === 3 && r.chance(0.5)) {
              return {
                text: `甲公車每 ${a} 分鐘發一班，乙公車每 ${b} 分鐘發一班。兩班車剛剛同時發車，至少再過 [?] 分鐘會再同時發車。`,
                blanks: [num(l)],
                sol: `${a} 和 ${b} 的最小公倍數是 ${l}`,
                work: true,
              }
            }
            if (lv > 1 && r.chance(0.4)) {
              const k = r.int(2, 3)
              // 上限不取公倍數本身，避免「小於」「以內」的邊界爭議
              const lim = l * k + r.int(1, l - 1)
              return {
                text: `寫出 ${a} 和 ${b} 的公倍數中，所有小於 ${lim} 的數：[?]`,
                blanks: [list(Array.from({ length: k }, (_, i) => l * (i + 1)))],
              }
            }
            return { text: `${a} 和 ${b} 的最小公倍數是 [?]`, blanks: [num(l)] }
          },
        },
      ],
    },
    {
      title: '擴分、約分與通分',
      sections: [
        {
          id: 'g5-fr-1',
          title: '擴分與約分',
          gen: (r, lv) => {
            const d = r.int(2, lv === 1 ? 6 : lv === 2 ? 10 : 12)
            const n = coprimeNum(r, d)
            const k = r.int(2, lv === 1 ? 4 : lv === 2 ? 6 : 9)
            const t = r.int(0, 2)
            if (t === 0) {
              return r.chance(0.5)
                ? { text: `擴分：{${n}/${d}} = {[?]/${d * k}}`, blanks: [num(n * k)] }
                : { text: `擴分：{${n}/${d}} = {${n * k}/[?]}`, blanks: [num(d * k)] }
            }
            if (t === 1) return { text: `約分：{${n * k}/${d * k}} = {[?]/${d}}`, blanks: [num(n)] }
            return {
              text: `把 {${n * k}/${d * k}} 約成最簡分數：[?]`,
              blanks: [frac(n, d)],
              sol: `分子和分母同除以最大公因數 ${k}`,
            }
          },
        },
        {
          id: 'g5-fr-2',
          title: '通分與比較大小',
          gen: (r, lv) => {
            const [b, d] = pairDen(r, lv)
            const a = coprimeNum(r, b)
            const c = coprimeNum(r, d)
            const l = lcm(b, d)
            if (r.chance(0.5)) {
              return {
                text: `用最小公分母通分：{${a}/${b}} = {[?]/[?]}，{${c}/${d}} = {[?]/[?]}`,
                blanks: [num((a * l) / b), num(l), num((c * l) / d), num(l)],
              }
            }
            return {
              text: `比較大小：{${a}/${b}} [?] {${c}/${d}}`,
              blanks: [cmp(a * d, c * b)],
              sol: `通分：{${(a * l) / b}/${l}}、{${(c * l) / d}/${l}}`,
            }
          },
        },
      ],
    },
    {
      title: '異分母分數的加減',
      sections: [
        {
          id: 'g5-as-1',
          title: '真分數的加減',
          note: SIMPLEST,
          gen: (r, lv) => {
            for (;;) {
              const [b, d] = pairDen(r, lv)
              const a = coprimeNum(r, b)
              const c = coprimeNum(r, d)
              const add = r.chance(0.5)
              const l = lcm(b, d)
              const x = (a * l) / b
              const y = (c * l) / d
              const top = add ? x + y : x - y
              // 減法要大減小；基礎的和不超過 1
              if (top <= 0 || (lv === 1 && top >= l)) continue
              const ans = fracTok(top, l)
              const raw = `{${top}/${l}}`
              return {
                text: `{${a}/${b}} ${add ? '+' : '−'} {${c}/${d}} = [?]`,
                blanks: [frac(top, l)],
                sol: `{${x}/${l}} ${add ? '+' : '−'} {${y}/${l}} = ${raw}${ans === raw ? '' : ` = ${ans}`}`,
              }
            }
          },
        },
        {
          id: 'g5-as-2',
          title: '帶分數的加減',
          note: SIMPLEST,
          gen: (r, lv) => {
            for (;;) {
              const [b, d] = pairDen(r, lv)
              const a = coprimeNum(r, b)
              const c = coprimeNum(r, d)
              const w1 = r.int(1, 5)
              const w2 = r.int(1, 4)
              const add = r.chance(0.5)
              const l = lcm(b, d)
              const x = (a * l) / b
              const y = (c * l) / d
              // 分數部分相加滿 1 要進位、不夠減要借 1
              const regroup = add ? x + y >= l : x < y
              const top = (w1 * l + x) + (add ? 1 : -1) * (w2 * l + y)
              if (top <= 0 || (lv === 1 && regroup) || (lv === 3 && !regroup)) continue
              return {
                text: `${mixed(w1, a, b)} ${add ? '+' : '−'} ${mixed(w2, c, d)} = [?]`,
                blanks: [frac(top, l)],
                sol: `${mixed(w1, x, l)} ${add ? '+' : '−'} ${mixed(w2, y, l)} = ${fracTok(top, l)}`,
                work: true,
              }
            }
          },
        },
        {
          id: 'g5-as-3',
          title: '分數加減應用題',
          note: SIMPLEST,
          gen: (r, lv) => {
            for (;;) {
              const [b, d] = pairDen(r, lv)
              const a = coprimeNum(r, b)
              const c = coprimeNum(r, d)
              // 挑戰用帶分數
              const w1 = lv === 3 ? r.int(1, 3) : 0
              const w2 = lv === 3 ? r.int(0, 2) : 0
              const add = r.chance(0.5)
              const l = lcm(b, d)
              const p = mixed(w1, a, b)
              const q = mixed(w2, c, d)
              const top = (w1 * l + (a * l) / b) + (add ? 1 : -1) * (w2 * l + (c * l) / d)
              if (top <= 0) continue
              const text = add
                ? r.pick([
                    `哥哥喝了 ${p} 公升果汁，妹妹喝了 ${q} 公升果汁，兩人一共喝了 [?] 公升。`,
                    `上午走了 ${p} 公里，下午走了 ${q} 公里，一共走了 [?] 公里。`,
                  ])
                : r.pick([
                    `一瓶果汁有 ${p} 公升，喝掉 ${q} 公升後，還剩下 [?] 公升。`,
                    `紅桶有 ${p} 公升水，藍桶有 ${q} 公升水，紅桶比藍桶多 [?] 公升。`,
                  ])
              return {
                text,
                blanks: [frac(top, l)],
                sol: `${p} ${add ? '+' : '−'} ${q} = ${fracTok(top, l)}`,
                work: true,
              }
            }
          },
        },
      ],
    },
  ],
}
