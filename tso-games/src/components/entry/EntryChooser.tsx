import type { Entry } from './entry'
import './EntryChooser.css'

interface ChooserProps {
  onPick: (entry: Entry) => void
}

// 第一次進來時的兩個入口
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
      </div>
    </div>
  )
}

interface SwitchProps {
  onSwitch: () => void
}

// 卡片首頁上的「改去島嶼」小按鈕
export function EntrySwitch({ onSwitch }: SwitchProps) {
  return (
    <button type="button" className="entry-switch" onClick={onSwitch}>
      🏝️ 改用遊戲島
    </button>
  )
}
