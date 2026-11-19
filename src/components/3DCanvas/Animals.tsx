import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { getTownEcoStatus, useGame } from '../../state/gameStore'
import { bodies, companionPos, player } from '../../state/sceneRegistry'
import { POND, RIVER, groundY } from '../../state/world'
import { Block, Label, Plastic } from './primitives'

type Gait = 'hop' | 'waddle' | 'dash' | 'walk'

/** Live state of a wandering animal, shared with its body parts so they can animate */
interface AnimalState {
  moving: boolean
  t: number
  idle: number // seconds spent standing still
  sit: boolean
}
const AnimalCtx = createContext<{ current: AnimalState }>({ current: { moving: false, t: 0, idle: 0, sit: false } })
const useAnimal = () => useContext(AnimalCtx)

const Eyes = ({ y, z, x = 0.06, s = 0.025 }: { y: number; z: number; x?: number; s?: number }) => (
  <>
    {[-x, x].map((px) => (
      <mesh key={px} position={[px, y, z]}>
        <sphereGeometry args={[s, 6, 5]} />
        <meshBasicMaterial color="#111" />
      </mesh>
    ))}
  </>
)

interface WanderProps {
  center: [number, number]
  radius: number
  speed: number
  gait: Gait
  /** run away from the player when closer than this */
  flee?: number
  /** trot after the player and sit beside them while this returns true */
  /** body radius (solid: players cannot walk through) */
  size?: number
  /** registers this animal as the town dog */
  children: ReactNode
}

/** Wanders randomly inside a circular zone; shy ones run from you, friendly ones follow you */
function Wanderer({ center, radius, speed, gait, flee, size = 0.28, children }: WanderProps) {
  const uid = useId()
  useEffect(() => () => void bodies.delete(uid), [uid])
  const ref = useRef<Group>(null)
  const body = useRef<Group>(null)
  const st = useRef({ x: center[0], z: center[1], tx: center[0], tz: center[1], wait: Math.random() * 3, phase: Math.random() * 10, heading: 0 })
  const a = useRef<AnimalState>({ moving: false, t: 0, idle: 0, sit: false })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const g = ref.current
    if (!g || !body.current) return
    let mul = 1
    let moving = false
    a.current.sit = false
    if (!useGame.getState().paused) {
      const pdx = player.x - s.x
      const pdz = player.z - s.z
      const pd = Math.hypot(pdx, pdz)
      if (flee && pd < flee) {
        // scamper away from the player, but stay near home
        const away = Math.atan2(-pdz, -pdx)
        s.tx = Math.max(center[0] - radius * 1.5, Math.min(center[0] + radius * 1.5, s.x + Math.cos(away) * 3))
        s.tz = Math.max(center[1] - radius * 1.5, Math.min(center[1] + radius * 1.5, s.z + Math.sin(away) * 3))
        s.wait = 0
        mul = 2.4
      }
      const dx = s.tx - s.x
      const dz = s.tz - s.z
      const d = Math.hypot(dx, dz)
      if (a.current.sit) {
        // sitting beside you
      } else if (s.wait > 0) s.wait -= dt
      else if (d < 0.08) {
        s.wait = 1 + Math.random() * 3
        const ang = Math.random() * Math.PI * 2
        const r = Math.random() * radius
        s.tx = center[0] + Math.cos(ang) * r
        s.tz = center[1] + Math.sin(ang) * r
      } else {
        moving = true
        const step = Math.min(d, speed * mul * dt)
        s.x += (dx / d) * step
        s.z += (dz / d) * step
        const want = Math.atan2(dx, dz)
        let diff = want - g.rotation.y
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        g.rotation.y += diff * Math.min(1, dt * 9)
      }
    }
    s.phase += dt * mul
    a.current.t += dt
    a.current.moving = moving
    a.current.idle = moving ? 0 : a.current.idle + dt
    // you cannot walk through animals: they get nudged aside when you press into them
    {
      const pdx = s.x - player.x
      const pdz = s.z - player.z
      const pd = Math.hypot(pdx, pdz) || 0.001
      const min = size + 0.4
      if (pd < min) {
        s.x += (pdx / pd) * (min - pd)
        s.z += (pdz / pd) * (min - pd)
      }
    }
    g.position.set(s.x, groundY(s.x, s.z), s.z)
    bodies.set(uid, { x: s.x, z: s.z, r: size })
    const b = body.current
    const gaitY = moving && gait === 'hop' ? Math.abs(Math.sin(s.phase * 9)) * 0.28 : moving && (gait === 'walk' || gait === 'waddle') ? Math.abs(Math.sin(s.phase * 6)) * 0.03 : 0
    b.position.y = gaitY
    b.rotation.z = moving && gait === 'waddle' ? Math.sin(s.phase * 12) * 0.18 : 0
    b.rotation.x = moving && gait === 'walk' ? Math.sin(s.phase * 6) * 0.05 : moving && gait === 'hop' ? Math.cos(s.phase * 9) * 0.18 : 0
  })

  return (
    <group ref={ref}>
      <group ref={body}>
        <AnimalCtx.Provider value={a}>{children}</AnimalCtx.Provider>
      </group>
    </group>
  )
}

