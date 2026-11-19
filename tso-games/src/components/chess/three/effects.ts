import * as THREE from 'three'
import type { Color, PieceType } from '../../../chess/types'
import { PIECE_HEIGHT, pieceMaterials } from './pieces'

const SHARD_GEO = new THREE.IcosahedronGeometry(1, 0)
const GRAVITY = 16
const SCATTER = 0.85
const GATHER = 0.65
const DUST_LIFE = 0.9
const DUST_COUNT = 36

let dustTex: THREE.Texture | null = null
function dustTexture() {
  if (dustTex) return dustTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  dustTex = new THREE.CanvasTexture(c)
  return dustTex
}

interface Shard {
  mesh: THREE.Mesh
  vel: THREE.Vector3
  spin: THREE.Vector3
  size: number
  from: THREE.Vector3
  fromScale: THREE.Vector3
}

export interface BurstOptions {
  type: PieceType
  color: Color
  at: THREE.Vector3
  dir: THREE.Vector3
  scale: number
  home: THREE.Vector3 | null
  floorY: (x: number, z: number) => number
  onDone: () => void
}

// 棋子被吃：碎片噴開落地彈跳、揚起石粉，最後飛到陣亡區重新聚合
export function createBurst(o: BurstOptions) {
  const mats = pieceMaterials()
  const group = new THREE.Group()
  const h = PIECE_HEIGHT[o.type] * o.scale
  const shards: Shard[] = []
  const count = 18 + Math.round(h * 12)
  const rnd = (n: number) => (Math.random() - 0.5) * n

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(SHARD_GEO, i % 6 === 0 ? mats.gold : mats.body[o.color])
    mesh.castShadow = true
    const size = 0.05 + Math.random() * 0.075
    mesh.scale.set(size * (0.6 + Math.random()), size * (0.6 + Math.random()), size * (0.6 + Math.random()))
    const a = Math.random() * Math.PI * 2
    const rad = Math.random() * 0.2
    mesh.position.set(o.at.x + Math.cos(a) * rad, o.at.y + 0.05 + Math.random() * h, o.at.z + Math.sin(a) * rad)
    mesh.rotation.set(rnd(6), rnd(6), rnd(6))
    const speed = 1.2 + Math.random() * 2.6
    group.add(mesh)
    shards.push({
      mesh, size,
      vel: new THREE.Vector3(Math.cos(a) * speed + o.dir.x * 2.2, 2 + Math.random() * 3.5, Math.sin(a) * speed + o.dir.z * 2.2),
      spin: new THREE.Vector3(rnd(16), rnd(16), rnd(16)),
      from: new THREE.Vector3(),
      fromScale: new THREE.Vector3(),
    })
  }

  const dustPos = new Float32Array(DUST_COUNT * 3)
  const dustVel: THREE.Vector3[] = []
  for (let i = 0; i < DUST_COUNT; i++) {
    const a = Math.random() * Math.PI * 2
    dustPos.set([o.at.x + rnd(0.3), o.at.y + 0.1 + Math.random() * h * 0.6, o.at.z + rnd(0.3)], i * 3)
    const speed = 0.6 + Math.random() * 1.8
    dustVel.push(new THREE.Vector3(Math.cos(a) * speed, 0.3 + Math.random() * 1.2, Math.sin(a) * speed))
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({
    map: dustTexture(), color: o.color === 'w' ? 0xe9e2d4 : 0x8a8580,
    size: 0.4, transparent: true, opacity: 0.55, depthWrite: false,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  group.add(dust)

  let t = 0
  let gathering = false
  const target = o.home ? o.home.clone().setY(o.home.y + h * 0.3) : null

  // 回傳 false 表示特效結束
  const update = (dt: number) => {
    t += dt

    if (t < DUST_LIFE) {
      for (let i = 0; i < DUST_COUNT; i++) {
        const vel = dustVel[i]
        dustPos[i * 3] += vel.x * dt
        dustPos[i * 3 + 1] += vel.y * dt
        dustPos[i * 3 + 2] += vel.z * dt
        vel.multiplyScalar(1 - 2.2 * dt)
      }
      dustGeo.attributes.position.needsUpdate = true
      dustMat.opacity = 0.55 * (1 - t / DUST_LIFE)
      dustMat.size = 0.4 + t * 0.7
    } else {
      dust.visible = false
    }

    if (t < SCATTER) {
      for (const s of shards) {
        s.vel.y -= GRAVITY * dt
        s.mesh.position.addScaledVector(s.vel, dt)
        const floor = o.floorY(s.mesh.position.x, s.mesh.position.z) + s.size * 0.6
        if (s.mesh.position.y < floor) {
          s.mesh.position.y = floor
          if (s.vel.y < 0) s.vel.y *= -0.38
          s.vel.x *= 0.6
          s.vel.z *= 0.6
          s.spin.multiplyScalar(0.6)
        }
        s.mesh.rotation.x += s.spin.x * dt
        s.mesh.rotation.y += s.spin.y * dt
        s.mesh.rotation.z += s.spin.z * dt
      }
      return true
    }

    if (!gathering) {
      gathering = true
      for (const s of shards) {
        s.from.copy(s.mesh.position)
        s.fromScale.copy(s.mesh.scale)
      }
    }
    const k = Math.min(1, (t - SCATTER) / GATHER)
    const e = k * k * (3 - 2 * k)
    for (const s of shards) {
      if (target) {
        s.mesh.position.lerpVectors(s.from, target, e)
        s.mesh.position.y += Math.sin(Math.PI * k) * 0.9
        s.mesh.rotation.y += 10 * dt
        s.mesh.scale.copy(s.fromScale).multiplyScalar(1 - 0.7 * e)
      } else {
        s.mesh.scale.copy(s.fromScale).multiplyScalar(1 - e)
      }
    }
    if (k < 1) return true
    o.onDone()
    return false
  }

  const dispose = () => {
    dustGeo.dispose()
    dustMat.dispose()
  }

  return { group, update, dispose }
}
