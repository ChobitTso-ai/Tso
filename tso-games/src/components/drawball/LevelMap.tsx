import { useEffect, useRef } from 'react'
import type { Chapter } from './types'
import './LevelMap.css'

interface ChapterTheme {
  bg: string
  sign: string
  deco: string[]
}

// 順序對應 CHAPTERS：草原、沙漠、遊樂園、機械城、彩虹雙子、星空山頂
const THEMES: ChapterTheme[] = [
  { bg: 'linear-gradient(180deg, #b8ec9a 0%, #7fcf5c 100%)', sign: '#2f9e44', deco: ['🌳', '🌼', '🌷', '🍄', '🌲', '🐛'] },
  { bg: 'linear-gradient(180deg, #ffe3a3 0%, #f1b458 100%)', sign: '#d9480f', deco: ['🌵', '🏜️', '🦂', '☀️', '🌵', '🐍'] },
  { bg: 'linear-gradient(180deg, #ffd3e6 0%, #f59ac2 100%)', sign: '#c2255c', deco: ['🎈', '🎪', '🦘', '🎠', '🍭', '🎡'] },
  { bg: 'linear-gradient(180deg, #d0d8e4 0%, #8d9bb3 100%)', sign: '#495057', deco: ['⚙️', '🔩', '🏭', '🤖', '🔧', '⛓️'] },
  { bg: 'linear-gradient(180deg, #d9cfff 0%, #a493f2 100%)', sign: '#6741d9', deco: ['🌈', '👯', '🦋', '🫧', '🌸', '🎶'] },
  { bg: 'linear-gradient(180deg, #1b1f5e 0%, #2f2a7a 100%)', sign: '#e8a400', deco: ['⭐', '🏔️', '🌙', '✨', '🏆', '🌟'] },
]

const NODE_GAP = 100 // 相鄰關卡的垂直距離
const BANNER_GAP = 120 // 每章最底下放章節招牌的高度
const TOP_PAD = 50 // 最後一關上方留白
const AMPLITUDE = 24 // 路徑左右擺動幅度（%）

interface Props {
  chapters: Chapter[]
  stars: number[]
  current: number
  isUnlocked: (i: number) => boolean
  onSelect: (i: number) => void
}

export default function LevelMap({ chapters, stars, current, isUnlocked, onSelect }: Props) {
  const currentRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  // 由下往上排：第 1 關在最底部；每章最底下先放招牌，再往上排關卡
  const nodes: { i: number; ch: number; x: number; y: number }[] = []
  const bands: { ch: number; from: number; to: number }[] = []
  let y = 0
  chapters.forEach((c, ch) => {
    const from = y
    y += BANNER_GAP
    c.levels.forEach(() => {
      const i = nodes.length
      nodes.push({ i, ch, x: 50 + Math.sin(i * 0.9) * AMPLITUDE, y })
      y += NODE_GAP
    })
    y -= NODE_GAP / 2
    if (ch === chapters.length - 1) y += TOP_PAD
    bands.push({ ch, from, to: y })
  })
  const height = y
  const names = chapters.flatMap(c => c.levels.map(l => l.name))
  const top = (fromBottom: number) => height - fromBottom

  // 相鄰關卡間用 S 形曲線連接；已過關的段落畫成金色
  const segs = nodes.slice(1).map((n, k) => {
    const p = nodes[k]
    const my = (top(p.y) + top(n.y)) / 2
    return {
      d: `M ${p.x} ${top(p.y)} C ${p.x} ${my} ${n.x} ${my} ${n.x} ${top(n.y)}`,
      done: stars[p.i] > 0,
    }
  })

  return (
    <div className="db-map" style={{ height }}>
      {bands.map(b => {
        const theme = THEMES[b.ch % THEMES.length]
        const bandH = b.to - b.from
        return (
          <div
            key={b.ch}
            className="db-map-band"
            style={{ top: top(b.to), height: bandH, background: theme.bg }}
          >
            {theme.deco.flatMap((d, k) =>
              [0, 1].map(side => {
                // 裝飾固定排在兩側，避開中間的路徑；位置用簡單的公式打散
                const n = k * 2 + side
                const left = side === 0 ? 2 + ((n * 7) % 10) : 86 + ((n * 5) % 10)
                const t = ((n * 37) % 100) / 100
                return (
                  <span
                    key={n}
                    className="db-map-deco"
                    style={{ left: `${left}%`, top: 20 + t * (bandH - 150) }}
                    aria-hidden="true"
                  >
                    {d}
                  </span>
                )
              }),
            )}
            <div className="db-map-sign" style={{ background: theme.sign }}>
              {chapters[b.ch].icon} 第 {b.ch + 1} 章・{chapters[b.ch].name}
            </div>
          </div>
        )
      })}

      <svg className="db-map-path" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {segs.map((s, k) => (
          <path key={k} d={s.d} className={s.done ? 'done' : ''} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {nodes.map(n => {
        const locked = !isUnlocked(n.i)
        const isCurrent = n.i === current
        return (
          <button
            key={n.i}
            ref={isCurrent ? currentRef : undefined}
            className={[
              'db-map-node',
              locked ? 'locked' : '',
              stars[n.i] > 0 ? 'cleared' : '',
              isCurrent ? 'current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${n.x}%`, top: top(n.y) }}
            disabled={locked}
            onClick={() => onSelect(n.i)}
            title={names[n.i]}
          >
            {isCurrent && (
              <span className="db-map-avatar" aria-hidden="true">
                🔴
              </span>
            )}
            <span className="db-map-num">{locked ? '🔒' : n.i + 1}</span>
            {!locked && (
              <span className="db-map-stars">
                {[0, 1, 2].map(s => (
                  <span key={s} className={s < stars[n.i] ? 'on' : 'off'}>
                    ★
                  </span>
                ))}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
