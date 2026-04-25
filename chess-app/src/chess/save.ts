import type { GameConfig, GameState } from './types'
import { parseFen, boardToFen } from './board'

export interface SaveSlot {
  id: number
  date: string
  fen: string
  moves: number
  config: GameConfig
}

export function saveGame(slot: number, state: GameState, config: GameConfig): void {
  const saves = listSaves()
  saves[slot] = {
    id: slot,
    date: new Date().toLocaleString('zh-TW'),
    fen: boardToFen(state),
    moves: state.history.length,
    config,
  }
  localStorage.setItem('chess_saves', JSON.stringify(saves))
}

export function loadGameByFen(fen: string, config: GameConfig): { state: GameState; config: GameConfig } {
  return { state: parseFen(fen), config }
}

export function loadGame(slot: number): { state: GameState; config: GameConfig } | null {
  try {
    const saves = listSaves()
    const save = saves[slot]
    if (!save) return null
    return { state: parseFen(save.fen), config: save.config }
  } catch { return null }
}

export function listSaves(): (SaveSlot | null)[] {
  try {
    const raw = localStorage.getItem('chess_saves')
    if (!raw) return Array(5).fill(null)
    const parsed = JSON.parse(raw)
    while (parsed.length < 5) parsed.push(null)
    return parsed
  } catch { return Array(5).fill(null) }
}

export function deleteSave(slot: number): void {
  const saves = listSaves()
  saves[slot] = null
  localStorage.setItem('chess_saves', JSON.stringify(saves))
}

export function exportPGN(state: GameState): string {
  const pairs: string[] = []
  for (let i = 0; i < state.history.length; i += 2) {
    const num = Math.floor(i / 2) + 1
    const w = state.history[i].notation
    const b = state.history[i + 1]?.notation ?? ''
    pairs.push(`${num}. ${w}${b ? ' ' + b : ''}`)
  }
  const result = state.status === 'checkmate'
    ? (state.turn === 'b' ? '1-0' : '0-1')
    : (state.status === 'stalemate' || state.status === 'draw') ? '1/2-1/2' : '*'
  return pairs.join(' ') + (result !== '*' ? ' ' + result : '')
}

export function generateShareUrl(state: GameState, config: GameConfig): string {
  const data = { fen: boardToFen(state), config }
  const encoded = btoa(encodeURIComponent(JSON.stringify(data)))
  const url = new URL(window.location.href)
  url.hash = `share=${encoded}`
  return url.toString()
}

export function parseShareUrl(): { state: GameState; config: GameConfig } | null {
  try {
    const hash = window.location.hash
    const match = hash.match(/share=(.+)/)
    if (!match) return null
    const data = JSON.parse(decodeURIComponent(atob(match[1])))
    return { state: parseFen(data.fen), config: data.config }
  } catch { return null }
}
