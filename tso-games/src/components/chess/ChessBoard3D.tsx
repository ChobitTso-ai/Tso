import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { BoardArray, Color, Move, Piece } from '../../chess/types'
import type { ChessBoardProps } from './ChessBoard'
import { createPiece } from './three/pieces'
import { createBurst } from './three/effects'
import { buildHall, PLINTH_Y } from './three/hall'

// 世界座標：一格 = 1，棋盤上表面 y = 0；board[r][f] 位於 x = f - 3.5、z = r - 3.5（r = 0 是第 8 橫列，在 -z 遠端）
const FRAME = 0.6
const HALF = 4 + FRAME
const ASPECT = 0.9
const PIECE_SCALE = 0.8
const GRAVE_SCALE = 0.5
const GRAVE_Z = HALF + 0.8
const SLIDE = 0.34

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
  capturedByWhite?: Piece[]
  capturedByBlack?: Piece[]
}

interface Slide {
  obj: THREE.Object3D
  from: THREE.Vector3
  to: THREE.Vector3
  t: number
  hop: boolean
  onImpact?: () => void
}

const squarePos = (r: number, f: number) => new THREE.Vector3(f - 3.5, 0, r - 3.5)
// 陣亡區：被吃的棋子排在吃子方那一側的石台上
const gravePos = (capturer: Color, i: number) =>
  new THREE.Vector3((i - 7) * 0.58, PLINTH_Y, capturer === 'w' ? GRAVE_Z : -GRAVE_Z)
const floorY = (x: number, z: number) => (Math.abs(x) < HALF && Math.abs(z) < HALF ? 0 : PLINTH_Y)

