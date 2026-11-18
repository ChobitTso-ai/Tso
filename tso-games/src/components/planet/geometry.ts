// 遊戲星球的幾何：球面座標、旋轉、群島排列。純 TypeScript，不 import React。
import type { Archipelago, PlanetGame } from './data'

/** 單位球面上的點；y 朝上、z 朝向觀看者 */
export type Vec3 = [number, number, number]

export interface Isle {
  archId: string
  color: string
  center: Vec3
  /** null 是裝飾用小島，沒有連結 */
  game: PlanetGame | null
  /** 主島比較大，地標也畫大一點 */
  main: boolean
  /** 由外到內：淺灘、沙灘、陸地、高地；建好後只需投影，不必每幀重算 */
  layers: [Vec3[], Vec3[], Vec3[], Vec3[]]
}

export type GameIsle = Isle & { game: PlanetGame }

export interface PlanetScene {
  groups: { arch: Archipelago; center: Vec3 }[]
  isles: Isle[]
}

export interface Angles {
  yaw: number
  pitch: number
}

const DEG = Math.PI / 180
const TAU = Math.PI * 2
const LAYER_SCALES = [1.4, 1.14, 1, 0.5] as const
const OUTLINE_POINTS = 28

export function fromLatLon(lat: number, lon: number): Vec3 {
  const la = lat * DEG
  const lo = lon * DEG
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]
}

/** 先繞 y 軸轉 yaw、再繞 x 軸轉 pitch，得到觀看座標（z > 0 是朝向觀看者的半球） */
export function toView(p: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const x = p[0] * cy + p[2] * sy
  const z = p[2] * cy - p[0] * sy
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  return [x, p[1] * cp - z * sp, p[1] * sp + z * cp]
}

/** 讓球面上某一點轉到正前方所需的角度 */
export function anglesFacing(p: Vec3): Angles {
  return { yaw: -Math.atan2(p[0], p[2]), pitch: Math.asin(p[1]) }
}

/** 目前最靠正面的群島，清單用它標出「現在看到的是哪一區」 */
export function frontArchId(scene: PlanetScene, a: Angles): string {
  let best = ''
  let bestDepth = -2
  for (const g of scene.groups) {
    const depth = toView(g.center, a.yaw, a.pitch)[2]
    if (depth > bestDepth) {
      bestDepth = depth
      best = g.arch.id
    }
  }
  return best
}

/** 把角度差收在 -π..π，轉向時才會走近路 */
export function wrapAngle(a: number): number {
  return a - TAU * Math.round(a / TAU)
}

// xorshift32：同一個種子永遠排出同樣的島形
function seeded(seed: number): () => number {
  let s = seed || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

// 以群島 id 當種子，群島順序調整時島形也不會跟著變
function hashId(id: string): number {
  let h = 2166136261
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

const normalize = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2])
  return [v[0] / l, v[1] / l, v[2] / l]
}

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

// 球面上某點的兩個切線方向，用來往四周擺放東西
function tangents(c: Vec3): [Vec3, Vec3] {
  const helper: Vec3 = Math.abs(c[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]
  const u = normalize(cross(helper, c))
  return [u, cross(c, u)]
}

// 從 c 沿方位角 bearing 走 dist 弧度後的位置
function travel(c: Vec3, [u, v]: [Vec3, Vec3], dist: number, bearing: number): Vec3 {
  const s = Math.sin(dist)
  const k = Math.cos(dist)
  const cb = Math.cos(bearing)
  const sb = Math.sin(bearing)
  return [
    c[0] * k + (u[0] * cb + v[0] * sb) * s,
    c[1] * k + (u[1] * cb + v[1] * sb) * s,
    c[2] * k + (u[2] * cb + v[2] * sb) * s,
  ]
}

// 海岸線：幾個隨機半徑之間用餘弦內插，得到圓潤但不規則的輪廓
function makeIsle(
  center: Vec3,
  radius: number,
  rand: () => number,
  arch: Archipelago,
  game: PlanetGame | null,
  main: boolean,
): Isle {
  const frame = tangents(center)
  const knots = Array.from({ length: 7 }, () => 0.72 + rand() * 0.5)
  const radii = Array.from({ length: OUTLINE_POINTS }, (_, i) => {
    const t = (i / OUTLINE_POINTS) * knots.length
    const k = Math.floor(t)
    const f = (1 - Math.cos((t - k) * Math.PI)) / 2
    return knots[k] + (knots[(k + 1) % knots.length] - knots[k]) * f
  })
  const ring = (scale: number) =>
    radii.map((r, i) => travel(center, frame, radius * r * scale, (i / OUTLINE_POINTS) * TAU))
  const [a, b, c, d] = LAYER_SCALES
  return { archId: arch.id, color: arch.color, center, game, main, layers: [ring(a), ring(b), ring(c), ring(d)] }
}

export function buildScene(archs: Archipelago[]): PlanetScene {
  const groups = archs.map((arch, i) => ({
    arch,
    // 群島沿經度平均分布，南北交錯，轉一圈每座群島都會經過正面
    center: fromLatLon(i % 2 === 0 ? 16 : -16, (360 / archs.length) * i),
  }))
  const isles: Isle[] = []
  for (const { arch, center } of groups) {
    const rand = seeded(hashId(arch.id))
    const frame = tangents(center)
    // 方位角 0 是正東；從東邊開始排，兩座衛星島會左右分開，名牌才不會上下疊在一起
    const turn = (rand() - 0.5) * 0.5
    const others = arch.games.length - 1
    arch.games.forEach((game, j) => {
      // 排第一的遊戲在中央當主島，其餘圍成一圈
      const c = j === 0 ? center : travel(center, frame, 0.48, turn + ((j - 1) / others) * TAU)
      isles.push(makeIsle(c, j === 0 ? 0.2 : 0.13, rand, arch, game, j === 0))
    })
    // 裝飾小島：沒有連結，讓群島看起來比較自然
    for (let k = 0; k < 4; k++) {
      const c = travel(center, frame, 0.66 + rand() * 0.08, turn + 0.8 + k * 1.6 + rand() * 0.4)
      isles.push(makeIsle(c, 0.035 + rand() * 0.025, rand, arch, null, false))
    }
  }
  return { groups, isles }
}
