import * as THREE from 'three'

/**
 * Procedural surface textures drawn once on a canvas (no image files needed).
 * High-definition detail maps that multiply with a block's colour for realistic
 * architectural surfaces (bricks, paving, timber, roofing, roads, etc.).
 */
export type TexName =
  | 'grain'
  | 'grass'
  | 'paving'
  | 'asphalt'
  | 'wood'
  | 'brick'
  | 'sand'
  | 'soil'
  | 'roof'
  | 'concrete'
  | 'solarpanel'
  | 'fabric'
  | 'denim'
  | 'hairstrand'
  | 'skin'
  | 'knit'
  | 'leather'
  | 'satin'
  | 'sequin'
  | 'mesh'
  | 'fleece'

const SIZE = 512

/** deterministic random so the textures look the same on every load */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

type Draw = (g: CanvasRenderingContext2D, r: () => number) => void

const grey = (v: number, a = 1) => {
  const c = Math.max(0, Math.min(255, Math.round(v * 255)))
  return `rgba(${c},${c},${c},${a})`
}

function speckle(g: CanvasRenderingContext2D, r: () => number, n: number, lo: number, hi: number, maxSize = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = grey(lo + r() * (hi - lo), 0.55)
    g.fillRect(r() * SIZE, r() * SIZE, 1 + r() * maxSize, 1 + r() * maxSize)
  }
}

