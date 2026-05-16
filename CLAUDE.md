# TSO Games 專案規範

> 本文件記錄 TSO Games 專案的開發慣例、架構設計與最佳實踐

---

## 通用開發原則

### 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

### 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals with clear verification steps.

---

## 📁 專案結構

```
Tso/
├── tso-games/              # React 主應用程式（前端）
│   ├── src/
│   │   ├── components/     # 遊戲元件
│   │   │   ├── chess/      # 西洋棋遊戲
│   │   │   ├── minecraft/  # Minecraft 測驗
│   │   │   └── kidibot/    # 回家之路（程式謎題）
│   │   ├── pages/          # 頁面元件
│   │   │   ├── Home.tsx    # 首頁（遊戲選單）
│   │   │   ├── ChessPage.tsx
│   │   │   ├── MinecraftQuiz.tsx
│   │   │   └── KidibotPage.tsx
│   │   ├── chess/          # 西洋棋邏輯（純 TS）
│   │   └── App.tsx         # 路由配置
│   └── public/             # 靜態資源
├── docs/                   # 靜態 HTML 版本（舊版）
├── .github/workflows/      # GitHub Actions 部署
└── *.py, *.txt            # Python 桌面版、範例題目
```

## 🎯 核心理念

### 1. 多遊戲平台
- **統一首頁**：所有遊戲從 `/` 進入選擇
- **獨立路由**：每個遊戲有專屬路由（`/chess`, `/minecraft`, `/kidibot`）
- **模組化設計**：每個遊戲獨立資料夾，互不干擾

### 2. 使用者體驗
- **免登入**：所有遊戲無需註冊即可遊玩
- **本地存檔**：使用 `localStorage` 保存進度
- **中文優先**：UI、文案、註解皆使用繁體中文
- **響應式設計**：支援桌面與行動裝置

### 3. 開發原則
- **TypeScript 優先**：型別安全，減少執行時錯誤
- **元件化**：邏輯與 UI 分離，可重用性高
- **漸進增強**：先實現核心功能，再添加進階特性

---

## 💻 技術棧

### 前端框架
- **React 19.x** - UI 函式庫
- **TypeScript 6.x** - 型別系統
- **Vite 8.x** - 建置工具
- **React Router 7.x** - 路由管理

### 樣式
- **原生 CSS** - 無預處理器，直接使用 CSS3
- **CSS Modules** - 檔名規範：`ComponentName.css` 與 `ComponentName.tsx` 同目錄
- **命名前綴**：各遊戲使用獨立前綴避免衝突
  - Minecraft: `.mc-*`
  - Kidibot: `.kb-*`
  - Chess: `.chess-*`

### 部署
- **GitHub Pages** - 靜態網站託管
- **GitHub Actions** - 自動化建置與部署
- **Base Path**: `/Tso/` （注意大小寫）

---

## 📝 程式碼規範

### 命名慣例

```typescript
// 元件：PascalCase
export default function MinecraftGame() { }

// 函式/變數：camelCase
const loadQuestions = () => { }
const [gameState, setGameState] = useState()

// 常數：UPPER_SNAKE_CASE
const STORAGE_KEY = 'minecraftQuizGame'
const SHOP_ITEMS = [...]

// 型別/介面：PascalCase
interface GameState { }
type Question = { }

// CSS 類別：kebab-case with prefix
.mc-header { }
.mc-stat-box { }
```

### 檔案命名
- **元件**：`ComponentName.tsx`
- **樣式**：`ComponentName.css`
- **工具函式**：`utility.ts`
- **型別定義**：`types.ts`

### 註解原則
```typescript
// ✅ 好的註解：解釋「為什麼」
// 答錯扣 1 點體力（原版設計）
health: prev.health - 1

// ❌ 避免：解釋「做什麼」（程式碼已說明）
// 設定健康值
health: prev.health - 1
```

---

## 🎮 新增遊戲流程

### 1. 建立元件結構
```bash
mkdir -p tso-games/src/components/newgame
touch tso-games/src/components/newgame/NewGame.tsx
touch tso-games/src/components/newgame/NewGame.css
```

### 2. 建立頁面元件
```bash
touch tso-games/src/pages/NewGamePage.tsx
touch tso-games/src/pages/NewGamePage.css
```

### 3. 註冊路由（`App.tsx`）
```typescript
import NewGamePage from './pages/NewGamePage'

<Route path="/newgame" element={<NewGamePage />} />
```

### 4. 加入首頁（`Home.tsx`）
```typescript
const GAMES: GameCard[] = [
  // ...
  {
    id: 'newgame',
    title: '新遊戲名稱',
    description: '遊戲描述',
    icon: '🎮',
    path: '/newgame',
    available: true,
  },
]
```

### 5. 遊戲狀態管理
```typescript
// 使用 localStorage 持久化
const STORAGE_KEY = 'newGameState'

useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) setGameState(JSON.parse(saved))
}, [])

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
}, [gameState])
```

---

## 🔄 Git 工作流程

### 分支命名
```bash
# 格式：claude/{description}-{sessionId}
claude/minecraft-quiz-game-UaK8n
claude/organize-site-structure-ZVlba
```

### Commit 訊息格式
```bash
# 中文描述，清楚說明改動目的
git commit -m "新增 Minecraft 知識競賽遊戲功能

實作 Minecraft 主題的測驗遊戲：
- 支援選擇題和填空題
- 實作遊戲機制：金幣、體力、商店
- 使用 localStorage 自動存檔

https://claude.ai/code/session_xxxxx"
```

