/**
 * Synthesised sound for Eco-munity (Web Audio API – no audio files needed).
 * Designed to be calm and unobtrusive for classrooms:
 *  - sfx(name): soft, rounded effects (sine/triangle through a low-pass filter)
 *  - ambience: a low wind bed only when it's windy, gentle rain, quiet water
 *  - music: a slow, soft chord-based tune with a little echo
 *
 * Browsers only allow audio after a click/key press, so the engine starts on
 * the first user gesture (see useAudio).
 */

export type SfxName =
  | 'pickup'
  | 'drop'
  | 'correct'
  | 'wrong'
  | 'coin'
  | 'plant'
  | 'water'
  | 'switch'
  | 'wrench'
  | 'chat'
  | 'bell'
  | 'fanfare'
  | 'badge'
  | 'team'
  | 'discover'
  | 'thunder'
  | 'ui'
  | 'step'
  | 'quack'
  | 'jump'

export interface Volumes {
  master: number
  music: number
  sfx: number
  ambience: number
  muted: boolean
  footsteps: boolean
}

let ctx: AudioContext | null = null
let master: GainNode
let musicBus: GainNode
let sfxBus: GainNode
let ambBus: GainNode
let noiseBuf: AudioBuffer
let windGain: GainNode, windFilter: BiquadFilterNode
let rainGain: GainNode
let waterGain: GainNode
let volumes: Volumes = { master: 0.7, music: 0.25, sfx: 0.6, ambience: 0.25, muted: false, footsteps: false }

export const audioReady = () => !!ctx && ctx.state === 'running'
export const footstepsOn = () => volumes.footsteps

export function setVolumes(v: Volumes) {
  volumes = v
  if (!ctx) return
  const t = ctx.currentTime
  master.gain.setTargetAtTime(v.muted ? 0 : v.master, t, 0.05)
  musicBus.gain.setTargetAtTime(v.music, t, 0.05)
  sfxBus.gain.setTargetAtTime(v.sfx, t, 0.05)
  ambBus.gain.setTargetAtTime(v.ambience, t, 0.05)
}

/** Create the audio graph (must be called from a user gesture) */
export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    return
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)

  // everything goes through a gentle low-pass so nothing sounds harsh
  const soften = (cutoff: number) => {
    const f = ctx!.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    f.Q.value = 0.5
    f.connect(master)
    const g = ctx!.createGain()
    g.connect(f)
    return g
  }
  sfxBus = soften(5000)
  ambBus = soften(3000)
  musicBus = soften(3500)

  // a soft echo on the music
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.38
  const fb = ctx.createGain()
  fb.gain.value = 0.25
  const wet = ctx.createGain()
  wet.gain.value = 0.3
  musicBus.connect(delay)
  delay.connect(fb).connect(delay)
  delay.connect(wet).connect(master)

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  // "brown" noise: much softer and warmer than white noise
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.5
  }

  ;({ gain: windGain, filter: windFilter } = loopNoise('lowpass', 260, 0.4))
  ;({ gain: rainGain } = loopNoise('lowpass', 1800, 0.3))
  ;({ gain: waterGain } = loopNoise('lowpass', 420, 0.4))
  setVolumes(volumes)
  startMusic()
}

function loopNoise(type: BiquadFilterType, freq: number, q: number) {
  const src = ctx!.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const filter = ctx!.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = q
  const gain = ctx!.createGain()
  gain.gain.value = 0
  src.connect(filter).connect(gain).connect(ambBus)
  src.start()
  return { gain, filter }
}

/* ------------------------------------------------------------------ */
/* Little synth helpers                                                 */
/* ------------------------------------------------------------------ */

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; when?: number; slide?: number; out?: AudioNode; attack?: number } = {}) {
  if (!ctx) return
  const t = ctx.currentTime + (opts.when ?? 0)
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(freq, t)
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur)
  const peak = opts.gain ?? 0.15
  const a = opts.attack ?? 0.015
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(opts.out ?? sfxBus)
  o.start(t)
  o.stop(t + dur + 0.05)
}

