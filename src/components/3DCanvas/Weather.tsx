import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, isNight } from '../../state/gameStore'
import { env, player } from '../../state/sceneRegistry'
import { usePreset, useSettings } from '../../state/settings'
import { HOUSES, PATHS, BARN, RECYCLING_CENTER } from '../../state/world'

const tmpM = new THREE.Matrix4()
const tmpQ = new THREE.Quaternion()
const tmpV = new THREE.Vector3()
const tmpS = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

/** Seeded random so layouts are the same in every tab */
export function seeded(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/* ------------------------------------------------------------------ */
/* Keeps env.* (wind / rain / flash) smooth for everything else         */
/* ------------------------------------------------------------------ */

export function EnvDriver() {
  useEffect(() => {
    const onFlash = () => {
      const reduced = useSettings.getState().access.reducedMotion
      env.flash = reduced ? 0.25 : 1
    }
    window.addEventListener('eco-lightning', onFlash)
    return () => window.removeEventListener('eco-lightning', onFlash)
  }, [])
  useFrame((_, dt) => {
    const s = useGame.getState()
    const w = s.weather
    const k = Math.min(1, dt * 0.8)
    env.wind += (w.wind - env.wind) * k
    env.windDir += (w.windDir - env.windDir) * k
    env.rain += ((w.raining > 0 ? 0.6 : 0) - env.rain) * Math.min(1, dt * 0.5)
    env.flash = Math.max(0, env.flash - dt * 3.5)
    env.night += ((isNight(s.clock) ? 1 : 0) - env.night) * Math.min(1, dt * 0.5)
  })
  return null
}

/* ------------------------------------------------------------------ */
/* 3D rain: slanted streaks that follow the player + ground splashes    */
/* ------------------------------------------------------------------ */

export function Rain() {
  const { rainDrops, splashes } = usePreset()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const splashMesh = useRef<THREE.InstancedMesh>(null)
  const AREA = 40
  const drops = useMemo(() => Array.from({ length: rainDrops }, () => ({ x: (Math.random() - 0.5) * AREA, y: Math.random() * 18, z: (Math.random() - 0.5) * AREA, v: 16 + Math.random() * 6 })), [rainDrops])
  const sp = useMemo(() => Array.from({ length: splashes }, () => ({ x: 0, z: 0, life: Math.random() })), [splashes])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const m = mesh.current
    if (!m) return
    const active = Math.floor(rainDrops * env.rain)
    m.count = active
    m.visible = active > 0
    if (active === 0) {
      if (splashMesh.current) splashMesh.current.visible = false
      return
    }
    const wx = Math.cos(env.windDir) * env.wind * 9
    const wz = Math.sin(env.windDir) * env.wind * 9
    tmpV.set(wx, -18, wz).normalize()
    tmpQ.setFromUnitVectors(UP, tmpV.clone().negate())
    for (let i = 0; i < active; i++) {
      const d = drops[i]
      d.y -= d.v * dt
      d.x += wx * dt
      d.z += wz * dt
      if (d.y < 0) {
        d.y = 16 + Math.random() * 3
        d.x = (Math.random() - 0.5) * AREA
        d.z = (Math.random() - 0.5) * AREA
      }
      tmpS.set(1, 1, 1)
      tmpM.compose(tmpV.set(player.x + d.x, d.y, player.z + d.z), tmpQ, tmpS)
      m.setMatrixAt(i, tmpM)
    }
    m.instanceMatrix.needsUpdate = true

    const s = splashMesh.current
    if (s && splashes) {
      s.visible = true
      const n = Math.floor(splashes * env.rain)
      s.count = n
      for (let i = 0; i < n; i++) {
        const p = sp[i]
        p.life += dt * 2.2
        if (p.life >= 1) {
          p.life = 0
          p.x = player.x + (Math.random() - 0.5) * 26
          p.z = player.z + (Math.random() - 0.5) * 26
        }
        const sc = 0.15 + p.life * 0.55
        const fade = 1 - p.life
        tmpQ.identity()
        tmpM.compose(tmpV.set(p.x, 0.1, p.z), tmpQ, tmpS.set(sc, fade * 0.8 + 0.2, sc))
        s.setMatrixAt(i, tmpM)
      }
      s.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, rainDrops]} frustumCulled={false}>
        <boxGeometry args={[0.025, 0.6, 0.025]} />
        <meshBasicMaterial color="#cfe4ff" transparent opacity={0.55} />
      </instancedMesh>
      {splashes > 0 && (
        <instancedMesh ref={splashMesh} args={[undefined, undefined, splashes]} frustumCulled={false}>
          <torusGeometry args={[0.35, 0.03, 4, 14]} />
          <meshBasicMaterial color="#e0f2fe" transparent opacity={0.6} />
        </instancedMesh>
      )}
    </>
  )
}

