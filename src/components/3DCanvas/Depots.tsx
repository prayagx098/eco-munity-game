import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import { useGame } from '../../state/gameStore'
import { depot } from '../../state/sceneRegistry'
import { BIN_CAP, COMPOST_YARD, RECYCLING_CENTER, WASTE_PLANT } from '../../state/world'
import { Block, Plastic, Sign3D, sharedMaterials } from './primitives'

const centre = (r: { x0: number; x1: number; z0: number; z1: number }): [number, number, number, number] => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0, r.z1 - r.z0]

/** A column of smoke puffs that rise and fade. `rate` can change from frame to frame (busy machines smoke more). */
function Smoke({ position, color = '#d1d5db', count = 6, rise = 3.5, rate }: { position: [number, number, number]; color?: string; count?: number; rise?: number; rate: () => number }) {
  const puffs = useRef<Mesh[]>([])
  useFrame(({ clock }) => {
    const k = rate()
    puffs.current.forEach((m, i) => {
      if (!m) return
      const t = (clock.elapsedTime * (0.25 + k * 0.25) + i / count) % 1
      m.position.set(Math.sin(i * 2 + clock.elapsedTime * 0.4) * 0.25 * t, t * rise, Math.cos(i * 3) * 0.2 * t)
      m.scale.setScalar(0.25 + t * 0.9)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = (1 - t) * 0.45 * Math.min(1, 0.3 + k)
    })
  })
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) puffs.current[i] = m
          }}
        >
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Items riding a conveyor belt; faster while a truck is unloading */
function Belt({ position, length, active, colors }: { position: [number, number, number]; length: number; active: () => boolean; colors: string[] }) {
  const items = useRef<Mesh[]>([])
  const phase = useRef(0)
  useFrame((_, dt) => {
    phase.current += dt * (active() ? 1.4 : 0.35)
    items.current.forEach((m, i) => {
      if (!m) return
      const t = (phase.current / length + i / colors.length) % 1
      m.position.set((t - 0.5) * length, 0.2, 0)
      m.rotation.y = i
    })
  })
  return (
    <group position={position}>
      <Block position={[0, 0, 0]} size={[length + 0.4, 0.2, 0.9]} color="#475569" />
      <Block position={[0, 0.12, 0]} size={[length, 0.05, 0.7]} color="#1f2937" cast={false} />
      {colors.map((c, i) => (
        <mesh
          key={i}
          castShadow
          ref={(m) => {
            if (m) items.current[i] = m
          }}
        >
          <boxGeometry args={[0.3, 0.28, 0.3]} />
          <Plastic color={c} />
        </mesh>
      ))}
    </group>
  )
}

/** The Recycling Center now works: its belt runs, the drum turns, smoke rises and bales pile up with every delivery */
export function RecyclingCenter() {
  const [cx, cz, w, d] = centre(RECYCLING_CENTER)
  const delivered = useGame((s) => s.delivered.recycle)
  const bales = ['#3b82f6', '#22c55e', '#f59e0b', '#94a3b8', '#ef4444', '#a855f7', '#14b8a6', '#f97316', '#84cc16']
  const count = Math.min(9, 2 + Math.floor(delivered / BIN_CAP))
  const drum = useRef<Mesh>(null)
  const led = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }, dt) => {
    if (drum.current) drum.current.rotation.x += dt * (depot.recycle ? 3 : 0.8)
    if (led.current) led.current.emissiveIntensity = Math.floor(clock.elapsedTime * (depot.recycle ? 6 : 2)) % 2 ? 2 : 0.2
  })
  return (
    <group position={[cx, 0, cz]}>
      <Block position={[0, 1.8, 0]} size={[w, 3.6, d]} color="#a7f3d0" tex="brick" texScale={1.6} />
      <Block position={[0, 3.75, 0]} size={[w + 0.5, 0.3, d + 0.5]} color="#047857" tex="roof" texScale={2} />
      <Block position={[w / 2 + 0.02, 1.3, 0]} size={[0.08, 2.6, 3]} color="#334155" />
      <Block position={[0, 2, d / 2 + 0.02]} size={[w - 2, 1, 0.08]} material={sharedMaterials.windowGlow} color="" />
      {/* roller door on the yard side */}
      <Block position={[-1, 1.3, d / 2 + 0.03]} size={[2.4, 2.6, 0.06]} color="#64748b" />
      {/* sorting drum on the roof and chimney */}
      <mesh ref={drum} position={[-1.5, 4.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 2.4, 12]} />
        <Plastic color="#10b981" roughness={0.5} />
      </mesh>
      <Block position={[-1.5, 4.55, 0]} size={[0.15, 1.4, 2.5]} color="#065f46" />
      <mesh position={[2.2, 5, -1]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 2.6, 10]} />
        <Plastic color="#94a3b8" />
      </mesh>
      <Smoke position={[2.2, 6.3, -1]} rate={() => (depot.recycle ? 1.5 : 0.5)} />
      <mesh position={[3, 4.2, 1.2]}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial ref={led} color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
      </mesh>
      {/* conveyor with moving items + bales */}
      <Belt position={[w / 2 + 2.2, 0.6, 2]} length={3.4} active={() => depot.recycle} colors={['#5ec8f2', '#e8505b', '#e9e4d4', '#c8935a', '#5ec8f2', '#f4f7fb']} />
      {bales.slice(0, count).map((c, i) => (
        <Block key={i} position={[w / 2 + 1.2 + (i % 3) * 1.1, 0.45 + Math.floor(i / 3) * 0.9, -1.8]} size={[1, 0.9, 1]} color={c} />
      ))}
      <Sign3D text="♻️ Recycling Center" position={[0, 3.2, d / 2 + 0.06]} width={5} height={0.8} bg="#047857" border="#a7f3d0" />
    </group>
  )
}

