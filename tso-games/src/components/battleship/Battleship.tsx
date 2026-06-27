import { useEffect, useMemo, useRef, useState } from 'react'
import './Battleship.css'
import { BOARD_SIZE } from './types'
import type { AiMemory, Board, Coord, Difficulty, Orientation, Ship } from './types'
import {
  aiChooseTarget,
  allSunk,
  cloneBoard,
  createEmptyShots,
  fire,
  makeFleet,
  placeShip,
  randomFleet,
  shipCells,
  updateAiMemory,
} from './logic'

type Mode = 'ai' | 'pvp'
type Phase = 'setup' | 'place' | 'handoff' | 'battle' | 'over'

const STORAGE_KEY = 'battleshipStats'
const COLS = 'ABCDEFGHIJ'.split('')

/** 各艦的俯視圖（水平與旋轉後的垂直版），放在 public/battleship/ */
const SHIP_IDS = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'] as const
const SHIP_IMG: Record<string, { h: string; v: string }> = Object.fromEntries(
  SHIP_IDS.map(id => [
    id,
    {
      h: `${import.meta.env.BASE_URL}battleship/${id}.png`,
      v: `${import.meta.env.BASE_URL}battleship/${id}_v.png`,
    },
  ]),
)

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: '😀 簡單',
  normal: '🙂 普通',
  hard: '😈 困難',
}
const DIFF_DESC: Record<Difficulty, string> = {
  easy: 'AI 隨機亂打，新手友善',
  normal: 'AI 會追擊命中的船艦',
  hard: 'AI 沿線精準追擊，火力全開',
}

interface Stats {
  wins: number
  losses: number
}

/** 「上一步」快照：保存一個回合開始前的完整狀態 */
interface Snapshot {
  boards: [Board, Board]
  turn: 0 | 1
  aiMemory: AiMemory
  message: string
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

function emptyMemory(): AiMemory {
  return { queue: [], hits: [] }
}

export default function Battleship() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<Mode>('ai')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  // 兩位玩家各自的海域（佈署階段逐一填入）。board[i] = 玩家 i 的船，由對手攻擊
  const [boards, setBoards] = useState<[Board | null, Board | null]>([null, null])

  // 佈署階段
  const [placingPlayer, setPlacingPlayer] = useState<0 | 1>(0)
  const [draftShips, setDraftShips] = useState<Ship[]>(makeFleet)
  const [orientation, setOrientation] = useState<Orientation>('h')
  const [hover, setHover] = useState<Coord | null>(null)

  // 對戰階段
  const [turn, setTurn] = useState<0 | 1>(0) // 輪到誰開火
  const aiMemory = useRef<AiMemory>(emptyMemory())
  const [history, setHistory] = useState<Snapshot[]>([])
  const [pendingEnd, setPendingEnd] = useState(false) // PvP：本回合已開火，等待「結束回合」
  const [sinkFx, setSinkFx] = useState<{ board: 0 | 1; r: number; c: number; key: number } | null>(
    null,
  ) // 擊沉爆炸特效的位置
  const [handoff, setHandoff] = useState<{ player: 0 | 1; to: 'place' | 'battle'; label: string } | null>(
    null,
  )

