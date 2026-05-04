import { getBestMove } from './ai'
import type { Difficulty, GameState } from './types'

self.onmessage = (e: MessageEvent<{ state: GameState; level: Difficulty }>) => {
  const { state, level } = e.data
  const move = getBestMove(state, level)
  self.postMessage(move)
}
