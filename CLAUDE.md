# Tso 專案開發習慣

## 技術棧

- React 19 + TypeScript（嚴格模式）
- Vite 8（構建工具，base path `/Tso/` for GitHub Pages）
- React Router DOM 7
- ESLint 10（typescript-eslint + react-hooks plugin）
- 純 CSS（無 Tailwind、無 CSS-in-JS）

## 目錄結構

```
tso-games/src/
├── pages/          # 頁面元件（Home, ChessPage, KidibotPage, MinecraftQuiz）
├── components/     # 遊戲特定 UI 元件（按遊戲分子目錄）
│   ├── chess/
│   ├── kidibot/
│   └── minecraft/
├── chess/          # Chess 業務邏輯（types, board, moves, ai, notation, save）
└── App.tsx, main.tsx
```

## 命名慣例

- 元件檔案、函數：`PascalCase`（`ChessGame.tsx`）
- 一般函數、變數：`camelCase`（`parseFen`, `applyMove`）
- 常數、設定對象：`UPPER_CASE`（`PIECE_VALUE`, `LEVELS`, `TILE_DISPLAY`）
- CSS 類名：`kebab-case`（`game-card`, `kb-level-btn`）
- 一般檔案名：`kebab-case`（`game-setup.tsx`, `chess-board.tsx`）

## 程式碼風格

- 縮排：2 個空格
- 引號：JS/TS 用單引號，JSX 屬性用雙引號
- 分號：永遠加
- 元件宣告：`export default function ComponentName() {...}`
- Type 導入獨立：`import type { T } from '...'`
- 嚴格 TypeScript：無 `any`，無未使用變數/參數

## Git Commit 格式

使用 Conventional Commits，可帶範圍：

```
feat(kidibot): v2 — 15 levels, localStorage progress
fix: turn tile labels now show both connection directions
refactor: remove redundant level from useEffect dependency array
```

- 中英文提交訊息都可接受
- 範圍用括號：`feat(kidibot):`, `ci:`

## 狀態管理

- 只用 React Hooks（無 Redux、無 Context API）
- `useState` 本地狀態，`useRef` 鎖定/計時器，`useEffect` 副作用
- 不可變更新：`prev.map(r => [...r])` 深拷貝陣列
- AI 思考鎖定用 `isThinkingRef.current` 防重複觸發
- Web Worker 隔離密集計算（`ai.worker.ts`）

```typescript
// 典型初始狀態模式
const [state, setState] = useState<GameState>(() => createInitialState())

// 思考鎖定模式
const isThinkingRef = useRef(false)
useEffect(() => {
  if (isThinkingRef.current) return
  isThinkingRef.current = true
  // trigger AI...
}, [state, config]) // eslint-disable-line react-hooks/exhaustive-deps
```

## localStorage 模式

```typescript
const STORAGE_KEY = 'gameKey'
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') ?? defaultValue
  } catch {
    return defaultValue
  }
}
```

## CSS 風格

- 每個元件對應一個 `.css` 檔（`Component.tsx` + `Component.css`）
- 暗色主題優先：背景 `#0f1729`，文字 `#e0e0e0`，強調色 `#e4c97e`（金色）
- BEM-like 類名：`.game-card`、`.game-card:hover`、`.game-card.unavailable`
- 響應式用 `@media (max-width: 1024px)`
- 動畫用 `transition: all 0.15s` 和 `@keyframes`

## 條件類名模式

```typescript
// 陣列過濾法
className={['square', isLight ? 'light' : 'dark', isSelected ? 'selected' : ''].filter(Boolean).join(' ')}

// 模板字串法
className={`kb-level-btn ${i === levelIdx ? 'active' : ''} ${starClass(i)}`}
```

## 常數管理

將顯示設定、難度標籤等集中為常數對象，作為單一真實來源：

```typescript
const LEVELS: Level[] = [...]
const TILE_DISPLAY: Record<TileType, string> = {...}
const DIFFICULTY_LABELS: Record<Difficulty, string> = {...}
```

## 業務邏輯與 UI 分離

- 核心演算法單獨成檔（如 `chess/board.ts`, `chess/moves.ts`）
- 元件只負責 UI 和狀態，不含演算法邏輯

## 語言

- 程式碼、類名、變數名：英文
- UI 文字、使用者訊息：中文
- 提交訊息：中英文皆可
