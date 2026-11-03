import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { BoardArray, Color, Move, PieceType } from '../../chess/types'
import type { ChessBoardProps } from './ChessBoard'

// 世界座標：一格 = 1，棋盤上表面 y = 0；board[r][f] 位於 x = f - 3.5、z = r - 3.5（r = 0 是第 8 橫列，在 -z 遠端）
const FRAME = 0.6
const HALF = 4 + FRAME

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

function lathe(points: THREE.Vector2[]) {
  return new THREE.LatheGeometry(points, 48)
}

interface Part { geo: THREE.BufferGeometry; pos?: [number, number, number]; rotY?: number }

function buildPieceParts(): Record<PieceType, Part[]> {
  const half = Math.PI / 2

  const pawn = lathe([...BASE, v(0.2, 0.24), v(0.13, 0.42), v(0.21, 0.47), v(0.21, 0.51), v(0.11, 0.54),
    ...arc(0, 0.69, 0.16, -0.81, half, 14)])

  const rookBody = lathe([...BASE, v(0.26, 0.24), v(0.21, 0.62), v(0.29, 0.68), v(0.29, 0.92),
    v(0.21, 0.92), v(0.21, 0.86), v(0, 0.86)])
  const crenel = new THREE.BoxGeometry(0.14, 0.1, 0.1)
  const rook: Part[] = [{ geo: rookBody }]
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    rook.push({ geo: crenel, pos: [Math.sin(a) * 0.245, 0.97, Math.cos(a) * 0.245], rotY: a })
  }

  const bishop = lathe([...BASE, v(0.23, 0.24), v(0.13, 0.62), v(0.23, 0.68), v(0.23, 0.72), v(0.12, 0.75),
    v(0.17, 0.82), v(0.19, 0.92), v(0.15, 1.02), v(0.07, 1.1), ...arc(0, 1.17, 0.055, -0.8, half, 8)])

  const queenBody = lathe([...BASE, v(0.25, 0.24), v(0.15, 0.82), v(0.25, 0.88), v(0.25, 0.93), v(0.15, 0.97),
    v(0.2, 1.1), v(0.27, 1.2), v(0.22, 1.21), v(0.12, 1.25), v(0.08, 1.28), ...arc(0, 1.34, 0.07, -0.85, half, 8)])
  const bead = new THREE.SphereGeometry(0.045, 16, 12)
  const queen: Part[] = [{ geo: queenBody }]
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    queen.push({ geo: bead, pos: [Math.sin(a) * 0.255, 1.22, Math.cos(a) * 0.255] })
  }

  const king: Part[] = [
    { geo: lathe([...BASE, v(0.26, 0.24), v(0.16, 0.9), v(0.26, 0.96), v(0.26, 1.01), v(0.16, 1.05),
      v(0.21, 1.18), v(0.25, 1.28), v(0.15, 1.32), v(0, 1.33)]) },
    { geo: new THREE.BoxGeometry(0.07, 0.28, 0.07), pos: [0, 1.46, 0] },
    { geo: new THREE.BoxGeometry(0.22, 0.07, 0.07), pos: [0, 1.5, 0] },
  ]

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
  })
  headGeo.translate(-0.06, 0, -0.08)
  const knight: Part[] = [
    { geo: lathe([...BASE, v(0.28, 0.24), v(0.26, 0.3), v(0, 0.3)]) },
    { geo: headGeo },
  ]

  return { P: [{ geo: pawn }], R: rook, B: [{ geo: bishop }], Q: queen, K: king, N: knight }
}

let pieceParts: Record<PieceType, Part[]> | null = null

const MATERIALS: Record<Color, THREE.MeshStandardMaterial> = {
  w: new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.3 }),
  b: new THREE.MeshStandardMaterial({ color: 0x232327, roughness: 0.26, metalness: 0.15 }),
}

function overlay(color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
}
const HL = {
  selected: overlay(0x5fd35f, 0.6),
  last: overlay(0xe0d84a, 0.5),
  check: overlay(0xe53935, 0.7),
  hint: overlay(0x000000, 0.3),
}
const SQUARE_GEO = new THREE.PlaneGeometry(0.98, 0.98).rotateX(-Math.PI / 2)
const DOT_GEO = new THREE.CircleGeometry(0.15, 32).rotateX(-Math.PI / 2)
const RING_GEO = new THREE.RingGeometry(0.38, 0.47, 40).rotateX(-Math.PI / 2)

