import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useGame } from '../../state/gameStore'
import { player } from '../../state/sceneRegistry'
import { EWASTE_BIN, EWASTE_STAND, MAKER_PADS, STORE, STORE_COUNTERS, STORE_COUNTER_Z, STORE_DOOR, STORE_STAND } from '../../state/world'
import { Block, Sign3D, sharedMaterials } from './primitives'

const H = 4.4
const W = STORE.x1 - STORE.x0
const D = STORE.z1 - STORE.z0
const CX = (STORE.x0 + STORE.x1) / 2
const CZ = (STORE.z0 + STORE.z1) / 2
const WALL = '#fff4d6'
const TRIM = '#7c3aed'

/** a shelf unit packed with colourful boxes */
function Shelf({ position, rotation = 0, length = 4, hue = 0 }: { position: [number, number, number]; rotation?: number; length?: number; hue?: number }) {
  const boxes = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; c: string }[] = []
    let seed = hue * 13 + 7
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
    for (const y of [0.55, 1.15, 1.75]) {
      let x = -length / 2 + 0.2
      while (x < length / 2 - 0.3) {
        const w = 0.25 + rnd() * 0.3
        const h = 0.25 + rnd() * 0.3
        out.push({ x: x + w / 2, y: y + h / 2 + 0.04, w, h, c: `hsl(${Math.floor((hue * 70 + rnd() * 160) % 360)} 70% ${55 + Math.floor(rnd() * 15)}%)` })
        x += w + 0.08
      }
    }
    return out
  }, [length, hue])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Block position={[0, 1.05, 0]} size={[length, 2.1, 0.5]} color="#e2e8f0" />
      {[0.5, 1.1, 1.7].map((y) => (
        <Block key={y} position={[0, y, 0.02]} size={[length - 0.1, 0.06, 0.55]} color="#94a3b8" />
      ))}
      {boxes.map((b, i) => (
        <Block key={i} position={[b.x, b.y, 0.1]} size={[b.w, b.h, 0.3]} color={b.c} cast={false} />
      ))}
    </group>
  )
}

function Counter({ c }: { c: (typeof STORE_COUNTERS)[number] }) {
  const z = STORE.z0 + 1.15
  return (
    <group position={[c.x, 0, z]}>
      <Block position={[0, 0.55, 0]} size={[2.8, 1.1, 1.3]} color={c.color} />
      <Block position={[0, 1.13, 0.05]} size={[3, 0.1, 1.5]} color="#f8fafc" />
      {/* till + a few items on show */}
      <Block position={[-0.8, 1.35, 0]} size={[0.6, 0.34, 0.45]} color="#334155" />
      <Block position={[-0.8, 1.6, 0.1]} size={[0.5, 0.22, 0.06]} color="#38bdf8" cast={false} />
      <Block position={[0.2, 1.3, 0.1]} size={[0.3, 0.26, 0.3]} color="#fde047" />
      <Block position={[0.7, 1.3, 0.1]} size={[0.3, 0.26, 0.3]} color="#fb7185" />
      <Block position={[1.1, 1.3, -0.1]} size={[0.26, 0.26, 0.26]} color="#4ade80" />
      {/* glowing mat marks where to stand */}
      <mesh position={[0, 0.14, STORE_COUNTER_Z - z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 1.2]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.35} transparent opacity={0.45} />
      </mesh>
    </group>
  )
}

/** Opens a counter's pop-up when you walk up to it (and again only after you step away) */
function CounterTrigger() {
  const armed = useRef(true)
  useFrame(() => {
    const s = useGame.getState()
    let hit = -1
    for (let i = 0; i < STORE_STAND.length; i++) {
      const r = STORE_STAND[i]
      if (player.x > r.x0 && player.x < r.x1 && player.z > r.z0 && player.z < r.z1) hit = i
    }
    const atBin = player.x > EWASTE_STAND.x0 && player.x < EWASTE_STAND.x1 && player.z > EWASTE_STAND.z0 && player.z < EWASTE_STAND.z1
    if (hit < 0 && !atBin) {
      armed.current = true
      return
    }
    if (!armed.current || s.screen !== 'playing') return
    if (s.shopOpen || s.goodsCounter || s.invOpen || s.binOpen || s.chatWith || s.bigMap) return
    armed.current = false
    if (atBin) {
      s.setBin(true)
      return
    }
    const id = STORE_COUNTERS[hit].id
    if (id === 1) s.setShop(true)
    else s.setGoodsCounter(id)
  })
  return null
}

