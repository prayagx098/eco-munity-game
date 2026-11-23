import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { Group } from 'three'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { act, hostNpcs, lastBellRing, npcPositions, player } from '../../state/sceneRegistry'
import { bridge } from '../../state/netBridge'
import { NAV_NEIGHBOURS, NAV_NODES, STATIC_NPCS, groundY } from '../../state/world'
import { Label, Near, Plastic } from './primitives'
import { getTexture } from './textures'
import { ClothMat } from './Cloth'
import { ITEM_BY_ID } from '../../state/shop'

const SKIN = '#ffd23f'

/** One shared, softly rounded head (like a classic toy figure) */
const HEAD_GEO = new THREE.LatheGeometry(
  [
    [0, 0],
    [0.18, 0],
    [0.196, 0.012],
    [0.2, 0.04],
    [0.2, 0.28],
    [0.196, 0.308],
    [0.18, 0.32],
    [0, 0.32],
  ].map(([r, y]) => new THREE.Vector2(r, y)),
  36,
)

/** Lighten (f>1) or darken (f<1) a colour */
function shade(hex: string, f: number) {
  const c = new THREE.Color(hex)
  c.r = Math.min(1, c.r * f)
  c.g = Math.min(1, c.g * f)
  c.b = Math.min(1, c.b * f)
  return `#${c.getHexString()}`
}

export interface MinifigAnim {
  speed: number
  armsUp?: boolean
  wave?: boolean
  /** chatting: little hand gestures and head bobs */
  talk?: boolean
  /** sitting on a bike / scooter / cart */
  ride?: boolean
  /** what they are riding: sitting on a bike, standing on a scooter, or surfing a board */
  rideKind?: 'bike' | 'scooter' | 'board'
  /** head turn toward something (radians, relative to the body) */
  look?: number
  /** head turned this far relative to the body (set while the body is turning to catch up) */
  headYaw?: number
  /** a one-off gesture: kind + progress 0..1 */
  act?: { kind: string; p: number } | null
  /** airborne jump / hop 0..1 */
  jump?: number
  /** vertical speed while jumping (+ rising, − falling) so the pose can follow the arc */
  jumpVy?: number
}

const ease = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)))

/** Pose (body lean, left arm, right arm) for a gesture at progress p */
function actPose(kind: string, p: number, t: number): { lean: number; aL: number; aR: number } {
  const e = ease(p)
  // quick wind-up, hold, then relax
  const hold = Math.min(1, p * 3.2) * Math.min(1, (1 - p) * 3.2)
  switch (kind) {
    case 'feed': // scoop and scatter with a sprinkling wrist
      return { lean: 0.35 * hold, aL: -0.9 * hold, aR: -1.5 * hold + Math.sin(t * 22) * 0.18 * hold }
    case 'water': // tip a can forward
      return { lean: 0.28 * hold, aL: -0.7 * hold, aR: -1.7 * hold + Math.sin(p * Math.PI * 2) * 0.1 }
    case 'tap': // turn a wrench back and forth
      return { lean: 0.3 * hold, aL: -0.6 * hold, aR: -1.4 * hold + Math.sin(t * 16) * 0.35 * hold }
    case 'turn': // dig and heave the compost with a fork
      return { lean: 0.5 * hold, aL: -1.0 * hold + Math.sin(t * 9) * 0.25 * hold, aR: -1.1 * hold - Math.sin(t * 9) * 0.25 * hold }
    case 'plant':
    case 'pickup':
      return { lean: 0.55 * e, aL: -1.0 * e, aR: -1.0 * e }
    case 'lights':
      return { lean: 0.05 * e, aL: 0, aR: -2.6 * e }
    case 'bin': // toss forward
      return { lean: 0.15 * e, aL: -1.6 * e, aR: -1.6 * e }
    case 'look': // hand up to the eye
      return { lean: 0.22 * hold, aL: -0.5 * hold, aR: -2.0 * hold }
    default: // talk / quest: friendly wave
      return { lean: 0.06 * e, aL: 0, aR: -1.5 * hold + Math.sin(t * 11) * 0.3 * hold }
  }
}

interface MinifigProps {
  shirt: string
  pants: string
  hair: string
  anim: { current: MinifigAnim }
  longHair?: boolean
  /** shop items */
  shirt2?: string
  shirtId?: string
  pantsId?: string
  pattern?: string
  shoes?: string
  hat?: string
  glasses?: string
  back?: string
  /** a show-off item from the store (trophy, robot…) floating beside the character */
  show?: string
  bandana?: 'red' | 'blue' | null
}

