import './SoundToggle.css'

interface Props {
  on: boolean
  onToggle: () => void
}

// 首頁右上角的聲音開關；設定與遊戲島共用（localStorage tsoSound）
export default function SoundToggle({ on, onToggle }: Props) {
  return (
    <button
      type="button"
      className="snd-toggle"
      aria-pressed={on}
      aria-label={on ? '關閉聲音' : '開啟聲音'}
      onClick={onToggle}
    >
      {on ? '🔊' : '🔇'}
    </button>
  )
}