/** The yard south of the store: numbered pads for finished projects, and the e-waste bin */
function MakerYard() {
  return (
    <group>
      {MAKER_PADS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Block position={[0, 0.1, 0]} size={[2.6, 0.06, 2.4]} color="#0f766e" cast={false} />
          <Block position={[0, 0.14, 0]} size={[2.3, 0.02, 2.1]} color="#14b8a6" cast={false} receive={false} />
          <Block position={[0, 0.16, 1.0]} size={[0.5, 0.02, 0.12]} color="#fde047" cast={false} receive={false} />
          <Sign3D text={`${i + 1}`} position={[-1.05, 0.45, 1.25]} width={0.5} height={0.5} bg="#0f766e" border="#fde047" />
        </group>
      ))}
      <Sign3D text="🔧 MAKER YARD" position={[14, 3.2, STORE.z1 + 0.18]} width={4} height={0.75} bg="#0f766e" border="#fde047" />
      {/* the e-waste bin */}
      <group position={[EWASTE_BIN[0], 0, EWASTE_BIN[1]]}>
        <Block position={[0, 0.55, 0]} size={[0.8, 1.1, 0.8]} color="#15803d" />
        <Block position={[0, 1.15, 0]} size={[0.9, 0.12, 0.9]} color="#166534" />
        <Block position={[0, 1.2, 0.2]} size={[0.5, 0.04, 0.12]} color="#0f172a" cast={false} />
        <Sign3D text="♻️ E-WASTE" position={[0, 0.6, 0.42]} width={0.74} height={0.34} bg="#14532d" border="#bbf7d0" />
      </group>
    </group>
  )
}