/** A prize from the store that floats or perches beside the character, so everybody can see it */
function ShowOff({ kind }: { kind: string }) {
  const g = useRef<Group>(null)
  const spin = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (g.current) g.current.position.y = (kind === 'robot' || kind === 'telescope' ? 0 : Math.sin(t * 2) * 0.04)
    if (spin.current) spin.current.rotation.y = t * (kind === 'stickers' ? 1.4 : kind === 'puzzle' ? 1.1 : 0.8)
  })
  const gold = { color: '#facc15', metalness: 0.7, roughness: 0.25 }
  return (
    <group ref={g}>
      {kind === 'trophy' && (
        <group position={[0.58, 1.1, 0.18]} scale={0.9}>
          <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.1, 0.12, 0.05, 12]} /><meshStandardMaterial {...gold} /></mesh>
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.03, 0.03, 0.15, 8]} /><meshStandardMaterial {...gold} /></mesh>
          <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.15, 0.07, 0.2, 14]} /><meshStandardMaterial {...gold} /></mesh>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.17, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.06, 0.015, 6, 12]} /><meshStandardMaterial {...gold} /></mesh>
          ))}
        </group>
      )}
      {kind === 'robot' && (
        <group position={[-0.5, 1.5, 0]} rotation={[0, 0.4, 0]}>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.2, 0.2, 0.15]} /><meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0, 0.19, 0]}><boxGeometry args={[0.18, 0.15, 0.15]} /><meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} /></mesh>
          {[-0.04, 0.04].map((x) => (
            <mesh key={x} position={[x, 0.2, 0.08]}><sphereGeometry args={[0.025, 8, 6]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} /></mesh>
          ))}
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.008, 0.008, 0.08, 5]} /><meshStandardMaterial color="#475569" /></mesh>
          <mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.025, 8, 6]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} /></mesh>
        </group>
      )}
      {kind === 'globe' && (
        <group position={[0.62, 1.85, 0]}>
          <group ref={spin}>
            <mesh><sphereGeometry args={[0.17, 16, 12]} /><meshStandardMaterial color="#3b82f6" roughness={0.5} /></mesh>
            <mesh position={[0.06, 0.06, 0.1]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#22c55e" roughness={0.8} /></mesh>
            <mesh position={[-0.1, -0.05, 0.08]}><sphereGeometry args={[0.07, 8, 6]} /><meshStandardMaterial color="#22c55e" roughness={0.8} /></mesh>
          </group>
          <mesh rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[0.22, 0.012, 6, 24]} /><meshStandardMaterial {...gold} /></mesh>
        </group>
      )}
      {kind === 'stickers' && (
        <group position={[0, 1.95, 0]} ref={spin}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.5, Math.sin(i * 1.7) * 0.06, Math.sin((i * Math.PI * 2) / 3) * 0.5]}>
              <octahedronGeometry args={[0.08]} />
              <meshStandardMaterial color={['#facc15', '#f472b6', '#38bdf8'][i]} emissive={['#facc15', '#f472b6', '#38bdf8'][i]} emissiveIntensity={0.7} />
            </mesh>
          ))}
        </group>
      )}
      {kind === 'puzzle' && (
        <group position={[-0.62, 1.2, 0.15]}>
          <group ref={spin}>
            <mesh><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color="#ef4444" /></mesh>
            {[[0.101, 0, 0, '#22c55e'], [-0.101, 0, 0, '#3b82f6'], [0, 0.101, 0, '#facc15'], [0, -0.101, 0, '#f97316'], [0, 0, 0.101, '#ffffff'], [0, 0, -0.101, '#a855f7']].map(([x, y, z, c], i) => (
              <mesh key={i} position={[x as number, y as number, z as number]}><boxGeometry args={[Math.abs(x as number) > 0 ? 0.01 : 0.15, Math.abs(y as number) > 0 ? 0.01 : 0.15, Math.abs(z as number) > 0 ? 0.01 : 0.15]} /><meshStandardMaterial color={c as string} /></mesh>
            ))}
          </group>
        </group>
      )}
      {kind === 'telescope' && (
        <group position={[0.12, 1.0, -0.3]} rotation={[0.9, 0, 0.5]}>
          <mesh><cylinderGeometry args={[0.04, 0.05, 0.55, 10]} /><meshStandardMaterial color="#92400e" metalness={0.3} roughness={0.5} /></mesh>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.06, 0.045, 0.12, 10]} /><meshStandardMaterial {...gold} /></mesh>
          <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.03, 0.04, 0.1, 10]} /><meshStandardMaterial color="#1f2937" /></mesh>
        </group>
      )}
      {kind === 'notebook' && (
        <group position={[-0.55, 1.05, 0.25]} rotation={[0.3, 0.5, 0]}>
          <mesh><boxGeometry args={[0.2, 0.26, 0.04]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
          <mesh position={[0.0, 0, 0.022]}><boxGeometry args={[0.17, 0.22, 0.005]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[-0.095, 0, 0]}><boxGeometry args={[0.015, 0.26, 0.05]} /><meshStandardMaterial color="#facc15" /></mesh>
        </group>
      )}
    </group>
  )
}