function Rabbit({ color = '#f8fafc' }: { color?: string }) {
  const a = useAnimal()
  const earL = useRef<Group>(null)
  const earR = useRef<Group>(null)
  const nose = useRef<Mesh>(null)
  useFrame(() => {
    const t = a.current.t
    const flick = Math.max(0, Math.sin(t * 1.3)) > 0.97 ? 0.5 : 0
    const run = a.current.moving ? -0.7 : 0
    if (earL.current) earL.current.rotation.x = -0.2 + run + flick * Math.sin(t * 40)
    if (earR.current) earR.current.rotation.x = -0.2 + run - flick * Math.sin(t * 40)
    if (nose.current) nose.current.scale.setScalar(1 + (a.current.moving ? 0 : Math.sin(t * 14) * 0.25))
  })
  return (
    <group scale={1.1}>
      <mesh position={[0, 0.22, -0.05]} scale={[1, 0.9, 1.25]} castShadow>
        <sphereGeometry args={[0.2, 10, 8]} />
        <Plastic color={color} />
      </mesh>
      <mesh position={[0, 0.42, 0.16]} castShadow>
        <sphereGeometry args={[0.14, 10, 8]} />
        <Plastic color={color} />
      </mesh>
      <Eyes y={0.46} z={0.27} x={0.07} s={0.022} />
      <mesh ref={nose} position={[0, 0.41, 0.29]}>
        <sphereGeometry args={[0.025, 6, 5]} />
        <meshBasicMaterial color="#f9a8d4" />
      </mesh>
      {[
        [-0.05, earL],
        [0.05, earR],
      ].map(([x, ref]) => (
        <group key={x as number} ref={ref as React.RefObject<Group>} position={[x as number, 0.53, 0.13]}>
          <mesh position={[0, 0.14, 0]} rotation={[0, 0, (x as number) * 2]}>
            <boxGeometry args={[0.06, 0.28, 0.04]} />
            <Plastic color={color} />
          </mesh>
          <mesh position={[0, 0.14, 0.022]} rotation={[0, 0, (x as number) * 2]}>
            <boxGeometry args={[0.03, 0.2, 0.01]} />
            <meshBasicMaterial color="#fbcfe8" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.24, -0.3]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <Plastic color="#ffffff" />
      </mesh>
    </group>
  )
}

function Squirrel() {
  const a = useAnimal()
  const tail = useRef<Group>(null)
  const head = useRef<Group>(null)
  useFrame(() => {
    const t = a.current.t
    if (tail.current) tail.current.rotation.z = Math.sin(t * (a.current.moving ? 14 : 3)) * 0.35
    if (head.current) head.current.rotation.y = a.current.moving ? 0 : Math.sin(t * 2.2) * 0.5 * Math.max(0, Math.sin(t * 0.7))
  })
  return (
    <group scale={1.1}>
      <mesh position={[0, 0.2, 0]} scale={[0.9, 1.1, 1]} castShadow>
        <sphereGeometry args={[0.16, 10, 8]} />
        <Plastic color="#b45f2a" />
      </mesh>
      <group ref={head} position={[0, 0.4, 0.1]}>
        <mesh>
          <sphereGeometry args={[0.11, 10, 8]} />
          <Plastic color="#b45f2a" />
        </mesh>
        <Eyes y={0.03} z={0.095} x={0.055} s={0.02} />
        <mesh position={[0, -0.02, 0.11]}>
          <sphereGeometry args={[0.025, 6, 5]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, 0.11, -0.01]}>
            <coneGeometry args={[0.03, 0.07, 4]} />
            <Plastic color="#a14f20" />
          </mesh>
        ))}
      </group>
      <group ref={tail} position={[0, 0.3, -0.18]}>
        <mesh position={[0, 0.12, -0.05]} rotation={[0.5, 0, 0]} scale={[0.7, 1.5, 0.8]} castShadow>
          <sphereGeometry args={[0.15, 10, 8]} />
          <Plastic color="#c9733a" />
        </mesh>
      </group>
    </group>
  )
}

