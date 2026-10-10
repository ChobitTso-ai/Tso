// 畫線滾球 — 物理運算（純 TS，不依賴 React）
import type { Ball, Goal, Segment, Vec } from './types'
import { WORLD_H, WORLD_W } from './types'

export const BALL_R = 12
export const LINE_HALF = 3 // 線條半寬，碰撞時一併計入
const GRAVITY = 900 // px/s²
const MAX_SPEED = 900 // 限速避免穿牆：每個子步最多移動 3.75px，遠小於球半徑
const SUBSTEPS = 4
const BOUNCE = 0.2 // 低彈性，讓球貼著線滾而不是亂彈
const FRICTION = 0.9995

export type StepResult = 'ok' | 'goal' | 'spike' | 'out'

export function segLength(s: Segment): number {
  return Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)
}

function closestPoint(p: Vec, s: Segment): Vec {
  const dx = s.b.x - s.a.x
  const dy = s.b.y - s.a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return s.a
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2))
  return { x: s.a.x + t * dx, y: s.a.y + t * dy }
}

function collide(ball: Ball, s: Segment) {
  const q = closestPoint(ball.pos, s)
  const dx = ball.pos.x - q.x
  const dy = ball.pos.y - q.y
  const dist = Math.hypot(dx, dy)
  const minDist = BALL_R + LINE_HALF
  if (dist >= minDist || dist === 0) return
  const nx = dx / dist
  const ny = dy / dist
  ball.pos.x = q.x + nx * minDist
  ball.pos.y = q.y + ny * minDist
  const vn = ball.vel.x * nx + ball.vel.y * ny
  if (vn < 0) {
    ball.vel.x -= (1 + BOUNCE) * vn * nx
    ball.vel.y -= (1 + BOUNCE) * vn * ny
  }
  ball.vel.x *= FRICTION
  ball.vel.y *= FRICTION
}

function touches(p: Vec, s: Segment, margin: number): boolean {
  const q = closestPoint(p, s)
  return Math.hypot(p.x - q.x, p.y - q.y) < margin
}

/** 推進一個畫面（dt 秒），回傳是否進洞、碰刺或出界 */
export function step(ball: Ball, solids: Segment[], spikes: Segment[], goal: Goal, dt: number): StepResult {
  const h = Math.min(dt, 1 / 30) / SUBSTEPS
  for (let i = 0; i < SUBSTEPS; i++) {
    ball.vel.y += GRAVITY * h
    const speed = Math.hypot(ball.vel.x, ball.vel.y)
    if (speed > MAX_SPEED) {
      ball.vel.x *= MAX_SPEED / speed
      ball.vel.y *= MAX_SPEED / speed
    }
    ball.pos.x += ball.vel.x * h
    ball.pos.y += ball.vel.y * h
    for (const s of solids) collide(ball, s)

    const p = ball.pos
    if (p.x > goal.x && p.x < goal.x + goal.w && p.y > goal.y && p.y < goal.y + goal.h) return 'goal'
    if (spikes.some(s => touches(p, s, BALL_R + 4))) return 'spike'
    if (p.y > WORLD_H + 60 || p.x < -60 || p.x > WORLD_W + 60) return 'out'
  }
  return 'ok'
}
