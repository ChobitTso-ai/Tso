import { useState, useEffect, useCallback, useRef } from 'react'
import { getQuestion, type CharacterId, type Question } from './questions'
import { Sfx } from './sounds'
import { tryUnlock, incBossKills, recordMode, getUnlocked, getTitle, ALL_ACHIEVEMENTS } from './achievements'
import './MathQuest.css'

// ── 型別 ──────────────────────────────────────────────────────────────────────

type CellType   = 'empty' | 'start' | 'monster' | 'elite' | 'trap' | 'treasure' | 'item' | 'boss'
type ItemType   = 'heal' | 'skip' | 'shield' | 'big_heal' | 'doubler'
type GameMode   = 'normal' | 'time' | 'survival' | 'speedrun' | 'bossrush' | 'daily'
type Screen     = 'select' | 'mode_select' | 'map' | 'battle' | 'boss' | 'shop' | 'win' | 'lose'
type Theme      = 1 | 2 | 3

interface Cell      { type: CellType; defeated: boolean }

interface GameState {
  char: CharacterId
  mode: GameMode
  level: 1 | 2 | 3
  board: Cell[][]
  pos: [number, number]
  hp: number
  maxHp: number
  score: number
  gold: number
  screen: Screen
  question: Question | null
  wrongOptions: number[]
  wrongInLevel: number
  bossQ: Question[]
  bossIndex: number
  bossWrongOptions: number[]
  combo: number
  maxCombo: number
  items: ItemType[]
  shield: boolean
  doubleScoreLeft: number
  subDifficulty: number
  correctStreak: number
  timeLeft: number
  startTime: number
  survivalKills: number
  survivalRound: number
  bossRushDefeated: number
  bossRushTotal: number
  newAchievements: string[]
}

interface ScoreEntry {
  char: CharacterId
  mode: GameMode
  score: number
  maxCombo: number
  level: number
  date: string
}

// ── 常數 ──────────────────────────────────────────────────────────────────────

const CHAR_INFO = {
  alan: { name: 'Alan',   maxHp: 4, color: '#4A90D9', emoji: '🧒', subject: '九九乘法',  desc: '專攻乘法表，穩健冷靜' },
  ryan: { name: 'Ryan T', maxHp: 5, color: '#E8A020', emoji: '😄', subject: '小學數學',  desc: '活潑挑戰，四五六年級' },
}
const LEVEL_SIZE: Record<1|2|3, number> = { 1: 5, 2: 7, 3: 9 }
const BOSS_Q:     Record<1|2|3, number> = { 1: 3, 2: 4, 3: 5 }
const STORAGE_KEY    = 'mathQuestGame'
const LEADERBOARD_KEY = 'mathQuestLeaderboard'
const CHAR_EXP_KEY   = (char: CharacterId) => `mq_exp_${char}`
const LOGIN_KEY      = 'mq_login'
const EXP_THRESH     = [0, 20, 50, 100, 200]

const SHOP_ITEMS = [
  { id: 'heal',     icon: '💊', name: '小回血藥', desc: '+1 HP',           price: 40,  type: 'heal'     as ItemType },
  { id: 'skip',     icon: '🎫', name: '跳過券',  desc: '跳過一題不扣血',   price: 50,  type: 'skip'     as ItemType },
  { id: 'shield',   icon: '🛡',  name: '護盾',   desc: '下次答錯不扣血',   price: 80,  type: 'shield'   as ItemType },
  { id: 'big_heal', icon: '❤️', name: '大回血藥', desc: '回滿 HP',         price: 150, type: 'big_heal' as ItemType },
  { id: 'doubler',  icon: '⭐', name: '得分加倍', desc: '下 10 題得分 ×2', price: 200, type: 'doubler'  as ItemType },
]
const ITEM_MAP = Object.fromEntries(SHOP_ITEMS.map(s => [s.type, s])) as Record<ItemType, typeof SHOP_ITEMS[0]>

const GAME_MODES = [
  { id: 'normal',   icon: '🎮', name: '普通模式',    desc: '標準闖關，輕鬆上手',     tag: '' },
  { id: 'time',     icon: '⏱',  name: '限時模式',    desc: '每題 10 秒，搶速度！',   tag: 'NEW' },
  { id: 'survival', icon: '♾',  name: '生存模式',    desc: '無限地圖，看你能走多遠', tag: 'NEW' },
  { id: 'speedrun', icon: '🏃', name: '速通模式',    desc: '計時通關，衝最快紀錄',   tag: 'NEW' },
  { id: 'bossrush', icon: '👹', name: 'Boss Rush',   desc: '連挑 10 隻 Boss！',      tag: 'HARD' },
  { id: 'daily',    icon: '📅', name: '今日挑戰',    desc: '每天同一張地圖',          tag: 'DAILY' },
] as const

// 地圖主題：森林 / 石窟 / 火山
const TERRAIN: Record<Theme, string[]> = {
  1: ['🌳','🌲','🏚️','🪨','🌿','🌳','🏚️','🌲'],
  2: ['🪨','⛏️','🕸️','🦇','💀','🕸️','🪨','⛏️'],
  3: ['🌋','🔥','💀','🪨','🌋','🔥','🌋','🔥'],
}
const BOSS_ICON: Record<Theme, string> = { 1: '🏰', 2: '💀', 3: '🌋' }
const THEME_CLASS: Record<Theme, string> = { 1: '', 2: 'mq-cave', 3: 'mq-volcano' }

function terrainIcon(r: number, c: number, theme: Theme) {
  const t = TERRAIN[theme]
  return t[(r * 7 + c * 3) % t.length]
}

function levelTheme(level: number, mode: GameMode, survivalRound: number): Theme {
  if (mode === 'survival') return Math.min(3, Math.floor(survivalRound / 3) + 1) as Theme
  return Math.min(3, level) as Theme
}

// ── 角色升級 ──────────────────────────────────────────────────────────────────