function boardTexture() {
  const px = 1024
  const unit = px / (HALF * 2)
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')!
  const wood = g.createLinearGradient(0, 0, px, px)
  wood.addColorStop(0, '#6b4120')
  wood.addColorStop(1, '#4a2b13')
  g.fillStyle = wood
  g.fillRect(0, 0, px, px)
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      g.fillStyle = (r + f) % 2 === 0 ? '#e8d2a4' : '#7b4b2b'
      g.fillRect((FRAME + f) * unit, (FRAME + r) * unit, unit + 0.5, unit + 0.5)
    }
  }
  g.strokeStyle = '#d6b36a'
  g.lineWidth = 3
  g.strokeRect(FRAME * unit - 4, FRAME * unit - 4, 8 * unit + 8, 8 * unit + 8)

  g.fillStyle = '#e9cf98'
  g.font = `600 ${Math.round(unit * 0.32)}px sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const label = (text: string, x: number, y: number, flip: boolean) => {
    g.save()
    g.translate(x, y)
    if (flip) g.rotate(Math.PI)
    g.fillText(text, 0, 0)
    g.restore()
  }
  const edge = (FRAME / 2) * unit
  const far = px - edge
  for (let i = 0; i < 8; i++) {
    const mid = (FRAME + i + 0.5) * unit
    const file = String.fromCharCode(65 + i)
    label(file, mid, far, false)
    label(file, mid, edge, true)
    label(String(8 - i), edge, mid, false)
    label(String(8 - i), far, mid, true)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

interface Snapshot {
  board: BoardArray
  selected: [number, number] | null
  legalMoves: Move[]
  lastMove: Move | null
  checkKing: [number, number] | null
  flipped: boolean
}

function createScene(wrap: HTMLDivElement, onPick: (r: number, f: number) => void) {
  pieceParts ??= buildPieceParts()
  const parts = pieceParts

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  wrap.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a1a, 0.35))
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.2)
  sun.position.set(-4, 11, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = sun.shadow.camera.bottom = -6
  sun.shadow.camera.right = sun.shadow.camera.top = 6
  sun.shadow.bias = -0.0005
  scene.add(sun)

  const boardTex = boardTexture()
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.55 }),
  )
  top.receiveShadow = true
  scene.add(top)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(HALF * 2, 0.4, HALF * 2),
    new THREE.MeshStandardMaterial({ color: 0x3f2410, roughness: 0.6 }),
  )
  body.position.y = -0.201
  scene.add(body)

  const pieces = new THREE.Group()
  const marks = new THREE.Group()
  scene.add(pieces, marks)

  const render = () => renderer.render(scene, camera)

  const resize = () => {
    const w = wrap.clientWidth
    const h = Math.round(w * 0.8)
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    render()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(wrap)

  const mark = (geo: THREE.BufferGeometry, mat: THREE.Material, r: number, f: number, y: number) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(f - 3.5, y, r - 3.5)
    marks.add(m)
  }

  const update = (s: Snapshot) => {
    const side = s.flipped ? -1 : 1
    camera.position.set(0, 13.2, 10.6 * side)
    camera.lookAt(0, -0.6, 0.7 * side)

    pieces.clear()
    marks.clear()

    if (s.lastMove) {
      mark(SQUARE_GEO, HL.last, s.lastMove.from[0], s.lastMove.from[1], 0.002)
      mark(SQUARE_GEO, HL.last, s.lastMove.to[0], s.lastMove.to[1], 0.002)
    }
    if (s.checkKing) mark(SQUARE_GEO, HL.check, s.checkKing[0], s.checkKing[1], 0.003)
    if (s.selected) mark(SQUARE_GEO, HL.selected, s.selected[0], s.selected[1], 0.004)
    for (const m of s.legalMoves) {
      const [r, f] = m.to
      const capture = !!s.board[r][f] || !!m.enPassant
      mark(capture ? RING_GEO : DOT_GEO, HL.hint, r, f, 0.005)
    }

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = s.board[r][f]
        if (!p) continue
        const g = new THREE.Group()
        for (const part of parts[p.type]) {
          const mesh = new THREE.Mesh(part.geo, MATERIALS[p.color])
          mesh.castShadow = true
          if (part.pos) mesh.position.set(...part.pos)
          if (part.rotY) mesh.rotation.y = part.rotY
          g.add(mesh)
        }
        const lifted = s.selected?.[0] === r && s.selected?.[1] === f
        g.position.set(f - 3.5, lifted ? 0.15 : 0, r - 3.5)
        g.scale.setScalar(0.8)
        // 馬頭朝向對手並略轉向側面，讓鏡頭看得到側臉輪廓
        if (p.type === 'N') g.rotation.y = p.color === 'w' ? Math.PI / 2 + 0.6 : -Math.PI / 2 + 0.6
        g.userData = { r, f }
        pieces.add(g)
      }
    }
    render()
  }

  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const onClick = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObjects(pieces.children, true)[0]
    if (hit) {
      const { r, f } = hit.object.parent!.userData as { r: number; f: number }
      onPick(r, f)
      return
    }
    const floor = raycaster.intersectObject(top)[0]
    if (!floor) return
    const f = Math.floor(floor.point.x + 4)
    const r = Math.floor(floor.point.z + 4)
    if (r >= 0 && r < 8 && f >= 0 && f < 8) onPick(r, f)
  }
  renderer.domElement.addEventListener('pointerdown', onClick)

  const dispose = () => {
    ro.disconnect()
    renderer.domElement.removeEventListener('pointerdown', onClick)
    boardTex.dispose()
    envTex.dispose()
    pmrem.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { update, dispose }
}

export default function ChessBoard3D(props: ChessBoardProps) {
  const { board, selected, legalMoves, lastMove, checkKing, flipped, onSquareClick } = props
  const wrapRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ReturnType<typeof createScene> | null>(null)
  const pickRef = useRef(onSquareClick)
  useEffect(() => { pickRef.current = onSquareClick }, [onSquareClick])

  useEffect(() => {
    const s = createScene(wrapRef.current!, (r, f) => pickRef.current(r, f))
    sceneRef.current = s
    return () => { s.dispose(); sceneRef.current = null }
  }, [])

  useEffect(() => {
    sceneRef.current?.update({ board, selected, legalMoves, lastMove, checkKing, flipped })
  }, [board, selected, legalMoves, lastMove, checkKing, flipped])

  return <div ref={wrapRef} className="cb3d" />
}
