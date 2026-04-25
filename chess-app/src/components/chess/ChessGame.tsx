import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameConfig, GameState, Move, PieceType } from '../../chess/types'
import { createInitialState, applyMove, parseFen } from '../../chess/board'
import { getLegalMoves } from '../../chess/moves'
import { parseShareUrl } from '../../chess/save'
import ChessBoard from './ChessBoard'
import Sidebar from './Sidebar'
import GameSetup from './GameSetup'
import './ChessGame.css'

export default function ChessGame() {
  const [state, setState] = useState<GameState>(() => createInitialState())
  const [config, setConfig] = useState<GameConfig>({ mode: 'pvc', difficulty: 3, playerColor: 'w' })
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [legalMoves, setLegalMoves] = useState<Move[]>([])
  const [flipped, setFlipped] = useState(false)
  const [showSetup, setShowSetup] = useState(true)
  const [promotionPending, setPromotionPending] = useState<Move | null>(null)
  const [aiThinking, setAiThinking] = useState(false)

  // Ref-based lock to prevent re-triggering (must not be in effect deps)
  const isThinkingRef = useRef(false)
  const workerRef = useRef<Worker | null>(null)

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

  // Create Web Worker once on mount
  useEffect(() => {
    const worker = new Worker(
      new URL('../../chess/ai.worker.ts', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (e: MessageEvent<Move | null>) => {
      isThinkingRef.current = false
      setAiThinking(false)
      if (e.data) setState(prev => applyMove(prev, e.data!))
    }
    worker.onerror = () => {
      isThinkingRef.current = false
      setAiThinking(false)
    }
    workerRef.current = worker
    return () => { worker.terminate(); workerRef.current = null }
  }, [])

  // AI move trigger — aiThinking intentionally NOT in deps to avoid timer cancellation
  useEffect(() => {
    const isAITurn = config.mode === 'pvc' && state.turn !== config.playerColor
    const isPlaying = state.status === 'playing' || state.status === 'check'
    if (!isAITurn || !isPlaying || showSetup || isThinkingRef.current) return

    isThinkingRef.current = true
    setAiThinking(true)

    const timer = setTimeout(() => {
      workerRef.current?.postMessage({ state, level: config.difficulty })
    }, 300)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, config, showSetup])

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
    if (config.mode === 'pvc' && state.turn !== config.playerColor) return

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
  }, [selected, legalMoves, state, config, showSetup])

  const handlePromotion = (type: PieceType) => {
    if (!promotionPending) return
    const move = legalMoves.find(m =>
      m.to[0] === promotionPending.to[0] &&
      m.to[1] === promotionPending.to[1] &&
      m.promotion === type
    ) ?? { ...promotionPending, promotion: type }
    setState(prev => applyMove(prev, move))
    setPromotionPending(null)
    setSelected(null)
    setLegalMoves([])
  }

  const resetWorker = () => {
    workerRef.current?.terminate()
    const worker = new Worker(
      new URL('../../chess/ai.worker.ts', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (e: MessageEvent<Move | null>) => {
      isThinkingRef.current = false
      setAiThinking(false)
      if (e.data) setState(prev => applyMove(prev, e.data!))
    }
    worker.onerror = () => { isThinkingRef.current = false; setAiThinking(false) }
    workerRef.current = worker
  }

  const handleUndo = () => {
    if (state.history.length === 0) return
    resetWorker()
    isThinkingRef.current = false
    setAiThinking(false)
    const undoCount = config.mode === 'pvc' && state.history.length >= 2 ? 2 : 1
    const targetIdx = Math.max(0, state.history.length - undoCount)
    const targetFen = state.history[targetIdx]?.fen
    const restored = targetFen ? parseFen(targetFen) : createInitialState()
    setState({ ...restored, history: state.history.slice(0, targetIdx) })
    setSelected(null)
    setLegalMoves([])
  }

  const handleNewGame = (cfg?: GameConfig) => {
    resetWorker()
    isThinkingRef.current = false
    setAiThinking(false)
    const newConfig = cfg ?? config
    setState(createInitialState())
    setConfig(newConfig)
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
          onLoadState={(s, c) => { setState(s); setConfig(c); setShowSetup(false) }}
        />
      </div>
    </div>
  )
}
