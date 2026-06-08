import { useState, useEffect, useCallback } from 'react'
import { getQuestion, type CharacterId, type Question } from './questions'
import './MathQuest.css'

// ── 型別 ──────────────────────────────────────────────────────────────────────

type CellType = 'empty' | 'monster' | 'heal' | 'boss' | 'start'
type Screen = 'select' | 'map' | 'battle' | 'boss' | 'win' | 'lose'

interface Cell {
  type: CellType
  defeated: boolean
}

interface GameState {
  char: CharacterId
  level: 1 | 2
  board: Cell[][]
  pos: [number, number]
  hp: number
  maxHp: number
  score: number
  screen: Screen
  question: Question | null
  wrongOptions: number[]
  bossQ: Question[]
  bossIndex: number
  bossWrongOptions: number[]
}

// ── constants ────────────────────────────────────────────────────────────────

const CHAR_INFO = {
  alan: { name: 'Alan', maxHp: 4, color: '#4A90D9', emoji: '🧒', subject: '九九乘法', desc: '專攻乘法表，穩健冷靜' },
  ryan: { name: 'Ryan T', maxHp: 5, color: '#E8A020', emoji: '😄', subject: '小學數學', desc: '活潑挑戰，四五六年級題目' },
}

const STORAGE_KEY = 'mathQuestGame'

// ── 棋盤生成 ──────────────────────────────────────────────────────────────────

function buildBoard(size: number): Cell[][] {
  const board: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: 'empty' as CellType, defeated: false }))
  )
  board[0][0] = { type: 'start', defeated: false }
  board[size - 1][size - 1] = { type: 'boss', defeated: false }

  // 放怪物（約 40% 格子）
  const total = size * size - 2
  const monsterCount = Math.floor(total * 0.4)
  const healCount = Math.floor(total * 0.08)
  const positions: [number, number][] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!(r === 0 && c === 0) && !(r === size - 1 && c === size - 1))
        positions.push([r, c])

  const shuffled = positions.sort(() => Math.random() - 0.5)
  for (let i = 0; i < monsterCount; i++) board[shuffled[i][0]][shuffled[i][1]].type = 'monster'
  for (let i = monsterCount; i < monsterCount + healCount; i++) board[shuffled[i][0]][shuffled[i][1]].type = 'heal'

  return board
}

