import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, Mesh } from 'three'
import { useGame } from '../../state/gameStore'
import { binLift, bodies, depot, emitBurst, player } from '../../state/sceneRegistry'
import { BIN_SLOTS, LOAD_TIME, TRUCK_HOME, TRUCK_INFO, TRUCK_NODES, TRUCK_PARK, TRUCK_SPEED, UNLOAD_TIME, findTruckPark, jobTimes, type XZ } from '../../state/world'
import { BIN_DEFS } from '../../state/gameData'
import { Block, sharedMaterials } from './primitives'
import { Wheel } from './Vehicles'

type Kind = 'recycle' | 'compost' | 'trash'
const S = 0.85 // the whole truck is drawn at this scale
// the heading each truck has when it arrives home (the reverse of its first road segment), so it never snaps when a job ends
const IDLE_HEADING: Record<Kind, number> = { recycle: Math.PI, compost: Math.PI, trash: Math.PI }
const PIVOT = new THREE.Vector3(0.95, 1.3, -0.4) // crane base on the truck's right-hand side (truck units)
const BOOM_Y = 3.0
const ease = (t: number) => {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

interface Pose {
  x: number
  z: number
  heading: number
  phase: 'idle' | 'out' | 'load' | 'in' | 'unload'
  /** seconds into the load / unload phase */
  ts: number
}

/** where the truck is, a given number of seconds into its run (driving phases only; parking is added by the truck) */
function poseAt(route: XZ[], t: number, kind: Kind): Pose {
  const segs: { a: XZ; b: XZ; len: number }[] = []
  for (let i = 1; i < route.length; i++) segs.push({ a: route[i - 1], b: route[i], len: Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]) })
  const L = segs.reduce((a, s) => a + s.len, 0)
  const out = L / TRUCK_SPEED
  const along = (d: number, reverse: boolean) => {
    let dist = Math.max(0, Math.min(L, d))
    const list = reverse ? [...segs].reverse().map((s) => ({ a: s.b, b: s.a, len: s.len })) : segs
    for (const s of list) {
      if (dist <= s.len || s === list[list.length - 1]) {
        const k = s.len ? Math.min(1, dist / s.len) : 0
        return { x: s.a[0] + (s.b[0] - s.a[0]) * k, z: s.a[1] + (s.b[1] - s.a[1]) * k, heading: Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]) }
      }
      dist -= s.len
    }
    return { x: route[0][0], z: route[0][1], heading: IDLE_HEADING[kind] }
  }
  if (t < out) return { ...along(t * TRUCK_SPEED, false), phase: 'out', ts: 0 }
  if (t < out + LOAD_TIME) return { ...along(L, false), phase: 'load', ts: t - out }
  if (t < out + LOAD_TIME + out) return { ...along((t - out - LOAD_TIME) * TRUCK_SPEED, true), phase: 'in', ts: 0 }
  return { ...along(L, true), phase: 'unload', ts: t - out - LOAD_TIME - out }
}


/** Crane keyframes for one bin: [time, hook position (truck units), bin tilt] over the 13-second loading sequence */
const REST = new THREE.Vector3(0.95, 2.9, -1.0)
const OVER_BED = new THREE.Vector3(0, 3.0, -0.75)
function keysFor(lx: number, lz: number): [number, THREE.Vector3, number][] {
  const above = new THREE.Vector3(lx, 2.7, lz)
  const at = new THREE.Vector3(lx, 1.3, lz)
  return [
    [2.0, REST, 0],
    [2.9, above, 0],
    [3.5, at, 0],
    [3.9, at, 0],
    [5.0, above, 0],
    [6.3, OVER_BED, 0],
    [7.1, OVER_BED, 2.3],
    [8.0, OVER_BED, 2.3],
    [8.7, OVER_BED, 0],
    [9.9, above, 0],
    [10.9, at, 0],
    [11.3, above, 0],
    [12.3, REST, 0],
  ]
}
const tmp = new THREE.Vector3()
function craneAt(keys: [number, THREE.Vector3, number][], ts: number) {
  if (ts <= keys[0][0]) return { hook: REST, tilt: 0 }
  for (let i = 1; i < keys.length; i++) {
    if (ts <= keys[i][0]) {
      const [t0, h0, a0] = keys[i - 1]
      const [t1, h1, a1] = keys[i]
      const k = ease((ts - t0) / (t1 - t0))
      return { hook: tmp.copy(h0).lerp(h1, k), tilt: lerp(a0, a1, k) }
    }
  }
  return { hook: REST, tilt: 0 }
}

