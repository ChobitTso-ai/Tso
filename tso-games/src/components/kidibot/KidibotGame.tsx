import { useState, useEffect, useRef } from 'react'
import { LEVELS } from './levels'
import type { TileType, Direction, Cell } from './types'
import { PATH_CONNECTIONS } from './types'
import './KidibotGame.css'

const TILE_DISPLAY: Record<TileType, { emoji: string; label: string; bg: string }> = {
  empty:        { emoji: '',    label: '',      bg: 'transparent' },
  floor:        { emoji: '',    label: '',      bg: '#2a4a2a' },
  go:           { emoji: '🟢', label: 'GO',    bg: '#1a3a1a' },
  home:         { emoji: '🏠', label: '到家',  bg: '#1a3a1a' },
  monster:      { emoji: '👾', label: '怪獸',  bg: '#3a1a3a' },
  fire:         { emoji: '🔥', label: '火焰',  bg: '#3a2a1a' },
  trap:         { emoji: '⚠️', label: '陷阱',  bg: '#3a3a1a' },
  heart:        { emoji: '❤️', label: '愛心',  bg: '#2a1a3a' },
  star:         { emoji: '⭐', label: '星星',  bg: '#2a3a1a' },
  path_up:      { emoji: '↑',  label: '上',    bg: '#2a3a4a' },
  path_down:    { emoji: '↓',  label: '下',    bg: '#2a3a4a' },
  path_left:    { emoji: '←',  label: '左',    bg: '#2a3a4a' },
  path_right:   { emoji: '→',  label: '右',    bg: '#2a3a4a' },
  path_turn_ul: { emoji: '↰',  label: '→↑ ↓←',  bg: '#2a3a4a' },
  path_turn_ur: { emoji: '↱',  label: '←↑ ↓→',  bg: '#2a3a4a' },
  path_turn_dl: { emoji: '↲',  label: '→↓ ↑←',  bg: '#2a3a4a' },
  path_turn_dr: { emoji: '↳',  label: '←↓ ↑→',  bg: '#2a3a4a' },
}

const OBSTACLE_TILES = new Set<TileType>(['monster', 'fire', 'trap'])
const COLLECTIBLE_TILES = new Set<TileType>(['heart', 'star'])
const FIXED_SPECIAL = new Set<TileType>(['go', 'home', 'monster', 'fire', 'trap'])

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
}

function nextCell(cell: Cell, dir: Direction): Cell {
  const deltas: Record<Direction, [number, number]> = {
    up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
  }
  const [dr, dc] = deltas[dir]
  return { row: cell.row + dr, col: cell.col + dc }
}

function getExitDir(tile: TileType, entryDir: Direction): Direction | null {
  const conns = PATH_CONNECTIONS[tile]
  if (!conns) return null
  for (const [entry, exit] of conns) {
    if (entry === entryDir) return exit
  }
  return null
}

const STORAGE_KEY = 'kidibot_best_stars'

function loadBestStars(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const result = Array(LEVELS.length).fill(0)
    for (let i = 0; i < result.length; i++) result[i] = parsed[i] ?? 0
    return result
  } catch {
    return Array(LEVELS.length).fill(0)
  }
}

type GamePhase = 'edit' | 'running' | 'success' | 'fail'
interface HandTile { type: TileType; used: boolean }