function getCharExp(char: CharacterId): number {
  return parseInt(localStorage.getItem(CHAR_EXP_KEY(char)) ?? '0')
}
function addCharExp(char: CharacterId, amount: number) {
  localStorage.setItem(CHAR_EXP_KEY(char), String(getCharExp(char) + amount))
}
function getCharLevel(char: CharacterId): number {
  const exp = getCharExp(char)
  return EXP_THRESH.findLastIndex(t => exp >= t) + 1
}
function charLevelStartItems(char: CharacterId): ItemType[] {
  const lvl = getCharLevel(char)
  if (lvl >= 5) return ['heal', 'skip']
  if (lvl >= 3) return ['heal']
  return []
}

// ── 每日登入獎勵 ─────────────────────────────────────────────────────────────

function checkDailyLogin(): { bonus: number; streak: number; isNew: boolean } {
  const today = new Date().toLocaleDateString('zh-TW')
  const saved: { lastDate?: string; streak?: number } = JSON.parse(localStorage.getItem(LOGIN_KEY) ?? '{}')
  if (saved.lastDate === today) return { bonus: 0, streak: saved.streak ?? 1, isNew: false }
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('zh-TW')
  const streak = saved.lastDate === yesterday ? (saved.streak ?? 0) + 1 : 1
  localStorage.setItem(LOGIN_KEY, JSON.stringify({ lastDate: today, streak }))
  const bonus = streak >= 7 ? 100 : streak >= 3 ? 50 : streak >= 2 ? 30 : 20
  return { bonus, streak, isNew: true }
}
function getLoginStreak(): number {
  const saved: { streak?: number } = JSON.parse(localStorage.getItem(LOGIN_KEY) ?? '{}')
  return saved.streak ?? 0
}

// ── 每日挑戰種子 ─────────────────────────────────────────────────────────────

function getDailySeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

class SeededRng {
  private s: number
  constructor(seed: number) { this.s = (seed ^ 0x9e3779b9) >>> 0 }
  next(): number {
    this.s = Math.imul(this.s ^ (this.s >>> 16), 0x45d9f3b)
    this.s = Math.imul(this.s ^ (this.s >>> 16), 0x45d9f3b)
    this.s = (this.s ^ (this.s >>> 16)) >>> 0
    return this.s / 0xffffffff
  }
}

// ── 棋盤生成 ──────────────────────────────────────────────────────────────────

function buildBoard(size: number, rng?: SeededRng): Cell[][] {
  const rand = rng ? () => rng.next() : Math.random
  const board: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: 'empty' as CellType, defeated: false }))
  )
  board[0][0] = { type: 'start', defeated: false }
  board[size - 1][size - 1] = { type: 'boss', defeated: false }

  const positions: [number, number][] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!(r === 0 && c === 0) && !(r === size - 1 && c === size - 1))
        positions.push([r, c])

  const shuffled = [...positions].sort(() => rand() - 0.5)
  const total = shuffled.length
  let i = 0
  const counts = [
    Math.floor(total * 0.30),
    Math.floor(total * 0.10),
    Math.floor(total * 0.08),
    Math.floor(total * 0.06),
    Math.floor(total * 0.10),
  ]
  const types: CellType[] = ['monster', 'elite', 'trap', 'treasure', 'item']
  for (let t = 0; t < types.length; t++) {
    for (let k = 0; k < counts[t]; k++) board[shuffled[i+k][0]][shuffled[i+k][1]].type = types[t]
    i += counts[t]
  }
  return board
}

function buildBossQs(char: CharacterId, level: 1|2|3, sub = 0): Question[] {
  return Array.from({ length: BOSS_Q[level] }, () => getQuestion(char, level, sub))
}

// ── 存分 / 讀分 ───────────────────────────────────────────────────────────────

function saveScore(entry: Omit<ScoreEntry, 'date'>) {
  const saved: ScoreEntry[] = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? '[]')
  saved.push({ ...entry, date: new Date().toLocaleDateString('zh-TW') })
  saved.sort((a, b) => b.score - a.score)
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(saved.slice(0, 8)))
}
function loadLeaderboard(): ScoreEntry[] {
  return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? '[]')
}

