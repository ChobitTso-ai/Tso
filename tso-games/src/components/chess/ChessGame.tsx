import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameConfig, GameState, Move, PieceType } from '../../chess/types'
import { createInitialState, applyMove, parseFen } from '../../chess/board'
import { getLegalMoves } from '../../chess/moves'
import { getBestMove } from '../../chess/ai'
import { parseShareUrl } from '../../chess/save'
import ChessBoard from './ChessBoard'
import Sidebar from './Sidebar'
import GameSetup from './GameSetup'
import './ChessGame.css'

function createAiWorker(
  onMove: (move: Move | null) => void,
  onError: () => void
): Worker {
  const w = new Worker(
    new URL('../../chess/ai.worker.ts', import.meta.url),
    { type: 'module' }
  )
  w.onmessage = (e: MessageEvent<Move | null>) => onMove(e.data)
  w.onerror = () => onError()
  return w
}

export default function ChessGame() {
  const [state, setState] = useState<GameState>(() => createInitialState())
  const [config, setConfig] = useState<GameConfig>({ mode: 'pvc', difficulty: 3, playerColor: 'w' })
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [legalMoves, setLegalMoves] = useState<Move[]>([])
  const [flipped, setFlipped] = useState(false)
  const [showSetup, setShowSetup] = useState(true)
  const [promotionPending, setPromotionPending] = useState<Move | null>(null)
  const [aiThinking, setAiThinking] = useState(false)

  const isThinkingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stateRef = useRef(state)
  const configRef = useRef(config)
  const workerRef = useRef<Worker | null>(null)
  stateRef.current = state
  configRef.current = config

  // Create Web Worker once on mount; recreate on error
  useEffect(() => {
    const handleMove = (move: Move | null) => {
      isThinkingRef.current = false
      setAiThinking(false)
      if (move) setState(prev => applyMove(prev, move))
    }
    const handleError = () => {
      isThinkingRef.current = false
      setAiThinking(false)
    }
    workerRef.current = createAiWorker(handleMove, handleError)
    return () => { workerRef.current?.terminate(); workerRef.current = null }
  }, [])

  // Load from URL share on mount
  useEffect(() => {
    const shared = parseShareUrl()
    if (shared) {
      setState(shared.state)
      setConfig(shared.config)
      setShowSetup(false)
      window.location.hash = ''
    }
  }, [])

  // AI move trigger — aiThinking NOT in deps to prevent self-cancellation loop
  useEffect(() => {
    const s = stateRef.current
    const c = configRef.current
    const isAITurn = c.mode === 'pvc' && s.turn !== c.playerColor
    const isPlaying = s.status === 'playing' || s.status === 'check'

    if (!isAITurn || !isPlaying || showSetup || isThinkingRef.current) return

    isThinkingRef.current = true
    setAiThinking(true)

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const currentState = stateRef.current
      const currentConfig = configRef.current
      if (currentConfig.difficulty <= 2) {
        // Levels 1-2 are instant — run on main thread
        try {
          const move = getBestMove(currentState, currentConfig.difficulty)
          if (move) setState(prev => applyMove(prev, move))
        } catch {
          // ignore
        } finally {
          isThinkingRef.current = false
          setAiThinking(false)
        }
      } else {
        // Levels 3-5: off-load to Web Worker so UI stays responsive
        workerRef.current?.postMessage({ state: currentState, level: currentConfig.difficulty })
        // isThinkingRef stays true until worker's onmessage/onerror resets it
      }
    }, 300)

    return () => clearTimeout(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, showSetup])

  const findKingInCheck = useCallback(() => {
    if (state.status !== 'check' && state.status !== 'checkmate') return null
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++)
        if (state.board[r][f]?.type === 'K' && state.board[r][f]!.color === state.turn)
          return [r, f] as [number, number]
    return null
  }, [state])

  const handleSquareClick = useCallback((r: number, f: number) => {
    if (isThinkingRef.current || showSetup) return
    if (!['playing', 'check'].includes(state.status)) return
    if (configRef.current.mode === 'pvc' && state.turn !== configRef.current.playerColor) return

    if (selected) {
      const move = legalMoves.find(m => m.to[0] === r && m.to[1] === f)
      if (move) {
        const promoMoves = legalMoves.filter(m => m.to[0] === r && m.to[1] === f && m.promotion)
        if (promoMoves.length > 0) {
          setPromotionPending(promoMoves[0])
          setSelected(null)
          setLegalMoves([])
          return
        }
        setState(prev => applyMove(prev, move))
        setSelected(null)
        setLegalMoves([])
        return
      }
    }

    const piece = state.board[r][f]
    if (piece && piece.color === state.turn) {
      setSelected([r, f])
      setLegalMoves(getLegalMoves(state, [r, f]))
    } else {
      setSelected(null)
      setLegalMoves([])
    }
  }, [selected, legalMoves, state, showSetup])

  const handlePromotion = (type: PieceType) => {
    if (!promotionPending) return
    const move = { ...promotionPending, promotion: type }
    setState(prev => applyMove(prev, move))
    setPromotionPending(null)
    setSelected(null)
    setLegalMoves([])
  }

  const cancelAI = () => {
    clearTimeout(timerRef.current)
    isThinkingRef.current = false
    setAiThinking(false)
    // Terminate in-progress worker computation and create fresh worker
    workerRef.current?.terminate()
    workerRef.current = createAiWorker(
      (move) => {
        isThinkingRef.current = false
        setAiThinking(false)
        if (move) setState(prev => applyMove(prev, move))
      },
      () => { isThinkingRef.current = false; setAiThinking(false) }
    )
  }

  const handleUndo = () => {
    if (state.history.length === 0) return
    cancelAI()
    const undoCount = config.mode === 'pvc' && state.history.length >= 2 ? 2 : 1
    const targetIdx = Math.max(0, state.history.length - undoCount)
    const targetFen = state.history[targetIdx]?.fen
    const restored = targetFen ? parseFen(targetFen) : createInitialState()
    setState({ ...restored, history: state.history.slice(0, targetIdx) })
    setSelected(null)
    setLegalMoves([])
  }

  const handleNewGame = (cfg?: GameConfig) => {
    cancelAI()
    const newConfig = cfg ?? config
    setConfig(newConfig)
    setState(createInitialState())
    setSelected(null)
    setLegalMoves([])
    setShowSetup(false)
    setFlipped(newConfig.mode === 'pvc' && newConfig.playerColor === 'b')
  }

  const lastMove = state.history.length > 0 ? state.history[state.history.length - 1].move : null

  return (
    <div className="chess-game">
      {showSetup && <GameSetup onStart={cfg => handleNewGame(cfg)} />}

      {promotionPending && (
        <div className="promo-overlay">
          <div className="promo-card">
            <div className="promo-title">升變選擇</div>
            {(['Q', 'R', 'B', 'N'] as PieceType[]).map(t => (
              <button key={t} className="promo-btn" onClick={() => handlePromotion(t)}>
                {['♕♛','♖♜','♗♝','♘♞'][['Q','R','B','N'].indexOf(t)].split('')[state.turn === 'w' ? 0 : 1]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="game-layout">
        <div className="board-wrapper">
          {aiThinking && <div className="ai-thinking">🤖 AI 思考中...</div>}
          <ChessBoard
            board={state.board}
            selected={selected}
            legalMoves={legalMoves}
            lastMove={lastMove}
            checkKing={findKingInCheck()}
            flipped={flipped}
            onSquareClick={handleSquareClick}
          />
        </div>
        <Sidebar
          state={state}
          config={config}
          flipped={flipped}
          onNewGame={() => setShowSetup(true)}
          onUndo={handleUndo}
          onFlip={() => setFlipped(f => !f)}
          onLoadState={(s, c) => { cancelAI(); setState(s); setConfig(c); setShowSetup(false) }}
        />
      </div>
    </div>
  )
}