function Duck({ scale = 1.1 }: { scale?: number }) {
  const a = useAnimal()
  const head = useRef<Group>(null)
  const tail = useRef<Mesh>(null)
  useFrame(() => {
    const t = a.current.t
    if (head.current) head.current.rotation.x = a.current.moving ? Math.sin(t * 10) * 0.15 : Math.max(0, Math.sin(t * 0.9)) > 0.9 ? 0.6 : 0
    if (tail.current) tail.current.rotation.z = Math.sin(t * (a.current.moving ? 14 : 5)) * 0.3
  })
  return (
    <group scale={scale}>
      <mesh position={[0, 0.2, 0]} scale={[0.85, 0.75, 1.2]} castShadow>
        <sphereGeometry args={[0.22, 10, 8]} />
        <Plastic color="#ffffff" />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.17, 0.22, -0.02]} rotation={[0.2, 0, sd * -0.2]} scale={[0.35, 0.6, 1]}>
          <sphereGeometry args={[0.16, 8, 6]} />
          <Plastic color="#f1f5f9" />
        </mesh>
      ))}
      <mesh ref={tail} position={[0, 0.27, -0.26]} rotation={[0.8, 0, 0]}>
        <coneGeometry args={[0.07, 0.16, 4]} />
        <Plastic color="#ffffff" />
      </mesh>
      <group ref={head} position={[0, 0.38, 0.14]}>
        <mesh position={[0, 0.05, 0.03]}>
          <sphereGeometry args={[0.12, 10, 8]} />
          <Plastic color="#2f855a" />
        </mesh>
        <Eyes y={0.09} z={0.12} x={0.065} s={0.02} />
        <mesh position={[0, 0.02, 0.17]} scale={[1, 0.4, 1]}>
          <boxGeometry args={[0.1, 0.1, 0.12]} />
          <Plastic color="#f59e0b" />
        </mesh>
      </group>
    </group>
  )
}

function Chicken() {
  const a = useAnimal()
  const head = useRef<Group>(null)
  const tail = useRef<Mesh>(null)
  const wings = useRef<Group>(null)
  useFrame(() => {
    const t = a.current.t
    // idle chickens peck at the ground in quick bursts
    const peck = !a.current.moving && Math.sin(t * 1.7) > 0.2 ? Math.abs(Math.sin(t * 12)) * 0.9 : 0
    if (head.current) head.current.rotation.x = peck + (a.current.moving ? Math.sin(t * 12) * 0.2 : 0)
    if (tail.current) tail.current.rotation.x = -0.6 + Math.sin(t * 6) * 0.08
    if (wings.current) wings.current.rotation.z = a.current.moving ? Math.abs(Math.sin(t * 16)) * 0.25 : 0
  })
  return (
    <group>
      <mesh position={[0, 0.25, 0]} scale={[0.8, 0.9, 1.1]} castShadow>
        <sphereGeometry args={[0.22, 10, 8]} />
        <Plastic color="#fefce8" />
      </mesh>
      <group ref={wings}>
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 0.17, 0.27, -0.02]} scale={[0.3, 0.6, 0.9]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <Plastic color="#f5f0c8" />
          </mesh>
        ))}
      </group>
      <mesh ref={tail} position={[0, 0.38, -0.24]} rotation={[-0.6, 0, 0]}>
        <coneGeometry args={[0.1, 0.24, 4]} />
        <Plastic color="#e7dfae" />
      </mesh>
      <group ref={head} position={[0, 0.42, 0.12]}>
        <mesh position={[0, 0.06, 0.03]}>
          <sphereGeometry args={[0.12, 10, 8]} />
          <Plastic color="#fefce8" />
        </mesh>
        <Block position={[0, 0.2, 0.03]} size={[0.04, 0.1, 0.14]} color="#ef4444" />
        <Block position={[0, 0.04, 0.16]} size={[0.06, 0.05, 0.08]} color="#f59e0b" />
        <Block position={[0, -0.01, 0.15]} size={[0.03, 0.06, 0.03]} color="#ef4444" />
        <Eyes y={0.09} z={0.1} x={0.07} s={0.02} />
      </group>
      {[-0.07, 0.07].map((x) => (
        <Block key={x} position={[x, 0.06, 0]} size={[0.03, 0.12, 0.03]} color="#f59e0b" />
      ))}
    </group>
  )
}