/** world position of a point given in truck units */
function toWorld(x: number, z: number, heading: number, lx: number, lz: number) {
  const c = Math.cos(heading)
  const s = Math.sin(heading)
  return { x: x + (lx * c + lz * s) * S, z: z + (-lx * s + lz * c) * S }
}

function Truck({ kind }: { kind: Kind }) {
  const info = TRUCK_INFO[kind]
  const root = useRef<Group>(null)
  const bed = useRef<Group>(null)
  const cargoG = useRef<Group>(null)
  const yaw = useRef<Group>(null)
  const boom = useRef<Mesh>(null)
  const hookG = useRef<Group>(null)
  const cable = useRef<Mesh>(null)
  const binG = useRef<Group>(null)
  const tiltG = useRef<Group>(null)
  const lidRef = useRef<Mesh>(null)
  const beacon = useRef<Mesh>(null)
  const wheels = useRef<Group[]>([])
  const frontSteer = useRef<Group[]>([])
  const home = TRUCK_NODES[TRUCK_HOME[kind]]
  const run = useRef<{
    id: string
    t: number
    odo: number
    heading: number
    x: number
    z: number
    cargo: number
    nextPour: number
    lastSlot: string
    parkKey: string
    park: { x: number; z: number; heading: number; lx: number; lz: number; score: number } | null
    keys: [number, THREE.Vector3, number][] | null
    blockedTimer: number
    steer: number
    bounce: number
    px?: number
    pz?: number
    puffAt?: number
  }>({
    id: '',
    t: 0,
    odo: 0,
    heading: IDLE_HEADING[kind],
    x: home[0],
    z: home[1],
    cargo: 0,
    nextPour: 0,
    lastSlot: '',
    parkKey: '',
    park: null,
    keys: null,
    blockedTimer: 0,
    steer: 0,
    bounce: 0,
  })
  const routes = useRef(new Map<string, ReturnType<typeof jobTimes>>())

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.5)
    const r = run.current
    const st = useGame.getState()
    const job = st.jobs.find((j) => j.kind === kind && j.startedAt !== null)
    let phase: Pose['phase'] = 'idle'
    let tx = home[0]
    let tz = home[1]
    let th = IDLE_HEADING[kind]
    let hook = REST
    let tilt = 0
    let carrying = false
    let bed_up = 0
    if (job && job.startedAt !== null) {
      if (r.id !== job.id) {
        r.id = job.id
        r.t = Math.max(0, st.elapsed - job.startedAt)
        r.cargo = 0
      }
      let jt = routes.current.get(job.station)
      if (!jt) {
        jt = jobTimes(kind, job.station)
        routes.current.set(job.station, jt)
      }
      // wait for people standing in the way while driving, but NEVER get stuck on NPCs
      const cur = poseAt(jt.route, r.t, kind)
      let blocked = false
      let creep = false
      if (cur.phase === 'out' || cur.phase === 'in') {
        const fx = Math.sin(cur.heading)
        const fz = Math.cos(cur.heading)
        const dx = player.x - cur.x
        const dz = player.z - cur.z
        const along = dx * fx + dz * fz
        // Only react to the player if directly in front of the truck on the road
        if (along > 0 && along < 3.2 && Math.abs(dx * fz - dz * fx) < 1.3) {
          r.blockedTimer += dt
          if (r.blockedTimer > 1.6) creep = true
          else blocked = true
        } else {
          r.blockedTimer = 0
        }
      }
      if (!blocked) r.t += creep ? dt * 0.45 : dt
      const pose = poseAt(jt.route, r.t, kind)
      phase = pose.phase
      tx = pose.x
      tz = pose.z
      th = pose.heading
      const slot = BIN_SLOTS.find((b) => b.id === job.slotId)
      if (phase === 'load' && slot) {
        // park fully on the paving next to the bin, lift it, then turn round to drive home
        const cacheKey = `${job.id}:${slot.id}`
        if (r.parkKey !== cacheKey) {
          r.parkKey = cacheKey
          const found = findTruckPark(slot, { x: pose.x, z: pose.z }, pose.heading) ?? findTruckPark(slot, { x: pose.x, z: pose.z })
          if (found) r.park = found
          else {
            // no tidy spot: stay exactly where the route ended, the crane reaches out to the bin
            const c0 = Math.cos(pose.heading)
            const s0 = Math.sin(pose.heading)
            const ox = slot.x - pose.x
            const oz = slot.z - pose.z
            r.park = { x: pose.x, z: pose.z, heading: pose.heading, lx: Math.max(-4.4, Math.min(4.4, (ox * c0 - oz * s0) / 0.85)), lz: Math.max(-1.7, Math.min(1.2, (ox * s0 + oz * c0) / 0.85)), score: 0 }
          }
          r.keys = keysFor(r.park.lx, r.park.lz)
        }
        const park = r.park!
        const back = pose.heading + Math.PI // the way home is the way we came
        // drive on to the lifting spot, lift, spin round on the spot, then drive straight home
        const inK = ease(pose.ts / 2)
        const spin = ease((pose.ts - 10.9) / 1.1)
        const outK = ease((pose.ts - 12) / 1)
        tx = lerp(pose.x, park.x, inK)
        tz = lerp(pose.z, park.z, inK)
        if (outK > 0) {
          tx = lerp(park.x, pose.x, outK)
          tz = lerp(park.z, pose.z, outK)
        }
        th = pose.ts < 10.9 ? lerp(pose.heading, park.heading, inK) : park.heading + angleDiff(park.heading, back) * spin
        const c = craneAt(r.keys!, pose.ts)
        hook = c.hook
        tilt = c.tilt
        carrying = pose.ts >= 3.9 && pose.ts <= 10.9
        binLift[slot.id] = carrying
        // waste tumbles into the bed while the bin is tipped with multi-colored cascade and bounce
        if (pose.ts > 6.8 && pose.ts < 8.3 && r.t > r.nextPour) {
          r.nextPour = r.t + 0.08
          const w = toWorld(tx, tz, th, hook.x, hook.z)
          const debrisColors = [BIN_DEFS[kind].color, '#f59e0b', '#38bdf8', '#e2e8f0', '#15803d', '#94a3b8']
          const col = debrisColors[Math.floor(Math.random() * debrisColors.length)]
          emitBurst({ x: w.x, z: w.z, y: 0.15 + S * (hook.y - 0.35), color: col, n: 6, spread: 0.65, size: 0.08 })
          r.cargo = Math.min(1, r.cargo + 0.04)
          r.bounce = 0.035
        }
        r.lastSlot = slot.id
      } else {
        if (r.lastSlot) binLift[r.lastSlot] = false
        if (phase === 'unload') {
          // short three-point turn at the yard: forward and round, reverse in, tip, then out again
          const pk = TRUCK_PARK[kind]
          const h0 = pose.heading
          const mx = pose.x + Math.sin(h0) * 1.8
          const mz = pose.z + Math.cos(h0) * 1.8
          const hm = h0 + angleDiff(h0, pk.heading) / 2
          const ts = pose.ts
          if (ts < 1.7) {
            const k = ease(ts / 1.7)
            tx = lerp(pose.x, mx, k)
            tz = lerp(pose.z, mz, k)
            th = h0 + angleDiff(h0, hm) * k
          } else if (ts < 3.4) {
            const k = ease((ts - 1.7) / 1.7)
            tx = lerp(mx, pk.x, k)
            tz = lerp(mz, pk.z, k)
            th = hm + angleDiff(hm, pk.heading) * k
          } else if (ts < 6.3) {
            tx = pk.x
            tz = pk.z
            th = pk.heading
          } else if (ts < 7.3) {
            const k = ease(ts - 6.3)
            tx = lerp(pk.x, mx, k)
            tz = lerp(pk.z, mz, k)
            th = pk.heading + angleDiff(pk.heading, hm) * k
          } else {
            const k = ease((ts - 7.3) / 1.2)
            tx = lerp(mx, pose.x, k)
            tz = lerp(mz, pose.z, k)
            th = hm + angleDiff(hm, h0) * k
          }
          if (ts > 5.4) r.cargo = 0
          bed_up = ease((ts - 3.4) / 1.2) * (1 - ease((ts - 5.4) / 0.9))
          const bedShake = ts > 4.2 && ts < 5.2 ? Math.sin(ts * 30) * 0.025 : 0
          bed_up += bedShake
          if (ts > 4.0 && ts < 5.4 && r.t > r.nextPour) {
            r.nextPour = r.t + 0.08
            const w = toWorld(tx, tz, th, 0, -2.6)
            const debrisColors = [BIN_DEFS[kind].color, '#d97706', '#64748b', '#22c55e', '#f8fafc', '#b45309']
            const col = debrisColors[Math.floor(Math.random() * debrisColors.length)]
            emitBurst({ x: w.x, z: w.z, y: 0.85, color: col, n: 7, spread: 1.1, size: 0.09 })
            r.cargo = Math.max(0, r.cargo - 0.08)
            r.bounce = 0.04
          }
        }
      }
    }
    depot[kind] = phase === 'unload' && tx !== home[0] && bed_up > 0.2
    // Smooth the heading with realistic vehicular cornering inertia
    let dh = th - r.heading
    dh = Math.atan2(Math.sin(dh), Math.cos(dh))
    const steerRate = phase === 'load' || phase === 'unload' ? 12 : 7
    r.heading += dh * Math.min(1, dt * steerRate)
    r.steer = Math.max(-0.45, Math.min(0.45, dh * 1.6))
    if (r.bounce > 0) r.bounce = Math.max(0, r.bounce - dt * 0.35)
    r.odo += Math.hypot(tx - r.x, tz - r.z)
    r.x = tx
    r.z = tz
    const g = root.current
    if (g) {
      const chassisPitch = phase === 'idle' ? 0 : Math.sin(r.odo * 3) * 0.007
      const chassisRoll = -r.steer * 0.035
      g.position.set(r.x, 0.12 + r.bounce, r.z)
      g.rotation.set(chassisPitch, r.heading, chassisRoll)
    }
    for (const w of wheels.current) if (w) w.rotation.x = r.odo / 0.35
    // diesel-ish puff from the exhaust stack while moving
    if (phase !== 'idle' && Math.hypot(tx - (r.px ?? tx), tz - (r.pz ?? tz)) > 0.01 && performance.now() - (r.puffAt ?? 0) > 260) {
      r.puffAt = performance.now()
      const w = toWorld(r.x, r.z, r.heading, -0.78, 0.95)
      emitBurst({ x: w.x, z: w.z, y: 1.7, color: '#cbd5e1', n: 1, spread: 0.15, size: 0.07 })
    }
    r.px = tx
    r.pz = tz
    frontSteer.current.forEach((fg) => {
      if (fg) fg.rotation.y = r.steer
    })
    if (bed.current) bed.current.rotation.x = -0.85 * bed_up
    if (cargoG.current) {
      cargoG.current.visible = r.cargo > 0.03
      cargoG.current.scale.setScalar(Math.max(0.2, 0.35 + r.cargo * 0.65))
      cargoG.current.position.y = -0.15 + r.cargo * 0.15
    }
    // crane: yaw + boom length + cable put the hook where the keyframe says
    const dx = hook.x - PIVOT.x
    const dz = hook.z - PIVOT.z
    const len = Math.max(0.3, Math.hypot(dx, dz))
    if (yaw.current) yaw.current.rotation.y = Math.atan2(-dz, dx)
    if (boom.current) {
      boom.current.scale.x = len
      boom.current.position.x = len / 2
    }
    if (hookG.current) hookG.current.position.x = len
    const cableLen = Math.max(0.1, BOOM_Y - PIVOT.y - (hook.y - PIVOT.y))
    if (cable.current) {
      cable.current.scale.y = cableLen
      cable.current.position.y = -cableLen / 2
    }
    if (binG.current) {
      binG.current.visible = carrying
      binG.current.position.y = -cableLen - 0.2
    }
    if (tiltG.current) tiltG.current.rotation.z = tilt
    if (lidRef.current) lidRef.current.visible = tilt < 0.4
    if (beacon.current) (beacon.current.material as THREE.MeshBasicMaterial).color.set(phase !== 'idle' && Math.floor(performance.now() / 300) % 2 ? '#fb923c' : '#7c2d12')
    for (let i = 0; i < 2; i++) {
      const off = (i - 0.5) * 2.2
      bodies.set(`truck-${kind}-${i}`, { x: r.x + Math.sin(r.heading) * off, z: r.z + Math.cos(r.heading) * off, r: 1.1 })
    }
  })

  const bodyColor = info.color
  const setW = (i: number) => (w: Group | null) => {
    if (w) wheels.current[i] = w
  }
  const binColor = BIN_DEFS[kind].color
  return (
    <group ref={root}>
      <group scale={S}>
        {/* chassis and cab */}
        <Block position={[0, 0.5, 0]} size={[1.6, 0.3, 4.2]} color="#334155" />
        <Block position={[0, 1.15, 1.5]} size={[1.6, 1.2, 1.2]} color="#f8fafc" />
        <Block position={[0, 1.4, 2.12]} size={[1.3, 0.6, 0.05]} material={sharedMaterials.windowGlow} color="" />
        <Block position={[0, 1.7, 1.2]} size={[1.5, 0.12, 0.7]} color={bodyColor} />
        <mesh ref={beacon} position={[0, 1.88, 1.4]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshBasicMaterial color="#7c2d12" />
        </mesh>
        {/* tipping cargo bed (hinged at the rear): an open tray so the load can be seen */}
        <group position={[0, 0.65, -1.9]}>
          <group ref={bed}>
            <Block position={[0, 0.12, 1.15]} size={[1.7, 0.14, 2.6]} color="#1f2937" />
            <Block position={[0.82, 0.62, 1.15]} size={[0.08, 0.9, 2.6]} color={bodyColor} />
            <Block position={[-0.82, 0.62, 1.15]} size={[0.08, 0.9, 2.6]} color={bodyColor} />
            <Block position={[0, 0.62, 2.41]} size={[1.7, 0.9, 0.08]} color={bodyColor} />
            <Block position={[0, 0.62, -0.11]} size={[1.7, 0.9, 0.08]} color={bodyColor} />
            <group ref={cargoG} visible={false}>
              {[[-0.4, 0.2, 0.5], [0.3, 0.3, 0.2], [-0.1, 0.45, 1.3], [0.35, 0.4, 1.7], [-0.45, 0.3, 1.9], [0, 0.6, 0.9]].map(([x, y, z], i) => (
                <mesh key={i} position={[x, y, z]} rotation={[i, i * 2, i]} castShadow>
                  <dodecahedronGeometry args={[0.32 + (i % 3) * 0.06, 0]} />
                  <meshStandardMaterial color={i % 2 ? binColor : BIN_DEFS[kind].dark} roughness={0.9} />
                </mesh>
              ))}
            </group>
            <Block position={[0.86, 0.62, 1.15]} size={[0.02, 0.4, 1.4]} color="#f8fafc" cast={false} />
            <Block position={[-0.86, 0.62, 1.15]} size={[0.02, 0.4, 1.4]} color="#f8fafc" cast={false} />
          </group>
        </group>
        {/* side crane: mast, a boom that turns and extends, a cable and a hook holding the bin */}
        <Block position={[PIVOT.x, (0.8 + BOOM_Y) / 2, PIVOT.z]} size={[0.22, BOOM_Y - 0.8, 0.22]} color="#facc15" />
        <group position={[PIVOT.x, BOOM_Y, PIVOT.z]}>
          <group ref={yaw}>
            <mesh ref={boom} castShadow>
              <boxGeometry args={[1, 0.16, 0.16]} />
              <meshStandardMaterial color="#facc15" roughness={0.5} />
            </mesh>
            <group ref={hookG}>
              <mesh ref={cable}>
                <boxGeometry args={[0.04, 1, 0.04]} />
                <meshStandardMaterial color="#1f2937" />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.1, 8, 6]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              {/* the bin it lifts (the one at the station is hidden meanwhile) */}
              <group ref={binG} visible={false}>
                <group ref={tiltG}>
                  <group scale={0.82} position={[0, -0.45, 0]}>
                    <mesh castShadow rotation={[0, Math.PI / 4, 0]}>
                      <cylinderGeometry args={[0.82, 0.68, 1.5, 4, 1]} />
                      <meshStandardMaterial color={binColor} roughness={0.4} />
                    </mesh>
                    <mesh ref={lidRef} position={[0, 0.78, 0]} rotation={[0, Math.PI / 4, 0]}>
                      <cylinderGeometry args={[0.88, 0.88, 0.14, 4, 1]} />
                      <meshStandardMaterial color={BIN_DEFS[kind].dark} roughness={0.5} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
        {[
          [0.82, 1.4],
          [-0.82, 1.4],
          [0.82, -0.6],
          [-0.82, -0.6],
          [0.82, -1.6],
          [-0.82, -1.6],
        ].map(([x, z], i) => (
          <group
            key={i}
            ref={(g) => {
              if (g && (i === 0 || i === 1)) frontSteer.current[i] = g
            }}
            position={[x, 0.36, z]}
          >
            <Wheel r={0.36} w={0.22} spin wheelRef={setW(i)} />
          </group>
        ))}
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.7, 2.13]}>
            <boxGeometry args={[0.28, 0.16, 0.05]} />
            <primitive object={sharedMaterials.lampGlow} attach="material" />
          </mesh>
        ))}
        {/* realism: bumpers, grille, wheel arches, mirrors, tail lights, exhaust and a hazard stripe */}
        <Block position={[0, 0.42, 2.2]} size={[1.7, 0.2, 0.18]} color="#1f2937" />
        <Block position={[0, 0.78, 2.14]} size={[1.0, 0.22, 0.04]} color="#0f172a" cast={false} />
        <Block position={[0, 0.42, -2.18]} size={[1.7, 0.2, 0.14]} color="#1f2937" />
        {[0.82, -0.82].flatMap((x) => [1.4, -0.6, -1.6].map((z) => (
          <mesh key={`${x}${z}`} position={[x * 1.03, 0.62, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.46, 0.46, 0.06, 20, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
        )))}
        {[-0.95, 0.95].map((x) => (
          <group key={x} position={[x, 1.55, 2.0]}>
            <Block position={[0, 0, 0]} size={[0.06, 0.28, 0.2]} color="#0f172a" />
            <Block position={[x > 0 ? 0.1 : -0.1, -0.02, 0]} size={[0.14, 0.04, 0.04]} color="#0f172a" />
          </group>
        ))}
        {[-0.65, 0.65].map((x) => (
          <mesh key={x} position={[x, 0.72, -2.2]}>
            <boxGeometry args={[0.3, 0.14, 0.04]} />
            <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.9} />
          </mesh>
        ))}
        <mesh position={[-0.78, 1.55, 0.95]}>
          <cylinderGeometry args={[0.05, 0.05, 1.1, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
        <Block position={[0, 0.9, 1.5]} size={[1.62, 0.1, 1.22]} color={bodyColor} cast={false} />
        {[1, -1].map((sd) => (
          <Block key={sd} position={[sd * 0.805, 0.9, -0.2]} size={[0.02, 0.2, 2.2]} color="#facc15" cast={false} />
        ))}
      </group>
    </group>
  )
}

/** The three collection trucks: they wait at their yards until a bin fills up */
export function Trucks() {
  return (
    <>
      {(['recycle', 'compost', 'trash'] as const).map((k) => (
        <Truck key={k} kind={k} />
      ))}
    </>
  )
}

void UNLOAD_TIME
