// 畫線滾球 — 畫面縮放與平移（純 TS）
// 鏡頭以「世界座標」描述：(x, y) 是畫面左上角對到的世界位置，z 是放大倍率。
import { WORLD_H, WORLD_W } from './types'
import type { Vec } from './types'

export interface Camera {
  x: number
  y: number
  z: number
}

export const MIN_ZOOM = 1
export const MAX_ZOOM = 3
export const ZOOM_STEPS = [1, 1.5, 2, 3]

export const DEFAULT_CAMERA: Camera = { x: 0, y: 0, z: 1 }

/** 限制倍率並讓鏡頭不超出關卡範圍，畫面永遠看得到關卡內容 */
export function clampCamera(c: Camera): Camera {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.z))
  return {
    z,
    x: Math.min(WORLD_W - WORLD_W / z, Math.max(0, c.x)),
    y: Math.min(WORLD_H - WORLD_H / z, Math.max(0, c.y)),
  }
}

/** (sx, sy) 是畫布上的邏輯座標（0..WORLD_W, 0..WORLD_H） */
export function screenToWorld(c: Camera, sx: number, sy: number): Vec {
  return { x: c.x + sx / c.z, y: c.y + sy / c.z }
}

/** 以畫面上某一點為中心縮放：那一點底下的世界位置保持不動 */
export function zoomAt(c: Camera, z: number, sx: number, sy: number): Camera {
  const w = screenToWorld(c, sx, sy)
  return clampCamera({ z, x: w.x - sx / z, y: w.y - sy / z })
}

/** 以畫面中心縮放到下一段或上一段倍率 */
export function stepZoom(c: Camera, dir: 1 | -1): Camera {
  const next =
    dir > 0 ? ZOOM_STEPS.find(z => z > c.z + 0.01) ?? MAX_ZOOM : [...ZOOM_STEPS].reverse().find(z => z < c.z - 0.01) ?? MIN_ZOOM
  return zoomAt(c, next, WORLD_W / 2, WORLD_H / 2)
}