function buildBossQuestions(char: CharacterId, level: 1 | 2): Question[] {
  return [getQuestion(char, level), getQuestion(char, level), getQuestion(char, level)]
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export default function MathQuest() {
  const [state, setState] = useState<GameState | null>(null)

  // 載入存檔
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setState(JSON.parse(saved)) } catch { /* 壞掉就算了 */ }
    }
  }, [])

  // 存檔
  useEffect(() => {
    if (state && state.screen !== 'select') localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // 鍵盤操作
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!state || state.screen !== 'map') return
    const dirs: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    }
    const d = dirs[e.key]
    if (d) { e.preventDefault(); tryMove(d[0], d[1]) }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // ── 動作 ──────────────────────────────────────────────────────────────────

  function startGame(char: CharacterId) {
    const info = CHAR_INFO[char]
    const level = 1
    setState({
      char, level,
      board: buildBoard(5),
      pos: [0, 0],
      hp: info.maxHp, maxHp: info.maxHp,
      score: 0,
      screen: 'map',
      question: null, wrongOptions: [],
      bossQ: [], bossIndex: 0, bossWrongOptions: [],
    })
  }

  function tryMove(dr: number, dc: number) {
    setState(prev => {
      if (!prev || prev.screen !== 'map') return prev
      const size = prev.board.length
      const [r, c] = prev.pos
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) return prev

      const cell = prev.board[nr][nc]
      const newBoard = prev.board.map(row => row.map(cell => ({ ...cell })))
      let newHp = prev.hp
      let newScore = prev.score
      let newScreen: Screen = 'map'
      let newQ: Question | null = null

      if (cell.type === 'monster' && !cell.defeated) {
        newQ = getQuestion(prev.char, prev.level)
        newScreen = 'battle'
      } else if (cell.type === 'heal' && !cell.defeated) {
        newHp = Math.min(prev.maxHp, prev.hp + 1)
        newBoard[nr][nc].defeated = true
        newScore += 5
      } else if (cell.type === 'boss' && !cell.defeated) {
        // 檢查是否有未打倒的怪物
        const hasMonsters = newBoard.some(row => row.some(c => c.type === 'monster' && !c.defeated))
        if (hasMonsters) return prev // 不能直接挑戰 Boss
        newScreen = 'boss'
        return {
          ...prev, pos: [nr, nc],
          bossQ: buildBossQuestions(prev.char, prev.level),
          bossIndex: 0, bossWrongOptions: [],
          screen: 'boss',
        }
      }

      return {
        ...prev,
        pos: [nr, nc],
        board: newBoard,
        hp: newHp, score: newScore,
        screen: newScreen,
        question: newQ, wrongOptions: [],
      }
    })
  }

  function clickCell(r: number, c: number) {
    if (!state || state.screen !== 'map') return
    const [pr, pc] = state.pos
    const dr = r - pr, dc = c - pc
    if (Math.abs(dr) + Math.abs(dc) === 1) tryMove(dr, dc)
  }

  function answerQuestion(option: number) {
    setState(prev => {
      if (!prev || !prev.question) return prev
      if (option === prev.question.answer) {
        // 答對
        const newBoard = prev.board.map(row => row.map(c => ({ ...c })))
        const [r, c] = prev.pos
        newBoard[r][c].defeated = true
        return {
          ...prev, board: newBoard,
          score: prev.score + 10,
          screen: 'map', question: null, wrongOptions: [],
        }
      } else {
        // 答錯
        const newHp = prev.hp - 1
        if (newHp <= 0) return { ...prev, hp: 0, screen: 'lose' }
        return { ...prev, hp: newHp, wrongOptions: [...prev.wrongOptions, option] }
      }
    })
  }

  function answerBoss(option: number) {
    setState(prev => {
      if (!prev) return prev
      const q = prev.bossQ[prev.bossIndex]
      if (option === q.answer) {
        const next = prev.bossIndex + 1
        if (next >= prev.bossQ.length) {
          // Boss 打倒
          const newBoard = prev.board.map(row => row.map(c => ({ ...c })))
          const [r, c] = prev.pos
          newBoard[r][c].defeated = true
          const nextLevel = prev.level + 1
          if (nextLevel > 2) {
            return { ...prev, board: newBoard, score: prev.score + 50, screen: 'win' }
          }
          // 進入下一關
          return {
            ...prev,
            level: nextLevel as 1 | 2,
            board: buildBoard(7),
            pos: [0, 0],
            score: prev.score + 50,
            screen: 'map',
            bossQ: [], bossIndex: 0, bossWrongOptions: [],
          }
        }
        return { ...prev, bossIndex: next, bossWrongOptions: [] }
      } else {
        const newHp = prev.hp - 1
        if (newHp <= 0) return { ...prev, hp: 0, screen: 'lose' }
        return { ...prev, hp: newHp, bossWrongOptions: [...prev.bossWrongOptions, option] }
      }
    })
  }

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY)
    setState(null)
  }

  // ── 渲染 ──────────────────────────────────────────────────────────────────

  if (!state || state.screen === 'select') return <SelectScreen onSelect={startGame} />

  if (state.screen === 'win') return <EndScreen win score={state.score} onReset={resetGame} char={state.char} />
  if (state.screen === 'lose') return <EndScreen win={false} score={state.score} onReset={resetGame} char={state.char} />

  const info = CHAR_INFO[state.char]

  return (
    <div className="mq-game">
      {/* 狀態列 */}
      <div className="mq-statusbar">
        <span className="mq-char-name" style={{ color: info.color }}>{info.emoji} {info.name}</span>
        <div className="mq-hearts">
          {Array.from({ length: state.maxHp }).map((_, i) => (
            <span key={i} className={i < state.hp ? 'mq-heart' : 'mq-heart mq-heart-empty'}>♥</span>
          ))}
        </div>
        <span className="mq-score">⭐ {state.score}</span>
        <span className="mq-level">關卡 {state.level}</span>
        <button className="mq-reset-btn" onClick={resetGame}>🔄</button>
      </div>

      {/* 地圖 */}
      <Board board={state.board} pos={state.pos} onClickCell={clickCell} level={state.level} />

      {/* Boss 提示 */}
      {state.screen === 'map' && (() => {
        const size = state.board.length
        const bossCell = state.board[size - 1][size - 1]
        const hasMonsters = state.board.some(row => row.some(c => c.type === 'monster' && !c.defeated))
        return !bossCell.defeated && hasMonsters ? (
          <p className="mq-boss-hint">⚠️ 打倒所有怪物才能挑戰 Boss！</p>
        ) : null
      })()}

      {/* 戰鬥覆蓋層 */}
      {state.screen === 'battle' && state.question && (
        <BattleOverlay
          question={state.question}
          wrongOptions={state.wrongOptions}
          onAnswer={answerQuestion}
          isBoss={false}
        />
      )}

      {state.screen === 'boss' && state.bossQ[state.bossIndex] && (
        <BattleOverlay
          question={state.bossQ[state.bossIndex]}
          wrongOptions={state.bossWrongOptions}
          onAnswer={answerBoss}
          isBoss
          bossProgress={[state.bossIndex, state.bossQ.length]}
        />
      )}
    </div>
  )
}

