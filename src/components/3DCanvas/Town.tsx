import { useMemo, useRef } from 'react'
import { InstancedTrees } from './InstancedTrees'
import { InstancedFlowers } from './InstancedFlowers'
import { LearningCentre } from './LearningCentre'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { Block, Label, Marker, Near, Plastic, Sign3D, sharedMaterials, type V3 } from './primitives'
import { useGame, getTownEcoStatus } from '../../state/gameStore'
import { env } from '../../state/sceneRegistry'
import {
  BARN,
  BENCHES,
  BEACH,
  PIER,
  SEA,
  FLOWER_BEDS,
  GARDEN_PLOTS,
  HOUSES,
  LAMPS,
  RECYCLING_CENTER,
  ROAD_X,
  TAPS,
  TREES,
  WIND_TURBINES,
  type Rect,
} from '../../state/world'

const centre = (r: Rect): [number, number, number, number] => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0, r.z1 - r.z0]

/* ------------------------------------------------------------------ */
/* Wind turbines – spin faster with more eco-energy                     */
/* ------------------------------------------------------------------ */

export function WindTurbine({ position }: { position: V3 }) {
  const rotor = useRef<Group>(null)
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.z += Math.min(dt, 0.05) * (0.4 + env.wind * 4.5 + useGame.getState().energy / 60)
  })
  return (
    <group position={position} rotation={[0, Math.PI / 4, 0]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.9, 1, 0.3, 20]} />
        <Plastic color="#4cb944" />
      </mesh>
      <mesh position={[0, 3.3, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.25, 6.4, 14]} />
        <Plastic color="#ffffff" />
      </mesh>
      <Block position={[0, 6.55, -0.2]} size={[0.4, 0.4, 0.9]} color="#ffffff" />
      <group ref={rotor} position={[0, 6.55, 0.32]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <mesh position={[0, 1.35, 0]} castShadow>
              <boxGeometry args={[0.22, 2.6, 0.05]} />
              <Plastic color="#ffffff" />
            </mesh>
            <Block position={[0, 2.55, 0]} size={[0.22, 0.2, 0.06]} color="#ef4444" />
          </group>
        ))}
      </group>
    </group>
  )
}

