# 遊戲島（island）

TSO Games 的 3D 首頁：六角小島拼成的城市，每棟建物是一個遊戲，點開卡片按「開始遊戲」進入。
和「卡片首頁」是兩個並列的入口，使用者在首頁第一次選擇（見 `src/components/entry/`）。

## 來源與授權

改寫自 [KerryHuang/island-game](https://github.com/KerryHuang/island-game)（MIT 授權，授權全文見本目錄 `LICENSE`）。
原作的靈感來自「HEART 政策島」，程式依公開規格從零寫成。

我們做的改動：
- 內容由新聞議題改成 TSO 的遊戲（`data/games.json`、`parts/10-data.js`）
- 卡片改成「玩法／會練到／開始遊戲」，拿掉新聞來源、各方看法、城市日誌、中英切換
- 加入登入檢查（未登入退回首頁）、「卡片版」切換鈕、WebGL 失敗時退回卡片首頁
- Three.js 改為自己打包（`three@0.160.0`，由 `build.mjs` 複製到 `public/island/vendor/`），不再走 CDN

發布時會一併附上 `LICENSE-island-game.txt`（原作者授權）與 `vendor/LICENSE-three.txt`。

## 結構

```
island/
├── build.mjs          建置腳本：驗證資料 → 串接 parts → 輸出 public/island/（npm run dev / build 會自動執行）
├── data/games.json    每座島上有哪些遊戲（唯一需要常改的檔案）
├── parts/             原作的程式，依檔名順序串成單一 HTML；10-data.js 定義島與旅人路線
└── LICENSE            原作者的 MIT 授權
```

`build.mjs` 串接完會逐段做 `node --check` 語法檢查，有錯就中斷建置並指出行號（合併衝突留下的語法錯誤會讓島嶼頁整頁空白，資料驗證抓不到）。

`public/island/` 是建置產物，已被 `.gitignore` 排除，不要手動修改。

## 新增遊戲到島上

首頁的卡片（`src/pages/Home.tsx` 的 `GAMES`）與島嶼是**兩份資料**，新增遊戲時兩邊都要加。
只加卡片的話，建置會印出提醒（不會中斷）：`首頁有這些遊戲，但島嶼上還沒有`。

在 `data/games.json` 對應的島下面加一筆（下面的 `//` 註解只是說明，實際的 JSON 不能有註解）：

```json
{
  "id": "newgame",            // 與 Home.tsx 的 id 相同
  "name": "新遊戲名稱",
  "en": "New Game",
  "model": "house",           // 建物外觀，見下
  "status": "new",            // new 新遊戲｜debating 對戰｜progress 闖關｜settled 經典
  "heat": 3,                  // 0–3；3 會插旗並列入「新遊戲」，同島內熱度高的建物較大
  "path": "/newgame",         // React 路由
  "what": "玩法說明",
  "why": "會練到什麼",
  "views": [],
  "sources": [],
  "updated": "2026-11-01"     // 同熱度時，日期新的排前面
}
```

- `model`（建物外觀）有兩批，定義在 `parts/45-models.js`：
  - **TSO 專屬**：`chessboard`（西洋棋）、`endgame`（殘局）、`ship`（戰艦）、`blackboard`（數學冒險）、`blocks`（Minecraft）、`robot`（回家之路）、`ramp`（畫線滾球）、`castle`（三國）、`wordgrid`（方陣找找看）、`slitherlink`（數迴）、`guandu`（官渡）、`changban`（長坂坡）、`chibi`（赤壁）、`warcamp`（軍師戰棋）
  - **原作的市民生活建物**（保留備用）：`house`、`hall`、`booth`、`classroom`、`clinic`、`busstop`、`bikes`、`court`、`farm`、`river`、`stage`、`book`、`coin`、`clock`、`globe`
  - 新遊戲最好**畫一個專屬建物**，在 `MODELS` 加一個函式即可：用 `L('box', [x, y, z], [寬, 高, 深], '#色碼', [旋轉])` 在單位空間（底面 ±0.5、高 0–1.5、正面朝 +z）疊積木；可用形狀 `box rbox cylinder cone sphere ico dome torus prism hip`，`glowbox`／`glowsphere` 夜晚會發光。不要把建物放在右後角（新遊戲的旗子會插在那裡）
- 一般島最好放 1–4 款；超過會排不下。要放更多，在 `parts/10-data.js` 該島加 `scale`（例如三國島 `scale: 1.5`，約可放 25 棟）：島會變大、往外推開並自動重新排版。要新增島，在 `parts/10-data.js` 的 `islands` 加一筆（`q`、`r` 是六角座標，相鄰的島會自動搭橋）
- `views`、`sources` 保留為空陣列（沿用原作的欄位）
- 「新遊戲」旗：每座島只有 `heat: 3` 裡日期最新的 2 款插旗（`45-models.js` 的 `NEW_FLAGS`），避免整座島插滿旗；右側「新遊戲」清單仍列出所有 `heat: 3`

島的地面（`ground`）可用 `brick`、`speckle`、`stripe`、`checker`（棋盤格，棋盤島用）。

## 島的地圖設定（`parts/10-data.js` 的 islands，選填）

一般的島不用寫，建物會自動排。想讓島有主題地圖時（例如三國島照方位排成中國地圖），可以加：

| 欄位 | 作用 |
|---|---|
| `first: 'id'` | 指定主位（第一款、最大），不照熱度與日期排 |
| `layout: { id: { x, z, size, yaw } }` | 固定位置。座標是島內的區域座標（相對島中心，**`-z` 是北**），`size` 是建物大小（主位約 1.15、一般 0.8–0.9），`yaw` 是轉向 |
| `river: { z, w, amp }` | 一條東西向橫過島的河：中心在 `z`、寬 `w`、彎曲幅度 `amp` |
| `bay: { x, z, rx, rz, rot }` | 島邊的水灣（港口）：橢圓中心、長短半徑、旋轉角；超出島緣的部分會貼齊島邊。這是畫在島面上的水，島的側面岩壁仍是完整的 |
| `roads: true` | 從主位畫土路到其他有固定位置的建物；路經過水面時自動鋪木板橋 |

- 沒寫在 `layout` 的遊戲會自動找空位，並避開固定建物與水面，所以島上新增遊戲時不一定要改地圖
- 寫了 `layout` 的建物要放在 `inHex(x, z, 1.36 × scale − size / 2)` 範圍內，否則會壓到島邊步道或橋頭
- 島邊步道經過水面的地方會自動鋪木板，水面上的盆栽、串燈、樹會自動略過
- 每座島的隨機擺設（盆栽種類、樹的大小、建物微小角度）用各自的亂數種子（`48-world.js`），改一座島不會改到其他島與背景
- 改完執行 `npm run island` 驗證並重新產生，或直接 `npm run dev`

## 開發與測試

```sh
npm run island      # 只產生 public/island/
npm run dev         # 先建置島嶼，再啟動 vite；島嶼頁在 http://localhost:5173/Tso/island/index.html
```

島嶼頁用 WebGL，無頭瀏覽器需加 `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`。
