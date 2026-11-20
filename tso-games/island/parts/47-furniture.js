
// ================= 街道家具與島上大樹 =================
const POOLS = []; // 加法混合光池：{x, z, r}

function addTree(kind, x, z, s) {
  const y = TOP, P = PAL.plants;
  const T = (k, dy, sc, c, rot) => kit.add(k, { pos: new THREE.Vector3(x, y + dy * s, z), rot, scale: sc.map ? sc.map((v) => v * s) : sc * s }, c);
  if (kind === 'cone') {
    T('cylinder', .12, [.08, .24, .08], PAL.wood);
    T('cone', .42, [.5, .5, .5], P[2]); T('cone', .66, [.4, .42, .4], P[1]); T('cone', .86, [.28, .34, .28], P[0]);
  } else if (kind === 'cherry') {
    T('cylinder', .22, [.07, .44, .07], '#8a5a44');
    T('ico', .6, .5, '#f2b5c6'); T('ico', .7, .34, '#f7cbd7');
    kit.add('ico', { pos: new THREE.Vector3(x + .16 * s, y + .52 * s, z + .05 * s), scale: .3 * s }, '#eea4b8');
  } else if (kind === 'fruit') {
    T('cylinder', .2, [.08, .4, .08], PAL.wood);
    T('sphere', .58, .56, P[1]);
    [[.2, .62, .14], [-.16, .5, .2], [.05, .78, .18], [-.2, .7, -.1]].forEach(([dx, dy, dz]) =>
      kit.add('sphere', { pos: new THREE.Vector3(x + dx * s, y + dy * s, z + dz * s), scale: .08 * s }, '#f29a4a'));
  } else if (kind === 'palm') {
    for (let i = 0; i < 4; i++) kit.add('cylinder', { pos: new THREE.Vector3(x + i * .03 * s, y + (.12 + i * .2) * s, z), scale: [.08 * s, .2 * s, .08 * s] }, i % 2 ? '#c39a6c' : PAL.wood);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      kit.add('box', { pos: new THREE.Vector3(x + .12 * s + Math.cos(a) * .2 * s, y + .82 * s, z + Math.sin(a) * .2 * s), rot: [0, -a, -.35], rotOrder: 'YXZ', scale: [.42 * s, .03 * s, .12 * s] }, P[i % 2]);
    }
  } else if (kind === 'willow') {
    T('cylinder', .22, [.08, .44, .08], '#8a6a4c');
    T('dome', .44, [.7, .6, .7], P[0]);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      kit.add('cylinder', { pos: new THREE.Vector3(x + Math.cos(a) * .3 * s, y + .36 * s, z + Math.sin(a) * .3 * s), scale: [.07 * s, .3 * s, .07 * s] }, P[1]);
    }
  } else {
    T('cylinder', .2, [.08, .4, .08], PAL.wood);
    T('ico', .58, .6, P[0]); T('ico', .72, .36, P[1]);
  }
}

// ================= 水面與土路（有 river、bay、roads 設定的島） =================
// 座標都是島內的區域座標（相對島中心，-z 是北）
const riverZ = (rv, x) => rv.z + rv.amp * Math.sin(x * 1.3);
function onWater(isl, x, z, m = 0) {
  const rv = isl.data.river, by = isl.data.bay;
  if (rv && Math.abs(z - riverZ(rv, x)) < rv.w / 2 + m) return true;
  if (by) {
    const dx = x - by.x, dz = z - by.z, c = Math.cos(by.rot || 0), s = Math.sin(by.rot || 0);
    const u = (dx * c + dz * s) / (by.rx + m), v = (-dx * s + dz * c) / (by.rz + m);
    if (u * u + v * v < 1) return true;
  }
  return false;
}
const WATER = { bank: '#e6d3a8', water: '#7fc3c0', deep: '#68b0b4', road: '#b8925e' };