/** A soft "marimba" note: sine + a quiet octave that fades fast */
function mallet(freq: number, when = 0, gain = 0.13, dur = 0.45) {
  tone(freq, dur, { gain, when, attack: 0.005 })
  tone(freq * 2, dur * 0.4, { gain: gain * 0.25, when, attack: 0.005 })
}

function noise(dur: number, opts: { type?: BiquadFilterType; freq?: number; q?: number; gain?: number; when?: number; sweep?: number; out?: AudioNode } = {}) {
  if (!ctx) return
  const t = ctx.currentTime + (opts.when ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = opts.type ?? 'lowpass'
  f.frequency.setValueAtTime(opts.freq ?? 1000, t)
  if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur)
  f.Q.value = opts.q ?? 0.7
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(opts.out ?? sfxBus)
  src.start(t, Math.random())
  src.stop(t + dur + 0.05)
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12) // MIDI → Hz

export function sfx(name: SfxName) {
  if (!ctx || ctx.state !== 'running') return
  switch (name) {
    case 'pickup':
      mallet(NOTE(72), 0, 0.12, 0.3)
      mallet(NOTE(79), 0.07, 0.1, 0.35)
      break
    case 'drop':
      mallet(NOTE(67), 0, 0.1, 0.3)
      mallet(NOTE(60), 0.08, 0.09, 0.35)
      break
    case 'correct':
      ;[72, 76, 79].forEach((n, i) => mallet(NOTE(n), i * 0.09, 0.12, 0.5))
      break
    case 'wrong':
      // a gentle "hmm?", not a buzzer
      tone(NOTE(64), 0.25, { gain: 0.09, type: 'triangle' })
      tone(NOTE(62), 0.35, { gain: 0.08, type: 'triangle', when: 0.18 })
      break
    case 'coin':
      mallet(NOTE(84), 0, 0.09, 0.25)
      mallet(NOTE(91), 0.06, 0.08, 0.4)
      break
    case 'plant':
      noise(0.15, { freq: 350, gain: 0.12 })
      mallet(NOTE(67), 0.08, 0.1, 0.4)
      mallet(NOTE(74), 0.18, 0.09, 0.5)
      break
    case 'water':
      noise(0.5, { type: 'bandpass', freq: 500, sweep: 1400, q: 1.2, gain: 0.14 })
      for (let i = 0; i < 3; i++) tone(900 + Math.random() * 500, 0.08, { gain: 0.035, when: 0.08 + i * 0.12, slide: 1500 })
      break
    case 'switch':
      tone(NOTE(76), 0.08, { gain: 0.07, type: 'triangle' })
      tone(NOTE(71), 0.12, { gain: 0.06, type: 'triangle', when: 0.06 })
      break
    case 'wrench':
      mallet(NOTE(69), 0, 0.08, 0.2)
      mallet(NOTE(69), 0.14, 0.08, 0.2)
      mallet(NOTE(76), 0.3, 0.09, 0.45)
      break
    case 'chat':
      tone(NOTE(81), 0.14, { gain: 0.05 })
      break
    case 'bell':
      ;[0, 0.9].forEach((w) => [523, 1046, 1568].forEach((f, i) => tone(f, 1.6 - i * 0.4, { gain: 0.07 / (i + 1.5), when: w, attack: 0.01 })))
      break
    case 'fanfare':
      ;[60, 64, 67, 72].forEach((n, i) => mallet(NOTE(n), i * 0.12, 0.11, 0.6))
      break
    case 'badge':
      ;[72, 76, 79, 84].forEach((n, i) => mallet(NOTE(n), i * 0.08, 0.09, 0.5))
      break
    case 'team':
      mallet(NOTE(76), 0, 0.06, 0.3)
      mallet(NOTE(81), 0.1, 0.06, 0.4)
      break
    case 'discover':
      ;[67, 71, 74].forEach((n, i) => mallet(NOTE(n), i * 0.1, 0.08, 0.5))
      break
    case 'thunder':
      noise(3, { type: 'lowpass', freq: 220, sweep: 50, gain: 0.45, out: ambBus })
      break
    case 'ui':
      tone(NOTE(84), 0.05, { gain: 0.025 })
      break
    case 'step':
      noise(0.05, { type: 'lowpass', freq: 300 + Math.random() * 120, gain: 0.05 })
      break
    case 'quack':
      tone(480, 0.1, { type: 'triangle', gain: 0.035, slide: 360 })
      tone(460, 0.12, { type: 'triangle', gain: 0.03, slide: 340, when: 0.15 })
      break
    case 'jump':
      tone(NOTE(65), 0.14, { gain: 0.09, type: 'triangle', slide: NOTE(76) })
      break
  }
}

