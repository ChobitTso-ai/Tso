import { useState, useEffect, useCallback, useRef } from 'react'
import { getQuestion, type CharacterId, type Question } from './questions'
import { Sfx } from './sounds'
import './MathQuest.css'

// ── 型別 ──────────────────────────────────────────────────────────────────────

type CellType = 'empty' | 'monster' | 'item' | 'boss' | 'start'
type Screen = 'select' | 'map' | 'battle' | 'boss' | 'win' | 'lose'
type ItemType = 'heal' | 'skip'

interface Cell { type: CellType; defeated: boolean }

interface GameState {
  char: CharacterId
  level: 1 | 2 | 3
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
  combo: number
  maxCombo: number
  items: ItemType[]
}

interface ScoreEntry {
  char: CharacterId
  score: number
  maxCombo: number
  level: number
  date: string
}

// ── 常數 ──────────────────────────────────────────────────────────────────────

const CHAR_INFO = {
  alan: { name: 'Alan', maxHp: 4, color: '#4A90D9', emoji: '🧒', subject: '九九乘法', desc: '專攻乘法表，穩健冷靜' },
  ryan: { name: 'Ryan T', maxHp: 5, color: '#E8A020', emoji: '😄', subject: '小學數學', desc: '活潑挑戰，四五六年級題目' },
}

const LEVEL_SIZE: Record<1 | 2 | 3, number> = { 1: 5, 2: 7, 3: 9 }
const BOSS_Q: Record<1 | 2 | 3, number> = { 1: 3, 2: 4, 3: 5 }

const STORAGE_KEY = 'mathQuestGame'
const LEADERBOARD_KEY = 'mathQuestLeaderboard'

// ── 工具 ──────────────────────────────────────────────────────────────────────

function buildBoard(size: number): Cell[][] {
  const board: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: 'empty' as CellType, defeated: false }))
  )
  board[0][0] = { type: 'start', defeated: false }
  board[size - 1][size - 1] = { type: 'boss', defeated: false }

  const positions: [number, number][] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!(r === 0 && c === 0) && !(r === size - 1 && c === size - 1))
        positions.push([r, c])

  const shuffled = positions.sort(() => Math.random() - 0.5)
  const total = shuffled.length
  const monsterCount = Math.floor(total * 0.42)
  const itemCount = Math.floor(total * 0.1)

  for (let i = 0; i < monsterCount; i++) board[shuffled[i][0]][shuffled[i][1]].type = 'monster'
  for (let i = monsterCount; i < monsterCount + itemCount; i++) board[shuffled[i][0]][shuffled[i][1]].type = 'item'

  return board
}

function buildBossQs(char: CharacterId, level: 1 | 2 | 3): Question[] {
  return Array.from({ length: BOSS_Q[level] }, () => getQuestion(char, level))
}

function comboBonus(combo: number): number {
  if (combo >= 5) return 10
  if (combo >= 3) return 5
  return 0
}

function saveScore(entry: Omit<ScoreEntry, 'date'>) {
  const saved = localStorage.getItem(LEADERBOARD_KEY)
  const board: ScoreEntry[] = saved ? JSON.parse(saved) : []
  board.push({ ...entry, date: new Date().toLocaleDateString('zh-TW') })
  board.sort((a, b) => b.score - a.score)
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.slice(0, 5)))
}