export function WindTurbines() {
  return (
    <>
      {WIND_TURBINES.map(([x, z]) => (
        <WindTurbine key={`${x}${z}`} position={[x, 0, z]} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Maple Street houses (some have wasted lights to switch off)         */
/* ------------------------------------------------------------------ */

const HOUSE_COLORS = [
  ['#d9735b', '#8c3d2b'],
  ['#9bc58a', '#4d7a3d'],
  ['#e9b872', '#a8642a'],
  ['#8fb4d9', '#3d5f8c'],
  ['#e08b8b', '#9c4545'],
  ['#c7a6e0', '#6b4a8c'],
  ['#f0d27a', '#a8862a'],
  ['#9ed8d0', '#3b8077'],
]

function House({ id, x, z, i }: { id: string; x: number; z: number; i: number }) {
  const wasted = useGame((s) => s.lights[id])
  const stats = useGame((s) => s.stats)
  const eco = getTownEcoStatus(stats)
  const hasSolar = eco.tier >= 3 || (eco.tier === 2 && i % 2 === 0)
  const [color, roof] = HOUSE_COLORS[i % HOUSE_COLORS.length]
  const h = 3.4 + (i % 3) * 0.9
  const win = wasted ? sharedMaterials.wastedLight : sharedMaterials.windowGlow
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, h / 2, 0]} size={[3.4, h, 5]} color={color} tex="brick" texScale={1.6} />
      <group position={[0, h + 0.7, 0]} scale={[1, 1, 1.47]}>
        <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
          <cylinderGeometry args={[0.01, 2.6, 1.4, 4, 1]} />
          <Plastic color={roof} />
        </mesh>
      </group>

      {/* Dynamic Evolution: Clean Solar Panels on roof */}
      {hasSolar && (
        <group position={[0.55, h + 0.95, 0.4]} rotation={[0, 0, -0.48]}>
          <Block position={[0, 0, 0]} size={[1.15, 0.05, 1.85]} color="#0f172a" />
          <Block position={[0, 0.03, 0]} size={[1.08, 0.02, 1.76]} color="#1e3a8a" />
          {[-0.45, 0, 0.45].map((gz) => (
            <Block key={gz} position={[0, 0.04, gz]} size={[1.04, 0.01, 0.02]} color="#60a5fa" />
          ))}
          <pointLight position={[0, 0.2, 0]} color="#38bdf8" intensity={0.35} distance={2.5} />
        </group>
      )}

      {/* door faces the road (+x) */}
      <Block position={[1.72, 0.8, 1]} size={[0.06, 1.6, 0.9]} color="#3f6fb5" />
      <Block position={[1.72, 1.3, -1.2]} size={[0.06, 0.8, 0.9]} material={win} color="" />
      <Block position={[1.72, h - 1, 1]} size={[0.06, 0.8, 0.9]} material={win} color="" />
      <Block position={[1.72, h - 1, -1.2]} size={[0.06, 0.8, 0.9]} material={win} color="" />
      <Block position={[0.6, h / 2, 2.52]} size={[1, 0.8, 0.06]} material={win} color="" />
      {/* front path */}
      <Block position={[2.6, 0.06, 1]} size={[1.8, 0.06, 1]} color="#d8d2c8" cast={false} />
      {i % 2 === 0 && <Block position={[-0.6, h + 1.3, -1.2]} size={[0.6, 1.2, 0.6]} color="#7f1d1d" />}
      {wasted && (
        <Near x={x} z={z} r={20}>
          <pointLight position={[2.4, 1.6, 0]} color="#ffd23f" intensity={6} distance={5} />
          <Label position={[2, h + 1.2, 0]}>
            <Marker emoji="💡" text="Nobody home!" color="bg-yellow-200" />
          </Label>
        </Near>
      )}
    </group>
  )
}

export function Neighbourhood() {
  const lamps = [-40, -30, -20, -10, 5, 10, 20, 40]
  return (
    <group>
      {HOUSES.map((h, i) => (
        <House key={h.id} id={h.id} x={h.x} z={h.z} i={i} />
      ))}
      {/* a couple of houses across the river too */}
      <group position={[-31, 0, 41]}>
        <Block position={[0, 1.8, 0]} size={[3.4, 3.6, 5]} color="#e9b872" tex="brick" texScale={1.5} />
        <Block position={[0, 3.75, 0]} size={[3.7, 0.3, 5.3]} color="#a8642a" tex="roof" texScale={2} />
      </group>
      {lamps.map((z) => (
        <StreetLamp key={z} position={[ROAD_X + 3, 0, z]} />
      ))}
    </group>
  )
}

export function StreetLamp({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 3.2, 8]} />
        <Plastic color="#2a2e38" />
      </mesh>
      <Block position={[0, 3.3, 0]} size={[0.45, 0.4, 0.45]} color="#2a2e38" />
      <mesh position={[0, 3.18, 0]} material={sharedMaterials.lampGlow}>
        <boxGeometry args={[0.34, 0.26, 0.34]} />
      </mesh>
    </group>
  )
}