/** LEGO-style minifigure with swinging arms and legs */
export function Minifig({ shirt, pants, hair, anim, longHair, shirt2, shirtId, pantsId, pattern, shoes, hat, glasses, back, show, bandana }: MinifigProps) {
  const shirtItem = shirtId ? ITEM_BY_ID[shirtId] : undefined
  const pantsItem = pantsId ? ITEM_BY_ID[pantsId] : undefined
  const shirtKind = shirtItem?.fabric ?? 'cotton'
  const pantsKind = pantsItem?.fabric ?? 'denim'
  const extras = shirtItem?.extras ?? []
  const shorts = pantsItem?.style === 'shorts'
  const cargo = pantsItem?.extras?.includes('cargo')
  const soleGlow = useRef<THREE.MeshStandardMaterial>(null)
  const shoeItem = shoes ? ITEM_BY_ID[shoes] : undefined
  const hatItem = hat ? ITEM_BY_ID[hat] : undefined
  const glassItem = glasses ? ITEM_BY_ID[glasses] : undefined
  const backItem = back ? ITEM_BY_ID[back] : undefined
  const shoeColor = shoeItem?.color ?? '#273244'
  const boots = shoeItem?.style === 'boots'
  const shoeKind = shoeItem?.style === 'glitter' ? 'sequin' : shoeItem?.style === 'gold' ? 'metal' : undefined
  const capeRef = useRef<Group>(null)
  const wingL = useRef<Group>(null)
  const wingR = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const upper = useRef<Group>(null)
  const root = useRef<Group>(null)
  const head = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const blinkAt = useRef(1 + Math.random() * 3)
  const seed = useRef(Math.random() * 100)
  const blend = useRef({ lean: 0, aL: 0, aR: 0, w: 0 })
  // smoothed jump pose so take-off, flight and landing flow into each other
  const jp = useRef({ w: 0, legL: 0, legR: 0, aL: 0, aR: 0, az: 0, tilt: 0 })

  useFrame(({ clock }, dt) => {
    const a = anim.current
    const t = clock.elapsedTime
    const swing = Math.sin(t * (a.speed > 1.2 ? 13 : 9)) * 0.7 * Math.min(1, a.speed)
    const phase = t + seed.current
    if (a.ride) {
      const rk = a.rideKind ?? 'bike'
      if (rk === 'scooter') {
        // standing tall on the deck: one foot forward, one back
        if (legL.current) legL.current.rotation.x = -0.16
        if (legR.current) legR.current.rotation.x = 0.24
      } else if (rk === 'board') {
        // board stance: knees bent, feet apart front and back
        if (legL.current) legL.current.rotation.x = -0.6
        if (legR.current) legR.current.rotation.x = 0.62
      } else {
        // seated: knees forward, feet resting – no pedalling
        if (legL.current) legL.current.rotation.x = -1.15
        if (legR.current) legR.current.rotation.x = -1.15
      }
    } else {
      if (legL.current) legL.current.rotation.x = swing
      if (legR.current) legR.current.rotation.x = -swing
    }
    // jump: rising = knees drawn up and arms swung overhead; falling = legs reach down, arms spread for balance
    const J = jp.current
    {
      const airborne = !a.ride && (a.jump ?? 0) > 0.03
      const vy = a.jumpVy ?? 0
      const rising = vy > 0
      const k = Math.min(1, dt * 16)
      const tLegL = rising ? -1.0 : -0.3
      const tLegR = rising ? -0.35 : 0.2
      const tAL = rising ? -2.5 : -0.5
      const tAR = rising ? -2.3 : -0.5
      const tAZ = rising ? 0.18 : 0.75
      const tTilt = rising ? 0.08 : -0.04
      J.w += ((airborne ? 1 : 0) - J.w) * Math.min(1, dt * (airborne ? 20 : 12))
      J.legL += (tLegL - J.legL) * k
      J.legR += (tLegR - J.legR) * k
      J.aL += (tAL - J.aL) * k
      J.aR += (tAR - J.aR) * k
      J.az += (tAZ - J.az) * k
      J.tilt += (tTilt - J.tilt) * k
      if (J.w > 0.01) {
        if (legL.current) legL.current.rotation.x += (J.legL - legL.current.rotation.x) * J.w
        if (legR.current) legR.current.rotation.x += (J.legR - legR.current.rotation.x) * J.w
      }
    }
    // walking motion: bounce on each step, sway side to side, lean into a run
    if (root.current) {
      const sp = a.ride ? 0 : Math.min(1.6, a.speed)
      const step = Math.sin(t * (a.speed > 1.2 ? 13 : 9))
      root.current.position.y = Math.abs(step) * 0.055 * sp
      root.current.rotation.z = step * 0.05 * sp
      const rk = a.rideKind ?? 'bike'
      // standing riders lean into the ride: a little on the scooter, a clear forward crouch + twist on the board
      const goal = a.ride ? (rk === 'board' ? 0.2 + Math.min(0.12, a.speed * 0.1) : rk === 'scooter' ? 0.07 : 0) : (a.speed > 1.2 ? 0.14 : 0) * Math.min(1, a.speed - 1)
      root.current.rotation.x += (goal - root.current.rotation.x) * Math.min(1, dt * 10)
      const twist = a.ride && rk === 'board' ? 0.55 : 0
      root.current.rotation.y += (twist - root.current.rotation.y) * Math.min(1, dt * 10)
    }
    if (soleGlow.current) soleGlow.current.emissiveIntensity = 0.9 + 0.7 * Math.sin(t * 5) * Math.min(1, 0.4 + a.speed)
    // cape and wings move with you
    if (capeRef.current) capeRef.current.rotation.x = 0.12 + Math.min(1.6, a.speed) * 0.35 + Math.sin(t * 6) * 0.04 * Math.min(1, a.speed)
    if (wingL.current && wingR.current) {
      const f = Math.sin(t * (a.speed > 0.2 ? 9 : 2.2)) * (a.speed > 0.2 ? 0.45 : 0.12)
      wingL.current.rotation.z = 0.35 + f
      wingR.current.rotation.z = -0.35 - f
    }
    // idle life: breathing, blinking and looking at things
    if (upper.current) upper.current.scale.y = 1 + Math.sin(phase * 2.1) * 0.012 * (1 - Math.min(1, a.speed))
    if (eyes.current) {
      if (t > blinkAt.current) {
        eyes.current.scale.y = 0.1
        if (t > blinkAt.current + 0.12) {
          blinkAt.current = t + 2 + Math.random() * 4
          eyes.current.scale.y = 1
        }
      }
    }
    if (head.current) {
      if (a.headYaw !== undefined && Math.abs(a.headYaw) > 0.02) head.current.rotation.y = a.headYaw
      else {
        const want = a.look ?? Math.sin(phase * 0.5) * (a.speed < 0.2 ? 0.25 : 0)
        head.current.rotation.y += (want - head.current.rotation.y) * Math.min(1, dt * 6)
      }
    }
    // base pose (walking / carrying / waving / jumping)
    const rideArm = a.rideKind === 'scooter' ? -1.25 : a.rideKind === 'board' ? -0.25 : -0.95
    let aL = a.ride ? rideArm : a.armsUp ? -Math.PI * 0.45 : -swing * 0.8
    let aR = a.ride ? rideArm : a.armsUp ? -Math.PI * 0.45 : a.wave ? -Math.PI * 0.8 + Math.sin(t * 10) * 0.3 : swing * 0.8
    let lean = 0
    let nod = 0
    if (a.talk && !a.act) {
      aR = -0.9 + Math.sin(t * 5.5) * 0.35
      aL = -0.25 + Math.sin(t * 4.1 + 1) * 0.15
      nod = Math.sin(t * 6) * 0.05
      lean = 0.03
    }
    // blend smoothly into / out of a gesture
    const b = blend.current
    const target = a.act ? actPose(a.act.kind, a.act.p, t) : null
    b.w += ((target ? 1 : 0) - b.w) * Math.min(1, dt * 14)
    if (target) {
      b.lean = target.lean
      b.aL = target.aL
      b.aR = target.aR
    }
    aL += (b.aL - aL) * b.w
    aR += (b.aR - aR) * b.w
    aL += (J.aL - aL) * J.w
    aR += (J.aR - aR) * J.w
    lean += J.tilt * J.w
    lean += (b.lean - lean) * b.w
    if (armL.current) {
      armL.current.rotation.x = aL
      armL.current.rotation.z = J.az * J.w + (a.ride && a.rideKind === 'board' ? 0.85 : 0)
    }
    if (armR.current) {
      armR.current.rotation.x = aR
      armR.current.rotation.z = -J.az * J.w - (a.ride && a.rideKind === 'board' ? 0.85 : 0)
    }
    if (upper.current) upper.current.rotation.x = lean + nod
  })

  const fabric = useMemo(() => getTexture('fabric', 2, 2), [])
  const strands = useMemo(() => getTexture('hairstrand', 1, 1), [])
  const skin = useMemo(() => getTexture('skin', 1, 1), [])
  const dark = useMemo(() => shade(shirt, 0.8), [shirt])
  const light = useMemo(() => shade(shirt, 1.15), [shirt])
  const hairDark = useMemo(() => shade(hair, 0.7), [hair])

  const limb = (ref: RefObject<Group | null>, x: number, y: number, children: ReactNode) => (
    <group key={`${x}-${y}`} ref={ref} position={[x, y, 0]}>
      {children}
    </group>
  )

  return (
    <group ref={root}>
      {show && <ShowOff kind={show} />}
      {/* legs: denim trousers with cuffs and sneakers */}
      {[
        [legL, -0.115],
        [legR, 0.115],
      ].map(([ref, x]) =>
        limb(
          ref as RefObject<Group | null>,
          x as number,
          0.44,
          <group>
            {shorts ? (
              <>
                <RoundedBox args={[0.22, 0.2, 0.27]} radius={0.02} smoothness={2} position={[0, -0.1, 0]} castShadow>
                  <ClothMat kind={pantsKind} color={pants} />
                </RoundedBox>
                <mesh position={[0, -0.27, 0]} castShadow>
                  <boxGeometry args={[0.16, 0.14, 0.18]} />
                  <meshStandardMaterial color="#ffd23f" roughness={0.4} />
                </mesh>
                <RoundedBox args={[0.19, 0.12, 0.21]} radius={0.02} smoothness={2} position={[0, -0.36, 0]}>
                  <Plastic color="#f8fafc" map={fabric} roughness={0.9} />
                </RoundedBox>
              </>
            ) : (
              <>
                <RoundedBox args={[0.21, 0.4, 0.26]} radius={0.02} smoothness={2} position={[0, -0.2, 0]} castShadow>
                  <ClothMat kind={pantsKind} color={pants} />
                </RoundedBox>
                <RoundedBox args={[0.22, 0.05, 0.27]} radius={0.015} smoothness={2} position={[0, -0.33, 0]}>
                  <ClothMat kind={pantsKind} color={pants} tone={0.8} />
                </RoundedBox>
                {cargo && (
                  <RoundedBox args={[0.05, 0.13, 0.15]} radius={0.015} smoothness={2} position={[(x as number) < 0 ? -0.125 : 0.125, -0.15, 0.02]}>
                    <ClothMat kind={pantsKind} color={pants} tone={0.88} />
                  </RoundedBox>
                )}
              </>
            )}
            {boots ? (
              <RoundedBox args={[0.23, 0.2, 0.34]} radius={0.04} smoothness={3} position={[0, -0.36, 0.03]} castShadow>
                <Plastic color={shoeColor} roughness={0.35} />
              </RoundedBox>
            ) : (
              <RoundedBox args={[0.22, 0.095, 0.34]} radius={0.035} smoothness={3} position={[0, -0.415, 0.05]} castShadow>
                {shoeKind ? <ClothMat kind={shoeKind} color={shoeColor} /> : <Plastic color={shoeColor} roughness={0.3} />}
              </RoundedBox>
            )}
            <RoundedBox args={[0.226, 0.03, 0.346]} radius={0.012} smoothness={2} position={[0, -0.467, 0.05]}>
              {shoeItem?.style === 'glow' ? <meshStandardMaterial ref={soleGlow} color={shoeColor} emissive={shoeColor} emissiveIntensity={1} /> : <Plastic color="#f8fafc" roughness={0.55} />}
            </RoundedBox>
          </group>,
        ),
      )}
      <group ref={upper} position={[0, 0.5, 0]}>
        <group position={[0, -0.5, 0]}>
          {/* waist and belt */}
          <RoundedBox args={[0.46, 0.1, 0.27]} radius={0.02} smoothness={2} position={[0, 0.49, 0]} castShadow>
            <ClothMat kind={pantsKind} color={pants} />
          </RoundedBox>
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[0.47, 0.03, 0.28]} />
            <Plastic color="#3b2a1a" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.52, 0.142]}>
            <boxGeometry args={[0.06, 0.04, 0.012]} />
            <Plastic color="#e5c76b" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* shirt */}
          <mesh position={[0, 0.77, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.33, 0.46, 4]} />
            <ClothMat kind={shirtKind} color={shirt} color2={shirt2} />
          </mesh>
          <mesh position={[0, 0.555, 0]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.335, 0.34, 0.035, 4]} />
            <Plastic color={dark} map={fabric} roughness={0.8} />
          </mesh>
          {pattern && shirt2 && (
            <>
              {(pattern === 'stripes' ? [0.62, 0.74, 0.86] : pattern === 'band' ? [0.78] : [0.62]).map((y) => {
                const rr = (yy: number) => 0.33 - (yy - 0.54) * (0.09 / 0.46)
                const h = pattern === 'band' ? 0.12 : pattern === 'twotone' ? 0.16 : 0.05
                return (
                  <mesh key={y} position={[0, y, 0]} rotation={[0, Math.PI / 4, 0]}>
                    <cylinderGeometry args={[rr(y + h / 2) + 0.006, rr(y - h / 2) + 0.006, h, 4]} />
                    <Plastic color={shirt2} map={fabric} roughness={0.8} />
                  </mesh>
                )
              })}
            </>
          )}
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.112, 0.125, 0.04, 20]} />
            <Plastic color={light} map={fabric} roughness={0.75} />
          </mesh>
          {[0.9, 0.8, 0.7].map((y) => (
            <mesh key={y} position={[0, y, 0.233 - (y - 0.54) * 0.137 + 0.012]}>
              <sphereGeometry args={[0.015, 10, 8]} />
              <Plastic color="#f8fafc" roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0.1, 0.86, 0.2]} rotation={[-0.14, 0, 0]}>
            <boxGeometry args={[0.07, 0.075, 0.012]} />
            <Plastic color={dark} map={fabric} roughness={0.8} />
          </mesh>
          {/* shirt extras: collar, jacket pockets, zip, hood, ribbed knit trim */}
          {extras.includes('collar') && [-1, 1].map((sd) => (
            <mesh key={`col${sd}`} position={[sd * 0.085, 1.0, 0.118]} rotation={[0.6, 0, sd * 0.75]}>
              <boxGeometry args={[0.15, 0.04, 0.09]} />
              <ClothMat kind={shirtKind} color={shirt} tone={0.78} />
            </mesh>
          ))}
          {extras.includes('pockets') && [-1, 1].map((sd) => (
            <group key={`pk${sd}`} position={[sd * 0.1, 0.8, 0.205]} rotation={[-0.14, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.1, 0.09, 0.016]} />
                <ClothMat kind={shirtKind} color={shirt} tone={0.85} />
              </mesh>
              <mesh position={[0, 0.03, 0.01]}>
                <sphereGeometry args={[0.012, 8, 6]} />
                <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          ))}
          {extras.includes('zip') && (
            <mesh position={[0, 0.78, 0.21]} rotation={[-0.14, 0, 0]}>
              <boxGeometry args={[0.018, 0.44, 0.012]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.25} />
            </mesh>
          )}
          {extras.includes('ribbed') && (
            <mesh position={[0, 0.58, 0]} rotation={[0, Math.PI / 4, 0]}>
              <cylinderGeometry args={[0.345, 0.35, 0.07, 4]} />
              <ClothMat kind="knit" color={shirt} tone={0.88} />
            </mesh>
          )}
          {extras.includes('hood') && (
            <group>
              <mesh position={[0, 1.02, -0.13]} scale={[1.25, 0.95, 0.85]} castShadow>
                <sphereGeometry args={[0.18, 18, 12]} />
                <ClothMat kind={shirtKind} color={shirt} tone={0.92} />
              </mesh>
              {[-0.05, 0.05].map((x) => (
                <mesh key={x} position={[x, 0.93, 0.19]} rotation={[-0.14, 0, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.16, 6]} />
                  <meshStandardMaterial color="#f8fafc" />
                </mesh>
              ))}
              <RoundedBox args={[0.26, 0.11, 0.02]} radius={0.015} smoothness={2} position={[0, 0.66, 0.218]} rotation={[-0.12, 0, 0]}>
                <ClothMat kind={shirtKind} color={shirt} tone={0.85} />
              </RoundedBox>
            </group>
          )}
          {/* arms */}
          {[
            [armL, -0.3],
            [armR, 0.3],
          ].map(([ref, x]) =>
            limb(
              ref as RefObject<Group | null>,
              x as number,
              0.94,
              <group rotation={[0, 0, (x as number) < 0 ? 0.08 : -0.08]}>
                <RoundedBox args={[0.145, 0.32, 0.16]} radius={0.03} smoothness={2} position={[0, -0.16, 0.01]} castShadow>
                  <ClothMat kind={shirtKind} color={shirt} color2={shirt2} />
                </RoundedBox>
                <RoundedBox args={[0.155, 0.045, 0.17]} radius={0.015} smoothness={2} position={[0, -0.325, 0.01]}>
                  <Plastic color={dark} map={fabric} roughness={0.8} />
                </RoundedBox>
                <mesh position={[0, -0.405, 0.03]} scale={[1, 1.1, 0.9]} castShadow>
                  <sphereGeometry args={[0.064, 16, 12]} />
                  <Plastic color={SKIN} map={skin} roughness={0.35} bump={0.2} />
                </mesh>
              </group>,
            ),
          )}
          {backItem?.style === 'pack' && (
            <group position={[0, 0.78, -0.26]}>
              <RoundedBox args={[0.32, 0.42, 0.14]} radius={0.04} smoothness={3} castShadow>
                <Plastic color={backItem.color ?? '#2563eb'} roughness={0.6} />
              </RoundedBox>
              <RoundedBox args={[0.22, 0.14, 0.04]} radius={0.02} smoothness={2} position={[0, -0.08, -0.08]}>
                <Plastic color="#f8fafc" roughness={0.6} />
              </RoundedBox>
              {[-0.1, 0.1].map((x) => (
                <mesh key={x} position={[x, 0.1, 0.1]}>
                  <boxGeometry args={[0.04, 0.34, 0.03]} />
                  <meshStandardMaterial color="#1f2937" />
                </mesh>
              ))}
            </group>
          )}
          {backItem?.style === 'cape' && (
            <group position={[0, 1.0, -0.2]}>
              <group ref={capeRef}>
                <mesh position={[0, -0.38, -0.01]} castShadow>
                  <boxGeometry args={[0.5, 0.78, 0.03]} />
                  <meshStandardMaterial color={backItem.color ?? '#dc2626'} roughness={0.7} side={2} />
                </mesh>
              </group>
            </group>
          )}
          {backItem?.style === 'wings' && (
            <group position={[0, 0.88, -0.2]}>
              <group ref={wingL} position={[-0.08, 0, 0]}>
                <mesh position={[-0.28, 0.1, 0]} rotation={[0, 0, 0.5]} scale={[1, 1.5, 0.2]}>
                  <sphereGeometry args={[0.2, 12, 8]} />
                  <meshStandardMaterial color="#ffffff" emissive="#fef3c7" emissiveIntensity={0.25} />
                </mesh>
              </group>
              <group ref={wingR} position={[0.08, 0, 0]}>
                <mesh position={[0.28, 0.1, 0]} rotation={[0, 0, -0.5]} scale={[1, 1.5, 0.2]}>
                  <sphereGeometry args={[0.2, 12, 8]} />
                  <meshStandardMaterial color="#ffffff" emissive="#fef3c7" emissiveIntensity={0.25} />
                </mesh>
              </group>
            </group>
          )}
          {/* neck and head (turns to look at things) */}
          <group ref={head} position={[0, 1.05, 0]}>
            <group position={[0, -1.05, 0]}>
              <mesh position={[0, 1.035, 0]}>
                <cylinderGeometry args={[0.075, 0.08, 0.06, 14]} />
                <Plastic color="#f2b92a" map={skin} roughness={0.4} bump={0.2} />
              </mesh>
              {/* a smooth rounded head */}
              <mesh geometry={HEAD_GEO} position={[0, 1.04, 0]} castShadow>
                <Plastic color={SKIN} map={skin} roughness={0.32} bump={0.2} />
              </mesh>
              {/* eyes: white, dark pupil and a sparkle; the group blinks */}
              <group ref={eyes} position={[0, 1.215, 0]}>
                {[-0.074, 0.074].map((x) => (
                  <group key={x} position={[x, 0, 0.17]}>
                    <mesh scale={[1, 1.1, 0.55]}>
                      <sphereGeometry args={[0.05, 16, 12]} />
                      <meshBasicMaterial color="#ffffff" />
                    </mesh>
                    <mesh position={[0, -0.003, 0.02]} scale={[1, 1, 0.6]}>
                      <sphereGeometry args={[0.032, 14, 10]} />
                      <meshBasicMaterial color="#1b1f2a" />
                    </mesh>
                    <mesh position={[0.01, 0.012, 0.034]}>
                      <sphereGeometry args={[0.009, 8, 6]} />
                      <meshBasicMaterial color="#ffffff" />
                    </mesh>
                  </group>
                ))}
              </group>
              {[-0.074, 0.074].map((x) => (
                <mesh key={`b${x}`} position={[x, 1.285, 0.19]} rotation={[0, 0, x * -1.2]}>
                  <boxGeometry args={[0.07, 0.014, 0.014]} />
                  <meshBasicMaterial color={hairDark} />
                </mesh>
              ))}
              <mesh position={[0, 1.15, 0.196]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.07, 0.0125, 8, 20, Math.PI]} />
                <meshBasicMaterial color="#7a2e2e" />
              </mesh>
              {[-0.125, 0.125].map((x) => (
                <mesh key={`c${x}`} position={[x, 1.165, 0.17]} rotation={[0, x * 4.2, 0]}>
                  <circleGeometry args={[0.032, 16]} />
                  <meshBasicMaterial color="#f98f8f" transparent opacity={0.5} />
                </mesh>
              ))}
              {/* hair: a textured dome over the top and back of the head */}
              <mesh position={[0, 1.31, -0.005]} scale={[1, 0.82, 1.02]} castShadow>
                <sphereGeometry args={[0.218, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Plastic color={hair} map={strands} roughness={0.4} bump={0.8} />
              </mesh>
              <mesh position={[0, 1.31, -0.005]} scale={[1, 1, 1.02]}>
                <cylinderGeometry args={[0.218, 0.218, 0.012, 32, 1, true]} />
                <Plastic color={hair} map={strands} roughness={0.4} />
              </mesh>
              {glassItem && <GlassesMesh style={glassItem.style!} color={glassItem.color!} />}
              {hatItem && <HatMesh style={hatItem.style!} color={hatItem.color!} />}
              {bandana && (
                <group position={[0, 1.25, 0]}>
                  {/* Forehead Bandana Wrap */}
                  <mesh position={[0, 0, 0.02]}>
                    <boxGeometry args={[0.43, 0.08, 0.43]} />
                    <meshStandardMaterial color={bandana === 'red' ? '#ef4444' : '#3b82f6'} roughness={0.6} />
                  </mesh>
                  {/* Bandana Knot / Ribbon on Back */}
                  <mesh position={[0, -0.02, -0.22]} rotation={[0.2, 0, 0]}>
                    <boxGeometry args={[0.08, 0.12, 0.04]} />
                    <meshStandardMaterial color={bandana === 'red' ? '#dc2626' : '#2563eb'} roughness={0.6} />
                  </mesh>
                </group>
              )}
              {/* sideburns */}
              {[-1, 1].map((sd) => (
                <RoundedBox key={`s${sd}`} args={[0.04, longHair ? 0.4 : 0.11, 0.2]} radius={0.015} smoothness={2} position={[sd * 0.205, longHair ? 1.14 : 1.25, -0.02]}>
                  <Plastic color={hair} map={strands} roughness={0.4} bump={0.8} />
                </RoundedBox>
              ))}
              {longHair ? (
                <RoundedBox args={[0.43, 0.5, 0.1]} radius={0.03} smoothness={3} position={[0, 1.1, -0.185]}>
                  <Plastic color={hair} map={strands} roughness={0.4} bump={0.8} />
                </RoundedBox>
              ) : (
                <RoundedBox args={[0.4, 0.14, 0.07]} radius={0.025} smoothness={2} position={[0, 1.24, -0.19]}>
                  <Plastic color={hair} map={strands} roughness={0.4} bump={0.8} />
                </RoundedBox>
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/** Hats sit on top of the head (coordinates match the head group in Minifig) */
function HatMesh({ style, color }: { style: string; color: string }) {
  const m = (c = color, r = 0.5) => <meshStandardMaterial color={c} roughness={r} />
  switch (style) {
    case 'cap':
      return (
        <group position={[0, 1.36, 0]}>
          <mesh scale={[1, 0.62, 1.04]} castShadow>
            <sphereGeometry args={[0.235, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {m()}
          </mesh>
          <mesh position={[0, -0.01, 0.2]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[0.3, 0.025, 0.2]} />
            {m()}
          </mesh>
        </group>
      )
    case 'beanie':
      return (
        <group position={[0, 1.33, 0]}>
          <mesh scale={[1, 0.95, 1]} castShadow>
            <sphereGeometry args={[0.235, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {m()}
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.07, 24]} />
            {m('#f8fafc', 0.8)}
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            {m('#f8fafc', 0.9)}
          </mesh>
        </group>
      )
    case 'party':
      return (
        <group position={[0, 1.42, 0]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <coneGeometry args={[0.17, 0.42, 16]} />
            {m()}
          </mesh>
          {[0.08, 0.2, 0.3].map((y, i) => (
            <mesh key={y} position={[0, y, 0]}>
              <torusGeometry args={[0.15 - i * 0.045, 0.012, 6, 16]} />
              {m('#fde047', 0.4)}
            </mesh>
          ))}
          <mesh position={[0, 0.43, 0]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            {m('#fde047', 0.4)}
          </mesh>
        </group>
      )
    case 'straw':
      return (
        <group position={[0, 1.4, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.02, 28]} />
            {m(color, 0.9)}
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.22, 0.24, 0.14, 24]} />
            {m(color, 0.9)}
          </mesh>
          <mesh position={[0, 0.035, 0]}>
            <cylinderGeometry args={[0.245, 0.245, 0.04, 24]} />
            {m('#dc2626', 0.6)}
          </mesh>
        </group>
      )
    case 'helmet':
      return (
        <group position={[0, 1.34, 0]}>
          <mesh scale={[1, 0.85, 1.06]} castShadow>
            <sphereGeometry args={[0.245, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {m(color, 0.25)}
          </mesh>
          <mesh position={[0, 0.17, 0]} scale={[0.35, 0.3, 1.1]}>
            <sphereGeometry args={[0.22, 12, 8]} />
            {m('#f8fafc', 0.3)}
          </mesh>
        </group>
      )
    case 'phones':
      return (
        <group position={[0, 1.2, 0]}>
          <mesh position={[0, 0.17, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.235, 0.022, 8, 24, Math.PI]} />
            {m(color, 0.4)}
          </mesh>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.225, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.07, 16]} />
              {m('#ef4444', 0.35)}
            </mesh>
          ))}
        </group>
      )
    case 'top':
      return (
        <group position={[0, 1.38, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.025, 28]} />
            {m(color, 0.3)}
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.19, 0.2, 0.3, 24]} />
            {m(color, 0.3)}
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.205, 0.205, 0.06, 24]} />
            {m('#dc2626', 0.5)}
          </mesh>
        </group>
      )
    case 'crown':
      return (
        <group position={[0, 1.44, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.19, 0.12, 20]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.25} emissive="#a16207" emissiveIntensity={0.25} />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 0.17, 0.12, Math.sin(a) * 0.17]} castShadow>
                <coneGeometry args={[0.045, 0.14, 6]} />
                <meshStandardMaterial color={color} metalness={0.8} roughness={0.25} emissive="#a16207" emissiveIntensity={0.25} />
              </mesh>
            )
          })}
          <mesh position={[0, 0.02, 0.2]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
          </mesh>
        </group>
      )
    default:
      return null
  }
}

