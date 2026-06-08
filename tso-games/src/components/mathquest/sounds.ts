let audioCtx: AudioContext | null = null

function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  return audioCtx
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.22, delay = 0) {
  try {
    const c = ctx()
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.connect(g)
    g.connect(c.destination)
    osc.type = type
    osc.frequency.value = freq
    const t = c.currentTime + delay
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.start(t)
    osc.stop(t + dur)
  } catch { /* 瀏覽器不支援時靜默 */ }
}

export const Sfx = {
  correct() {
    tone(880, 0.12)
    tone(1100, 0.18, 'sine', 0.22, 0.1)
  },
  wrong() {
    tone(220, 0.28, 'sawtooth', 0.16)
  },
  combo() {
    tone(660, 0.08)
    tone(880, 0.08, 'sine', 0.22, 0.07)
    tone(1100, 0.2, 'sine', 0.22, 0.14)
  },
  item() {
    tone(440, 0.1)
    tone(660, 0.15, 'sine', 0.22, 0.09)
  },
  boss() {
    tone(110, 0.55, 'sawtooth', 0.14)
    tone(165, 0.45, 'sawtooth', 0.11, 0.3)
    tone(110, 0.3, 'sawtooth', 0.1, 0.65)
  },
  win() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.22, i * 0.15))
  },
  lose() {
    tone(400, 0.25, 'sawtooth', 0.16)
    tone(300, 0.25, 'sawtooth', 0.16, 0.25)
    tone(200, 0.4, 'sawtooth', 0.16, 0.5)
  },
  move() {
    tone(330, 0.05, 'sine', 0.06)
  },
}