export function PlazaLamps() {
  const spots: V3[] = LAMPS.map(([x, z]) => [x, 0, z])
  return (
    <>
      {spots.map((p, i) => (
        <StreetLamp key={i} position={p} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* School, recycling center, farm                                       */
/* ------------------------------------------------------------------ */

/** A flag that flaps harder when it's windy */
export function Flag() {
  const ref = useRef<Group>(null)
  const segs = useRef<Mesh[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ref.current) ref.current.rotation.y = -env.windDir + Math.PI / 2
    segs.current.forEach((m, i) => {
      if (!m) return
      const a = Math.sin(t * (3 + env.wind * 9) - i * 0.9) * (0.08 + env.wind * 0.3) * (i + 1)
      m.position.x = a * 0.25
      m.rotation.y = a * 0.4
    })
  })
  return (
    <group ref={ref} position={[0, 4.6, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => void (el && (segs.current[i] = el))} position={[0, 0, 0.15 + i * 0.27]} castShadow>
          <boxGeometry args={[0.03, 0.7, 0.28]} />
          <Plastic color={i % 2 ? '#16a34a' : '#22c55e'} />
        </mesh>
      ))}
    </group>
  )
}


export function RecyclingCenter() {
  const [cx, cz, w, d] = centre(RECYCLING_CENTER)
  const bales = ['#3b82f6', '#22c55e', '#f59e0b', '#94a3b8', '#ef4444', '#a855f7']
  return (
    <group position={[cx, 0, cz]}>
      <Block position={[0, 1.8, 0]} size={[w, 3.6, d]} color="#a7f3d0" tex="brick" texScale={1.6} />
      <Block position={[0, 3.75, 0]} size={[w + 0.5, 0.3, d + 0.5]} color="#047857" tex="roof" texScale={2} />
      <Block position={[w / 2 + 0.02, 1.3, 0]} size={[0.08, 2.6, 3]} color="#334155" />
      <Block position={[0, 2, d / 2 + 0.02]} size={[w - 2, 1, 0.08]} material={sharedMaterials.windowGlow} color="" />
      {/* conveyor + bales out front */}
      <Block position={[w / 2 + 2, 0.6, 2]} size={[3, 0.2, 1]} color="#475569" />
      {bales.map((c, i) => (
        <Block key={i} position={[w / 2 + 1.2 + (i % 3) * 1.1, 0.45 + Math.floor(i / 3) * 0.9, -1.8]} size={[1, 0.9, 1]} color={c} />
      ))}
      <Sign3D text="♻️ Recycling Center" position={[0, 3.2, d / 2 + 0.06]} width={5} height={0.8} bg="#047857" border="#a7f3d0" />
    </group>
  )
}

export function Farm() {
  const [cx, cz, w, d] = centre(BARN)
  const fence: V3[] = []
  for (let x = 28; x <= 38; x += 1.25) fence.push([x, 0, 24.5], [x, 0, 16.2])
  for (let z = 16.2; z <= 24.5; z += 1.25) fence.push([28, 0, z])
  return (
    <group>
      <group position={[cx, 0, cz]}>
        <Block position={[0, 1.6, 0]} size={[w, 3.2, d]} color="#dc2626" tex="wood" texScale={2} />
        <mesh position={[0, 3.2 + 1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[w / 1.9, w / 1.9, d + 0.4, 3, 1]} />
          <Plastic color="#7f1d1d" />
        </mesh>
        <Block position={[-w / 2 - 0.02, 1.3, 0]} size={[0.08, 2.6, 2.6]} color="#ffffff" />
        <Block position={[-w / 2 - 0.04, 1.3, 0]} size={[0.08, 2.4, 0.2]} color="#dc2626" rotation={[0.8, 0, 0]} />
        {/* silo */}
        <mesh position={[w / 2 + 1.2, 2.6, -1]} castShadow>
          <cylinderGeometry args={[1.1, 1.1, 5.2, 18]} />
          <Plastic color="#e5e7eb" />
        </mesh>
        <mesh position={[w / 2 + 1.2, 5.4, -1]}>
          <sphereGeometry args={[1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Plastic color="#9ca3af" />
        </mesh>
        <Sign3D text="🐔 Happy Farm" position={[-w / 2 - 0.07, 2.95, 0]} rotation={[0, -Math.PI / 2, 0]} width={3.4} height={0.55} bg="#b91c1c" border="#fecaca" />
      </group>
      {/* hay bales + compost heap */}
      {[
        [30, 13],
        [31.3, 13],
        [30.6, 13, 0.8],
      ].map(([x, z, y = 0], i) => (
        <mesh key={i} position={[x, 0.45 + y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 1.1, 14]} />
          <Plastic color="#e9c46a" roughness={0.9} />
        </mesh>
      ))}
      {fence.map((p, i) => (
        <Block key={i} position={[p[0], 0.45, p[2]]} size={[0.15, 0.9, 0.15]} color="#f5f5f4" />
      ))}
      <Block position={[33, 0.65, 24.5]} size={[10, 0.1, 0.08]} color="#f5f5f4" />
      <Block position={[33, 0.65, 16.2]} size={[10, 0.1, 0.08]} color="#f5f5f4" />
      <Block position={[28, 0.65, 20.35]} size={[0.08, 0.1, 8.3]} color="#f5f5f4" />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Greenery                                                             */
/* ------------------------------------------------------------------ */

export function Trees() {
  return <InstancedTrees trees={TREES} />
}

export function Benches() {
  return (
    <>
      {BENCHES.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <Block position={[0, 0.45, 0]} size={[2.2, 0.12, 0.7]} color="#c0703a" tex="wood" texScale={1.5} />
          <Block position={[0, 0.85, -0.32]} size={[2.2, 0.5, 0.1]} color="#c0703a" tex="wood" texScale={1.5} />
          {[-0.9, 0.9].map((bx) => (
            <Block key={bx} position={[bx, 0.22, 0]} size={[0.12, 0.45, 0.6]} color="#2a2e38" />
          ))}
        </group>
      ))}
    </>
  )
}

function FlowerBed({ x, z, w, d, seed }: { x: number; z: number; w: number; d: number; seed: number }) {
  const stats = useGame((s) => s.stats)
  const eco = getTownEcoStatus(stats)
  const flowerCount = eco.tier === 3 ? 20 : eco.tier === 2 ? 14 : 7
  const flowers = useMemo(() => {
    const colors = ['#ff6b9a', '#ffd23f', '#ffffff', '#b57bff', '#ff8a3d', '#ff4d4d']
    let r = seed * 9301 + 17
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280)
    return Array.from({ length: flowerCount }, () => ({ x: (rnd() - 0.5) * (w - 0.6), z: (rnd() - 0.5) * (d - 0.6), c: colors[Math.floor(rnd() * colors.length)], h: 0.25 + rnd() * 0.2 }))
  }, [w, d, seed, flowerCount])
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, 0.2, 0]} size={[w, 0.4, d]} color="#a4643a" tex="wood" texScale={1.5} />
      <Block position={[0, 0.41, 0]} size={[w - 0.3, 0.04, d - 0.3]} color="#5b3a22" cast={false} tex="soil" texScale={1.5} />
      <InstancedFlowers flowers={flowers} phase={x + z} />
    </group>
  )
}