function loadLeaderboard(): ScoreEntry[] {
  const saved = localStorage.getItem(LEADERBOARD_KEY)
  return saved ? JSON.parse(saved) : []
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export default function MathQuest() {
  const [state, setState] = useState<GameState | null>(null)
  const [shaking, setShaking] = useState(false)
  const [sparkleCell, setSparkleCell] = useState<string | null>(null)
  const [itemToast, setItemToast] = useState<string | null>(null)
  const shakingRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setState(JSON.parse(saved)) } catch { /* 損壞就算了 */ }
    }
  }, [])

  useEffect(() => {
    if (state && state.screen !== 'select') localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const tryMove = useCallback((dr: number, dc: number) => {
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
        Sfx.move()
      } else if (cell.type === 'item' && !cell.defeated) {
        const item: ItemType = Math.random() < 0.5 ? 'heal' : 'skip'
        const newItems = prev.items.length < 3 ? [...prev.items, item] : prev.items
        newBoard[nr][nc].defeated = true
        Sfx.item()
        // toast handled outside via effect
        setTimeout(() => {
          setItemToast(item === 'heal' ? '💊 獲得回血藥！' : '🎫 獲得跳過券！')
          setTimeout(() => setItemToast(null), 1800)
        }, 0)
        return { ...prev, pos: [nr, nc], board: newBoard, hp: newHp, score: newScore + 5, items: newItems }
      } else if (cell.type === 'boss' && !cell.defeated) {
        const hasMonsters = newBoard.some(row => row.some(c => c.type === 'monster' && !c.defeated))
        if (hasMonsters) return prev
        Sfx.boss()
        return {
          ...prev, pos: [nr, nc],
          bossQ: buildBossQs(prev.char, prev.level),
          bossIndex: 0, bossWrongOptions: [],
          screen: 'boss',
        }
      } else {
        if (!cell.defeated) Sfx.move()
      }

      return {
        ...prev, pos: [nr, nc], board: newBoard,
        hp: newHp, score: newScore, screen: newScreen,
        question: newQ, wrongOptions: [],
      }
    })
  }, [])

  const handleKey = useCallback((e: KeyboardEvent) => {
    const dirs: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    }
    const d = dirs[e.key]
    if (d) { e.preventDefault(); tryMove(d[0], d[1]) }
  }, [tryMove])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // ── 動作 ──────────────────────────────────────────────────────────────────

  function startGame(char: CharacterId) {
    const info = CHAR_INFO[char]
    setState({
      char, level: 1,
      board: buildBoard(LEVEL_SIZE[1]),
      pos: [0, 0],
      hp: info.maxHp, maxHp: info.maxHp,
      score: 0, screen: 'map',
      question: null, wrongOptions: [],
      bossQ: [], bossIndex: 0, bossWrongOptions: [],
      combo: 0, maxCombo: 0,
      items: [],
    })
  }

  function triggerShake() {
    if (shakingRef.current) return
    shakingRef.current = true
    setShaking(true)
    setTimeout(() => { setShaking(false); shakingRef.current = false }, 500)
  }

  function triggerSparkle(r: number, c: number) {
    const key = `${r},${c}`
    setSparkleCell(key)
    setTimeout(() => setSparkleCell(null), 600)
  }

  function clickCell(r: number, c: number) {
    if (!state || state.screen !== 'map') return
    const [pr, pc] = state.pos
    if (Math.abs(r - pr) + Math.abs(c - pc) === 1) tryMove(r - pr, c - pc)
  }

  function useItem(item: ItemType) {
    setState(prev => {
      if (!prev) return prev
      const idx = prev.items.indexOf(item)
      if (idx === -1) return prev
      const newItems = prev.items.filter((_, i) => i !== idx)
      if (item === 'heal') {
        Sfx.item()
        return { ...prev, items: newItems, hp: Math.min(prev.maxHp, prev.hp + 1) }
      }
      return { ...prev, items: newItems }
    })
  }

  function useSkipInBattle() {
    setState(prev => {
      if (!prev) return prev
      const idx = prev.items.indexOf('skip')
      if (idx === -1) return prev
      const newItems = prev.items.filter((_, i) => i !== idx)
      const newBoard = prev.board.map(row => row.map(c => ({ ...c })))
      const [r, c] = prev.pos
      newBoard[r][c].defeated = true
      triggerSparkle(r, c)
      Sfx.correct()
      return { ...prev, items: newItems, board: newBoard, screen: 'map', question: null, wrongOptions: [] }
    })
  }

  function useSkipInBoss() {
    setState(prev => {
      if (!prev) return prev
      const idx = prev.items.indexOf('skip')
      if (idx === -1) return prev
      const newItems = prev.items.filter((_, i) => i !== idx)
      const next = prev.bossIndex + 1
      if (next >= prev.bossQ.length) {
        return resolveWin({ ...prev, items: newItems })
      }
      return { ...prev, items: newItems, bossIndex: next, bossWrongOptions: [] }
    })
  }

  function resolveWin(prev: GameState): GameState {
    const newBoard = prev.board.map(row => row.map(c => ({ ...c })))
    const [r, c] = prev.pos
    newBoard[r][c].defeated = true
    const nextLevel = (prev.level + 1) as 1 | 2 | 3
    if (nextLevel > 3) {
      Sfx.win()
      saveScore({ char: prev.char, score: prev.score + 50, maxCombo: prev.maxCombo, level: prev.level })
      return { ...prev, board: newBoard, score: prev.score + 50, screen: 'win' }
    }
    Sfx.win()
    return {
      ...prev,
      level: nextLevel,
      board: buildBoard(LEVEL_SIZE[nextLevel]),
      pos: [0, 0],
      score: prev.score + 50,
      screen: 'map',
      bossQ: [], bossIndex: 0, bossWrongOptions: [],
    }
  }

  function answerQuestion(option: number) {
    setState(prev => {
      if (!prev || !prev.question) return prev
      if (option === prev.question.answer) {
        const newCombo = prev.combo + 1
        const newMaxCombo = Math.max(prev.maxCombo, newCombo)
        const bonus = comboBonus(newCombo)
        const newBoard = prev.board.map(row => row.map(c => ({ ...c })))
        const [r, c] = prev.pos
        newBoard[r][c].defeated = true
        if (newCombo >= 3) Sfx.combo(); else Sfx.correct()
        triggerSparkle(r, c)
        return {
          ...prev, board: newBoard,
          score: prev.score + 10 + bonus,
          combo: newCombo, maxCombo: newMaxCombo,
          screen: 'map', question: null, wrongOptions: [],
        }
      } else {
        Sfx.wrong()
        triggerShake()
        const newHp = prev.hp - 1
        if (newHp <= 0) {
          Sfx.lose()
          saveScore({ char: prev.char, score: prev.score, maxCombo: prev.maxCombo, level: prev.level })
          return { ...prev, hp: 0, combo: 0, screen: 'lose' }
        }
        return { ...prev, hp: newHp, combo: 0, wrongOptions: [...prev.wrongOptions, option] }
      }
    })
  }

  function answerBoss(option: number) {
    setState(prev => {
      if (!prev) return prev
      const q = prev.bossQ[prev.bossIndex]
      if (option === q.answer) {
        const newCombo = prev.combo + 1
        const newMaxCombo = Math.max(prev.maxCombo, newCombo)
        if (newCombo >= 3) Sfx.combo(); else Sfx.correct()
        const next = prev.bossIndex + 1
        if (next >= prev.bossQ.length) return resolveWin({ ...prev, combo: newCombo, maxCombo: newMaxCombo })
        return { ...prev, bossIndex: next, bossWrongOptions: [], combo: newCombo, maxCombo: newMaxCombo }
      } else {
        Sfx.wrong()
        triggerShake()
        const newHp = prev.hp - 1
        if (newHp <= 0) {
          Sfx.lose()
          saveScore({ char: prev.char, score: prev.score, maxCombo: prev.maxCombo, level: prev.level })
          return { ...prev, hp: 0, combo: 0, screen: 'lose' }
        }
        return { ...prev, hp: newHp, combo: 0, bossWrongOptions: [...prev.bossWrongOptions, option] }
      }
    })
  }

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY)
    setState(null)
  }

  // ── 渲染 ──────────────────────────────────────────────────────────────────

  if (!state || state.screen === 'select') return <SelectScreen onSelect={startGame} />
  if (state.screen === 'win') return <EndScreen win score={state.score} maxCombo={state.maxCombo} char={state.char} onReset={resetGame} />
  if (state.screen === 'lose') return <EndScreen win={false} score={state.score} maxCombo={state.maxCombo} char={state.char} onReset={resetGame} />

  const info = CHAR_INFO[state.char]
  const hasMonsters = state.board.some(row => row.some(c => c.type === 'monster' && !c.defeated))

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
        {state.combo >= 2 && (
          <span className={`mq-combo ${state.combo >= 5 ? 'mq-combo-fire' : ''}`}>
            🔥 x{state.combo}
          </span>
        )}
        <span className="mq-level">Lv.{state.level}</span>
        <button className="mq-reset-btn" onClick={resetGame}>🔄</button>
      </div>

      {/* 道具欄 */}
      {state.items.length > 0 && (
        <div className="mq-items-bar">
          {state.items.map((item, i) => (
            <button
              key={i}
              className="mq-item-btn"
              title={item === 'heal' ? '回血 +1' : '跳過當前題目'}
              onClick={() => state.screen === 'map' && item === 'heal' ? useItem('heal') : undefined}
            >
              {item === 'heal' ? '💊' : '🎫'}
            </button>
          ))}
        </div>
      )}

      {/* 地圖 */}
      <Board board={state.board} pos={state.pos} onClickCell={clickCell} level={state.level} sparkleCell={sparkleCell} />

      {hasMonsters && state.screen === 'map' && (
        <p className="mq-boss-hint">⚠️ 打倒所有怪物才能進城堡！</p>
      )}

      {/* 道具 toast */}
      {itemToast && <div className="mq-toast">{itemToast}</div>}

      {/* 戰鬥覆蓋層 */}
      {state.screen === 'battle' && state.question && (
        <BattleOverlay
          question={state.question}
          wrongOptions={state.wrongOptions}
          onAnswer={answerQuestion}
          isBoss={false}
          shaking={shaking}
          hasSkip={state.items.includes('skip')}
          onSkip={useSkipInBattle}
        />
      )}
      {state.screen === 'boss' && state.bossQ[state.bossIndex] && (
        <BattleOverlay
          question={state.bossQ[state.bossIndex]}
          wrongOptions={state.bossWrongOptions}
          onAnswer={answerBoss}
          isBoss
          bossProgress={[state.bossIndex, state.bossQ.length]}
          shaking={shaking}
          hasSkip={state.items.includes('skip')}
          onSkip={useSkipInBoss}
        />
      )}
    </div>
  )
}