/** Glasses sit across the eyes */
function GlassesMesh({ style, color }: { style: string; color: string }) {
  return (
    <group position={[0, 1.215, 0.205]}>
      {[-0.074, 0.074].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {style === 'sun' ? (
            <mesh scale={[1, 0.85, 0.3]}>
              <sphereGeometry args={[0.06, 14, 10]} />
              <meshStandardMaterial color={color} roughness={0.15} />
            </mesh>
          ) : style === 'heart' ? (
            <>
              <mesh position={[-0.017, 0.012, 0]} scale={[1, 1, 0.4]}>
                <sphereGeometry args={[0.032, 10, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0.017, 0.012, 0]} scale={[1, 1, 0.4]}>
                <sphereGeometry args={[0.032, 10, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0, -0.022, 0]} rotation={[Math.PI, 0, 0]} scale={[1, 1, 0.4]}>
                <coneGeometry args={[0.04, 0.05, 4]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
              </mesh>
            </>
          ) : style === 'star' ? (
            <mesh scale={[1, 1, 0.4]}>
              <octahedronGeometry args={[0.055, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
            </mesh>
          ) : (
            <mesh>
              <torusGeometry args={[0.055, 0.009, 8, 20]} />
              <meshStandardMaterial color={color} roughness={0.4} />
            </mesh>
          )}
        </group>
      ))}
      <mesh>
        <boxGeometry args={[0.05, 0.01, 0.01]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.135, 0, -0.1]}>
          <boxGeometry args={[0.01, 0.01, 0.2]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
    </group>
  )
}

/** Speech bubble that shows whatever this speaker last said (from the store) */
export function SpeechBubble({ id, y = 2 }: { id: string; y?: number }) {
  const bubble = useGame((s) => s.bubbles[id])
  return (
    <Label position={[0, y, 0]}>
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble.n}
            initial={{ scale: 0.4, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="relative mb-2 w-max max-w-[220px] rounded-2xl bg-white px-3 py-1.5 text-center text-[13px] leading-snug font-semibold text-slate-800 shadow-lg ring-2 ring-slate-200"
          >
            {bubble.text}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </Label>
  )
}

/* ------------------------------------------------------------------ */
/* Path-following movement for villagers                                 */
/* ------------------------------------------------------------------ */

function useNavigator(startNode: number) {
  return useRef({
    x: NAV_NODES[startNode][0],
    z: NAV_NODES[startNode][1],
    from: startNode,
    to: startNode,
    tx: NAV_NODES[startNode][0],
    tz: NAV_NODES[startNode][1],
    wait: Math.random() * 2,
  })
}

type Nav = ReturnType<typeof useNavigator>['current']

function nextNode(n: Nav) {
  const options = NAV_NEIGHBOURS[n.to].filter((k) => k !== n.from)
  const next = options.length ? options[Math.floor(Math.random() * options.length)] : n.from
  n.from = n.to
  n.to = next
  // the footpath beside the road is narrow, so stay tidy there
  const j = NAV_NODES[next][0] < -25 ? 0.25 : 1.4
  n.tx = NAV_NODES[next][0] + (Math.random() - 0.5) * j
  n.tz = NAV_NODES[next][1] + (Math.random() - 0.5) * 1.4
}

/** Move toward (tx,tz); returns true while moving */
function stepToward(n: { x: number; z: number }, tx: number, tz: number, speed: number, dt: number, g: Group) {
  const dx = tx - n.x
  const dz = tz - n.z
  const d = Math.hypot(dx, dz)
  if (d < 0.08) return false
  const step = Math.min(d, speed * dt)
  n.x += (dx / d) * step
  n.z += (dz / d) * step
  turnToward(g, Math.atan2(dx, dz), dt)
  return true
}

/** True when you and this figure are close and looking toward each other */
function faceToFace(g: Group, x: number, z: number) {
  const dx = player.x - x
  const dz = player.z - z
  const d = Math.hypot(dx, dz)
  if (d > 4 || d < 0.3) return false
  const towardMe = Math.atan2(dx, dz)
  const npcDiff = Math.abs(Math.atan2(Math.sin(towardMe - g.rotation.y), Math.cos(towardMe - g.rotation.y)))
  const towardNpc = Math.atan2(-dx, -dz)
  const meDiff = Math.abs(Math.atan2(Math.sin(towardNpc - player.heading), Math.cos(towardNpc - player.heading)))
  return npcDiff < 0.9 && meDiff < 1.0
}

/** How far a figure should turn its head to look at a point (0 when it is far away or behind) */
function lookAt(g: Group, x: number, z: number, range = 6) {
  const dx = x - g.position.x
  const dz = z - g.position.z
  if (Math.hypot(dx, dz) > range) return 0
  const d = Math.atan2(Math.sin(Math.atan2(dx, dz) - g.rotation.y), Math.cos(Math.atan2(dx, dz) - g.rotation.y))
  return Math.abs(d) < 2 ? Math.max(-0.8, Math.min(0.8, d)) : 0
}

function turnToward(g: Group, heading: number, dt: number) {
  let diff = heading - g.rotation.y
  diff = Math.atan2(Math.sin(diff), Math.cos(diff))
  g.rotation.y += diff * Math.min(1, dt * 8)
}

/* ------------------------------------------------------------------ */
/* Villagers                                                            */
/* ------------------------------------------------------------------ */

const HAPPY = ['😊', '😄', '💡', '🌻', '♻️', '💚']
const OKAY = ['🙂', '🤔', '💭', '🌤️']
const SAD = ['😟', '😞', '🗑️', '😷']

interface VillagerProps {
  id: string
  name: string
  shirt: string
  pants: string
  hair: string
  node: number
  longHair?: boolean
}

function Villager({ id, name, shirt, pants, hair, node, longHair }: VillagerProps) {
  const group = useRef<Group>(null)
  const anim = useRef<MinifigAnim>({ speed: 0 })
  const nav = useNavigator(node)
  const greet = useRef({ t: 0, cool: 2 })
  const [thought, setThought] = useState<string | null>(null)

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const s = useGame.getState()
    const n = nav.current
    const talking = !!s.bubbles[id] || (act.kind === 'talk' && Math.hypot(act.tx - n.x, act.tz - n.z) < 2.5)
    let moving = false
    // say hello when the player walks up
    const gr = greet.current
    gr.cool -= dt
    gr.t = Math.max(0, gr.t - dt)
    if (gr.t <= 0 && gr.cool <= 0 && faceToFace(g, n.x, n.z)) {
      gr.t = 2.2
      gr.cool = 10 + Math.random() * 6
    }
    // Bicycle bell ring: nearby NPCs cheerfully wave and look
    if (Date.now() - lastBellRing.time < 1200 && Math.hypot(n.x - lastBellRing.x, n.z - lastBellRing.z) < 8.5) {
      gr.t = 2.4
    }
    const hp = bridge.isHost ? undefined : hostNpcs.get(id)
    if (hp) {
      // another tab is the host: follow its NPC positions
      const dx = hp.x - n.x
      const dz = hp.z - n.z
      const k = 1 - Math.exp(-dt * 8)
      n.x += dx * k
      n.z += dz * k
      moving = Math.hypot(dx, dz) > 0.04
      if (moving) turnToward(g, Math.atan2(dx, dz), dt)
    } else if (s.paused || s.screen !== 'playing') {
      // frozen
    } else if (talking) {
      turnToward(g, Math.atan2(player.x - n.x, player.z - n.z), dt)
    } else if (n.wait > 0) n.wait -= dt
    else {
      moving = stepToward(n, n.tx, n.tz, 1.3, Math.min(dt, 0.05), g)
      if (!moving) {
        if (Math.random() < 0.3) n.wait = 1 + Math.random() * 3
        nextNode(n)
      }
    }
    anim.current.speed += ((moving ? 1 : 0) - anim.current.speed) * Math.min(1, dt * 8)
    anim.current.talk = talking
    anim.current.wave = gr.t > 0 && !talking
    anim.current.look = talking || gr.t > 0 ? lookAt(g, player.x, player.z) : 0
    g.position.set(n.x, 0.06 + groundY(n.x, n.z), n.z)
    npcPositions.set(id, { x: n.x, z: n.z, color: shirt, name, kind: 'villager' })
  })

  useEffect(() => {
    let alive = true
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      if (!alive) return
      const h = useGame.getState().happiness
      const pool = h > 62 ? HAPPY : h > 35 ? OKAY : SAD
      if (Math.random() < 0.4) {
        setThought(pool[Math.floor(Math.random() * pool.length)])
        setTimeout(() => alive && setThought(null), 2500)
      }
      t = setTimeout(loop, 4500 + Math.random() * 5000)
    }
    t = setTimeout(loop, Math.random() * 4000)
    return () => {
      alive = false
      clearTimeout(t)
      npcPositions.delete(id)
    }
  }, [id])

  const getPos = () => [nav.current.x, nav.current.z] as [number, number]

  return (
    <group ref={group}>
      <Minifig shirt={shirt} pants={pants} hair={hair} anim={anim} longHair={longHair} />
      <Near getPos={getPos} r={16}>
        <SpeechBubble id={id} y={2.1} />
        {thought && (
          <Label position={[0, 1.85, 0]}>
            <div className="rounded-full bg-white px-1.5 py-0.5 text-lg shadow-md">{thought}</div>
          </Label>
        )}
      </Near>
    </group>
  )
}

