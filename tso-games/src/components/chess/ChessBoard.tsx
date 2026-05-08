import type { BoardArray, Move, PieceType } from '../../chess/types'
import './ChessBoard.css'

const PIECE_UNICODE: Record<PieceType, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
}

interface Props {
  board: BoardArray
  selected: [number, number] | null
  legalMoves: Move[]
  lastMove: Move | null
  checkKing: [number, number] | null
  flipped: boolean
  onSquareClick: (r: number, f: number) => void
}

export default function ChessBoard({
  board, selected, legalMoves, lastMove, checkKing, flipped, onSquareClick,
}: Props) {
  const legalSet = new Set(legalMoves.map(m => `${m.to[0]},${m.to[1]}`))
  const legalCaptures = new Set(
    legalMoves.filter(m => board[m.to[0]][m.to[1]] || m.enPassant).map(m => `${m.to[0]},${m.to[1]}`)
  )

  const ranks = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0]
  const files = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7]

  return (
    <div className="chess-board">
      {ranks.map(r => (
        <div key={r} className="board-row">
          <span className="coord-rank">{8 - r}</span>
          {files.map(f => {
            const piece = board[r][f]
            const isLight = (r + f) % 2 === 0
            const isSelected = selected?.[0] === r && selected?.[1] === f
            const isLast = lastMove && (
              (lastMove.from[0] === r && lastMove.from[1] === f) ||
              (lastMove.to[0] === r && lastMove.to[1] === f)
            )
            const isCheck = checkKing?.[0] === r && checkKing?.[1] === f
            const key = `${r},${f}`
            const isHint = legalSet.has(key)
            const isCaptureHint = legalCaptures.has(key)

            return (
              <div
                key={f}
                className={[
                  'square',
                  isLight ? 'light' : 'dark',
                  isSelected ? 'selected' : '',
                  isLast ? 'last-move' : '',
                  isCheck ? 'in-check' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSquareClick(r, f)}
              >
                {isHint && !isCaptureHint && <div className="hint-dot" />}
                {isCaptureHint && <div className="hint-capture" />}
                {piece && (
                  <span className={`piece piece-${piece.color}`}>
                    {PIECE_UNICODE[piece.type]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
      <div className="coord-files">
        <span className="coord-rank-spacer" />
        {files.map(f => (
          <span key={f} className="coord-file">{String.fromCharCode(97 + f)}</span>
        ))}
      </div>
    </div>
  )
}