const DRAW: Record<TexName, Draw> = {
  /** knitted wool: rows of little V stitches */
  knit: (g, r) => {
    g.fillStyle = grey(0.8)
    g.fillRect(0, 0, SIZE, SIZE)
    const sw = 18
    const sh = 22
    for (let y = 0; y < SIZE; y += sh) {
      for (let x = 0; x < SIZE; x += sw) {
        const v = 0.85 + r() * 0.15
        g.strokeStyle = grey(v)
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(x + 1, y + 2)
        g.lineTo(x + sw / 2, y + sh - 2)
        g.lineTo(x + sw - 1, y + 2)
        g.stroke()
        g.strokeStyle = grey(0.55, 0.7)
        g.lineWidth = 1.5
        g.beginPath()
        g.moveTo(x + sw / 2, y + sh - 2)
        g.lineTo(x + sw / 2, y + sh)
        g.stroke()
      }
    }
  },
  /** leather: fine cracked grain with natural creases */
  leather: (g, r) => {
    g.fillStyle = grey(0.78)
    g.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < 2800; i++) {
      const x = r() * SIZE
      const y = r() * SIZE
      g.fillStyle = grey(0.55 + r() * 0.35, 0.55)
      g.beginPath()
      g.ellipse(x, y, 3 + r() * 6, 3 + r() * 5, r() * 3, 0, Math.PI * 2)
      g.fill()
    }
    for (let i = 0; i < 12; i++) {
      g.strokeStyle = grey(0.45, 0.6)
      g.lineWidth = 2.5
      g.beginPath()
      const y = r() * SIZE
      g.moveTo(0, y)
      g.bezierCurveTo(SIZE * 0.3, y + (r() - 0.5) * 35, SIZE * 0.7, y + (r() - 0.5) * 35, SIZE, y + (r() - 0.5) * 20)
      g.stroke()
    }
  },
  /** satin: smooth with long soft highlights */
  satin: (g) => {
    const grd = g.createLinearGradient(0, 0, SIZE, SIZE)
    for (let i = 0; i <= 8; i++) grd.addColorStop(i / 8, grey(i % 2 ? 1 : 0.72))
    g.fillStyle = grd
    g.fillRect(0, 0, SIZE, SIZE)
  },
  /** sequins: overlapping shiny discs */
  sequin: (g, r) => {
    g.fillStyle = grey(0.5)
    g.fillRect(0, 0, SIZE, SIZE)
    const d = 22
    for (let y = -d; y < SIZE + d; y += d * 0.8) {
      for (let x = -d; x < SIZE + d; x += d) {
        const ox = (Math.round(y / (d * 0.8)) % 2) * (d / 2)
        const grd = g.createRadialGradient(x + ox - 3, y - 3, 0, x + ox, y, d * 0.6)
        const v = 0.7 + r() * 0.3
        grd.addColorStop(0, grey(1))
        grd.addColorStop(0.5, grey(v))
        grd.addColorStop(1, grey(0.35))
        g.fillStyle = grd
        g.beginPath()
        g.arc(x + ox, y, d * 0.55, 0, Math.PI * 2)
        g.fill()
      }
    }
  },
  /** breathable sports mesh: rows of tiny holes */
  mesh: (g) => {
    g.fillStyle = grey(0.95)
    g.fillRect(0, 0, SIZE, SIZE)
    g.fillStyle = grey(0.35)
    for (let y = 6; y < SIZE; y += 14)
      for (let x = (Math.round(y / 14) % 2) * 7; x < SIZE; x += 14) {
        g.beginPath()
        g.arc(x, y, 2.8, 0, Math.PI * 2)
        g.fill()
      }
  },
  /** fleece: soft fuzzy noise */
  fleece: (g, r) => {
    g.fillStyle = grey(0.9)
    g.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = grey(0.75 + r() * 0.25, 0.6)
      g.fillRect(r() * SIZE, r() * SIZE, 1 + r() * 3, 1 + r() * 3)
    }
  },
  /** woven cotton: fine criss-cross threads */
  fabric: (g, r) => {
    g.fillStyle = grey(0.94)
    g.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < SIZE; i += 4) {
      g.fillStyle = grey(0.86 + r() * 0.08, 0.7)
      g.fillRect(i, 0, 1.5, SIZE)
      g.fillStyle = grey(0.88 + r() * 0.08, 0.7)
      g.fillRect(0, i, SIZE, 1.5)
    }
    speckle(g, r, 2400, 0.8, 1, 2)
  },
  /** denim twill: diagonal ribs with fading */
  denim: (g, r) => {
    g.fillStyle = grey(0.9)
    g.fillRect(0, 0, SIZE, SIZE)
    g.lineWidth = 1.8
    for (let i = -SIZE; i < SIZE * 2; i += 6) {
      g.strokeStyle = grey(0.74 + r() * 0.18, 0.75)
      g.beginPath()
      g.moveTo(i, 0)
      g.lineTo(i + SIZE, SIZE)
      g.stroke()
    }
    speckle(g, r, 3000, 0.65, 1, 2)
  },
  /** hair: fine vertical strands with a soft shine band */
  hairstrand: (g, r) => {
    g.fillStyle = grey(0.82)
    g.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < SIZE; i += 3) {
      g.strokeStyle = grey(0.55 + r() * 0.45, 0.8)
      g.lineWidth = 1 + r() * 1.5
      g.beginPath()
      g.moveTo(i, 0)
      g.bezierCurveTo(i + (r() - 0.5) * 10, SIZE * 0.3, i + (r() - 0.5) * 10, SIZE * 0.7, i + (r() - 0.5) * 5, SIZE)
      g.stroke()
    }
    const grd = g.createLinearGradient(0, 0, 0, SIZE)
    grd.addColorStop(0.2, grey(1, 0))
    grd.addColorStop(0.35, grey(1, 0.3))
    grd.addColorStop(0.5, grey(1, 0))
    g.fillStyle = grd
    g.fillRect(0, 0, SIZE, SIZE)
  },
  /** skin: soft tone variation */
  skin: (g, r) => {
    g.fillStyle = grey(0.97)
    g.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < 60; i++) {
      const x = r() * SIZE
      const y = r() * SIZE
      const rad = 30 + r() * 60
      const grd = g.createRadialGradient(x, y, 0, x, y, rad)
      const v = 0.9 + r() * 0.1
      grd.addColorStop(0, grey(v, 0.35))
      grd.addColorStop(1, grey(v, 0))
      g.fillStyle = grd
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    speckle(g, r, 300, 0.82, 0.95, 2)
  },
  /** very soft plastic grain, used on standard bricks */
  grain: (g, r) => {
    g.fillStyle = grey(0.97)
    g.fillRect(0, 0, SIZE, SIZE)
    speckle(g, r, 5000, 0.9, 1, 2)
  },
  grass: (g, r) => {
    g.fillStyle = grey(0.9)
    g.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < 120; i++) {
      const x = r() * SIZE
      const y = r() * SIZE
      const rad = 20 + r() * 50
      const grd = g.createRadialGradient(x, y, 0, x, y, rad)
      const v = r() > 0.5 ? 1 : 0.78
      grd.addColorStop(0, grey(v, 0.35))
      grd.addColorStop(1, grey(v, 0))
      g.fillStyle = grd
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    for (let i = 0; i < 2800; i++) {
      const x = r() * SIZE
      const y = r() * SIZE
      g.strokeStyle = grey(0.62 + r() * 0.38, 0.6)
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (r() - 0.5) * 5, y - 3 - r() * 6)
      g.stroke()
    }
  },

  /* ---- ARCHITECTURAL IMPROVEMENTS ---- */

  /** High-Definition Modern Plaza Stone Pavers with 3D Chamfered Bevels */
  paving: (g, r) => {
    g.fillStyle = grey(0.48)
    g.fillRect(0, 0, SIZE, SIZE)
    const n = 5
    const t = SIZE / n
    const m = 3.5
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = i * t + m
        const y = j * t + m
        const w = t - m * 2
        const h = t - m * 2
        const v = 0.86 + r() * 0.14
        g.fillStyle = grey(v)
        g.beginPath()
        g.roundRect(x, y, w, h, 3)
        g.fill()
        // Natural cleft stone diagonal relief
        const grd = g.createLinearGradient(x, y, x + w, y + h)
        grd.addColorStop(0, grey(1, 0.24))
        grd.addColorStop(0.5, grey(0.5, 0))
        grd.addColorStop(1, grey(0, 0.28))
        g.fillStyle = grd
        g.fillRect(x, y, w, h)
      }
    }
    speckle(g, r, 2500, 0.68, 1.05, 2.5)
  },

  /** High-Detail Mineral Road Asphalt with Bitumen Binder & Micro-Gravel */
  asphalt: (g, r) => {
    g.fillStyle = grey(0.88)
    g.fillRect(0, 0, SIZE, SIZE)
    // Quartz & basalt mineral chips
    speckle(g, r, 9500, 0.58, 1.1, 2)
    // Bitumen tar binder specks
    speckle(g, r, 3500, 0.4, 0.65, 3)
    // Smooth lane tire wear tracks
    g.fillStyle = grey(0.78, 0.2)
    g.fillRect(SIZE * 0.18, 0, 48, SIZE)
    g.fillRect(SIZE * 0.68, 0, 48, SIZE)
  },

  /** Modern Architectural Timber Siding with Grain, V-Grooves & Knots */
  wood: (g, r) => {
    const planks = 6
    const h = SIZE / planks
    for (let p = 0; p < planks; p++) {
      const v = 0.86 + r() * 0.14
      g.fillStyle = grey(v)
      g.fillRect(0, p * h, SIZE, h)
      // Plank bevel highlights & shadow line
      g.fillStyle = grey(1, 0.22)
      g.fillRect(0, p * h + 1, SIZE, 2.5)
      g.fillStyle = grey(0.35)
      g.fillRect(0, (p + 1) * h - 2.5, SIZE, 2.5)
      // Longitudinal woodgrain fibers
      for (let k = 0; k < 26; k++) {
        const y = p * h + r() * h
        g.strokeStyle = grey(0.58 + r() * 0.25, 0.45)
        g.lineWidth = 1 + r() * 1.2
        g.beginPath()
        g.moveTo(0, y)
        g.bezierCurveTo(SIZE * 0.3, y + (r() - 0.5) * 8, SIZE * 0.7, y + (r() - 0.5) * 8, SIZE, y + (r() - 0.5) * 4)
        g.stroke()
      }
      // Natural knots
      if (r() > 0.45) {
        const kx = r() * SIZE
        const ky = p * h + h / 2
        g.strokeStyle = grey(0.48, 0.7)
        g.lineWidth = 1.8
        g.beginPath()
        g.ellipse(kx, ky, 9 + r() * 5, 4.5 + r() * 2.5, 0, 0, Math.PI * 2)
        g.stroke()
      }
    }
  },

  /** Modern Running-Bond Brickwork with Recessed Mortar & Natural Tonal Shift */
  brick: (g, r) => {
    g.fillStyle = grey(0.42)
    g.fillRect(0, 0, SIZE, SIZE)
    const rows = 12
    const cols = 6
    const bh = SIZE / rows
    const bw = SIZE / cols
    const m = 3
    for (let j = 0; j < rows; j++) {
      for (let i = -1; i < cols + 1; i++) {
        const off = j % 2 ? bw / 2 : 0
        const x = i * bw + off + m
        const y = j * bh + m
        const w = bw - m * 2
        const h = bh - m * 2
        const v = 0.82 + r() * 0.18
        g.fillStyle = grey(v)
        g.beginPath()
        g.roundRect(x, y, w, h, 2)
        g.fill()
        // Top bevel highlight
        g.fillStyle = grey(1, 0.22)
        g.fillRect(x + 1, y + 1, w - 2, 2)
        // Bottom-right shadow
        g.fillStyle = grey(0, 0.22)
        g.fillRect(x + 1, y + h - 2, w - 2, 2)
        g.fillRect(x + w - 2, y + 1, 2, h - 2)
      }
    }
    speckle(g, r, 3000, 0.65, 1, 2.5)
  },

  /** Layered Architectural Slate Roof Shingles with 3D Drop Shadows */
  roof: (g, r) => {
    g.fillStyle = grey(0.85)
    g.fillRect(0, 0, SIZE, SIZE)
    const rows = 10
    const h = SIZE / rows
    for (let j = 0; j < rows; j++) {
      const cols = 8
      const w = SIZE / cols
      for (let i = 0; i < cols + 1; i++) {
        const off = j % 2 ? w / 2 : 0
        const v = 0.84 + r() * 0.16
        g.fillStyle = grey(v)
        g.beginPath()
        g.roundRect(i * w - off, j * h, w - 2, h + 4, 3)
        g.fill()
        // Shingle top highlight
        g.fillStyle = grey(1, 0.18)
        g.fillRect(i * w - off + 1, j * h + 1, w - 4, 2)
      }
      // Drop shadow cast on lower shingle tier
      g.fillStyle = grey(0.38, 0.6)
      g.fillRect(0, (j + 1) * h - 3, SIZE, 3)
    }
    speckle(g, r, 1800, 0.7, 1, 2.5)
  },

  /** Architectural Smooth Fair-Faced Concrete with Formwork Tie Holes */
  concrete: (g, r) => {
    g.fillStyle = grey(0.92)
    g.fillRect(0, 0, SIZE, SIZE)
    speckle(g, r, 4500, 0.75, 1.05, 2.5)
    // Formwork seams
    g.fillStyle = grey(0.65, 0.4)
    g.fillRect(0, SIZE / 2 - 1, SIZE, 2)
    g.fillRect(SIZE / 2 - 1, 0, 2, SIZE)
    // Formwork tie-rod holes
    const pts = [
      [SIZE * 0.25, SIZE * 0.25],
      [SIZE * 0.75, SIZE * 0.25],
      [SIZE * 0.25, SIZE * 0.75],
      [SIZE * 0.75, SIZE * 0.75],
    ]
    for (const [cx, cy] of pts) {
      g.beginPath()
      g.arc(cx, cy, 7, 0, Math.PI * 2)
      g.fillStyle = grey(0.52)
      g.fill()
      g.beginPath()
      g.arc(cx, cy, 4, 0, Math.PI * 2)
      g.fillStyle = grey(0.76)
      g.fill()
    }
  },

  /** Monocrystalline Photovoltaic Silicon Solar Array with Silver Busbars */
  solarpanel: (g, r) => {
    g.fillStyle = grey(0.88)
    g.fillRect(0, 0, SIZE, SIZE)
    const n = 4
    const t = SIZE / n
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        g.fillStyle = grey(0.95 + r() * 0.05)
        g.fillRect(i * t + 3, j * t + 3, t - 6, t - 6)
        // Silver grid busbars
        g.fillStyle = grey(1, 0.8)
        g.fillRect(i * t + 3, j * t + t / 2 - 1, t - 6, 2)
        g.fillRect(i * t + t / 2 - 1, j * t + 3, 2, t - 6)
      }
    }
    // Panel aluminium borders
    g.strokeStyle = grey(0.4)
    g.lineWidth = 3
    for (let i = 0; i <= n; i++) {
      g.beginPath()
      g.moveTo(i * t, 0)
      g.lineTo(i * t, SIZE)
      g.moveTo(0, i * t)
      g.lineTo(SIZE, i * t)
      g.stroke()
    }
  },

  sand: (g, r) => {
    g.fillStyle = grey(0.95)
    g.fillRect(0, 0, SIZE, SIZE)
    speckle(g, r, 6500, 0.8, 1.05, 2)
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = grey(0.85, 0.25)
      g.lineWidth = 2.5
      g.beginPath()
      const y = r() * SIZE
      g.moveTo(0, y)
      g.quadraticCurveTo(SIZE / 2, y + (r() - 0.5) * 30, SIZE, y)
      g.stroke()
    }
  },
  soil: (g, r) => {
    g.fillStyle = grey(0.9)
    g.fillRect(0, 0, SIZE, SIZE)
    speckle(g, r, 4000, 0.55, 1, 5)
    for (let i = 0; i < 16; i++) {
      g.strokeStyle = grey(0.7, 0.5)
      g.lineWidth = 4
      const y = (i + 0.5) * (SIZE / 16)
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(SIZE, y)
      g.stroke()
    }
  },
}

