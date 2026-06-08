export interface Question {
  question: string
  answer: number
  options: number[]
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
  let attempts = 0
  while (opts.size < 4 && attempts < 100) {
    attempts++
    const delta = Math.floor(Math.random() * 12) - 6
    const candidate = answer + delta
    if (candidate !== answer && candidate >= range[0] && candidate <= range[1]) {
      opts.add(candidate)
    }
  }
  // 保底：補齊選項
  let fallback = range[0]
  while (opts.size < 4) { if (!opts.has(fallback)) opts.add(fallback); fallback++ }
  return shuffle([...opts])
}

// Alan: 九九乘法
function generateAlanQuestion(level: 1 | 2 | 3): Question {
  if (level === 3) {
    // 多位數乘法（兩位數 × 一位數）
    const a = Math.floor(Math.random() * 14) + 12  // 12-25
    const b = Math.floor(Math.random() * 8) + 2    // 2-9
    const answer = a * b
    return { question: `${a} × ${b} = ?`, answer, options: makeOptions(answer, [24, 250]) }
  }
  const tables = level === 1 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9]
  const a = tables[Math.floor(Math.random() * tables.length)]
  const b = Math.floor(Math.random() * 9) + 1
  const answer = a * b
  return { question: `${a} × ${b} = ?`, answer, options: makeOptions(answer, [1, 81]) }
}

// Ryan T: 小學四五六年級
function generateRyanQuestion(level: 1 | 2 | 3): Question {
  const typeCount = level === 1 ? 3 : level === 2 ? 5 : 4
  const type = Math.floor(Math.random() * typeCount)

  if (level === 3) {
    if (type === 0) {
      // 百分比
      const bases = [20, 30, 40, 50, 60, 80, 100]
      const pcts = [10, 20, 25, 50]
      const base = bases[Math.floor(Math.random() * bases.length)]
      const pct = pcts[Math.floor(Math.random() * pcts.length)]
      const answer = (base * pct) / 100
      return { question: `${base} 的 ${pct}% = ?`, answer, options: makeOptions(answer, [1, 80]) }
    }
    if (type === 1) {
      // 長方形面積
      const w = Math.floor(Math.random() * 10) + 4
      const h = Math.floor(Math.random() * 8) + 3
      const answer = w * h
      return { question: `長方形 長${w} 寬${h}，面積 = ?`, answer, options: makeOptions(answer, [12, 130]) }
    }
    if (type === 2) {
      // 平均數（三數整除）
      const avg = Math.floor(Math.random() * 20) + 10
      const d1 = Math.floor(Math.random() * 5) - 2
      const d2 = Math.floor(Math.random() * 5) - 2
      const nums = [avg + d1, avg + d2, avg - d1 - d2]
      const answer = Math.round(nums.reduce((a, b) => a + b, 0) / 3)
      return {
        question: `(${nums[0]} + ${nums[1]} + ${nums[2]}) ÷ 3 = ?`,
        answer,
        options: makeOptions(answer, [5, 40]),
      }
    }
    // 速度（distance = speed × time）
    const speed = Math.floor(Math.random() * 8) + 3
    const time = Math.floor(Math.random() * 5) + 2
    const answer = speed * time
    return {
      question: `時速 ${speed} 公里，走 ${time} 小時 = ? 公里`,
      answer,
      options: makeOptions(answer, [6, 80]),
    }
  }

  if (type === 0) {
    const a = Math.floor(Math.random() * 500) + 100
    const b = Math.floor(Math.random() * 300) + 50
    const c = Math.floor(Math.random() * 100) + 10
    const answer = a + b - c
    return { question: `${a} + ${b} - ${c} = ?`, answer, options: makeOptions(answer, [0, 900]) }
  }
  if (type === 1) {
    const a = Math.floor(Math.random() * 20) + 10
    const b = Math.floor(Math.random() * 9) + 2
    const answer = a * b
    return { question: `${a} × ${b} = ?`, answer, options: makeOptions(answer, [20, 300]) }
  }
  if (type === 2) {
    const b = Math.floor(Math.random() * 8) + 2
    const answer = Math.floor(Math.random() * 20) + 5
    const a = b * answer
    return { question: `${a} ÷ ${b} = ?`, answer, options: makeOptions(answer, [2, 50]) }
  }
  if (type === 3) {
    const a = Math.round((Math.random() * 10 + 1) * 10) / 10
    const b = Math.round((Math.random() * 5 + 0.5) * 10) / 10
    const answer = Math.round((a + b) * 10) / 10
    return { question: `${a} + ${b} = ?`, answer, options: makeOptions(answer, [1, 20]) }
  }
  const denom = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)]
  const num1 = Math.floor(Math.random() * (denom - 1)) + 1
  const num2 = Math.floor(Math.random() * (denom - 1)) + 1
  const answer = num1 + num2
  return {
    question: `${num1}/${denom} + ${num2}/${denom} 的分子和 = ?`,
    answer,
    options: makeOptions(answer, [1, 20]),
  }
}

export type CharacterId = 'alan' | 'ryan'

export function getQuestion(char: CharacterId, level: 1 | 2 | 3): Question {
  return char === 'alan' ? generateAlanQuestion(level) : generateRyanQuestion(level)
}