const VILLAGERS: VillagerProps[] = [
  { id: 'v-kumar', name: 'Mr. Kumar', shirt: '#ef4444', pants: '#1d4ed8', hair: '#111827', node: 0 },
  { id: 'v-nina', name: 'Nina', shirt: '#f5f5f4', pants: '#78350f', hair: '#b45309', node: 2, longHair: true },
  { id: 'v-omar', name: 'Omar', shirt: '#facc15', pants: '#475569', hair: '#292524', node: 10 },
  { id: 'v-joe', name: 'Grandpa Joe', shirt: '#0ea5e9', pants: '#1e3a8a', hair: '#e5e7eb', node: 5 },
  { id: 'v-priya', name: 'Priya', shirt: '#f97316', pants: '#7c2d12', hair: '#1c1917', node: 16, longHair: true },
  { id: 'v-mei', name: 'Mei', shirt: '#a855f7', pants: '#334155', hair: '#111827', node: 13, longHair: true },
  { id: 'v-sam', name: 'Sam', shirt: '#14b8a6', pants: '#1e293b', hair: '#7c2d12', node: 20 },
  { id: 'v-lily', name: 'Lily', shirt: '#fb7185', pants: '#475569', hair: '#fde68a', node: 7, longHair: true },
]

/* ------------------------------------------------------------------ */
/* Static helpers (quest givers & guides)                               */
/* ------------------------------------------------------------------ */

