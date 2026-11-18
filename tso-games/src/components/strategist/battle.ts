// 軍師戰棋 — 戰鬥模擬（純 TypeScript，不依賴 React）
import { COUNTER, GENERALS, LEVELS, TACTICS, UNIT_STATS, maxTroopsOf, shortName } from './data'
import type {
  Battle, BattleEvent, EndReason, Level, Placement, Side, SquadSpec, Squad, Stance, TacticId, Terrain,
} from './types'
import { DEPLOY_COLS, MAP_H, MAP_W } from './types'

/** 固定時間步長，倍速與跳過都只是一次多跑幾步，結果完全相同 */
export const STEP = 0.05

const SEPARATION = 0.8 // 兩隊中心至少相距這麼遠，避免疊在一起
const HOLD_TRIGGER = 3 // 固守的部隊在敵軍靠近到這個距離內才出擊
const CHARGE_DIST = 2
const CHARGE_MULT = 1.8
const FOREST_SPEED = 0.6
const FOREST_ARROW = 0.6 // 樹林能擋箭
const ARCHER_MELEE = 0.5 // 弓兵被近身只能短兵相接
const RALLY_MULT = 1.35
const RALLY_TIME = 10
const CONFUSE_TIME = 5
const FIRE_DAMAGE = 15
const BURN_DPS = 5
const BURN_TIME = 4
const FIRE_FOREST = 1.5

const TERRAIN_CHARS: Record<string, Terrain> = { '.': 'grass', T: 'forest', '~': 'water', '=': 'bridge' }

export function parseMap(map: string[]): Terrain[][] {
  return map.map(row => [...row].map(c => TERRAIN_CHARS[c] ?? 'grass'))
}

export const passable = (grid: Terrain[][], tx: number, ty: number) =>
  tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H && grid[ty][tx] !== 'water'

const terrainUnder = (grid: Terrain[][], s: { x: number; y: number }) =>
  grid[Math.floor(s.y)]?.[Math.floor(s.x)] ?? 'grass'

export const canDeploy = (grid: Terrain[][], tx: number, ty: number) => tx < DEPLOY_COLS && passable(grid, tx, ty)

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

function makeSquad(id: number, side: Side, spec: SquadSpec, tx: number, ty: number, stance: Stance): Squad {
  const troops = maxTroopsOf(spec)
  return {
    id, side, type: spec.type, general: spec.general, commander: spec.commander === true,
    troops, maxTroops: troops, x: tx + 0.5, y: ty + 0.5, stance,
    targetId: null, cooldown: 0, moved: 0, facing: side === 'player' ? 1 : -1, moving: false,
    stunUntil: 0, burnUntil: 0, alive: true,
  }
}

export function sumTroops(squads: Squad[], side: Side) {
  return squads.reduce((a, s) => a + (s.side === side && s.alive ? s.troops : 0), 0)
}

/** 我軍 id 等於 rosterIdx，介面靠這點對應佈陣卡片與戰場上的部隊 */
export function createBattle(level: Level, placements: Placement[]): Battle {
  const squads: Squad[] = []
  const placed = new Map(placements.map(p => [p.rosterIdx, p]))
  level.roster.forEach((spec, i) => {
    const p = placed.get(i)
    const sq = makeSquad(i, 'player', spec, p?.x ?? 0, p?.y ?? 0, p?.stance ?? 'advance')
    sq.alive = p !== undefined
    squads.push(sq)
  })
  level.enemies.forEach(e => squads.push(makeSquad(squads.length, 'enemy', e, e.x, e.y, e.stance ?? 'advance')))
  return {
    time: 0,
    timeLimit: level.timeLimit,
    squads,
    grid: parseMap(level.map),
    rallyUntil: 0,
    used: [],
    result: 'ongoing',
    endReason: null,
    initial: { player: sumTroops(squads, 'player'), enemy: sumTroops(squads, 'enemy') },
  }
}

// ── 尋路：以格子做 BFS，八方向、不可斜穿河岸 ──────────────────

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]

interface Field {
  start: number
  dist: Int16Array
  parent: Int16Array
}

// 地圖不會變，同一格出發的尋路結果整場都能重用
const fieldCache = new WeakMap<Terrain[][], Map<number, Field>>()