// ── 子元件 ────────────────────────────────────────────────────────────────────

function SelectScreen({ onSelect }: { onSelect: (c: CharacterId) => void }) {
  const lb = loadLeaderboard()
  return (
    <div className="mq-select">
      <h1 className="mq-select-title">🔢 數學冒險</h1>
      <p className="mq-select-sub">選擇你的角色，開始挑戰！</p>
      <div className="mq-chars">
        <CharCard id="alan" onSelect={onSelect} />
        <CharCard id="ryan" onSelect={onSelect} />
      </div>
      {lb.length > 0 && (
        <div className="mq-lb-mini">
          <p className="mq-lb-title">🏆 最高分排行</p>
          {lb.map((e, i) => (
            <div key={i} className="mq-lb-row">
              <span className="mq-lb-rank">{['🥇','🥈','🥉','4.','5.'][i]}</span>
              <span>{CHAR_INFO[e.char].name}</span>
              <span className="mq-lb-score">⭐{e.score}</span>
              <span className="mq-lb-combo">🔥{e.maxCombo}</span>
              <span className="mq-lb-date">{e.date}</span>
            </div>
          ))}
        </div>
      )}
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
      <div className="mq-char-stats"><span>❤️ {info.maxHp} 顆心</span></div>
      <button className="mq-select-btn" style={{ background: info.color }}>選擇</button>
    </div>
  )
}

