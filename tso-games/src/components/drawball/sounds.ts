// 畫線滾球音效 — 以 Web Audio 即時合成，無需外部音檔

let audioCtx: AudioContext | null = null
let enabled = true
let lastBump = 0

function ctx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  // 瀏覽器自動播放政策：使用者互動後恢復
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

function tone(freq: number, dur: number, vol = 0.15, delay = 0, type: OscillatorType = 'sine', endFreq?: number) {
  if (!enabled) return
  try {
    const c = ctx()
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.connect(g)
    g.connect(c.destination)
    osc.type = type
    const t = c.currentTime + delay
    osc.frequency.setValueAtTime(freq, t)
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.start(t)
    osc.stop(t + dur)
  } catch {
    /* silent fail */
  }
}

export const Sfx = {
  setEnabled(v: boolean) {
    enabled = v
  },
  /** 撞到線或木板：力道越大越響，並限制頻率避免連續滾動時太吵 */
  bump(impact: number) {
    const now = performance.now()
    if (impact < 180 || now - lastBump < 90) return
    lastBump = now
    tone(140, 0.08, Math.min(0.25, impact / 2500), 0, 'triangle', 70)
  },
  spring() {
    tone(220, 0.25, 0.18, 0, 'sine', 880)
  },
  capture() {
    tone(880, 0.12, 0.15)
    tone(1320, 0.18, 0.12, 0.08)
  },
  win() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 0.15, i * 0.11, 'triangle'))
  },
  star(i: number) {
    tone(988 + i * 200, 0.2, 0.12, 0, 'sine')
  },
  fail() {
    tone(330, 0.35, 0.18, 0, 'sawtooth', 110)
  },
  inkOut() {
    tone(200, 0.15, 0.12, 0, 'square')
    tone(160, 0.2, 0.12, 0.12, 'square')
  },
  start() {
    tone(660, 0.1, 0.12, 0, 'triangle', 990)
  },
}
