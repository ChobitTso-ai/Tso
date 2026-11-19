import * as THREE from 'three'
import type { Color, PieceType } from '../../../chess/types'

const v = (x: number, y: number) => new THREE.Vector2(x, y)

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number) {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n)
    pts.push(v(cx + r * Math.cos(a), cy + r * Math.sin(a)))
  }
  return pts
}

const BASE = [v(0, 0), v(0.4, 0), v(0.4, 0.07), v(0.36, 0.1), v(0.37, 0.14), v(0.31, 0.18)]
const HALF_PI = Math.PI / 2

const lathe = (points: THREE.Vector2[]) => new THREE.LatheGeometry(points, 48)
const ring = (radius: number, tube = 0.018) => new THREE.TorusGeometry(radius, tube, 10, 48).rotateX(HALF_PI)

// 白方大理石、黑方黑曜石：用 canvas 畫隨機紋路當貼圖
export function marbleTexture(base: string, vein: string, veins: number) {
  const size = 512
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, size, size)
  g.strokeStyle = vein
  g.lineCap = 'round'
  for (let i = 0; i < veins; i++) {
    g.globalAlpha = 0.08 + Math.random() * 0.22
    g.lineWidth = 0.6 + Math.random() * 2.4
    g.shadowColor = vein
    g.shadowBlur = 6
    let x = Math.random() * size
    let y = Math.random() * size
    g.beginPath()
    g.moveTo(x, y)
    for (let s = 0; s < 6; s++) {
      const nx = x + (Math.random() - 0.3) * 160
      const ny = y + (Math.random() - 0.5) * 120
      g.quadraticCurveTo((x + nx) / 2 + (Math.random() - 0.5) * 60, (y + ny) / 2 + (Math.random() - 0.5) * 60, nx, ny)
      x = nx
      y = ny
    }
    g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 1)
  return tex
}

export interface PieceMaterials { body: Record<Color, THREE.MeshStandardMaterial>; gold: THREE.MeshStandardMaterial; eye: THREE.MeshStandardMaterial }

let materials: PieceMaterials | null = null
export function pieceMaterials(): PieceMaterials {
  materials ??= {
    body: {
      w: new THREE.MeshStandardMaterial({ map: marbleTexture('#f4efe6', '#8d8577', 26), roughness: 0.2 }),
      b: new THREE.MeshStandardMaterial({ map: marbleTexture('#16161a', '#6f6a63', 18), roughness: 0.12, metalness: 0.1 }),
    },
    gold: new THREE.MeshStandardMaterial({ color: 0xd8aa4c, metalness: 1, roughness: 0.28 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.3 }),
  }
  return materials
}

type Mat = 'body' | 'gold' | 'eye'
interface Part { geo: THREE.BufferGeometry; mat: Mat; pos?: [number, number, number]; rotY?: number; scale?: [number, number, number] }

