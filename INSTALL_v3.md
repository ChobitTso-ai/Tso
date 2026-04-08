# Minecraft 測驗遊戲 v3.0 安裝指南

## 新功能預覽

### 1. 選擇題系統 ✅
- 自動識別選擇題
- 點擊式選項按鈕
- 支援 A/B/C/D 格式

### 2. API Key 管理 🔑  
- 安全儲存 Claude API Key
- 首次啟動時輸入
- 可隨時管理（測試/刪除）

### 3. Claude API 智能拆解 🤖
- 自動解析任何格式考卷
- 支援圖片和 PDF（未來）
- AI 自動識別題型

---

## 安裝步驟

### 1. 安裝 Python 依賴

```bash
pip install anthropic Pillow
```

或使用 requirements.txt：

```bash
pip install -r requirements.txt
```

### 2. 取得 Claude API Key（可選）

1. 前往 https://console.anthropic.com/
2. 註冊/登入帳號
3. 在 API Keys 頁面創建新的 API Key
4. 複製 API Key（格式：sk-ant-xxx）

### 3. 執行遊戲

```bash
python minecraft_quiz.py
```

首次執行時會詢問是否輸入 API Key，可選擇「稍後再說」跳過。

---

## 使用說明

### 選擇題格式

支援的選擇題格式：

```
問題？
A. 選項1
B. 選項2  
C. 選項3
D. 選項4
答：A
```

或：

```
問題？ (A)選項1 (B)選項2 (C)選項3 (D)選項4 答案：A
```

### 智能輸入

1. 點擊「✏️ 智能輸入題目」
2. 貼上考卷內容
3. AI 自動解析（需要 API Key）或使用規則匹配

### API Key 管理

在開始畫面：
- 查看 API 狀態
- 點擊「🔑 管理 API Key」進行設定
- 測試連線確認有效性

---

## 常見問題

**Q: 沒有 API Key 能用嗎？**  
A: 可以！基本功能（手動輸入、檔案上傳、規則解析）完全可用，只有 AI 智能拆解需要 API Key。

**Q: API Key 會被儲存在哪裡？**  
A: `Documents/Minecraft quiz game/config.json`，使用 base64 編碼（非加密）。

**Q: 選擇題如何顯示？**  
A: 自動識別後會顯示選項按鈕，點擊即可作答。

**Q: 支援哪些題型？**  
A: 選擇題（A/B/C/D）和填空題。

---

## 版本更新日誌

### v3.0 (即將推出)
- ✅ 選擇題系統
- ✅ API Key 管理
- ✅ Claude API 智能拆解
- ✅ 改進的題目解析

### v2.0 (當前版本)
- ✅ RPG 式遊戲系統
- ✅ 金幣、體力、商店
- ✅ 三個存檔槽位
- ✅ 自動儲存

---

## 技術支援

如有問題請在 GitHub Issues 回報。
