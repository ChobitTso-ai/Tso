// 無限出題 — 單元目錄、組卷與批改（純 TypeScript，不 import React）
import type { Blank, Chapter, Grade, Level, Question, Section } from './types'
import { GRADE3 } from './grade3'
import { GRADE5 } from './grade5'
import { gcd, hash, makeRng } from './util'

export const GRADES: Grade[] = [GRADE3, GRADE5]

/** 小節 → 所屬年級與章，依目錄順序排列 */
export const SECTION_INFO = new Map<string, { grade: Grade; chapter: Chapter; section: Section }>(
  GRADES.flatMap(grade =>
    grade.chapters.flatMap(chapter => chapter.sections.map(section => [section.id, { grade, chapter, section }] as const)),
  ),
)

export interface PaperGroup {
  section: Section
  questions: Question[]
}

/** 組卷：題數平均分給各小節（每節至少 1 題），同一個卷號永遠組出同一份卷 */
export function buildPaper(ids: string[], lv: Level, count: number, seed: number): PaperGroup[] {
  const secs = [...SECTION_INFO.values()].filter(x => ids.includes(x.section.id)).map(x => x.section)
  return secs.map((section, si) => {
    const n = Math.max(1, Math.floor(count / secs.length) + (si < count % secs.length ? 1 : 0))
    const seen = new Set<string>()
    const questions: Question[] = []
    for (let i = 0; i < n; i++) {
      // 同一節撞題就換種子重抽；組合少的小節試 20 次仍重複才保留
      for (let t = 0; ; t++) {
        const q = section.gen(makeRng(hash(`${section.id}|${seed}|${lv}|${i}|${t}`)), lv)
        const sig = q.text + JSON.stringify(q.fig ?? '')
        if (!seen.has(sig) || t >= 20) {
          seen.add(sig)
          questions.push(q)
          break
        }
      }
    }
    return { section, questions }
  })
}

/** 卷頭標題：同一章就寫章名，同年級多章寫「數學練習卷」 */
export function paperTitle(ids: string[]): string {
  const infos = ids.flatMap(id => SECTION_INFO.get(id) ?? [])
  if (infos.length === 0) return '數學練習卷'
  const grades = new Set(infos.map(x => x.grade))
  const chapters = new Set(infos.map(x => x.chapter))
  if (grades.size > 1) return '數學練習卷'
  return `${infos[0].grade.short} ${chapters.size === 1 ? `${infos[0].chapter.title} ` : '數學'}練習卷`
}

/** 線上作答的回覆：分數題是整數／分子／分母三格，其他都是一格文字 */
export type Reply = string | { w: string; n: string; d: string }

const FULLWIDTH = '０１２３４５６７８９'
const norm = (s: string) => s.trim().replace(/[０-９]/g, c => String(FULLWIDTH.indexOf(c)))

function toInt(s: string): number | null {
  const t = norm(s)
  return /^\d+$/.test(t) ? Number(t) : null
}

export function check(b: Blank, v: Reply | undefined): boolean {
  if (v === undefined) return false
  switch (b.kind) {
    case 'num':
      return typeof v === 'string' && toInt(v) === b.answer
    case 'choice':
      return v === b.answer
    case 'list': {
      if (typeof v !== 'string') return false
      const got = norm(v)
        .split(/[,，、\s]+/)
        .filter(Boolean)
        .map(toInt)
      if (got.some(x => x === null) || got.length !== b.answer.length) return false
      const sorted = (got as number[]).sort((x, y) => x - y)
      return sorted.every((x, i) => x === b.answer[i])
    }
    case 'frac': {
      if (typeof v === 'string') return false
      const w = v.w.trim() ? toInt(v.w) : 0
      if (w === null) return false
      if (!v.n.trim() && !v.d.trim()) return b.d === 1 && w === b.n
      const n = toInt(v.n)
      const d = toInt(v.d)
      if (n === null || d === null || n === 0 || d === 0) return false
      // 要最簡分數；寫成帶分數時，分數部分必須是真分數
      if (gcd(n, d) !== 1 || (w > 0 && n >= d)) return false
      return (w * d + n) * b.d === b.n * d
    }
  }
}

/** 非分數填空的答案文字（分數由畫面元件排成上下式） */
export function answerText(b: Exclude<Blank, { kind: 'frac' }>): string {
  if (b.kind === 'list') return b.answer.join('、')
  return String(b.answer)
}
