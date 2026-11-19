import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Group } from 'three'
import { distToPlayer } from '../../state/sceneRegistry'
import { preset } from '../../state/settings'
import { useSway } from './Nature'
import { getTexture, type TexName } from './textures'

export type V3 = [number, number, number]

/** Glossy LEGO-like plastic */
export function Plastic({ color, roughness = 0.38, metalness = 0, emissive, map, bump = 0.35 }: { color: string; roughness?: number; metalness?: number; emissive?: string; map?: THREE.Texture; bump?: number }) {
  const tex = map ?? getTexture('grain')
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive ?? '#000000'} map={tex} bumpMap={tex} bumpScale={bump} />
}

/* Shared materials that the day/night cycle updates once per frame */
export const sharedMaterials = {
  lampGlow: new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffd84d', emissiveIntensity: 0.2 }),
  windowGlow: new THREE.MeshStandardMaterial({ color: '#9ad7ff', emissive: '#ffcf6b', emissiveIntensity: 0, roughness: 0.15 }),
  wastedLight: new THREE.MeshStandardMaterial({ color: '#fff7c2', emissive: '#ffd23f', emissiveIntensity: 1.2 }),
  water: new THREE.MeshStandardMaterial({ color: '#3fa9e0', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 }),
}

interface BlockProps {
  position?: V3
  size: V3
  color: string
  rotation?: V3
  cast?: boolean
  receive?: boolean
  roughness?: number
  material?: THREE.Material
  /** surface texture, tiled once every `texScale` world units */
  tex?: TexName
  texScale?: number
  bump?: number
}

/** A simple box brick */
export function Block({ position = [0, 0, 0], size, color, rotation, cast = true, receive = true, roughness, material, tex, texScale = 2, bump }: BlockProps) {
  const map = useMemo(() => {
    if (!tex) return undefined
    const flat = size[1] <= Math.min(size[0], size[2])
    return flat ? getTexture(tex, size[0] / texScale, size[2] / texScale) : getTexture(tex, Math.max(size[0], size[2]) / texScale, size[1] / texScale)
  }, [tex, texScale, size[0], size[1], size[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow={receive} material={material}>
      <boxGeometry args={size} />
      {!material && <Plastic color={color} roughness={roughness} map={map} bump={bump} />}
    </mesh>
  )
}

/** A grid of LEGO studs on top of a brick */
export function Studs({ width, depth, y, color, spacing = 0.5 }: { width: number; depth: number; y: number; color: string; spacing?: number }) {
  const nx = Math.max(1, Math.floor(width / spacing))
  const nz = Math.max(1, Math.floor(depth / spacing))
  const studs: V3[] = []
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) studs.push([(i - (nx - 1) / 2) * spacing, y + 0.05, (j - (nz - 1) / 2) * spacing])
  return (
    <group>
      {studs.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <cylinderGeometry args={[spacing * 0.28, spacing * 0.28, 0.1, 12]} />
          <Plastic color={color} />
        </mesh>
      ))}
    </group>
  )
}

/** Screen-space HTML label anchored to a 3D point; sits below the HUD and never blocks input */
export function Label({ position, children, className = '' }: { position: V3; children: ReactNode; className?: string }) {
  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }} className={className}>
      {children}
    </Html>
  )
}

/**
 * Renders children only while the player is within `r` world units.
 * Keeps the big map fast by not drawing far-away HTML labels.
 */
export function Near({ x, z, r = 18, children, getPos }: { x?: number; z?: number; r?: number; children: ReactNode; getPos?: () => [number, number] }) {
  const [on, setOn] = useState(false)
  const last = useRef(false)
  const range = r * preset().labelRange * 0.55 // chips only show when you are close
  useFrame(() => {
    const [px, pz] = getPos ? getPos() : [x ?? 0, z ?? 0]
    const v = distToPlayer(px, pz) < range
    if (v !== last.current) {
      last.current = v
      setOn(v)
    }
  })
  return on ? <>{children}</> : null
}

/** Voxel / brick tree like in the reference art */
export function LegoTree({ position, scale = 1, tone = 0 }: { position: V3; scale?: number; tone?: number }) {
  const greens = ['#3fa63a', '#4cb944', '#2f9a3a']
  const g = greens[Math.abs(tone) % greens.length]
  const sway = useSway(position[0] * 0.37 + position[2] * 0.21, 1 / scale)
  return (
    <group position={position} scale={scale}>
      <Block position={[0, 0.6, 0]} size={[0.5, 1.2, 0.5]} color="#8a5a2b" tex="wood" texScale={0.8} />
      <group ref={sway} position={[0, 1.1, 0]}>
        <Block position={[0, 0.6, 0]} size={[2, 1.2, 2]} color={g} tex="grass" texScale={1.2} />
        <Block position={[0, 1.65, 0]} size={[1.5, 0.9, 1.5]} color={g} tex="grass" texScale={1.2} />
        <Block position={[0, 2.4, 0]} size={[0.9, 0.6, 0.9]} color={g} tex="grass" texScale={1.2} />
        <Studs width={0.9} depth={0.9} y={2.7} color={g} spacing={0.45} />
      </group>
    </group>
  )
}

