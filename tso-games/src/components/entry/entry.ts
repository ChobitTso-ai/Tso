// 首頁入口的選擇：島嶼版（3D）或卡片版。只記在這個分頁的 sessionStorage，
// 與登入狀態相同，關掉分頁後重新選。
export type Entry = 'island' | 'cards'

const KEY = 'tsoEntry'

export function readEntry(): Entry | null {
  try {
    const v = sessionStorage.getItem(KEY)
    return v === 'island' || v === 'cards' ? v : null
  } catch {
    return null
  }
}

export function saveEntry(entry: Entry) {
  try {
    sessionStorage.setItem(KEY, entry)
  } catch {
    // 無痕模式或封鎖儲存時略過，頁面仍可使用
  }
}

// 島嶼頁是獨立的靜態頁面（island/ 建置後放在 public/island/），不在 React 路由內
export const islandUrl = () => import.meta.env.BASE_URL + 'island/index.html'
