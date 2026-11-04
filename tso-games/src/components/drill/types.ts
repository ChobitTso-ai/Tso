// 無限出題 — 型別定義

/** 難度：1 基礎、2 標準、3 挑戰 */
export type Level = 1 | 2 | 3

export interface Rng {
  int(lo: number, hi: number): number
  pick<T>(arr: readonly T[]): T
  chance(p: number): boolean
}

/** 填空：整數、分數（標準答案存成最簡假分數 n/d）、多選一、數字清單（如「寫出所有因數」） */
export type Blank =
  | { kind: 'num'; answer: number }
  | { kind: 'frac'; n: number; d: number }
  | { kind: 'choice'; answer: string; options: string[] }
  | { kind: 'list'; answer: number[] }

/** 看尺量長度的圖，單位是毫米 */
export interface RulerFig {
  from: number
  to: number
}

export interface Question {
  /** 題幹：[?] 是填空；{3/4}、{1 3/4} 是分數，分子分母也可以是 [?] */
  text: string
  blanks: Blank[]
  fig?: RulerFig
  /** 答案卷附的算式，寫法同題幹 */
  sol?: string
  /** 題目卷要留計算空間（直式、應用題） */
  work?: boolean
}

export type Generator = (r: Rng, lv: Level) => Question

export interface Section {
  id: string
  title: string
  /** 印在大題標題下的作答提醒 */
  note?: string
  gen: Generator
}

export interface Chapter {
  title: string
  sections: Section[]
}

export interface Grade {
  id: string
  /** 卷頭用的簡稱，如「三上」 */
  short: string
  label: string
  who: string
  chapters: Chapter[]
}