function Cow() {
  const a = useAnimal()
  const head = useRef<Group>(null)
  const tail = useRef<Group>(null)
  const ear = useRef<Group>(null)
  const legs = useRef<Group[]>([])
  useFrame(() => {
    const t = a.current.t
    // idle cows lower their heads to graze
    const graze = !a.current.moving ? Math.min(1, a.current.idle / 1.5) * (0.5 + Math.sin(t * 1.2) * 0.1) : 0
    if (head.current) head.current.rotation.x += (graze - head.current.rotation.x) * 0.1
    if (tail.current) tail.current.rotation.z = Math.sin(t * 2.2) * 0.35
    if (ear.current) ear.current.rotation.z = Math.max(0, Math.sin(t * 0.8)) > 0.95 ? Math.sin(t * 30) * 0.3 : 0
    legs.current.forEach((l, i) => {
      if (l) l.rotation.x = a.current.moving ? Math.sin(t * 6 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.5 : 0
    })
  })
  return (
    <group scale={1.3}>
      <Block position={[0, 0.75, 0]} size={[0.7, 0.6, 1.3]} color="#fafafa" />
      <Block position={[0.2, 0.85, 0.2]} size={[0.32, 0.36, 0.5]} color="#1f2937" />
      <Block position={[-0.2, 0.7, -0.35]} size={[0.3, 0.3, 0.4]} color="#1f2937" />
      <Block position={[0, 0.5, -0.4]} size={[0.3, 0.12, 0.3]} color="#fda4af" />
      <group ref={head} position={[0, 0.95, 0.62]}>
        <Block position={[0, 0, 0.18]} size={[0.45, 0.45, 0.45]} color="#fafafa" />
        <Block position={[0, -0.13, 0.43]} size={[0.38, 0.2, 0.1]} color="#fda4af" />
        <Eyes y={0.08} z={0.41} x={0.15} s={0.03} />
        {[-1, 1].map((sd) => (
          <Block key={sd} position={[sd * 0.2, 0.28, 0.1]} size={[0.06, 0.16, 0.06]} color="#f5e6c8" />
        ))}
        <group ref={ear} position={[0.26, 0.12, 0.08]}>
          <Block position={[0.08, 0, 0]} size={[0.18, 0.08, 0.14]} color="#1f2937" />
        </group>
        <Block position={[-0.34, 0.12, 0.08]} size={[0.18, 0.08, 0.14]} color="#fafafa" />
      </group>
      <group ref={tail} position={[0, 0.95, -0.64]}>
        <Block position={[0, -0.25, -0.02]} size={[0.05, 0.5, 0.05]} color="#fafafa" />
        <Block position={[0, -0.52, -0.02]} size={[0.1, 0.12, 0.1]} color="#1f2937" />
      </group>
      {[
        [-0.25, -0.45],
        [0.25, -0.45],
        [-0.25, 0.45],
        [0.25, 0.45],
      ].map(([x, z], i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) legs.current[i] = g
          }}
          position={[x, 0.45, z]}
        >
          <Block position={[0, -0.22, 0]} size={[0.16, 0.45, 0.16]} color="#fafafa" />
        </group>
      ))}
    </group>
  )
}

function Sheep() {
  const a = useAnimal()
  const head = useRef<Group>(null)
  useFrame(() => {
    const t = a.current.t
    const graze = !a.current.moving ? Math.min(1, a.current.idle / 1.2) * 0.55 : 0
    if (head.current) head.current.rotation.x += (graze + Math.sin(t * 3) * 0.04 * graze - head.current.rotation.x) * 0.1
  })
  return (
    <group scale={1.15}>
      <mesh position={[0, 0.55, 0]} scale={[1, 0.85, 1.25]} castShadow>
        <sphereGeometry args={[0.36, 10, 8]} />
        <Plastic color="#f5f5f4" roughness={0.95} />
      </mesh>
      {[[-0.18, 0.78, 0.15], [0.18, 0.78, -0.1], [0, 0.8, -0.3], [0.2, 0.62, 0.3], [-0.2, 0.62, -0.3]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.17, 8, 6]} />
          <Plastic color="#fafaf9" roughness={0.95} />
        </mesh>
      ))}
      <group ref={head} position={[0, 0.62, 0.42]}>
        <mesh position={[0, 0, 0.12]} scale={[0.85, 1, 1.1]}>
          <sphereGeometry args={[0.15, 10, 8]} />
          <Plastic color="#3f3f46" />
        </mesh>
        <Eyes y={0.04} z={0.24} x={0.07} s={0.022} />
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 0.17, 0.02, 0.08]} rotation={[0, 0, sd * -0.8]} scale={[1, 0.4, 0.6]}>
            <sphereGeometry args={[0.1, 6, 5]} />
            <Plastic color="#3f3f46" />
          </mesh>
        ))}
      </group>
      {[[-0.18, -0.28], [0.18, -0.28], [-0.18, 0.28], [0.18, 0.28]].map(([x, z], i) => (
        <Block key={i} position={[x, 0.16, z]} size={[0.09, 0.32, 0.09]} color="#3f3f46" />
      ))}
    </group>
  )
}

