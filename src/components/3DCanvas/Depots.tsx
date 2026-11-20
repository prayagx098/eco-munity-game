import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import { useGame } from '../../state/gameStore'
import { depot } from '../../state/sceneRegistry'
import { BIN_CAP, ECO_HUB } from '../../state/world'
import { Block, Plastic, Sign3D } from './primitives'


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

const BAY_X = { compost: -8, recycle: 0, trash: 8 } as const
const W = ECO_HUB.x1 - ECO_HUB.x0 // 24
const D = ECO_HUB.z1 - ECO_HUB.z0 // 10
const H = 4.4

/** Compost bay: windrows of rotting scraps that grow with every delivery, steaming while the truck tips its load */
function CompostBay() {
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
    <group position={[BAY_X.compost, 0, 0]}>
      <Block position={[0, 0.14, 0]} size={[7.4, 0.06, 9.6]} color="#7c5a3a" cast={false} tex="soil" texScale={2} />
      <mesh ref={mound} position={[0, 0.17, 0.2]} castShadow>
        <sphereGeometry args={[1.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a2f1b" roughness={1} />
      </mesh>
      {/* timber bins along the back wall: finished compost, being turned */}
      {[-2.4, 0, 2.4].map((x, i) => (
        <group key={x} position={[x, 0, -3.6]}>
          <Block position={[0, 0.5, 0.9]} size={[2, 1, 0.12]} color="#a4643a" tex="wood" texScale={1.2} />
          <Block position={[-1, 0.5, 0]} size={[0.12, 1, 1.9]} color="#a4643a" tex="wood" texScale={1.2} />
          <Block position={[1, 0.5, 0]} size={[0.12, 1, 1.9]} color="#a4643a" tex="wood" texScale={1.2} />
          <mesh position={[0, 0.45, 0]} scale={[1, 0.6 + i * 0.15, 1]}>
            <sphereGeometry args={[0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={['#3b2515', '#4a2f1b', '#5b3a22'][i]} roughness={1} />
          </mesh>
        </group>
      ))}
      <Smoke position={[0, 1.4, 0.2]} color="#e5e7eb" count={6} rise={2.6} rate={() => (depot.compost ? 1.6 : 0.5)} />
      <Sign3D text={`🌱 Compost ${delivered}`} position={[0, 3.7, D / 2 + 0.2]} width={6.4} height={0.9} bg="#78350f" border="#fde68a" />
    </group>
  )
}

/** Recycling bay: the belt runs, the sorting drum on the roof turns and bales pile up with every delivery */
function RecyclingBay() {
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
    <group position={[BAY_X.recycle, 0, 0]}>
      <Block position={[0, 0.14, 0]} size={[7.4, 0.06, 9.6]} color="#9ca3af" cast={false} tex="paving" texScale={1.6} />
      <Belt position={[0, 0.6, -3.6]} length={5.6} active={() => depot.recycle} colors={['#5ec8f2', '#e8505b', '#e9e4d4', '#c8935a', '#5ec8f2', '#f4f7fb']} />
      {bales.slice(0, count).map((c, i) => (
        <Block key={i} position={[-2.6 + (i % 3) * 2.6, 0.65 + Math.floor(i / 3) * 1, -0.6]} size={[1.2, 1, 1.1]} color={c} />
      ))}
      {/* sorting drum, chimney and status light on the roof */}
      <mesh ref={drum} position={[-1.2, 5.3, -1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.75, 0.75, 2.6, 16]} />
        <Plastic color="#10b981" roughness={0.5} />
      </mesh>
      <Block position={[-1.2, 5.3, -1]} size={[0.15, 1.5, 2.7]} color="#065f46" />
      <mesh position={[2.4, 5.7, -3]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 2.6, 12]} />
        <Plastic color="#94a3b8" />
      </mesh>
      <Smoke position={[2.4, 7, -3]} rate={() => (depot.recycle ? 1.5 : 0.5)} />
      <mesh position={[3.3, 4.9, 3.5]}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial ref={led} color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
      </mesh>
      <Sign3D text="♻️ Recycling" position={[0, 3.7, D / 2 + 0.2]} width={6.4} height={0.9} bg="#047857" border="#a7f3d0" />
    </group>
  )
}

/** Waste-to-energy bay: trash is burned for electricity; the furnace glows and the tall stack smokes */
function EnergyBay() {
  const glow = useRef<THREE.MeshStandardMaterial>(null)
  const stackLight = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const busy = depot.trash
    if (glow.current) glow.current.emissiveIntensity = (busy ? 2.4 : 0.7) + Math.sin(clock.elapsedTime * (busy ? 9 : 3)) * (busy ? 0.7 : 0.25)
    if (stackLight.current) stackLight.current.emissiveIntensity = Math.floor(clock.elapsedTime * 2) % 2 ? 2 : 0.1
  })
  return (
    <group position={[BAY_X.trash, 0, 0]}>
      <Block position={[0, 0.14, 0]} size={[7.4, 0.06, 9.6]} color="#64748b" cast={false} tex="paving" texScale={1.6} />
      {/* furnace on the back wall with a glowing fire window */}
      <Block position={[0, 1.5, -4.2]} size={[4.2, 3, 1]} color="#334155" />
      <mesh position={[0, 1.2, -3.68]}>
        <boxGeometry args={[2.2, 1.2, 0.05]} />
        <meshStandardMaterial ref={glow} color="#f97316" emissive="#f97316" emissiveIntensity={0.8} />
      </mesh>
      {/* hopper where the truck tips its load */}
      <Block position={[0, 0.8, -1]} size={[3.2, 1.6, 2.4]} color="#64748b" />
      <Block position={[0, 1.7, -1]} size={[3.6, 0.2, 2.8]} color="#475569" />
      <Block position={[-2.8, 1.6, -3.4]} size={[1.2, 3.2, 1.2]} color="#1d4ed8" />
      {/* tall chimney with smoke, plus an aircraft light */}
      <mesh position={[3, 6, -3.2]} castShadow>
        <cylinderGeometry args={[0.7, 1, 8, 14]} />
        <Plastic color="#e2e8f0" />
      </mesh>
      {[4.8, 6.2].map((y) => (
        <mesh key={y} position={[3, y, -3.2]}>
          <cylinderGeometry args={[0.78, 0.86, 0.4, 14]} />
          <Plastic color="#ef4444" />
        </mesh>
      ))}
      <mesh position={[3, 10.1, -3.2]}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial ref={stackLight} color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
      </mesh>
      <Smoke position={[3, 10.1, -3.2]} color="#9ca3af" count={8} rise={4.5} rate={() => (depot.trash ? 2 : 0.7)} />
      <Sign3D text="⚡ Waste-to-Energy" position={[0, 3.7, D / 2 + 0.2]} width={6.4} height={0.9} bg="#334155" border="#fde68a" />
    </group>
  )
}