function comboBonus(combo: number): number {
  if (combo >= 5) return 10
  if (combo >= 3) return 5
  return 0
}
function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export default function MathQuest() {
  const [state,      setState]   = useState<GameState | null>(null)
  const [shaking,    setShaking] = useState(false)
  const [sparkleCell,setSparkle] = useState<string | null>(null)
  const [toast,      setToast]   = useState<string | null>(null)
  const [elapsed,    setElapsed] = useState(0)
  const shakingRef = useRef(false)

  // 讀存檔
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) { try { setState(JSON.parse(saved)) } catch { /* ignore */ } }
  }, [])

  // 寫存檔
  useEffect(() => {
    if (state && state.screen !== 'select' && state.screen !== 'mode_select')
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // 速通計時
  useEffect(() => {
    if (!state || state.mode !== 'speedrun') return
    if (state.screen === 'win' || state.screen === 'lose') return
    const id = setInterval(() => setElapsed(Date.now() - state.startTime), 500)
    return () => clearInterval(id)
  }, [state?.mode, state?.screen, state?.startTime])

  // 限時倒數
  useEffect(() => {
    if (!state || state.mode !== 'time') return
    if (state.screen !== 'battle' && state.screen !== 'boss') return
    const id = setInterval(() => {
      setState(prev => {
        if (!prev || (prev.screen !== 'battle' && prev.screen !== 'boss')) return prev
        if (prev.timeLeft > 1) {
          if (prev.timeLeft <= 4) Sfx.tick()
          return { ...prev, timeLeft: prev.timeLeft - 1 }
        }
        Sfx.wrong()
        triggerShake()
        const newHp = prev.shield ? prev.hp : prev.hp - 1
        if (newHp <= 0) {
          Sfx.lose()
          finishGame(prev, false)
          return { ...prev, hp: 0, screen: 'lose', shield: false }
        }
        return { ...prev, hp: newHp, timeLeft: 10, shield: false, combo: 0 }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [state?.mode, state?.screen])

  // 鍵盤
  const tryMove = useCallback((dr: number, dc: number) => {
    setState(prev => {
      if (!prev || prev.screen !== 'map') return prev
      const size = prev.board.length
      const [r, c] = prev.pos
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) return prev

      const cell = prev.board[nr][nc]
      const newBoard = prev.board.map(row => row.map(cell => ({ ...cell })))

      if (cell.defeated) { Sfx.move(); return { ...prev, pos: [nr, nc] } }

      if (cell.type === 'item') {
        const rarities: [ItemType, number][] = [['heal', 0.4], ['skip', 0.35], ['shield', 0.15], ['big_heal', 0.07], ['doubler', 0.03]]
        let r2 = Math.random(); let item: ItemType = 'heal'
        for (const [t, w] of rarities) { r2 -= w; if (r2 <= 0) { item = t; break } }
        const newItems = prev.items.length < 4 ? [...prev.items, item] : prev.items
        newBoard[nr][nc].defeated = true
        Sfx.item()
        const info = ITEM_MAP[item]
        setTimeout(() => showToast(`✨ 獲得 ${info.icon} ${info.name}！`), 0)
        return { ...prev, pos: [nr, nc], board: newBoard, score: prev.score + 5, items: newItems }
      }

      if (cell.type === 'boss') {
        const hasEnemies = newBoard.some(row => row.some(c => (c.type === 'monster' || c.type === 'elite') && !c.defeated))
        if (hasEnemies) { setTimeout(() => showToast('⚠️ 先打倒所有怪物！'), 0); return prev }
        Sfx.boss()
        return { ...prev, pos: [nr, nc], bossQ: buildBossQs(prev.char, prev.level, prev.subDifficulty), bossIndex: 0, bossWrongOptions: [], screen: 'boss' }
      }

      const battleTypes: CellType[] = ['monster', 'elite', 'trap', 'treasure']
      if (battleTypes.includes(cell.type)) {
        if (cell.type === 'trap') Sfx.trap()
        else if (cell.type === 'treasure') Sfx.treasure()
        else Sfx.move()
        const qLevel = (cell.type === 'elite' ? Math.min(3, prev.level + 1) : prev.level) as 1|2|3
        const q = getQuestion(prev.char, qLevel, prev.subDifficulty)
        return { ...prev, pos: [nr, nc], screen: 'battle', question: q, wrongOptions: [], timeLeft: 10 }
      }

      Sfx.move()
      return { ...prev, pos: [nr, nc] }
    })
  }, [])

  const handleKey = useCallback((e: KeyboardEvent) => {
    const dirs: Record<string, [number, number]> = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] }
    const d = dirs[e.key]
    if (d) { e.preventDefault(); tryMove(d[0], d[1]) }
  }, [tryMove])
  useEffect(() => { window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey) }, [handleKey])

  // ── 工具 ────────────────────────────────────────────────────────────────────

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2000) }
  function triggerShake() {
    if (shakingRef.current) return
    shakingRef.current = true; setShaking(true)
    setTimeout(() => { setShaking(false); shakingRef.current = false }, 500)
  }
  function triggerSparkle(r: number, c: number) {
    setSparkle(`${r},${c}`); setTimeout(() => setSparkle(null), 600)
  }

  function finishGame(s: GameState, win: boolean) {
    saveScore({ char: s.char, mode: s.mode, score: s.score, maxCombo: s.maxCombo, level: s.level })
    if (win) tryUnlock('first_win')
    if (win && s.hp === 1) tryUnlock('last_stand')
    if (win && s.wrongInLevel === 0) tryUnlock('no_miss')
    if (s.gold >= 500) tryUnlock('gold_500')
    if (s.maxCombo >= 10) tryUnlock('combo_10')
    if (s.mode === 'daily') tryUnlock('daily_done')
    if (s.mode === 'survival' && s.survivalKills >= 20) tryUnlock('survivor')
    const modes = recordMode(s.mode)
    if (modes.length >= 5) tryUnlock('all_modes')
  }

  function checkAchievements(s: GameState, opts: { answerMs?: number } = {}): string[] {
    const newly: string[] = []
    if (opts.answerMs && opts.answerMs <= 5000) { const a = tryUnlock('speed_5s'); if (a) newly.push(a.id) }
    if (s.maxCombo >= 10) { const a = tryUnlock('combo_10'); if (a) newly.push(a.id) }
    if (s.gold >= 500) { const a = tryUnlock('gold_500'); if (a) newly.push(a.id) }
    return newly
  }

  // ── 遊戲啟動 ────────────────────────────────────────────────────────────────

  function selectChar(char: CharacterId) {
    setState({ char, mode: 'normal', level: 1, board: [], pos: [0,0], hp: 1, maxHp: 1, score: 0, gold: 0, screen: 'mode_select', question: null, wrongOptions: [], wrongInLevel: 0, bossQ: [], bossIndex: 0, bossWrongOptions: [], combo: 0, maxCombo: 0, items: [], shield: false, doubleScoreLeft: 0, subDifficulty: 0, correctStreak: 0, timeLeft: 10, startTime: 0, survivalKills: 0, survivalRound: 0, bossRushDefeated: 0, bossRushTotal: 10, newAchievements: [] })
  }

  function startGame(char: CharacterId, mode: GameMode) {
    const info = CHAR_INFO[char]
    const startItems = charLevelStartItems(char)
    const login = checkDailyLogin()
    recordMode(mode)
    const board = mode === 'daily'
      ? buildBoard(LEVEL_SIZE[1], new SeededRng(getDailySeed()))
      : buildBoard(LEVEL_SIZE[1])
    if (login.isNew) setTimeout(() => showToast(`🎁 登入獎勵 +${login.bonus} 金幣！（連續 ${login.streak} 天）`), 500)
    setState({ char, mode, level: 1, board, pos: [0,0], hp: info.maxHp, maxHp: info.maxHp, score: 0, gold: login.bonus, screen: mode === 'bossrush' ? 'boss' : 'map', question: null, wrongOptions: [], wrongInLevel: 0, bossQ: mode === 'bossrush' ? buildBossQs(char, 3) : [], bossIndex: 0, bossWrongOptions: [], combo: 0, maxCombo: 0, items: startItems, shield: false, doubleScoreLeft: 0, subDifficulty: 0, correctStreak: 0, timeLeft: 10, startTime: Date.now(), survivalKills: 0, survivalRound: 0, bossRushDefeated: 0, bossRushTotal: 10, newAchievements: [] })
  }

  function clickCell(r: number, c: number) {
    if (!state || state.screen !== 'map') return
    const [pr, pc] = state.pos
    if (Math.abs(r - pr) + Math.abs(c - pc) === 1) tryMove(r - pr, c - pc)
  }

  function useItem(item: ItemType, idx: number) {
    setState(prev => {
      if (!prev) return prev
      const newItems = prev.items.filter((_, i) => i !== idx)
      Sfx.item()
      switch (item) {
        case 'heal':     return { ...prev, items: newItems, hp: Math.min(prev.maxHp, prev.hp + 1) }
        case 'big_heal': return { ...prev, items: newItems, hp: prev.maxHp }
        case 'shield':   return { ...prev, items: newItems, shield: true }
        case 'doubler':  return { ...prev, items: newItems, doubleScoreLeft: 10 }
        default:         return prev
      }
    })
  }

  function buyItem(shopItem: typeof SHOP_ITEMS[0]) {
    setState(prev => {
      if (!prev || prev.gold < shopItem.price) return prev
      if (prev.items.length >= 4) { setTimeout(() => showToast('道具欄已滿！'), 0); return prev }
      if ((shopItem.type === 'heal' || shopItem.type === 'big_heal') && prev.hp >= prev.maxHp) {
        setTimeout(() => showToast('已是滿血！'), 0); return prev
      }
      if (shopItem.type === 'shield' && prev.shield) {
        setTimeout(() => showToast('護盾已啟動！'), 0); return prev
      }
      Sfx.buy()
      return { ...prev, gold: prev.gold - shopItem.price, items: [...prev.items, shopItem.type] }
    })
  }

  // ── 答題邏輯 ────────────────────────────────────────────────────────────────

  function resolveCorrect(prev: GameState, answerMs = 0): GameState {
    const newCombo    = prev.combo + 1
    const newMaxCombo = Math.max(prev.maxCombo, newCombo)
    const newStreak   = prev.correctStreak + 1
    const newSub      = newStreak % 5 === 0 ? Math.min(3, prev.subDifficulty + 1) : prev.subDifficulty
    const base        = 10 * (prev.doubleScoreLeft > 0 ? 2 : 1)
    const bonus       = comboBonus(newCombo)

    const newAch = checkAchievements({ ...prev, combo: newCombo, maxCombo: newMaxCombo }, { answerMs })
    if (newCombo >= 3) Sfx.combo(); else Sfx.correct()

    const newBoard = prev.board.map(row => row.map(c => ({ ...c })))
    const [r, c]   = prev.pos
    newBoard[r][c].defeated = true

    const tier = prev.board[r][c].type
    addCharExp(prev.char, tier === 'elite' ? 8 : 3)

    const goldGain = tier === 'elite' ? 18 : tier === 'treasure' ? 40 : 8
    triggerSparkle(r, c)

    return {
      ...prev,
      board: newBoard,
      score: prev.score + base + bonus,
      gold: prev.gold + goldGain,
      combo: newCombo, maxCombo: newMaxCombo,
      correctStreak: newStreak,
      subDifficulty: newSub,
      doubleScoreLeft: Math.max(0, prev.doubleScoreLeft - 1),
      // 生存模式計算所有怪物擊殺
      survivalKills: prev.mode === 'survival' ? prev.survivalKills + 1 : prev.survivalKills,
      screen: 'map',
      question: null, wrongOptions: [],
      newAchievements: [...prev.newAchievements, ...newAch],
    }
  }

  const answerStartRef = useRef<number>(Date.now())

  function answerQuestion(option: number) {
    const ms = Date.now() - answerStartRef.current
    setState(prev => {
      if (!prev || !prev.question) return prev
      if (option === prev.question.answer) return resolveCorrect(prev, ms)
      const newHp = prev.shield ? prev.hp : prev.hp - 1
      Sfx.wrong(); triggerShake()
      if (newHp <= 0) { Sfx.lose(); finishGame({ ...prev, hp: 0, combo: 0, shield: false }, false); return { ...prev, hp: 0, screen: 'lose', combo: 0, shield: false } }
      return { ...prev, hp: newHp, combo: 0, shield: false, wrongInLevel: prev.wrongInLevel + 1, wrongOptions: [...prev.wrongOptions, option] }
    })
  }

  function answerBoss(option: number) {
    const ms = Date.now() - answerStartRef.current
    setState(prev => {
      if (!prev) return prev
      const q = prev.bossQ[prev.bossIndex]
      if (option === q.answer) {
        const next = prev.bossIndex + 1
        if (next >= prev.bossQ.length) {
          // Boss 打倒
          const bossKills = incBossKills()
          if (bossKills >= 3) tryUnlock('boss_3')
          const newCombo    = prev.combo + 1
          const newMaxCombo = Math.max(prev.maxCombo, newCombo)
          if (newCombo >= 3) Sfx.combo(); else Sfx.correct()
          addCharExp(prev.char, 20)
          const newAch = checkAchievements({ ...prev, combo: newCombo, maxCombo: newMaxCombo }, { answerMs: ms })

          if (prev.mode === 'bossrush') {
            const defeated = prev.bossRushDefeated + 1
            if (defeated >= prev.bossRushTotal) {
              Sfx.win()
              finishGame({ ...prev, score: prev.score + 50, combo: newCombo, maxCombo: newMaxCombo }, true)
              return { ...prev, score: prev.score + 50, combo: newCombo, maxCombo: newMaxCombo, bossRushDefeated: defeated, screen: 'win' }
            }
            return { ...prev, combo: newCombo, maxCombo: newMaxCombo, bossRushDefeated: defeated, bossQ: buildBossQs(prev.char, 3), bossIndex: 0, bossWrongOptions: [], score: prev.score + 50, newAchievements: [...prev.newAchievements, ...newAch] }
          }

          const newBoard = prev.board.map(row => row.map(c => ({ ...c })))
          const [r, c] = prev.pos
          newBoard[r][c].defeated = true
          triggerSparkle(r, c)

          if (prev.mode === 'survival') {
            const newRound = prev.survivalRound + 1
            Sfx.win()
            return { ...prev, board: buildBoard(LEVEL_SIZE[1]), pos: [0,0], survivalRound: newRound, survivalKills: prev.survivalKills + 1, score: prev.score + 50, combo: newCombo, maxCombo: newMaxCombo, bossIndex: 0, bossQ: [], bossWrongOptions: [], screen: 'map', subDifficulty: Math.min(3, newRound), newAchievements: [...prev.newAchievements, ...newAch] }
          }

          const nextLevel = (prev.level + 1) as 1|2|3
          if (nextLevel > 3) {
            Sfx.win()
            finishGame({ ...prev, score: prev.score + 50, combo: newCombo, maxCombo: newMaxCombo }, true)
            return { ...prev, board: newBoard, score: prev.score + 50, combo: newCombo, maxCombo: newMaxCombo, screen: 'win', newAchievements: [...prev.newAchievements, ...newAch] }
          }
          Sfx.win()
          return { ...prev, level: nextLevel, board: buildBoard(LEVEL_SIZE[nextLevel]), pos: [0,0], score: prev.score + 50, combo: newCombo, maxCombo: newMaxCombo, wrongInLevel: 0, bossQ: [], bossIndex: 0, bossWrongOptions: [], screen: 'map', newAchievements: [...prev.newAchievements, ...newAch] }
        }

        // 中途題答對
        const midAch: string[] = []
        if (ms <= 5000) { const a = tryUnlock('speed_5s'); if (a) midAch.push(a.id) }
        if (next >= 3) Sfx.combo(); else Sfx.correct()
        return { ...prev, bossIndex: next, bossWrongOptions: [], combo: prev.combo + 1, maxCombo: Math.max(prev.maxCombo, prev.combo + 1), newAchievements: [...prev.newAchievements, ...midAch] }
      } else {
        const newHp = prev.shield ? prev.hp : prev.hp - 1
        Sfx.wrong(); triggerShake()
        if (newHp <= 0) { Sfx.lose(); finishGame({ ...prev, hp: 0, combo: 0, shield: false }, false); return { ...prev, hp: 0, combo: 0, shield: false, screen: 'lose' } }
        return { ...prev, hp: newHp, combo: 0, shield: false, bossWrongOptions: [...prev.bossWrongOptions, option] }
      }
    })
  }

  function useSkip(isBoss: boolean) {
    setState(prev => {
      if (!prev) return prev
      const idx = prev.items.indexOf('skip')
      if (idx === -1) return prev
      const newItems = prev.items.filter((_, i) => i !== idx)
      Sfx.correct()
      if (isBoss) {
        const next = prev.bossIndex + 1
        if (next >= prev.bossQ.length) return { ...prev, items: newItems, screen: 'map', bossQ: [], bossIndex: 0, bossWrongOptions: [] }
        return { ...prev, items: newItems, bossIndex: next, bossWrongOptions: [] }
      }
      const newBoard = prev.board.map(row => row.map(c => ({ ...c })))
      const [r, c] = prev.pos
      newBoard[r][c].defeated = true
      triggerSparkle(r, c)
      return { ...prev, items: newItems, board: newBoard, screen: 'map', question: null, wrongOptions: [] }
    })
  }

  function resetGame() { localStorage.removeItem(STORAGE_KEY); setState(null) }

  // ── 渲染 ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (state?.screen === 'battle' || state?.screen === 'boss') answerStartRef.current = Date.now()
  }, [state?.screen, state?.bossIndex, state?.question])

  if (!state || state.screen === 'select') return <SelectScreen onSelectChar={selectChar} />
  if (state.screen === 'mode_select') return <ModeSelectScreen char={state.char} onSelect={startGame} onBack={() => setState(null)} />
  if (state.screen === 'win')  return <EndScreen state={state} win onReset={resetGame} elapsed={state.mode === 'speedrun' ? elapsed : 0} />
  if (state.screen === 'lose') return <EndScreen state={state} win={false} onReset={resetGame} elapsed={0} />

  const info    = CHAR_INFO[state.char]
  const theme   = levelTheme(state.level, state.mode, state.survivalRound)
  const hasEnemies = state.board.some(row => row.some(c => (c.type === 'monster' || c.type === 'elite') && !c.defeated))

  return (
    <div className={`mq-game ${THEME_CLASS[theme]}`}>
      {/* 狀態列 */}
      <div className="mq-statusbar">
        <span className="mq-char-name" style={{ color: info.color }}>{info.emoji} {info.name}</span>
        <div className="mq-hearts">
          {Array.from({ length: state.maxHp }).map((_, i) => (
            <span key={i} className={i < state.hp ? 'mq-heart' : 'mq-heart mq-heart-empty'}>♥</span>
          ))}
        </div>
        {state.shield && <span className="mq-shield-badge">🛡</span>}
        <span className="mq-score">⭐{state.score}</span>
        <span className="mq-gold">💰{state.gold}</span>
        {state.doubleScoreLeft > 0 && <span className="mq-double">×2({state.doubleScoreLeft})</span>}
        {state.combo >= 2 && <span className={`mq-combo ${state.combo >= 5 ? 'mq-combo-fire' : ''}`}>🔥×{state.combo}</span>}
        {state.mode === 'speedrun' && <span className="mq-timer-badge">⏱{formatTime(elapsed)}</span>}
        <span className="mq-level">Lv.{state.level}</span>
        {state.mode !== 'normal' && <span className="mq-mode-badge">{GAME_MODES.find(m => m.id === state.mode)?.icon}</span>}
        <button className="mq-shop-btn" onClick={() => setState(p => p ? { ...p, screen: 'shop' } : p)}>🛒</button>
        <button className="mq-reset-btn" onClick={resetGame}>🔄</button>
      </div>

      {/* 道具欄 */}
      {state.items.length > 0 && (
        <div className="mq-items-bar">
          {state.items.map((item, i) => (
            <button key={i} className="mq-item-btn"
              title={ITEM_MAP[item]?.desc}
              onClick={() => state.screen === 'map' && item !== 'skip' ? useItem(item, i) : undefined}
            >
              {ITEM_MAP[item]?.icon ?? item}
            </button>
          ))}
        </div>
      )}

      {/* 成就通知 */}
      {state.newAchievements.map(id => {
        const def = ALL_ACHIEVEMENTS.find(a => a.id === id)
        return def ? <div key={id} className="mq-ach-toast">{def.icon} 解鎖成就：{def.title}！</div> : null
      })}

      {/* 地圖 */}
      {state.screen === 'map' && (
        <>
          <Board board={state.board} pos={state.pos} onClickCell={clickCell} level={state.level} sparkleCell={sparkleCell} mode={state.mode} survivalRound={state.survivalRound} theme={theme} />
          {hasEnemies && <p className="mq-boss-hint">⚠️ 消滅所有怪物才能進城堡！</p>}
        </>
      )}

      {/* Toast */}
      {toast && <div className="mq-toast">{toast}</div>}

      {/* 商店 */}
      {state.screen === 'shop' && (
        <ShopOverlay
          gold={state.gold} items={state.items} hp={state.hp} maxHp={state.maxHp} shield={state.shield}
          onBuy={buyItem} onClose={() => setState(p => p ? { ...p, screen: 'map' } : p)}
        />
      )}

      {/* 一般戰鬥 */}
      {state.screen === 'battle' && state.question && (
        <BattleOverlay question={state.question} wrongOptions={state.wrongOptions} onAnswer={answerQuestion} isBoss={false} shaking={shaking} hasSkip={state.items.includes('skip')} onSkip={() => useSkip(false)} mode={state.mode} timeLeft={state.timeLeft} />
      )}

      {/* Boss 戰 */}
      {state.screen === 'boss' && state.bossQ[state.bossIndex] && (
        <BattleOverlay question={state.bossQ[state.bossIndex]} wrongOptions={state.bossWrongOptions} onAnswer={answerBoss} isBoss bossProgress={[state.bossIndex, state.bossQ.length]} shaking={shaking} hasSkip={state.items.includes('skip')} onSkip={() => useSkip(true)} mode={state.mode} timeLeft={state.timeLeft} bossRushInfo={state.mode === 'bossrush' ? [state.bossRushDefeated, state.bossRushTotal] : undefined} />
      )}
    </div>
  )
}

