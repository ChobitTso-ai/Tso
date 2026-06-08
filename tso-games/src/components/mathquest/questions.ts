export interface Question {
  question: string
  answer: number
  options: number[]
  hint: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeOptions(answer: number, range: [number, number]): number[] {
  const opts = new Set<number>([answer])
  let tries = 0
  while (opts.size < 4 && tries++ < 200) {
    const delta = Math.floor(Math.random() * 14) - 7
    const c = answer + delta
    if (c !== answer && c >= range[0] && c <= range[1]) opts.add(c)
  }
  let fb = range[0]
  while (opts.size < 4) { if (!opts.has(fb)) opts.add(fb); fb++ }
  return shuffle([...opts])
}

// Alan: 九九乘法 + 多位數
function generateAlanQuestion(level: 1 | 2 | 3, sub = 0): Question {
  if (level === 3) {
    const a = Math.floor(Math.random() * (14 + sub * 4)) + 12
    const b = Math.floor(Math.random() * (8 + sub)) + 2
    const answer = a * b
    return {
      question: `${a} × ${b} = ?`,
      answer,
      options: makeOptions(answer, [24, 350]),
      hint: `${a} × ${b}：先算 ${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b}，再加 ${a % 10} × ${b} = ${(a % 10) * b}，合計 ${answer}`,
    }
  }
  const tables = level === 1
    ? [1, 2, 3, 4, 5].slice(0, 5 - Math.min(2, sub))
    : [6, 7, 8, 9]
  const a = tables[Math.floor(Math.random() * tables.length)]
  const b = Math.floor(Math.random() * 9) + 1
  const answer = a * b
  const items = Array.from({ length: a }, () => `${b}`).join('+')
  return {
    question: `${a} × ${b} = ?`,
    answer,
    options: makeOptions(answer, [1, 81]),
    hint: `${a} 個 ${b} 相加：${items.length > 20 ? `${a}×${b}` : items} = ${answer}`,
  }
}

// Ryan T: 小學四五六年級
function generateRyanQuestion(level: 1 | 2 | 3, sub = 0): Question {
  const typeCount = level === 1 ? 3 : level === 2 ? 5 : 4
  const type = Math.floor(Math.random() * typeCount)
  const boost = sub * 50  // 自適應加大數字

  if (level === 3) {
    if (type === 0) {
      const bases = [20, 30, 40, 50, 60, 80, 100]
      const pcts  = [10, 20, 25, 50]
      const base  = bases[Math.floor(Math.random() * bases.length)]
      const pct   = pcts[Math.floor(Math.random() * pcts.length)]
      const answer = (base * pct) / 100
      return {
        question: `${base} 的 ${pct}% = ?`,
        answer,
        options: makeOptions(answer, [1, 80]),
        hint: `${base} × ${pct} ÷ 100 = ${base * pct} ÷ 100 = ${answer}`,
      }
    }
    if (type === 1) {
      const w = Math.floor(Math.random() * (10 + sub)) + 4
      const h = Math.floor(Math.random() * (8 + sub)) + 3
      const answer = w * h
      return {
        question: `長方形 長${w} 寬${h}，面積 = ?`,
        answer,
        options: makeOptions(answer, [12, 180]),
        hint: `面積 = 長 × 寬 = ${w} × ${h} = ${answer}`,
      }
    }
    if (type === 2) {
      const avg = Math.floor(Math.random() * 20) + 10
      const d1 = Math.floor(Math.random() * 4) - 2
      const d2 = Math.floor(Math.random() * 4) - 2
      const nums = [avg + d1, avg + d2, avg - d1 - d2]
      const sum = nums.reduce((a, b) => a + b, 0)
      const answer = Math.round(sum / 3)
      return {
        question: `(${nums[0]}+${nums[1]}+${nums[2]}) ÷ 3 = ?`,
        answer,
        options: makeOptions(answer, [5, 40]),
        hint: `先加總：${nums[0]}+${nums[1]}+${nums[2]} = ${sum}，再除以 3：${sum}÷3 = ${answer}`,
      }
    }
    const speed = Math.floor(Math.random() * 8) + 3
    const time  = Math.floor(Math.random() * 5) + 2
    const answer = speed * time
    return {
      question: `時速 ${speed} 公里，走 ${time} 小時 = ? 公里`,
      answer,
      options: makeOptions(answer, [6, 80]),
      hint: `距離 = 時速 × 時間 = ${speed} × ${time} = ${answer} 公里`,
    }
  }

  if (type === 0) {
    const a = Math.floor(Math.random() * (500 + boost)) + 100
    const b = Math.floor(Math.random() * (300 + boost)) + 50
    const c = Math.floor(Math.random() * 100) + 10
    const answer = a + b - c
    return {
      question: `${a} + ${b} - ${c} = ?`,
      answer,
      options: makeOptions(answer, [0, 1200]),
      hint: `先加：${a}+${b} = ${a + b}，再減：${a + b}-${c} = ${answer}`,
    }
  }
  if (type === 1) {
    const a = Math.floor(Math.random() * (20 + sub * 5)) + 10
    const b = Math.floor(Math.random() * 9) + 2
    const answer = a * b
    return {
      question: `${a} × ${b} = ?`,
      answer,
      options: makeOptions(answer, [20, 400]),
      hint: `${a} × ${b}：先算 ${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b}，加 ${a % 10} × ${b} = ${(a % 10) * b}`,
    }
  }
  if (type === 2) {
    const b = Math.floor(Math.random() * 8) + 2
    const answer = Math.floor(Math.random() * (20 + sub * 5)) + 5
    const a = b * answer
    return {
      question: `${a} ÷ ${b} = ?`,
      answer,
      options: makeOptions(answer, [2, 80]),
      hint: `想想：幾個 ${b} 合起來等於 ${a}？答案是 ${answer}`,
    }
  }
  if (type === 3) {
    const a = Math.round((Math.random() * (10 + sub) + 1) * 10) / 10
    const b = Math.round((Math.random() * 5 + 0.5) * 10) / 10
    const answer = Math.round((a + b) * 10) / 10
    return {
      question: `${a} + ${b} = ?`,
      answer,
      options: makeOptions(answer, [1, 30]),
      hint: `小數相加：整數部分 ${Math.floor(a)}+${Math.floor(b)}，小數部分 ${(a % 1).toFixed(1)}+${(b % 1).toFixed(1)}`,
    }
  }
  const denom = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)]
  const n1 = Math.floor(Math.random() * (denom - 1)) + 1
  const n2 = Math.floor(Math.random() * (denom - 1)) + 1
  const answer = n1 + n2
  return {
    question: `${n1}/${denom} + ${n2}/${denom} 的分子和 = ?`,
    answer,
    options: makeOptions(answer, [1, 20]),
    hint: `同分母相加：分母不變，分子相加 ${n1}+${n2} = ${answer}`,
  }
}

export type CharacterId = 'alan' | 'ryan'

export function getQuestion(char: CharacterId, level: 1 | 2 | 3, subDifficulty = 0): Question {
  return char === 'alan'
    ? generateAlanQuestion(level, subDifficulty)
    : generateRyanQuestion(level, subDifficulty)
}