function fieldFrom(grid: Terrain[][], s: Squad): Field {
  let cache = fieldCache.get(grid)
  if (!cache) {
    cache = new Map()
    fieldCache.set(grid, cache)
  }
  const k = tileIdx(s)
  let field = cache.get(k)
  if (!field) {
    field = bfs(grid, Math.floor(s.x), Math.floor(s.y))
    cache.set(k, field)
  }
  return field
}

function bfs(grid: Terrain[][], sx: number, sy: number): Field {
  const n = MAP_W * MAP_H
  const d = new Int16Array(n).fill(-1)
  const parent = new Int16Array(n).fill(-1)
  const start = sy * MAP_W + sx
  const queue = [start]
  d[start] = 0
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi]
    const cx = cur % MAP_W
    const cy = (cur - cx) / MAP_W
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (!passable(grid, nx, ny)) continue
      if (dx !== 0 && dy !== 0 && (!passable(grid, cx + dx, cy) || !passable(grid, cx, cy + dy))) continue
      const k = ny * MAP_W + nx
      if (d[k] !== -1) continue
      d[k] = d[cur] + 1
      parent[k] = cur
      queue.push(k)
    }
  }
  return { start, dist: d, parent }
}

const tileIdx = (s: { x: number; y: number }) => Math.floor(s.y) * MAP_W + Math.floor(s.x)

function lineClear(grid: Terrain[][], x0: number, y0: number, x1: number, y1: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.2)
  for (let i = 1; i <= n; i++) {
    const t = i / n
    if (!passable(grid, Math.floor(x0 + (x1 - x0) * t), Math.floor(y0 + (y1 - y0) * t))) return false
  }
  return true
}

/** 沿 BFS 路徑找最遠、可以直線走到的格子中心 */
function waypoint(grid: Terrain[][], s: Squad, target: Squad, field: Field): [number, number] | null {
  let k = tileIdx(target)
  if (field.dist[k] < 0) return null
  const path: number[] = []
  while (k !== field.start && k >= 0) {
    path.push(k)
    k = field.parent[k]
  }
  path.reverse()
  let best = path[0]
  for (const p of path) {
    const px = (p % MAP_W) + 0.5
    const py = Math.floor(p / MAP_W) + 0.5
    if (!lineClear(grid, s.x, s.y, px, py)) break
    best = p
  }
  return [(best % MAP_W) + 0.5, Math.floor(best / MAP_W) + 0.5]
}

// ── 戰鬥 ──────────────────────────────────────────

function pickTarget(s: Squad, foes: Squad[], field: Field): Squad | null {
  const st = UNIT_STATS[s.type]
  const ranged = st.range > 1.5
  let best: Squad | null = null
  let bestScore = Infinity
  for (const o of foes) {
    const e = dist(s, o)
    let score: number
    if (ranged && e <= st.range) score = e - 10 // 射程內的優先，不用再走
    else {
      const pd = field.dist[tileIdx(o)]
      if (pd < 0) continue
      score = pd
    }
    if ((COUNTER[s.type][o.type] ?? 1) > 1) score -= 1.5
    if (o.id === s.targetId) score -= 1 // 不要每一步都換目標
    if (score < bestScore) {
      bestScore = score
      best = o
    }
  }
  return best
}

function damage(b: Battle, t: Squad, amount: number, ev: BattleEvent[]) {
  if (!t.alive) return
  t.troops -= amount
  if (t.troops > 0) return
  t.troops = 0
  t.alive = false
  ev.push({ kind: 'rout', x: t.x, y: t.y, side: t.side, label: shortName(t) })
  for (const s of b.squads) if (s.targetId === t.id) s.targetId = null
}

function attack(b: Battle, s: Squad, t: Squad, d: number, ev: BattleEvent[]) {
  const st = UNIT_STATS[s.type]
  let dmg = st.atk * (0.4 + 0.6 * (s.troops / s.maxTroops)) // 兵越少打越輕
  dmg *= COUNTER[s.type][t.type] ?? 1
  if (s.general) dmg *= GENERALS[s.general].atk
  if (s.side === 'player' && b.rallyUntil > b.time) dmg *= RALLY_MULT
  if (st.range > 1.5) {
    if (d < 1.2) dmg *= ARCHER_MELEE
    else if (terrainUnder(b.grid, t) === 'forest') dmg *= FOREST_ARROW
    ev.push({ kind: 'arrow', x0: s.x, y0: s.y, x1: t.x, y1: t.y })
  } else {
    if (s.type === 'cavalry' && s.moved >= CHARGE_DIST) {
      dmg *= CHARGE_MULT
      ev.push({ kind: 'charge', x: s.x, y: s.y })
    }
    ev.push({ kind: 'hit', x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 })
  }
  dmg *= 1 - UNIT_STATS[t.type].def - (t.general ? GENERALS[t.general].def : 0)
  s.moved = 0
  s.cooldown = st.cooldown
  damage(b, t, dmg, ev)
}