// ── 角色選擇 ─────────────────────────────────────────────────────────────────

function SelectScreen({ onSelectChar }: { onSelectChar: (c: CharacterId) => void }) {
  const lb       = loadLeaderboard()
  const unlocked = getUnlocked()
  const streak   = getLoginStreak()
  return (
    <div className="mq-select">
      <h1 className="mq-select-title">🔢 數學冒險</h1>
      <p className="mq-select-sub">選擇你的角色</p>
      {streak >= 2 && (
        <div className="mq-login-banner">🎁 連續登入 {streak} 天 — 開始遊戲領取獎勵！</div>
      )}
      <div className="mq-chars">
        {(['alan', 'ryan'] as CharacterId[]).map(id => <CharCard key={id} id={id} onSelect={onSelectChar} />)}
      </div>
      {lb.length > 0 && (
        <div className="mq-lb-mini">
          <p className="mq-lb-title">🏆 最高分</p>
          {lb.slice(0, 3).map((e, i) => (
            <div key={i} className="mq-lb-row">
              <span className="mq-lb-rank">{['🥇','🥈','🥉'][i]}</span>
              <span>{CHAR_INFO[e.char].name}</span>
              <span className="mq-lb-mode">{GAME_MODES.find(m => m.id === e.mode)?.icon ?? ''}</span>
              <span className="mq-lb-score">⭐{e.score}</span>
              <span className="mq-lb-combo">🔥{e.maxCombo}</span>
              <span className="mq-lb-date">{e.date}</span>
            </div>
          ))}
        </div>
      )}
      {Object.keys(unlocked).length > 0 && (
        <div className="mq-ach-mini">
          <p className="mq-lb-title">🎖 成就 {Object.keys(unlocked).length} / {ALL_ACHIEVEMENTS.length}</p>
          <div className="mq-ach-icons">
            {ALL_ACHIEVEMENTS.map(a => (
              <span key={a.id} className={`mq-ach-icon ${unlocked[a.id] ? 'mq-ach-unlocked' : 'mq-ach-locked'}`} title={`${a.title}：${a.desc}`}>{a.icon}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 模式選擇 ─────────────────────────────────────────────────────────────────

function ModeSelectScreen({ char, onSelect, onBack }: { char: CharacterId; onSelect: (c: CharacterId, m: GameMode) => void; onBack: () => void }) {
  const info = CHAR_INFO[char]
  return (
    <div className="mq-mode-select">
      <button className="mq-back-btn" onClick={onBack}>← 換角色</button>
      <h2 className="mq-mode-title">{info.emoji} {info.name} — 選擇模式</h2>
      <div className="mq-mode-grid">
        {GAME_MODES.map(m => (
          <div key={m.id} className={`mq-mode-card ${m.tag === 'HARD' ? 'mq-mode-hard' : ''}`} onClick={() => onSelect(char, m.id as GameMode)}>
            {m.tag && <span className={`mq-mode-tag ${m.tag.toLowerCase()}`}>{m.tag}</span>}
            <span className="mq-mode-icon">{m.icon}</span>
            <p className="mq-mode-name">{m.name}</p>
            <p className="mq-mode-desc">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 角色卡 ────────────────────────────────────────────────────────────────────

function CharCard({ id, onSelect }: { id: CharacterId; onSelect: (c: CharacterId) => void }) {
  const info       = CHAR_INFO[id]
  const level      = getCharLevel(id)
  const exp        = getCharExp(id)
  const title      = getTitle(getUnlocked())
  const nextThresh = EXP_THRESH[Math.min(level, 4)]
  return (
    <div className="mq-char-card" style={{ borderColor: info.color }} onClick={() => onSelect(id)}>
      <div className="mq-char-level-badge">Lv.{level}{level >= 3 ? '⭐' : ''}</div>
      <div className="mq-char-avatar" style={{ background: info.color }}>
        {id === 'alan' ? <AlanAvatar level={level} /> : <RyanAvatar level={level} />}
      </div>
      <h2 className="mq-char-name-big">{info.name}</h2>
      {title && <p className="mq-char-title">「{title}」</p>}
      <p className="mq-char-subject">📚 {info.subject}</p>
      <p className="mq-char-desc">{info.desc}</p>
      <div className="mq-exp-bar-wrap">
        <div className="mq-exp-bar" style={{ width: `${Math.min(100, (exp / Math.max(1, nextThresh)) * 100)}%` }} />
      </div>
      <div className="mq-char-stats"><span>❤️ {info.maxHp} 顆心</span></div>
      <button className="mq-select-btn" style={{ background: info.color }}>選擇</button>
    </div>
  )
}

// ── SVG 頭像 ──────────────────────────────────────────────────────────────────

function AlanAvatar({ level = 1 }: { level?: number }) {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="44" r="23" fill="#FDDBB4" />
      <ellipse cx="17" cy="46" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="63" cy="46" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="40" cy="30" rx="22" ry="17" fill="#5C3317" />
      <rect x="18" y="30" width="9" height="18" rx="5" fill="#5C3317" />
      <rect x="53" y="30" width="9" height="18" rx="5" fill="#5C3317" />
      <rect x="18" y="37" width="44" height="6" rx="2" fill="#5C3317" />
      <ellipse cx="32" cy="48" rx="3.5" ry="4" fill="#2C1810" />
      <ellipse cx="48" cy="48" rx="3.5" ry="4" fill="#2C1810" />
      <circle cx="33.2" cy="46.8" r="1.1" fill="white" />
      <circle cx="49.2" cy="46.8" r="1.1" fill="white" />
      <path d="M33 57 Q40 63 47 57" stroke="#C77" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="22" y="66" width="36" height="12" rx="6" fill="#B0B0B0" />
      {level >= 3 && <text x="60" y="16" fontSize="14">⭐</text>}
    </svg>
  )
}

function RyanAvatar({ level = 1 }: { level?: number }) {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="42" r="25" fill="#FDDBB4" />
      <ellipse cx="15" cy="44" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="65" cy="44" rx="4" ry="5" fill="#FDDBB4" />
      <ellipse cx="40" cy="22" rx="25" ry="13" fill="#1a0f0a" />
      <rect x="15" y="20" width="9" height="14" rx="5" fill="#1a0f0a" />
      <rect x="56" y="20" width="9" height="14" rx="5" fill="#1a0f0a" />
      <polygon points="17,23 12,5 25,20" fill="#1a0f0a" />
      <polygon points="26,17 24,2 33,15" fill="#1a0f0a" />
      <polygon points="33,13 32,0 39,12" fill="#1a0f0a" />
      <polygon points="40,12 40,0 47,12" fill="#1a0f0a" />
      <polygon points="47,13 48,0 55,13" fill="#1a0f0a" />
      <polygon points="54,17 56,2 63,15" fill="#1a0f0a" />
      <polygon points="63,23 68,5 55,20" fill="#1a0f0a" />
      <path d="M28 40 Q32 36 36 40" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 40 Q48 36 52 40" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M30 52 Q40 62 50 52" stroke="#C77" strokeWidth="2" fill="#FF9999" strokeLinecap="round" />
      <rect x="22" y="65" width="36" height="13" rx="6" fill="#B0B0B0" />
      <line x1="62" y1="57" x2="69" y2="46" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
      <line x1="65" y1="59" x2="73" y2="50" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
      {level >= 3 && <text x="60" y="16" fontSize="14">⭐</text>}
    </svg>
  )
}

// ── 地圖 ─────────────────────────────────────────────────────────────────────

function Board({ board, pos, onClickCell, level, sparkleCell, mode, survivalRound, theme }: {
  board: Cell[][], pos: [number, number], onClickCell: (r:number, c:number) => void,
  level: number, sparkleCell: string|null, mode: GameMode, survivalRound: number, theme: Theme
}) {
  const size = board.length
  const [pr, pc] = pos
  const fontSize = size <= 5 ? '2.2rem' : size <= 7 ? '1.7rem' : '1.3rem'

  return (
    <div className="mq-map-wrap">
      <p className="mq-map-label">
        {mode === 'survival' ? `生存 第 ${survivalRound + 1} 波` : `關卡 ${level} — ${size}×${size}`}
      </p>
      <div className={`mq-board ${THEME_CLASS[theme]}`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isPlayer   = r === pr && c === pc
            const isAdj      = !isPlayer && Math.abs(r - pr) + Math.abs(c - pc) === 1
            const isBossCell = r === size - 1 && c === size - 1
            const isStart    = r === 0 && c === 0

            let icon: string
            if (isStart)         icon = '🏠'
            else if (isBossCell) icon = cell.defeated ? '✅' : BOSS_ICON[theme]
            else if (cell.defeated) icon = '🟫'
            else if (cell.type === 'treasure') icon = '💎'
            else icon = terrainIcon(r, c, theme)

            return (
              <div key={`${r}-${c}`} style={{ fontSize }}
                className={['mq-cell', isPlayer?'mq-cell-player':'', isAdj?'mq-cell-adj':'', cell.defeated?'mq-cell-done':'', sparkleCell===`${r},${c}`?'mq-cell-sparkle':''].filter(Boolean).join(' ')}
                onClick={() => onClickCell(r, c)}>
                {isPlayer ? '🧑' : icon}
              </div>
            )
          })
        )}
      </div>
      <p className="mq-hint">點擊相鄰格 / 方向鍵移動</p>
    </div>
  )
}

// ── 商店 ─────────────────────────────────────────────────────────────────────

function ShopOverlay({ gold, items, hp, maxHp, shield, onBuy, onClose }: {
  gold: number; items: ItemType[]; hp: number; maxHp: number; shield: boolean
  onBuy: (item: typeof SHOP_ITEMS[0]) => void; onClose: () => void
}) {
  function disableReason(s: typeof SHOP_ITEMS[0]): string {
    if (items.length >= 4) return '道具欄已滿'
    if (gold < s.price) return '金幣不足'
    if ((s.type === 'heal' || s.type === 'big_heal') && hp >= maxHp) return '已是滿血'
    if (s.type === 'shield' && shield) return '護盾已啟動'
    return ''
  }
  return (
    <div className="mq-overlay" onClick={onClose}>
      <div className="mq-shop-box" onClick={e => e.stopPropagation()}>
        <h2 className="mq-shop-title">🛒 商店</h2>
        <p className="mq-shop-gold">💰 {gold} 金幣｜道具欄 {items.length}/4</p>
        <div className="mq-shop-items">
          {SHOP_ITEMS.map(s => {
            const reason = disableReason(s)
            const disabled = reason !== ''
            return (
              <div key={s.id} className={`mq-shop-item ${disabled ? 'mq-shop-disabled' : ''}`}>
                <span className="mq-shop-icon">{s.icon}</span>
                <div className="mq-shop-info">
                  <p className="mq-shop-name">{s.name}</p>
                  <p className="mq-shop-desc">{reason ? <span className="mq-shop-reason">{reason}</span> : s.desc}</p>
                </div>
                <button className="mq-shop-buy" disabled={disabled} onClick={() => onBuy(s)}>
                  {s.price} 💰
                </button>
              </div>
            )
          })}
        </div>
        <button className="mq-shop-close" onClick={onClose}>關閉</button>
      </div>
    </div>
  )
}

// ── 戰鬥覆蓋層 ───────────────────────────────────────────────────────────────

function BattleOverlay({ question, wrongOptions, onAnswer, isBoss, bossProgress, shaking, hasSkip, onSkip, mode, timeLeft, bossRushInfo }: {
  question: Question; wrongOptions: number[]; onAnswer: (n: number) => void
  isBoss: boolean; bossProgress?: [number,number]; shaking: boolean
  hasSkip: boolean; onSkip: () => void; mode: GameMode; timeLeft: number
  bossRushInfo?: [number, number]
}) {
  const showTimer  = mode === 'time'
  const timerUrgent = timeLeft <= 3
  return (
    <div className="mq-overlay">
      <div className={`mq-battle-box ${shaking ? 'mq-shake' : ''}`}>
        {isBoss && bossProgress && (
          <p className="mq-boss-prog">
            {bossRushInfo ? `👹 Boss Rush ${bossRushInfo[0]+1}/${bossRushInfo[1]} — 題 ${bossProgress[0]+1}/${bossProgress[1]}` : `👹 Boss 戰 ${bossProgress[0]+1}/${bossProgress[1]}`}
          </p>
        )}
        {showTimer && (
          <div className={`mq-timer-ring ${timerUrgent ? 'mq-timer-urgent' : ''}`}>{timeLeft}</div>
        )}
        <p className="mq-enemy-icon">{isBoss ? '👹' : '👾'}</p>
        <p className="mq-question">{question.question}</p>
        <div className="mq-options">
          {question.options.map(opt => (
            <button key={opt}
              className={`mq-option ${wrongOptions.includes(opt) ? 'mq-option-wrong' : ''}`}
              disabled={wrongOptions.includes(opt)}
              onClick={() => onAnswer(opt)}>
              {opt}
            </button>
          ))}
        </div>
        {wrongOptions.length > 0 && (
          <>
            <p className="mq-wrong-hint">❌ 答錯！扣 1 顆心</p>
            <p className="mq-hint-text">💡 {question.hint}</p>
          </>
        )}
        {hasSkip && <button className="mq-skip-btn" onClick={onSkip}>🎫 使用跳過券</button>}
      </div>
    </div>
  )
}

// ── 結算 ─────────────────────────────────────────────────────────────────────

function EndScreen({ state, win, onReset, elapsed }: { state: GameState; win: boolean; onReset: () => void; elapsed: number }) {
  const info   = CHAR_INFO[state.char]
  const lb     = loadLeaderboard()
  const newAch = state.newAchievements.map(id => ALL_ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean)
  return (
    <div className="mq-end">
      <p className="mq-end-icon">{win ? '🏆' : '💀'}</p>
      <h2 className="mq-end-title">{win ? (state.mode === 'survival' ? `生存 ${state.survivalRound} 波！` : '完全過關！') : '挑戰失敗'}</h2>
      <p className="mq-end-score">⭐ {state.score} 分</p>
      <p className="mq-end-combo">🔥 最高連答 {state.maxCombo} 題</p>
      {elapsed > 0 && <p className="mq-end-time">⏱ 通關時間：{formatTime(elapsed)}</p>}
      {state.mode === 'survival' && <p className="mq-end-survival">♾ 擊殺 {state.survivalKills} 隻怪物</p>}
      <p className="mq-end-char" style={{ color: info.color }}>{info.emoji} {info.name}</p>

      {newAch.length > 0 && (
        <div className="mq-end-ach">
          <p className="mq-lb-title">🎖 新解鎖成就</p>
          {newAch.map(a => a && (
            <div key={a.id} className="mq-ach-row">{a.icon} <b>{a.title}</b> — {a.desc}</div>
          ))}
        </div>
      )}

      {lb.length > 0 && (
        <div className="mq-lb">
          <p className="mq-lb-title">🏆 歷史最高分</p>
          {lb.slice(0, 5).map((e, i) => (
            <div key={i} className={`mq-lb-row ${e.score === state.score && e.char === state.char ? 'mq-lb-current' : ''}`}>
              <span className="mq-lb-rank">{['🥇','🥈','🥉','4.','5.'][i]}</span>
              <span>{CHAR_INFO[e.char].name}</span>
              <span className="mq-lb-mode">{GAME_MODES.find(m => m.id === e.mode)?.icon ?? ''}</span>
              <span className="mq-lb-score">⭐{e.score}</span>
              <span className="mq-lb-combo">🔥{e.maxCombo}</span>
              <span className="mq-lb-date">{e.date}</span>
            </div>
          ))}
        </div>
      )}
      <button className="mq-end-btn" onClick={onReset}>重新開始</button>
    </div>
  )
}
