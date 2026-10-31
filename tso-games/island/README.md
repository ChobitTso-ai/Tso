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

- `model` 可用：`house`、`hall`、`booth`、`classroom`、`clinic`、`busstop`、`bikes`、`court`、`farm`、`river`、`stage`、`book`、`coin`、`clock`、`globe`
- 一座島最好放 1–4 款；超過會排不下。要新增島，在 `parts/10-data.js` 的 `islands` 加一筆（`q`、`r` 是六角座標，相鄰的島會自動搭橋）
- `views`、`sources` 保留為空陣列（沿用原作的欄位）
- 改完執行 `npm run island` 驗證並重新產生，或直接 `npm run dev`

## 開發與測試

```sh
npm run island      # 只產生 public/island/
npm run dev         # 先建置島嶼，再啟動 vite；島嶼頁在 http://localhost:5173/Tso/island/index.html
```

島嶼頁用 WebGL，無頭瀏覽器需加 `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`。
