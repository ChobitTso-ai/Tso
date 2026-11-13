import * as THREE from 'three'
import { marbleTexture, pieceMaterials } from './pieces'

export const PLINTH_Y = -0.4
const FLOOR_Y = -1.2

function floorTexture() {
  const size = 512
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const half = size / 2
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 === 0 ? '#2b2a30' : '#1b1b21'
      g.fillRect(i * half, j * half, half, half)
    }
  }
  g.strokeStyle = '#6d5a34'
  g.lineWidth = 3
  g.strokeRect(0, 0, half, half)
  g.strokeRect(half, half, half, half)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(14, 14)
  tex.anisotropy = 8
  return tex
}

// 大廳：石台、大理石地板、石柱與火盆。回傳釋放資源的函式
export function buildHall(scene: THREE.Scene, boardHalf: number) {
  const gold = pieceMaterials().gold
  const owned: { dispose: () => void }[] = []
  const keep = <T extends { dispose: () => void }>(x: T) => { owned.push(x); return x }
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.receiveShadow = shadow
    scene.add(m)
    return m
  }

  scene.background = new THREE.Color(0x0a0b11)
  scene.fog = new THREE.Fog(0x0a0b11, 26, 60)

  const stone = keep(new THREE.MeshStandardMaterial({ map: keep(marbleTexture('#24232a', '#7a7468', 14)), roughness: 0.3 }))
  const plinthW = boardHalf * 2 + 1.2
  const plinthD = boardHalf * 2 + 3.6
  add(new THREE.BoxGeometry(plinthW, FLOOR_Y * -1 + PLINTH_Y, plinthD), stone, 0, (FLOOR_Y + PLINTH_Y) / 2, 0)
  add(new THREE.BoxGeometry(plinthW + 0.08, 0.06, plinthD + 0.08), gold, 0, PLINTH_Y - 0.09, 0, false)

  const floorMat = keep(new THREE.MeshStandardMaterial({ map: keep(floorTexture()), roughness: 0.35 }))
  add(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), floorMat, 0, FLOOR_Y, 0)

  const v = (x: number, y: number) => new THREE.Vector2(x, y)
  const columnGeo = keep(new THREE.LatheGeometry([
    v(0, 0), v(1.0, 0), v(1.0, 0.28), v(0.82, 0.36), v(0.88, 0.56), v(0.7, 0.68),
    v(0.62, 9.6), v(0.8, 9.76), v(0.92, 10), v(0.92, 10.2), v(0, 10.2),
  ], 20))
  const columnMat = keep(new THREE.MeshStandardMaterial({
    map: keep(marbleTexture('#cfc6b4', '#857c6c', 20)), roughness: 0.45, flatShading: true,
  }))
  const ringGeo = keep(new THREE.TorusGeometry(0.72, 0.05, 8, 32).rotateX(Math.PI / 2))
  for (const [x, z] of [[-6.4, -7.6], [6.4, -7.6], [-2.2, -11.5], [2.2, -11.5], [-8.6, -2.5], [8.6, -2.5]]) {
    const col = new THREE.Mesh(columnGeo, columnMat)
    col.position.set(x, FLOOR_Y, z)
    scene.add(col)
    const band = new THREE.Mesh(ringGeo, gold)
    band.position.set(x, FLOOR_Y + 0.72, z)
    scene.add(band)
  }

  const bowlGeo = keep(new THREE.LatheGeometry([
    v(0, 0), v(0.34, 0), v(0.3, 0.08), v(0.09, 0.16), v(0.07, 1.0), v(0.16, 1.1), v(0.42, 1.34), v(0.38, 1.36), v(0, 1.2),
  ], 24))
  const flameGeo = keep(new THREE.SphereGeometry(0.26, 16, 12))
  const flameMat = keep(new THREE.MeshBasicMaterial({ color: 0xffb04a }))
  for (const [x, z] of [[-4.3, -7.9], [4.3, -7.9]]) {
    const bowl = new THREE.Mesh(bowlGeo, gold)
    bowl.position.set(x, FLOOR_Y, z)
    scene.add(bowl)
    const flame = new THREE.Mesh(flameGeo, flameMat)
    flame.position.set(x, FLOOR_Y + 1.42, z)
    flame.scale.y = 1.4
    scene.add(flame)
    const light = new THREE.PointLight(0xff9a3c, 90, 16, 2)
    light.position.set(x, FLOOR_Y + 2, z)
    scene.add(light)
  }

  return () => owned.forEach(x => x.dispose())
}