function Dog() {
  const a = useAnimal()
  const tail = useRef<Group>(null)
  const head = useRef<Group>(null)
  const body = useRef<Group>(null)
  const legs = useRef<Group[]>([])
  useFrame(() => {
    const t = a.current.t
    const happy = a.current.sit || a.current.moving
    if (tail.current) tail.current.rotation.y = Math.sin(t * (happy ? 18 : 3)) * (happy ? 0.7 : 0.2)
    if (head.current) head.current.rotation.z = a.current.sit ? Math.sin(t * 2) * 0.12 : 0
    if (body.current) body.current.rotation.x = a.current.sit ? -0.55 : 0
    legs.current.forEach((l, i) => {
      if (l) l.rotation.x = a.current.moving ? Math.sin(t * 14 + (i % 2 ? Math.PI : 0)) * 0.7 : 0
    })
  })
  return (
    <group scale={1.1}>
      <group ref={body} position={[0, 0.32, 0]}>
        <Block position={[0, 0.12, 0]} size={[0.3, 0.28, 0.7]} color="#d4a373" />
        <Block position={[0, 0.02, 0.05]} size={[0.28, 0.1, 0.4]} color="#fefae0" />
        <group ref={head} position={[0, 0.3, 0.42]}>
          <Block position={[0, 0, 0]} size={[0.26, 0.24, 0.26]} color="#d4a373" />
          <Block position={[0, -0.04, 0.17]} size={[0.14, 0.12, 0.16]} color="#fefae0" />
          <Block position={[0, -0.01, 0.26]} size={[0.06, 0.05, 0.04]} color="#1f2937" />
          <Eyes y={0.05} z={0.131} x={0.07} s={0.022} />
          {[-1, 1].map((sd) => (
            <Block key={sd} position={[sd * 0.15, 0.08, -0.02]} size={[0.06, 0.2, 0.1]} color="#8a5a2b" rotation={[0, 0, sd * -0.25]} />
          ))}
        </group>
        <group ref={tail} position={[0, 0.2, -0.38]} rotation={[0.9, 0, 0]}>
          <Block position={[0, 0.12, 0]} size={[0.06, 0.26, 0.06]} color="#d4a373" />
        </group>
      </group>
      {[[-0.1, -0.25], [0.1, -0.25], [-0.1, 0.25], [0.1, 0.25]].map(([x, z], i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) legs.current[i] = g
          }}
          position={[x, 0.3, z]}
        >
          <Block position={[0, -0.14, 0]} size={[0.08, 0.28, 0.08]} color="#d4a373" />
        </group>
      ))}
    </group>
  )
}

function Cat({ color = '#f97316' }: { color?: string }) {
  const a = useAnimal()
  const tail = useRef<Group>(null)
  const head = useRef<Group>(null)
  const body = useRef<Group>(null)
  const legs = useRef<Group[]>([])

  useFrame(() => {
    const t = a.current.t
    const happy = a.current.sit || a.current.moving
    if (tail.current) {
      tail.current.rotation.y = Math.sin(t * (happy ? 12 : 2.5)) * 0.4
      tail.current.rotation.z = 0.3 + Math.sin(t * 3) * 0.15
    }
    if (head.current) {
      head.current.rotation.z = a.current.sit ? Math.sin(t * 1.5) * 0.08 : 0
      head.current.rotation.x = a.current.sit ? 0.1 : 0
    }
    if (body.current) {
      body.current.rotation.x = a.current.sit ? -0.45 : 0
    }
    legs.current.forEach((l, i) => {
      if (l) l.rotation.x = a.current.moving ? Math.sin(t * 12 + (i % 2 ? Math.PI : 0)) * 0.6 : 0
    })
  })

  return (
    <group scale={0.9}>
      <group ref={body} position={[0, 0.26, 0]}>
        <Block position={[0, 0.08, 0]} size={[0.22, 0.2, 0.52]} color={color} />
        <Block position={[0, 0.02, 0.04]} size={[0.2, 0.08, 0.32]} color="#fffbeb" />
        <group ref={head} position={[0, 0.22, 0.32]}>
          <Block position={[0, 0, 0]} size={[0.2, 0.18, 0.2]} color={color} />
          <Block position={[0, -0.03, 0.12]} size={[0.11, 0.09, 0.08]} color="#fffbeb" />
          <Block position={[0, 0, 0.165]} size={[0.04, 0.03, 0.02]} color="#f43f5e" />
          <Eyes y={0.03} z={0.105} x={0.055} s={0.018} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.08, 0.12, 0]} rotation={[0, 0, sd * -0.2]}>
              <coneGeometry args={[0.04, 0.08, 4]} />
              <Plastic color={color} />
            </mesh>
          ))}
        </group>
        <group ref={tail} position={[0, 0.16, -0.28]} rotation={[0.8, 0, 0]}>
          <Block position={[0, 0.12, 0]} size={[0.04, 0.28, 0.04]} color={color} />
          <Block position={[0, 0.28, 0.04]} size={[0.035, 0.12, 0.035]} color="#fffbeb" />
        </group>
      </group>
      {[[-0.08, -0.18], [0.08, -0.18], [-0.08, 0.18], [0.08, 0.18]].map(([x, z], i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) legs.current[i] = g
          }}
          position={[x, 0.24, z]}
        >
          <Block position={[0, -0.12, 0]} size={[0.05, 0.24, 0.05]} color={color} />
          <Block position={[0, -0.23, 0.02]} size={[0.06, 0.04, 0.08]} color="#fffbeb" />
        </group>
      ))}
    </group>
  )
}

