import type { Color, Difficulty, GameConfig, GameMode } from '../../chess/types'
import { useState } from 'react'
import './GameSetup.css'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '新手（隨機）',
  2: '入門（貪吃子）',
  3: '普通（Minimax 2層）',
  4: '進階（Alpha-Beta 4層）',
  5: '高手（Alpha-Beta 6層）',
}

interface Props {
  onStart: (config: GameConfig) => void
  onCancel?: () => void
}

export default function GameSetup({ onStart, onCancel }: Props) {
  const [mode, setMode] = useState<GameMode>('pvc')
  const [difficulty, setDifficulty] = useState<Difficulty>(3)
  const [playerColor, setPlayerColor] = useState<Color>('w')

  return (
    <div className="setup-overlay">
      <div className="setup-card">
        <h2>新局設定</h2>

        <div className="setup-section">
          <label>遊戲模式</label>
          <div className="setup-options">
            <button className={mode === 'pvp' ? 'active' : ''} onClick={() => setMode('pvp')}>
              👥 雙人對戰
            </button>
            <button className={mode === 'pvc' ? 'active' : ''} onClick={() => setMode('pvc')}>
              🤖 人機對戰
            </button>
          </div>
        </div>

        {mode === 'pvc' && (
          <>
            <div className="setup-section">
              <label>執子顏色</label>
              <div className="setup-options">
                <button className={playerColor === 'w' ? 'active' : ''} onClick={() => setPlayerColor('w')}>
                  ♔ 執白（先手）
                </button>
                <button className={playerColor === 'b' ? 'active' : ''} onClick={() => setPlayerColor('b')}>
                  ♚ 執黑（後手）
                </button>
              </div>
            </div>

            <div className="setup-section">
              <label>AI 難度</label>
              <div className="difficulty-list">
                {([1, 2, 3, 4, 5] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    className={`difficulty-btn ${difficulty === d ? 'active' : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    <span className="diff-level">Lv.{d}</span>
                    <span className="diff-label">{DIFFICULTY_LABELS[d]}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="setup-actions">
          {onCancel && <button className="btn-cancel" onClick={onCancel}>取消</button>}
          <button className="btn-start" onClick={() => onStart({ mode, difficulty, playerColor })}>
            開始對局
          </button>
        </div>
      </div>
    </div>
  )
}
