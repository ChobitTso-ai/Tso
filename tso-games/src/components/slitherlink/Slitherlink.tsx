import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import './Slitherlink.css'
import {
  LEVELS,
  LEVEL_LABELS,
  SIZES,
  cluesFromSolution,
  findProblems,
  generatePuzzle,
  hintEdge,
  isSolved,
  topology,
} from './logic'
import type { Level, Mark, Puzzle, Size } from './logic'

const STATE_KEY = 'slitherlink_state'
const STATS_KEY = 'slitherlink_stats'
const ERRORS_KEY = 'slitherlink_showErrors'

interface Game {
  puzzle: Puzzle
  marks: Mark[]
  elapsed: number
  hints: number
  solved: boolean
}

type Stats = Record<string, { solved: number; best: number | null }>

const DEFAULT_SIZE: Size = 5
const DEFAULT_LEVEL: Level = 'normal'

function newGame(puzzle: Puzzle): Game {
  return { puzzle, marks: new Array<Mark>(topology(puzzle.size).edgeCount).fill(0), elapsed: 0, hints: 0, solved: false }
}

// 還原存檔：題目、答案、標記逐一驗證，答案和提示數字對不上就整份丟掉
function restoreGame(): Game | null {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return null
    const g = JSON.parse(raw) as Game
    const p = g?.puzzle
    if (p && SIZES.includes(p.size) && LEVELS.includes(p.level)) {
      const edgeCount = topology(p.size).edgeCount
      const shapeOk =
        Array.isArray(p.clues) &&
        p.clues.length === p.size * p.size &&
        p.clues.every(c => c === null || (Number.isInteger(c) && c >= 0 && c <= 3)) &&
        Array.isArray(p.solution) &&
        p.solution.length === edgeCount &&
        p.solution.every(x => x === 0 || x === 1) &&
        Array.isArray(g.marks) &&
        g.marks.length === edgeCount &&
        g.marks.every(m => m === 0 || m === 1 || m === 2) &&
        Number.isFinite(g.elapsed) &&
        Number.isInteger(g.hints) &&
        typeof g.solved === 'boolean'
      if (shapeOk) {
        const full = cluesFromSolution(p.size, p.solution)
        if (p.clues.every((c, i) => c === null || c === full[i])) return g
      }
    }
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

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const statsKey = (size: Size, level: Level) => `${size}-${level}`

export default function Slitherlink() {
  const [restored] = useState(restoreGame)
  const [game, setGame] = useState<Game | null>(restored)
  const [size, setSize] = useState<Size>(restored?.puzzle.size ?? DEFAULT_SIZE)
  const [level, setLevel] = useState<Level>(restored?.puzzle.level ?? DEFAULT_LEVEL)
  const [generating, setGenerating] = useState(!restored)
  const [history, setHistory] = useState<Mark[][]>([])
  const [stats, setStats] = useState<Stats>(loadStats)
  const [showErrors, setShowErrors] = useState(() => localStorage.getItem(ERRORS_KEY) !== '0')
  const [hinted, setHinted] = useState<{ edge: number; key: number } | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const requestPuzzle = (nextSize: Size, nextLevel: Level) => {
    workerRef.current?.terminate()
    setGenerating(true)
    const done = (puzzle: Puzzle) => {
      workerRef.current = null
      setGame(newGame(puzzle))
      setHistory([])
      setHinted(null)
      setGenerating(false)
    }
    try {
      const w = new Worker(new URL('./gen.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = w
      w.onmessage = (e: MessageEvent<Puzzle>) => {
        w.terminate()
        done(e.data)
      }
      w.onerror = () => {
        w.terminate()
        done(generatePuzzle(nextSize, nextLevel)) // Worker 起不來就在主執行緒算
      }
      w.postMessage({ size: nextSize, level: nextLevel })
    } catch {
      setTimeout(() => done(generatePuzzle(nextSize, nextLevel)), 30)
    }
  }
  const requestRef = useRef(requestPuzzle)

  // 沒有存檔時，第一次進來先出一題
  useEffect(() => {
    if (!restored) requestRef.current(DEFAULT_SIZE, DEFAULT_LEVEL)
    return () => workerRef.current?.terminate()
  }, [restored])

  const running = !!game && !game.solved && !generating
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (document.hidden) return
      setGame(g => (g && !g.solved ? { ...g, elapsed: g.elapsed + 1 } : g))
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
    localStorage.setItem(ERRORS_KEY, showErrors ? '1' : '0')
  }, [showErrors])

  useEffect(() => {
    if (!hinted) return
    const id = setTimeout(() => setHinted(null), 1500)
    return () => clearTimeout(id)
  }, [hinted])

  const hasProgress = !!game && !game.solved && game.marks.some(m => m !== 0)

  const startNew = (nextSize: Size, nextLevel: Level) => {
    if (hasProgress && !window.confirm('開新題目後，這一題的進度會消失，確定嗎？')) return
    setSize(nextSize)
    setLevel(nextLevel)
    requestPuzzle(nextSize, nextLevel)
  }

  if (!game) {
    return (
      <div className="sl-root">
        <div className="sl-loading">出題中…</div>
      </div>
    )
  }

  const current = game
  const p = current.puzzle
  const topo = topology(p.size)
  const n = p.size
  const problems = showErrors && !current.solved ? findProblems(n, p.clues, current.marks) : null
  const record = stats[statsKey(p.size, p.level)]
  const locked = current.solved || generating

  const applyMarks = (marks: Mark[], usedHint: boolean) => {
    const solved = isSolved(p.solution, marks)
    setHistory(h => [...h, current.marks])
    setGame({ ...current, marks, solved, hints: current.hints + (usedHint ? 1 : 0) })
    if (solved) {
      const key = statsKey(p.size, p.level)
      const time = current.elapsed
      setStats(prev => {
        const old = prev[key] ?? { solved: 0, best: null }
        return { ...prev, [key]: { solved: old.solved + 1, best: old.best === null ? time : Math.min(old.best, time) } }
      })
    }
  }

  // 左鍵／手指點一下：空白 → 線 → 叉 → 空白；右鍵直接切換叉
  const onEdgeDown = (e: ReactPointerEvent<SVGPolygonElement>, edge: number) => {
    if (locked) return
    e.preventDefault()
    const now = current.marks[edge]
    const next: Mark = e.button === 2 ? (now === 2 ? 0 : 2) : now === 0 ? 1 : now === 1 ? 2 : 0
    const marks = [...current.marks]
    marks[edge] = next
    applyMarks(marks, false)
  }

  const undo = () => {
    if (history.length === 0 || locked) return
    setGame({ ...current, marks: history[history.length - 1] })
    setHistory(h => h.slice(0, -1))
  }

  const clearAll = () => {
    if (locked || !window.confirm('要清除所有的線和叉嗎？')) return
    applyMarks(new Array<Mark>(topo.edgeCount).fill(0), false)
  }

  const hint = () => {
    if (locked) return
    const edge = hintEdge(p.solution, current.marks)
    if (edge === null) return
    const marks = [...current.marks]
    marks[edge] = p.solution[edge] === 1 ? 1 : 0
    applyMarks(marks, true)
    setHinted(h => ({ edge, key: (h?.key ?? 0) + 1 }))
  }

  const point = (v: number) => [v % (n + 1), Math.floor(v / (n + 1))]

  // 每條邊的點擊範圍是以它為對角線的菱形，這些菱形剛好鋪滿整個盤面，點哪裡都會命中最近的邊
  const hitPolygon = (edge: number) => {
    const [[x1, y1], [x2, y2]] = topo.edgeVerts[edge].map(point)
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dx = (y2 - y1) / 2
    const dy = (x2 - x1) / 2
    return `${x1},${y1} ${mx + dx},${my - dy} ${x2},${y2} ${mx - dx},${my + dy}`
  }

  return (
    <div className="sl-root">
      <div className="sl-settings">
        <div className="sl-seg">
          {SIZES.map(s => (
            <button
              key={s}
              className={`sl-seg-btn ${size === s ? 'active' : ''}`}
              onClick={() => s !== size && startNew(s, level)}
              disabled={generating}
            >
              {s}×{s}
            </button>
          ))}
        </div>
        <div className="sl-seg">
          {LEVELS.map(l => (
            <button
              key={l}
              className={`sl-seg-btn ${level === l ? 'active' : ''}`}
              onClick={() => l !== level && startNew(size, l)}
              disabled={generating}
            >
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>
        <button className="sl-btn sl-btn-new" onClick={() => startNew(size, level)} disabled={generating}>
          🔄 新題目
        </button>
      </div>

      <div className="sl-info">
        <span>⏱ {formatTime(current.elapsed)}</span>
        <span>
          {p.size}×{p.size} {LEVEL_LABELS[p.level]}
        </span>
        <span>💡 提示 {current.hints} 次</span>
      </div>

      <div className={`sl-status ${current.solved ? 'win' : ''}`}>
        {generating
          ? '出題中…'
          : current.solved
            ? `🎉 完成！用時 ${formatTime(current.elapsed)}${current.hints ? `，用了 ${current.hints} 次提示` : ''}`
            : '畫出一條不交叉、不分岔的迴路，數字是那一格周圍有幾條線'}
      </div>

      <div className="sl-board-wrap">
        <svg
          className={`sl-board ${current.solved ? 'solved' : ''} ${generating ? 'busy' : ''}`}
          viewBox={`-0.5 -0.5 ${n + 1} ${n + 1}`}
          onContextMenu={e => e.preventDefault()}
        >
          {topo.edgeVerts.map(([a, b], edge) => {
            const [x1, y1] = point(a)
            const [x2, y2] = point(b)
            const mark = current.marks[edge]
            const isHinted = hinted?.edge === edge
            return (
              <g key={edge}>
                <line className="sl-guide" x1={x1} y1={y1} x2={x2} y2={y2} />
                {mark === 1 && (
                  <line className={`sl-line ${isHinted ? 'hinted' : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} />
                )}
                {mark === 2 && (
                  <g className={`sl-cross ${isHinted ? 'hinted' : ''}`}>
                    <line x1={(x1 + x2) / 2 - 0.1} y1={(y1 + y2) / 2 - 0.1} x2={(x1 + x2) / 2 + 0.1} y2={(y1 + y2) / 2 + 0.1} />
                    <line x1={(x1 + x2) / 2 - 0.1} y1={(y1 + y2) / 2 + 0.1} x2={(x1 + x2) / 2 + 0.1} y2={(y1 + y2) / 2 - 0.1} />
                  </g>
                )}
                {isHinted && mark === 0 && <circle className="sl-hint-ring" cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={0.22} />}
              </g>
            )
          })}

          {p.clues.map((k, cell) => {
            if (k === null) return null
            const sides = topo.cellEdges[cell].map(e => current.marks[e])
            const lines = sides.filter(m => m === 1).length
            // 數字滿足了就變淡；0 一開始就「滿足」，所以要四邊都打叉才變淡
            const done = k > 0 ? lines === k : sides.every(m => m === 2)
            const cls = ['sl-clue', problems?.cells.has(cell) ? 'error' : done ? 'done' : '']
            return (
              <text
                key={cell}
                className={cls.filter(Boolean).join(' ')}
                x={(cell % n) + 0.5}
                y={Math.floor(cell / n) + 0.5}
              >
                {k}
              </text>
            )
          })}

          {topo.vertEdges.map((_, v) => {
            const [x, y] = point(v)
            return <circle key={v} className={`sl-dot ${problems?.verts.has(v) ? 'error' : ''}`} cx={x} cy={y} r={0.07} />
          })}

          {!locked &&
            topo.edgeVerts.map((_, edge) => (
              <polygon key={edge} className="sl-hit" points={hitPolygon(edge)} onPointerDown={e => onEdgeDown(e, edge)} />
            ))}
        </svg>
      </div>

      <div className="sl-actions">
        <button className="sl-btn" onClick={undo} disabled={locked || history.length === 0}>
          ↩️ 復原
        </button>
        <button className="sl-btn" onClick={hint} disabled={locked}>
          💡 提示
        </button>
        <button className="sl-btn sl-btn-warn" onClick={clearAll} disabled={locked}>
          🧹 清除
        </button>
        {current.solved && (
          <button className="sl-btn sl-btn-go" onClick={() => startNew(size, level)} disabled={generating}>
            ▶ 下一題
          </button>
        )}
      </div>

      <label className="sl-toggle">
        <input type="checkbox" checked={showErrors} onChange={e => setShowErrors(e.target.checked)} />
        標出錯誤（數字周圍線太多、某個點連了 3 條線或走進死路）
      </label>

      {record && (
        <div className="sl-record">
          {p.size}×{p.size} {LEVEL_LABELS[p.level]}：完成 {record.solved} 題
          {record.best !== null && `・最快 ${formatTime(record.best)}`}
        </div>
      )}

      <details className="sl-rules">
        <summary>📖 怎麼玩？</summary>
        <ul>
          <li>在點和點之間畫線，連成<b>一條</b>封閉的迴路。</li>
          <li>迴路不能交叉，也不能分岔：每個點要嘛連 2 條線，要嘛完全不連。</li>
          <li>格子裡的數字，是那一格四條邊中有幾條是線。空白的格子不限。</li>
          <li>點一下邊：畫線 → 打叉 → 清掉。電腦也可以按右鍵直接打叉。叉是用來提醒自己「這裡一定不畫線」。</li>
          <li>入門技巧：0 的四邊都打叉；角落的 3 貼著角的兩條邊一定是線；不能讓線提早圍成小圈。</li>
        </ul>
      </details>
    </div>
  )
}
