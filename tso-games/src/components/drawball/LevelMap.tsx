import { useEffect, useRef } from 'react'
import AnimalIcon from './AnimalIcon'
import { animalFor } from './animals'
import type { Chapter } from './types'
import './LevelMap.css'

interface ChapterTheme {
  bg: string
  sign: string
  deco: string[]
}

// 順序對應 CHAPTERS：草原、沙漠、遊樂園、機械城、彩虹、星空山頂
// 蠟筆繪本風：米白圖畫紙上疊一層主題色的斜線塗色，與關卡畫面的紙張一致
const crayonTint = (paper: string, tint: string) =>
  `repeating-linear-gradient(-55deg, ${tint} 0 3px, transparent 3px 10px), ${paper}`
const THEMES: ChapterTheme[] = [
  { bg: crayonTint('#fbf4e2', 'rgba(124,195,91,0.16)'), sign: '#7cc35b', deco: ['🌳', '🌼', '🌷', '🍄', '🌲', '🐛'] },
  { bg: crayonTint('#fbecd0', 'rgba(240,160,32,0.16)'), sign: '#f08c4a', deco: ['🌵', '🏜️', '🦂', '☀️', '🌵', '🐍'] },
  { bg: crayonTint('#fdeff4', 'rgba(224,85,143,0.14)'), sign: '#f06595', deco: ['🎈', '🎪', '🦘', '🎠', '🍭', '🎡'] },
  { bg: crayonTint('#eef0f2', 'rgba(110,125,150,0.16)'), sign: '#8d9bb3', deco: ['⚙️', '🔩', '🏭', '🤖', '🔧', '⛓️'] },
  { bg: crayonTint('#f4f0ff', 'rgba(155,123,217,0.16)'), sign: '#9b7bd9', deco: ['🌈', '👯', '🦋', '🫧', '🌸', '🎶'] },
  { bg: crayonTint('#262a55', 'rgba(255,244,200,0.07)'), sign: '#f2a900', deco: ['⭐', '🏔️', '🌙', '✨', '🏆', '🌟'] },
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
                <AnimalIcon animal={animalFor(n.i, 0)} size={44} />
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