/* ------------------------------------------------------------------ */
/* Ambience                                                             */
/* ------------------------------------------------------------------ */

let nextBird = 0
/** Called a few times a second with what's around the player */
export function updateAmbience(p: { wind: number; rain: number; night: number; water: number }) {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  // wind is only heard when it's actually windy, and as a soft low whoosh
  const windy = Math.max(0, (p.wind - 0.35) / 0.65)
  const gust = 0.75 + Math.sin(t * 0.35) * 0.25
  windGain.gain.setTargetAtTime(windy * 0.22 * gust, t, 1.2)
  windFilter.frequency.setTargetAtTime(180 + windy * 220 * gust, t, 1)
  rainGain.gain.setTargetAtTime(p.rain * 0.16, t, 1.5)
  waterGain.gain.setTargetAtTime(p.water * 0.07, t, 1)

  // a rare, soft bird call on calm days (never at night or in rain)
  if (t > nextBird) {
    nextBird = t + 14 + Math.random() * 18
    if (p.night < 0.3 && p.rain < 0.2 && p.wind < 0.5) {
      const base = NOTE(88 + Math.floor(Math.random() * 3) * 2)
      tone(base, 0.18, { gain: 0.018, slide: base * 1.12, out: ambBus, attack: 0.03 })
      tone(base * 1.12, 0.22, { gain: 0.015, slide: base, when: 0.22, out: ambBus, attack: 0.03 })
    }
  }
}

/* ------------------------------------------------------------------ */
/* Gentle background music                                              */
/* ------------------------------------------------------------------ */

let musicNight = 0
export const setMusicMood = (night: number) => (musicNight = night)

// I – vi – IV – V in C, voiced softly
const CHORDS = [
  [48, 60, 64, 67],
  [45, 57, 60, 64],
  [41, 57, 60, 65],
  [43, 55, 59, 62],
]

function startMusic() {
  let bar = 0
  let next = ctx!.currentTime + 1
  const tick = () => {
    if (!ctx) return
    const beat = musicNight > 0.5 ? 0.9 : 0.7 // slow and relaxed
    while (next < ctx.currentTime + 0.5) {
      const chord = CHORDS[bar % CHORDS.length]
      const when = next - ctx.currentTime
      // soft pad
      chord.forEach((n, i) => tone(NOTE(n), beat * 4.2, { type: 'sine', gain: i === 0 ? 0.03 : 0.018, when, attack: 0.8, out: musicBus }))
      // a few melody notes taken from the chord (always in tune)
      const notes = musicNight > 0.5 ? 1 : 2 + Math.floor(Math.random() * 2)
      for (let k = 0; k < notes; k++) {
        if (Math.random() < 0.25) continue
        const n = chord[1 + Math.floor(Math.random() * 3)] + 12
        tone(NOTE(n), beat * 1.8, { type: 'triangle', gain: 0.022, when: when + k * beat * (4 / notes), attack: 0.04, out: musicBus })
      }
      next += beat * 4
      bar++
    }
    setTimeout(tick, 250)
  }
  tick()
}