function ActiveCompanion() {
  const companion = useGame((s) => s.companion)
  const ref = useRef<Group>(null)
  const pos = useRef({ x: player.x - 1.2, z: player.z - 1.2, heading: 0 })
  const st = useRef<AnimalState>({ moving: false, t: 0, idle: 0, sit: false })

  useFrame((_, rawDt) => {
    if (!companion || !ref.current) return
    const dt = Math.min(rawDt, 0.05)
    st.current.t += dt
    const p = pos.current

    // Riding a bike leaves the pet back resting/waiting
    const isRiding = player.vehicle !== null
    companionPos.waiting = isRiding

    if (isRiding) {
      // Pet stays put and waits for player
      st.current.moving = false
      st.current.sit = true
      st.current.idle += dt
      const dx = player.x - p.x
      const dz = player.z - p.z
      const faceAngle = Math.atan2(dx, dz)
      let diff = faceAngle - p.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      p.heading += diff * Math.min(1, dt * 2)
    } else {
      const dx = player.x - p.x
      const dz = player.z - p.z
      const d = Math.hypot(dx, dz)

      const targetDist = 1.3
      if (d > 22) {
        p.x = player.x - 1.2
        p.z = player.z - 1.2
      } else if (d > targetDist) {
        const speed = Math.min(7.5, Math.max(2.2, d * 1.8))
        const step = Math.min(d - targetDist, speed * dt)
        p.x += (dx / d) * step
        p.z += (dz / d) * step
        const wantHeading = Math.atan2(dx, dz)
        let diff = wantHeading - p.heading
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        p.heading += diff * Math.min(1, dt * 10)
        st.current.moving = true
        st.current.sit = false
        st.current.idle = 0
      } else {
        st.current.moving = false
        st.current.sit = true
        st.current.idle += dt
        const faceAngle = Math.atan2(dx, dz)
        let diff = faceAngle - p.heading
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        p.heading += diff * Math.min(1, dt * 4)
      }
    }

    companionPos.x = p.x
    companionPos.z = p.z

    const y = groundY(p.x, p.z)
    ref.current.position.set(p.x, y, p.z)
    ref.current.rotation.y = p.heading
  })

  if (!companion) return null

  return (
    <group ref={ref} position={[player.x - 1.2, 0, player.z - 1.2]}>
      <AnimalCtx.Provider value={st}>
        {companion.kind === 'dog' && <Dog />}
        {companion.kind === 'cat' && <Cat />}
        {companion.kind === 'duck' && <Duck />}
      </AnimalCtx.Provider>
      <Label position={[0, 0.9, 0]}>
        <div className="whitespace-nowrap rounded-full bg-pink-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          {companionPos.waiting ? `💤 ${companion.name} (Waiting)` : `💖 ${companion.name}`}
        </div>
      </Label>
    </group>
  )
}

function Crab() {
  const a = useAnimal()
  const claws = useRef<Group>(null)
  useFrame(() => {
    const t = a.current.t
    if (claws.current) claws.current.rotation.x = Math.sin(t * (a.current.moving ? 14 : 3)) * 0.25
  })
  return (
    <group scale={0.9}>
      <mesh position={[0, 0.12, 0]} scale={[1.3, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.16, 10, 8]} />
        <Plastic color="#ef6a4a" />
      </mesh>
      <Eyes y={0.24} z={0.1} x={0.07} s={0.03} />
      <group ref={claws}>
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 0.24, 0.14, 0.12]}>
            <Block position={[0, 0, 0]} size={[0.14, 0.08, 0.14]} color="#ef6a4a" />
          </group>
        ))}
      </group>
      {[-1, 1].flatMap((sd) => [0, 1, 2].map((i) => <Block key={`${sd}${i}`} position={[sd * 0.2, 0.05, -0.06 + i * 0.07]} size={[0.14, 0.03, 0.03]} color="#d9532f" />))}
    </group>
  )
}