/** Puddles that appear on the paths while it rains and dry up afterwards */
export function Puddles() {
  const { puddles } = usePreset()
  const group = useRef<THREE.Group>(null)
  const wet = useRef(0)
  const spots = useMemo(() => {
    const r = seeded(42)
    return Array.from({ length: 26 }, () => {
      const p = PATHS[Math.floor(r() * PATHS.length)]
      return { x: p.x0 + r() * (p.x1 - p.x0), z: p.z0 + r() * (p.z1 - p.z0), s: 0.6 + r() * 1.2, sx: 0.7 + r() * 0.6 }
    })
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7fa8c9', roughness: 0.05, metalness: 0.35, transparent: true, opacity: 0.7 }), [])
  useFrame((_, dt) => {
    wet.current = THREE.MathUtils.clamp(wet.current + (env.rain > 0.2 ? dt / 12 : -dt / 40), 0, 1)
    const g = group.current
    if (!g) return
    g.visible = wet.current > 0.02
    g.children.forEach((c, i) => {
      const k = wet.current * spots[i].s
      c.scale.set(k * spots[i].sx, 1, k)
    })
  })
  if (!puddles) return null
  return (
    <group ref={group}>
      {spots.map((p, i) => (
        <mesh key={i} position={[p.x, 0.095, p.z]} rotation={[-Math.PI / 2, 0, i]} material={mat}>
          <circleGeometry args={[0.8, 14]} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Leaves blowing across the screen when it's windy                     */
/* ------------------------------------------------------------------ */

export function WindLeaves() {
  const { leaves } = usePreset()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const AREA = 34
  const data = useMemo(() => Array.from({ length: leaves }, () => ({ x: (Math.random() - 0.5) * AREA, y: 0.3 + Math.random() * 4, z: (Math.random() - 0.5) * AREA, spin: Math.random() * 6, sp: 0.7 + Math.random() * 0.6, ph: Math.random() * 10 })), [leaves])
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    const colors = ['#d97706', '#65a30d', '#b45309', '#facc15', '#84cc16', '#f472b6']
    const c = new THREE.Color()
    for (let i = 0; i < leaves; i++) m.setColorAt(i, c.set(colors[i % colors.length]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [leaves])
  const e = useMemo(() => new THREE.Euler(), [])
  useFrame(({ clock }, rawDt) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    const strength = THREE.MathUtils.smoothstep(env.wind, 0.3, 0.85)
    const n = Math.floor(leaves * strength)
    m.count = n
    m.visible = n > 0
    if (!n) return
    const t = clock.elapsedTime
    const vx = Math.cos(env.windDir) * (2 + env.wind * 7)
    const vz = Math.sin(env.windDir) * (2 + env.wind * 7)
    for (let i = 0; i < n; i++) {
      const d = data[i]
      d.x += vx * d.sp * dt
      d.z += vz * d.sp * dt
      d.y += Math.sin(t * 3 + d.ph) * dt * 1.2
      d.spin += dt * 6 * d.sp
      if (d.x > AREA / 2) d.x -= AREA
      if (d.x < -AREA / 2) d.x += AREA
      if (d.z > AREA / 2) d.z -= AREA
      if (d.z < -AREA / 2) d.z += AREA
      d.y = THREE.MathUtils.clamp(d.y, 0.2, 5)
      tmpQ.setFromEuler(e.set(d.spin, d.spin * 0.7, d.spin * 0.3))
      tmpM.compose(tmpV.set(player.x + d.x, d.y, player.z + d.z), tmpQ, tmpS.set(1, 1, 1))
      m.setMatrixAt(i, tmpM)
    }
    m.instanceMatrix.needsUpdate = true
  })
  if (!leaves) return null
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, leaves]} frustumCulled={false}>
      <boxGeometry args={[0.16, 0.02, 0.1]} />
      <meshLambertMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/* Clouds: invisible from the camera, but their shadows sweep the land  */
/* ------------------------------------------------------------------ */

export function CloudShadows() {
  const { clouds, shadows } = usePreset()
  const group = useRef<THREE.Group>(null)
  const list = useMemo(() => {
    const r = seeded(7)
    return Array.from({ length: clouds }, () => ({ x: (r() - 0.5) * 160, z: (r() - 0.5) * 160, s: 0.8 + r() * 1.4, parts: Array.from({ length: 4 }, () => [(r() - 0.5) * 6, r() * 1.2, (r() - 0.5) * 4, 2 + r() * 3] as const) }))
  }, [clouds])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), [])
  useFrame((_, rawDt) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(rawDt, 0.05)
    const sp = 0.6 + env.wind * 3.5
    g.children.forEach((c, i) => {
      const cl = list[i]
      cl.x += Math.cos(env.windDir) * sp * dt
      cl.z += Math.sin(env.windDir) * sp * dt
      if (cl.x > 70) cl.x -= 140
      if (cl.x < -70) cl.x += 140
      if (cl.z > 70) cl.z -= 140
      if (cl.z < -70) cl.z += 140
      c.position.set(cl.x, 16, cl.z)
    })
  })
  if (!clouds || !shadows) return null
  return (
    <group ref={group}>
      {list.map((cl, i) => (
        <group key={i} scale={cl.s}>
          {cl.parts.map(([x, y, z, w], k) => (
            <mesh key={k} position={[x, y, z]} castShadow material={mat}>
              <boxGeometry args={[w * 1.4, 1, w]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Birds flying over in V formation during the day                      */
/* ------------------------------------------------------------------ */

function Flock({ seed }: { seed: number }) {
  const group = useRef<THREE.Group>(null)
  const wings = useRef<THREE.Group[]>([])
  const st = useRef({ t: seed * 7, x: 0, z: 0, dx: 1, dz: 0, active: false })
  useFrame(({ clock }, rawDt) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    s.t -= dt
    const ok = env.night < 0.5 && env.rain < 0.3
    if (!s.active && s.t <= 0 && ok) {
      const a = Math.random() * Math.PI * 2
      s.dx = Math.cos(a)
      s.dz = Math.sin(a)
      s.x = player.x - s.dx * 40 + (Math.random() - 0.5) * 10
      s.z = player.z - s.dz * 40 + (Math.random() - 0.5) * 10
      s.active = true
    }
    g.visible = s.active
    if (!s.active) return
    s.x += s.dx * 6 * dt
    s.z += s.dz * 6 * dt
    g.position.set(s.x, 9 + Math.sin(clock.elapsedTime * 0.8 + seed) * 0.5, s.z)
    g.rotation.y = Math.atan2(s.dx, s.dz)
    wings.current.forEach((w, i) => (w.rotation.z = Math.sin(clock.elapsedTime * 10 + i) * 0.7))
    if (Math.hypot(s.x - player.x, s.z - player.z) > 48) {
      s.active = false
      s.t = 8 + Math.random() * 20
    }
  })
  const offsets: [number, number][] = [
    [0, 0],
    [-1, -1],
    [1, -1],
    [-2, -2],
    [2, -2],
  ]
  return (
    <group ref={group} visible={false}>
      {offsets.map(([x, z], i) => (
        <group key={i} position={[x * 0.9, 0, z * 0.9]}>
          <mesh>
            <boxGeometry args={[0.12, 0.1, 0.35]} />
            <meshLambertMaterial color="#334155" />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} ref={(el) => void (el && (wings.current[i * 2 + (side + 1) / 2] = el))} scale={[side, 1, 1]}>
              <mesh position={[0.25, 0, 0]}>
                <boxGeometry args={[0.45, 0.02, 0.18]} />
                <meshLambertMaterial color="#475569" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

export function Birds() {
  const { birds } = usePreset()
  return (
    <>
      {Array.from({ length: birds }, (_, i) => (
        <Flock key={i} seed={i + 1} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Chimney smoke that bends with the wind                               */
/* ------------------------------------------------------------------ */

export const CHIMNEYS: [number, number, number][] = [
  ...HOUSES.flatMap((h, i) => (i % 2 === 0 ? [[h.x - 0.6, 3.4 + (i % 3) * 0.9 + 1.9, h.z - 1.2] as [number, number, number]] : [])),
  [(BARN.x0 + BARN.x1) / 2 + 1.5, 6.4, (BARN.z0 + BARN.z1) / 2 + 1.6],
  [RECYCLING_CENTER.x0 + 1.5, 4.8, RECYCLING_CENTER.z0 + 1.5],
]

export function ChimneySmoke() {
  const { smoke } = usePreset()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const PER = 7
  const N = CHIMNEYS.length * PER
  const puffs = useMemo(() => Array.from({ length: N }, (_, i) => ({ life: (i % PER) / PER, c: Math.floor(i / PER) })), [N])
  useFrame((_, rawDt) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    const wx = Math.cos(env.windDir) * (0.3 + env.wind * 2.5)
    const wz = Math.sin(env.windDir) * (0.3 + env.wind * 2.5)
    puffs.forEach((p, i) => {
      p.life = (p.life + dt * 0.25) % 1
      const [cx, cy, cz] = CHIMNEYS[p.c]
      const s = 0.25 + p.life * 0.9
      const fade = p.life < 0.1 ? p.life * 10 : 1 - (p.life - 0.1) / 0.9
      tmpQ.identity()
      tmpM.compose(tmpV.set(cx + wx * p.life * 3, cy + p.life * 3.2, cz + wz * p.life * 3), tmpQ, tmpS.setScalar(s * Math.max(0.05, fade)))
      m.setMatrixAt(i, tmpM)
    })
    m.instanceMatrix.needsUpdate = true
  })
  if (!smoke) return null
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false}>
      <icosahedronGeometry args={[0.45, 0]} />
      <meshLambertMaterial color="#e5e7eb" transparent opacity={0.7} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/* Dust puffs (running) and splashes (rain) at your feet                */
/* ------------------------------------------------------------------ */

const PUFFS = 24
const puffPool = Array.from({ length: PUFFS }, () => ({ x: 0, z: 0, life: 1, wet: false }))
let puffIdx = 0
export function emitPuff(x: number, z: number, wet: boolean) {
  const p = puffPool[puffIdx++ % PUFFS]
  p.x = x + (Math.random() - 0.5) * 0.3
  p.z = z + (Math.random() - 0.5) * 0.3
  p.life = 0
  p.wet = wet
}

export function FootPuffs() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dry = useMemo(() => new THREE.Color('#e7d8b9'), [])
  const wetC = useMemo(() => new THREE.Color('#bfe3ff'), [])
  useFrame((_, rawDt) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    puffPool.forEach((p, i) => {
      p.life = Math.min(1, p.life + dt * 2)
      const s = p.life >= 1 ? 0.0001 : (0.12 + p.life * 0.35) * (1 - p.life)
      tmpQ.identity()
      tmpM.compose(tmpV.set(p.x, 0.12 + p.life * 0.35, p.z), tmpQ, tmpS.setScalar(s))
      m.setMatrixAt(i, tmpM)
      m.setColorAt(i, p.wet ? wetC : dry)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PUFFS]} frustumCulled={false}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshLambertMaterial transparent opacity={0.75} />
    </instancedMesh>
  )
}