  const [message, setMessage] = useState('選擇對戰模式，準備開戰！')
  const [winner, setWinner] = useState<0 | 1 | null>(null)
  const [stats, setStats] = useState<Stats>(loadStats)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  }, [stats])

  const playerName = (i: 0 | 1) =>
    mode === 'ai' ? (i === 0 ? '你' : 'AI') : i === 0 ? '玩家 1' : '玩家 2'

  // 觀看視角：AI 模式固定為玩家 0；PvP 為當前出手的玩家
  const viewer: 0 | 1 = mode === 'ai' ? 0 : turn
  const enemy: 0 | 1 = viewer === 0 ? 1 : 0

  // ── 佈署相關 ────────────────────────────────────────────────
  const nextShip = useMemo(() => draftShips.find(s => s.cells.length === 0) ?? null, [draftShips])
  const allPlaced = nextShip === null

  const previewCells = useMemo(() => {
    if (!nextShip || !hover) return [] as Coord[]
    return shipCells(hover, nextShip.size, orientation)
  }, [nextShip, hover, orientation])

  const previewValid = useMemo(() => {
    if (!nextShip || previewCells.length === 0) return false
    return placeShip(draftShips, nextShip.id, hover!, orientation) !== null
  }, [nextShip, previewCells, draftShips, hover, orientation])

  function handlePlaceClick(r: number, c: number) {
    if (!nextShip) return
    const next = placeShip(draftShips, nextShip.id, { r, c }, orientation)
    if (next) {
      setDraftShips(next)
      setHover(null)
    } else {
      setMessage('這裡放不下，換個位置或旋轉方向。')
    }
  }

  function startSetup() {
    setBoards([null, null])
    setPlacingPlayer(0)
    setDraftShips(makeFleet())
    setOrientation('h')
    setHover(null)
    setWinner(null)
    setHistory([])
    setPhase('place')
    setMessage(mode === 'ai' ? '佈署你的艦隊，準備迎戰 AI！' : '玩家 1：佈署你的艦隊')
  }

  function confirmPlacement() {
    if (!allPlaced) return
    const committed = newBoard(draftShips)

    if (mode === 'ai') {
      setBoards([committed, newBoard(randomFleet())])
      aiMemory.current = emptyMemory()
      setTurn(0)
      setHistory([])
      setPhase('battle')
      setMessage('開戰！點擊敵方海域開火。')
      return
    }

    // PvP：玩家 0 佈署完交給玩家 1，玩家 1 佈署完進入對戰
    if (placingPlayer === 0) {
      setBoards([committed, null])
      setHandoff({ player: 1, to: 'place', label: '輪到玩家 2 佈署艦隊' })
      setPhase('handoff')
    } else {
      setBoards(b => [b[0], committed])
      setTurn(0)
      setHistory([])
      setHandoff({ player: 0, to: 'battle', label: '佈署完成，由玩家 1 先攻' })
      setPhase('handoff')
    }
  }

  function resolveHandoff() {
    if (!handoff) return
    const { player, to } = handoff
    setHandoff(null)
    if (to === 'place') {
      setPlacingPlayer(player)
      setDraftShips(makeFleet())
      setOrientation('h')
      setHover(null)
      setPhase('place')
      setMessage(`${playerName(player)}：佈署你的艦隊`)
    } else {
      setTurn(player)
      setPhase('battle')
      setMessage(`${playerName(player)}：點擊對手海域開火`)
    }
  }

  // ── 對戰：開火 ──────────────────────────────────────────────
  function pushHistory() {
    if (!boards[0] || !boards[1]) return
    setHistory(h => [
      ...h,
      {
        boards: [cloneBoard(boards[0]!), cloneBoard(boards[1]!)],
        turn,
        aiMemory: {
          queue: aiMemory.current.queue.map(c => ({ ...c })),
          hits: aiMemory.current.hits.map(c => ({ ...c })),
        },
        message,
      },
    ])
  }

  function finishGame(win: 0 | 1) {
    setWinner(win)
    setPhase('over')
    if (mode === 'ai') {
      setMessage(win === 0 ? '🎉 全殲敵軍，你贏了！' : '💥 你的艦隊全滅，AI 獲勝。')
      setStats(s => (win === 0 ? { ...s, wins: s.wins + 1 } : { ...s, losses: s.losses + 1 }))
    } else {
      setMessage(`🎉 ${playerName(win)} 獲勝！`)
    }
  }

  function handleAttack(r: number, c: number) {
    if (phase !== 'battle') return
    if (mode === 'ai' && turn !== 0) return // AI 回合不可點
    if (mode === 'pvp' && pendingEnd) return // 本回合已開火
    const target = (1 - turn) as 0 | 1
    const tb = boards[target]
    if (!tb || tb.shots[r][c] !== 'none') return

    pushHistory()
    const nb = cloneBoard(tb)
    const res = fire(nb, r, c)
    setBoards(b => (target === 0 ? [nb, b[1]] : [b[0], nb]))
    if (res.sunk) {
      const ctr = res.sunk.cells[Math.floor(res.sunk.size / 2)]
      setSinkFx({ board: target, r: ctr.r, c: ctr.c, key: Date.now() })
    }

    if (allSunk(nb.ships)) {
      finishGame(turn)
      return
    }

    setMessage(res.sunk ? `擊沉對方${res.sunk.name}！` : res.hit ? '命中！' : '沒打中…')
    if (mode === 'ai') {
      setTurn(1) // 觸發 AI 回合
    } else {
      setPendingEnd(true) // 等待玩家按「結束回合」
    }
  }

  // AI 回合
  useEffect(() => {
    if (phase !== 'battle' || mode !== 'ai' || turn !== 1) return
    const myBoard = boards[0]
    if (!myBoard) return
    const timer = setTimeout(() => {
      const nb = cloneBoard(myBoard)
      const shot = aiChooseTarget(nb, aiMemory.current, difficulty)
      const res = fire(nb, shot.r, shot.c)
      updateAiMemory(aiMemory.current, nb, shot, res, difficulty)
      setBoards(b => [nb, b[1]])
      if (res.sunk) {
        const ctr = res.sunk.cells[Math.floor(res.sunk.size / 2)]
        setSinkFx({ board: 0, r: ctr.r, c: ctr.c, key: Date.now() })
      }

      if (allSunk(nb.ships)) {
        finishGame(1)
        return
      }
      setMessage(
        res.sunk
          ? `AI 擊沉你的${res.sunk.name}！換你開火。`
          : res.hit
            ? 'AI 命中你的艦艇！換你開火。'
            : 'AI 沒打中，換你開火。',
      )
      setTurn(0)
    }, 620)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, turn, boards])

  // 爆炸特效播完後自動清除
  useEffect(() => {
    if (!sinkFx) return
    const t = setTimeout(() => setSinkFx(null), 1000)
    return () => clearTimeout(t)
  }, [sinkFx])

  function endTurn() {
    const next = (1 - turn) as 0 | 1
    setPendingEnd(false)
    setHistory([]) // 交接後不可悔棋，避免偷看
    setTurn(next)
    setHandoff({ player: next, to: 'battle', label: `輪到 ${playerName(next)} 攻擊` })
    setPhase('handoff')
  }

  function handleUndo() {
    if (history.length === 0) return
    const snap = history[history.length - 1]
    setBoards([snap.boards[0], snap.boards[1]])
    setTurn(snap.turn)
    aiMemory.current = snap.aiMemory
    setHistory(history.slice(0, -1))
    setPendingEnd(false)
    setWinner(null)
    setSinkFx(null)
    setPhase('battle')
    setMessage('已回到上一步。')
  }

  function playAgain() {
    startSetup()
  }

  function backToSetup() {
    setPhase('setup')
    setMessage('選擇對戰模式，準備開戰！')
  }

  const canUndo =
    phase === 'battle' && history.length > 0 && (mode === 'ai' ? turn === 0 : pendingEnd)

  // ── 渲染 ────────────────────────────────────────────────────
  const enemyRemaining = boards[enemy]?.ships.filter(s => s.hits < s.size).length ?? 0
  const ownRemaining = boards[viewer]?.ships.filter(s => s.hits < s.size).length ?? 0

  return (
    <div className="bs-game">
      <div className="bs-statusbar">
        <span className="bs-message">{message}</span>
        {mode === 'ai' ? (
          <span className="bs-record">
            戰績 🏆 {stats.wins} 勝 / {stats.losses} 敗
          </span>
        ) : (
          <span className="bs-record">👥 雙人同機</span>
        )}
      </div>

      {/* 設定畫面 */}
      {phase === 'setup' && (
        <div className="bs-setup">
          <h3 className="bs-setup-title">選擇對戰模式</h3>
          <div className="bs-option-row">
            <button
              className={`bs-option ${mode === 'ai' ? 'active' : ''}`}
              onClick={() => setMode('ai')}
            >
              <span className="bs-option-icon">🤖</span>
              <span className="bs-option-name">單人 對 AI</span>
              <span className="bs-option-sub">挑戰電腦對手</span>
            </button>
            <button
              className={`bs-option ${mode === 'pvp' ? 'active' : ''}`}
              onClick={() => setMode('pvp')}
            >
              <span className="bs-option-icon">👥</span>
              <span className="bs-option-name">雙人同機</span>
              <span className="bs-option-sub">兩人輪流玩一台</span>
            </button>
          </div>

          {mode === 'ai' && (
            <>
              <h3 className="bs-setup-title">AI 難度</h3>
              <div className="bs-option-row">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    className={`bs-option ${difficulty === d ? 'active' : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    <span className="bs-option-name">{DIFF_LABEL[d]}</span>
                    <span className="bs-option-sub">{DIFF_DESC[d]}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'pvp' && (
            <p className="bs-hint">
              兩位玩家輪流使用同一台裝置：先各自佈署艦隊，再輪流攻擊。每次換手都有交接畫面，避免偷看對方佈署。
            </p>
          )}

          <button className="bs-btn bs-btn-go bs-setup-go" onClick={startSetup}>
            開始佈署 ⚓
          </button>
        </div>
      )}

      {/* 交接畫面（PvP 防偷看） */}
      {phase === 'handoff' && handoff && (
        <div className="bs-handoff">
          <div className="bs-handoff-card">
            <div className="bs-handoff-icon">📵</div>
            <h2>請將裝置交給 {playerName(handoff.player)}</h2>
            <p className="bs-handoff-label">{handoff.label}</p>
            <p className="bs-handoff-warn">對方準備好之前，請勿偷看畫面 🙈</p>
            <button className="bs-btn bs-btn-go" onClick={resolveHandoff}>
              我準備好了 →
            </button>
          </div>
        </div>
      )}

      {/* 佈署畫面 */}
      {phase === 'place' && (
        <div className="bs-place">
          <div className="bs-board-wrap">
            <h3 className="bs-board-title">
              {mode === 'pvp' ? `${playerName(placingPlayer)} 的海域` : '我方海域'}
            </h3>
            <Grid
              shots={createEmptyShots()}
              ships={draftShips}
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
              {draftShips.map(s => (
                <li
                  key={s.id}
                  className={`bs-fleet-item ${s.cells.length > 0 ? 'placed' : ''} ${nextShip?.id === s.id ? 'active' : ''}`}
                >
                  <img className="bs-fleet-thumb" src={SHIP_IMG[s.id].h} alt="" />
                  <span className="bs-fleet-name">{s.name}</span>
                  <span className="bs-fleet-size">{s.size} 格</span>
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
              <button className="bs-btn" onClick={() => setDraftShips(randomFleet())}>
                隨機佈署
              </button>
              <button className="bs-btn bs-btn-warn" onClick={() => setDraftShips(makeFleet())}>
                清空重置
              </button>
              <button className="bs-btn bs-btn-go" disabled={!allPlaced} onClick={confirmPlacement}>
                {allPlaced
                  ? mode === 'pvp'
                    ? '完成佈署 →'
                    : '開始戰鬥 ⚓'
                  : `還剩 ${draftShips.filter(s => s.cells.length === 0).length} 艘待佈署`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 對戰畫面 */}
      {(phase === 'battle' || phase === 'over') && boards[viewer] && boards[enemy] && (
        <>
          <div className="bs-toolbar">
            {mode === 'ai' && <span className="bs-tool-tag">難度：{DIFF_LABEL[difficulty]}</span>}
            <span className="bs-tool-tag">
              {phase === 'over'
                ? '對戰結束'
                : mode === 'ai'
                  ? turn === 0
                    ? '🎯 換你開火'
                    : '🤖 AI 思考中…'
                  : `🎯 ${playerName(turn)} 開火中`}
            </span>
            <button className="bs-btn bs-tool-btn" disabled={!canUndo} onClick={handleUndo}>
              ↩ 上一步
            </button>
            {mode === 'pvp' && pendingEnd && (
              <button className="bs-btn bs-btn-go bs-tool-btn" onClick={endTurn}>
                結束回合 →
              </button>
            )}
          </div>

          <div className="bs-battle">
            <div className="bs-board-wrap">
              <h3 className="bs-board-title">
                {mode === 'ai' ? '敵方海域' : `${playerName(enemy)} 海域`}
                <span className="bs-remaining">剩 {enemyRemaining} 艘</span>
              </h3>
              <Grid
                shots={boards[enemy]!.shots}
                ships={boards[enemy]!.ships}
                showShips={phase === 'over'}
                revealSunk
                clickable={
                  phase === 'battle' && (mode === 'ai' ? turn === 0 : !pendingEnd)
                }
                onCellClick={handleAttack}
                burst={sinkFx?.board === enemy ? sinkFx : undefined}
              />
            </div>

            <div className="bs-board-wrap">
              <h3 className="bs-board-title">
                {mode === 'ai' ? '我方海域' : `${playerName(viewer)} 海域`}
                <span className="bs-remaining">剩 {ownRemaining} 艘</span>
              </h3>
              <Grid
                shots={boards[viewer]!.shots}
                ships={boards[viewer]!.ships}
                showShips
                burst={sinkFx?.board === viewer ? sinkFx : undefined}
              />
            </div>
          </div>
        </>
      )}

      {/* 結算 */}
      {phase === 'over' && winner !== null && (
        <div className="bs-overlay">
          <div className={`bs-result ${mode === 'ai' ? (winner === 0 ? 'win' : 'lose') : 'win'}`}>
            <h2>
              {mode === 'ai'
                ? winner === 0
                  ? '🎉 勝利！'
                  : '💥 戰敗'
                : `🎉 ${playerName(winner)} 獲勝！`}
            </h2>
            <p>
              {mode === 'ai'
                ? winner === 0
                  ? '你殲滅了敵方整支艦隊。'
                  : '你的艦隊全數沉沒。'
                : `${playerName(winner)} 擊沉了對手所有戰艦。`}
            </p>
            <div className="bs-result-btns">
              <button className="bs-btn bs-btn-go" onClick={playAgain}>
                再玩一次
              </button>
              <button className="bs-btn" onClick={backToSetup}>
                改變模式
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
  burst?: { r: number; c: number; key: number } // 擊沉爆炸特效
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
  burst,
}: GridProps) {
  const previewSet = new Set(preview.map(c => `${c.r},${c.c}`))

  // 要繪製的船：我方海域顯示全部；敵方僅顯示已擊沉，對戰結束時全顯示
  const drawnShips = ships.filter(
    s => s.cells.length > 0 && (showShips || (revealSunk && s.hits >= s.size)),
  )

  return (
    <div className={`bs-grid ${clickable ? 'clickable' : ''}`} onMouseLeave={onLeave}>
      {/* 所有格子皆指定座標，避免覆蓋物干擾自動排列導致錯位 */}
      <div className="bs-corner" style={{ gridColumn: 1, gridRow: 1 }} />
      {COLS.map((col, ci) => (
        <div key={`h${col}`} className="bs-axis" style={{ gridColumn: ci + 2, gridRow: 1 }}>
          {col}
        </div>
      ))}

      {Array.from({ length: BOARD_SIZE }, (_, r) => (
        <div key={`ax${r}`} className="bs-axis" style={{ gridColumn: 1, gridRow: r + 2 }}>
          {r + 1}
        </div>
      ))}

      {Array.from({ length: BOARD_SIZE }, (_, r) =>
        Array.from({ length: BOARD_SIZE }, (_, c) => {
          const shot = shots[r][c]
          const classes = ['bs-cell']
          if (shot === 'hit') classes.push('hit')
          if (shot === 'miss') classes.push('miss')
          if (previewSet.has(`${r},${c}`)) classes.push(previewValid ? 'preview' : 'preview-bad')

          const interactive = clickable || (!!onCellClick && !!onCellHover)
          return (
            <button
              key={`${r}-${c}`}
              className={classes.join(' ')}
              style={{ gridColumn: c + 2, gridRow: r + 2 }}
              disabled={!interactive}
              onClick={() => onCellClick?.(r, c)}
              onMouseEnter={() => onCellHover?.(r, c)}
              aria-label={`${COLS[c]}${r + 1}`}
            />
          )
        }),
      )}

      {/* 船艦俯視圖：橫跨佔據的格子漂浮於水面，點擊穿透至底下格子 */}
      {drawnShips.map(s => {
        const horizontal = s.size < 2 || s.cells[0].r === s.cells[1].r
        const minR = Math.min(...s.cells.map(p => p.r))
        const minC = Math.min(...s.cells.map(p => p.c))
        return (
          <img
            key={s.id}
            className={`bs-ship-img ${s.hits >= s.size ? 'sunk' : ''}`}
            src={horizontal ? SHIP_IMG[s.id].h : SHIP_IMG[s.id].v}
            alt={s.name}
            style={{
              gridColumn: `${minC + 2} / span ${horizontal ? s.size : 1}`,
              gridRow: `${minR + 2} / span ${horizontal ? 1 : s.size}`,
            }}
          />
        )
      })}

      {/* 命中火焰 / 落空水花，疊在最上層 */}
      {shots.flatMap((row, r) =>
        row.map((st, c) =>
          st === 'none' ? null : (
            <span
              key={`m${r}-${c}`}
              className="bs-marker"
              style={{ gridColumn: `${c + 2}`, gridRow: `${r + 2}` }}
            >
              {st === 'hit' ? <span className="bs-fire">🔥</span> : <span className="bs-splash" />}
            </span>
          ),
        ),
      )}

      {/* 擊沉爆炸特效 */}
      {burst && (
        <span
          key={burst.key}
          className="bs-burst"
          style={{ gridColumn: burst.c + 2, gridRow: burst.r + 2 }}
        >
          <span className="bs-burst-ring" />
          <span className="bs-burst-emoji">💥</span>
        </span>
      )}
    </div>
  )
}
