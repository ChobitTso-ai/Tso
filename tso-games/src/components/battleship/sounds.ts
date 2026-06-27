// 戰艦海戰棋音效 — 以 Web Audio 即時合成，無需外部音檔

let audioCtx: AudioContext | null = null
let enabled = true

function ctx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  // 瀏覽器自動播放政策：使用者互動後恢復
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

interface ToneOpts {
  type?: OscillatorType
  vol?: number
  delay?: number
  endFreq?: number // 設定後頻率由 freq 線性滑到 endFreq
}

function tone(freq: number, dur: number, { type = 'sine', vol = 0.2, delay = 0, endFreq }: ToneOpts = {}) {
  try {
    const c = ctx()
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.connect(g)
    g.connect(c.destination)
    osc.type = type
    const t = c.currentTime + delay
    osc.frequency.setValueAtTime(freq, t)
    if (endFreq) osc.frequency.linearRampToValueAtTime(endFreq, t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.start(t)
    osc.stop(t + dur)
  } catch {
    /* silent fail */
  }
}

interface NoiseOpts {
  vol?: number
  delay?: number
  type?: BiquadFilterType
  freq?: number
  q?: number
}

function noise(dur: number, { vol = 0.2, delay = 0, type = 'lowpass', freq = 800, q = 1 }: NoiseOpts = {}) {
  try {
    const c = ctx()
    const t = c.currentTime + delay
    const buf = c.createBuffer(1, Math.max(1, Math.ceil(c.sampleRate * dur)), c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    const filt = c.createBiquadFilter()
    filt.type = type
    filt.frequency.value = freq
    filt.Q.value = q
    const g = c.createGain()
    src.connect(filt)
    filt.connect(g)
    g.connect(c.destination)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.start(t)
    src.stop(t + dur)
  } catch {
    /* silent fail */
  }
}

export const Sfx = {
  setEnabled(v: boolean) {
    enabled = v
  },
  /** 開火：發射「咻」聲 */
  fire() {
    if (!enabled) return
    tone(620, 0.14, { type: 'square', vol: 0.1, endFreq: 200 })
    noise(0.1, { vol: 0.08, type: 'highpass', freq: 1200 })
  },
  /** 命中：爆炸 */
  hit() {
    if (!enabled) return
    noise(0.26, { vol: 0.3, type: 'lowpass', freq: 600, delay: 0.13 })
    tone(95, 0.3, { type: 'sawtooth', vol: 0.22, delay: 0.13, endFreq: 55 })
  },
  /** 落空：水花 */
  miss() {
    if (!enabled) return
    noise(0.18, { vol: 0.16, type: 'bandpass', freq: 900, q: 0.8, delay: 0.13 })
    tone(520, 0.12, { type: 'sine', vol: 0.08, delay: 0.14, endFreq: 240 })
  },
  /** 擊沉：較大的爆炸與下沉鳴聲 */
  sink() {
    if (!enabled) return
    noise(0.5, { vol: 0.32, type: 'lowpass', freq: 420, delay: 0.13 })
    tone(180, 0.55, { type: 'sawtooth', vol: 0.24, delay: 0.13, endFreq: 50 })
    tone(120, 0.4, { type: 'square', vol: 0.12, delay: 0.28, endFreq: 60 })
  },
  /** 佈署放置 */
  place() {
    if (!enabled) return
    tone(440, 0.05, { type: 'square', vol: 0.1 })
    tone(660, 0.06, { type: 'square', vol: 0.08, delay: 0.04 })
  },
  /** 勝利 */
  win() {
    if (!enabled) return
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { vol: 0.2, delay: i * 0.14 }))
  },
  /** 戰敗 */
  lose() {
    if (!enabled) return
    ;[440, 330, 247].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.16, delay: i * 0.2 }))
  },
}
