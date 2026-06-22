# CLAUDE.md — 全域個人設定
# Tso KY｜所有專案通用規則
#
# 用法：本檔是「母本」，存放於 Tso repo 以版本控制保存。
# 在本機把本檔內容複製/同步到 ~/.claude/CLAUDE.md，即可跨所有專案生效。

---

## 身份與背景

- 使用者：Dr. Tso KY，牙科醫師，兼職工具開發者
- 主要用途：為醫療/行政情境開發實用 Python/JavaScript 工具
- 使用者群：同事與非技術人員（無 Python 環境）
- 工作語言：繁體中文（zh-TW），所有回覆、註解、UI 文字一律使用繁體中文

---

## 署名規則（每個工具必須包含）

```
© [年份] Tso KY - All Rights Reserved
Protected against reverse engineering and unauthorized modification
```

- 每支程式的 docstring 最上方必須包含完整署名
- 每個工具必須有版本號碼（格式：v1.0、v1.1……）
- 版本號寫在 docstring 與視窗標題列

---

## 程式碼保護（Python 工具標配）

每支工具必須包含以下保護機制：

```python
_APP_SIGNATURE = "<base64 encoded app identifier>"
_AUTHOR_HASH   = "<SHA256 of author string>"
_PROTECTION_KEY = "<numeric key>"
_VERSION = "x.x"

def _verify_integrity(): ...   # base64 解碼驗證
def _anti_debug(): ...         # 時間差異反調試偵測
```

- 啟動時執行 `_verify_integrity()` 與 `_anti_debug()`
- 驗證失敗時顯示警告並終止程式
- 加密字串以 base64 混淆，不以明文儲存

---

## 輸出流程（每次都要遵守）

```
Step 1：輸出基本可運行工具（主程式只）
Step 2：使用者測試、回報問題、修正
Step 3：確認功能正常後，才詢問「要輸出打包 BAT 和 README 嗎？」
Step 4：確認後才輸出打包腳本與說明文件
```

**禁止跳步驟。** 不要在使用者測試前就主動輸出打包腳本。

---

## 技術偏好

### Python
- GUI：tkinter（不用 tkinterdnd2，不穩定）
- 打包：PyInstaller，`python -m PyInstaller`
- 主要 flags：`--onefile --windowed --noconsole`
- 來源檔必須先改為 ASCII 檔名再打包（避免中文路徑問題）

**tkinter 慣例（從 minecraft_quiz.py 萃取）：**
- 配色定義為 class 頂端的 `self.colors = {'key': '#hex', ...}` dict，所有元件引用這個 dict
- UI 元件用 `create_*` 工廠方法建立（如 `create_button()`、`create_save_slot()`），保持 `__init__` 簡潔
- 模態子視窗用 `tk.Toplevel(self.root)`，不用新 `tk.Tk()`
- 多行唯讀文字用 `scrolledtext.ScrolledText(..., state=tk.DISABLED)`，更新時先 `NORMAL` 再 `DISABLED`
- 定時器（自動存檔等）用 `self.root.after(ms, self.method)`，方法末尾再次呼叫自己形成迴圈
- 存檔路徑統一：`Path.home() / "Documents" / "工具名稱" / "saves" / f"save_{id}.json"`
- JSON 存檔：`json.dump(..., ensure_ascii=False, indent=2)`，讀寫都指定 `encoding='utf-8'`
- 按鈕文字與 messagebox 訊息可以用 emoji 增加視覺辨識度
- Event binding 用 `lambda e: self.method()`（注意吃掉 event 參數）

### 媒體處理
- FFmpeg（外部執行檔，不嵌入）
- yt-dlp、pydub

### PDF
- PyMuPDF（fitz）、PyPDF2、python-pptx

### Excel
- openpyxl

### AI API
- Anthropic Claude API、OpenAI GPT、Google Gemini
- Gemini 需實作多模型 fallback（配額錯誤時自動換模型）

### Office 自動化
- win32com.client（使用 DispatchEx，不用 Dispatch）
- pythoncom、pywintypes

### 資料
- SQLite、CSV、JSON
- 環境變數存 API key（.env 檔）

### JavaScript — Bookmarklet
- 用傳統 `function` 宣告，不用箭頭函式
- 避免 Chrome 書籤長度限制問題

### JavaScript — TSO Games（React/TypeScript）
- 框架：React 19 + TypeScript + Vite
- 路由：React Router v7，**必須用 HashRouter**（GitHub Pages 不支援 server-side routing）
- 部署：GitHub Pages，`vite.config.ts` 的 `base` 設為 `/Tso/`
- 持久化：localStorage
- 重運算：Web Worker（避免 UI 卡頓，如 AI 棋局計算）

---

## TSO Games 專案架構慣例

