# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 5. Project-Specific: TSO Games (tso-games/)

### 架構
- `src/pages/` — 路由頁面（每個遊戲一個，搭配同名 `.css`）
- `src/components/<game>/` — 遊戲 UI 元件，同樣搭配同名 `.css`
- `src/chess/` — 純棋局邏輯（無 React），包含 board、moves、ai、notation、types
- 所有使用者介面文字用**繁體中文**

### 新增遊戲的標準步驟
1. `src/pages/<Name>Page.tsx` + `.css`（含導航列）
2. `src/components/<name>/`（元件與 CSS）
3. `src/App.tsx` 加路由
4. `src/pages/Home.tsx` 加卡片（GAMES 陣列）

### TypeScript 習慣
- 字面量聯合型別：`Color = 'w' | 'b'`、`Difficulty = 1|2|3|4|5`
- 棋盤座標一律用 `[number, number]`（rank, file）
- `Record<PieceType, T>` 取代 enum
- Props 型別在元件檔案內定義，不另行 export

### React 習慣
- 所有元件為函式元件，單一 `export default`
- 狀態更新用純函式：`setState(prev => applyMove(prev, move))`
- 不應觸發 re-render 的可變值用 `useRef`（isThinkingRef、timerRef、stateRef）
- `useCallback` 用於傳遞給子元件的 handler
- ESLint deps 刻意省略時加 `// eslint-disable-next-line react-hooks/exhaustive-deps` 並在上方說明原因

### CSS 習慣
- 類別名稱用 kebab-case，以元件縮寫為前綴（`ep-`、`cb-`、`cg-`）
- 深色主題：背景 `#0f1729`、金色強調 `#e4c97e`
- 棋盤格：亮格 `#f0d9b5`、暗格 `#b58863`
- RWD 斷點 600px（棋盤類）、900px（三欄改單欄）

### 棋局特有慣例
- rank 0 = 第 8 橫列（棋盤頂部）、file 0 = a 行
- 新增殘局位置前必須驗證 FEN 合法性（雙王存在、不相鄰、非行動方不被將）
- AI 在殘局位置同步執行（pieces 少，< 100ms）；完整棋局使用 Web Worker
- `AI_DIFFICULTY` 對應搜尋深度：1-2 同步，3-5 Worker
- localStorage 用於進度與存檔，key 名稱格式：`chess_<feature>`