// ── 子元件 ────────────────────────────────────────────────────────────────────

function SelectScreen({ onSelect }: { onSelect: (c: CharacterId) => void }) {
  return (
    <div className="mq-select">
      <h1 className="mq-select-title">🔢 數學冒險</h1>
      <p className="mq-select-sub">選擇你的角色，開始挑戰！</p>
      <div className="mq-chars">
        <CharCard id="alan" onSelect={onSelect} />
        <CharCard id="ryan" onSelect={onSelect} />
      </div>
    </div>
  )
}

function CharCard({ id, onSelect }: { id: CharacterId; onSelect: (c: CharacterId) => void }) {
  const info = CHAR_INFO[id]
  return (
    <div className="mq-char-card" style={{ borderColor: info.color }} onClick={() => onSelect(id)}>
      <div className="mq-char-avatar" style={{ background: info.color }}>
        {id === 'alan' ? <AlanAvatar /> : <RyanAvatar />}
      </div>
      <h2 className="mq-char-name-big">{info.name}</h2>
      <p className="mq-char-subject">📚 {info.subject}</p>
      <p className="mq-char-desc">{info.desc}</p>
      <div className="mq-char-stats">
        <span>❤️ {info.maxHp} 顆心</span>
      </div>
      <button className="mq-select-btn" style={{ background: info.color }}>選擇</button>
    </div>
  )
}

// Alan: 瀏海、微笑、穩重
function AlanAvatar() {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      {/* 頭 */}
      <circle cx="40" cy="38" r="26" fill="#FDDBB4" />
      {/* 瀏海 */}
      <rect x="14" y="18" width="52" height="14" rx="4" fill="#2C1810" />
      <rect x="14" y="18" width="52" height="8" rx="4" fill="#1a0f0a" />
      {/* 眼睛 */}
      <ellipse cx="31" cy="38" rx="4" ry="4.5" fill="#2C1810" />
      <ellipse cx="49" cy="38" rx="4" ry="4.5" fill="#2C1810" />
      <circle cx="32.5" cy="36.5" r="1.2" fill="white" />
      <circle cx="50.5" cy="36.5" r="1.2" fill="white" />
      {/* 微笑 */}
      <path d="M32 49 Q40 55 48 49" stroke="#C77" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* 耳朵 */}
      <ellipse cx="14" cy="40" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="66" cy="40" rx="4" ry="5" fill="#FDDBB4" />
      {/* 身體（灰色上衣）*/}
      <rect x="22" y="62" width="36" height="16" rx="6" fill="#B0B0B0" />
    </svg>
  )
}

