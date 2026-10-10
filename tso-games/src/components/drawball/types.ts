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
}

export interface Goal {
  x: number
  y: number
  w: number
  h: number
}

export interface Level {
  name: string
  hint: string
  start: Vec
  goal: Goal
  walls: Segment[]
  spikes: Segment[]
  inkLimit: number // 有限墨水模式下可畫的線總長（像素）
}

/** ready：可先畫線、球尚未放下；rolling：球滾動中仍可畫線 */
export type Phase = 'ready' | 'rolling' | 'won' | 'failed'

export type InkMode = 'limited' | 'unlimited'

export interface Progress {
  unlocked: number // 已解鎖的最高關卡索引（0 起算）
  inkMode: InkMode
}
