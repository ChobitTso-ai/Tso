import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState, Move, PieceType } from '../../chess/types'
import { parseFen, applyMove } from '../../chess/board'
import { getLegalMoves } from '../../chess/moves'
import { getBestMove } from '../../chess/ai'
import { ENDGAME_POSITIONS, CATEGORIES } from '../../chess/endgames'
import type { GoalType } from '../../chess/endgames'
import ChessBoard from './ChessBoard'
import './EndgamePractice.css'

type Progress = Record<number, 'solved' | 'attempted'>

const STORAGE_KEY = 'chess_endgame_progress'
const AI_DIFFICULTY = 4

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

function goalAchieved(state: GameState, goal: GoalType): boolean {
  if (goal === '白方獲勝') return state.status === 'checkmate' && state.turn === 'b'
  if (goal === '黑方獲勝') return state.status === 'checkmate' && state.turn === 'w'
  if (goal === '和棋') return state.status === 'draw' || state.status === 'stalemate'
  return false
}

function diffStars(d: 1 | 2 | 3) {
  return '★'.repeat(d) + '☆'.repeat(3 - d)
}

function statusLabel(state: GameState): string {
  if (state.status === 'checkmate') return state.turn === 'b' ? '白方勝！' : '黑方勝！'
  if (state.status === 'stalemate') return '逼和'
  if (state.status === 'draw') return '和棋'
  if (state.status === 'check') return `${state.turn === 'w' ? '白方' : '黑方'}被將！`
  return state.turn === 'w' ? '白方回合' : '黑方回合'
}