function moveToward(b: Battle, s: Squad, t: Squad, field: Field) {
  const st = UNIT_STATS[s.type]
  let gx = t.x
  let gy = t.y
  // 直走時停在射程邊緣，不要一路撞進目標
  let stopAt = st.range * 0.85
  if (!lineClear(b.grid, s.x, s.y, gx, gy)) {
    const wp = waypoint(b.grid, s, t, field)
    if (!wp) return
    ;[gx, gy] = wp
    stopAt = 0
  }
  const dx = gx - s.x
  const dy = gy - s.y
  const len = Math.hypot(dx, dy)
  const speed = st.speed * (terrainUnder(b.grid, s) === 'forest' ? FOREST_SPEED : 1)
  const stepLen = Math.min(speed * STEP, len - stopAt)
  if (stepLen <= 1e-4) return
  const nx = s.x + (dx / len) * stepLen
  const ny = s.y + (dy / len) * stepLen
  if (!passable(b.grid, Math.floor(nx), Math.floor(ny))) return
  s.x = nx
  s.y = ny
  s.moved += stepLen
  s.moving = true
  if (Math.abs(dx) > 0.05) s.facing = dx > 0 ? 1 : -1
}

function separate(b: Battle) {
  const alive = b.squads.filter(s => s.alive)
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]
      const c = alive[j]
      let dx = c.x - a.x
      let dy = c.y - a.y
      let d = Math.hypot(dx, dy)
      if (d >= SEPARATION) continue
      if (d < 1e-4) {
        dx = 0
        dy = 1
        d = 1e-4
      }
      const push = (SEPARATION - d) / 2
      nudge(b, a, (-dx / d) * push, (-dy / d) * push)
      nudge(b, c, (dx / d) * push, (dy / d) * push)
    }
  }
}

function nudge(b: Battle, s: Squad, dx: number, dy: number) {
  const nx = Math.min(MAP_W - 0.3, Math.max(0.3, s.x + dx))
  const ny = Math.min(MAP_H - 0.3, Math.max(0.3, s.y + dy))
  if (passable(b.grid, Math.floor(nx), Math.floor(ny))) {
    s.x = nx
    s.y = ny
  } else if (passable(b.grid, Math.floor(nx), Math.floor(s.y))) {
    s.x = nx
  } else if (passable(b.grid, Math.floor(s.x), Math.floor(ny))) {
    s.y = ny
  }
}

function end(b: Battle, result: 'won' | 'lost', reason: EndReason) {
  b.result = result
  b.endReason = reason
}

function checkEnd(b: Battle) {
  const lostCommander = (side: Side) => b.squads.some(s => s.side === side && s.commander && !s.alive)
  const wiped = (side: Side) => !b.squads.some(s => s.side === side && s.alive)
  if (lostCommander('player')) end(b, 'lost', 'commander')
  else if (wiped('player')) end(b, 'lost', 'wiped')
  else if (lostCommander('enemy')) end(b, 'won', 'commander')
  else if (wiped('enemy')) end(b, 'won', 'wiped')
  else if (b.time >= b.timeLimit) {
    const mine = sumTroops(b.squads, 'player') / b.initial.player
    const theirs = sumTroops(b.squads, 'enemy') / b.initial.enemy
    end(b, mine > theirs ? 'won' : 'lost', 'timeout')
  }
}

