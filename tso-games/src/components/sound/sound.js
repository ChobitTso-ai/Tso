// TSO 首頁與遊戲島共用的聲音：背景音樂、海浪、按鍵音、朗讀。
// 全部用 Web Audio 與瀏覽器朗讀即時產生，沒有音檔，也就沒有音樂授權的問題。
// 卡片首頁（React）以 import 使用；遊戲島由 island/build.mjs 把本檔內容直接嵌進頁面（會拿掉 export）。
// 瀏覽器規定使用者點過畫面才能出聲，所以音樂與海浪都在第一次點擊後才開始。

const SOUND_KEY = 'tsoSound' // 'off' 為關閉；沒設定或其他值都算開啟（預設開）
const snd = { ctx: null, master: null, music: null, waves: null, want: { music: false, waves: false }, armed: false }

export function soundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
}

function sndContext() {
  if (!snd.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    snd.ctx = new AC()
    snd.master = snd.ctx.createGain()
    snd.master.connect(snd.ctx.destination)
  }
  if (snd.ctx.state === 'suspended') snd.ctx.resume()
  return snd.ctx
}

// 一個音：波形、頻率、開始時間、長度、音量；起音快、慢慢淡出，像音樂盒
function sndNote(dest, type, freq, t, dur, vol, attack = .01) {
  const ctx = snd.ctx, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(.0001, t + dur)
  o.connect(g); g.connect(dest)
  o.start(t); o.stop(t + dur + .05)
}
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12)

// ---------- 背景音樂：C 大調五聲音階的音樂盒，C–Am–F–G 循環，每四小節換一段旋律 ----------
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
const PENTA = [72, 74, 76, 79, 81, 84]
const BAR = 60 / 84 * 4

function sndStartMusic() {
  const ctx = snd.ctx
  if (!ctx || snd.music) return
  const bus = ctx.createGain()
  bus.gain.value = 1
  bus.connect(snd.master)
  let bar = 0, next = ctx.currentTime + .2, seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  let phrase = []
  const tick = () => {
    while (next < ctx.currentTime + .6) {
      const chord = CHORDS[bar % 4], beat = BAR / 4
      if (bar % 4 === 0) phrase = Array.from({ length: 16 }, () => (rnd() < .7 ? PENTA[Math.floor(rnd() * PENTA.length)] : 0))
      chord.forEach((m) => sndNote(bus, 'sine', midi(m - 12), next, BAR * 1.1, .016, .6)) // 和聲墊底
      sndNote(bus, 'sine', midi(chord[0] - 24), next, beat * 1.8, .03)                    // 低音
      sndNote(bus, 'sine', midi(chord[0] - 24), next + beat * 2, beat * 1.8, .025)
      for (let i = 0; i < 4; i++) {                                                          // 旋律：每拍一個音，偶爾休息
        const m = phrase[(bar % 4) * 4 + i]
        if (m) sndNote(bus, 'triangle', midi(m), next + i * beat, beat * 1.6, .03)
      }
      next += BAR; bar++
    }
  }
  tick()
  snd.music = { bus, timer: setInterval(tick, 200) }
}

// ---------- 海浪：濾過的白噪音，音量與亮度緩慢起伏 ----------
function sndStartWaves() {
  const ctx = snd.ctx
  if (!ctx || snd.waves) return
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600
  const gain = ctx.createGain(); gain.gain.value = .045
  const swell = ctx.createOscillator(), swellDepth = ctx.createGain()
  swell.frequency.value = .08; swellDepth.gain.value = .035
  swell.connect(swellDepth); swellDepth.connect(gain.gain)
  const tone = ctx.createOscillator(), toneDepth = ctx.createGain()
  tone.frequency.value = .05; toneDepth.gain.value = 250
  tone.connect(toneDepth); toneDepth.connect(filter.frequency)
  src.connect(filter); filter.connect(gain); gain.connect(snd.master)
  src.start(); swell.start(); tone.start()
  snd.waves = { nodes: [src, swell, tone], gain }
}

function sndStop(kind) {
  const s = snd[kind]
  if (!s) return
  if (s.timer) clearInterval(s.timer)
  if (s.bus) s.bus.disconnect()
  if (s.nodes) s.nodes.forEach((n) => { try { n.stop() } catch { /* 已停止 */ } })
  if (s.gain) s.gain.disconnect()
  snd[kind] = null
}

function sndApply() {
  if (!soundOn() || !sndContext()) return
  if (snd.want.music) sndStartMusic(); else sndStop('music')
  if (snd.want.waves) sndStartWaves(); else sndStop('waves')
}

// 朗讀時把背景音樂壓低，念完再恢復
function sndDuck(on) {
  if (snd.music && snd.ctx) snd.music.bus.gain.setTargetAtTime(on ? .3 : 1, snd.ctx.currentTime, .15)
}

const unlock = () => { if (soundOn()) sndApply() }
const onVisible = () => {
  if (!snd.ctx) return
  if (document.hidden) { snd.ctx.suspend(); if ('speechSynthesis' in window) window.speechSynthesis.cancel() }
  else if (soundOn()) snd.ctx.resume()
}

// 頁面要哪些背景聲（music、waves）；回傳的函式會停掉它們（React 離開首頁時呼叫）
export function initSound(opts) {
  snd.want = { music: !!opts.music, waves: !!opts.waves }
  if (!snd.armed) {
    snd.armed = true
    ;['pointerdown', 'keydown', 'touchend'].forEach((e) => window.addEventListener(e, unlock, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
  }
  if (snd.ctx && snd.ctx.state === 'running') sndApply()
  return () => {
    snd.want = { music: false, waves: false }
    sndStop('music'); sndStop('waves')
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }
}

export function setSoundOn(on) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* 無痕模式存不了，只影響這次 */ }
  if (on) { sndApply(); blip() } else {
    sndStop('music'); sndStop('waves')
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }
}

// 按鍵音：短促的「啵」
export function blip() {
  if (!soundOn() || !sndContext()) return
  const t = snd.ctx.currentTime
  sndNote(snd.master, 'sine', 660, t, .12, .12)
  sndNote(snd.master, 'sine', 990, t + .04, .1, .06)
}

// 打開遊戲卡片：兩聲清脆的「叮」
export function chime() {
  if (!soundOn() || !sndContext()) return
  const t = snd.ctx.currentTime
  sndNote(snd.master, 'triangle', midi(88), t, .5, .07)
  sndNote(snd.master, 'triangle', midi(95), t + .09, .6, .06)
}

// 朗讀：優先用台灣中文語音，沒有就用任何中文語音；新的一句會打斷上一句
export function speak(text) {
  if (!soundOn() || !('speechSynthesis' in window)) return
  const s = window.speechSynthesis, voices = s.getVoices()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-TW'
  const v = voices.find((x) => /zh[-_]TW/i.test(x.lang)) || voices.find((x) => /^zh/i.test(x.lang))
  if (v) u.voice = v
  u.rate = 1; u.pitch = 1.05
  u.onend = u.onerror = () => sndDuck(false)
  s.cancel()
  sndDuck(true)
  s.speak(u)
}