// 沿中心線的帶狀平面（河、河岸），y 為高度
function ribbonGeo(pts, w, y) {
  const pos = [], idx = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l * w / 2, nz = tx / l * w / 2;
    pos.push(p[0] + nx, y, p[1] + nz, p[0] - nx, y, p[1] - nz);
    if (i) { const o = (i - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// 島頂六角形內的橢圓（水灣）：超出島緣的點拉回島緣，水面剛好接到島邊
function bayGeo(isl, by, grow, y) {
  const ap = (isl.R - .05) * SQ3 / 2, pts = [], c = Math.cos(by.rot || 0), s = Math.sin(by.rot || 0);
  for (let i = 0; i < 64; i++) {
    const t = i / 64 * Math.PI * 2, u = Math.cos(t) * (by.rx + grow), v = Math.sin(t) * (by.rz + grow);
    let x = by.x + u * c - v * s, z = by.z + u * s + v * c;
    const over = Math.max(Math.abs(x) / ap, (Math.abs(x) * .5 + Math.abs(z) * SQ3 / 2) / ap);
    if (over > 1) { x /= over; z /= over; }
    pts.push(new THREE.Vector2(x, -z)); // 形狀在 xy 平面，轉成水平面時 y 會變成 -z，所以先反號
  }
  return new THREE.ShapeGeometry(new THREE.Shape(pts)).rotateX(-Math.PI / 2).translate(0, y, 0);
}
function addFlat(isl, geo, color, order) {
  const m = new THREE.Mesh(geo.translate(isl.cx, 0, isl.cz), flatMat(color, { polygonOffsetFactor: -1 - order, polygonOffsetUnits: -1 - order * 2 }));
  m.receiveShadow = true; m.renderOrder = order; m.userData.island = isl;
  S.scene.add(m); isl.pickables.push(m);
}
// 一段路：陸上畫土路（road 為 true 時），經過水面的部分改鋪木板橋並加扶手
function addPath(isl, ax, az, bx, bz, road) {
  const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax), n = Math.ceil(len / .09);
  if (road) {
    const g = new THREE.PlaneGeometry(len, .26).rotateX(-Math.PI / 2).rotateY(yaw).translate((ax + bx) / 2, TOP + .002, (az + bz) / 2);
    addFlat(isl, g, WATER.road, 1);
  }
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    if (!onWater(isl, x, z, .06)) continue;
    const p = new THREE.Vector3(isl.cx + x, TOP + .045, isl.cz + z);
    kit.add('box', { pos: p, rot: [0, yaw, 0], scale: [.075, .03, .3] }, i % 2 ? PAL.wood : tint(PAL.wood, .05));
    [-1, 1].forEach((side) => {
      const off = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(.14 * side);
      kit.add('box', { pos: p.clone().add(off).setY(TOP + .12), rot: [0, yaw, 0], scale: [len / n, .02, .02] }, PAL.cream);
      if (i % 3 === 0) kit.add('cylinder', { pos: p.clone().add(off).setY(TOP + .085), scale: [.025, .08, .025] }, PAL.cream);
    });
  }
}
function buildWaterways(isl) {
  const d = isl.data, sc = isl.sc;
  if (d.river) {
    const ap = (isl.R - .05) * SQ3 / 2 - .02, pts = [];
    for (let x = -ap; x <= ap + 1e-6; x += ap / 30) pts.push([x, riverZ(d.river, x)]);
    addFlat(isl, ribbonGeo(pts, d.river.w + .24, TOP + .004), WATER.bank, 2);
    addFlat(isl, ribbonGeo(pts, d.river.w, TOP + .008), WATER.water, 3);
    addFlat(isl, ribbonGeo(pts, d.river.w * .4, TOP + .011), WATER.deep, 4);
  }
  if (d.bay) {
    addFlat(isl, bayGeo(isl, d.bay, .14, TOP + .004), WATER.bank, 2);
    addFlat(isl, bayGeo(isl, d.bay, 0, TOP + .008), WATER.water, 3);
    addFlat(isl, bayGeo(isl, d.bay, -.28, TOP + .011), WATER.deep, 4);
  }
  // 土路：從主位（第一款）通往其他有固定位置的建物
  const L = d.layout || {}, hub = d.items[0] && L[d.items[0].id];
  if (d.roads && hub) d.items.slice(1).forEach((it) => { const t = L[it.id]; if (t) addPath(isl, hub.x, hub.z, t.x, t.z, true); });
  // 島邊步道經過水面的地方鋪木板（小人會從上面走過）
  if (d.river || d.bay) {
    const Pi = PATH_R * sc;
    for (let k = 0; k < 6; k++) { const a = hexVert(k, Pi), b = hexVert((k + 1) % 6, Pi); addPath(isl, a[0], a[1], b[0], b[1], false); }
  }
}

function buildFurniture(isl) {
  const { cx, cz } = isl, Ri = isl.R, Pi = PATH_R * isl.sc;
  buildWaterways(isl);
  if (isl.data.river || isl.data.bay) kit.skip = (p) => onWater(isl, p.x - cx, p.z - cz, .08);
  // 路燈：六角形頂點
  for (let k = 0; k < 6; k++) {
    const [x, z] = hexVert(k, Ri - .15);
    kit.add('cylinder', { pos: new THREE.Vector3(cx + x, TOP + .22, cz + z), scale: [.03, .44, .03] }, PAL.ink);
    kit.add('cylinder', { pos: new THREE.Vector3(cx + x, TOP + .02, cz + z), scale: [.08, .04, .08] }, PAL.ink);
    kit.add('glowsphere', { pos: new THREE.Vector3(cx + x, TOP + .47, cz + z), scale: .1 }, PAL.cream);
    POOLS.push({ x: cx + x, z: cz + z, r: .55 });
  }
  // 邊上：盆栽、灌木、花，以及島緣串燈（小物件，LOD）
  kit.lod = true;
  for (let k = 0; k < 6; k++) {
    const a = hexVert(k, Ri - .12), b = hexVert((k + 1) % 6, Ri - .12);
    for (let i = 1; i < 6; i++) {
      const t = i / 6, x = cx + a[0] + (b[0] - a[0]) * t, z = cz + a[1] + (b[1] - a[1]) * t;
      if (i === 3) continue; // 邊中點留給橋
      const r = rand();
      if (r < .3) { kit.add('cylinder', { pos: new THREE.Vector3(x, TOP + .05, z), scale: [.1, .1, .1] }, PAL.coral); kit.add('ico', { pos: new THREE.Vector3(x, TOP + .14, z), scale: .12 }, pick(PAL.plants)); }
      else if (r < .65) kit.add('ico', { pos: new THREE.Vector3(x, TOP + .07, z), scale: [.17, .13, .17] }, pick(PAL.plants));
      else { kit.add('sphere', { pos: new THREE.Vector3(x, TOP + .06, z), scale: .07 }, pick([PAL.yellow, ...PAL.pastel, '#fff8f4'])); kit.add('ico', { pos: new THREE.Vector3(x, TOP + .03, z), scale: [.14, .05, .14] }, PAL.plants[2]); }
    }
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, x = cx + (a[0] + (b[0] - a[0]) * t) * 1.06, z = cz + (a[1] + (b[1] - a[1]) * t) * 1.06;
      kit.add('glowsphere', { pos: new THREE.Vector3(x, TOP + .01, z), scale: .035 }, '#fff3d6');
    }
  }
  // 長椅：步道內側
  [1, 3, 5].forEach((k) => {
    const [x, z] = hexMid(k, Pi - .32), yaw = Math.atan2(x, z);
    const p = new THREE.Vector3(cx + x, TOP + .07, cz + z);
    kit.add('box', { pos: p, rot: [0, yaw + Math.PI / 2, 0], scale: [.26, .03, .09] }, PAL.wood);
    kit.add('box', { pos: p.clone().add(new THREE.Vector3(x, 0, z).normalize().multiplyScalar(.04)).setY(TOP + .12), rot: [0, yaw + Math.PI / 2, 0], scale: [.26, .08, .02] }, PAL.wood);
  });
  kit.lod = false;
  // 外圈大樹：4–6 棵，各島樹種不同；避開正前方，不擋建物
  const ks = [0, 1, 2, 3, 5].slice(0, 4 + (isl.idx % 2));
  ks.forEach((k) => {
    const [x, z] = hexVert(k, 1.6 * isl.sc);
    if (!onWater(isl, x, z, .45)) addTree(isl.data.tree, cx + x, cz + z, rr(.72, .9)); // 整棵樹避開水面，不會只剩半棵
  });
  kit.skip = null;
}

// 光池：路燈下與窗前，強度乘上 night
function buildPools() {
  S.islands.forEach((isl) => isl.items.forEach((it) => {
    const f = it.frame;
    const p = new THREE.Vector3(0, 0, .55).multiplyScalar(f.size).applyAxisAngle(Y_AXIS, f.yaw).add(f.origin);
    POOLS.push({ x: p.x, z: p.z, r: .32 * f.size + .12 });
  }));
  const tex = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,199,119,1)'); gr.addColorStop(1, 'rgba(255,199,119,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat, POOLS.length);
  const m = new THREE.Matrix4();
  POOLS.forEach((p, i) => { m.makeScale(p.r, 1, p.r).setPosition(p.x, TOP + .015, p.z); mesh.setMatrixAt(i, m); });
  mesh.renderOrder = 3; mesh.visible = false;
  S.scene.add(mesh);
  nightListeners.push((n) => { mat.opacity = n * .55; mesh.visible = n > .01; });
}