function Seagull() {
  const a = useAnimal()
  const head = useRef<Group>(null)
  useFrame(() => {
    const t = a.current.t
    if (head.current) head.current.rotation.x = a.current.moving ? Math.sin(t * 8) * 0.12 : Math.max(0, Math.sin(t * 1.1)) > 0.92 ? 0.7 : 0
  })
  return (
    <group scale={1.1}>
      <mesh position={[0, 0.3, 0]} scale={[0.8, 0.8, 1.3]} castShadow>
        <sphereGeometry args={[0.2, 10, 8]} />
        <Plastic color="#fafafa" />
      </mesh>
      <Block position={[0, 0.36, -0.2]} size={[0.3, 0.06, 0.3]} color="#94a3b8" />
      <group ref={head} position={[0, 0.5, 0.18]}>
        <mesh>
          <sphereGeometry args={[0.1, 8, 6]} />
          <Plastic color="#ffffff" />
        </mesh>
        <Eyes y={0.02} z={0.085} x={0.05} s={0.018} />
        <Block position={[0, -0.01, 0.13]} size={[0.04, 0.04, 0.14]} color="#fbbf24" />
      </group>
      {[-0.05, 0.05].map((x) => (
        <Block key={x} position={[x, 0.08, 0]} size={[0.02, 0.16, 0.02]} color="#fb923c" />
      ))}
    </group>
  )
}

/** A gull gliding in circles high above the beach */
function FlyingGull({ cx, cz, r, h, speed, phase }: { cx: number; cz: number; r: number; h: number; speed: number; phase: number }) {
  const ref = useRef<Group>(null)
  const wL = useRef<Group>(null)
  const wR = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase
    if (ref.current) {
      ref.current.position.set(cx + Math.cos(t) * r, h + Math.sin(t * 2.3) * 0.7, cz + Math.sin(t) * r)
      ref.current.rotation.y = -t
      ref.current.rotation.z = 0.25
    }
    const f = Math.sin(clock.elapsedTime * 5 + phase) * 0.45
    if (wL.current) wL.current.rotation.z = f
    if (wR.current) wR.current.rotation.z = -f
  })
  return (
    <group ref={ref}>
      <mesh scale={[0.5, 0.4, 1.3]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {[wL, wR].map((w, i) => (
        <group key={i} ref={w}>
          <mesh position={[i ? 0.4 : -0.4, 0, 0]}>
            <boxGeometry args={[0.8, 0.03, 0.28]} />
            <meshStandardMaterial color="#f1f5f9" side={2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Ducks paddling in circles around the pond */
function SwimmingDuck({ r, speed, offset }: { r: number; speed: number; offset: number }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const a = clock.elapsedTime * speed + offset
    ref.current.position.set(POND.x + Math.cos(a) * r, 0.02 + Math.sin(clock.elapsedTime * 3 + offset) * 0.02, POND.z + Math.sin(a) * r)
    ref.current.rotation.y = -a + (speed > 0 ? 0 : Math.PI)
  })
  return (
    <group ref={ref}>
      <Duck />
    </group>
  )
}

/** A fish that leaps out of the river now and then */
function JumpingFish({ x }: { x: number }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime + x) % 5
    const jumping = t < 0.9
    ref.current.visible = jumping
    if (jumping) {
      const p = t / 0.9
      ref.current.position.set(x + p * 1.4, Math.sin(p * Math.PI) * 1.1, (RIVER.z0 + RIVER.z1) / 2 + Math.sin(x) * 1.5)
      ref.current.rotation.z = -(p - 0.5) * 2.4
    }
  })
  return (
    <group ref={ref} rotation={[0, 0, 0]}>
      <mesh scale={[1.4, 0.7, 0.45]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <Plastic color="#fb923c" />
      </mesh>
      <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.13, 0.2, 4]} />
        <Plastic color="#f97316" />
      </mesh>
    </group>
  )
}

