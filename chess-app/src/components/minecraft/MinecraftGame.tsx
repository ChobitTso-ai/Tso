import { useState, useEffect } from 'react'
import './MinecraftGame.css'

interface Question {
  type: 'choice' | 'text'
  question: string
  options?: string[]
  labels?: string[]
  answer: string
}

interface GameState {
  coins: number
  health: number
  maxHealth: number
  score: number
  totalAnswered: number
  questions: Question[]
  currentQuestionIndex: number
  inventory: {
    healthPotion: number
    skipTicket: number
    doubleCoins: number
  }
  doubleCoinsRemaining: number
}

const STORAGE_KEY = 'minecraftQuizGame'

// 商店物品定義
const SHOP_ITEMS = [
  {
    id: 'healthPotion',
    name: '❤️ 生命藥水',
    description: '恢復 20 點體力',
    price: 50,
    effect: 'heal',
    value: 20
  },
  {
    id: 'skipTicket',
    name: '⏭️ 跳過券',
    description: '跳過當前題目（不扣分也不扣血）',
    price: 30,
    effect: 'skip',
    value: 1
  },
  {
    id: 'doubleCoins',
    name: '💰 雙倍金幣卡',
    description: '接下來 5 題答對獲得雙倍金幣',
    price: 100,
    effect: 'double',
    value: 5
  }
]

