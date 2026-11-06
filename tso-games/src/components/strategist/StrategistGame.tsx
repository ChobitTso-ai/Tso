import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  STEP, autoDeploy, canDeploy, castTactic, createBattle, defaultStance, parseMap, retreat, runToEnd, starsFor, stepBattle,
  sumTroops, survivalRatio,
} from './battle'
import {
  COUNTER, COUNTER_TIPS, LEVELS, TACTICS, UNIT_STATS, bannerChar, maxTroopsOf, shortName, squadName,
} from './data'
import { VIEW_H, VIEW_W, createFx, createTerrainLayer, pushEvents, render, updateFx } from './render'
import type { Fx } from './render'
import type { Battle, EndReason, Phase, Placement, Progress, SquadSpec, Stance, TacticId, UnitType } from './types'
import { MAP_H, MAP_W } from './types'
import './StrategistGame.css'

const STORAGE_KEY = 'strategist_progress'
const SPEEDS = [1, 2, 4]
const UNIT_TYPES = Object.keys(UNIT_STATS) as UnitType[]

type Selection = { kind: 'roster'; idx: number } | { kind: 'enemy'; idx: number } | null

interface ResultInfo {
  won: boolean
  reason: EndReason
  stars: number
  ratio: number
  time: number
  newBest: boolean
}

const REASON_TEXT: Record<'won' | 'lost', Partial<Record<EndReason, string>>> = {
  won: {
    commander: '敵方主帥潰散，敵軍全面撤退！',
    wiped: '敵軍全數潰散！',
    timeout: '時間到，我軍保存的兵力比較多，判定勝利！',
  },
  lost: {
    commander: '我方主帥潰散，全軍只好撤退……',
    wiped: '我軍全數潰散……',
    timeout: '時間到，敵軍保存的兵力比較多……',
    retreat: '軍師下令撤退，保存實力再戰。',
  },
}

function loadProgress(): Progress {
  const fallback: Progress = { stars: LEVELS.map(() => 0) }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return fallback
    const p = JSON.parse(saved) as Partial<Progress>
    if (!Array.isArray(p.stars)) {
      localStorage.removeItem(STORAGE_KEY)
      return fallback
    }
    return {
      stars: LEVELS.map((_, i) => {
        const v = p.stars?.[i]
        return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3 ? v : 0
      }),
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return fallback
  }
}

const isUnlocked = (stars: number[], i: number) => i === 0 || stars[i - 1] > 0

const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

const strongVs = (t: UnitType) => UNIT_TYPES.filter(o => (COUNTER[t][o] ?? 1) > 1).map(o => UNIT_STATS[o].name)
const weakVs = (t: UnitType) => UNIT_TYPES.filter(o => (COUNTER[o][t] ?? 1) > 1).map(o => UNIT_STATS[o].name)

function Stars({ n }: { n: number }) {
  return (
    <span className="sg-stars">
      {[0, 1, 2].map(i => (
        <span key={i} className={i < n ? 'on' : 'off'}>★</span>
      ))}
    </span>
  )
}

function Badge({ spec, side }: { spec: SquadSpec; side: 'player' | 'enemy' }) {
  return <span className={`sg-badge ${side} ${spec.commander ? 'commander' : ''}`}>{bannerChar(spec)}</span>
}

function SquadInfo({ spec, side, stance }: { spec: SquadSpec; side: 'player' | 'enemy'; stance?: Stance }) {
  const st = UNIT_STATS[spec.type]
  const strong = strongVs(spec.type)
  const weak = weakVs(spec.type)
  return (
    <div className="sg-squad-info">
      <div className="sg-squad-head">
        <Badge spec={spec} side={side} />
        <b>{squadName(spec)}</b>
        {spec.commander && <span className="sg-tag gold">★ 主帥</span>}
        {side === 'enemy' && stance === 'hold' && <span className="sg-tag">守・按兵不動</span>}
      </div>
      <p className="sg-squad-desc">{st.desc}</p>
      <p className="sg-squad-stats">
        兵力 {maxTroopsOf(spec)}・{st.range > 1.5 ? `射程 ${st.range} 格` : '近戰'}・速度 {st.speed}
        {spec.general && '・武將加成'}
      </p>
      {(strong.length > 0 || weak.length > 0) && (
        <p className="sg-squad-stats">
          {strong.length > 0 && <span className="sg-good">剋 {strong.join('、')}</span>}
          {weak.length > 0 && <span className="sg-bad">怕 {weak.join('、')}</span>}
        </p>
      )}
    </div>
  )
}

