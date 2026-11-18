// 遊戲星球的群島資料：直接讀遊戲島的 island/data/games.json。
// 新增遊戲照遊戲島的流程加進 games.json，星球就會自動多一座小島，不用另外維護一份清單。
import GAMES_BY_ISLAND from '../../../island/data/games.json'

export interface PlanetGame {
  id: string
  name: string
  path: string
  what: string
  heat: number
}

export interface Archipelago {
  id: string
  name: string
  summary: string
  color: string
  games: PlanetGame[]
}

// 群島名稱與說明對應遊戲島 parts/10-data.js 的 islands；顏色取自各島色帶，調亮後在深色海面上才看得清楚
const ARCHIPELAGO_META: Record<string, { name: string; summary: string; color: string }> = {
  board: { name: '棋盤群島', summary: '棋類與策略對戰，想一想再出手。', color: '#8f9de6' },
  learn: { name: '學習群島', summary: '數學、知識問答與程式思維，邊玩邊學。', color: '#5cc8b4' },
  puzzle: { name: '解謎群島', summary: '用手畫線、動腦筋，解開物理謎題。', color: '#f3d36b' },
  kingdom: { name: '三國群島', summary: '三國主題小遊戲，陸續加入中。', color: '#ec7d55' },
}

// games.json 多了新的島、這裡還沒設定時，先用中性色照常顯示，遊戲不會因此消失
const FALLBACK_COLOR = '#a9b4c8'

type RawGame = PlanetGame & { updated: string }

export const ARCHIPELAGOS: Archipelago[] = Object.entries(GAMES_BY_ISLAND as Record<string, RawGame[]>).map(
  ([id, list]) => {
    const meta = ARCHIPELAGO_META[id]
    return {
      id,
      name: meta?.name ?? `${id} 群島`,
      summary: meta?.summary ?? '',
      color: meta?.color ?? FALLBACK_COLOR,
      // 與遊戲島相同的排序：熱度高的在前，同熱度新的在前；排第一的放在群島中央的主島
      games: [...list]
        .sort((a, b) => b.heat - a.heat || b.updated.localeCompare(a.updated))
        .map(g => ({ id: g.id, name: g.name, path: g.path, what: g.what, heat: g.heat })),
    }
  },
)