export function stepBattle(b: Battle): BattleEvent[] {
  const ev: BattleEvent[] = []
  if (b.result !== 'ongoing') return ev
  b.time += STEP
  for (const s of b.squads) {
    if (!s.alive) continue
    s.moving = false
    if (s.burnUntil > b.time) {
      damage(b, s, BURN_DPS * STEP * (terrainUnder(b.grid, s) === 'forest' ? FIRE_FOREST : 1), ev)
      if (!s.alive) continue
    }
    s.cooldown = Math.max(0, s.cooldown - STEP)
    if (s.stunUntil > b.time) continue
    const foes = b.squads.filter(o => o.alive && o.side !== s.side)
    if (foes.length === 0) continue
    if (s.stance === 'hold' && foes.some(o => dist(s, o) <= HOLD_TRIGGER)) s.stance = 'advance'
    const field = fieldFrom(b.grid, s)
    const target = pickTarget(s, foes, field)
    s.targetId = target?.id ?? null
    if (!target) continue
    const d = dist(s, target)
    if (d <= UNIT_STATS[s.type].range) {
      s.facing = target.x >= s.x ? 1 : -1
      if (s.cooldown <= 0) attack(b, s, target, d, ev)
    } else if (s.stance === 'advance') {
      moveToward(b, s, target, field)
    }
  }
  separate(b)
  checkEnd(b)
  return ev
}

export function castTactic(b: Battle, id: TacticId, x: number, y: number): BattleEvent[] {
  const ev: BattleEvent[] = []
  if (b.result !== 'ongoing' || b.used.includes(id)) return ev
  b.used = [...b.used, id]
  if (id === 'rally') {
    b.rallyUntil = b.time + RALLY_TIME
    ev.push({ kind: 'rally' })
    return ev
  }
  const r = TACTICS[id].radius
  ev.push({ kind: id, x, y, r })
  // 部隊佔將近一格，邊緣碰到範圍也算中
  const hit = b.squads.filter(s => s.alive && s.side === 'enemy' && Math.hypot(s.x - x, s.y - y) <= r + 0.3)
  for (const s of hit) {
    if (id === 'fire') {
      s.burnUntil = b.time + BURN_TIME
      damage(b, s, FIRE_DAMAGE * (terrainUnder(b.grid, s) === 'forest' ? FIRE_FOREST : 1), ev)
    } else {
      s.stunUntil = b.time + CONFUSE_TIME
    }
  }
  checkEnd(b)
  return ev
}

export function retreat(b: Battle) {
  if (b.result === 'ongoing') end(b, 'lost', 'retreat')
}

/** 跳過：直接算到分出勝負 */
export function runToEnd(b: Battle) {
  while (b.result === 'ongoing') stepBattle(b)
}

export const survivalRatio = (b: Battle) => sumTroops(b.squads, 'player') / b.initial.player

export function starsFor(b: Battle) {
  if (b.result !== 'won') return 0
  const r = survivalRatio(b)
  return r >= 0.5 ? 3 : r >= 0.25 ? 2 : 1
}

// ── 佈陣 ──────────────────────────────────────────

/** 主帥預設坐鎮後方，免得一開戰就衝上前線被擊破 */
export const defaultStance = (spec: SquadSpec): Stance => (spec.commander ? 'hold' : 'advance')

const MIDDLE_OUT = [4, 5, 3, 6, 2, 7, 1, 8, 0, 9]
const OUTSIDE_IN = [1, 8, 2, 7, 3, 6, 0, 9, 4, 5]

/** 一鍵佈陣：只是個起點，玩家可以再調整 */
export function autoDeploy(levelIdx: number): Placement[] {
  const level = LEVELS[levelIdx]
  const grid = parseMap(level.map)
  const taken = new Set<number>()
  const pick = (cols: number[], rows: number[]) => {
    for (const x of cols)
      for (const y of rows)
        if (canDeploy(grid, x, y) && !taken.has(y * MAP_W + x)) {
          taken.add(y * MAP_W + x)
          return [x, y]
        }
    return null
  }
  const order = level.roster
    .map((spec, i) => ({ spec, i }))
    .sort((a, b) => Number(b.spec.commander === true) - Number(a.spec.commander === true))
  const placements: Placement[] = []
  for (const { spec, i } of order) {
    let spot: number[] | null
    if (spec.commander) spot = pick([0, 1], MIDDLE_OUT)
    else if (spec.type === 'cavalry') spot = pick([3, 4, 2], OUTSIDE_IN)
    else if (spec.type === 'archer') spot = pick([2, 1, 3], MIDDLE_OUT)
    else spot = pick([4, 3, 2], MIDDLE_OUT)
    if (spot) placements.push({ rosterIdx: i, x: spot[0], y: spot[1], stance: defaultStance(spec) })
  }
  return placements
}
