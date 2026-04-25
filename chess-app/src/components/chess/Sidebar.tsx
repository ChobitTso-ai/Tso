import type { GameConfig, GameState, Piece, PieceType } from '../../chess/types'
import { exportPGN, generateShareUrl, listSaves, saveGame, loadGame, deleteSave } from '../../chess/save'
import { useState } from 'react'
import './Sidebar.css'

const PIECE_UNICODE: Record<PieceType, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
}
const PIECE_VALUE: Record<PieceType, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 }

function CapturedRow({ pieces, color }: { pieces: Piece[]; color: 'w' | 'b' }) {
  const sorted = [...pieces].sort((a, b) => PIECE_VALUE[b.type] - PIECE_VALUE[a.type])
  const advantage = pieces.reduce((s, p) => s + PIECE_VALUE[p.type], 0)
  return (
    <div className="captured-row">
      <span className={`captured-pieces piece-${color}`}>
        {sorted.map((p, i) => <span key={i}>{PIECE_UNICODE[p.type]}</span>)}
      </span>
      {advantage > 0 && <span className="advantage">+{advantage}</span>}
    </div>
  )
}

interface Props {
  state: GameState
  config: GameConfig
  flipped: boolean
  onNewGame: () => void
  onUndo: () => void
  onFlip: () => void
  onLoadState: (state: GameState, config: GameConfig) => void
}

export default function Sidebar({ state, config, flipped, onNewGame, onUndo, onFlip, onLoadState }: Props) {
  const [showSaves, setShowSaves] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const saves = listSaves()

  const statusMsg = () => {
    if (state.status === 'checkmate') return state.turn === 'b' ? '⬜ 白方勝！' : '⬛ 黑方勝！'
    if (state.status === 'stalemate') return '🤝 逼和'
    if (state.status === 'draw') return '🤝 和棋（50步規則）'
    if (state.status === 'check') return `${state.turn === 'w' ? '⬜ 白方' : '⬛ 黑方'} 被將軍！`
    return state.turn === 'w' ? '⬜ 白方回合' : '⬛ 黑方回合'
  }

  const handleSave = (slot: number) => {
    saveGame(slot, state, config)
    setSaveMsg(`已儲存到位置 ${slot + 1}`)
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const handleLoad = (slot: number) => {
    const result = loadGame(slot)
    if (result) { onLoadState(result.state, result.config); setShowSaves(false) }
  }

  const handleShare = () => {
    const url = generateShareUrl(state, config)
    navigator.clipboard.writeText(url).then(() => {
      setSaveMsg('連結已複製到剪貼簿！')
      setTimeout(() => setSaveMsg(''), 2500)
    })
  }

  const handleExportPGN = () => {
    const pgn = exportPGN(state)
    const blob = new Blob([pgn], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'chess_game.pgn'
    a.click()
  }

  const topColor = flipped ? 'w' : 'b'
  const botColor = flipped ? 'b' : 'w'

  return (
    <div className="sidebar">
      <div className="player-info top">
        <span className={`player-dot color-${topColor}`} />
        <span>{topColor === 'w' ? '白方' : '黑方'}</span>
        <CapturedRow pieces={topColor === 'w' ? state.capturedByWhite : state.capturedByBlack} color={topColor} />
      </div>

      <div className={`status-bar ${state.status !== 'playing' ? 'status-end' : ''}`}>
        {statusMsg()}
      </div>

      <div className="move-history">
        <div className="history-header">棋譜</div>
        <div className="history-list">
          {Array.from({ length: Math.ceil(state.history.length / 2) }, (_, i) => (
            <div key={i} className="history-pair">
              <span className="move-num">{i + 1}.</span>
              <span className="move-w">{state.history[i * 2]?.notation ?? ''}</span>
              <span className="move-b">{state.history[i * 2 + 1]?.notation ?? ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="player-info bottom">
        <span className={`player-dot color-${botColor}`} />
        <span>{botColor === 'w' ? '白方' : '黑方'}</span>
        <CapturedRow pieces={botColor === 'w' ? state.capturedByWhite : state.capturedByBlack} color={botColor} />
      </div>

      <div className="controls">
        <button onClick={onNewGame}>新局</button>
        <button onClick={onUndo} disabled={state.history.length === 0}>悔棋</button>
        <button onClick={onFlip}>翻盤</button>
        <button onClick={() => setShowSaves(!showSaves)}>存 / 讀</button>
        <button onClick={handleShare}>分享連結</button>
        <button onClick={handleExportPGN}>匯出 PGN</button>
      </div>

      {saveMsg && <div className="save-msg">{saveMsg}</div>}

      {showSaves && (
        <div className="save-panel">
          <div className="save-header">存檔槽（共5格）</div>
          {saves.map((s, i) => (
            <div key={i} className="save-row">
              <span className="save-label">
                {s ? `#${i + 1} ${s.date} (${s.moves}步)` : `#${i + 1} 空`}
              </span>
              <button onClick={() => handleSave(i)}>存</button>
              <button onClick={() => handleLoad(i)} disabled={!s}>讀</button>
              <button onClick={() => { deleteSave(i); setSaveMsg('已刪除') }} disabled={!s}>刪</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
