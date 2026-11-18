import type { Entry } from './entry'
import './EntryChooser.css'

interface ChooserProps {
  onPick: (entry: Entry) => void
}

// 第一次進來時的三個入口
export function EntryChooser({ onPick }: ChooserProps) {
  return (
    <div className="entry">
      <header className="entry-header">
        <h1 className="entry-title">🎮 TSO Games</h1>
        <p className="entry-subtitle">選一個你喜歡的方式進來</p>
      </header>

      <div className="entry-grid">
        <button type="button" className="entry-card entry-island" onClick={() => onPick('island')}>
          <span className="entry-icon">🏝️</span>
          <span className="entry-name">遊戲島</span>
          <span className="entry-desc">3D 小島拼成的城市，走進建築物就能開始玩。</span>
          <span className="entry-hint">建議用較新的手機、平板或電腦</span>
        </button>

        <button type="button" className="entry-card entry-cards" onClick={() => onPick('cards')}>
          <span className="entry-icon">🗂️</span>
          <span className="entry-name">卡片首頁</span>
          <span className="entry-desc">所有遊戲排成卡片，一眼看完，直接點選。</span>
          <span className="entry-hint">每種裝置都能順暢使用</span>
        </button>

        <button type="button" className="entry-card entry-planet" onClick={() => onPick('planet')}>
          <span className="entry-icon">🪐</span>
          <span className="entry-name">遊戲星球</span>
          <span className="entry-desc">轉動一顆小星球，點群島上的小島就能開始玩。</span>
          <span className="entry-hint">測試版・每種裝置都能用</span>
        </button>
      </div>
    </div>
  )
}

const SWITCH_LABELS: Record<'island' | 'planet', string> = {
  island: '🏝️ 改用遊戲島',
  planet: '🪐 改用遊戲星球',
}

interface SwitchProps {
  to: 'island' | 'planet'
  onSwitch: () => void
}

// 卡片首頁上的「改去島嶼／星球」小按鈕
export function EntrySwitch({ to, onSwitch }: SwitchProps) {
  return (
    <button type="button" className="entry-switch" onClick={onSwitch}>
      {SWITCH_LABELS[to]}
    </button>
  )
}
