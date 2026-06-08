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
  while (opts.size < 4) {
    const delta = Math.floor(Math.random() * 10) - 5
    const candidate = answer + delta
    if (candidate !== answer && candidate >= range[0] && candidate <= range[1]) {
      opts.add(candidate)
    }
  }
  return shuffle([...opts])
}

// Alan: 九九乘法
export function generateAlanQuestion(level: 1 | 2): Question {
  const tables = level === 1 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9]
  const a = tables[Math.floor(Math.random() * tables.length)]
  const b = Math.floor(Math.random() * 9) + 1
  const answer = a * b
  return {
    question: `${a} × ${b} = ?`,
    answer,
    options: makeOptions(answer, [1, 81]),
  }
}

// Ryan T: 小學四五六年級
export function generateRyanQuestion(level: 1 | 2): Question {
  const type = Math.floor(Math.random() * (level === 1 ? 3 : 5))

  if (type === 0) {
    // 加減混合
    const a = Math.floor(Math.random() * 500) + 100
    const b = Math.floor(Math.random() * 300) + 50
    const c = Math.floor(Math.random() * 100) + 10
    const answer = a + b - c
    return { question: `${a} + ${b} - ${c} = ?`, answer, options: makeOptions(answer, [0, 900]) }
  }
  if (type === 1) {
    // 乘法
    const a = Math.floor(Math.random() * 20) + 10
    const b = Math.floor(Math.random() * 9) + 2
    const answer = a * b
    return { question: `${a} × ${b} = ?`, answer, options: makeOptions(answer, [20, 300]) }
  }
  if (type === 2) {
    // 除法（整除）
    const b = Math.floor(Math.random() * 8) + 2
    const answer = Math.floor(Math.random() * 20) + 5
    const a = b * answer
    return { question: `${a} ÷ ${b} = ?`, answer, options: makeOptions(answer, [2, 50]) }
  }
  if (type === 3) {
    // 小數加減
    const a = Math.round((Math.random() * 10 + 1) * 10) / 10
    const b = Math.round((Math.random() * 5 + 0.5) * 10) / 10
    const answer = Math.round((a + b) * 10) / 10
    return { question: `${a} + ${b} = ?`, answer, options: makeOptions(answer, [1, 20]) }
  }
  // 分數比大小 → 轉為計算題
  const denom = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)]
  const num1 = Math.floor(Math.random() * (denom - 1)) + 1
  const num2 = Math.floor(Math.random() * (denom - 1)) + 1
  const answer = num1 + num2
  return {
    question: `${num1}/${denom} 的分子 + ${num2}/${denom} 的分子 = ?`,
    answer,
    options: makeOptions(answer, [1, 20]),
  }
}

export type CharacterId = 'alan' | 'ryan'

export function getQuestion(char: CharacterId, level: 1 | 2): Question {
  return char === 'alan' ? generateAlanQuestion(level) : generateRyanQuestion(level)
}