export default function KidibotGame() {
  const [levelIdx, setLevelIdx] = useState(0)
  const level = LEVELS[levelIdx]

  const [placed, setPlaced] = useState<(TileType | null)[][]>(() =>
    Array.from({ length: level.size }, () => Array(level.size).fill(null))
  )
  const [hand, setHand] = useState<HandTile[]>(() =>
    level.hand.map(t => ({ type: t, used: false }))
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<GamePhase>('edit')
  const [robotPos, setRobotPos] = useState<Cell | null>(null)
  const [message, setMessage] = useState('')
  const [starsEarned, setStarsEarned] = useState(0)
  const [bestStars, setBestStars] = useState<number[]>(loadBestStars)

  const stepRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cellSize = level.size <= 4 ? 72 : level.size <= 5 ? 64 : level.size <= 6 ? 56 : 48

  const allDone = bestStars.every(s => s > 0)

  useEffect(() => {
    setPlaced(Array.from({ length: level.size }, () => Array(level.size).fill(null)))
    setHand(level.hand.map(t => ({ type: t, used: false })))
    setSelected(null)
    setPhase('edit')
    setRobotPos(null)
    setMessage('')
    setStarsEarned(0)
  }, [levelIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (stepRef.current) clearTimeout(stepRef.current) }, [])

  function findStart(): Cell {
    for (let r = 0; r < level.size; r++)
      for (let c = 0; c < level.size; c++)
        if (level.grid[r][c] === 'go') return { row: r, col: c }
    return { row: 0, col: 0 }
  }

  function canPlaceOn(row: number, col: number): boolean {
    const fixed = level.grid[row][col]
    return fixed !== 'empty' && !FIXED_SPECIAL.has(fixed)
  }

  function handleCellClick(row: number, col: number) {
    if (phase !== 'edit') return

    if (selected !== null) {
      if (!canPlaceOn(row, col)) return
      const newTile = hand[selected].type
      const existingTile = placed[row][col]

      if (existingTile === newTile) {
        // toggling same tile off — remove from grid AND return it to hand
        setPlaced(prev => {
          const next = prev.map(r => [...r])
          next[row][col] = null
          return next
        })
        setHand(prev => {
          const next = prev.map(h => ({ ...h }))
          const idx = next.findIndex(h => h.type === existingTile && h.used)
          if (idx >= 0) next[idx].used = false
          return next
        })
        setSelected(null)
        return
      }

      // place new tile; if replacing different tile, return old one to hand
      setPlaced(prev => {
        const next = prev.map(r => [...r])
        next[row][col] = newTile
        return next
      })
      setHand(prev => {
        const next = prev.map(h => ({ ...h }))
        if (existingTile) {
          const oldIdx = next.findIndex(h => h.type === existingTile && h.used)
          if (oldIdx >= 0) next[oldIdx].used = false
        }
        next[selected].used = true
        return next
      })
      setSelected(null)
      return
    }

    // no tile selected — pick up placed tile on this cell
    if (placed[row][col]) {
      const tile = placed[row][col]!
      setPlaced(prev => {
        const next = prev.map(r => [...r])
        next[row][col] = null
        return next
      })
      setHand(prev => {
        const next = prev.map(h => ({ ...h }))
        const idx = next.findIndex(h => h.type === tile && h.used)
        if (idx >= 0) next[idx].used = false
        return next
      })
    }
  }

  function handleHandClick(idx: number) {
    if (phase !== 'edit') return
    if (hand[idx].used) return
    setSelected(prev => prev === idx ? null : idx)
  }

  function runSimulation() {
    if (phase !== 'edit') return

    const placedSnapshot = placed.map(r => [...r])

    setPhase('running')
    setMessage('')

    const start = findStart()
    setRobotPos(start)

    let pos = start
    let dir = level.startDir
    let collected = 0
    const totalCollectible = level.grid.flat().filter(t => COLLECTIBLE_TILES.has(t)).length
    const visitedCollect = new Set<string>()
    let steps = 0
    const maxSteps = level.size * level.size * 3

    function step() {
      steps++
      if (steps > maxSteps) {
        setPhase('fail')
        setMessage('機器人迷路了！檢查路徑是否形成完整的回路。')
        return
      }

      const nb = nextCell(pos, dir)

      if (nb.row < 0 || nb.row >= level.size || nb.col < 0 || nb.col >= level.size) {
        setPhase('fail')
        setMessage('機器人走出地圖了！')
        return
      }

      const fixedTile = level.grid[nb.row][nb.col]

      if (fixedTile === 'empty') {
        setPhase('fail')
        setMessage('機器人走出地圖了！')
        return
      }

      if (OBSTACLE_TILES.has(fixedTile)) {
        setRobotPos(nb)
        setTimeout(() => {
          setPhase('fail')
          setMessage(`踩到${TILE_DISPLAY[fixedTile].label}了！重新排列路徑吧。`)
        }, 300)
        return
      }

      const key = `${nb.row},${nb.col}`
      if (COLLECTIBLE_TILES.has(fixedTile) && !visitedCollect.has(key)) {
        visitedCollect.add(key)
        collected++
      }

      if (fixedTile === 'home') {
        setRobotPos(nb)
        const stars = totalCollectible === 0 ? 3
          : collected === totalCollectible ? 3
          : collected > 0 ? 2 : 1
        setStarsEarned(stars)
        // save best stars to localStorage
        setBestStars(prev => {
          const next = [...prev]
          if (stars > (next[levelIdx] ?? 0)) {
            next[levelIdx] = stars
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* noop */ }
          }
          return next
        })
        setTimeout(() => {
          setPhase('success')
          setMessage(
            totalCollectible === 0 ? '成功回家了！🎉'
            : collected === totalCollectible ? '完美！全部收集並回家了！🎉'
            : `回家了！收集了 ${collected}/${totalCollectible} 個道具。`
          )
        }, 300)
        return
      }

      const pathTile = placedSnapshot[nb.row][nb.col] ?? (
        PATH_CONNECTIONS[fixedTile] ? fixedTile : null
      )

      if (!pathTile) {
        setRobotPos(nb)
        setTimeout(() => {
          setPhase('fail')
          setMessage('這格沒有路徑片！確認每個空格都放了正確的磁力片。')
        }, 300)
        return
      }

      const entryDir = OPPOSITE[dir]
      const exitDir = getExitDir(pathTile, entryDir)

      if (exitDir === null) {
        setRobotPos(nb)
        setTimeout(() => {
          setPhase('fail')
          setMessage('路徑方向錯了！確認磁力片的方向可以讓機器人通過。')
        }, 300)
        return
      }

      pos = nb
      dir = exitDir
      setRobotPos({ ...pos })
      stepRef.current = setTimeout(step, 450)
    }

    stepRef.current = setTimeout(step, 400)
  }

  function reset() {
    if (stepRef.current) clearTimeout(stepRef.current)
    setPlaced(Array.from({ length: level.size }, () => Array(level.size).fill(null)))
    setHand(level.hand.map(t => ({ type: t, used: false })))
    setSelected(null)
    setPhase('edit')
    setRobotPos(null)
    setMessage('')
    setStarsEarned(0)
  }

  function starClass(idx: number) {
    const s = bestStars[idx]
    if (s === 3) return 'done done-3'
    if (s === 2) return 'done done-2'
    if (s === 1) return 'done done-1'
    return ''
  }

  return (
    <div className="kb-game">
      {/* Level selector */}
      <div className="kb-level-bar">
        {LEVELS.map((lv, i) => (
          <button
            key={lv.id}
            className={`kb-level-btn ${i === levelIdx ? 'active' : ''} ${starClass(i)}`}
            onClick={() => { if (stepRef.current) clearTimeout(stepRef.current); setLevelIdx(i) }}
            title={lv.name}
          >
            {bestStars[i] ? '★' : lv.id}
          </button>
        ))}
      </div>

      {/* All-done banner */}
      {allDone && (
        <div className="kb-all-done">
          🏆 恭喜！全部 {LEVELS.length} 關完成！你是程式思維大師！
        </div>
      )}

      {/* Title */}
      <div className="kb-title-row">
        <h2 className="kb-level-name">{level.name}</h2>
        {phase === 'success' && (
          <span className="kb-stars">
            {[0, 1, 2].map(i => (
              <span key={i} className={i < starsEarned ? 'star-lit' : 'star-dim'}>★</span>
            ))}
          </span>
        )}
      </div>

      <div className="kb-main">
        {/* Grid */}
        <div className="kb-grid-wrap">
          <div
            className="kb-grid"
            style={{ gridTemplateColumns: `repeat(${level.size}, ${cellSize}px)` }}
          >
            {level.grid.map((row, r) =>
              row.map((fixedTile, c) => {
                if (fixedTile === 'empty') {
                  return <div key={`${r}-${c}`} className="kb-cell kb-cell-empty" style={{ width: cellSize, height: cellSize }} />
                }

                const placedTile = placed[r][c]
                const isRobot = robotPos?.row === r && robotPos?.col === c
                const isFixed = FIXED_SPECIAL.has(fixedTile) || COLLECTIBLE_TILES.has(fixedTile)
                const isPlaceable = canPlaceOn(r, c)
                const showPlacedOverlay = placedTile && COLLECTIBLE_TILES.has(fixedTile)

                const displayTile = placedTile && !COLLECTIBLE_TILES.has(fixedTile)
                  ? placedTile
                  : fixedTile

                return (
                  <div
                    key={`${r}-${c}`}
                    className={[
                      'kb-cell',
                      isFixed ? 'kb-cell-fixed' : 'kb-cell-floor',
                      isPlaceable && selected !== null ? 'kb-cell-selectable' : '',
                      selected !== null && !isPlaceable ? 'kb-cell-blocked' : '',
                    ].join(' ')}
                    style={{ background: TILE_DISPLAY[displayTile].bg, width: cellSize, height: cellSize }}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {isRobot
                      ? <span className="kb-robot">🤖</span>
                      : (
                        <>
                          <span className="kb-tile-emoji">
                            {TILE_DISPLAY[displayTile].emoji}
                          </span>
                          {showPlacedOverlay && (
                            <span className="kb-overlay-path">{TILE_DISPLAY[placedTile!].emoji}</span>
                          )}
                          {(placedTile || isFixed) && (
                            <span className="kb-tile-label">
                              {placedTile && !showPlacedOverlay
                                ? TILE_DISPLAY[placedTile].label
                                : TILE_DISPLAY[fixedTile].label}
                            </span>
                          )}
                        </>
                      )
                    }
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Panel */}
        <div className="kb-panel">
          <div className="kb-hint">💡 {level.hint}</div>
          <div className="kb-start-dir">
            機器人出發方向：{
              { right: '→ 右', left: '← 左', up: '↑ 上', down: '↓ 下' }[level.startDir]
            }
          </div>

          <div className="kb-hand-title">磁力片手牌</div>
          <div className="kb-hand">
            {hand.map((h, i) => (
              <button
                key={i}
                className={`kb-hand-tile ${selected === i ? 'selected' : ''} ${h.used ? 'used' : ''}`}
                onClick={() => handleHandClick(i)}
                disabled={phase !== 'edit' || h.used}
              >
                <span className="kb-hand-emoji">{TILE_DISPLAY[h.type].emoji}</span>
                <span className="kb-hand-label">{TILE_DISPLAY[h.type].label}</span>
              </button>
            ))}
          </div>

          <div className="kb-actions">
            {phase === 'edit' && (
              <>
                <button className="kb-btn kb-btn-go" onClick={runSimulation}>▶ GO！</button>
                <button className="kb-btn kb-btn-reset" onClick={reset}>↺ 重置</button>
              </>
            )}
            {phase === 'running' && (
              <button className="kb-btn kb-btn-stop" onClick={reset}>■ 停止</button>
            )}
            {(phase === 'success' || phase === 'fail') && (
              <>
                <button className="kb-btn kb-btn-reset" onClick={reset}>↺ 再試一次</button>
                {phase === 'success' && levelIdx < LEVELS.length - 1 && (
                  <button
                    className="kb-btn kb-btn-next"
                    onClick={() => { if (stepRef.current) clearTimeout(stepRef.current); setLevelIdx(l => l + 1) }}
                  >
                    下一關 →
                  </button>
                )}
              </>
            )}
          </div>

          {message && (
            <div className={`kb-message ${phase === 'success' ? 'success' : phase === 'fail' ? 'fail' : ''}`}>
              {message}
            </div>
          )}

          {/* Best stars for current level */}
          {bestStars[levelIdx] > 0 && phase === 'edit' && (
            <div className="kb-best">
              最佳成績：{'★'.repeat(bestStars[levelIdx])}{'☆'.repeat(3 - bestStars[levelIdx])}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
