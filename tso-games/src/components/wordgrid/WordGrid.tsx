import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import './WordGrid.css'
import {
  DIFFICULTY_LABELS,
  MAX_MATH_NUMBERS,
  MIN_WORD_LETTERS,
  MODE_LABELS,
  OPS,
  PASS_RATIO,
  SIZES,
  buildDictionary,
  evaluate,
  expressionText,
  generateMathBoard,
  generateWordTiles,
  isAdjacent,
  passPoints,
  solveMath,
  solveWords,
  totalPoints,
} from './logic'
import type { Dictionary, Difficulty, Mode, Op, Size, Solution } from './logic'

const STATE_KEY = 'wordgrid_state'
const STATS_KEY = 'wordgrid_stats'
const MODES: Mode[] = ['word', 'math']
const DIFFICULTIES: Difficulty[] = ['easy', 'hard', 'extreme']

interface Settings {
  mode: Mode
  size: Size
  difficulty: Difficulty
}

interface Game {
  settings: Settings
  tiles: string[]
  target: number | null // 數學模式的目標數
  found: string[]       // 找到的單字／算式，依找到的順序
  elapsed: number       // 已用秒數
  passed: boolean
  revealed: boolean     // 按過「看答案」，這一盤就鎖住
}

// 數學模式：連好數字後，在數字之間挑運算符號
interface Builder {
  path: number[]
  ops: Op[]
}

interface Flash {
  text: string
  kind: 'good' | 'dup' | 'bad'
  key: number
}

type Stats = Record<string, { cleared: number; best: number | null }>

const DEFAULT_SETTINGS: Settings = { mode: 'word', size: 4, difficulty: 'easy' }

let dictCache: Dictionary | null = null

function loadDictionary(): Promise<Dictionary> {
  if (dictCache) return Promise.resolve(dictCache)
  // 單字表約 100KB（gzip），只有進這個遊戲才下載
  return import('./words').then(m => {
    dictCache = buildDictionary(m.COMMON_WORDS, m.EXTRA_WORDS)
    return dictCache
  })
}

function createGame(settings: Settings, dict: Dictionary | null): Game | null {
  const blank = { settings, found: [], elapsed: 0, passed: false, revealed: false }
  if (settings.mode === 'math') return { ...blank, ...generateMathBoard(settings.size) }
  if (!dict) return null
  return { ...blank, tiles: generateWordTiles(settings.size, dict), target: null }
}

// 還原存檔：逐欄驗證，有任何一欄不合法就整份丟掉、開新盤面
function restoreGame(): Game | null {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return null
    const g = JSON.parse(raw) as Game
    const s = g?.settings
    const tilePattern = s?.mode === 'math' ? /^[1-9]$/ : /^[A-PR-Z]$/
    const valid =
      !!s &&
      MODES.includes(s.mode) &&
      SIZES.includes(s.size) &&
      DIFFICULTIES.includes(s.difficulty) &&
      Array.isArray(g.tiles) &&
      g.tiles.length === s.size * s.size &&
      g.tiles.every(t => typeof t === 'string' && tilePattern.test(t)) &&
      (s.mode === 'word' ? g.target === null : Number.isInteger(g.target)) &&
      Array.isArray(g.found) &&
      g.found.every(f => typeof f === 'string') &&
      Number.isFinite(g.elapsed) &&
      typeof g.passed === 'boolean' &&
      typeof g.revealed === 'boolean'
    if (valid) return g
  } catch {
    // 毀損的存檔，下面清掉
  }
  localStorage.removeItem(STATE_KEY)
  return null
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    const v: unknown = raw ? JSON.parse(raw) : null
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Stats
  } catch {
    // 毀損就從頭記
  }
  return {}
}

const statsKey = (s: Settings) => `${s.mode}-${s.size}-${s.difficulty}`

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function groupLabel(mode: Mode, group: number): string {
  if (mode === 'math') return `${group} 個數字`
  return group >= 8 ? '8 個字母以上' : `${group} 個字母`
}

