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

// Alan: 栗子頭（稍內斂，兩側貼耳）
function AlanAvatar() {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      {/* 頭 */}
      <circle cx="40" cy="44" r="23" fill="#FDDBB4" />
      {/* 耳朵 */}
      <ellipse cx="17" cy="46" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="63" cy="46" rx="4" ry="5" fill="#FDDBB4" />
      {/* 栗子頭：圓頂，比頭略窄 */}
      <ellipse cx="40" cy="30" rx="22" ry="17" fill="#5C3317" />
      {/* 兩側薄片剛好蓋住耳朵上緣 */}
      <rect x="18" y="30" width="9" height="18" rx="5" fill="#5C3317" />
      <rect x="53" y="30" width="9" height="18" rx="5" fill="#5C3317" />
      {/* 劉海底線 */}
      <rect x="18" y="37" width="44" height="6" rx="2" fill="#5C3317" />
      {/* 眼睛 */}
      <ellipse cx="32" cy="48" rx="3.5" ry="4" fill="#2C1810" />
      <ellipse cx="48" cy="48" rx="3.5" ry="4" fill="#2C1810" />
      <circle cx="33.2" cy="46.8" r="1.1" fill="white" />
      <circle cx="49.2" cy="46.8" r="1.1" fill="white" />
      {/* 微笑 */}
      <path d="M33 57 Q40 63 47 57" stroke="#C77" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* 身體 */}
      <rect x="22" y="66" width="36" height="12" rx="6" fill="#B0B0B0" />
    </svg>
  )
}

// Ryan T: 刺蝟頭（多刺、蓬鬆、側面也有）
function RyanAvatar() {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      {/* 頭 */}
      <circle cx="40" cy="42" r="25" fill="#FDDBB4" />
      {/* 耳朵 */}
      <ellipse cx="15" cy="44" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="65" cy="44" rx="4" ry="5" fill="#FDDBB4" />
      {/* 髮基（寬厚橢圓） */}
      <ellipse cx="40" cy="22" rx="25" ry="13" fill="#1a0f0a" />
      {/* 側邊髮片 */}
      <rect x="15" y="20" width="9" height="14" rx="5" fill="#1a0f0a" />
      <rect x="56" y="20" width="9" height="14" rx="5" fill="#1a0f0a" />
      {/* 7 支刺（從左到右） */}
      <polygon points="17,23 12,5 25,20" fill="#1a0f0a" />
      <polygon points="26,17 24,2 33,15" fill="#1a0f0a" />
      <polygon points="33,13 32,0 39,12" fill="#1a0f0a" />
      <polygon points="40,12 40,0 47,12" fill="#1a0f0a" />
      <polygon points="47,13 48,0 55,13" fill="#1a0f0a" />
      <polygon points="54,17 56,2 63,15" fill="#1a0f0a" />
      <polygon points="63,23 68,5 55,20" fill="#1a0f0a" />
      {/* 閉眼笑 */}
      <path d="M28 40 Q32 36 36 40" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 40 Q48 36 52 40" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* 大笑嘴 */}
      <path d="M30 52 Q40 62 50 52" stroke="#C77" strokeWidth="2" fill="#FF9999" strokeLinecap="round" />
      {/* 身體 */}
      <rect x="22" y="65" width="36" height="13" rx="6" fill="#B0B0B0" />
      {/* 比YA */}
      <line x1="62" y1="57" x2="69" y2="46" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
      <line x1="65" y1="59" x2="73" y2="50" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

// 隱藏地形圖示（隨位置固定，不洩漏格子類型）
const TERRAIN = ['🌳', '🌲', '🏚️', '🪨', '🌿', '🌳', '🏚️', '🌲']
function terrainIcon(r: number, c: number) {
  return TERRAIN[(r * 7 + c * 3) % TERRAIN.length]
}

function Board({ board, pos, onClickCell, level }: {
  board: Cell[][], pos: [number, number], onClickCell: (r: number, c: number) => void, level: number
}) {
  const size = board.length
  const [pr, pc] = pos
  const fontSize = size === 5 ? '2.2rem' : '1.7rem'

  return (
    <div className="mq-map-wrap">
      <p className="mq-map-label">關卡 {level} — {size}×{size} 地圖</p>
      <div className="mq-board" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isPlayer = r === pr && c === pc
            const isAdjacent = !isPlayer && Math.abs(r - pr) + Math.abs(c - pc) === 1
            const isBossCell = r === size - 1 && c === size - 1
            const isStart = r === 0 && c === 0

            let icon: string
            if (isStart) {
              icon = '🏠'
            } else if (isBossCell) {
              icon = cell.defeated ? '✅' : '🏰'
            } else if (cell.defeated) {
              icon = '🟫'
            } else {
              // 未探索：全部用地形圖示隱藏
              icon = terrainIcon(r, c)
            }

            return (
              <div
                key={`${r}-${c}`}
                style={{ fontSize }}
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