### Commit 類型
- `新增` - 新功能
- `修正` - Bug 修復
- `更新` - 功能改進
- `重構` - 程式碼重構
- `fix:` - 緊急修復（英文）
- `ci:` - CI/CD 相關

### 合併策略
- **Merge Commit** 優先（保留完整歷史）
- 避免 Squash（保留開發過程）
- 避免 Force Push 到共享分支

---

## 🚀 開發與部署

### 本地開發
```bash
cd tso-games
npm install          # 安裝依賴
npm run dev          # 開發伺服器（http://localhost:5173）
npm run build        # 建置生產版本
npm run preview      # 預覽建置結果
```

### 建置前檢查
```bash
# 1. 型別檢查
npm run build

# 2. 檢查建置產物
ls -lh tso-games/dist/

# 3. 測試路由
# 確認 Hash Router 正常（URL 包含 #）
```

### 部署流程
1. **推送到分支** → GitHub Actions 觸發（若分支在 `deploy.yml` 中）
2. **建立 PR** → 合併前可預覽
3. **合併到 main** → 自動部署到 https://chobittso-ai.github.io/Tso/
4. **等待 1-2 分鐘** → GitHub Pages 更新

### 部署檢查清單
- [ ] `vite.config.ts` base 為 `/Tso/`
- [ ] 所有路由使用 `HashRouter`
- [ ] 靜態資源路徑正確（`public/` 目錄）
- [ ] `.github/workflows/deploy.yml` 路徑為 `tso-games/`

---

## 🎨 UI/UX 設計模式

### 色彩系統
```css
/* 依遊戲主題定義色彩變數 */
/* Minecraft 主題 */
--mc-grass: #5FAD41;
--mc-gold: #FFD700;
--mc-stone: #7F7F7F;
--mc-health: #FF5555;

/* 通用 */
--bg-dark: #2C2C2C;
--text-light: #FFFFFF;
```

### 按鈕樣式
- **主要動作**：綠色（開始遊戲、確認）
- **次要動作**：藍色（一般功能）
- **警告動作**：紅色（刪除、重置）
- **Hover 效果**：微暗 + 位移

### 響應式斷點
```css
@media (max-width: 768px) {
  /* 手機版調整 */
}
```

### 圖示使用
- **優先使用 Emoji**（無需外部資源）
- 次選：SVG icons

---

## 🐛 常見問題與解決方案

### 1. 404 錯誤（新增頁面後）
**原因**：路由未註冊或 HashRouter 配置錯誤  
**解決**：
1. 檢查 `App.tsx` 是否有對應 `<Route>`
2. 確認使用 `HashRouter` 而非 `BrowserRouter`
3. URL 應為 `https://.../Tso/#/gamename`

### 2. 本地存檔遺失
**原因**：localStorage key 改變或瀏覽器清除資料  
**解決**：
1. 檢查 `STORAGE_KEY` 命名一致性
2. 提供匯出/匯入功能（參考 Minecraft 遊戲）

### 3. 部署後樣式跑版
**原因**：CSS 路徑錯誤或 base path 設定錯誤  
**解決**：
1. 檢查 `vite.config.ts` 中 `base: '/Tso/'`
2. CSS 檔案與元件同目錄
3. 使用相對路徑引入

### 4. Build 失敗
**原因**：TypeScript 型別錯誤  
**解決**：
```bash
# 查看詳細錯誤
npm run build 2>&1 | less

# 常見問題：
# - 缺少型別定義
# - 未使用的變數
# - 型別不匹配
```

### 5. 體力扣除錯誤（Minecraft 特定）
**重要**：答錯扣除 **1 點體力**（非 10 點）  
參考原始 Python 版本：`self.health -= 1`

---

## 📚 學習資源

### 專案內部文件
- `README.md` - 專案簡介
- `README_GAME.md` - 遊戲說明（Minecraft Python 版）
- `INSTALL_v3.md` - Python 版安裝指南

### 外部資源
- [React 官方文件](https://react.dev/)
- [TypeScript 手冊](https://www.typescriptlang.org/docs/)
- [Vite 文件](https://vitejs.dev/)
- [React Router 文件](https://reactrouter.com/)

---

## 🤝 貢獻指南

### 開發新功能前
1. **閱讀本文件**了解專案慣例
2. **檢查現有遊戲**學習架構模式
3. **建立功能分支** `claude/feature-name-sessionId`

### 程式碼品質
- ✅ TypeScript 無錯誤
- ✅ 元件可重用
- ✅ 註解清晰（中文）
- ✅ 響應式設計
- ✅ localStorage 存檔

### 提交前檢查
```bash
# 1. 本地測試
npm run dev  # 手動測試功能

# 2. 建置測試
npm run build

# 3. 提交
git add .
git commit -m "清楚的中文描述

詳細說明改動內容

https://claude.ai/code/session_xxxxx"

# 4. 推送
git push -u origin <branch-name>
```

---

## 🎯 專案目標與願景

### 短期目標
- ✅ 三個核心遊戲（西洋棋、Minecraft、回家之路）
- ⬜ 更多學習類遊戲
- ⬜ 多語言支援（英文）

### 長期願景
- **學習平台**：結合遊戲與教育
- **社群功能**：分享題目、排行榜
- **離線支援**：PWA 化
- **跨平台**：桌面應用（Electron）

---

## 📞 聯絡資訊

- **GitHub**: https://github.com/ChobitTso-ai/Tso
- **網站**: https://chobittso-ai.github.io/Tso/
- **Issues**: https://github.com/ChobitTso-ai/Tso/issues

---

**最後更新**: 2026-05-16  
**維護者**: ChobitTso-ai  
**授權**: MIT License (待確認)
