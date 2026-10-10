// 畫線滾球 — 型別定義

/** 畫布邏輯尺寸（實際顯示時依容器縮放） */
export const WORLD_W = 800
export const WORLD_H = 500

export interface Vec {
  x: number
  y: number
}

export interface Segment {
  a: Vec
  b: Vec
}

export interface Ball {
  pos: Vec
  vel: Vec
  done: boolean // 已進杯子，停止模擬
}

export interface Goal {
  x: number
  y: number
  w: number
  h: number
}

/** 會來回移動的木板或尖刺：位移 = sin(2πt / period) × (dx, dy) */
export interface Mover {
  seg: Segment
  kind: 'wall' | 'spike'
  dx: number
  dy: number
  period: number // 秒
}

export interface Level {
  name: string
  hint: string
  starts: Vec[] // 多顆球時每顆都要進杯子
  goal: Goal
  walls: Segment[]
  spikes: Segment[]
  springs?: Segment[]
  movers?: Mover[]
  par: number // 參考解法用掉的墨水（像素），星星門檻與墨水上限由此計算，見 scoring.ts
}

export interface Chapter {
  name: string
  icon: string
  levels: Level[]
}

/** ready：可先畫線、球尚未放下；rolling：球滾動中仍可畫線 */
export type Phase = 'ready' | 'rolling' | 'won' | 'failed'

export type FailReason = 'spike' | 'out' | 'stuck'

export type InkMode = 'limited' | 'unlimited'

export interface Progress {
  stars: number[] // 每關最佳星數，0 = 尚未過關
  inkMode: InkMode
  muted: boolean
}