/** The Eco Waste Hub: ONE building, three bays (compost | recycling | waste-to-energy), each opening onto a shared yard */
export function EcoHub() {
  const cx = (ECO_HUB.x0 + ECO_HUB.x1) / 2
  const cz = (ECO_HUB.z0 + ECO_HUB.z1) / 2
  const roofs = ['#a16207', '#047857', '#334155']
  return (
    <group position={[cx, 0, cz]}>
      {/* shell: back wall, side walls, two partitions between the bays, floor */}
      <Block position={[0, 0.05, 0]} size={[W, 0.1, D]} color="#cbd5e1" cast={false} tex="paving" texScale={2} />
      <Block position={[0, H / 2, -D / 2 + 0.2]} size={[W, H, 0.4]} color="#e2e8f0" tex="brick" texScale={1.8} />
      {[-1, 1].map((sd) => (
        <Block key={sd} position={[sd * (W / 2 - 0.2), H / 2, 0]} size={[0.4, H, D]} color="#e2e8f0" tex="brick" texScale={1.8} />
      ))}
      {[-4, 4].map((x) => (
        <Block key={x} position={[x, H / 2, 0]} size={[0.3, H, D]} color="#f1f5f9" tex="brick" texScale={1.8} />
      ))}
      {/* front: columns by the partitions and a deep fascia beam over the three openings */}
      {[-W / 2 + 0.3, -4, 4, W / 2 - 0.3].map((x) => (
        <Block key={x} position={[x, 1.7, D / 2 - 0.15]} size={[0.6, 3.4, 0.5]} color="#94a3b8" />
      ))}
      <Block position={[0, 3.7, D / 2 - 0.1]} size={[W, 1.4, 0.4]} color="#f8fafc" tex="brick" texScale={1.8} />
      {/* one roof slab, each bay with its own coloured strip */}
      <Block position={[0, H + 0.15, 0]} size={[W + 0.8, 0.3, D + 0.8]} color="#475569" tex="roof" texScale={2} />
      {roofs.map((c, i) => (
        <Block key={c} position={[(i - 1) * 8, H + 0.38, 0]} size={[7.6, 0.16, D + 0.5]} color={c} cast={false} />
      ))}
      <Sign3D text="♻️ ECO WASTE HUB" position={[0, H + 1.1, D / 2 + 0.2]} width={9} height={1.1} bg="#064e3b" border="#a7f3d0" />
      <CompostBay />
      <RecyclingBay />
      <EnergyBay />
    </group>
  )
}