export function FlowerBeds() {
  return (
    <>
      {FLOWER_BEDS.map((f, i) => (
        <FlowerBed key={i} {...f} seed={i + 2} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Community garden plots – they get thirsty!                           */
/* ------------------------------------------------------------------ */

function Crop({ crop, thirsty }: { crop: string; thirsty: boolean }) {
  const s = thirsty ? 0.7 : 1
  const leaf = thirsty ? '#9ca34a' : '#3cb043'
  switch (crop) {
    case 'carrot':
      return (
        <group scale={[1, s, 1]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.12, 0.05, 0.2, 8]} />
            <Plastic color="#ff8a1f" />
          </mesh>
          {[-0.35, 0, 0.35].map((a, k) => (
            <mesh key={k} position={[Math.sin(a) * 0.1, 0.35, 0]} rotation={[0, 0, a + (thirsty ? 0.5 : 0)]}>
              <coneGeometry args={[0.06, 0.45, 5]} />
              <Plastic color={leaf} />
            </mesh>
          ))}
        </group>
      )
    case 'tomato':
      return (
        <group scale={[1, s, 1]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <sphereGeometry args={[0.34, 10, 8]} />
            <Plastic color={thirsty ? '#7f8a3a' : '#2f8f36'} />
          </mesh>
          {[0, 2.1, 4.2].map((a, k) => (
            <mesh key={k} position={[Math.cos(a) * 0.28, 0.32 + k * 0.1, Math.sin(a) * 0.28 + 0.08]}>
              <sphereGeometry args={[0.12, 8, 6]} />
              <Plastic color="#e8282b" />
            </mesh>
          ))}
        </group>
      )
    case 'cabbage':
      return (
        <mesh position={[0, 0.22, 0]} scale={[1, s * 0.8, 1]} castShadow>
          <sphereGeometry args={[0.32, 10, 8]} />
          <Plastic color={thirsty ? '#a3b35a' : '#7fd36a'} />
        </mesh>
      )
    default:
      return (
        <group scale={[1, s, 1]} rotation={[0, 0, thirsty ? 0.5 : 0]}>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
            <Plastic color={leaf} />
          </mesh>
          <mesh position={[0, 1.12, 0.05]} rotation={[Math.PI / 2.3, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.06, 12]} />
            <Plastic color="#facc15" />
          </mesh>
          <mesh position={[0, 1.13, 0.09]} rotation={[Math.PI / 2.3, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.06, 10]} />
            <Plastic color="#78350f" />
          </mesh>
        </group>
      )
  }
}

function GardenPlot({ plot }: { plot: (typeof GARDEN_PLOTS)[number] }) {
  const thirsty = useGame((s) => s.plots[plot.id] >= 60)
  const [cx, cz, w, d] = centre(plot)
  const cells: [number, number][] = []
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) cells.push([-w / 2 + 0.7 + i * ((w - 1.4) / 3), -d / 2 + 0.65 + j * ((d - 1.3) / 2)])
  return (
    <group position={[cx, 0, cz]}>
      <Block position={[0, 0.25, 0]} size={[w, 0.5, d]} color="#b06d3b" tex="wood" texScale={1.5} />
      <Block position={[0, 0.51, 0]} size={[w - 0.4, 0.04, d - 0.4]} color={thirsty ? '#a1785a' : '#5b3a22'} cast={false} />
      {cells.map(([x, z], i) => (
        <group key={i} position={[x, 0.52, z]}>
          <Crop crop={plot.crop} thirsty={thirsty} />
        </group>
      ))}
      {thirsty && (
        <Near x={cx} z={cz} r={18}>
          <Label position={[0, 2, 0]}>
            <Marker emoji="💧" text="Thirsty!" color="bg-sky-200" />
          </Label>
        </Near>
      )}
    </group>
  )
}

export function CommunityGarden() {
  return (
    <group>
      {GARDEN_PLOTS.map((p) => (
        <GardenPlot key={p.id} plot={p} />
      ))}
      {/* scarecrow */}
      <group position={[24.5, 0, 10.2]}>
        <Block position={[0, 1, 0]} size={[0.12, 2, 0.12]} color="#7a4a24" tex="wood" texScale={1} />
        <Block position={[0, 1.5, 0]} size={[1.4, 0.1, 0.1]} color="#7a4a24" tex="wood" texScale={1} />
        <Block position={[0, 1.35, 0]} size={[0.6, 0.7, 0.3]} color="#3b82f6" />
        <mesh position={[0, 2.05, 0]}>
          <sphereGeometry args={[0.22, 10, 8]} />
          <Plastic color="#e9c46a" />
        </mesh>
        <mesh position={[0, 2.3, 0]}>
          <coneGeometry args={[0.35, 0.3, 12]} />
          <Plastic color="#92400e" />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Water taps – some of them leak                                       */
/* ------------------------------------------------------------------ */

function Tap({ id, x, z }: { id: string; x: number; z: number }) {
  const leaking = useGame((s) => s.leaks[id])
  const drop = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!drop.current) return
    const t = (clock.elapsedTime * 1.6) % 1
    drop.current.position.y = 0.78 - t * 0.7
    drop.current.visible = leaking
  })
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, 0.5, 0]} size={[0.18, 1, 0.18]} color="#94a3b8" />
      <Block position={[0.15, 0.9, 0]} size={[0.35, 0.1, 0.1]} color="#cbd5e1" />
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 10]} />
        <Plastic color={leaking ? '#ef4444' : '#3b82f6'} />
      </mesh>
      <mesh ref={drop} position={[0.3, 0.78, 0]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
      {leaking && (
        <>
          <mesh position={[0.3, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.6, 20]} />
            <meshStandardMaterial color="#60a5fa" transparent opacity={0.7} />
          </mesh>
          <Near x={x} z={z} r={16}>
            <Label position={[0, 1.8, 0]}>
              <Marker emoji="🚰" text="Leaking!" color="bg-cyan-200" />
            </Label>
          </Near>
        </>
      )}
    </group>
  )
}

