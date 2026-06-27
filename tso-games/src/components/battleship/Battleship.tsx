import { useEffect, useMemo, useRef, useState } from 'react'
import './Battleship.css'
import { BOARD_SIZE } from './types'
import type { AiMemory, Board, Coord, Orientation, Ship } from './types'
import {
  aiChooseTarget,
  allSunk,
  createEmptyShots,
  fire,
  makeFleet,
  placeShip,
  randomFleet,
  shipAt,
  shipCells,
  updateAiMemory,
} from './logic'

type Phase = 'place' | 'battle' | 'over'

const STORAGE_KEY = 'battleshipStats'
const COLS = 'ABCDEFGHIJ'.split('')

interface Stats {
  wins: number
  losses: number
}

function loadStats(): Stats {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // 忽略毀損的存檔
  }
  return { wins: 0, losses: 0 }
}

function newBoard(ships: Ship[]): Board {
  return { ships, shots: createEmptyShots() }
}

export default function Battleship() {
  const [phase, setPhase] = useState<Phase>('place')

  // 佈署階段：玩家正在佈署的艦隊與目前選擇
  const [playerShips, setPlayerShips] = useState<Ship[]>(makeFleet)
  const [orientation, setOrientation] = useState<Orientation>('h')
  const [hover, setHover] = useState<Coord | null>(null)

  // 對戰階段的兩個棋盤
  const [playerBoard, setPlayerBoard] = useState<Board | null>(null)
  const [enemyBoard, setEnemyBoard] = useState<Board | null>(null)
  const aiMemory = useRef<AiMemory>({ queue: [] })

  const [playerTurn, setPlayerTurn] = useState(true)
  const [message, setMessage] = useState('佈署你的艦隊，準備開戰！')
  const [result, setResult] = useState<'win' | 'lose' | null>(null)
  const [stats, setStats] = useState<Stats>(loadStats)

  // 目前待佈署的下一艘艦艇（cells 為空者）
  const nextShip = useMemo(() => playerShips.find(s => s.cells.length === 0) ?? null, [playerShips])
  const allPlaced = nextShip === null

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  }, [stats])

  // 預覽目前 hover 位置會佈署到的格子
  const previewCells = useMemo(() => {
    if (!nextShip || !hover) return [] as Coord[]
    return shipCells(hover, nextShip.size, orientation)
  }, [nextShip, hover, orientation])

  const previewValid = useMemo(() => {
    if (!nextShip || previewCells.length === 0) return false
    return placeShip(playerShips, nextShip.id, hover!, orientation) !== null
  }, [nextShip, previewCells, playerShips, hover, orientation])

  // ── 佈署階段操作 ──────────────────────────────────────────
  function handlePlaceClick(r: number, c: number) {
    if (!nextShip) return
    const next = placeShip(playerShips, nextShip.id, { r, c }, orientation)
    if (next) {
      setPlayerShips(next)
      setHover(null)
    } else {
      setMessage('這裡放不下，換個位置或旋轉方向。')
    }
  }

  function handleRandom() {
    setPlayerShips(randomFleet())
    setMessage('已隨機佈署，可直接開戰或重新調整。')
  }

  function handleReset() {
    setPlayerShips(makeFleet())
    setMessage('已清空，重新佈署你的艦隊。')
  }

  function startBattle() {
    if (!allPlaced) return
    setPlayerBoard(newBoard(playerShips))
    setEnemyBoard(newBoard(randomFleet()))
    aiMemory.current = { queue: [] }
    setPlayerTurn(true)
    setResult(null)
    setPhase('battle')
    setMessage('開戰！點擊敵方海域開火。')
  }

  // ── 對戰階段操作 ──────────────────────────────────────────
  function handleAttack(r: number, c: number) {
    if (phase !== 'battle' || !playerTurn || !enemyBoard) return
    if (enemyBoard.shots[r][c] !== 'none') return

    const board: Board = { ships: enemyBoard.ships, shots: enemyBoard.shots.map(row => [...row]) }
    const res = fire(board, r, c)
    setEnemyBoard({ ...board })

    if (allSunk(board.ships)) {
      setResult('win')
      setPhase('over')
      setMessage('🎉 全殲敵軍，你贏了！')
      setStats(s => ({ ...s, wins: s.wins + 1 }))
      return
    }

    setMessage(res.sunk ? `擊沉敵方${res.sunk.name}！` : res.hit ? '命中！' : '沒打中…')
    setPlayerTurn(false)
  }

  // AI 回合：玩家開火後自動執行
  useEffect(() => {
    if (phase !== 'battle' || playerTurn || !playerBoard) return
    const timer = setTimeout(() => {
      const board: Board = { ships: playerBoard.ships, shots: playerBoard.shots.map(row => [...row]) }
      const shot = aiChooseTarget(board, aiMemory.current)
      const res = fire(board, shot.r, shot.c)
      updateAiMemory(aiMemory.current, board, shot, res)
      setPlayerBoard({ ...board })

      if (allSunk(board.ships)) {
        setResult('lose')
        setPhase('over')
        setMessage('💥 你的艦隊全滅，敵軍獲勝。')
        setStats(s => ({ ...s, losses: s.losses + 1 }))
        return
      }

      setMessage(
        res.sunk
          ? `敵軍擊沉你的${res.sunk.name}！換你開火。`
          : res.hit
            ? '敵軍命中你的艦艇！換你開火。'
            : '敵軍沒打中，換你開火。',
      )
      setPlayerTurn(true)
    }, 650)
    return () => clearTimeout(timer)
  }, [phase, playerTurn, playerBoard])

  function playAgain() {
    setPlayerShips(makeFleet())
    setPlayerBoard(null)
    setEnemyBoard(null)
    setResult(null)
    setPhase('place')
    setMessage('佈署你的艦隊，準備開戰！')
  }

  // ── 渲染輔助 ──────────────────────────────────────────────
  const enemyRemaining = enemyBoard
    ? enemyBoard.ships.filter(s => s.hits < s.size).length
    : playerShips.length
  const playerRemaining = playerBoard ? playerBoard.ships.filter(s => s.hits < s.size).length : 0

  return (
    <div className="bs-game">
      <div className="bs-statusbar">
        <span className="bs-message">{message}</span>
        <span className="bs-record">
          戰績 🏆 {stats.wins} 勝 / {stats.losses} 敗
        </span>
      </div>

      {phase === 'place' && (
        <div className="bs-place">
          <div className="bs-board-wrap">
            <h3 className="bs-board-title">我方海域</h3>
            <Grid
              shots={createEmptyShots()}
              ships={playerShips}
              showShips
              preview={previewCells}
              previewValid={previewValid}
              onCellClick={handlePlaceClick}
              onCellHover={(r, c) => setHover({ r, c })}
              onLeave={() => setHover(null)}
            />
          </div>

          <div className="bs-panel">
            <h3 className="bs-panel-title">佈署艦隊</h3>
            <ul className="bs-fleet-list">
              {playerShips.map(s => (
                <li
                  key={s.id}
                  className={`bs-fleet-item ${s.cells.length > 0 ? 'placed' : ''} ${nextShip?.id === s.id ? 'active' : ''}`}
                >
                  <span className="bs-fleet-name">{s.name}</span>
                  <span className="bs-fleet-size">
                    {'▣'.repeat(s.size)} {s.size}
                  </span>
                  <span className="bs-fleet-state">{s.cells.length > 0 ? '✓' : '—'}</span>
                </li>
              ))}
            </ul>

            <div className="bs-controls">
              <button
                className="bs-btn"
                onClick={() => setOrientation(o => (o === 'h' ? 'v' : 'h'))}
              >
                旋轉方向：{orientation === 'h' ? '橫向 ↔' : '直向 ↕'}
              </button>
              <button className="bs-btn" onClick={handleRandom}>
                隨機佈署
              </button>
              <button className="bs-btn bs-btn-warn" onClick={handleReset}>
                清空重置
              </button>
              <button className="bs-btn bs-btn-go" disabled={!allPlaced} onClick={startBattle}>
                {allPlaced ? '開始戰鬥 ⚓' : `還剩 ${playerShips.filter(s => s.cells.length === 0).length} 艘待佈署`}
              </button>
            </div>
          </div>
        </div>
      )}

      {(phase === 'battle' || phase === 'over') && playerBoard && enemyBoard && (
        <div className="bs-battle">
          <div className="bs-board-wrap">
            <h3 className="bs-board-title">
              敵方海域 <span className="bs-remaining">剩 {enemyRemaining} 艘</span>
            </h3>
            <Grid
              shots={enemyBoard.shots}
              ships={enemyBoard.ships}
              showShips={phase === 'over'}
              revealSunk
              clickable={phase === 'battle' && playerTurn}
              onCellClick={handleAttack}
            />
          </div>

          <div className="bs-board-wrap">
            <h3 className="bs-board-title">
              我方海域 <span className="bs-remaining">剩 {playerRemaining} 艘</span>
            </h3>
            <Grid shots={playerBoard.shots} ships={playerBoard.ships} showShips />
          </div>
        </div>
      )}

      {phase === 'over' && (
        <div className="bs-overlay">
          <div className={`bs-result ${result}`}>
            <h2>{result === 'win' ? '🎉 勝利！' : '💥 戰敗'}</h2>
            <p>{result === 'win' ? '你殲滅了敵方整支艦隊。' : '你的艦隊全數沉沒。'}</p>
            <button className="bs-btn bs-btn-go" onClick={playAgain}>
              再玩一次
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** 計算某格在船體中的位置，回傳對應的船首/船身/船尾與方向 class */
function hullSegment(ship: Ship, r: number, c: number): string[] {
  if (ship.size < 2) return ['hull', 'hull-solo']
  const idx = ship.cells.findIndex(cell => cell.r === r && cell.c === c)
  const orient = ship.cells[0].r === ship.cells[1].r ? 'hull-h' : 'hull-v'
  const part = idx === 0 ? 'hull-bow' : idx === ship.size - 1 ? 'hull-stern' : 'hull-mid'
  return ['hull', orient, part]
}

// ── 棋盤格元件 ──────────────────────────────────────────────
interface GridProps {
  shots: Board['shots']
  ships: Ship[]
  showShips?: boolean // 是否顯示自己的艦艇（我方海域）
  revealSunk?: boolean // 擊沉的敵艦顯示船體
  clickable?: boolean
  preview?: Coord[]
  previewValid?: boolean
  onCellClick?: (r: number, c: number) => void
  onCellHover?: (r: number, c: number) => void
  onLeave?: () => void
}

function Grid({
  shots,
  ships,
  showShips = false,
  revealSunk = false,
  clickable = false,
  preview = [],
  previewValid = false,
  onCellClick,
  onCellHover,
  onLeave,
}: GridProps) {
  const previewSet = new Set(preview.map(c => `${c.r},${c.c}`))

  return (
    <div className={`bs-grid ${clickable ? 'clickable' : ''}`} onMouseLeave={onLeave}>
      <div className="bs-corner" />
      {COLS.map(col => (
        <div key={`h${col}`} className="bs-axis">
          {col}
        </div>
      ))}

      {Array.from({ length: BOARD_SIZE }, (_, r) => (
        <div key={`row${r}`} className="bs-row" style={{ display: 'contents' }}>
          <div className="bs-axis">{r + 1}</div>
          {Array.from({ length: BOARD_SIZE }, (_, c) => {
            const shot = shots[r][c]
            const ship = shipAt(ships, r, c)
            const sunk = ship !== null && ship.hits >= ship.size
            const showHull = (showShips && ship) || (revealSunk && sunk)

            const classes = ['bs-cell']
            if (showHull && ship) classes.push(...hullSegment(ship, r, c))
            if (sunk) classes.push('sunk')
            if (shot === 'hit') classes.push('hit')
            if (shot === 'miss') classes.push('miss')
            if (previewSet.has(`${r},${c}`)) classes.push(previewValid ? 'preview' : 'preview-bad')

            const interactive = clickable || (!!onCellClick && !!onCellHover)
            return (
              <button
                key={`${r}-${c}`}
                className={classes.join(' ')}
                disabled={!interactive}
                onClick={() => onCellClick?.(r, c)}
                onMouseEnter={() => onCellHover?.(r, c)}
                aria-label={`${COLS[c]}${r + 1}`}
              >
                {shot === 'hit' && <span className="bs-fire">🔥</span>}
                {shot === 'miss' && <span className="bs-splash" />}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
