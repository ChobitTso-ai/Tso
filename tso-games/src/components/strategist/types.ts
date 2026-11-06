// 軍師戰棋 — 型別定義

export type Side = 'player' | 'enemy'
export type UnitType = 'spear' | 'archer' | 'cavalry' | 'shield'
export type Terrain = 'grass' | 'forest' | 'water' | 'bridge'
export type TacticId = 'fire' | 'rally' | 'confuse'
export type Stance = 'advance' | 'hold'
export type Phase = 'levels' | 'deploy' | 'battle' | 'result'

/** 戰場大小（格） */
export const MAP_W = 16
export const MAP_H = 10
/** 我軍只能佈陣在最左邊這幾行 */
export const DEPLOY_COLS = 5

export interface UnitStats {
  name: string
  char: string
  troops: number
  atk: number
  def: number
  speed: number // 格／秒
  range: number // 格，近戰約 1
  cooldown: number // 秒
  desc: string
}

export interface General {
  name: string
  char: string
  atk: number // 攻擊倍率
  def: number // 額外減傷
}

export interface SquadSpec {
  type: UnitType
  general?: string
  commander?: boolean
}

export interface EnemySpec extends SquadSpec {
  x: number // 格座標（整數）
  y: number
  stance?: Stance
}

export interface Level {
  name: string
  story: string
  hint: string
  map: string[] // MAP_H 列、每列 MAP_W 字：. 草地、T 樹林、~ 河、= 橋
  roster: SquadSpec[]
  enemies: EnemySpec[]
  tactics: TacticId[]
  timeLimit: number // 秒
}

export interface Placement {
  rosterIdx: number
  x: number
  y: number
  stance: Stance
}

export interface Squad {
  id: number
  side: Side
  type: UnitType
  general?: string
  commander: boolean
  troops: number
  maxTroops: number
  x: number // 格座標（連續值，格中心為 .5）
  y: number
  stance: Stance
  targetId: number | null
  cooldown: number
  moved: number // 上次攻擊後走了多遠，騎兵衝鋒用
  facing: 1 | -1
  moving: boolean
  stunUntil: number
  burnUntil: number
  alive: boolean
}

export type EndReason = 'commander' | 'wiped' | 'timeout' | 'retreat'

export interface Battle {
  time: number
  timeLimit: number
  squads: Squad[]
  grid: Terrain[][]
  rallyUntil: number
  used: TacticId[]
  result: 'ongoing' | 'won' | 'lost'
  endReason: EndReason | null
  initial: Record<Side, number>
}

export type BattleEvent =
  | { kind: 'arrow'; x0: number; y0: number; x1: number; y1: number }
  | { kind: 'hit'; x: number; y: number }
  | { kind: 'charge'; x: number; y: number }
  | { kind: 'rout'; x: number; y: number; side: Side; label: string }
  | { kind: 'fire'; x: number; y: number; r: number }
  | { kind: 'confuse'; x: number; y: number; r: number }
  | { kind: 'rally' }

export interface Progress {
  stars: number[]
}