export function Taps() {
  return (
    <>
      {TAPS.map((t) => (
        <Tap key={t.id} {...t} />
      ))}
    </>
  )
}

function Umbrella({ x, z, c }: { x: number; z: number; c: string }) {
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, 1.1, 0]} size={[0.08, 2.2, 0.08]} color="#f5f5f4" />
      <mesh position={[0, 2.3, 0]} castShadow>
        <coneGeometry args={[1.4, 0.7, 8]} />
        <Plastic color={c} />
      </mesh>
      <Block position={[0.9, 0.12, 0.2]} size={[1.2, 0.12, 0.6]} color="#fef3c7" tex="wood" texScale={1} />
    </group>
  )
}

/** Sunset Beach: sand, shallow sea, pier, lifeguard tower and umbrellas */
export function Beach() {
  const sx = (SEA.x0 + SEA.x1) / 2
  const sw = SEA.x1 - SEA.x0 + 5
  const sz = (SEA.z0 + SEA.z1) / 2
  const sd = SEA.z1 - SEA.z0
  const bx = (BEACH.x0 + BEACH.x1) / 2
  const bz = (BEACH.z0 + BEACH.z1) / 2
  const waves = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (waves.current) waves.current.position.x = Math.sin(clock.elapsedTime * 0.8) * 0.35
  })
  const pz = (PIER.z0 + PIER.z1) / 2
  return (
    <group>
      <Block position={[bx, 0.045, bz]} size={[BEACH.x1 - BEACH.x0, 0.09, BEACH.z1 - BEACH.z0]} color="#f2dc9b" cast={false} tex="sand" texScale={3} />
      <Block position={[sx + 2.5, 0.0, sz]} size={[sw, 0.12, sd]} color="#2f9bd0" cast={false} material={sharedMaterials.water} />
      <group ref={waves}>
        <Block position={[SEA.x0 - 0.2, 0.1, sz]} size={[0.5, 0.05, sd]} color="#ffffff" cast={false} />
        <Block position={[SEA.x0 - 1.4, 0.07, sz]} size={[0.25, 0.04, sd]} color="#e0f2fe" cast={false} />
      </group>
      {/* pier */}
      <Block position={[(PIER.x0 + PIER.x1) / 2, 0.3, pz]} size={[PIER.x1 - PIER.x0, 0.16, PIER.z1 - PIER.z0]} color="#b9773e" tex="wood" texScale={2} />
      {[PIER.z0, PIER.z1].map((z) => (
        <Block key={z} position={[(PIER.x0 + PIER.x1) / 2, 0.75, z]} size={[PIER.x1 - PIER.x0, 0.08, 0.08]} color="#8f5527" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Block key={i} position={[PIER.x0 + 0.4 + i * 1.2, 0.5, PIER.z0]} size={[0.12, 0.8, 0.12]} color="#8f5527" tex="wood" texScale={1} />
      ))}
      {/* little boat */}
      <group position={[58, 0.2, 5]} rotation={[0, 0.3, 0]}>
        <Block position={[0, 0.2, 0]} size={[2.4, 0.5, 1]} color="#ef4444" />
        <Block position={[0, 1.2, 0]} size={[0.08, 2, 0.08]} color="#7a4a24" />
        <Block position={[0.5, 1.4, 0]} size={[1, 1.2, 0.04]} color="#ffffff" />
      </group>
      {/* lifeguard tower */}
      <group position={[51.5, 0, -6]}>
        {[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([x, z], i) => (
          <Block key={i} position={[x, 0.9, z]} size={[0.14, 1.8, 0.14]} color="#7a4a24" tex="wood" texScale={1} />
        ))}
        <Block position={[0, 1.85, 0]} size={[1.9, 0.15, 1.9]} color="#b9773e" tex="wood" texScale={1.5} />
        <Block position={[0, 2.6, -0.8]} size={[1.9, 1.3, 0.12]} color="#f6e3bf" tex="brick" texScale={1.5} />
        <Block position={[0, 3.35, 0]} size={[2.4, 0.18, 2.4]} color="#ef4444" tex="roof" texScale={1.5} />
        <Block position={[1.25, 0.6, 0]} size={[0.15, 0.1, 1.2]} color="#b9773e" rotation={[0, 0, 0.9]} />
      </group>
      <Umbrella x={50} z={-14} c="#ef4444" />
      <Umbrella x={52} z={9} c="#facc15" />
      <Umbrella x={49.5} z={20} c="#38bdf8" />
      <Umbrella x={53} z={-2.5} c="#a855f7" />
      {/* sand castle */}
      <group position={[52.5, 0, 17]}>
        <Block position={[0, 0.3, 0]} size={[1.6, 0.6, 1.6]} color="#e8c97a" tex="sand" texScale={1} />
        {[[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([x, z], i) => (
          <Block key={i} position={[x, 0.85, z]} size={[0.4, 0.5, 0.4]} color="#e8c97a" tex="sand" texScale={1} />
        ))}
      </group>
      {/* name board on two posts at the entrance to the beach */}
      <Block position={[BEACH.x0 + 0.2, 1.0, -8.2]} size={[0.14, 2, 0.14]} color="#7a4a24" tex="wood" texScale={1} />
      <Block position={[BEACH.x0 + 0.2, 1.0, -4.9]} size={[0.14, 2, 0.14]} color="#7a4a24" tex="wood" texScale={1} />
      <Sign3D text="🏖️ Sunset Beach" position={[BEACH.x0 + 0.08, 1.7, -6.55]} rotation={[0, -Math.PI / 2, 0]} width={3.2} height={0.6} bg="#0284c7" border="#bae6fd" />
    </group>
  )
}