export default function MinecraftGame() {
  const [gameState, setGameState] = useState<GameState>({
    coins: 0,
    health: 100,
    maxHealth: 100,
    score: 0,
    totalAnswered: 0,
    questions: [],
    currentQuestionIndex: -1,
    inventory: {
      healthPotion: 0,
      skipTicket: 0,
      doubleCoins: 0
    },
    doubleCoinsRemaining: 0
  })

  const [showWelcome, setShowWelcome] = useState(true)
  const [showQuestionManager, setShowQuestionManager] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [autoConvertToChoice, setAutoConvertToChoice] = useState(true) // 自動轉選擇題
  const [questionInput, setQuestionInput] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: ''
  })

  // Load game state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const loaded = JSON.parse(saved)
        setGameState(loaded)
      } catch (e) {
        console.error('Failed to load game state:', e)
      }
    }
  }, [])

  // Save game state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
  }, [gameState])

  // Parse questions
  const parseQuestions = (text: string): Question[] => {
    const questions: Question[] = []
    const lines = text.split('\n')
    let i = 0

    // 收集所有答案用於生成錯誤選項
    const allAnswers: string[] = []

    while (i < lines.length) {
      let line = lines[i].trim()

      if (!line) {
        i++
        continue
      }

      // Check for multiple choice (multi-line format)
      if (i + 1 < lines.length) {
        const nextLines: string[] = []
        let j = i + 1

        // Collect possible options
        while (j < lines.length && j < i + 10) {
          const optLine = lines[j].trim()
          if (/^[A-D][.)、]\s*.+/.test(optLine)) {
            nextLines.push(optLine)
            j++
          } else if (optLine === '') {
            j++
          } else {
            break
          }
        }

        // If found options, it's a choice question
        if (nextLines.length >= 2) {
          const options: string[] = []
          const labels: string[] = []

          nextLines.forEach(opt => {
            const match = opt.match(/^([A-D])[.)、]\s*(.+)/)
            if (match) {
              labels.push(match[1])
              options.push(match[2])
            }
          })

          // Find answer
          let answer: string | null = null
          while (j < lines.length && j < i + 15) {
            const ansLine = lines[j].trim()
            const ansMatch = ansLine.match(/答[案]?[:：]\s*([A-D])/i)
            if (ansMatch) {
              answer = ansMatch[1].toUpperCase()
              j++
              break
            }
            j++
          }

          if (answer && labels.includes(answer)) {
            questions.push({
              type: 'choice',
              question: line,
              options,
              labels,
              answer
            })
            i = j
            continue
          }
        }
      }

      // Fill-in-the-blank format: question|answer
      if (line.includes('|')) {
        const parts = line.split('|')
        if (parts.length >= 2) {
          const questionText = parts[0].trim()
          const correctAnswer = parts[1].trim()

          allAnswers.push(correctAnswer)

          if (autoConvertToChoice) {
            // 自動轉換成選擇題
            questions.push({
              type: 'choice',
              question: questionText,
              options: [], // 稍後填充
              labels: ['A', 'B', 'C', 'D'],
              answer: 'A', // 正確答案固定在 A
              correctAnswerText: correctAnswer // 保存正確答案文字
            } as any)
          } else {
            questions.push({
              type: 'text',
              question: questionText,
              answer: correctAnswer
            })
          }
          i++
          continue
        }
      }

      i++
    }

    // 為自動轉換的選擇題生成選項
    if (autoConvertToChoice && allAnswers.length > 0) {
      questions.forEach((q: any) => {
        if (q.type === 'choice' && q.options.length === 0 && q.correctAnswerText) {
          const wrongAnswers = allAnswers
            .filter(a => a !== q.correctAnswerText)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)

          const options = [q.correctAnswerText, ...wrongAnswers]
            .sort(() => Math.random() - 0.5)

          const correctIndex = options.indexOf(q.correctAnswerText)
          const labels = ['A', 'B', 'C', 'D']

          q.options = options.slice(0, 4)
          q.labels = labels.slice(0, q.options.length)
          q.answer = labels[correctIndex]
          delete q.correctAnswerText
        }
      })
    }

    return questions
  }

  // Load questions
  const loadQuestions = () => {
    const newQuestions = parseQuestions(questionInput)

    if (newQuestions.length > 0) {
      setGameState(prev => ({
        ...prev,
        questions: [...prev.questions, ...newQuestions]
      }))
      alert(`成功載入 ${newQuestions.length} 題！\n目前題庫共有 ${gameState.questions.length + newQuestions.length} 題。`)
      setQuestionInput('')
      setShowQuestionManager(false)
    } else {
      alert('沒有找到有效的題目！\n請確認格式正確。')
    }
  }

  // Start quiz
  const startQuiz = () => {
    if (gameState.questions.length === 0) {
      alert('請先輸入題目！')
      setShowQuestionManager(true)
      return
    }

    if (gameState.health <= 0) {
      alert('體力已耗盡！請使用生命藥水恢復體力。')
      return
    }

    nextQuestion()
  }

  // Next question
  const nextQuestion = () => {
    if (gameState.questions.length === 0) {
      alert('請先輸入題目！')
      return
    }

    if (gameState.health <= 0) {
      gameOver()
      return
    }

    // Random question
    const randomIndex = Math.floor(Math.random() * gameState.questions.length)
    setGameState(prev => ({
      ...prev,
      currentQuestionIndex: randomIndex
    }))

    setShowWelcome(false)
    setFeedback({ show: false, correct: false, message: '' })
    setUserAnswer('')
  }

  // Submit answer
  const submitAnswer = (answer: string) => {
    if (!answer || !answer.trim()) {
      alert('請輸入答案！')
      return
    }

    const question = gameState.questions[gameState.currentQuestionIndex]
    const correctAnswer = question.answer
    const isCorrect = answer.trim().toUpperCase() === correctAnswer.toUpperCase()

    let coinsEarned = 10
    if (isCorrect && gameState.doubleCoinsRemaining > 0) {
      coinsEarned = 20
    }

    setGameState(prev => ({
      ...prev,
      totalAnswered: prev.totalAnswered + 1,
      score: isCorrect ? prev.score + 1 : prev.score,
      coins: isCorrect ? prev.coins + coinsEarned : prev.coins,
      health: isCorrect ? prev.health : Math.max(0, prev.health - 1), // 答錯扣 1 點體力
      doubleCoinsRemaining: isCorrect && prev.doubleCoinsRemaining > 0
        ? prev.doubleCoinsRemaining - 1
        : prev.doubleCoinsRemaining
    }))

    if (isCorrect) {
      const doubleMsg = gameState.doubleCoinsRemaining > 0
        ? `（雙倍金幣！剩餘 ${gameState.doubleCoinsRemaining - 1} 題）`
        : ''
      setFeedback({
        show: true,
        correct: true,
        message: `✅ 答對了！獲得 ${coinsEarned} 金幣${doubleMsg}！\n正確答案：${correctAnswer}`
      })
    } else {
      setFeedback({
        show: true,
        correct: false,
        message: `❌ 答錯了！扣除 1 體力\n你的答案：${answer}\n正確答案：${correctAnswer}`
      })

      if (gameState.health - 1 <= 0) {
        setTimeout(gameOver, 2000)
      }
    }
  }

  // Game over
  const gameOver = () => {
    alert(`遊戲結束！\n\n💎 最終分數：${gameState.score}/${gameState.totalAnswered}\n💰 剩餘金幣：${gameState.coins}`)

    const restart = confirm('是否重置遊戲？')
    if (restart) {
      setGameState(prev => ({
        ...prev,
        health: 100,
        score: 0,
        totalAnswered: 0
      }))
      setShowWelcome(true)
      setFeedback({ show: false, correct: false, message: '' })
    }
  }

  // Buy item
  const buyItem = (itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item) return

    if (gameState.coins < item.price) {
      alert('金幣不足！')
      return
    }

    setGameState(prev => ({
      ...prev,
      coins: prev.coins - item.price,
      inventory: {
        ...prev.inventory,
        [itemId]: prev.inventory[itemId as keyof typeof prev.inventory] + 1
      }
    }))

    alert(`購買成功！獲得 ${item.name}`)
  }

  // Use item
  const useItem = (itemId: string) => {
    const inventoryKey = itemId as keyof typeof gameState.inventory
    if (gameState.inventory[inventoryKey] <= 0) {
      alert('沒有此道具！')
      return
    }

    if (itemId === 'healthPotion') {
      const healAmount = Math.min(20, gameState.maxHealth - gameState.health)
      setGameState(prev => ({
        ...prev,
        health: Math.min(prev.maxHealth, prev.health + 20),
        inventory: {
          ...prev.inventory,
          healthPotion: prev.inventory.healthPotion - 1
        }
      }))
      alert(`使用生命藥水！恢復 ${healAmount} 點體力`)
    } else if (itemId === 'skipTicket') {
      setGameState(prev => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          skipTicket: prev.inventory.skipTicket - 1
        }
      }))
      alert('使用跳過券！')
      nextQuestion()
    } else if (itemId === 'doubleCoins') {
      setGameState(prev => ({
        ...prev,
        doubleCoinsRemaining: 5,
        inventory: {
          ...prev.inventory,
          doubleCoins: prev.inventory.doubleCoins - 1
        }
      }))
      alert('使用雙倍金幣卡！接下來 5 題答對獲得雙倍金幣！')
    }
  }

  // Reset game data
  const resetGame = () => {
    if (confirm('確定要重置所有遊戲資料嗎？此操作無法復原！')) {
      setGameState({
        coins: 0,
        health: 100,
        maxHealth: 100,
        score: 0,
        totalAnswered: 0,
        questions: [],
        currentQuestionIndex: -1,
        inventory: {
          healthPotion: 0,
          skipTicket: 0,
          doubleCoins: 0
        },
        doubleCoinsRemaining: 0
      })
      setShowWelcome(true)
      setFeedback({ show: false, correct: false, message: '' })
      alert('遊戲資料已重置！')
    }
  }

  // Export save data
  const exportSave = () => {
    const saveData = JSON.stringify(gameState, null, 2)
    const blob = new Blob([saveData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `minecraft-quiz-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    alert('存檔已匯出！')
  }

  // Import save data
  const importSave = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string)
            setGameState(data)
            alert('存檔已載入！')
          } catch (err) {
            alert('存檔檔案格式錯誤！')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const currentQuestion = gameState.currentQuestionIndex >= 0
    ? gameState.questions[gameState.currentQuestionIndex]
    : null

  return (
    <div className="minecraft-game">
      {/* Header */}
      <div className="mc-header">
        <h1>⛏️ Minecraft 測驗遊戲 ⛏️</h1>
        <p>學習即挖礦，知識即財富！</p>
      </div>

      {/* Status Bar */}
      <div className="mc-status-bar">
        <div className="mc-stat-box mc-coins">
          <div className="mc-stat-label">💰 金幣</div>
          <div className="mc-stat-value">{gameState.coins}</div>
        </div>
        <div className="mc-stat-box mc-health">
          <div className="mc-stat-label">❤️ 體力</div>
          <div className="mc-stat-value">{gameState.health}/{gameState.maxHealth}</div>
        </div>
        <div className="mc-stat-box mc-score">
          <div className="mc-stat-label">💎 分數</div>
          <div className="mc-stat-value">{gameState.score}/{gameState.totalAnswered}</div>
        </div>
        <div className="mc-stat-box mc-questions">
          <div className="mc-stat-label">📚 題庫</div>
          <div className="mc-stat-value">{gameState.questions.length}</div>
        </div>
      </div>

      {/* Inventory */}
      {(gameState.inventory.healthPotion > 0 || gameState.inventory.skipTicket > 0 || gameState.inventory.doubleCoins > 0) && (
        <div className="mc-inventory">
          <div className="mc-inventory-title">🎒 道具背包</div>
          <div className="mc-inventory-items">
            {gameState.inventory.healthPotion > 0 && (
              <button className="mc-inventory-item" onClick={() => useItem('healthPotion')}>
                ❤️ 生命藥水 x{gameState.inventory.healthPotion}
              </button>
            )}
            {gameState.inventory.skipTicket > 0 && (
              <button className="mc-inventory-item" onClick={() => useItem('skipTicket')}>
                ⏭️ 跳過券 x{gameState.inventory.skipTicket}
              </button>
            )}
            {gameState.inventory.doubleCoins > 0 && (
              <button className="mc-inventory-item" onClick={() => useItem('doubleCoins')}>
                💰 雙倍金幣 x{gameState.inventory.doubleCoins}
              </button>
            )}
          </div>
          {gameState.doubleCoinsRemaining > 0 && (
            <div className="mc-buff-indicator">
              ✨ 雙倍金幣效果中！剩餘 {gameState.doubleCoinsRemaining} 題
            </div>
          )}
        </div>
      )}

      {/* Game Area */}
      <div className="mc-game-area">
        {showWelcome ? (
          <div className="mc-welcome-screen">
            <h2>🎮 歡迎來到 Minecraft 測驗遊戲！</h2>
            <p>📚 點擊「輸入題目」開始建立你的題庫</p>
            <p>💡 答對題目獲得金幣，答錯扣除體力</p>
            <p>🏪 使用金幣在商店購買道具幫助通關</p>
            <div className="mc-welcome-stats">
              <p>📊 目前狀態：</p>
              <p>💰 金幣: {gameState.coins}</p>
              <p>❤️ 體力: {gameState.health}/{gameState.maxHealth}</p>
              <p>📚 題庫: {gameState.questions.length} 題</p>
              <p>💎 答對率: {gameState.score}/{gameState.totalAnswered}</p>
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="mc-question-screen">
            <div className="mc-question-text">
              📝 題目 #{gameState.currentQuestionIndex + 1} {currentQuestion.type === 'choice' ? '(選擇題)' : '(填空題)'}
              <br /><br />
              {currentQuestion.question}
            </div>

            {currentQuestion.type === 'choice' ? (
              <div className="mc-options">
                {currentQuestion.options!.map((option, index) => (
                  <button
                    key={index}
                    className="mc-option-btn"
                    onClick={() => submitAnswer(currentQuestion.labels![index])}
                    disabled={feedback.show}
                  >
                    {currentQuestion.labels![index]}. {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mc-text-answer">
                <input
                  type="text"
                  className="mc-text-input"
                  placeholder="輸入你的答案..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !feedback.show) {
                      submitAnswer(userAnswer)
                    }
                  }}
                  disabled={feedback.show}
                  autoFocus
                />
                {!feedback.show && (
                  <button
                    className="mc-btn mc-btn-primary mc-submit-btn"
                    onClick={() => submitAnswer(userAnswer)}
                  >
                    ✅ 確認答案
                  </button>
                )}
              </div>
            )}

            {feedback.show && (
              <div className={`mc-feedback ${feedback.correct ? 'mc-correct' : 'mc-wrong'}`}>
                {feedback.message}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div className="mc-controls">
        <button className="mc-btn mc-btn-primary" onClick={startQuiz}>🎯 開始測驗</button>
        <button className="mc-btn" onClick={() => setShowQuestionManager(!showQuestionManager)}>✏️ 輸入題目</button>
        <button className="mc-btn mc-btn-secondary" onClick={() => setShowShop(!showShop)}>🏪 商店</button>
        <button className="mc-btn" onClick={nextQuestion}>➡️ 下一題</button>
      </div>

      {/* Save/Load Controls */}
      <div className="mc-save-controls">
        <button className="mc-btn-small mc-btn-save" onClick={exportSave}>💾 匯出存檔</button>
        <button className="mc-btn-small mc-btn-load" onClick={importSave}>📂 載入存檔</button>
        <button className="mc-btn-small mc-btn-danger" onClick={resetGame}>🔄 重置遊戲</button>
      </div>

      {/* Question Manager */}
      {showQuestionManager && (
        <div className="mc-question-manager">
          <h3>📝 輸入題目</h3>

          <div className="mc-convert-option">
            <label>
              <input
                type="checkbox"
                checked={autoConvertToChoice}
                onChange={(e) => setAutoConvertToChoice(e.target.checked)}
              />
              <span>自動將填空題轉換成選擇題（推薦）</span>
            </label>
          </div>

          <p>格式範例：</p>
          <pre className="mc-format-example">
{autoConvertToChoice ? `填空題（自動轉選擇題）：
apple|蘋果
banana|香蕉
cat|貓
dog|狗

選擇題（標準格式）：
問題？
A. 選項1
B. 選項2
C. 選項3
D. 選項4
答：A` : `選擇題：
問題？
A. 選項1
B. 選項2
C. 選項3
D. 選項4
答：A

填空題：
問題？|答案
apple|蘋果
1+1=?|2`}
          </pre>
          <textarea
            className="mc-textarea"
            placeholder="在這裡貼上或輸入題目..."
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
          />
          <div className="mc-manager-controls">
            <button className="mc-btn mc-btn-primary" onClick={loadQuestions}>💾 載入題目</button>
            <button className="mc-btn" onClick={() => setShowQuestionManager(false)}>❌ 關閉</button>
          </div>
        </div>
      )}

      {/* Shop */}
      {showShop && (
        <div className="mc-shop">
          <h3>🏪 Minecraft 商店</h3>
          <p className="mc-shop-balance">💰 你的金幣: {gameState.coins}</p>
          <div className="mc-shop-items">
            {SHOP_ITEMS.map(item => (
              <div key={item.id} className="mc-shop-item">
                <div className="mc-shop-item-info">
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                  <p className="mc-shop-price">💰 價格: {item.price} 金幣</p>
                </div>
                <button
                  className="mc-btn mc-btn-buy"
                  onClick={() => buyItem(item.id)}
                  disabled={gameState.coins < item.price}
                >
                  購買
                </button>
              </div>
            ))}
          </div>
          <button className="mc-btn mc-btn-danger" onClick={() => setShowShop(false)}>❌ 關閉商店</button>
        </div>
      )}
    </div>
  )
}