// Ryan T: 刺頭、大笑、比YA
function RyanAvatar() {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      {/* 頭 */}
      <circle cx="40" cy="40" r="26" fill="#FDDBB4" />
      {/* 刺頭髮 */}
      <ellipse cx="40" cy="17" rx="20" ry="8" fill="#1a0f0a" />
      <polygon points="24,18 20,6 28,16" fill="#1a0f0a" />
      <polygon points="32,15 30,3 36,14" fill="#1a0f0a" />
      <polygon points="40,13 40,1 44,13" fill="#1a0f0a" />
      <polygon points="48,15 50,3 44,14" fill="#1a0f0a" />
      <polygon points="56,18 60,6 52,16" fill="#1a0f0a" />
      {/* 閉眼笑（弧線） */}
      <path d="M27 38 Q31 34 35 38" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M45 38 Q49 34 53 38" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* 大笑嘴 */}
      <path d="M30 50 Q40 60 50 50" stroke="#C77" strokeWidth="2" fill="#FF9999" strokeLinecap="round" />
      {/* 耳朵 */}
      <ellipse cx="14" cy="42" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="66" cy="42" rx="4" ry="5" fill="#FDDBB4" />
      {/* 身體（灰色上衣）*/}
      <rect x="22" y="63" width="36" height="15" rx="6" fill="#B0B0B0" />
      {/* 比YA手指 */}
      <line x1="62" y1="55" x2="68" y2="45" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
      <line x1="65" y1="57" x2="72" y2="48" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function Board({ board, pos, onClickCell, level }: {
  board: Cell[][], pos: [number, number], onClickCell: (r: number, c: number) => void, level: number
}) {
  const size = board.length
  const [pr, pc] = pos

  return (
    <div className="mq-map-wrap">
      <p className="mq-map-label">關卡 {level} — {size}×{size} 地圖</p>
      <div className="mq-board" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isPlayer = r === pr && c === pc
            const isAdjacent = !isPlayer && Math.abs(r - pr) + Math.abs(c - pc) === 1
            let icon = ''
            if (cell.type === 'start') icon = '🏁'
            else if (cell.type === 'boss') icon = cell.defeated ? '✅' : '👹'
            else if (cell.type === 'monster') icon = cell.defeated ? '✅' : '👾'
            else if (cell.type === 'heal') icon = cell.defeated ? '✅' : '💛'
            else icon = '⬛'

            return (
              <div
                key={`${r}-${c}`}
                className={`mq-cell ${isPlayer ? 'mq-cell-player' : ''} ${isAdjacent ? 'mq-cell-adj' : ''} ${cell.defeated ? 'mq-cell-done' : ''}`}
                onClick={() => onClickCell(r, c)}
              >
                {isPlayer ? '🧑' : icon}
              </div>
            )
          })
        )}
      </div>
      <p className="mq-hint">點擊相鄰格子移動，或使用方向鍵</p>
    </div>
  )
}

function BattleOverlay({ question, wrongOptions, onAnswer, isBoss, bossProgress }: {
  question: Question
  wrongOptions: number[]
  onAnswer: (n: number) => void
  isBoss: boolean
  bossProgress?: [number, number]
}) {
  return (
    <div className="mq-overlay">
      <div className="mq-battle-box">
        {isBoss && bossProgress && (
          <p className="mq-boss-prog">👹 Boss 戰 {bossProgress[0] + 1} / {bossProgress[1]}</p>
        )}
        <p className="mq-enemy-icon">{isBoss ? '👹' : '👾'}</p>
        <p className="mq-question">{question.question}</p>
        <div className="mq-options">
          {question.options.map(opt => (
            <button
              key={opt}
              className={`mq-option ${wrongOptions.includes(opt) ? 'mq-option-wrong' : ''}`}
              disabled={wrongOptions.includes(opt)}
              onClick={() => onAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        {wrongOptions.length > 0 && <p className="mq-wrong-hint">❌ 答錯了！扣 1 顆心，繼續選</p>}
      </div>
    </div>
  )
}

function EndScreen({ win, score, onReset, char }: { win: boolean; score: number; onReset: () => void; char: CharacterId }) {
  const info = CHAR_INFO[char]
  return (
    <div className="mq-end">
      <p className="mq-end-icon">{win ? '🏆' : '💀'}</p>
      <h2 className="mq-end-title">{win ? '恭喜過關！' : '挑戰失敗'}</h2>
      <p className="mq-end-score">⭐ 得分：{score}</p>
      <p className="mq-end-char" style={{ color: info.color }}>{info.emoji} {info.name}</p>
      <button className="mq-end-btn" onClick={onReset}>重新開始</button>
    </div>
  )
}