export default function WordGrid() {
  const [dict, setDict] = useState<Dictionary | null>(dictCache)
  const [loadError, setLoadError] = useState(false)
  const [game, setGame] = useState<Game | null>(() => restoreGame() ?? createGame(DEFAULT_SETTINGS, dictCache))
  const [settings, setSettings] = useState<Settings>(() => game?.settings ?? DEFAULT_SETTINGS)
  // 單字表載入完成時要用「最新選的設定」開盤，非同步回呼讀不到最新 state，所以另外用 ref 記
  const settingsRef = useRef(settings)
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState<Stats>(loadStats)

  const gridRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const pathRef = useRef<number[]>([])
  const [path, setPath] = useState<number[]>([])
  const [builder, setBuilder] = useState<Builder | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [shown, setShown] = useState<string | null>(null) // 看答案時點選的答案，在盤面上標出位置

  useEffect(() => {
    if (dict) return
    let alive = true
    loadDictionary()
      .then(d => {
        if (!alive) return
        setDict(d)
        setGame(g => g ?? createGame(settingsRef.current, d))
      })
      .catch(() => {
        if (alive) setLoadError(true)
      })
    return () => {
      alive = false
    }
  }, [dict])

  const mode = game?.settings.mode
  const size = game?.settings.size ?? 4
  const tiles = game?.tiles
  const target = game?.target ?? null

  const solutions = useMemo<Map<string, Solution> | null>(() => {
    if (!tiles) return null
    if (mode === 'math') return solveMath(tiles, size, target ?? 0)
    return dict ? solveWords(tiles, size, dict) : null
  }, [tiles, mode, size, target, dict])

  const running = !!game && !game.revealed && !!solutions
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (document.hidden) return
      setGame(g => (g && !g.revealed ? { ...g, elapsed: g.elapsed + 1 } : g))
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (game) localStorage.setItem(STATE_KEY, JSON.stringify(game))
  }, [game])

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  }, [stats])

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 1800)
    return () => clearTimeout(id)
  }, [flash])

  if (!game || !solutions) {
    return (
      <div className="wg-root">
        <div className="wg-loading">{loadError ? '單字表載入失敗，請重新整理頁面' : '準備盤面中…'}</div>
      </div>
    )
  }

  const current = game
  const sols = solutions
  const total = totalPoints(sols)
  const need = passPoints(total, current.settings.difficulty)
  const foundSols = current.found.map(t => sols.get(t)).filter((s): s is Solution => !!s)
  const score = foundSols.reduce((sum, s) => sum + s.points, 0)
  const extraFound = foundSols.filter(s => !s.common)

  const groups = new Map<number, { total: number; found: number }>()
  for (const s of sols.values()) {
    if (!s.common) continue
    const g = groups.get(s.group) ?? { total: 0, found: 0 }
    g.total++
    if (current.found.includes(s.text)) g.found++
    groups.set(s.group, g)
  }
  const groupList = [...groups].sort((a, b) => a[0] - b[0])

  const shownPath = shown ? sols.get(shown)?.path ?? [] : []
  const linePath = builder ? builder.path : path.length > 0 ? path : shownPath

  // key 每次都換，同一句提示連續出現時動畫也會重播
  const showFlash = (text: string, kind: Flash['kind']) => setFlash(f => ({ text, kind, key: (f?.key ?? 0) + 1 }))

  const updatePath = (next: number[]) => {
    pathRef.current = next
    setPath(next)
  }

  const addFound = (text: string, label: string): boolean => {
    if (current.found.includes(text)) {
      showFlash(`${label} 已經找過了`, 'dup')
      return true
    }
    const sol = sols.get(text)
    if (!sol) return false
    const nowPassed = !current.passed && score + sol.points >= need
    if (nowPassed) {
      const key = statsKey(current.settings)
      const time = current.elapsed
      setStats(prev => {
        const old = prev[key] ?? { cleared: 0, best: null }
        return { ...prev, [key]: { cleared: old.cleared + 1, best: old.best === null ? time : Math.min(old.best, time) } }
      })
    }
    setGame(g => g && { ...g, found: [...g.found, text], passed: g.passed || nowPassed })
    showFlash(nowPassed ? `🎉 過關！${label} +${sol.points}` : `${label} +${sol.points}${sol.common ? '' : '（額外字）'}`, 'good')
    return true
  }

  const submitWord = (p: number[]) => {
    if (p.length < 2) return // 只點一下不算
    const word = p.map(i => current.tiles[i]).join('').toLowerCase()
    if (word.length < MIN_WORD_LETTERS) {
      showFlash(`至少要 ${MIN_WORD_LETTERS} 個字母`, 'bad')
      return
    }
    if (!addFound(word, word.toUpperCase())) showFlash(`${word.toUpperCase()} 不在單字表裡`, 'bad')
  }

  const submitMath = () => {
    if (!builder) return
    const nums = builder.path.map(i => Number(current.tiles[i]))
    const text = expressionText(nums, builder.ops)
    const value = evaluate(nums, builder.ops)
    // 算錯時保留算式，讓孩子直接改符號再送
    if (value === null) {
      showFlash(`${text}：除不盡`, 'bad')
      return
    }
    if (value !== current.target) {
      showFlash(`${text} = ${value}，不是 ${current.target}`, 'bad')
      return
    }
    addFound(text, text)
    setBuilder(null)
    updatePath([])
  }

  const cancelBuilder = () => {
    setBuilder(null)
    updatePath([])
  }

  const setOp = (slot: number, op: Op) => {
    setBuilder(b => b && { ...b, ops: b.ops.map((o, k) => (k === slot ? op : o)) })
  }

  // 只認手指落在格子中心附近，斜著拖的時候才不會誤選旁邊的格子
  const tileAt = (clientX: number, clientY: number): number | null => {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cell = rect.width / size
    const x = clientX - rect.left
    const y = clientY - rect.top
    const c = Math.floor(x / cell)
    const r = Math.floor(y / cell)
    if (r < 0 || c < 0 || r >= size || c >= size) return null
    if (Math.hypot(x - (c + 0.5) * cell, y - (r + 0.5) * cell) > cell * 0.42) return null
    return r * size + c
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (current.revealed || builder || busy) return
    const t = tileAt(e.clientX, e.clientY)
    if (t === null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    setShown(null)
    updatePath([t])
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const t = tileAt(e.clientX, e.clientY)
    if (t === null) return
    const p = pathRef.current
    const last = p[p.length - 1]
    if (t === last) return
    if (p.length >= 2 && t === p[p.length - 2]) {
      updatePath(p.slice(0, -1)) // 往回拖＝取消上一格
      return
    }
    if (p.includes(t) || !isAdjacent(size, last, t)) return
    if (mode === 'math' && p.length >= MAX_MATH_NUMBERS) return
    updatePath([...p, t])
  }

  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const p = pathRef.current
    if (mode === 'math') {
      if (p.length >= 2) setBuilder({ path: p, ops: p.slice(1).map(() => '+') })
      else updatePath([])
      return
    }
    submitWord(p)
    updatePath([])
  }

  const onPointerCancel = () => {
    draggingRef.current = false
    updatePath([])
  }

  const startGame = (next: Settings) => {
    if (current.found.length > 0 && !current.revealed && !window.confirm('開新盤面後，這一盤的進度會消失，確定嗎？')) {
      return
    }
    settingsRef.current = next
    setSettings(next)
    setBuilder(null)
    setShown(null)
    setFlash(null)
    updatePath([])
    if (next.mode === 'word' && !dict) {
      setGame(null) // 單字表載完後由載入流程開盤
      return
    }
    setBusy(true)
    // 先讓「產生中」畫出來；5×5 的數學盤面要算零點幾秒
    setTimeout(() => {
      setGame(createGame(next, dict))
      setBusy(false)
    }, 30)
  }

  const reveal = () => {
    if (!window.confirm('確定要看答案嗎？看了之後這一盤就不能再找了。')) return
    setBuilder(null)
    updatePath([])
    setGame(g => g && { ...g, revealed: true })
  }

  const isMath = current.settings.mode === 'math'
  const record = stats[statsKey(current.settings)]
  const progress = total > 0 ? Math.min(100, (score / total) * 100) : 0

  let status: { text: string; kind: string }
  if (flash) status = { text: flash.text, kind: flash.kind }
  else if (busy) status = { text: '產生新盤面中…', kind: 'info' }
  else if (builder) status = { text: '選好運算符號，再按「送出」', kind: 'info' }
  else if (path.length > 0) {
    status = {
      text: path.map(i => current.tiles[i]).join(isMath ? ' · ' : ''),
      kind: 'typing',
    }
  } else if (current.revealed) status = { text: '點右邊的答案，可以在盤面上看到位置', kind: 'info' }
  else status = { text: isMath ? '拖曳連起 2–4 個相鄰的數字' : '拖曳連起相鄰的字母，拼出英文單字', kind: 'info' }

  const builderNums = builder ? builder.path.map(i => Number(current.tiles[i])) : []
  const builderValue = builder ? evaluate(builderNums, builder.ops) : null

  const answerList = current.revealed
    ? [...sols.values()].filter(s => s.common).sort((a, b) => b.group - a.group || a.text.localeCompare(b.text))
    : []

  return (
    <div className="wg-root">
      <div className="wg-settings">
        <div className="wg-seg">
          {MODES.map(m => (
            <button
              key={m}
              className={`wg-seg-btn ${settings.mode === m ? 'active' : ''}`}
              onClick={() => settings.mode !== m && startGame({ ...settings, mode: m })}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="wg-seg">
          {SIZES.map(n => (
            <button
              key={n}
              className={`wg-seg-btn ${settings.size === n ? 'active' : ''}`}
              onClick={() => settings.size !== n && startGame({ ...settings, size: n })}
            >
              {n}×{n}
            </button>
          ))}
        </div>
        <div className="wg-seg">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              className={`wg-seg-btn ${settings.difficulty === d ? 'active' : ''}`}
              onClick={() => settings.difficulty !== d && startGame({ ...settings, difficulty: d })}
            >
              {DIFFICULTY_LABELS[d]} {PASS_RATIO[d] * 100}%
            </button>
          ))}
        </div>
        <button className="wg-btn wg-btn-new" onClick={() => startGame(settings)} disabled={busy}>
          🔄 新盤面
        </button>
      </div>

      <div className="wg-main">
        <div className="wg-board-col">
          {isMath && (
            <div className="wg-target">
              目標數 <span className="wg-target-num">{current.target}</span>
            </div>
          )}
          <div key={flash?.key} className={`wg-status ${status.kind}`}>
            {status.text}
          </div>

          <div
            ref={gridRef}
            className={`wg-grid ${current.revealed ? 'locked' : ''} ${isMath ? 'math' : ''}`}
            style={{ '--n': size } as CSSProperties}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            {current.tiles.map((t, i) => {
              const step = linePath.indexOf(i)
              const cls = [
                'wg-tile',
                step >= 0 ? (shown && !builder && path.length === 0 ? 'shown' : 'sel') : '',
                step >= 0 && step === linePath.length - 1 ? 'last' : '',
              ]
              return (
                <div key={i} className="wg-cell">
                  <div className={cls.filter(Boolean).join(' ')}>{t}</div>
                </div>
              )
            })}
            {linePath.length > 1 && (
              <svg className="wg-lines" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                <polyline
                  points={linePath.map(i => `${(i % size) + 0.5},${Math.floor(i / size) + 0.5}`).join(' ')}
                />
              </svg>
            )}
          </div>

          {builder && (
            <div className="wg-builder">
              <div className="wg-expr">
                {builderNums.map((n, k) => (
                  <span key={k} className="wg-expr-part">
                    {k > 0 && (
                      <span className="wg-ops">
                        {OPS.map(op => (
                          <button
                            key={op}
                            className={`wg-op ${builder.ops[k - 1] === op ? 'active' : ''}`}
                            onClick={() => setOp(k - 1, op)}
                          >
                            {op}
                          </button>
                        ))}
                      </span>
                    )}
                    <span className="wg-expr-num">{n}</span>
                  </span>
                ))}
                <span className="wg-expr-eq">= {builderValue === null ? '除不盡' : builderValue}</span>
              </div>
              <div className="wg-builder-actions">
                <button className="wg-btn wg-btn-go" onClick={submitMath}>
                  送出
                </button>
                <button className="wg-btn" onClick={cancelBuilder}>
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="wg-side">
          <div className="wg-numbers">
            <div className="wg-num-box">
              <span className="wg-num-label">時間</span>
              <span className="wg-num-value">{formatTime(current.elapsed)}</span>
            </div>
            <div className="wg-num-box">
              <span className="wg-num-label">分數</span>
              <span className="wg-num-value">
                {score} <small>/ {total}</small>
              </span>
            </div>
            <div className="wg-num-box">
              <span className="wg-num-label">過關</span>
              <span className="wg-num-value">{need} 分</span>
            </div>
          </div>

          <div className="wg-progress">
            <div className="wg-progress-bar" style={{ width: `${progress}%` }} />
            <div className="wg-progress-mark" style={{ left: `${PASS_RATIO[current.settings.difficulty] * 100}%` }} />
          </div>

          {current.passed && <div className="wg-passed">🎉 過關了！還可以繼續找，挑戰更高分</div>}

          <div className="wg-groups">
            {groupList.map(([g, c]) => (
              <div key={g} className={`wg-group ${c.found === c.total ? 'done' : ''}`}>
                <span>{groupLabel(current.settings.mode, g)}</span>
                <span>
                  {c.found} / {c.total}
                </span>
              </div>
            ))}
            {extraFound.length > 0 && (
              <div className="wg-group extra">
                <span>額外字</span>
                <span>{extraFound.length}</span>
              </div>
            )}
          </div>

          {current.revealed ? (
            <div className="wg-words">
              {answerList.map(s => (
                <button
                  key={s.text}
                  className={`wg-word ${current.found.includes(s.text) ? 'found' : 'missed'} ${shown === s.text ? 'active' : ''}`}
                  onClick={() => setShown(shown === s.text ? null : s.text)}
                >
                  {isMath ? s.text : s.text.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <div className="wg-words">
              {[...foundSols].reverse().map(s => (
                <span key={s.text} className={`wg-word found ${s.common ? '' : 'extra'}`}>
                  {isMath ? s.text : s.text.toUpperCase()}
                </span>
              ))}
              {foundSols.length === 0 && <span className="wg-empty">還沒找到任何{isMath ? '算式' : '單字'}</span>}
            </div>
          )}

          <div className="wg-side-actions">
            {!current.revealed && (
              <button className="wg-btn wg-btn-warn" onClick={reveal}>
                👀 看答案
              </button>
            )}
            {current.revealed && (
              <button className="wg-btn wg-btn-go" onClick={() => startGame(settings)} disabled={busy}>
                🔄 再來一盤
              </button>
            )}
          </div>

          {record && (
            <div className="wg-record">
              這個設定過關 {record.cleared} 次
              {record.best !== null && `・最快 ${formatTime(record.best)}`}
            </div>
          )}
        </div>
      </div>

      <details className="wg-rules">
        <summary>📖 怎麼玩？</summary>
        <ul>
          <li>用手指或滑鼠在格子上拖曳，把相鄰的格子連起來（上下左右、斜角都可以），同一格在一次連線裡只能用一次。往回拖可以取消上一格。</li>
          <li>
            <b>英文單字</b>：連出 {MIN_WORD_LETTERS} 個字母以上的英文單字，放開就送出。字越長分數越高：3–4 個字母 1 分、5 個 2 分、6 個 3 分、7 個 5 分、8 個以上 11 分。盤面上不會出現 Q。
          </li>
          <li>
            <b>數學算式</b>：連 2–{MAX_MATH_NUMBERS} 個數字，放開後在數字之間選運算符號，算出來要等於目標數。先乘除後加減，除法要整除。2 個數字 1 分、3 個 2 分、4 個 4 分；3+4 和 4+3 算兩條。
          </li>
          <li>拿到盤面總分的 30%／60%／90%（依難度）就過關，過關後還能繼續找。</li>
          <li>英文盤面的總分只算常用字；找到比較少見的字也會加分，標成「額外字」。</li>
          <li>按「看答案」會列出所有答案，點一下就能在盤面上看到位置。</li>
        </ul>
        <p className="wg-credit">
          英文單字表取自 SCOWL（Copyright 2000-2016 Kevin Atkinson），
          <a href={`${import.meta.env.BASE_URL}licenses/SCOWL-Copyright.txt`} target="_blank" rel="noopener noreferrer">
            著作權聲明
          </a>
        </p>
      </details>
    </div>
  )
}