/** Butterflies fluttering over flower beds */
function Butterfly({ cx, cz, color, phase }: { cx: number; cz: number; color: string; phase: number }) {
  const ref = useRef<Group>(null)
  const wingL = useRef<Group>(null)
  const wingR = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    if (ref.current) ref.current.position.set(cx + Math.sin(t * 0.7) * 2, 1.2 + Math.sin(t * 2) * 0.3, cz + Math.cos(t * 0.9) * 1.5)
    const f = Math.sin(t * 20) * 0.9
    if (wingL.current) wingL.current.rotation.z = f
    if (wingR.current) wingR.current.rotation.z = -f
  })
  return (
    <group ref={ref}>
      {[wingL, wingR].map((w, i) => (
        <group key={i} ref={w}>
          <mesh position={[i ? 0.09 : -0.09, 0, 0]}>
            <boxGeometry args={[0.16, 0.01, 0.14]} />
            <meshStandardMaterial color={color} side={2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Animals() {
  const stats = useGame((s) => s.stats)
  const companion = useGame((s) => s.companion)
  const townEco = getTownEcoStatus(stats)

  const fishSpots =
    townEco.tier === 3
      ? [-36, -28, -20, -12, -4, 4, 12, 20, 28, 36, 44]
      : townEco.tier === 2
        ? [-32, -18, -4, 10, 24, 38]
        : [-25, 5, 30]

  return (
    <group>
      {/* Active companion following the player */}
      <ActiveCompanion />

      {/* park + forest */}
      <Wanderer center={[12, -27]} radius={2} speed={1.4} gait="hop" flee={3.2}>
        <Rabbit />
      </Wanderer>
      <Wanderer center={[27, -10]} radius={2} speed={1.4} gait="hop" flee={3.2}>
        <Rabbit color="#d6d3d1" />
      </Wanderer>
      <Wanderer center={[-3, -40]} radius={2.5} speed={1.4} gait="hop" flee={3.2}>
        <Rabbit />
      </Wanderer>
      <Wanderer center={[36, -34]} radius={3} speed={2.4} gait="dash" flee={3}>
        <Squirrel />
      </Wanderer>
      <Wanderer center={[40, -40]} radius={2.5} speed={2.4} gait="dash" flee={3}>
        <Squirrel />
      </Wanderer>
      <Wanderer center={[-10, 42]} radius={3} speed={2.4} gait="dash" flee={3}>
        <Squirrel />
      </Wanderer>
      <Wanderer center={[-8.5, 7]} radius={1.2} speed={2.2} gait="dash" flee={3}>
        <Squirrel />
      </Wanderer>
      {/* ducks */}
      <SwimmingDuck r={3.5} speed={0.25} offset={0} />
      <SwimmingDuck r={3.5} speed={0.25} offset={0.6} />
      <SwimmingDuck r={2} speed={-0.35} offset={2} />
      {/* Pip the Duckling (adoptable near pond) */}
      {(!companion || companion.kind !== 'duck') && (
        <Wanderer center={[28, -23]} radius={1.8} speed={0.7} gait="waddle">
          <Duck />
        </Wanderer>
      )}
      {/* farm */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Wanderer key={i} center={[32 + (i % 3) * 1.5, 19 + Math.floor(i / 3) * 2]} radius={2.6} speed={1} gait="waddle">
          <Chicken />
        </Wanderer>
      ))}
      <Wanderer center={[40, 2]} radius={2.5} speed={0.5} gait="walk" size={0.8}>
        <Cow />
      </Wanderer>
      {[0, 1, 2].map((i) => (
        <Wanderer key={`sheep${i}`} center={[40.5 + (i - 1) * 1.2, 25]} radius={2.4} speed={0.6} gait="walk" size={0.5}>
          <Sheep />
        </Wanderer>
      ))}
      {/* Buster the Dog (adoptable in town plaza) */}
      {(!companion || companion.kind !== 'dog') && (
        <Wanderer center={[-2, -2]} radius={4} speed={1.6} gait="walk" size={0.38}>
          <Dog />
        </Wanderer>
      )}
      {/* Milo the Cat (adoptable near garden / Maple Street) */}
      {(!companion || companion.kind !== 'cat') && (
        <Wanderer center={[10, 4]} radius={2.5} speed={1.2} gait="walk" size={0.3}>
          <Cat />
        </Wanderer>
      )}
      {/* beach */}
      {[[52, 5], [51, -8], [53, 18]].map(([x, z], i) => (
        <Wanderer key={`crab${i}`} center={[x, z]} radius={2.2} speed={1.8} gait="dash" flee={2.6}>
          <Crab />
        </Wanderer>
      ))}
      {[[49, 12], [52, -12]].map(([x, z], i) => (
        <Wanderer key={`gull${i}`} center={[x, z]} radius={2.5} speed={0.8} gait="walk" flee={3.5}>
          <Seagull />
        </Wanderer>
      ))}
      <FlyingGull cx={52} cz={4} r={9} h={9} speed={0.35} phase={0} />
      <FlyingGull cx={52} cz={4} r={13} h={12} speed={0.28} phase={2.5} />
      <FlyingGull cx={12} cz={-20} r={10} h={11} speed={0.3} phase={4} />
      {/* dynamic jumping river fish based on town eco status */}
      {fishSpots.map((x) => (
        <JumpingFish key={x} x={x} />
      ))}
      {/* butterflies */}
      <Butterfly cx={-5} cz={9.5} color="#f472b6" phase={0} />
      <Butterfly cx={6} cz={9.5} color="#fde047" phase={2} />
      <Butterfly cx={18} cz={10} color="#a78bfa" phase={4} />
      <Butterfly cx={6} cz={-24} color="#38bdf8" phase={1} />
    </group>
  )
}