export default function StrategistGame() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [phase, setPhase] = useState<Phase>('levels')
  const [levelIdx, setLevelIdx] = useState(0)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [selection, setSelection] = useState<Selection>(null)
  const [hud, setHud] = useState({ time: 0, player: 0, enemy: 0 })
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [targeting, setTargeting] = useState<TacticId | null>(null)
  const [used, setUsed] = useState<TacticId[]>([])
  const [result, setResult] = useState<ResultInfo | null>(null)
  const [confirmRetreat, setConfirmRetreat] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 戰場放在 ref，由 requestAnimationFrame 迴圈直接推進與繪製，不經過 React 重繪
  const battleRef = useRef<Battle | null>(null)
  const fxRef = useRef<Fx>(createFx())
  const phaseRef = useRef<Phase>('levels')
  const levelRef = useRef(0)
  const speedRef = useRef(1)
  const pausedRef = useRef(false)
  const targetingRef = useRef<TacticId | null>(null)
  const selectedIdRef = useRef<number | null>(null)
  const hoverRef = useRef<{ x: number; y: number } | null>(null)
  const bestRef = useRef(progress.stars)

  const level = LEVELS[levelIdx]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    bestRef.current = progress.stars
  }, [progress])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = VIEW_W * dpr
    canvas.height = VIEW_H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const layers = new Map<number, HTMLCanvasElement>()
    const layerFor = (i: number) => {
      let layer = layers.get(i)
      if (!layer) {
        layer = createTerrainLayer(parseMap(LEVELS[i].map), dpr, i)
        layers.set(i, layer)
      }
      return layer
    }

    const finish = (b: Battle) => {
      const idx = levelRef.current
      const stars = starsFor(b)
      const prev = bestRef.current[idx]
      setHud({ time: b.time, player: sumTroops(b.squads, 'player'), enemy: sumTroops(b.squads, 'enemy') })
      setResult({
        won: b.result === 'won',
        reason: b.endReason ?? 'wiped',
        stars,
        ratio: survivalRatio(b),
        time: b.time,
        newBest: prev > 0 && stars > prev,
      })
      if (stars > prev) setProgress(p => ({ stars: p.stars.map((v, i) => (i === idx ? Math.max(v, stars) : v)) }))
      targetingRef.current = null
      setTargeting(null)
      phaseRef.current = 'result'
      setPhase('result')
    }

    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudClock = 0
    let anim = 0
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const b = battleRef.current
      const ph = phaseRef.current
      if (b && ph !== 'levels') {
        const running = ph === 'battle' && !pausedRef.current && targetingRef.current === null
        if (running) {
          acc += dt * speedRef.current
          while (acc >= STEP && b.result === 'ongoing') {
            pushEvents(fxRef.current, stepBattle(b))
            acc -= STEP
          }
          hudClock += dt
          if (hudClock > 0.1) {
            hudClock = 0
            setHud({ time: b.time, player: sumTroops(b.squads, 'player'), enemy: sumTroops(b.squads, 'enemy') })
          }
        }
        // 跳過與撤退會直接改戰場結果，暫停中也要收尾
        if (ph === 'battle' && b.result !== 'ongoing') {
          acc = 0
          finish(b)
        }
        const fxDt = ph === 'battle' ? (running ? dt * speedRef.current : 0) : dt
        anim += fxDt
        updateFx(fxRef.current, fxDt)
        render(ctx, layerFor(levelRef.current), b, fxRef.current, {
          phase: ph === 'deploy' ? 'deploy' : 'battle',
          selectedId: ph === 'deploy' ? selectedIdRef.current : null,
          hover: hoverRef.current,
          targeting: targetingRef.current,
          time: anim,
        })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const changePhase = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const changeTargeting = (t: TacticId | null) => {
    targetingRef.current = t
    setTargeting(t)
  }

  const select = (sel: Selection) => {
    setSelection(sel)
    selectedIdRef.current = sel === null ? null : sel.kind === 'roster' ? sel.idx : LEVELS[levelRef.current].roster.length + sel.idx
  }

  const applyPlacements = (next: Placement[]) => {
    setPlacements(next)
    battleRef.current = createBattle(LEVELS[levelRef.current], next)
  }

  const openLevel = (i: number) => {
    levelRef.current = i
    setLevelIdx(i)
    fxRef.current = createFx()
    applyPlacements([])
    select({ kind: 'roster', idx: 0 })
    setResult(null)
    changePhase('deploy')
  }

  const backToDeploy = () => {
    fxRef.current = createFx()
    applyPlacements(placements)
    select(null)
    setResult(null)
    changePhase('deploy')
  }

  const startBattle = () => {
    battleRef.current = createBattle(level, placements)
    fxRef.current = createFx()
    const b = battleRef.current
    setHud({ time: 0, player: b.initial.player, enemy: b.initial.enemy })
    setUsed([])
    pausedRef.current = false
    setPaused(false)
    setConfirmRetreat(false)
    changeTargeting(null)
    select(null)
    changePhase('battle')
  }

  const place = (idx: number, tx: number, ty: number) => {
    const existing = placements.find(p => p.rosterIdx === idx)
    const stance = existing?.stance ?? defaultStance(level.roster[idx])
    const next = [...placements.filter(p => p.rosterIdx !== idx), { rosterIdx: idx, x: tx, y: ty, stance }]
    applyPlacements(next)
    if (existing) return
    // 新擺上去的部隊：自動換到下一隊，連續點地圖就能擺完
    const nextIdx = level.roster.findIndex((_, i) => !next.some(p => p.rosterIdx === i))
    select(nextIdx >= 0 ? { kind: 'roster', idx: nextIdx } : null)
  }

  const setStance = (idx: number, stance: Stance) =>
    applyPlacements(placements.map(p => (p.rosterIdx === idx ? { ...p, stance } : p)))

  const recall = (idx: number) => applyPlacements(placements.filter(p => p.rosterIdx !== idx))

  const cast = (id: TacticId, x: number, y: number) => {
    const b = battleRef.current
    if (!b) return
    pushEvents(fxRef.current, castTactic(b, id, x, y))
    setUsed([...b.used])
    changeTargeting(null)
  }

  const onTactic = (id: TacticId) => {
    if (used.includes(id)) return
    if (TACTICS[id].radius === 0) cast(id, 0, 0)
    else changeTargeting(targeting === id ? null : id)
  }

  const togglePause = () => {
    pausedRef.current = !paused
    setPaused(!paused)
  }

  const changeSpeed = (s: number) => {
    speedRef.current = s
    setSpeed(s)
  }

  const skip = () => {
    const b = battleRef.current
    if (!b) return
    changeTargeting(null)
    runToEnd(b)
    fxRef.current = createFx()
  }

  const doRetreat = () => {
    const b = battleRef.current
    if (b) retreat(b)
    setConfirmRetreat(false)
  }

  const toTile = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * MAP_W,
      y: ((e.clientY - rect.top) / rect.height) * MAP_H,
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = toTile(e)
    hoverRef.current = p
    const b = battleRef.current
    if (!b) return
    if (phase === 'battle') {
      if (targeting) cast(targeting, p.x, p.y)
      return
    }
    if (phase !== 'deploy') return
    const tx = Math.floor(p.x)
    const ty = Math.floor(p.y)
    const hit = b.squads.find(s => s.alive && Math.floor(s.x) === tx && Math.floor(s.y) === ty)
    if (hit) {
      select(hit.side === 'player' ? { kind: 'roster', idx: hit.id } : { kind: 'enemy', idx: hit.id - level.roster.length })
      return
    }
    if (selection?.kind === 'roster' && canDeploy(b.grid, tx, ty)) {
      place(selection.idx, tx, ty)
      return
    }
    select(null)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    hoverRef.current = toTile(e)
  }

  const onPointerLeave = () => {
    hoverRef.current = null
  }

  const totalStars = progress.stars.reduce((a, b) => a + b, 0)
  const unplaced = level.roster.length - placements.length
  const isLast = levelIdx === LEVELS.length - 1
  const playerShare = hud.player + hud.enemy > 0 ? (hud.player / (hud.player + hud.enemy)) * 100 : 50
  const selPlacement = selection?.kind === 'roster' ? placements.find(p => p.rosterIdx === selection.idx) : undefined

  return (
    <div className="sg-game">
      {phase === 'levels' && (
        <div className="sg-levels">
          <header className="sg-intro">
            <h1>🏯 軍師戰棋</h1>
            <p>你是蜀軍的軍師。開戰前把兵團擺好位置，開戰後兩軍自動交戰，你可以看準時機施放計策。</p>
            <p className="sg-goal">擊破敵方主帥（★）就能獲勝；我方主帥被擊破就輸了。</p>
            <div className="sg-chips">
              {COUNTER_TIPS.map(t => (
                <span key={t} className="sg-chip">{t}</span>
              ))}
            </div>
            <p className="sg-total">⭐ {totalStars} / {LEVELS.length * 3}</p>
          </header>
          <div className="sg-level-grid">
            {LEVELS.map((lv, i) => {
              const open = isUnlocked(progress.stars, i)
              return (
                <button key={lv.name} className={`sg-level-card ${open ? '' : 'locked'}`} disabled={!open} onClick={() => openLevel(i)}>
                  <span className="sg-level-no">第 {i + 1} 戰</span>
                  <span className="sg-level-name">{lv.name}</span>
                  <span className="sg-level-story">{open ? lv.story : '🔒 打贏上一戰才能挑戰'}</span>
                  <span className="sg-level-meta">
                    我軍 {lv.roster.length} 隊 vs 敵軍 {lv.enemies.length} 隊
                    <Stars n={progress.stars[i]} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 畫布常駐以維持繪圖迴圈，選關畫面時只是隱藏 */}
      <div className="sg-field" hidden={phase === 'levels'}>
        <div className="sg-rotate-hint">📱↻ 把手機橫放，戰場更大更好點！</div>
        <div className="sg-field-head">
          <button className="sg-btn ghost" onClick={() => changePhase('levels')}>← 選關</button>
          <span className="sg-field-title">第 {levelIdx + 1} 戰・{level.name}</span>
        </div>

        {phase === 'deploy' && <p className="sg-hint">💡 {level.hint}</p>}

        {phase !== 'deploy' && (
          <div className="sg-hud">
            <div className="sg-hud-bar">
              <span className="sg-hud-num player">蜀軍 {Math.ceil(hud.player)}</span>
              <div className="sg-hud-track">
                <div className="sg-hud-fill" style={{ width: `${playerShare}%` }} />
              </div>
              <span className="sg-hud-num enemy">{Math.ceil(hud.enemy)} 魏軍</span>
            </div>
            <div className="sg-hud-controls">
              <span className="sg-clock">交戰 {fmtTime(hud.time)} / {fmtTime(level.timeLimit)}</span>
              <button className="sg-btn small" onClick={togglePause} disabled={phase !== 'battle'}>
                {paused ? '▶ 繼續' : '⏸ 暫停'}
              </button>
              <div className="sg-speed" role="group" aria-label="速度">
                {SPEEDS.map(s => (
                  <button key={s} className={speed === s ? 'active' : ''} onClick={() => changeSpeed(s)}>
                    {s}×
                  </button>
                ))}
              </div>
              <button className="sg-btn small" onClick={skip} disabled={phase !== 'battle'}>⏭ 跳過</button>
              {confirmRetreat ? (
                <>
                  <button className="sg-btn small danger" onClick={doRetreat}>確定撤退</button>
                  <button className="sg-btn small" onClick={() => setConfirmRetreat(false)}>取消</button>
                </>
              ) : (
                <button className="sg-btn small danger" onClick={() => setConfirmRetreat(true)} disabled={phase !== 'battle'}>
                  🏳 撤退
                </button>
              )}
            </div>
          </div>
        )}

        <div className="sg-stage">
          <canvas
            ref={canvasRef}
            className={`sg-canvas ${targeting ? 'targeting' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          />
          {targeting && (
            <div className="sg-target-tip">
              {TACTICS[targeting].icon} 點選戰場上要施放「{TACTICS[targeting].name}」的位置（戰鬥暫停中）
            </div>
          )}
          {phase === 'result' && result && (
            <div className="sg-overlay">
              <div className={`sg-overlay-box ${result.won ? 'win' : 'lose'}`}>
                <p className="sg-result-title">{result.won ? '🎉 勝利！' : '🏳️ 敗北'}</p>
                <p className="sg-result-reason">{REASON_TEXT[result.won ? 'won' : 'lost'][result.reason]}</p>
                {result.won && (
                  <div className="sg-result-stars">
                    <Stars n={result.stars} />
                    {result.newBest && <span className="sg-new-best">新紀錄！</span>}
                  </div>
                )}
                <p className="sg-result-sub">
                  我軍兵力保存 {Math.round(result.ratio * 100)}%・交戰 {fmtTime(result.time)}
                </p>
                {result.won && result.stars < 3 && (
                  <p className="sg-result-sub">
                    保存 {result.stars === 1 ? '25%' : '50%'} 以上就能拿 {result.stars + 1} 顆星
                  </p>
                )}
                {!result.won && <p className="sg-result-tip">💡 {level.hint}</p>}
                <div className="sg-overlay-actions">
                  <button className="sg-btn" onClick={() => changePhase('levels')}>選關</button>
                  <button className={`sg-btn ${result.won ? '' : 'primary'}`} onClick={backToDeploy}>重新佈陣</button>
                  {result.won && !isLast && (
                    <button className="sg-btn primary" onClick={() => openLevel(levelIdx + 1)}>下一戰 →</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {phase === 'battle' && (
          <div className="sg-tactics">
            <span className="sg-tactics-label">計策（每種限用一次）</span>
            {level.tactics.map(id => (
              <button
                key={id}
                className={`sg-tactic ${targeting === id ? 'active' : ''}`}
                disabled={used.includes(id)}
                onClick={() => onTactic(id)}
                title={TACTICS[id].desc}
              >
                <span className="sg-tactic-icon">{TACTICS[id].icon}</span>
                <span className="sg-tactic-name">{TACTICS[id].name}</span>
                <span className="sg-tactic-desc">{used.includes(id) ? '已使用' : TACTICS[id].desc}</span>
              </button>
            ))}
          </div>
        )}

        {phase === 'deploy' && (
          <div className="sg-deploy">
            <div className="sg-roster">
              {level.roster.map((spec, i) => {
                const placed = placements.some(p => p.rosterIdx === i)
                const active = selection?.kind === 'roster' && selection.idx === i
                return (
                  <button
                    key={i}
                    className={['sg-roster-card', placed ? 'placed' : '', active ? 'active' : ''].filter(Boolean).join(' ')}
                    onClick={() => select({ kind: 'roster', idx: i })}
                  >
                    <Badge spec={spec} side="player" />
                    <span className="sg-roster-name">{shortName(spec)}</span>
                    <span className="sg-roster-state">{placed ? '已佈陣' : '待命'}</span>
                  </button>
                )
              })}
            </div>

            <div className="sg-panel">
              {selection === null && (
                <p className="sg-panel-empty">
                  點上面的部隊卡片，再點戰場左邊亮起來的格子佈陣。也可以點戰場上的部隊（包含敵軍）看說明。
                </p>
              )}
              {selection?.kind === 'roster' && (
                <>
                  <SquadInfo spec={level.roster[selection.idx]} side="player" />
                  {selPlacement ? (
                    <div className="sg-panel-actions">
                      <div className="sg-stance" role="group" aria-label="姿態">
                        <button
                          className={selPlacement.stance === 'advance' ? 'active' : ''}
                          onClick={() => setStance(selection.idx, 'advance')}
                        >
                          ⚔️ 突擊
                        </button>
                        <button
                          className={selPlacement.stance === 'hold' ? 'active' : ''}
                          onClick={() => setStance(selection.idx, 'hold')}
                        >
                          🛡️ 固守
                        </button>
                      </div>
                      <button className="sg-btn small" onClick={() => recall(selection.idx)}>收回</button>
                      <span className="sg-panel-note">
                        {selPlacement.stance === 'hold'
                          ? '固守：原地不動，敵人靠近到 3 格內才出擊（弓兵仍會放箭）。'
                          : '突擊：一開戰就朝最近的敵人前進。'}
                        點戰場上別的空格可以移動位置。
                      </span>
                    </div>
                  ) : (
                    <p className="sg-panel-note">👉 點戰場左邊亮起來的格子，把這隊擺上去。</p>
                  )}
                </>
              )}
              {selection?.kind === 'enemy' && (
                <SquadInfo spec={level.enemies[selection.idx]} side="enemy" stance={level.enemies[selection.idx].stance} />
              )}
            </div>

            <div className="sg-deploy-actions">
              <div className="sg-tactic-preview">
                本戰可用計策：
                {level.tactics.map(id => (
                  <span key={id} className="sg-chip" title={TACTICS[id].desc}>
                    {TACTICS[id].icon} {TACTICS[id].name}
                  </span>
                ))}
              </div>
              <div className="sg-deploy-buttons">
                <button className="sg-btn" onClick={() => { applyPlacements(autoDeploy(levelIdx)); select(null) }}>
                  🪄 一鍵佈陣
                </button>
                <button className="sg-btn danger" onClick={() => { applyPlacements([]); select({ kind: 'roster', idx: 0 }) }} disabled={placements.length === 0}>
                  清空
                </button>
                <button className="sg-btn primary big" onClick={startBattle} disabled={unplaced > 0}>
                  {unplaced > 0 ? `還有 ${unplaced} 隊沒佈陣` : '⚔️ 開戰！'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
