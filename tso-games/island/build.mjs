// 把 island/parts 串成 public/island/index.html，並把 three 的執行檔複製到 public/island/vendor。
// 在 npm run dev / build 之前自動執行。產物在 public/island/，已被 .gitignore 排除，不要手動修改。
//
// 本頁改寫自 KerryHuang/island-game（MIT 授權），授權全文見 island/LICENSE。
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'island')
const OUT = join(ROOT, 'public', 'island')
const fail = (msg) => { console.error(`[island] 錯誤：${msg}`); process.exit(1) }

// ---------- 讀資料與驗證 ----------
const games = JSON.parse(readFileSync(join(SRC, 'data', 'games.json'), 'utf8'))
const dataJs = readFileSync(join(SRC, 'parts', '10-data.js'), 'utf8')
const modelsJs = readFileSync(join(SRC, 'parts', '45-models.js'), 'utf8')

const islandIds = [...dataJs.slice(dataJs.indexOf('islands: ['), dataJs.indexOf('flows: [')).matchAll(/\{ id: '(\w+)'/g)].map((m) => m[1])
const models = new Set([...modelsJs.matchAll(/^ {2}(\w+)\(L\) \{/gm)].map((m) => m[1]))
const REQUIRED = ['id', 'name', 'model', 'status', 'heat', 'path', 'what', 'why', 'updated']
const STATUSES = ['new', 'debating', 'progress', 'settled']

const seen = new Set()
for (const key of Object.keys(games)) if (!islandIds.includes(key)) fail(`games.json 有未定義的島「${key}」，島要先在 parts/10-data.js 的 islands 定義`)
for (const [island, list] of Object.entries(games)) {
  for (const g of list) {
    for (const f of REQUIRED) if (g[f] === undefined || g[f] === '') fail(`${island}/${g.id ?? '?'} 缺少欄位 ${f}`)
    if (seen.has(g.id)) fail(`遊戲 id 重複：${g.id}`)
    seen.add(g.id)
    if (!models.has(g.model)) fail(`${g.id} 的 model「${g.model}」不存在，可用：${[...models].join('、')}`)
    if (!STATUSES.includes(g.status)) fail(`${g.id} 的 status「${g.status}」不合法，可用：${STATUSES.join('、')}`)
    if (!(g.heat >= 0 && g.heat <= 3)) fail(`${g.id} 的 heat 必須是 0–3`)
    if (!g.path.startsWith('/')) fail(`${g.id} 的 path 必須以 / 開頭（例如 /chess）`)
  }
}

// 提醒（不中斷建置）：首頁卡片有的遊戲，島嶼上也要有
const homeSrc = readFileSync(join(ROOT, 'src', 'pages', 'Home.tsx'), 'utf8')
const homeIds = [...homeSrc.matchAll(/^ {4}id: '(\w+)',/gm)].map((m) => m[1])
const missing = homeIds.filter((id) => !seen.has(id))
if (missing.length) console.warn(`[island] 提醒：首頁有這些遊戲，但島嶼上還沒有：${missing.join('、')}。請加到 island/data/games.json`)

// ---------- 串接 ----------
const names = readdirSync(join(SRC, 'parts')).sort()
let html = ''
for (const name of names) {
  if (name.startsWith('10-')) html += `const ISSUES = ${JSON.stringify(games).replace(/<\//g, '<\\/')};\n`
  html += readFileSync(join(SRC, 'parts', name), 'utf8')
}
const doc = '<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
  '<!-- 由 island/build.mjs 產生，請勿手動修改。改寫自 KerryHuang/island-game（MIT），見 LICENSE-island-game.txt -->\n' + html

// ---------- 輸出與 vendor ----------
const THREE = join(ROOT, 'node_modules', 'three')
if (!existsSync(THREE)) fail('找不到 node_modules/three，請先執行 npm install')
mkdirSync(join(OUT, 'vendor', 'addons'), { recursive: true })
writeFileSync(join(OUT, 'index.html'), doc)
copyFileSync(join(THREE, 'build', 'three.module.min.js'), join(OUT, 'vendor', 'three.module.min.js'))
const ADDONS = ['controls/OrbitControls.js', 'renderers/CSS2DRenderer.js', 'geometries/RoundedBoxGeometry.js', 'utils/BufferGeometryUtils.js', 'math/SimplexNoise.js']
for (const a of ADDONS) {
  mkdirSync(dirname(join(OUT, 'vendor', 'addons', a)), { recursive: true })
  copyFileSync(join(THREE, 'examples', 'jsm', a), join(OUT, 'vendor', 'addons', a))
}
copyFileSync(join(SRC, 'LICENSE'), join(OUT, 'LICENSE-island-game.txt'))
copyFileSync(join(THREE, 'LICENSE'), join(OUT, 'vendor', 'LICENSE-three.txt'))

console.log(`[island] 完成：${seen.size} 款遊戲、${islandIds.length} 座島 → public/island/index.html（${(doc.length / 1024).toFixed(0)} KB）`)
