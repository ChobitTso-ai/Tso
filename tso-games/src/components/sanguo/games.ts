// 單檔 HTML 的三國遊戲：檔案放在 public/sanguo/，由 SanguoGamePage 以 iframe 嵌入。
// 新增一款只要把 HTML 放進 public/sanguo/ 再在這裡加一筆，路由與三國演義 hub 卡片都由此產生。
export interface SanguoGame {
  id: string
  title: string
  description: string
  icon: string
  path: string
  file: string
}

// 依戰役年代排序
export const SANGUO_GAMES: SanguoGame[] = [
  {
    id: 'guandu',
    title: '官渡奇謀大冒險',
    description: '西元 200 年官渡之戰。幫曹操闖過四個計謀關卡：白馬解圍、延津餌敵、霹靂車打垮箭樓、夜襲火燒烏巢。',
    icon: '🏯',
    path: '/guandu',
    file: 'guandu.html',
  },
  {
    id: 'changban',
    title: '趙雲七進七出・長坂坡',
    description: '西元 208 年長坂坡。化身趙雲單騎七進七出：尋主、救甘夫人與糜竺、奪青釭劍、懷抱阿斗突圍，最後張飛長坂橋三聲怒吼退敵。',
    icon: '🐎',
    path: '/changban',
    file: 'changban.html',
  },
  {
    id: 'chibi',
    title: '赤壁妙計大冒險',
    description: '西元 208 年赤壁之戰。草船借箭、鐵索連環、借東風、火燒連環船，用四個妙計打贏曹操。',
    icon: '⛵',
    path: '/chibi',
    file: 'chibi.html',
  },
]