export function Store() {
  const roof = useRef<Group>(null)
  useFrame(() => {
    if (roof.current) roof.current.visible = !(player.x > STORE.x0 - 1 && player.x < STORE.x1 + 1 && player.z > STORE.z0 - 1 && player.z < STORE.z1 + 1)
  })
  const doorW = STORE_DOOR.z1 - STORE_DOOR.z0
  const doorMid = (STORE_DOOR.z0 + STORE_DOOR.z1) / 2
  return (
    <group>
      <CounterTrigger />
      <MakerYard />
      {/* floor */}
      <Block position={[CX, 0.06, CZ]} size={[W, 0.12, D]} color="#e7e1d6" tex="brick" texScale={3} receive />
      <Block position={[CX, 0.125, CZ]} size={[W - 0.8, 0.02, D - 0.8]} color="#f1ece2" cast={false} />
      {/* walls */}
      <Block position={[CX, H / 2, STORE.z0 + 0.2]} size={[W, H, 0.4]} color={WALL} tex="brick" texScale={2} />
      <Block position={[CX, H / 2, STORE.z1 - 0.2]} size={[W, H, 0.4]} color={WALL} tex="brick" texScale={2} />
      <Block position={[STORE.x1 - 0.2, H / 2, CZ]} size={[0.4, H, D]} color={WALL} tex="brick" texScale={2} />
      <Block position={[STORE.x0 + 0.2, H / 2, (STORE.z0 + STORE_DOOR.z0) / 2]} size={[0.4, H, STORE_DOOR.z0 - STORE.z0]} color={WALL} tex="brick" texScale={2} />
      <Block position={[STORE.x0 + 0.2, H / 2, (STORE_DOOR.z1 + STORE.z1) / 2]} size={[0.4, H, STORE.z1 - STORE_DOOR.z1]} color={WALL} tex="brick" texScale={2} />
      <Block position={[STORE.x0 + 0.2, (H + 3.1) / 2, doorMid]} size={[0.4, H - 3.1, doorW]} color={WALL} tex="brick" texScale={2} />
      {/* purple band */}
      <Block position={[CX, H - 0.55, STORE.z1 + 0.03]} size={[W + 0.1, 0.5, 0.1]} color={TRIM} cast={false} />
      <Block position={[CX, 0.35, STORE.z1 + 0.03]} size={[W + 0.1, 0.7, 0.1]} color="#4c1d95" cast={false} />
      {/* big shop windows on the south wall */}
      {[-5.5, -1.8, 1.8, 5.5].map((dx) => (
        <Block key={dx} position={[CX + dx, 2, STORE.z1 + 0.08]} size={[2.6, 1.8, 0.1]} material={sharedMaterials.windowGlow} color="" cast={false} />
      ))}
      {/* roof (hidden while you are inside so the camera can see) */}
      <group ref={roof}>
        <Block position={[CX, H + 0.15, CZ]} size={[W + 0.8, 0.3, D + 0.8]} color={TRIM} tex="roof" texScale={3} />
        <Block position={[CX, H + 0.45, CZ]} size={[W - 1, 0.3, D - 1]} color="#6d28d9" tex="roof" texScale={3} />
      </group>
      {/* entrance: awning and sign on the west side */}
      <Block position={[STORE.x0 - 0.9, 3.25, doorMid]} size={[1.8, 0.14, doorW + 1.4]} color="#ec4899" rotation={[0, 0, 0.18]} />
      <Sign3D text="🛍️ CYBERSQUARE STORE" position={[STORE.x0 - 0.12, 3.85, doorMid]} rotation={[0, -Math.PI / 2, 0]} width={5.2} height={0.8} bg="#4c1d95" border="#fbbf24" />
      <Block position={[STORE.x0 + 0.05, 1.5, STORE_DOOR.z0 - 0.1]} size={[0.2, 3, 0.2]} color={TRIM} cast={false} />
      <Block position={[STORE.x0 + 0.05, 1.5, STORE_DOOR.z1 + 0.1]} size={[0.2, 3, 0.2]} color={TRIM} cast={false} />
      {/* counters + their painted signs */}
      {STORE_COUNTERS.map((c) => (
        <group key={c.id}>
          <Counter c={c} />
          <Sign3D text={`${c.emoji} ${c.id} · ${c.name}`} position={[c.x, 3.2, STORE.z0 + 0.46]} width={3.2} height={0.7} bg={c.color} border="#ffffff" />
        </group>
      ))}
      {/* shelves along the walls and a few display units */}
      <Shelf position={[CX, 0, STORE.z1 - 0.7]} rotation={Math.PI} length={10} hue={1} />
      <Shelf position={[STORE.x1 - 0.7, 0, CZ + 1.5]} rotation={-Math.PI / 2} length={5} hue={2} />
      <Shelf position={[STORE.x0 + 0.7, 0, STORE.z0 + 3.2]} rotation={Math.PI / 2} length={2.4} hue={3} />
      <Shelf position={[10.5, 0, -34.55]} length={3} hue={4} />
      <Shelf position={[16.5, 0, -34.55]} length={3} hue={5} />
      {/* rows of clothes on rails in front of the first counter */}
      {[-1.2, 0, 1.2].map((dz) => (
        <group key={dz} position={[9.2, 0, -37 + dz * 0.0 + dz * 1.0]}>
          <Block position={[0, 1.4, 0]} size={[0.05, 0.05, 1.0]} color="#cbd5e1" cast={false} />
          {[-0.35, 0, 0.35].map((o, k) => (
            <Block key={k} position={[0, 1.15, o]} size={[0.06, 0.5, 0.2]} color={['#f43f5e', '#38bdf8', '#facc15', '#22c55e'][(k + Math.round(dz)) & 3]} cast={false} />
          ))}
        </group>
      ))}
      {/* lights */}
      {[-5, 0, 5].map((dx) => (
        <Block key={dx} position={[CX + dx, H - 0.2, CZ]} size={[2, 0.1, 0.5]} material={sharedMaterials.lampGlow} color="" cast={false} />
      ))}
    </group>
  )
}
