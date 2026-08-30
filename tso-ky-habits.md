# Tso KY 個人開發習慣（部分備份）

> ## ⚠️ 這不是母本，不要覆蓋回本機
>
> **權威版本是本機的 `~/.claude/CLAUDE.md`，本檔只是它的部分備份。**
>
> 本檔曾在檔頭寫「本檔是母本，複製回 `~/.claude/CLAUDE.md` 即可生效」——
> 那個說明已經過期且危險。本機版本後續新增了本檔沒有的內容，
> 照舊說明覆蓋回去會把那些設定洗掉。
>
> ### 已知本檔缺少（僅存在於本機版本）
>
> - 全域母區啟動規則（指向 `D:\AI Workstation`）
> - 文件輸出流程
> - Skill 路由
> - 自動維護規則
>
> 這些內容雲端工作階段讀不到本機檔案，無法補齊。
> 要讓本檔恢復成完整母本，需由使用者把本機 `~/.claude/CLAUDE.md` 的內容貼過來。
>
> ### 同步方向
>
> **本機 → repo**（單向）。repo 這份只作為版本控制的留存，
> 不可反向覆蓋本機，也不應作為唯一依據。
>
> ### 專案慣例不在這裡
>
> TSO Games 的架構與開發慣例已全部移入專案根目錄的 `CLAUDE.md`，
> 本檔只保留跨專案通用的個人設定。

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

全域規則（本機 `~/.claude/CLAUDE.md`）優先級低於專案層級，
但核心規則（署名、程式碼保護、輸出流程）不可被專案層級覆蓋。