export default function EndgamePractice() {
  const [idx, setIdx] = useState(0)
  const [state, setState] = useState<GameState>(() => parseFen(ENDGAME_POSITIONS[0].fen))
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [legalMoves, setLegalMoves] = useState<Move[]>([])
  const [flipped, setFlipped] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [promotionPending, setPromotionPending] = useState<Move | null>(null)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [showHint, setShowHint] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('全部')
  const [resultMsg, setResultMsg] = useState('')

  const isThinkingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stateRef = useRef(state)
  stateRef.current = state

  const pos = ENDGAME_POSITIONS[idx]

  // Endgame positions have few pieces; level-3 search completes in < 100ms → main thread is fine
  const cancelAI = () => {
    clearTimeout(timerRef.current)
    isThinkingRef.current = false
    setAiThinking(false)
  }

  const loadPosition = useCallback((newIdx: number) => {
    cancelAI()
    const p = ENDGAME_POSITIONS[newIdx]
    setIdx(newIdx)
    setState(parseFen(p.fen))
    setSelected(null)
    setLegalMoves([])
    setFlipped(p.playerColor === 'b')
    setPromotionPending(null)
    setShowHint(false)
    setResultMsg('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // AI trigger
  useEffect(() => {
    const s = stateRef.current
    const p = pos
    const isAITurn = s.turn !== p.playerColor
    const isPlaying = s.status === 'playing' || s.status === 'check'
    if (!isAITurn || !isPlaying || isThinkingRef.current) return

    isThinkingRef.current = true; setAiThinking(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const cur = stateRef.current
      try {
        const move = getBestMove(cur, AI_DIFFICULTY)
        if (move) setState(prev => applyMove(prev, move))
      } catch { /* ignore */ } finally {
        isThinkingRef.current = false; setAiThinking(false)
      }
    }, 300)
    return () => clearTimeout(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, idx])

  // Result detection
  useEffect(() => {
    const terminal = ['checkmate', 'stalemate', 'draw'].includes(state.status)
    if (!terminal) { setResultMsg(''); return }

    const succeeded = goalAchieved(state, pos.goal)
    setResultMsg(succeeded ? '達成目標！' : '目標未達成')

    setProgress(prev => {
      const next = { ...prev }
      if (succeeded) next[pos.id] = 'solved'
      else if (!prev[pos.id]) next[pos.id] = 'attempted'
      saveProgress(next)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, idx])

  const findKingInCheck = useCallback(() => {
    if (state.status !== 'check' && state.status !== 'checkmate') return null
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++)
        if (state.board[r][f]?.type === 'K' && state.board[r][f]!.color === state.turn)
          return [r, f] as [number, number]
    return null
  }, [state])

  const handleSquareClick = useCallback((r: number, f: number) => {
    if (isThinkingRef.current) return
    if (!['playing', 'check'].includes(state.status)) return
    if (state.turn !== pos.playerColor) return

    if (selected) {
      const move = legalMoves.find(m => m.to[0] === r && m.to[1] === f)
      if (move) {
        const promos = legalMoves.filter(m => m.to[0] === r && m.to[1] === f && m.promotion)
        if (promos.length > 0) { setPromotionPending(promos[0]); setSelected(null); setLegalMoves([]); return }
        setState(prev => applyMove(prev, move))
        setSelected(null); setLegalMoves([]); return
      }
    }
    const piece = state.board[r][f]
    if (piece && piece.color === state.turn) {
      setSelected([r, f])
      setLegalMoves(getLegalMoves(state, [r, f]))
    } else {
      setSelected(null); setLegalMoves([])
    }
  }, [selected, legalMoves, state, pos])

  const handlePromotion = (type: PieceType) => {
    if (!promotionPending) return
    setState(prev => applyMove(prev, { ...promotionPending, promotion: type }))
    setPromotionPending(null); setSelected(null); setLegalMoves([])
  }

  const handleReset = () => loadPosition(idx)
  const handlePrev = () => { const i = (idx - 1 + ENDGAME_POSITIONS.length) % ENDGAME_POSITIONS.length; loadPosition(i) }
  const handleNext = () => { const i = (idx + 1) % ENDGAME_POSITIONS.length; loadPosition(i) }

  const lastMove = state.history.length > 0 ? state.history[state.history.length - 1].move : null

  const categories = ['全部', ...CATEGORIES]
  const filteredPositions = ENDGAME_POSITIONS.filter(p => filterCat === '全部' || p.category === filterCat)

  const solvedCount = Object.values(progress).filter(v => v === 'solved').length

  return (
    <div className="ep-container">
      {/* Position List Sidebar */}
      <div className="ep-sidebar">
        <div className="ep-progress-summary">
          <span className="ep-progress-text">進度 {solvedCount} / 100</span>
          <div className="ep-progress-bar">
            <div className="ep-progress-fill" style={{ width: `${solvedCount}%` }} />
          </div>
        </div>

        <div className="ep-cat-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`ep-cat-tab ${filterCat === cat ? 'active' : ''}`}
              onClick={() => setFilterCat(cat)}
            >{cat}</button>
          ))}
        </div>

        <div className="ep-list">
          {filteredPositions.map(p => {
            const prog = progress[p.id]
            return (
              <button
                key={p.id}
                className={`ep-item ${idx === ENDGAME_POSITIONS.indexOf(p) ? 'active' : ''} ${prog === 'solved' ? 'solved' : prog === 'attempted' ? 'attempted' : ''}`}
                onClick={() => loadPosition(ENDGAME_POSITIONS.indexOf(p))}
              >
                <span className="ep-item-id">#{p.id}</span>
                <span className="ep-item-name">{p.name}</span>
                <span className="ep-item-status">
                  {prog === 'solved' ? '✓' : prog === 'attempted' ? '○' : '·'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Board Area */}
      <div className="ep-board-area">
        {promotionPending && (
          <div className="promo-overlay">
            <div className="promo-card">
              <div className="promo-title">升變選擇</div>
              {(['Q', 'R', 'B', 'N'] as PieceType[]).map(t => (
                <button key={t} className="promo-btn" onClick={() => handlePromotion(t)}>
                  {['♕♛', '♖♜', '♗♝', '♘♞'][['Q', 'R', 'B', 'N'].indexOf(t)].split('')[pos.playerColor === 'w' ? 0 : 1]}
                </button>
              ))}
            </div>
          </div>
        )}

        {aiThinking && <div className="ep-thinking">🤖 AI 思考中…</div>}

        {resultMsg && (
          <div className={`ep-result ${resultMsg.includes('達成') ? 'success' : 'fail'}`}>
            {resultMsg}
          </div>
        )}

        <ChessBoard
          board={state.board}
          selected={selected}
          legalMoves={legalMoves}
          lastMove={lastMove}
          checkKing={findKingInCheck()}
          flipped={flipped}
          onSquareClick={handleSquareClick}
        />

        <div className="ep-nav">
          <button onClick={handlePrev}>◀ 上一題</button>
          <button onClick={handleReset} className="ep-reset">重置局面</button>
          <button onClick={() => setFlipped(f => !f)}>翻轉棋盤</button>
          <button onClick={handleNext}>下一題 ▶</button>
        </div>
      </div>

      {/* Info Panel */}
      <div className="ep-info">
        <div className="ep-pos-header">
          <span className="ep-pos-id">#{pos.id}</span>
          <span className="ep-cat-badge">{pos.category}</span>
        </div>

        <h2 className="ep-pos-name">{pos.name}</h2>

        <div className="ep-difficulty">
          難度 <span className="ep-stars">{diffStars(pos.difficulty)}</span>
        </div>

        <div className={`ep-goal ${pos.goal === '和棋' ? 'goal-draw' : 'goal-win'}`}>
          目標：{pos.goal}
          <span className="ep-player-side">（你執{pos.playerColor === 'w' ? '白' : '黑'}）</span>
        </div>

        <div className={`ep-status ${['checkmate', 'stalemate', 'draw'].includes(state.status) ? 'terminal' : ''}`}>
          {statusLabel(state)}
        </div>

        <div className="ep-hint-section">
          <button
            className="ep-hint-btn"
            onClick={() => setShowHint(h => !h)}
          >{showHint ? '隱藏提示' : '顯示提示'}</button>
          {showHint && <p className="ep-hint-text">{pos.hint}</p>}
        </div>

        <div className="ep-pos-progress">
          {(() => {
            const prog = progress[pos.id]
            if (prog === 'solved') return <span className="prog-solved">✓ 已解決</span>
            if (prog === 'attempted') return <span className="prog-attempted">○ 嘗試過</span>
            return <span className="prog-new">· 未嘗試</span>
          })()}
        </div>

        <div className="ep-history">
          <div className="ep-history-title">棋譜</div>
          <div className="ep-history-list">
            {Array.from({ length: Math.ceil(state.history.length / 2) }, (_, i) => (
              <div key={i} className="ep-history-pair">
                <span className="ep-move-num">{i + 1}.</span>
                <span>{state.history[i * 2]?.notation ?? ''}</span>
                <span>{state.history[i * 2 + 1]?.notation ?? ''}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          className="ep-clear-btn"
          onClick={() => { if (confirm('確定要清除所有進度嗎？')) { setProgress({}); saveProgress({}) } }}
        >清除進度</button>
      </div>
    </div>
  )
}
