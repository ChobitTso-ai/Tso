import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { SanguoGame } from '../components/sanguo/games'
import './SanguoGamePage.css'

// 判斷手機：觸控為主且螢幕短邊不到 500px（平板與電腦都不算）。CSS 也用同一組條件
const PHONE_QUERY = '(pointer: coarse) and (max-width: 500px), (pointer: coarse) and (max-height: 500px)'

// lock() 只有部分瀏覽器支援（主要是 Android），TypeScript 的 DOM 型別沒有收錄
type LockableOrientation = { lock?: (orientation: 'landscape') => Promise<void> }

// 瀏覽器規定全螢幕必須由使用者點擊觸發，所以等玩家第一次點遊戲才進全螢幕並鎖成橫向。
// iPhone 的 Safari 不支援網頁全螢幕，這時什麼都不做，靠橫拿時收起導覽列騰出空間
function enterPhoneFullscreen(page: HTMLElement) {
  if (!matchMedia(PHONE_QUERY).matches || document.fullscreenElement || !page.requestFullscreen) return
  page.requestFullscreen()
    .then(() => (screen.orientation as unknown as LockableOrientation).lock?.('landscape'))
    .catch(() => { /* 不支援或被拒絕時維持原狀，遊戲照常可玩 */ })
}

// 遊戲本體是作者的單檔 HTML，原樣以 iframe 嵌入，不改寫成 React
export default function SanguoGamePage({ game }: { game: SanguoGame }) {
  document.title = `${game.title} | TSO`
  const pageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)

  // 離開遊戲頁時退出全螢幕（橫向鎖定會跟著解除）
  useEffect(() => () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { /* 已退出 */ })
  }, [])

  // iframe 與本站同源，可以直接監聽裡面的點擊；iframe 內的點擊也算外層頁面的使用者操作
  const handleLoad = () => {
    const page = pageRef.current
    frameRef.current?.contentWindow?.addEventListener('pointerdown', () => {
      if (page) enterPhoneFullscreen(page)
    })
  }

  return (
    <div className="sanguo-page" ref={pageRef}>
      <nav className="sanguo-nav">
        <Link to="/threekingdoms" className="nav-home">
          ← <span className="sanguo-nav-long">三國演義</span><span className="sanguo-nav-short">返回</span>
        </Link>
        <span className="nav-title">{game.title}</span>
      </nav>
      <iframe
        ref={frameRef}
        className="sanguo-frame"
        src={`${import.meta.env.BASE_URL}sanguo/${game.file}`}
        title={game.title}
        onLoad={handleLoad}
      />
      <div className="sanguo-rotate-hint">📱 把手機轉成橫的，畫面會更大</div>
    </div>
  )
}
