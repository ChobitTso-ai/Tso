export interface Achievement {
  id: string
  icon: string
  title: string
  desc: string
}

const DEFS: Achievement[] = [
  { id: 'first_win',  icon: '🏆', title: '初心者',     desc: '完成第一次通關' },
  { id: 'last_stand', icon: '💀', title: '鋼鐵意志',   desc: '剩 1 HP 通關一關' },
  { id: 'combo_10',   icon: '🔥', title: '連答機器',   desc: '連答 10 題以上' },
  { id: 'no_miss',    icon: '🎯', title: '完美通關',   desc: '一關內零失誤' },
  { id: 'gold_500',   icon: '💰', title: '金幣達人',   desc: '單局累積 500 金幣' },
  { id: 'speed_5s',   icon: '⚡', title: '閃電俠',     desc: '5 秒內答對題目' },
  { id: 'boss_3',     icon: '👹', title: 'Boss 終結者', desc: '打倒 3 隻 Boss' },
  { id: 'daily_done', icon: '📅', title: '每日報到',   desc: '完成今日挑戰' },
  { id: 'survivor',   icon: '♾',  title: '永恆戰士',   desc: '生存模式擊殺 20 隻' },
  { id: 'all_modes',  icon: '🌟', title: '全能玩家',   desc: '體驗所有遊戲模式' },
]

const A_KEY    = 'mq_achievements'
const BOSS_KEY = 'mq_bossKills'
const MODE_KEY = 'mq_modesUsed'

export const ALL_ACHIEVEMENTS = DEFS

export function getUnlocked(): Record<string, boolean> {
  return JSON.parse(localStorage.getItem(A_KEY) ?? '{}')
}

export function tryUnlock(id: string): Achievement | null {
  const u = getUnlocked()
  if (u[id]) return null
  u[id] = true
  localStorage.setItem(A_KEY, JSON.stringify(u))
  return DEFS.find(d => d.id === id) ?? null
}

export function incBossKills(): number {
  const n = getBossKills() + 1
  localStorage.setItem(BOSS_KEY, String(n))
  return n
}

export function getBossKills(): number {
  return parseInt(localStorage.getItem(BOSS_KEY) ?? '0')
}

export function recordMode(mode: string): string[] {
  const used: string[] = JSON.parse(localStorage.getItem(MODE_KEY) ?? '[]')
  if (!used.includes(mode)) { used.push(mode); localStorage.setItem(MODE_KEY, JSON.stringify(used)) }
  return used
}

export function getModesUsed(): string[] {
  return JSON.parse(localStorage.getItem(MODE_KEY) ?? '[]')
}

// 稱號：由成就衍生
export function getTitle(unlocked: Record<string, boolean>): string {
  if (unlocked['all_modes'])  return '全能玩家'
  if (unlocked['combo_10'])   return '連答機器'
  if (unlocked['no_miss'])    return '完美通關者'
  if (unlocked['boss_3'])     return 'Boss 終結者'
  if (unlocked['last_stand']) return '鋼鐵意志'
  if (unlocked['first_win'])  return '初心者'
  return ''
}
