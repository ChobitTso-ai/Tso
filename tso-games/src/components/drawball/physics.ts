// 畫線滾球 — 物理運算（純 TS，不依賴 React）
import type { Ball, FailReason, Goal, Level, Mover, Segment, Vec } from './types'
import { WORLD_H, WORLD_W } from './types'

export const BALL_R = 12
export const LINE_HALF = 3 // 線條半寬，碰撞時一併計入
const GRAVITY = 900 // px/s²
const MAX_SPEED = 900 // 限速避免穿牆：每個子步最多移動 3.75px，遠小於球半徑
const SUBSTEPS = 4
const BOUNCE = 0.2 // 低彈性，讓球貼著線滾而不是亂彈
const FRICTION = 0.9995
const SPRING_SPEED = 720 // 彈簧板把球彈出的速度
const STILL_SPEED = 8
const STUCK_SECONDS = 2.5

export interface World {
  balls: Ball[]
  time: number // 放球後經過的秒數，移動障礙依此計算位置
  stillTime: number
}

export interface StepEvents {
  result: 'ok' | 'won' | FailReason
  impact: number // 本幀最大撞擊速度，用於音效
  spring: boolean
  captured: boolean
}

export function createWorld(level: Level): World {
  return {
    balls: level.starts.map(s => ({ pos: { ...s }, vel: { x: 0, y: 0 }, done: false })),
    time: 0,
    stillTime: 0,
  }
}

export function segLength(s: Segment): number {
  return Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)
}

export function moverSeg(m: Mover, t: number): Segment {
  const k = Math.sin((2 * Math.PI * t) / m.period)
  const ox = m.dx * k
  const oy = m.dy * k
  return { a: { x: m.seg.a.x + ox, y: m.seg.a.y + oy }, b: { x: m.seg.b.x + ox, y: m.seg.b.y + oy } }
}

export function cupWalls(g: Goal): Segment[] {
  const bl = { x: g.x, y: g.y + g.h }
  const br = { x: g.x + g.w, y: g.y + g.h }
  return [
    { a: { x: g.x, y: g.y }, b: bl },
    { a: bl, b: br },
    { a: br, b: { x: g.x + g.w, y: g.y } },
  ]
}

export function distToSeg(p: Vec, s: Segment): number {
  const q = closestPoint(p, s)
  return Math.hypot(p.x - q.x, p.y - q.y)
}

function closestPoint(p: Vec, s: Segment): Vec {
  const dx = s.b.x - s.a.x
  const dy = s.b.y - s.a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return s.a
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2))
  return { x: s.a.x + t * dx, y: s.a.y + t * dy }
}

/** 回傳撞擊的法向速度（0 表示沒碰到） */
function collide(ball: Ball, s: Segment, spring: boolean): number {
  const q = closestPoint(ball.pos, s)
  const dx = ball.pos.x - q.x
  const dy = ball.pos.y - q.y
  const dist = Math.hypot(dx, dy)
  const minDist = BALL_R + LINE_HALF
  if (dist >= minDist || dist === 0) return 0
  const nx = dx / dist
  const ny = dy / dist
  ball.pos.x = q.x + nx * minDist
  ball.pos.y = q.y + ny * minDist
  const vn = ball.vel.x * nx + ball.vel.y * ny
  if (vn >= 0) return 0
  if (spring) {
    ball.vel.x += (-vn + SPRING_SPEED) * nx
    ball.vel.y += (-vn + SPRING_SPEED) * ny
    return SPRING_SPEED
  }
  ball.vel.x -= (1 + BOUNCE) * vn * nx
  ball.vel.y -= (1 + BOUNCE) * vn * ny
  ball.vel.x *= FRICTION
  ball.vel.y *= FRICTION
  return -vn
}

function collideBalls(a: Ball, b: Ball) {
  const dx = b.pos.x - a.pos.x
  const dy = b.pos.y - a.pos.y
  const dist = Math.hypot(dx, dy)
  if (dist >= BALL_R * 2 || dist === 0) return
  const nx = dx / dist
  const ny = dy / dist
  const overlap = BALL_R * 2 - dist
  // 已進杯的球不動，只推另一顆
  const wa = a.done ? 0 : b.done ? 1 : 0.5
  const wb = 1 - wa
  a.pos.x -= nx * overlap * wa
  a.pos.y -= ny * overlap * wa
  b.pos.x += nx * overlap * wb
  b.pos.y += ny * overlap * wb
  const rel = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny
  if (rel >= 0) return
  const j = -(1 + BOUNCE) * rel
  a.vel.x -= j * nx * wa
  a.vel.y -= j * ny * wa
  b.vel.x += j * nx * wb
  b.vel.y += j * ny * wb
}

/** 推進一個畫面（dt 秒） */
export function step(world: World, level: Level, strokes: Segment[], dt: number): StepEvents {
  const ev: StepEvents = { result: 'ok', impact: 0, spring: false, captured: false }
  const h = Math.min(dt, 1 / 30) / SUBSTEPS
  const goal = level.goal
  const springs = level.springs ?? []
  const movers = level.movers ?? []

  for (let i = 0; i < SUBSTEPS; i++) {
    world.time += h
    const moving = movers.map(m => ({ kind: m.kind, seg: moverSeg(m, world.time) }))
    const solids = [
      ...level.walls,
      ...cupWalls(goal),
      ...strokes,
      ...moving.filter(m => m.kind === 'wall').map(m => m.seg),
    ]
    const spikes = [...level.spikes, ...moving.filter(m => m.kind === 'spike').map(m => m.seg)]

    for (const ball of world.balls) {
      if (ball.done) continue
      ball.vel.y += GRAVITY * h
      const speed = Math.hypot(ball.vel.x, ball.vel.y)
      if (speed > MAX_SPEED) {
        ball.vel.x *= MAX_SPEED / speed
        ball.vel.y *= MAX_SPEED / speed
      }
      ball.pos.x += ball.vel.x * h
      ball.pos.y += ball.vel.y * h
      for (const s of solids) ev.impact = Math.max(ev.impact, collide(ball, s, false))
      for (const s of springs) {
        if (collide(ball, s, true) > 0) ev.spring = true
      }
    }
    for (let a = 0; a < world.balls.length; a++) {
      for (let b = a + 1; b < world.balls.length; b++) collideBalls(world.balls[a], world.balls[b])
    }

    for (const ball of world.balls) {
      if (ball.done) continue
      const p = ball.pos
      if (p.x > goal.x && p.x < goal.x + goal.w && p.y > goal.y && p.y < goal.y + goal.h) {
        ball.done = true
        ball.vel = { x: 0, y: 0 }
        ev.captured = true
        continue
      }
      if (spikes.some(s => distToSeg(p, s) < BALL_R + 4)) {
        ev.result = 'spike'
        return ev
      }
      if (p.y > WORLD_H + 60 || p.x < -60 || p.x > WORLD_W + 60) {
        ev.result = 'out'
        return ev
      }
    }
    if (world.balls.every(b => b.done)) {
      ev.result = 'won'
      return ev
    }
  }

  const active = world.balls.filter(b => !b.done)
  const still = active.every(b => Math.hypot(b.vel.x, b.vel.y) < STILL_SPEED)
  world.stillTime = still ? world.stillTime + Math.min(dt, 1 / 30) : 0
  if (world.stillTime > STUCK_SECONDS) ev.result = 'stuck'
  return ev
}
