import type { BoardArray, Color, GameState, Move, Piece, PieceType } from './types'
import { getLegalMoves, isInCheck } from './moves'
import { moveToNotation } from './notation'

// First 4 FEN fields (board, turn, castling, en-passant) uniquely identify a position
function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

function isInsufficientMaterial(board: BoardArray): boolean {
  const pieces: { type: string; color: string; r: number; f: number }[] = []
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++)
      if (board[r][f]) pieces.push({ ...board[r][f]!, r, f })

  if (pieces.length === 2) return true  // K vs K

  if (pieces.length === 3) {
    const minor = pieces.find(p => p.type !== 'K')
    return minor?.type === 'B' || minor?.type === 'N'  // K+B vs K  or  K+N vs K
  }

  if (pieces.length === 4) {
    const bishops = pieces.filter(p => p.type === 'B')
    if (bishops.length === 2 && pieces.every(p => p.type === 'K' || p.type === 'B')) {
      return (bishops[0].r + bishops[0].f) % 2 === (bishops[1].r + bishops[1].f) % 2  // same colour squares
    }
  }

  return false
}

export function createInitialState(): GameState {
  return parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
}

export function parseFen(fen: string): GameState {
  const parts = fen.split(' ')
  const board: BoardArray = parts[0].split('/').map(row => {
    const rank: (Piece | null)[] = []
    for (const ch of row) {
      if ('12345678'.includes(ch)) for (let i = 0; i < +ch; i++) rank.push(null)
      else rank.push({ type: ch.toUpperCase() as PieceType, color: ch === ch.toUpperCase() ? 'w' : 'b' })
    }
    return rank
  })

  const castlingStr = parts[2] ?? '-'
  let enPassant: [number, number] | null = null
  if (parts[3] && parts[3] !== '-') {
    enPassant = [8 - parseInt(parts[3][1]), parts[3].charCodeAt(0) - 97]
  }

  return {
    board,
    turn: (parts[1] ?? 'w') as Color,
    castling: {
      wK: castlingStr.includes('K'), wQ: castlingStr.includes('Q'),
      bK: castlingStr.includes('k'), bQ: castlingStr.includes('q'),
    },
    enPassant,
    halfMove: parseInt(parts[4] ?? '0'),
    fullMove: parseInt(parts[5] ?? '1'),
    status: 'playing',
    history: [],
    capturedByWhite: [],
    capturedByBlack: [],
  }
}

export function boardToFen(state: GameState): string {
  let fenBoard = ''
  for (let r = 0; r < 8; r++) {
    let empty = 0
    for (let f = 0; f < 8; f++) {
      const sq = state.board[r][f]
      if (!sq) { empty++; continue }
      if (empty) { fenBoard += empty; empty = 0 }
      fenBoard += sq.color === 'w' ? sq.type : sq.type.toLowerCase()
    }
    if (empty) fenBoard += empty
    if (r < 7) fenBoard += '/'
  }
  const castling = [
    state.castling.wK ? 'K' : '', state.castling.wQ ? 'Q' : '',
    state.castling.bK ? 'k' : '', state.castling.bQ ? 'q' : '',
  ].join('') || '-'
  const ep = state.enPassant
    ? String.fromCharCode(97 + state.enPassant[1]) + (8 - state.enPassant[0])
    : '-'
  return `${fenBoard} ${state.turn} ${castling} ${ep} ${state.halfMove} ${state.fullMove}`
}

export function cloneBoard(board: BoardArray): BoardArray {
  return board.map(rank => rank.map(sq => sq ? { ...sq } : null))
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    castling: { ...state.castling },
    enPassant: state.enPassant ? [...state.enPassant] as [number, number] : null,
    history: [...state.history],
    capturedByWhite: [...state.capturedByWhite],
    capturedByBlack: [...state.capturedByBlack],
  }
}

export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state)
  const { board } = next
  const [fr, ff] = move.from, [tr, tf] = move.to
  const piece = board[fr][ff]!
  const captured = board[tr][tf]

  if (captured) {
    if (piece.color === 'w') next.capturedByWhite.push({ ...captured })
    else next.capturedByBlack.push({ ...captured })
  }
  if (move.enPassant) {
    const ep = board[fr][tf]
    if (ep) {
      if (piece.color === 'w') next.capturedByWhite.push({ ...ep })
      else next.capturedByBlack.push({ ...ep })
      board[fr][tf] = null
    }
  }

  const notation = moveToNotation(state, move)
  const fen = boardToFen(state)

  board[tr][tf] = move.promotion ? { type: move.promotion, color: piece.color } : { ...piece }
  board[fr][ff] = null

  if (move.castling) {
    const rank = piece.color === 'w' ? 7 : 0
    if (move.castling === 'K') { board[rank][5] = board[rank][7]; board[rank][7] = null }
    else { board[rank][3] = board[rank][0]; board[rank][0] = null }
  }

  if (piece.type === 'K') {
    if (piece.color === 'w') { next.castling.wK = false; next.castling.wQ = false }
    else { next.castling.bK = false; next.castling.bQ = false }
  }
  if (piece.type === 'R') {
    if (piece.color === 'w') {
      if (fr === 7 && ff === 7) next.castling.wK = false
      if (fr === 7 && ff === 0) next.castling.wQ = false
    } else {
      if (fr === 0 && ff === 7) next.castling.bK = false
      if (fr === 0 && ff === 0) next.castling.bQ = false
    }
  }
  if (captured?.type === 'R') {
    if (tr === 7 && tf === 7) next.castling.wK = false
    if (tr === 7 && tf === 0) next.castling.wQ = false
    if (tr === 0 && tf === 7) next.castling.bK = false
    if (tr === 0 && tf === 0) next.castling.bQ = false
  }

  next.enPassant = (piece.type === 'P' && Math.abs(tr - fr) === 2)
    ? [(fr + tr) / 2, ff]
    : null

  next.halfMove = (piece.type === 'P' || captured || move.enPassant) ? 0 : state.halfMove + 1
  next.turn = state.turn === 'w' ? 'b' : 'w'
  if (next.turn === 'w') next.fullMove++

  const legalNext = getLegalMoves(next)
  const inCheck = isInCheck(next.board, next.turn)
  if (legalNext.length === 0) {
    next.status = inCheck ? 'checkmate' : 'stalemate'
  } else if (next.halfMove >= 100 || isInsufficientMaterial(next.board)) {
    next.status = 'draw'
  } else {
    const newKey = positionKey(boardToFen(next))
    const seen = next.history.filter(h => positionKey(h.fen) === newKey).length + 1
    if (seen >= 3) next.status = 'draw'
    else if (inCheck) next.status = 'check'
    else next.status = 'playing'
  }

  next.history.push({ move, notation, fen })
  return next
}