function StaticNpc({ npc }: { npc: (typeof STATIC_NPCS)[number] }) {
  const anim = useRef<MinifigAnim>({ speed: 0 })
  const group = useRef<Group>(null)

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const talking = !!useGame.getState().bubbles[npc.id]
    // story characters keep doing their thing; they only turn to you while you are talking to them
    turnToward(g, talking ? Math.atan2(player.x - npc.x, player.z - npc.z) : npc.rot, dt * 1.5)
    anim.current.talk = talking
    anim.current.look = talking ? lookAt(g, player.x, player.z, 7) : 0
  })

  useEffect(() => {
    npcPositions.set(npc.id, { x: npc.x, z: npc.z, color: npc.shirt, name: npc.name, kind: 'static' })
    return () => void npcPositions.delete(npc.id)
  }, [npc])

  return (
    <group ref={group} position={[npc.x, 0.06, npc.z]} rotation={[0, npc.rot, 0]}>
      <Minifig shirt={npc.shirt} pants={npc.pants} hair={npc.hair} anim={anim} longHair={npc.longHair} />
      <Near x={npc.x} z={npc.z} r={18}>
        <SpeechBubble id={npc.id} y={2.5} />
        <Label position={[0, 1.85, 0]}>
          <div className="flex flex-col items-center">
            <div className="whitespace-nowrap rounded-full bg-amber-100 px-2 text-[11px] font-bold text-amber-900 shadow ring-2 ring-white">{npc.name}</div>
          </div>
        </Label>
      </Near>
    </group>
  )
}

export function NPCs() {
  return (
    <group>
      {VILLAGERS.map((v) => (
        <Villager key={v.id} {...v} />
      ))}
      {STATIC_NPCS.map((n) => (
        <StaticNpc key={n.id} npc={n} />
      ))}
    </group>
  )
}