/** Stacked-brick pine tree for forests */
export function LegoPine({ position, scale = 1, tone = 0 }: { position: V3; scale?: number; tone?: number }) {
  const g = ['#1f7a3a', '#277f3f', '#2d8f46'][Math.abs(tone) % 3]
  const sway = useSway(position[0] * 0.41 + position[2] * 0.17, 0.8 / scale)
  return (
    <group position={position} scale={scale}>
      <Block position={[0, 0.5, 0]} size={[0.45, 1, 0.45]} color="#7a4a24" tex="wood" texScale={0.8} />
      <group ref={sway} position={[0, 0.9, 0]}>
        {[2.2, 1.7, 1.2, 0.7].map((w, i) => (
          <Block key={i} position={[0, 0.4 + i * 0.85, 0]} size={[w, 0.8, w]} color={g} tex="grass" texScale={1.2} />
        ))}
        <Block position={[0, 3.7, 0]} size={[0.3, 0.4, 0.3]} color={g} />
      </group>
    </group>
  )
}

/** Scales its children in with a springy pop when first mounted */
export function GrowIn({ children, position, delay = 0 }: { children: ReactNode; position?: V3; delay?: number }) {
  const ref = useRef<Group>(null)
  const t = useRef(-delay)
  useFrame((_, dt) => {
    if (!ref.current || t.current > 1.2) return
    t.current += dt
    const x = Math.max(0, Math.min(1, t.current / 0.8))
    const c = 1.9
    const s = x === 0 ? 0.001 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2)
    ref.current.scale.setScalar(Math.max(0.001, s))
  })
  return (
    <group ref={ref} position={position} scale={0.001}>
      {children}
    </group>
  )
}

/** Floating marker pill used for activity hints */
export function Marker({ emoji, text, color = 'bg-white' }: { emoji: string; text?: string; color?: string }) {
  return (
    <div className={`flex animate-[float_2s_ease-in-out_infinite] items-center gap-1 whitespace-nowrap rounded-full ${color} px-2 py-0.5 text-sm font-bold text-slate-800 shadow-md ring-2 ring-white`}>
      <span className="text-lg leading-none">{emoji}</span>
      {text && <span>{text}</span>}
    </div>
  )
}

/**
 * Twinkling sparkle particles (instanced). Used instead of drei <Sparkles>,
 * whose point sprites can blow up into big squares with an orthographic camera.
 */
export function Twinkles({ position = [0, 0, 0], scale = [4, 2, 4], count = 20, color = '#fef08a', size = 0.08 }: { position?: V3; scale?: V3; count?: number; color?: string; size?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * scale[0], y: Math.random() * scale[1], z: (Math.random() - 0.5) * scale[2], p: Math.random() * 10, s: 0.6 + Math.random() * 0.8 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, scale.join(',')],
  )
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.elapsedTime
    seeds.forEach((d, i) => {
      const k = Math.max(0.05, Math.sin(t * 2 * d.s + d.p)) * size * d.s * 10
      v.set(d.x + Math.sin(t * 0.5 + d.p) * 0.3, d.y + Math.sin(t * 0.8 + d.p) * 0.25, d.z)
      sc.set(k, k, k)
      m.compose(v, q, sc)
      mesh.current!.setMatrixAt(i, m)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} position={position}>
      <octahedronGeometry args={[0.1, 0]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
    </instancedMesh>
  )
}

/**
 * A real name board: a framed panel with the text painted on it (a canvas texture),
 * to be mounted on a wall, gate or post instead of a floating label.
 */
export function Sign3D({
  text,
  position,
  rotation = [0, 0, 0],
  width = 3,
  height = 0.7,
  bg = '#1e3a8a',
  fg = '#ffffff',
  border = '#fbbf24',
}: {
  text: string
  position: V3
  rotation?: V3
  width?: number
  height?: number
  bg?: string
  fg?: string
  border?: string
}) {
  const tex = useMemo(() => {
    const W = 1024
    const H = Math.max(64, Math.round((W * height) / width))
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    const r = H * 0.16
    g.fillStyle = border
    g.beginPath()
    g.roundRect(0, 0, W, H, r)
    g.fill()
    g.fillStyle = bg
    g.beginPath()
    g.roundRect(H * 0.07, H * 0.07, W - H * 0.14, H - H * 0.14, r * 0.7)
    g.fill()
    // fit the text: one line at full size, then a smaller one-liner, then two smaller lines
    const maxW = W * 0.9
    const font = (px: number) => `700 ${px}px Inter, system-ui, sans-serif`
    let size = H * 0.56
    let lines = [text]
    g.font = font(size)
    while (g.measureText(text).width > maxW && size > H * 0.4) {
      size -= 2
      g.font = font(size)
    }
    if (g.measureText(text).width > maxW) {
      const words = text.split(' ')
      if (words.length > 1) {
        let best = Infinity
        for (let i = 1; i < words.length; i++) {
          const l1 = words.slice(0, i).join(' ')
          const l2 = words.slice(i).join(' ')
          g.font = font(H * 0.36)
          const m = Math.max(g.measureText(l1).width, g.measureText(l2).width)
          if (m < best) {
            best = m
            lines = [l1, l2]
          }
        }
        size = H * 0.36
      }
      g.font = font(size)
      while (lines.some((l) => g.measureText(l).width > maxW) && size > 10) {
        size -= 2
        g.font = font(size)
      }
    }
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.08 + size * 0.04))
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [text, width, height, bg, fg, border])
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[width + 0.1, height + 0.1, 0.06]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.22} roughness={0.6} />
      </mesh>
    </group>
  )
}
