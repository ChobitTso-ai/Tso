import type { BoardArray, CastlingRights, Color, GameState, Move, PieceType } from './types'

function inBounds(r: number, f: number): boolean {
  return r >= 0 && r < 8 && f >= 0 && f < 8
}

function slide(board: BoardArray, moves: Move[], r: number, f: number, dr: number, df: number, color: Color) {
  let nr = r + dr, nf = f + df
  while (inBounds(nr, nf)) {
    const sq = board[nr][nf]
    if (sq) {
      if (sq.color !== color) moves.push({ from: [r, f], to: [nr, nf] })
      break
    }
    moves.push({ from: [r, f], to: [nr, nf] })
    nr += dr; nf += df
  }
}

function addIfValid(board: BoardArray, moves: Move[], r: number, f: number, tr: number, tf: number, color: Color) {
  if (!inBounds(tr, tf)) return
  const sq = board[tr][tf]
  if (sq && sq.color === color) return
  moves.push({ from: [r, f], to: [tr, tf] })
}

function getPseudoMoves(
  board: BoardArray,
  r: number, f: number,
  enPassant: [number, number] | null,
  castling: CastlingRights
): Move[] {
  const piece = board[r][f]
  if (!piece) return []
  const { type, color } = piece
  const moves: Move[] = []

  switch (type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1
      const startRank = color === 'w' ? 6 : 1
      const promoRank = color === 'w' ? 0 : 7
      const addPawnMove = (tr: number, tf: number, extra?: Partial<Move>) => {
        if (tr === promoRank) {
          for (const p of ['Q', 'R', 'B', 'N'] as PieceType[])
            moves.push({ from: [r, f], to: [tr, tf], promotion: p, ...extra })
        } else {
          moves.push({ from: [r, f], to: [tr, tf], ...extra })
        }
      }
      const nr = r + dir
      if (inBounds(nr, f) && !board[nr][f]) {
        addPawnMove(nr, f)
        if (r === startRank && !board[r + 2 * dir]?.[f])
          moves.push({ from: [r, f], to: [r + 2 * dir, f] })
      }
      for (const df of [-1, 1]) {
        const cr = r + dir, cf = f + df
        if (!inBounds(cr, cf)) continue
        if (board[cr][cf] && board[cr][cf]!.color !== color) addPawnMove(cr, cf)
        if (enPassant && cr === enPassant[0] && cf === enPassant[1])
          moves.push({ from: [r, f], to: [cr, cf], enPassant: true })
      }
      break
    }
    case 'N':
      for (const [dr, df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        addIfValid(board, moves, r, f, r + dr, f + df, color)
      break
    case 'B':
      for (const [dr, df] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(board, moves, r, f, dr, df, color)
      break
    case 'R':
      for (const [dr, df] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(board, moves, r, f, dr, df, color)
      break
    case 'Q':
      for (const [dr, df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        slide(board, moves, r, f, dr, df, color)
      break
    case 'K': {
      for (const [dr, df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        addIfValid(board, moves, r, f, r + dr, f + df, color)
      const rank = color === 'w' ? 7 : 0
      if (r === rank && f === 4) {
        if ((color === 'w' ? castling.wK : castling.bK) && !board[rank][5] && !board[rank][6])
          moves.push({ from: [r, f], to: [rank, 6], castling: 'K' })
        if ((color === 'w' ? castling.wQ : castling.bQ) && !board[rank][3] && !board[rank][2] && !board[rank][1])
          moves.push({ from: [r, f], to: [rank, 2], castling: 'Q' })
      }
      break
    }
  }
  return moves
}

export function isSquareAttacked(board: BoardArray, r: number, f: number, byColor: Color): boolean {
  const pawnRank = byColor === 'w' ? r + 1 : r - 1
  for (const df of [-1, 1]) {
    if (inBounds(pawnRank, f + df)) {
      const sq = board[pawnRank][f + df]
      if (sq?.type === 'P' && sq.color === byColor) return true
    }
  }
  for (const [dr, df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r + dr, nf = f + df
    if (inBounds(nr, nf) && board[nr][nf]?.type === 'N' && board[nr][nf]!.color === byColor) return true
  }
  for (const [dr, df] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    let nr = r + dr, nf = f + df
    while (inBounds(nr, nf)) {
      const sq = board[nr][nf]
      if (sq) { if (sq.color === byColor && (sq.type === 'B' || sq.type === 'Q')) return true; break }
      nr += dr; nf += df
    }
  }
  for (const [dr, df] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let nr = r + dr, nf = f + df
    while (inBounds(nr, nf)) {
      const sq = board[nr][nf]
      if (sq) { if (sq.color === byColor && (sq.type === 'R' || sq.type === 'Q')) return true; break }
      nr += dr; nf += df
    }
  }
  for (const [dr, df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = r + dr, nf = f + df
    if (inBounds(nr, nf) && board[nr][nf]?.type === 'K' && board[nr][nf]!.color === byColor) return true
  }
  return false
}

export function isInCheck(board: BoardArray, color: Color): boolean {
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++)
      if (board[r][f]?.type === 'K' && board[r][f]!.color === color)
        return isSquareAttacked(board, r, f, color === 'w' ? 'b' : 'w')
  return false
}

function quickApply(board: BoardArray, move: Move): BoardArray {
  const nb = board.map(rank => [...rank])
  const [fr, ff] = move.from, [tr, tf] = move.to
  const piece = nb[fr][ff]!
  nb[tr][tf] = move.promotion ? { type: move.promotion, color: piece.color } : piece
  nb[fr][ff] = null
  if (move.enPassant) nb[fr][tf] = null
  if (move.castling) {
    const rank = piece.color === 'w' ? 7 : 0
    if (move.castling === 'K') { nb[rank][5] = nb[rank][7]; nb[rank][7] = null }
    else { nb[rank][3] = nb[rank][0]; nb[rank][0] = null }
  }
  return nb
}

export function getLegalMoves(state: GameState, fromSquare?: [number, number]): Move[] {
  const { board, turn, enPassant, castling } = state
  const opponent = turn === 'w' ? 'b' : 'w'
  const result: Move[] = []

  const check = (r: number, f: number) => {
    const piece = board[r][f]
    if (!piece || piece.color !== turn) return
    for (const move of getPseudoMoves(board, r, f, enPassant, castling)) {
      if (move.castling) {
        const rank = turn === 'w' ? 7 : 0
        if (isSquareAttacked(board, rank, 4, opponent)) continue
        const passTf = move.castling === 'K' ? 5 : 3
        if (isSquareAttacked(board, rank, passTf, opponent)) continue
        if (isSquareAttacked(board, rank, move.to[1], opponent)) continue
      }
      const nb = quickApply(board, move)
      if (!isInCheck(nb, turn)) result.push(move)
    }
  }

  if (fromSquare) {
    check(fromSquare[0], fromSquare[1])
  } else {
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) check(r, f)
  }
  return result
}