### 目錄結構
```
tso-games/src/
├── App.tsx                        ← 路由定義，只有這裡加 Route
├── pages/<Name>Page.tsx/css       ← 薄包裝層：nav 列 + 引入 component
├── components/<feature>/          ← UI 邏輯與狀態（hooks）
└── <feature>/                     ← 純邏輯層，不依賴 React
```

### 新增遊戲標準流程（四步驟）
1. 建立 `src/components/<name>/` — 遊戲主體邏輯與 UI
2. 建立 `src/pages/<Name>Page.tsx` — nav 列包裝，設定 `document.title`
3. `App.tsx` 加一條 `<Route path="/<name>" element={<NamePage />} />`
4. `Home.tsx` 的 `GAMES` 陣列加一張卡片（含 id、title、description、icon、path、available）

### 固定慣例
- 每個 Page component 第一行設定標題：`document.title = '頁面名 | TSO'`
- CSS 與元件 co-located（`ChessBoard.tsx` + `ChessBoard.css` 同目錄）
- 返回首頁統一用：`<Link to="/">← 首頁</Link>`
- 只有 `main` branch 觸發 GitHub Pages 部署（`deploy.yml`）
- 已合併的 feature branch 可以直接刪除，不影響 main 的程式碼

### 三國演義 hub 子遊戲串接流程
三國演義是 hub 頁面（`/threekingdoms`），底下掛多個子遊戲。**每個子遊戲開一個新對話開發，做完合併再開下一個**（避免多對話同時改 `App.tsx`、`ThreeKingdomsPage.tsx` 造成 git 衝突）。

新子遊戲標準四步驟：
1. 建立 `src/components/<name>/` — 子遊戲主體邏輯與 UI
2. 建立 `src/pages/<Name>Page.tsx` — nav 列包裝，`document.title = '子遊戲名 | TSO'`，返回鍵指向 `/threekingdoms`（不是首頁）
3. `App.tsx` 加 `<Route path="/<name>" element={<NamePage />} />`
4. **`ThreeKingdomsPage.tsx` 的 `MINI_GAMES` 陣列**加一張卡片（不是首頁 `Home.tsx` 的 `GAMES`）

主題配色：紅黑（`#c0392b` 主色、`#1a0a0a` 卡片底、`#e74c3c` hover）。

### TypeScript / React 慣例（從 tso-games 萃取）
- **Export 規則**：component 用 `export default function`，工具函式用 `export function`（named）
- **型別集中**：每個功能模組放一支 `types.ts`（如 `chess/types.ts`），所有相關 interface/type 集中於此
- **常數型別**：用 `Record<>` 明確標型（如 `const PIECE_VALUE: Record<string, number> = {...}`）
- **懶初始化**：useState 傳函式避免重複計算：`useState<T>(() => createInitialState())`
- **Stale closure 防護**：useEffect 依賴複雜 state/config 時，改用 `useRef` 持有最新值，effect 內讀 `ref.current`（需寫短註解說明原因）
- **純邏輯分層**：棋局計算、關卡資料等純邏輯放 `<feature>/` 資料夾（不 import React），component 只負責 UI + hooks
- **nav 列模式**：`<Link to="/" className="nav-home">← 首頁</Link>` + `<span className="nav-title">頁面名</span>`
- **首頁卡片清單**：`GAMES` 陣列搭配 `GameCard` interface，`available: false` 時顯示「敬請期待」

---

## Windows 已知問題與解法

| 問題 | 解法 |
|------|------|
| 中文檔名導致打包失敗 | 改為 ASCII 檔名再執行 PyInstaller |
| 資料夾名稱「downloads」權限錯誤 | 改用絕對路徑，或換資料夾名稱 |
| subprocess 中文亂碼 | `encoding='utf-8', errors='ignore'` |
| BAT 檔中文亂碼 | BAT 檔全程只用英文 |
| COM API 多實例衝突 | 用 `DispatchEx` 取代 `Dispatch` |

---

## 程式碼撰寫原則

1. **先想後寫**：有多種解讀方式時全部列出，不默默選一個
2. **極簡優先**：只寫解決問題所需的最少程式碼，不加未被要求的功能
3. **精準修改**：只動該動的地方，不順手優化無關程式碼
4. **目標導向**：多步驟任務先列計劃，執行完驗證

---

## 禁止事項

- 不在使用者測試前輸出打包腳本
- 不主動加「彈性」、「可設定性」等未被要求的功能
- 不重構沒壞掉的程式碼
- 不在 BAT 檔使用中文
- 不用 tkinterdnd2

---

## 專案層級 CLAUDE.md

各專案資料夾內可放專案專屬的 CLAUDE.md，記錄：
- 目前版本號
- 專案特有邏輯
- 使用的 API 金鑰環境變數名稱
- 已知 bug 或待辦事項

全域（本檔）規則優先級低於專案層級，但核心規則（署名、保護、輸出流程）不可被覆蓋。