// Alan: 栗子頭（稍內斂，兩側貼耳）
function AlanAvatar() {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="44" r="23" fill="#FDDBB4" />
      <ellipse cx="17" cy="46" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="63" cy="46" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="40" cy="30" rx="22" ry="17" fill="#5C3317" />
      <rect x="18" y="30" width="9" height="18" rx="5" fill="#5C3317" />
      <rect x="53" y="30" width="9" height="18" rx="5" fill="#5C3317" />
      <rect x="18" y="37" width="44" height="6" rx="2" fill="#5C3317" />
      <ellipse cx="32" cy="48" rx="3.5" ry="4" fill="#2C1810" />
      <ellipse cx="48" cy="48" rx="3.5" ry="4" fill="#2C1810" />
      <circle cx="33.2" cy="46.8" r="1.1" fill="white" />
      <circle cx="49.2" cy="46.8" r="1.1" fill="white" />
      <path d="M33 57 Q40 63 47 57" stroke="#C77" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="22" y="66" width="36" height="12" rx="6" fill="#B0B0B0" />
    </svg>
  )
}

// Ryan T: 刺蝟頭（多刺、蓬鬆、側面也有）
function RyanAvatar() {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="42" r="25" fill="#FDDBB4" />
      <ellipse cx="15" cy="44" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="65" cy="44" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="40" cy="22" rx="25" ry="13" fill="#1a0f0a" />
      <rect x="15" y="20" width="9" height="14" rx="5" fill="#1a0f0a" />
      <rect x="56" y="20" width="9" height="14" rx="5" fill="#1a0f0a" />
      <polygon points="17,23 12,5 25,20" fill="#1a0f0a" />
      <polygon points="26,17 24,2 33,15" fill="#1a0f0a" />
      <polygon points="33,13 32,0 39,12" fill="#1a0f0a" />
      <polygon points="40,12 40,0 47,12" fill="#1a0f0a" />
      <polygon points="47,13 48,0 55,13" fill="#1a0f0a" />
      <polygon points="54,17 56,2 63,15" fill="#1a0f0a" />
      <polygon points="63,23 68,5 55,20" fill="#1a0f0a" />
      <path d="M28 40 Q32 36 36 40" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 40 Q48 36 52 40" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M30 52 Q40 62 50 52" stroke="#C77" strokeWidth="2" fill="#FF9999" strokeLinecap="round" />
      <rect x="22" y="65" width="36" height="13" rx="6" fill="#B0B0B0" />
      <line x1="62" y1="57" x2="69" y2="46" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
      <line x1="65" y1="59" x2="73" y2="50" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

// 地形圖示（固定隨位置，隱藏格子類型）
const TERRAIN = ['🌳', '🌲', '🏚️', '🪨', '🌿', '🌳', '🏚️', '🌲']
function terrainIcon(r: number, c: number) {
  return TERRAIN[(r * 7 + c * 3) % TERRAIN.length]
}

function Board({ board, pos, onClickCell, level, sparkleCell }: {
  board: Cell[][]
  pos: [number, number]
  onClickCell: (r: number, c: number) => void
  level: number
  sparkleCell: string | null
}) {
  const size = board.length
  const [pr, pc] = pos
  const fontSize = size <= 5 ? '2.2rem' : size <= 7 ? '1.7rem' : '1.3rem'

  return (
    <div className="mq-map-wrap">
      <p className="mq-map-label">關卡 {level} — {size}×{size} 地圖</p>
      <div className="mq-board" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isPlayer = r === pr && c === pc
            const isAdj = !isPlayer && Math.abs(r - pr) + Math.abs(c - pc) === 1
            const isBossCell = r === size - 1 && c === size - 1
            const isStart = r === 0 && c === 0
            const isSparkle = sparkleCell === `${r},${c}`

            let icon: string
            if (isStart) icon = '🏠'
            else if (isBossCell) icon = cell.defeated ? '✅' : '🏰'
            else if (cell.defeated) icon = '🟫'
            else icon = terrainIcon(r, c)

            return (
              <div
                key={`${r}-${c}`}
                style={{ fontSize }}
                className={[
                  'mq-cell',
                  isPlayer ? 'mq-cell-player' : '',
                  isAdj ? 'mq-cell-adj' : '',
                  cell.defeated ? 'mq-cell-done' : '',
                  isSparkle ? 'mq-cell-sparkle' : '',
                ].join(' ')}
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

function BattleOverlay({ question, wrongOptions, onAnswer, isBoss, bossProgress, shaking, hasSkip, onSkip }: {
  question: Question
  wrongOptions: number[]
  onAnswer: (n: number) => void
  isBoss: boolean
  bossProgress?: [number, number]
  shaking: boolean
  hasSkip: boolean
  onSkip: () => void
}) {
  return (
    <div className="mq-overlay">
      <div className={`mq-battle-box ${shaking ? 'mq-shake' : ''}`}>
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
        {wrongOptions.length > 0 && <p className="mq-wrong-hint">❌ 答錯！扣 1 顆心，繼續選</p>}
        {hasSkip && (
          <button className="mq-skip-btn" onClick={onSkip}>🎫 使用跳過券</button>
        )}
      </div>
    </div>
  )
}

function EndScreen({ win, score, maxCombo, char, onReset }: {
  win: boolean; score: number; maxCombo: number; char: CharacterId; onReset: () => void
}) {
  const info = CHAR_INFO[char]
  const lb = loadLeaderboard()
  return (
    <div className="mq-end">
      <p className="mq-end-icon">{win ? '🏆' : '💀'}</p>
      <h2 className="mq-end-title">{win ? '完全過關！' : '挑戰失敗'}</h2>
      <p className="mq-end-score">⭐ {score} 分</p>
      <p className="mq-end-combo">🔥 最高連答 {maxCombo} 題</p>
      <p className="mq-end-char" style={{ color: info.color }}>{info.emoji} {info.name}</p>

      {lb.length > 0 && (
        <div className="mq-lb">
          <p className="mq-lb-title">🏆 歷史最高分</p>
          {lb.map((e, i) => (
            <div key={i} className={`mq-lb-row ${e.score === score && e.char === char ? 'mq-lb-current' : ''}`}>
              <span className="mq-lb-rank">{['🥇','🥈','🥉','4.','5.'][i]}</span>
              <span>{CHAR_INFO[e.char].name}</span>
              <span className="mq-lb-score">⭐{e.score}</span>
              <span className="mq-lb-combo">🔥{e.maxCombo}</span>
              <span className="mq-lb-date">{e.date}</span>
            </div>
          ))}
        </div>
      )}

      <button className="mq-end-btn" onClick={onReset}>重新開始</button>
    </div>
  )
}