/** Waste-to-Energy Plant: trash from the blue bins is burned here to make electricity */
export function WastePlant() {
  const [cx, cz, w, d] = centre(WASTE_PLANT)
  const glow = useRef<THREE.MeshStandardMaterial>(null)
  const stackLight = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const busy = depot.trash
    if (glow.current) glow.current.emissiveIntensity = (busy ? 2.4 : 0.7) + Math.sin(clock.elapsedTime * (busy ? 9 : 3)) * (busy ? 0.7 : 0.25)
    if (stackLight.current) stackLight.current.emissiveIntensity = Math.floor(clock.elapsedTime * 2) % 2 ? 2 : 0.1
  })
  return (
    <group position={[cx, 0, cz]}>
      <Block position={[0, 1.7, 0]} size={[w, 3.4, d]} color="#cbd5e1" tex="brick" texScale={1.6} />
      <Block position={[0, 3.55, 0]} size={[w + 0.4, 0.3, d + 0.4]} color="#334155" tex="roof" texScale={2} />
      <Block position={[0, 1.2, d / 2 + 0.03]} size={[2.2, 2.4, 0.06]} color="#475569" />
      <Block position={[-w / 2 - 0.03, 1.5, 0]} size={[0.06, 2.2, 2.6]} color="#1f2937" />
      {/* furnace window glows while the plant is burning waste */}
      <mesh position={[-w / 2 - 0.07, 1.3, 0]}>
        <boxGeometry args={[0.05, 1.2, 1.6]} />
        <meshStandardMaterial ref={glow} color="#f97316" emissive="#f97316" emissiveIntensity={0.8} />
      </mesh>
      {/* hopper where the truck tips its load */}
      <Block position={[-w / 2 - 0.8, 0.8, -1.2]} size={[1.4, 1.6, 1.4]} color="#64748b" />
      <Block position={[-w / 2 - 0.8, 1.7, -1.2]} size={[1.8, 0.2, 1.8]} color="#475569" />
      {/* tall chimney with smoke, plus an aircraft light */}
      <mesh position={[2.2, 5.4, -0.8]} castShadow>
        <cylinderGeometry args={[0.7, 1, 7.6, 12]} />
        <Plastic color="#e2e8f0" />
      </mesh>
      {[4.2, 5.6].map((y) => (
        <mesh key={y} position={[2.2, y, -0.8]}>
          <cylinderGeometry args={[0.76, 0.84, 0.4, 12]} />
          <Plastic color="#ef4444" />
        </mesh>
      ))}
      <mesh position={[2.2, 9.35, -0.8]}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial ref={stackLight} color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
      </mesh>
      <Smoke position={[2.2, 9.4, -0.8]} color="#9ca3af" count={8} rise={4.5} rate={() => (depot.trash ? 2 : 0.7)} />
      {/* power lines symbol on the roof */}
      <Block position={[-1.5, 3.95, 0.5]} size={[2.4, 0.5, 1.6]} color="#1d4ed8" />
      <Sign3D text="⚡ Waste-to-Energy Plant" position={[0, 2.95, d / 2 + 0.09]} width={4.8} height={0.8} bg="#334155" border="#fde68a" />
    </group>
  )
}

/** The compost heap at Happy Farm: it grows with every compost delivery and steams while the truck tips its load */
export function CompostYard() {
  const delivered = useGame((s) => s.delivered.compost)
  const mound = useRef<Mesh>(null)
  const target = 1 + Math.min(1.1, delivered / (BIN_CAP * 4))
  useFrame((_, dt) => {
    if (!mound.current) return
    const want = target + (depot.compost ? 0.15 : 0)
    mound.current.scale.x += (want - mound.current.scale.x) * Math.min(1, dt * 2)
    mound.current.scale.z = mound.current.scale.x
    mound.current.scale.y = mound.current.scale.x * 0.85
  })
  return (
    <group position={[COMPOST_YARD[0], 0, COMPOST_YARD[1]]}>
      <Block position={[0, 0.1, 0]} size={[3.6, 0.2, 3.2]} color="#a4643a" tex="wood" texScale={1.4} />
      <mesh ref={mound} position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[1.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a2f1b" roughness={1} />
      </mesh>
      <Smoke position={[0, 1.2, 0]} color="#e5e7eb" count={5} rise={2.2} rate={() => (depot.compost ? 1.6 : 0.5)} />
      <Sign3D text={`🌱 Compost ${delivered}`} position={[0, 1.1, 1.8]} width={2.4} height={0.5} bg="#78350f" border="#fde68a" />
      <Block position={[-1.1, 0.55, 1.75]} size={[0.1, 1.1, 0.1]} color="#7a4a24" tex="wood" texScale={1} />
      <Block position={[1.1, 0.55, 1.75]} size={[0.1, 1.1, 0.1]} color="#7a4a24" tex="wood" texScale={1} />
    </group>
  )
}

