export type Color = 'w' | 'b'
export type PieceType = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K'

export interface Piece {
  type: PieceType
  color: Color
}

export type Square = Piece | null
export type BoardArray = Square[][]  // [rank][file], rank 0 = 8th rank, file 0 = a-file

export interface Move {
  from: [number, number]
  to: [number, number]
  promotion?: PieceType
  enPassant?: boolean
  castling?: 'K' | 'Q'
}

export interface CastlingRights {
  wK: boolean
  wQ: boolean
  bK: boolean
  bQ: boolean
}

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw'

export interface MoveRecord {
  move: Move
  notation: string
  fen: string
}

export interface GameState {
  board: BoardArray
  turn: Color
  castling: CastlingRights
  enPassant: [number, number] | null
  halfMove: number
  fullMove: number
  status: GameStatus
  history: MoveRecord[]
  capturedByWhite: Piece[]
  capturedByBlack: Piece[]
}

export type GameMode = 'pvp' | 'pvc'
export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface GameConfig {
  mode: GameMode
  difficulty: Difficulty
  playerColor: Color
}