const base = new Map<TexName, THREE.CanvasTexture>()
const cache = new Map<string, THREE.Texture>()

function source(name: TexName) {
  let t = base.get(name)
  if (!t) {
    const c = document.createElement('canvas')
    c.width = c.height = SIZE
    const g = c.getContext('2d')!
    DRAW[name](g, rng(name.length * 7919 + name.charCodeAt(0) * 31))
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    base.set(name, t)
  }
  return t
}

/** A texture tiled `rx` × `rz` times (shared between everything that asks for the same tiling) */
export function getTexture(name: TexName, rx = 1, rz = rx): THREE.Texture {
  const key = `${name}:${rx.toFixed(2)}:${rz.toFixed(2)}`
  let t = cache.get(key)
  if (!t) {
    const src = source(name)
    t = src.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, rz)
    t.needsUpdate = true
    cache.set(key, t)
  }
  return t
}

/* ------------------------------------------------------------------ */
/* FULL-COLOUR TEXTURES FOR CLOTHING & SPECIAL ITEMS                   */
/* ------------------------------------------------------------------ */

const fullCache = new Map<string, THREE.CanvasTexture>()

export function galaxyTexture(): THREE.Texture {
  let t = fullCache.get('galaxy')
  if (!t) {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(128, 128, 10, 128, 128, 140)
    grd.addColorStop(0, '#312e81')
    grd.addColorStop(0.5, '#1e1b4b')
    grd.addColorStop(1, '#090514')
    g.fillStyle = grd
    g.fillRect(0, 0, 256, 256)
    const r = rng(42)
    for (let i = 0; i < 90; i++) {
      const x = r() * 256
      const y = r() * 256
      const rad = 0.5 + r() * 1.5
      g.fillStyle = r() > 0.4 ? '#ffffff' : '#a5f3fc'
      g.beginPath()
      g.arc(x, y, rad, 0, Math.PI * 2)
      g.fill()
    }
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    fullCache.set('galaxy', t)
  }
  return t
}

export function gradientTexture(color1: string, color2: string): THREE.Texture {
  const key = `grad:${color1}:${color2}`
  let t = fullCache.get(key)
  if (!t) {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 256
    const g = c.getContext('2d')!
    const grd = g.createLinearGradient(0, 0, 0, 256)
    grd.addColorStop(0, color1)
    grd.addColorStop(1, color2)
    g.fillStyle = grd
    g.fillRect(0, 0, 64, 256)
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    fullCache.set(key, t)
  }
  return t
}

export function camoTexture(): THREE.Texture {
  let t = fullCache.get('camo')
  if (!t) {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    g.fillStyle = '#4d5d3e'
    g.fillRect(0, 0, 256, 256)
    const colors = ['#283618', '#606c38', '#bc6c25', '#dda15e']
    const r = rng(101)
    for (let i = 0; i < 40; i++) {
      g.fillStyle = colors[i % colors.length]
      g.beginPath()
      const cx = r() * 256
      const cy = r() * 256
      g.ellipse(cx, cy, 16 + r() * 28, 12 + r() * 22, r() * Math.PI, 0, Math.PI * 2)
      g.fill()
    }
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    fullCache.set('camo', t)
  }
  return t
}
