import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EntryChooser, EntrySwitch } from '../components/entry/EntryChooser'
import { islandUrl, readEntry, saveEntry } from '../components/entry/entry'
import type { Entry } from '../components/entry/entry'
import './Home.css'

interface GameCard {
  id: string
  title: string
  description: string
  icon: string
  path: string
  available: boolean
  tag?: string
}

const GAMES: GameCard[] = [
  {
    id: 'chess',
    title: '西洋棋',
    description: '支援雙人對戰與人機對戰，五種 AI 難度，含存檔、分享連結與棋譜匯出。',
    icon: '♟',
    path: '/chess',
    available: true,
  },
  {
    id: 'minecraft',
    title: 'Minecraft 知識競賽',
    description: '測試你對 Minecraft 的了解，包含中英文題庫與多種題型。',
    icon: '⛏',
    path: '/minecraft',
    available: true,
  },
  {
    id: 'kidibot',
    title: '回家之路',
    description: '排列路徑磁力片，引導機器人避開怪獸與陷阱，安全回家！25 關程式思維冒險。',
    icon: '🤖',
    path: '/kidibot',
    available: true,
    tag: 'NEW',
  },
  {
    id: 'endgames',
    title: '西洋棋殘局練習',
    description: '100 題經典殘局——兵局、車局、象局、馬局、后局與複合殘局，搭配 AI 對手與提示。',
    icon: '♜',
    path: '/endgames',
    available: true,
    tag: 'NEW',
  },
  {
    id: 'mathquest',
    title: '數學冒險',
    description: '棋盤走路打怪物！選擇 Alan 或 Ryan T，答對數學題才能打倒怪物、挑戰 Boss！',
    icon: '🔢',
    path: '/mathquest',
    available: true,
    tag: 'NEW',
  },
  {
    id: 'battleship',
    title: '戰艦海戰棋',
    description: '佈署你的艦隊，與 AI 對手互轟海域，最先擊沉對方所有戰艦者獲勝！經典策略對戰。',
    icon: '🚢',
    path: '/battleship',
    available: true,
    tag: 'NEW',
  },
  {
    id: 'threekingdoms',
    title: '三國演義',
    description: '策略、謀略、決戰天下。三國主題小遊戲合集，陸續加入中。',
    icon: '⚔️',
    path: '/threekingdoms',
    available: true,
  },
  {
    id: 'drawball',
    title: '畫線滾球',
    description: '畫線幫小動物鋪路，滾進竹籃！蠟筆繪本風，67 關物理解謎，用越少墨水星星越多。',
    icon: '🖍️',
    path: '/drawball',
    available: true,
    tag: 'NEW',
  },
  {
    id: 'wordgrid',
    title: '方陣找找看',
    description: '在字母方陣上連起相鄰格子拼出英文單字，也能切換數學模式連數字湊目標數。',
    icon: '🔤',
    path: '/wordgrid',
    available: true,
    tag: 'NEW',
  },
  {
    id: 'slitherlink',
    title: '數迴',
    description: 'Loop Puzzle：在點與點之間畫線，連成不交叉、不分岔的迴路，數字是周圍的線數。',
    icon: '➰',
    path: '/slitherlink',
    available: true,
    tag: 'NEW',
  },
  {
    id: 'education',
    title: '教育區',
    description: '學習工具合集：國小數學無限出題，可列印考卷或線上作答，陸續加入更多工具。',
    icon: '📚',
    path: '/education',
    available: true,
    tag: 'NEW',
  },
]

export default function Home() {
  document.title = 'TSO'
  const [entry, setEntry] = useState<Entry | null>(() => readEntry())

  // 選了島嶼版：導向獨立的 3D 頁面（replace，按上一頁才不會卡在空白首頁）
  useEffect(() => {
    if (entry === 'island') window.location.replace(islandUrl())
  }, [entry])

  const pick = (next: Entry) => {
    saveEntry(next)
    setEntry(next)
  }

  if (entry === null) return <EntryChooser onPick={pick} />
  if (entry === 'island') return null

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">🎮 TSO Games</h1>
        <p className="home-subtitle">免費、無需登入，打開即玩</p>
        <EntrySwitch onSwitch={() => pick('island')} />
      </header>

      <div className="game-grid">
        {GAMES.map(game => (
          <div key={game.id} className={`game-card ${!game.available ? 'unavailable' : ''}`}>
            {game.tag && <span className="game-tag">{game.tag}</span>}
            <div className="game-icon">{game.icon}</div>
            <h2 className="game-name">{game.title}</h2>
            <p className="game-desc">{game.description}</p>
            {game.available ? (
              <Link to={game.path} className="game-btn">開始遊戲</Link>
            ) : (
              <span className="game-btn-disabled">敬請期待</span>
            )}
          </div>
        ))}
      </div>

      <footer className="home-footer">
        <a href="https://github.com/chobittso-ai/tso" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  )
}
