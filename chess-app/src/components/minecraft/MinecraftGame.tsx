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
  }
}

const STORAGE_KEY = 'minecraftQuizGame'

const EXAMPLE_QUESTIONS = `台灣的首都是？
A. 台北
B. 台中
C. 高雄
D. 台南
答：A

1+1=?
A. 1
B. 2
C. 3
D. 4
答：B

What is Minecraft?|沙盒遊戲
Creeper會爆炸嗎？|會
鑽石工具耐久度多少？|1561`

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
      skipTicket: 0
    }
  })

  const [showWelcome, setShowWelcome] = useState(true)
  const [showQuestionManager, setShowQuestionManager] = useState(false)
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
          questions.push({
            type: 'text',
            question: parts[0].trim(),
            answer: parts[1].trim()
          })
          i++
          continue
        }
      }

      i++
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

  // Load example questions
  const loadExamples = () => {
    if (gameState.questions.length === 0) {
      const examples = parseQuestions(EXAMPLE_QUESTIONS)
      setGameState(prev => ({
        ...prev,
        questions: examples
      }))
    }
  }

  useEffect(() => {
    loadExamples()
  }, [])

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

    setGameState(prev => ({
      ...prev,
      totalAnswered: prev.totalAnswered + 1,
      score: isCorrect ? prev.score + 1 : prev.score,
      coins: isCorrect ? prev.coins + 10 : prev.coins,
      health: isCorrect ? prev.health : Math.max(0, prev.health - 10)
    }))

    if (isCorrect) {
      setFeedback({
        show: true,
        correct: true,
        message: `✅ 答對了！獲得 10 金幣！\n正確答案：${correctAnswer}`
      })
    } else {
      setFeedback({
        show: true,
        correct: false,
        message: `❌ 答錯了！扣除 10 體力\n你的答案：${answer}\n正確答案：${correctAnswer}`
      })

      if (gameState.health - 10 <= 0) {
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
      </div>

      {/* Game Area */}
      <div className="mc-game-area">
        {showWelcome ? (
          <div className="mc-welcome-screen">
            <h2>🎮 歡迎來到 Minecraft 測驗遊戲！</h2>
            <p>📚 點擊下方按鈕開始你的學習冒險</p>
            <p>💡 答對題目獲得金幣，答錯扣除體力</p>
            <p>🏪 使用金幣在商店購買道具幫助通關</p>
          </div>
        ) : currentQuestion ? (
          <div className="mc-question-screen">
            <div className="mc-question-text">
              📝 題目 #{gameState.currentQuestionIndex + 1} {currentQuestion.type === 'choice' ? '(選擇題)' : ''}
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
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      submitAnswer(userAnswer)
                    }
                  }}
                  disabled={feedback.show}
                />
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
        <button className="mc-btn mc-btn-secondary" onClick={() => alert('商店功能開發中！敬請期待 🏪')}>🏪 商店</button>
        <button className="mc-btn" onClick={nextQuestion}>➡️ 下一題</button>
      </div>

      {/* Question Manager */}
      {showQuestionManager && (
        <div className="mc-question-manager">
          <h3>📝 輸入題目</h3>
          <p>格式範例：</p>
          <pre className="mc-format-example">
{`選擇題：
問題？
A. 選項1
B. 選項2
C. 選項3
D. 選項4
答：A

填空題：
問題？|答案`}
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
    </div>
  )
}
