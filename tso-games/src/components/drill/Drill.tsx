import { Fragment, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import './Drill.css'
import type { Blank, Level, Question } from './types'
import { GRADES, SECTION_INFO, answerText, buildPaper, check, paperTitle } from './logic'
import type { Reply } from './logic'
import Ruler from './Ruler'

type Mode = 'print' | 'online'
type Sheet = 'q' | 'a'
/** 卷面呈現：題目卷、答案卷、線上作答 */
type View = Sheet | 'online'

interface Settings {
  grade: string
  sel: string[]
  lv: Level
  count: number
  seed: number
  mode: Mode
  sheet: Sheet
}

const STORAGE_KEY = 'drillSettings'
const COUNTS = [10, 15, 20, 30]
const LEVELS: Level[] = [1, 2, 3]
const LEVEL_LABELS: Record<Level, string> = { 1: '基礎', 2: '標準', 3: '挑戰' }
const MODE_LABELS: Record<Mode, string> = { print: '🖨 列印練習卷', online: '✏️ 線上作答' }
const ZH = '一二三四五六七八九十'
const TOKEN = /\[\?\]|\{(?:(\d+) )?(\d+|\[\?\])\/(\d+|\[\?\])\}/g

const zh = (n: number) => (n <= 10 ? ZH[n - 1] : `十${ZH[n - 11]}`)
const newSeed = () => 100000 + Math.floor(Math.random() * 900000)

/** 還原設定：每個欄位都驗證，不認得的值改用預設，選過的小節只留還存在的 */
function loadSettings(): Settings {
  const def: Settings = { grade: GRADES[0].id, sel: [], lv: 2, count: 10, seed: newSeed(), mode: 'print', sheet: 'q' }
  try {
    const s: Partial<Record<keyof Settings, unknown>> | null = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!s || typeof s !== 'object') return def
    return {
      grade: GRADES.find(g => g.id === s.grade)?.id ?? def.grade,
      sel: Array.isArray(s.sel) ? s.sel.filter((id: unknown): id is string => typeof id === 'string' && SECTION_INFO.has(id)) : [],
      lv: s.lv === 1 || s.lv === 2 || s.lv === 3 ? s.lv : def.lv,
      count: typeof s.count === 'number' && COUNTS.includes(s.count) ? s.count : def.count,
      seed: Number.isInteger(s.seed) && Number(s.seed) >= 100000 && Number(s.seed) <= 999999 ? Number(s.seed) : def.seed,
      mode: s.mode === 'online' ? 'online' : 'print',
      sheet: s.sheet === 'a' ? 'a' : 'q',
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return def
  }
}

function Frac({ w, n, d }: { w?: ReactNode; n: ReactNode; d: ReactNode }) {
  return (
    <span className="dr-mixed">
      {w}
      <span className="dr-frac">
        <span>{n}</span>
        <span>{d}</span>
      </span>
    </span>
  )
}

/** 把題幹記號排成畫面；blank(i, inFrac) 決定第 i 個填空怎麼畫 */
function renderText(text: string, blank: (i: number, inFrac: boolean) => ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let bi = 0
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[0] === '[?]') {
      out.push(<Fragment key={m.index}>{blank(bi++, false)}</Fragment>)
    } else {
      const n = m[2] === '[?]' ? blank(bi++, true) : m[2]
      const d = m[3] === '[?]' ? blank(bi++, true) : m[3]
      out.push(<Frac key={m.index} w={m[1]} n={n} d={d} />)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function AnswerValue({ b }: { b: Blank }) {
  if (b.kind !== 'frac') return <>{answerText(b)}</>
  if (b.d === 1) return <>{b.n}</>
  const w = Math.floor(b.n / b.d)
  return <Frac w={w || undefined} n={b.n % b.d} d={b.d} />
}

interface InputProps {
  b: Blank
  value: Reply | undefined
  disabled: boolean
  small: boolean
  onChange: (v: Reply) => void
}

function BlankInput({ b, value, disabled, small, onChange }: InputProps) {
  if (b.kind === 'choice') {
    return (
      <select
        className="dr-in"
        aria-label="選擇答案"
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        <option value="" />
        {b.options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  if (b.kind === 'frac') {
    const v = typeof value === 'object' ? value : { w: '', n: '', d: '' }
    const field = (k: 'w' | 'n' | 'd', label: string) => (
      <input
        className="dr-in sm"
        inputMode="numeric"
        aria-label={label}
        value={v[k]}
        disabled={disabled}
        onChange={e => onChange({ ...v, [k]: e.target.value })}
      />
    )
    return <Frac w={field('w', '整數部分')} n={field('n', '分子')} d={field('d', '分母')} />
  }
  return (
    <input
      className={`dr-in ${b.kind === 'list' ? 'wide' : small ? 'sm' : ''}`}
      inputMode={b.kind === 'list' ? 'text' : 'numeric'}
      placeholder={b.kind === 'list' ? '用逗號分開' : undefined}
      aria-label="答案"
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    />
  )
}

interface ItemProps {
  q: Question
  no: number
  view: View
  qKey: string
  replies: Record<string, Reply>
  submitted: boolean
  onReply: (key: string, v: Reply) => void
}

function QuestionItem({ q, no, view, qKey, replies, submitted, onReply }: ItemProps) {
  const blank = (i: number, inFrac: boolean): ReactNode => {
    const b = q.blanks[i]
    if (view === 'q') {
      return inFrac ? <span className="dr-box" /> : <span className={`dr-bk ${b.kind}`}><span className="dr-gap" /></span>
    }
    if (view === 'a') {
      const ans = <b className="dr-ans"><AnswerValue b={b} /></b>
      return inFrac ? ans : <span className="dr-bk">{ans}</span>
    }
    const key = `${qKey}.${i}`
    const ok = submitted && check(b, replies[key])
    return (
      <span className={`dr-slot ${submitted ? (ok ? 'ok' : 'bad') : ''}`}>
        <BlankInput b={b} value={replies[key]} disabled={submitted} small={inFrac} onChange={v => onReply(key, v)} />
        {submitted && !ok && <span className="dr-fix"><AnswerValue b={b} /></span>}
      </span>
    )
  }
  return (
    <li className={`dr-q ${q.work ? 'work' : ''}`}>
      <span className="dr-no">{no}.</span>
      <div className="dr-body">
        <div className="dr-text">{renderText(q.text, blank)}</div>
        {q.fig && <Ruler fig={q.fig} />}
        {q.sol && (view === 'a' || (view === 'online' && submitted)) && (
          <div className="dr-sol">{renderText(q.sol, () => null)}</div>
        )}
      </div>
    </li>
  )
}

export default function Drill() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [replies, setReplies] = useState<Record<string, Reply>>({})
  const [submitted, setSubmitted] = useState(false)
  const { grade, sel, lv, count, seed, mode, sheet } = settings

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // 無痕模式等寫不進去時，只是下次不會記得設定
    }
  }, [settings])

  const paper = useMemo(() => (sel.length ? buildPaper(sel, lv, count, seed) : []), [sel, lv, count, seed])
  const view: View = mode === 'online' ? 'online' : sheet
  const g = GRADES.find(x => x.id === grade) ?? GRADES[0]

  const offsets: number[] = []
  paper.forEach((_, i) => offsets.push(i ? offsets[i - 1] + paper[i - 1].questions.length : 0))
  const total = paper.reduce((s, grp) => s + grp.questions.length, 0)
  const right = submitted
    ? paper.reduce(
        (s, grp, gi) => s + grp.questions.filter((q, qi) => q.blanks.every((b, bi) => check(b, replies[`${gi}.${qi}.${bi}`]))).length,
        0,
      )
    : 0

  // 題目一變（單元、難度、題數、卷號），線上作答就重來
  const update = (patch: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    if (patch.sel || patch.lv || patch.count || patch.seed) {
      setReplies({})
      setSubmitted(false)
    }
  }

  const toggle = (ids: string[]) => {
    const all = ids.every(id => sel.includes(id))
    update({ sel: all ? sel.filter(id => !ids.includes(id)) : [...sel, ...ids.filter(id => !sel.includes(id))] })
  }

  return (
    <div className="dr-wrap">
      <aside className="dr-side">
        <section className="dr-card">
          <h2 className="dr-card-title">① 選單元</h2>
          <div className="dr-tabs" role="tablist">
            {GRADES.map(x => (
              <button
                key={x.id}
                role="tab"
                aria-selected={x.id === g.id}
                className={`dr-tab ${x.id === g.id ? 'active' : ''}`}
                onClick={() => update({ grade: x.id })}
              >
                {x.label}
                <small>{x.who}</small>
              </button>
            ))}
          </div>
          {g.chapters.map(ch => {
            const ids = ch.sections.map(s => s.id)
            const picked = ids.filter(id => sel.includes(id)).length
            return (
              <div key={ch.title} className="dr-chapter">
                <button className="dr-ch-btn" onClick={() => toggle(ids)}>
                  <span>{ch.title}</span>
                  <small>{picked ? `已選 ${picked}/${ids.length}` : '選整章'}</small>
                </button>
                <div className="dr-chips">
                  {ch.sections.map(s => (
                    <button
                      key={s.id}
                      className={`dr-chip ${sel.includes(s.id) ? 'active' : ''}`}
                      aria-pressed={sel.includes(s.id)}
                      onClick={() => toggle([s.id])}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          <div className="dr-sel-foot">
            <span>已選 {sel.length} 節</span>
            {sel.length > 0 && (
              <button className="dr-link" onClick={() => update({ sel: [] })}>
                全部清除
              </button>
            )}
          </div>
          <p className="dr-hint">依 108 課綱主題整理；各版本課本的章節順序可能不同。</p>
        </section>

        <section className="dr-card">
          <h2 className="dr-card-title">② 卷面設定</h2>
          <div className="dr-field">
            <span className="dr-label">難度</span>
            <div className="dr-seg">
              {LEVELS.map(x => (
                <button key={x} className={x === lv ? 'active' : ''} onClick={() => update({ lv: x })}>
                  {LEVEL_LABELS[x]}
                </button>
              ))}
            </div>
          </div>
          <div className="dr-field">
            <label className="dr-label" htmlFor="dr-count">
              題數
            </label>
            <select id="dr-count" className="dr-select" value={count} onChange={e => update({ count: Number(e.target.value) })}>
              {COUNTS.map(c => (
                <option key={c} value={c}>
                  {c} 題
                </option>
              ))}
            </select>
          </div>
          <div className="dr-field">
            <span className="dr-label">作答方式</span>
            <div className="dr-seg">
              {(['print', 'online'] as Mode[]).map(m => (
                <button key={m} className={m === mode ? 'active' : ''} onClick={() => update({ mode: m })}>
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        </section>
      </aside>

      <main className="dr-main">
        {sel.length === 0 ? (
          <div className="dr-empty">先選要練習的單元，就會出一張新的練習卷。</div>
        ) : (
          <>
            <div className="dr-bar">
              {mode === 'print' && (
                <div className="dr-seg">
                  {(['q', 'a'] as Sheet[]).map(s => (
                    <button key={s} className={s === sheet ? 'active' : ''} onClick={() => update({ sheet: s })}>
                      {s === 'q' ? '題目卷' : '答案卷'}
                    </button>
                  ))}
                </div>
              )}
              <span className="dr-info">
                共 {total} 題・卷號 {seed}
              </span>
              <span className="dr-spacer" />
              <button className="dr-btn" onClick={() => update({ seed: newSeed() })}>
                🔄 換一份
              </button>
              {mode === 'print' && (
                <button className="dr-btn primary" onClick={() => window.print()}>
                  🖨 列印{sheet === 'q' ? '題目卷' : '答案卷'}
                </button>
              )}
            </div>

            <article className={`dr-paper ${view}`}>
              <header className="dr-head">
                <h1>
                  {paperTitle(sel)}
                  {view === 'a' ? '（答案卷）' : ''}
                </h1>
                <p className="dr-meta">
                  {LEVEL_LABELS[lv]}・共 {total} 題
                </p>
                {view === 'q' && (
                  <div className="dr-fields">
                    <span>姓名</span>
                    <span>日期</span>
                    <span>得分</span>
                  </div>
                )}
                {view === 'online' && submitted && (
                  <p className="dr-score">
                    答對 {right}／{total} 題{right === total ? ' 🎉 全對！' : ''}
                  </p>
                )}
              </header>
              {paper.map((grp, gi) => (
                <section key={grp.section.id} className="dr-group">
                  <h2>
                    {zh(gi + 1)}、{grp.section.title}
                  </h2>
                  {grp.section.note && <p className="dr-note">{grp.section.note}</p>}
                  <ol className="dr-qs">
                    {grp.questions.map((q, qi) => (
                      <QuestionItem
                        key={qi}
                        q={q}
                        no={offsets[gi] + qi + 1}
                        view={view}
                        qKey={`${gi}.${qi}`}
                        replies={replies}
                        submitted={submitted}
                        onReply={(key, v) => setReplies(prev => ({ ...prev, [key]: v }))}
                      />
                    ))}
                  </ol>
                </section>
              ))}
              <footer className="dr-foot">
                <span>TSO Games・無限出題</span>
                <span>卷號 {seed}</span>
              </footer>
            </article>

            {mode === 'online' && (
              <div className="dr-actions">
                {submitted ? (
                  <>
                    <button
                      className="dr-btn"
                      onClick={() => {
                        setReplies({})
                        setSubmitted(false)
                      }}
                    >
                      ↺ 重新作答
                    </button>
                    <button className="dr-btn primary" onClick={() => update({ seed: newSeed() })}>
                      再練一份
                    </button>
                  </>
                ) : (
                  <button className="dr-btn primary" onClick={() => setSubmitted(true)}>
                    交卷批改
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
