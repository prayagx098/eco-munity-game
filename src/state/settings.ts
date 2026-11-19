import { create } from 'zustand'
import { setVolumes, type Volumes } from '../audio/audio'

/**
 * Player settings: graphics quality, sound and accessibility.
 * On first load the device is analysed and a quality tier is picked
 * automatically. Everything is saved in localStorage.
 */

export type Quality = 'low' | 'medium' | 'high'

export interface QualityPreset {
  label: string
  dpr: number
  antialias: boolean
  shadows: boolean
  shadowSize: number
  grass: number
  clouds: number
  cloudShadows: boolean
  birds: number
  rainDrops: number
  splashes: number
  puddles: boolean
  leaves: number
  bloom: boolean
  waterWaves: boolean
  smoke: boolean
  sway: boolean
  labelRange: number
}

export const PRESETS: Record<Quality, QualityPreset> = {
  low: {
    label: 'Low',
    dpr: 1,
    antialias: false,
    shadows: false,
    shadowSize: 512,
    grass: 0,
    clouds: 4,
    cloudShadows: false,
    birds: 0,
    rainDrops: 180,
    splashes: 0,
    puddles: false,
    leaves: 25,
    bloom: false,
    waterWaves: false,
    smoke: false,
    sway: true,
    labelRange: 0.75,
  },
  medium: {
    label: 'Medium',
    dpr: 1.5,
    antialias: true,
    shadows: true,
    shadowSize: 1024,
    grass: 1800,
    clouds: 8,
    cloudShadows: false,
    birds: 2,
    rainDrops: 320,
    splashes: 0,
    puddles: false,
    leaves: 70,
    bloom: false,
    waterWaves: true,
    smoke: true,
    sway: true,
    labelRange: 1,
  },
  high: {
    label: 'High',
    dpr: 2,
    antialias: true,
    shadows: true,
    shadowSize: 2048,
    grass: 4500,
    clouds: 12,
    cloudShadows: true,
    birds: 4,
    rainDrops: 650,
    splashes: 24,
    puddles: true,
    leaves: 150,
    bloom: true,
    waterWaves: true,
    smoke: true,
    sway: true,
    labelRange: 1.15,
  },
}

export interface DeviceInfo {
  gpu: string
  webgl2: boolean
  maxTexture: number
  cores: number
  memory: number | null
  touch: boolean
  screen: string
  pixelRatio: number
  saveData: boolean
  reducedMotion: boolean
  browser: string
  tier: Quality
  reasons: string[]
}

export interface Accessibility {
  colorblind: boolean
  textScale: number
  reducedMotion: boolean
  highContrast: boolean
  captions: boolean
  alwaysRun: boolean
}

const order: Quality[] = ['low', 'medium', 'high']
const minQ = (a: Quality, b: Quality) => order[Math.min(order.indexOf(a), order.indexOf(b))]

function browserName() {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Browser'
}