function buildParts(): Record<PieceType, Part[]> {
  const baseRing: Part = { geo: ring(0.372), mat: 'gold', pos: [0, 0.14, 0] }

  const pawn: Part[] = [
    { geo: lathe([...BASE, v(0.2, 0.24), v(0.13, 0.42), v(0.21, 0.47), v(0.21, 0.51), v(0.11, 0.54),
      ...arc(0, 0.69, 0.16, -0.81, HALF_PI, 14)]), mat: 'body' },
    baseRing,
    { geo: ring(0.215, 0.016), mat: 'gold', pos: [0, 0.49, 0] },
  ]

  const crenel = new THREE.BoxGeometry(0.14, 0.1, 0.1)
  const rook: Part[] = [
    { geo: lathe([...BASE, v(0.26, 0.24), v(0.21, 0.62), v(0.29, 0.68), v(0.29, 0.92),
      v(0.21, 0.92), v(0.21, 0.86), v(0, 0.86)]), mat: 'body' },
    baseRing,
    { geo: ring(0.295, 0.02), mat: 'gold', pos: [0, 0.7, 0] },
  ]
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    rook.push({ geo: crenel, mat: 'body', pos: [Math.sin(a) * 0.245, 0.97, Math.cos(a) * 0.245], rotY: a })
  }

  const bishop: Part[] = [
    { geo: lathe([...BASE, v(0.23, 0.24), v(0.13, 0.62), v(0.23, 0.68), v(0.23, 0.72), v(0.12, 0.75),
      v(0.17, 0.82), v(0.19, 0.92), v(0.15, 1.02), v(0.07, 1.1), v(0.03, 1.12)]), mat: 'body' },
    baseRing,
    { geo: ring(0.235), mat: 'gold', pos: [0, 0.7, 0] },
    { geo: ring(0.185, 0.014), mat: 'gold', pos: [0, 0.88, 0] },
    { geo: new THREE.SphereGeometry(0.06, 20, 14), mat: 'gold', pos: [0, 1.17, 0] },
  ]

  const bead = new THREE.SphereGeometry(0.048, 16, 12)
  const queen: Part[] = [
    { geo: lathe([...BASE, v(0.25, 0.24), v(0.15, 0.82), v(0.25, 0.88), v(0.25, 0.93), v(0.15, 0.97),
      v(0.2, 1.1), v(0.27, 1.2), v(0.22, 1.21), v(0.12, 1.25), v(0.08, 1.28), v(0.03, 1.29)]), mat: 'body' },
    baseRing,
    { geo: ring(0.255), mat: 'gold', pos: [0, 0.9, 0] },
    { geo: new THREE.SphereGeometry(0.075, 20, 14), mat: 'gold', pos: [0, 1.34, 0] },
  ]
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    queen.push({ geo: bead, mat: 'gold', pos: [Math.sin(a) * 0.255, 1.23, Math.cos(a) * 0.255] })
  }

  const king: Part[] = [
    { geo: lathe([...BASE, v(0.26, 0.24), v(0.16, 0.9), v(0.26, 0.96), v(0.26, 1.01), v(0.16, 1.05),
      v(0.21, 1.18), v(0.25, 1.28), v(0.15, 1.32), v(0, 1.33)]), mat: 'body' },
    baseRing,
    { geo: ring(0.262), mat: 'gold', pos: [0, 0.985, 0] },
    { geo: ring(0.25, 0.02), mat: 'gold', pos: [0, 1.28, 0] },
    { geo: new THREE.BoxGeometry(0.075, 0.3, 0.075), mat: 'gold', pos: [0, 1.47, 0] },
    { geo: new THREE.BoxGeometry(0.23, 0.075, 0.075), mat: 'gold', pos: [0, 1.51, 0] },
  ]

  // 馬：馬頭剖面擠出，再加鬃毛、眼睛、鼻孔與籠頭
  const head = new THREE.Shape()
  head.moveTo(-0.22, 0.28)
  head.lineTo(-0.25, 0.45)
  head.quadraticCurveTo(-0.27, 0.75, -0.12, 0.95)
  head.lineTo(-0.1, 1.05)
  head.lineTo(-0.03, 1.13)
  head.lineTo(0, 1.0)
  head.quadraticCurveTo(0.12, 0.98, 0.22, 0.86)
  head.quadraticCurveTo(0.33, 0.74, 0.38, 0.64)
  head.quadraticCurveTo(0.4, 0.56, 0.33, 0.55)
  head.lineTo(0.26, 0.57)
  head.quadraticCurveTo(0.16, 0.58, 0.1, 0.62)
  head.quadraticCurveTo(0.04, 0.55, 0.12, 0.45)
  head.quadraticCurveTo(0.22, 0.36, 0.22, 0.28)
  head.closePath()
  const headGeo = new THREE.ExtrudeGeometry(head, {
    depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 5, curveSegments: 12,
  }).translate(-0.06, 0, -0.08)
  const crest = new THREE.Shape()
  crest.moveTo(-0.24, 0.4)
  crest.quadraticCurveTo(-0.3, 0.76, -0.13, 0.99)
  crest.lineTo(-0.2, 1.0)
  crest.quadraticCurveTo(-0.4, 0.78, -0.33, 0.4)
  crest.closePath()
  const maneGeo = new THREE.ExtrudeGeometry(crest, {
    depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10,
  }).translate(-0.06, 0, -0.025)
  const knight: Part[] = [
    { geo: lathe([...BASE, v(0.28, 0.24), v(0.26, 0.3), v(0, 0.3)]), mat: 'body' },
    baseRing,
    { geo: headGeo, mat: 'body' },
    { geo: new THREE.SphereGeometry(0.028, 12, 10), mat: 'eye', pos: [0.1, 0.88, 0.1] },
    { geo: new THREE.SphereGeometry(0.028, 12, 10), mat: 'eye', pos: [0.1, 0.88, -0.1] },
    { geo: new THREE.SphereGeometry(0.02, 10, 8), mat: 'eye', pos: [0.31, 0.6, 0.06] },
    { geo: new THREE.SphereGeometry(0.02, 10, 8), mat: 'eye', pos: [0.31, 0.6, -0.06] },
    { geo: new THREE.TorusGeometry(0.135, 0.014, 8, 32), mat: 'gold', pos: [0.2, 0.7, 0], rotY: HALF_PI, scale: [1, 1, 0.8] },
    { geo: maneGeo, mat: 'gold' },
  ]

  return { P: pawn, R: rook, B: bishop, Q: queen, K: king, N: knight }
}

let parts: Record<PieceType, Part[]> | null = null

// 棋子原始高度（縮放前），碎裂特效用來決定碎片分佈
export const PIECE_HEIGHT: Record<PieceType, number> = { P: 0.85, N: 1.13, B: 1.23, R: 1.07, Q: 1.42, K: 1.6 }

export function createPiece(type: PieceType, color: Color) {
  parts ??= buildParts()
  const mats = pieceMaterials()
  const g = new THREE.Group()
  for (const p of parts[type]) {
    const mat = p.mat === 'body' ? mats.body[color] : mats[p.mat]
    const mesh = new THREE.Mesh(p.geo, mat)
    mesh.castShadow = true
    if (p.pos) mesh.position.set(...p.pos)
    if (p.rotY) mesh.rotation.y = p.rotY
    if (p.scale) mesh.scale.set(...p.scale)
    g.add(mesh)
  }
  // 馬頭朝向對手並略轉向側面，讓鏡頭看得到側臉輪廓
  if (type === 'N') g.rotation.y = color === 'w' ? HALF_PI + 0.6 : -HALF_PI + 0.6
  return g
}