/** Learning Corner: an outdoor classroom deck with a big chalkboard, study desks and a bookshelf */
export function LearningCorner() {
  return <LearningCentre />
}

/** Signpost in the plaza pointing to each area */
export function Signpost() {
  const boards = [
    { t: '🦆 Duck Pond →', c: '#bae6fd', r: -0.3 },
    { t: '🥕 Garden & Farm →', c: '#fde68a', r: 0.4 },
    { t: '🏫 School & River ↓', c: '#bbf7d0', r: 1.2 },
    { t: '🏘️ Maple Street ←', c: '#fecaca', r: -1.1 },
  ]
  return (
    <group position={[3, 0, 3]}>
      <Block position={[0, 1.4, 0]} size={[0.14, 2.8, 0.14]} color="#7a4a24" tex="wood" texScale={1} />
      {boards.map((b, i) => (
        <Block key={i} position={[0, 2.5 - i * 0.42, 0]} size={[1.3, 0.3, 0.06]} rotation={[0, b.r, 0]} color={b.c} />
      ))}
      <Near x={3} z={3} r={9}>
        <Label position={[0, 3.4, 0]}>
          <div className="flex flex-col items-center gap-0.5">
            {boards.map((b) => (
              <div key={b.t} className="whitespace-nowrap rounded-md px-2 text-[11px] font-bold text-slate-700 shadow" style={{ background: b.c }}>
                {b.t}
              </div>
            ))}
          </div>
        </Label>
      </Near>
    </group>
  )
}
