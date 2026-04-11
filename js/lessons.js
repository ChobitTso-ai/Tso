// 課程內容資料
const LESSONS = {
  1: {
    title: "什麼是 Git 與 GitHub？",
    content: `
      <div class="lesson-content">
        <h2>🌐 什麼是 Git 與 GitHub？</h2>
        <p class="subtitle">課程 1／6 · 概念介紹</p>

        <h3>Git 是什麼？</h3>
        <p>
          <strong>Git</strong> 是一套「版本控制系統」，安裝在你自己的電腦上。
          它就像一台時光機，每次你儲存（commit），Git 就會記住當時的程式碼狀態。
          未來你可以隨時回到任何一個版本。
        </p>

        <h3>GitHub 是什麼？</h3>
        <p>
          <strong>GitHub</strong> 是一個網站，讓你把 Git 管理的程式碼存到雲端。
          你可以和別人共同開發、查看程式碼歷史，也可以公開你的作品集。
        </p>

        <div class="tip">
          <strong>💡 簡單比喻</strong>
          Git = 儲存遊戲進度的功能（在你電腦上）<br>
          GitHub = 把進度上傳到雲端，讓朋友也能看到
        </div>

        <h3>為什麼要學 Git？</h3>
        <ul>
          <li>防止程式碼被意外刪除或改壞</li>
          <li>可以多人同時開發同一個專案</li>
          <li>所有變更都有記錄，方便追蹤 bug</li>
          <li>幾乎所有公司都在用，是必備技能</li>
        </ul>

        <h3>Git vs GitHub 差異整理</h3>
        <table style="width:100%; border-collapse:collapse; font-size:.9rem; margin-top:8px;">
          <tr style="background:#f6f8fa;">
            <th style="padding:10px; border:1px solid #d0d7de; text-align:left;">項目</th>
            <th style="padding:10px; border:1px solid #d0d7de; text-align:left;">Git</th>
            <th style="padding:10px; border:1px solid #d0d7de; text-align:left;">GitHub</th>
          </tr>
          <tr>
            <td style="padding:10px; border:1px solid #d0d7de;">安裝位置</td>
            <td style="padding:10px; border:1px solid #d0d7de;">你的電腦</td>
            <td style="padding:10px; border:1px solid #d0d7de;">網路上的網站</td>
          </tr>
          <tr style="background:#f6f8fa;">
            <td style="padding:10px; border:1px solid #d0d7de;">主要功能</td>
            <td style="padding:10px; border:1px solid #d0d7de;">本地版本控制</td>
            <td style="padding:10px; border:1px solid #d0d7de;">雲端存放與協作</td>
          </tr>
          <tr>
            <td style="padding:10px; border:1px solid #d0d7de;">需要網路</td>
            <td style="padding:10px; border:1px solid #d0d7de;">不需要</td>
            <td style="padding:10px; border:1px solid #d0d7de;">需要</td>
          </tr>
        </table>
      </div>
    `
  },

  2: {
    title: "安裝與設定 Git",
    content: `
      <div class="lesson-content">
        <h2>⚙️ 安裝與設定 Git</h2>
        <p class="subtitle">課程 2／6 · 環境準備</p>

        <h3>第一步：下載 Git</h3>
        <ul>
          <li><strong>Windows</strong>：前往 git-scm.com 下載安裝檔，一路點「Next」即可</li>
          <li><strong>Mac</strong>：開啟終端機，輸入 <code>git --version</code>，若未安裝會自動提示安裝</li>
          <li><strong>Linux</strong>：執行 <code>sudo apt install git</code></li>
        </ul>

        <h3>第二步：確認安裝成功</h3>
        <div class="terminal">
          <div class="terminal-header">
            <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body">
            <div class="cmd">git --version</div>
            <div class="out">git version 2.43.0</div>
          </div>
        </div>

        <h3>第三步：設定你的名字和信箱</h3>
        <p>Git 會把每次 commit 都標上你的名字，所以需要先設定：</p>
        <div class="terminal">
          <div class="terminal-header">
            <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body">
            <div class="comment"># 設定使用者名稱（換成你的名字）</div>
            <div class="cmd">git config --global user.name "你的名字"</div>
            <div class="comment"># 設定 Email（換成你的 Email）</div>
            <div class="cmd">git config --global user.email "you@example.com"</div>
            <div class="comment"># 確認設定</div>
            <div class="cmd">git config --list</div>
          </div>
        </div>

        <div class="tip">
          <strong>💡 小提示</strong>
          <code>--global</code> 表示這個設定套用到你電腦上所有的 Git 專案。
          只需要設定一次即可！
        </div>

        <h3>第四步：申請 GitHub 帳號</h3>
        <ul>
          <li>前往 <strong>github.com</strong> 點擊「Sign up」</li>
          <li>填入 Email、密碼、使用者名稱</li>
          <li>完成信箱驗證</li>
        </ul>
      </div>
    `
  },

  3: {
    title: "第一個 Commit",
    content: `
      <div class="lesson-content">
        <h2>📁 第一個 Commit</h2>
        <p class="subtitle">課程 3／6 · 核心指令</p>

        <h3>Git 的三個區域</h3>
        <p>理解這三個區域，是學好 Git 的關鍵：</p>
        <ul>
          <li>🗂️ <strong>工作目錄</strong>（Working Directory）：你正在編輯的檔案</li>
          <li>📋 <strong>暫存區</strong>（Staging Area）：準備要 commit 的變更</li>
          <li>📦 <strong>本地倉庫</strong>（Repository）：已儲存的版本歷史</li>
        </ul>

        <h3>實作：建立第一個 Commit</h3>
        <div class="terminal">
          <div class="terminal-header">
            <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body">
            <div class="comment"># 1. 建立新資料夾並進入</div>
            <div class="cmd">mkdir my-project && cd my-project</div>
            <div class="comment"># 2. 初始化 Git（建立 .git 資料夾）</div>
            <div class="cmd">git init</div>
            <div class="out">Initialized empty Git repository in .../my-project/.git/</div>
            <div class="comment"># 3. 建立一個檔案</div>
            <div class="cmd">echo "Hello, Git!" > README.md</div>
            <div class="comment"># 4. 查看目前狀態</div>
            <div class="cmd">git status</div>
            <div class="out">Untracked files: README.md</div>
            <div class="comment"># 5. 把檔案加入暫存區</div>
            <div class="cmd">git add README.md</div>
            <div class="comment"># 6. 建立 commit（儲存這個版本）</div>
            <div class="cmd">git commit -m "新增 README 檔案"</div>
            <div class="out">[main (root-commit)] 新增 README 檔案</div>
            <div class="comment"># 7. 查看 commit 紀錄</div>
            <div class="cmd">git log --oneline</div>
            <div class="out">a1b2c3d 新增 README 檔案</div>
          </div>
        </div>

        <div class="tip">
          <strong>💡 Commit 訊息要寫什麼？</strong>
          寫清楚「做了什麼事」，例如：<br>
          ✅ 「新增使用者登入功能」<br>
          ✅ 「修復首頁顯示錯誤的 bug」<br>
          ❌ 「改了一些東西」
        </div>
      </div>
    `
  },

  4: {
    title: "推送到 GitHub",
    content: `
      <div class="lesson-content">
        <h2>☁️ 推送到 GitHub</h2>
        <p class="subtitle">課程 4／6 · 遠端倉庫</p>

        <h3>第一步：在 GitHub 建立倉庫</h3>
        <ul>
          <li>登入 GitHub，點右上角「+」→「New repository」</li>
          <li>填入倉庫名稱，例如 <code>my-project</code></li>
          <li><strong>不要</strong>勾選「Add a README file」（因為本地已有）</li>
          <li>點「Create repository」</li>
        </ul>

        <h3>第二步：連結本地與遠端</h3>
        <div class="terminal">
          <div class="terminal-header">
            <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body">
            <div class="comment"># 加入遠端倉庫位址（換成你的 GitHub 網址）</div>
            <div class="cmd">git remote add origin https://github.com/你的帳號/my-project.git</div>
            <div class="comment"># 確認遠端設定</div>
            <div class="cmd">git remote -v</div>
            <div class="out">origin  https://github.com/你的帳號/my-project.git (fetch)</div>
            <div class="out">origin  https://github.com/你的帳號/my-project.git (push)</div>
            <div class="comment"># 將主分支改名為 main（GitHub 預設名稱）</div>
            <div class="cmd">git branch -M main</div>
            <div class="comment"># 推送到 GitHub！</div>
            <div class="cmd">git push -u origin main</div>
            <div class="out">Branch 'main' set up to track remote branch 'main' from 'origin'.</div>
          </div>
        </div>

        <div class="tip">
          <strong>💡 之後怎麼推送？</strong>
          第一次用 <code>git push -u origin main</code> 設定好之後，
          之後只需要輸入 <code>git push</code> 就夠了！
        </div>

        <h3>常用推送流程</h3>
        <div class="terminal">
          <div class="terminal-header">
            <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body">
            <div class="comment"># 每次修改後的標準流程</div>
            <div class="cmd">git add .</div>
            <div class="cmd">git commit -m "修改說明"</div>
            <div class="cmd">git push</div>
          </div>
        </div>
      </div>
    `
  },

  5: {
    title: "分支（Branch）",
    content: `
      <div class="lesson-content">
        <h2>🌿 分支（Branch）</h2>
        <p class="subtitle">課程 5／6 · 並行開發</p>

        <h3>什麼是分支？</h3>
        <p>
          分支就像是「平行宇宙」。你可以在不影響主程式碼（main）的情況下，
          在分支上開發新功能或修 bug。完成後再合併回 main。
        </p>

        <div class="tip">
          <strong>💡 為什麼要用分支？</strong>
          假設 main 是已上線的程式，你正在開發新功能。
          如果直接改 main，萬一改壞了，整個網站就掛掉了！
          用分支就可以安全地開發，確認沒問題再合併。
        </div>

        <h3>分支常用指令</h3>
        <div class="terminal">
          <div class="terminal-header">
            <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body">
            <div class="comment"># 查看所有分支（* 號是目前所在分支）</div>
            <div class="cmd">git branch</div>
            <div class="out">* main</div>
            <div class="comment"># 建立新分支</div>
            <div class="cmd">git branch feature/login</div>
            <div class="comment"># 切換到新分支</div>
            <div class="cmd">git checkout feature/login</div>
            <div class="out">Switched to branch 'feature/login'</div>
            <div class="comment"># 建立並立刻切換（快速版）</div>
            <div class="cmd">git checkout -b feature/signup</div>
            <div class="comment"># 在分支上 commit 後，切回 main 合併</div>
            <div class="cmd">git checkout main</div>
            <div class="cmd">git merge feature/login</div>
            <div class="out">Merge made by the 'ort' strategy.</div>
            <div class="comment"># 刪除已合併的分支</div>
            <div class="cmd">git branch -d feature/login</div>
          </div>
        </div>

        <h3>分支命名慣例</h3>
        <ul>
          <li><code>feature/功能名稱</code> — 新功能</li>
          <li><code>fix/問題描述</code> — 修 bug</li>
          <li><code>hotfix/緊急修復</code> — 緊急上線修復</li>
        </ul>
      </div>
    `
  },

  6: {
    title: "Pull Request",
    content: `
      <div class="lesson-content">
        <h2>🔀 Pull Request（PR）</h2>
        <p class="subtitle">課程 6／6 · 團隊協作</p>

        <h3>什麼是 Pull Request？</h3>
        <p>
          PR 是你在 GitHub 上告訴隊友：「我在分支上開發完了，請幫我審查，
          然後合併到主分支」的一種機制。這是團隊協作的核心流程。
        </p>

        <h3>PR 流程步驟</h3>
        <div class="terminal">
          <div class="terminal-header">
            <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body">
            <div class="comment"># 1. 建立功能分支</div>
            <div class="cmd">git checkout -b feature/new-page</div>
            <div class="comment"># 2. 修改程式碼、commit</div>
            <div class="cmd">git add .</div>
            <div class="cmd">git commit -m "新增關於我們頁面"</div>
            <div class="comment"># 3. 推送分支到 GitHub</div>
            <div class="cmd">git push -u origin feature/new-page</div>
          </div>
        </div>

        <h3>在 GitHub 建立 PR</h3>
        <ul>
          <li>推送後到 GitHub，會看到黃色提示條「Compare & pull request」</li>
          <li>點擊後填寫 PR 標題和說明，描述你改了什麼</li>
          <li>點「Create pull request」送出</li>
          <li>等待隊友審查（Code Review）</li>
          <li>審查通過後，點「Merge pull request」合併到 main</li>
        </ul>

        <div class="tip">
          <strong>💡 PR 說明要寫什麼？</strong>
          清楚說明：① 做了什麼改動 ② 為什麼要這樣改 ③ 如何測試
          好的 PR 說明讓隊友更容易審查，也是一種專業的展現。
        </div>

        <h3>恭喜你完成全部課程！</h3>
        <p>
          你已經掌握了 Git & GitHub 的基礎工作流程。
          接下來多練習、多使用，很快就能熟練！
        </p>
        <ul>
          <li>✅ 建立倉庫、init、add、commit</li>
          <li>✅ 推送到 GitHub（push）</li>
          <li>✅ 使用分支開發功能</li>
          <li>✅ 發起 Pull Request 協作</li>
        </ul>
      </div>
    `
  }
};