/** Look at the GPU, CPU, memory and screen to pick a sensible quality tier */
export function detectDevice(): DeviceInfo {
  const reasons: string[] = []
  let gpu = 'Unknown GPU'
  let webgl2 = false
  let maxTexture = 0
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') as WebGL2RenderingContext | null) ?? (c.getContext('webgl') as WebGLRenderingContext | null)
    webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
    if (gl) {
      maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } else gpu = 'No WebGL'
  } catch {
    gpu = 'No WebGL'
  }

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const cores = navigator.hardwareConcurrency || 4
  const memory = nav.deviceMemory ?? null
  const touch = matchMedia('(pointer: coarse)').matches
  const saveData = !!nav.connection?.saveData
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const g = gpu.toLowerCase()

  let tier: Quality = 'medium'
  if (/swiftshader|llvmpipe|software|microsoft basic|no webgl/.test(g)) {
    tier = 'low'
    reasons.push('Software graphics (no GPU acceleration)')
  } else if (/nvidia|geforce|rtx|gtx|radeon rx|radeon pro|apple m\d|apple gpu|adreno \(tm\) 7|adreno 7|mali-g7|arc/.test(g)) {
    tier = 'high'
    reasons.push('Powerful graphics chip')
  } else if (/intel.*(uhd|hd) graphics [0-9]{3}\b|mali-[t4]|adreno.*[3-5]\d\d|powervr|videocore/.test(g)) {
    tier = 'low'
    reasons.push('Entry-level graphics chip')
  } else if (/iris|intel|radeon|vega|adreno|mali/.test(g)) {
    tier = 'medium'
    reasons.push('Mid-range graphics chip')
  }
  if (!webgl2) {
    tier = 'low'
    reasons.push('WebGL 2 not available')
  }
  if (memory !== null && memory <= 2) {
    tier = 'low'
    reasons.push(`${memory} GB memory`)
  } else if (memory !== null && memory <= 4) {
    tier = minQ(tier, 'medium')
    reasons.push(`${memory} GB memory`)
  }
  if (cores <= 2) {
    tier = 'low'
    reasons.push(`${cores} CPU cores`)
  } else if (cores <= 4) {
    tier = minQ(tier, 'medium')
    reasons.push(`${cores} CPU cores`)
  }
  if (touch && Math.min(screen.width, screen.height) < 820) {
    tier = minQ(tier, 'medium')
    reasons.push('Phone / small tablet')
  }
  if (saveData) {
    tier = 'low'
    reasons.push('Data saver is on')
  }
  if (!reasons.length) reasons.push('Standard device')

  return {
    gpu: gpu.replace(/ANGLE \(|\)$|, OpenGL.*|Direct3D11.*/g, '').trim(),
    webgl2,
    maxTexture,
    cores,
    memory,
    touch,
    screen: `${screen.width}×${screen.height}`,
    pixelRatio: Math.round(devicePixelRatio * 100) / 100,
    saveData,
    reducedMotion,
    browser: browserName(),
    tier,
    reasons,
  }
}

interface SettingsState {
  device: DeviceInfo
  quality: 'auto' | Quality
  /** set when the FPS monitor had to lower the quality */
  autoDowngrade: Quality | null
  resolved: Quality
  audio: Volumes
  access: Accessibility
  firstRun: boolean
  setQuality: (q: 'auto' | Quality) => void
  downgrade: () => Quality | null
  setAudio: (a: Partial<Volumes>) => void
  setAccess: (a: Partial<Accessibility>) => void
}

const KEY = 'eco-munity-settings-v2'
const OLD_KEY = 'eco-munity-settings-v1'

const load = (): Partial<Pick<SettingsState, 'quality' | 'audio' | 'access'>> => {
  try {
    const cur = localStorage.getItem(KEY)
    if (cur) return JSON.parse(cur)
    // keep graphics & accessibility from the old version, but reset sound to the new calmer defaults
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '{}')
    return { quality: old.quality, access: old.access }
  } catch {
    return {}
  }
}

const resolve = (quality: 'auto' | Quality, device: DeviceInfo, down: Quality | null): Quality => (quality === 'auto' ? (down ? minQ(down, device.tier) : device.tier) : quality)

const device = detectDevice()
const saved = load()

export const useSettings = create<SettingsState>()((set, get) => ({
  device,
  quality: saved.quality ?? 'auto',
  autoDowngrade: null,
  resolved: resolve(saved.quality ?? 'auto', device, null),
  audio: { master: 0.7, music: 0.25, sfx: 0.6, ambience: 0.25, muted: false, footsteps: false, ...saved.audio },
  access: { colorblind: false, textScale: 1, reducedMotion: device.reducedMotion, highContrast: false, captions: false, alwaysRun: false, ...saved.access },
  firstRun: !saved.quality,
  setQuality: (quality) => set({ quality, autoDowngrade: null, resolved: resolve(quality, get().device, null) }),
  downgrade: () => {
    const s = get()
    if (s.quality !== 'auto') return null
    const i = order.indexOf(s.resolved)
    if (i === 0) return null
    const q = order[i - 1]
    set({ autoDowngrade: q, resolved: q })
    return q
  },
  setAudio: (a) => set((s) => ({ audio: { ...s.audio, ...a } })),
  setAccess: (a) => set((s) => ({ access: { ...s.access, ...a } })),
}))

useSettings.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ quality: s.quality, audio: s.audio, access: s.access }))
  } catch {
    /* private mode */
  }
  setVolumes(s.audio)
})
setVolumes(useSettings.getState().audio)

export const preset = () => PRESETS[useSettings.getState().resolved]
export const usePreset = () => useSettings((s) => PRESETS[s.resolved])
