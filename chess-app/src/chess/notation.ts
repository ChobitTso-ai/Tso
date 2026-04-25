import type { GameState, Move, PieceType } from './types'
import { getLegalMoves } from './moves'

const LETTER: Record<PieceType, string> = { P: '', N: 'N', B: 'B', R: 'R', Q: 'Q', K: 'K' }

export function squareName(r: number, f: number): string {
  return String.fromCharCode(97 + f) + (8 - r)
}

export function moveToNotation(state: GameState, move: Move): string {
  if (move.castling === 'K') return 'O-O'
  if (move.castling === 'Q') return 'O-O-O'

  const { board } = state
  const [fr, ff] = move.from, [tr, tf] = move.to
  const piece = board[fr][ff]!
  const isCapture = !!board[tr][tf] || !!move.enPassant

  if (piece.type === 'P') {
    let n = isCapture ? String.fromCharCode(97 + ff) + 'x' + squareName(tr, tf) : squareName(tr, tf)
    if (move.promotion) n += '=' + move.promotion
    return n
  }

  const allMoves = getLegalMoves(state)
  const ambiguous = allMoves.filter(m => {
    const p = board[m.from[0]][m.from[1]]
    return p?.type === piece.type && p.color === piece.color
      && m.to[0] === tr && m.to[1] === tf
      && !(m.from[0] === fr && m.from[1] === ff)
  })

  let disambig = ''
  if (ambiguous.length > 0) {
    if (!ambiguous.some(m => m.from[1] === ff)) disambig = String.fromCharCode(97 + ff)
    else if (!ambiguous.some(m => m.from[0] === fr)) disambig = String(8 - fr)
    else disambig = squareName(fr, ff)
  }

  return LETTER[piece.type] + disambig + (isCapture ? 'x' : '') + squareName(tr, tf)
}