function createScene(wrap: HTMLDivElement, onPick: (r: number, f: number) => void) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  wrap.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  const disposeHall = buildHall(scene, HALF)

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120)
  const camBase = new THREE.Vector3()

  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2a2018, 0.7))
  const sun = new THREE.DirectionalLight(0xffe9c8, 3)
  sun.position.set(-4, 11, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = sun.shadow.camera.bottom = -8
  sun.shadow.camera.right = sun.shadow.camera.top = 8
  sun.shadow.bias = -0.0005
  scene.add(sun)

  const boardTex = boardTexture()
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.4 }),
  )
  top.receiveShadow = true
  scene.add(top)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(HALF * 2, -PLINTH_Y, HALF * 2),
    new THREE.MeshStandardMaterial({ color: 0x3f2410, roughness: 0.6 }),
  )
  body.position.y = PLINTH_Y / 2 - 0.001
  body.castShadow = true
  scene.add(body)

  const pieces = new THREE.Group()
  const marks = new THREE.Group()
  const graves = new THREE.Group()
  const fx = new THREE.Group()
  scene.add(pieces, marks, graves, fx)

  let prev: Snapshot | null = null
  let slides: Slide[] = []
  let bursts: ReturnType<typeof createBurst>[] = []
  // 碎片還沒聚合完成的陣亡區位置，先不顯示
  const pending = new Set<string>()
  let shake = 0
  let raf = 0
  let last = 0

  const render = () => renderer.render(scene, camera)

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    slides = slides.filter(sl => {
      sl.t += dt / SLIDE
      const k = Math.min(1, sl.t)
      // 吃子時一路加速撞上去；一般移動則緩進緩出
      const e = sl.onImpact ? k * k : k * k * (3 - 2 * k)
      sl.obj.position.lerpVectors(sl.from, sl.to, e)
      if (sl.hop) sl.obj.position.y = Math.sin(Math.PI * k) * 0.7
      if (k < 1) return true
      sl.onImpact?.()
      return false
    })

    bursts = bursts.filter(b => {
      if (b.update(dt)) return true
      fx.remove(b.group)
      b.dispose()
      return false
    })

    camera.position.copy(camBase)
    if (shake > 0) {
      shake -= dt
      const amp = Math.max(0, shake) * 0.45
      camera.position.x += (Math.random() - 0.5) * amp
      camera.position.y += (Math.random() - 0.5) * amp
    }

    render()
    raf = slides.length || bursts.length || shake > 0 ? requestAnimationFrame(tick) : 0
  }
  const start = () => {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const clearFx = () => {
    slides = []
    bursts.forEach(b => b.dispose())
    bursts = []
    fx.clear()
    pending.clear()
  }

  const resize = () => {
    const w = wrap.clientWidth
    const h = Math.round(w * ASPECT)
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

  const capturedBy = (s: Snapshot, c: Color) => (c === 'w' ? s.capturedByWhite : s.capturedByBlack) ?? []

  // 判斷這次更新是不是「往前走了一步」（悔棋、讀檔、換題都不播動畫）
  const detectMove = (before: Snapshot, s: Snapshot) => {
    const m = s.lastMove
    if (!m || s.board === before.board) return null
    const mover = before.board[m.from[0]][m.from[1]]
    const now = s.board[m.to[0]][m.to[1]]
    if (!mover || !now || now.color !== mover.color || s.board[m.from[0]][m.from[1]]) return null
    let diff = 0
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const a = before.board[r][f]
        const b = s.board[r][f]
        if (a?.type !== b?.type || a?.color !== b?.color) diff++
      }
    }
    if (diff > 4) return null
    const victimSq: [number, number] = m.enPassant ? [m.from[0], m.to[1]] : m.to
    const victim = before.board[victimSq[0]][victimSq[1]]
    const grew = capturedBy(s, mover.color).length > capturedBy(before, mover.color).length
    const hasGraves = !!s.capturedByWhite
    return { m, mover, victim: victim && (grew || !hasGraves) ? victim : null, victimSq, hasGraves }
  }

  const update = (s: Snapshot) => {
    const side = s.flipped ? -1 : 1
    camBase.set(0, 14.2, 12.2 * side)
    camera.position.copy(camBase)
    camera.lookAt(0, -0.6, 0.5 * side)

    const moved = prev && !reducedMotion ? detectMove(prev, s) : null
    const shrank = prev && (['w', 'b'] as Color[]).some(c => capturedBy(s, c).length < capturedBy(prev!, c).length)
    if (shrank) clearFx()

    // 上一步的滑動還沒結束就被打斷：直接觸發撞擊，特效不會漏掉
    slides.forEach(sl => sl.onImpact?.())
    slides = []

    const graveKey = moved?.victim && moved.hasGraves
      ? `${moved.mover.color}:${capturedBy(s, moved.mover.color).length - 1}`
      : null
    if (graveKey) pending.add(graveKey)

    pieces.clear()
    marks.clear()
    graves.clear()

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

    const holders = new Map<string, THREE.Group>()
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = s.board[r][f]
        if (!p) continue
        const g = createPiece(p.type, p.color)
        const lifted = s.selected?.[0] === r && s.selected?.[1] === f
        g.position.set(f - 3.5, lifted ? 0.15 : 0, r - 3.5)
        g.scale.setScalar(PIECE_SCALE)
        g.userData = { r, f }
        pieces.add(g)
        holders.set(`${r},${f}`, g)
      }
    }

    for (const c of ['w', 'b'] as Color[]) {
      capturedBy(s, c).forEach((p, i) => {
        const g = createPiece(p.type, p.color)
        g.position.copy(gravePos(c, i))
        g.scale.setScalar(GRAVE_SCALE)
        g.userData = { key: `${c}:${i}` }
        g.visible = !pending.has(`${c}:${i}`)
        graves.add(g)
      })
    }

    if (moved) {
      const { m, mover, victim, victimSq } = moved
      const from = squarePos(...m.from)
      const to = squarePos(...m.to)
      let onImpact: (() => void) | undefined
      if (victim) {
        const ghost = createPiece(victim.type, victim.color)
        ghost.position.copy(squarePos(...victimSq))
        ghost.scale.setScalar(PIECE_SCALE)
        fx.add(ghost)
        const at = ghost.position.clone()
        const dir = to.clone().sub(from).setY(0).normalize()
        const home = graveKey ? gravePos(mover.color, Number(graveKey.split(':')[1])) : null
        onImpact = () => {
          fx.remove(ghost)
          const burst = createBurst({
            type: victim.type, color: victim.color, at, dir, scale: PIECE_SCALE, home, floorY,
            onDone: () => {
              if (!graveKey) return
              pending.delete(graveKey)
              const g = graves.children.find(ch => ch.userData.key === graveKey)
              if (g) g.visible = true
            },
          })
          fx.add(burst.group)
          bursts.push(burst)
          shake = 0.28
        }
      }
      const obj = holders.get(`${m.to[0]},${m.to[1]}`)!
      obj.position.copy(from)
      slides.push({ obj, from, to, t: 0, hop: mover.type === 'N', onImpact })

      if (m.castling) {
        const r = m.from[0]
        const [rf, rt] = m.castling === 'K' ? [7, 5] : [0, 3]
        const rook = holders.get(`${r},${rt}`)
        if (rook) {
          rook.position.copy(squarePos(r, rf))
          slides.push({ obj: rook, from: squarePos(r, rf), to: squarePos(r, rt), t: 0, hop: false })
        }
      }
      start()
    }

    prev = s
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
    cancelAnimationFrame(raf)
    clearFx()
    ro.disconnect()
    renderer.domElement.removeEventListener('pointerdown', onClick)
    disposeHall()
    boardTex.dispose()
    envTex.dispose()
    pmrem.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { update, dispose }
}

export default function ChessBoard3D(props: ChessBoardProps) {
  const { board, selected, legalMoves, lastMove, checkKing, flipped, onSquareClick, capturedByWhite, capturedByBlack } = props
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
    sceneRef.current?.update({ board, selected, legalMoves, lastMove, checkKing, flipped, capturedByWhite, capturedByBlack })
  }, [board, selected, legalMoves, lastMove, checkKing, flipped, capturedByWhite, capturedByBlack])

  return <div ref={wrapRef} className="cb3d" />
}
