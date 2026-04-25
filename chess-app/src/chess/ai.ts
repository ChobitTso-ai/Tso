import type { Difficulty, GameState, Move } from './types'
import { getLegalMoves } from './moves'
import { applyMove } from './board'

const PIECE_VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 }

const PST: Record<string, number[][]> = {
  P: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  R: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0],
  ],
  Q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
}

function evaluate(state: GameState): number {
  if (state.status === 'checkmate') return state.turn === 'b' ? 100000 : -100000
  if (state.status === 'stalemate' || state.status === 'draw') return 0
  let score = 0
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = state.board[r][f]
      if (!p) continue
      const tableRow = p.color === 'w' ? r : 7 - r
      const val = PIECE_VALUE[p.type] + (PST[p.type]?.[tableRow]?.[f] ?? 0)
      score += p.color === 'w' ? val : -val
    }
  }
  return score
}

function orderMoves(state: GameState, moves: Move[]): Move[] {
  return moves.sort((a, b) => {
    const capA = state.board[a.to[0]][a.to[1]]
    const capB = state.board[b.to[0]][b.to[1]]
    return (capB ? PIECE_VALUE[capB.type] : 0) - (capA ? PIECE_VALUE[capA.type] : 0)
  })
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number
): number {
  if (Date.now() > deadline) return evaluate(state)
  if (depth === 0 || ['checkmate', 'stalemate', 'draw'].includes(state.status))
    return evaluate(state)

  const moves = orderMoves(state, getLegalMoves(state))
  if (moves.length === 0) return evaluate(state)

  if (state.turn === 'w') {
    let best = -Infinity
    for (const move of moves) {
      best = Math.max(best, minimax(applyMove(state, move), depth - 1, alpha, beta, deadline))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const move of moves) {
      best = Math.min(best, minimax(applyMove(state, move), depth - 1, alpha, beta, deadline))
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

// Time limits per difficulty (ms)
const TIME_LIMIT: Record<Difficulty, number> = {
  1: 0, 2: 0, 3: 1000, 4: 2000, 5: 3000,
}

export function getBestMove(state: GameState, level: Difficulty): Move | null {
  const moves = getLegalMoves(state)
  if (moves.length === 0) return null

  if (level === 1) return moves[Math.floor(Math.random() * moves.length)]

  if (level === 2) {
    const captures = moves.filter(m => state.board[m.to[0]][m.to[1]])
    if (captures.length > 0) {
      captures.sort((a, b) =>
        PIECE_VALUE[state.board[b.to[0]][b.to[1]]!.type] -
        PIECE_VALUE[state.board[a.to[0]][a.to[1]]!.type]
      )
      return captures[0]
    }
    return moves[Math.floor(Math.random() * moves.length)]
  }

  // Level 3-5: iterative deepening with time limit
  const maxDepth = level === 3 ? 3 : level === 4 ? 4 : 5
  const deadline = Date.now() + TIME_LIMIT[level]
  const ordered = orderMoves(state, moves)
  let bestMove = ordered[0]

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (Date.now() > deadline) break
    let bestVal = state.turn === 'w' ? -Infinity : Infinity
    let depthBest = ordered[0]

    for (const move of ordered) {
      if (Date.now() > deadline) break
      const val = minimax(applyMove(state, move), depth - 1, -Infinity, Infinity, deadline)
      if (state.turn === 'w' ? val > bestVal : val < bestVal) {
        bestVal = val
        depthBest = move
      }
    }
    bestMove = depthBest
  }

  return bestMove
}
