// 遊戲畫面風格：方陣找找看與數迴共用同一組風格，配色各自寫在遊戲的 CSS 裡（.wg-skin-*、.sl-skin-*）

export type Skin = 'night' | 'wood' | 'neon'

export const SKINS: { id: Skin; label: string }[] = [
  { id: 'night', label: '🌙 夜空金' },
  { id: 'wood', label: '🪵 木頭' },
  { id: 'neon', label: '💡 霓虹' },
]

// 木頭與霓虹用 Google Fonts 的字型，選到時才載入；載入失敗會退回系統字型
const FONT_URL: Partial<Record<Skin, string>> = {
  wood: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600&display=swap',
  neon: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap',
}

export function loadSkinFont(skin: Skin) {
  const href = FONT_URL[skin]
  const id = `skin-font-${skin}`
  if (!href || document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

export function readSkin(key: string): Skin {
  try {
    const v = localStorage.getItem(key)
    if (SKINS.some(s => s.id === v)) return v as Skin
  } catch {
    // 讀不到就用預設
  }
  return 'night'
}
