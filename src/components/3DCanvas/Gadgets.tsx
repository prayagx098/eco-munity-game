import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, Mesh } from 'three'
import { sfx } from '../../audio/audio'
import { dayPhase, useGame } from '../../state/gameStore'
import { evalRules, PROJECT_BY_ID, type Built, type Scenario } from '../../state/projects'
import { MAKER_PADS, MAKER_YARD, distToRect } from '../../state/world'
import { bodies, env, npcPositions, player, remotePlayers } from '../../state/sceneRegistry'
import { Block } from './primitives'

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** what the real town looks like to this project's sensors right now */
function sense(x: number, z: number, every: number): Scenario {
  let near = Math.hypot(player.x - x, player.z - z) < 4
  if (!near) for (const n of npcPositions.values()) if (Math.hypot(n.x - x, n.z - z) < 4) near = true
  if (!near) for (const o of remotePlayers.values()) if (Math.hypot(o.x - x, o.z - z) < 4) near = true
  return { dark: env.night > 0.5, near, timer: (performance.now() / 1000) % (2 * every) < every }
}

function Gadget({ b }: { b: Built }) {
  const def = PROJECT_BY_ID[b.def]
  const [x, z] = MAKER_PADS[b.pad ?? 0]
  const kind = def.body
  const bulb = useRef<Mesh>(null)
  const glow = useRef<Mesh>(null)
  const status = useRef<Mesh>(null)
  const panel = useRef<Group>(null)
  const beacon = useRef<Mesh>(null)
  const fan = useRef<Group>(null)
  const last = useRef(0)
  const ang = useRef(0)
  const spin = useRef(0)
  useEffect(() => {
    const key = `gadget-${b.id}`
    bodies.set(key, { x, z, r: 0.45 })
    return () => void bodies.delete(key)
  }, [b.id, x, z])
  useFrame((_, dt) => {
    const st = useGame.getState()
    const hour = (6 + dayPhase(st.clock) * 24) % 24
    const act = evalRules(b.prog, sense(x, z, b.prog.every))
    const t = performance.now() / 1000
    const blink = Math.floor(t * 3) % 2 === 0
    if (status.current) (status.current.material as THREE.MeshStandardMaterial).emissiveIntensity = act !== 'off' ? 1.6 : 0.1
    if (kind === 'lamp') {
      const lit = act === 'on' || (act === 'blink' && blink)
      if (bulb.current) (bulb.current.material as THREE.MeshStandardMaterial).emissiveIntensity = lerp((bulb.current.material as THREE.MeshStandardMaterial).emissiveIntensity, lit ? 3 : 0.05, Math.min(1, dt * 12))
      if (glow.current) {
        const m = glow.current.material as THREE.MeshBasicMaterial
        m.opacity = lerp(m.opacity, lit ? 0.38 : 0, Math.min(1, dt * 10))
        glow.current.visible = m.opacity > 0.01
      }
    } else if (kind === 'tracker') {
      const sunA = THREE.MathUtils.clamp(((hour - 6) / 12) * 160 - 80, -80, 80)
      ang.current = lerp(ang.current, act === 'turn' ? sunA : 0, Math.min(1, dt * 1.5))
      if (panel.current) panel.current.rotation.z = THREE.MathUtils.degToRad(-ang.current)
    } else if (kind === 'fan') {
      spin.current = lerp(spin.current, act === 'spin' ? 9 : 0, Math.min(1, dt * 1.2))
      if (fan.current) fan.current.rotation.z += spin.current * dt
    } else {
      const alarm = act === 'beep' || act === 'blink'
      if (beacon.current) (beacon.current.material as THREE.MeshStandardMaterial).emissiveIntensity = alarm && (act === 'beep' || blink) ? 3 : 0.1
      if (act === 'beep' && t - last.current > 0.8) {
        last.current = t
        if (Math.hypot(player.x - x, player.z - z) < 22) sfx('bell')
      }
    }
  })
  return (
    <group position={[x, 0.1, z]}>
      {/* every gadget stands on a little PCB base with a status LED */}
      <Block position={[0, 0.07, 0]} size={[0.8, 0.14, 0.8]} color="#15803d" />
      <mesh ref={status} position={[0.28, 0.17, 0.28]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color="#4ade80" emissive="#22ff88" emissiveIntensity={0.1} />
      </mesh>
      {kind === 'lamp' && (
        <group>
          <Block position={[0, 1.4, 0]} size={[0.1, 2.6, 0.1]} color="#334155" />
          <Block position={[0.25, 2.7, 0]} size={[0.6, 0.08, 0.1]} color="#334155" />
          <mesh ref={bulb} position={[0.45, 2.55, 0]}>
            <sphereGeometry args={[0.17, 14, 10]} />
            <meshStandardMaterial color="#fff7cc" emissive="#ffd84d" emissiveIntensity={0.05} />
          </mesh>
          <mesh ref={glow} position={[0.45, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <circleGeometry args={[3.2, 24]} />
            <meshBasicMaterial color="#ffe27a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      )}
      {kind === 'tracker' && (
        <group>
          <Block position={[0, 0.8, 0]} size={[0.14, 1.4, 0.14]} color="#475569" />
          <Block position={[0.3, 0.35, 0]} size={[0.3, 0.3, 0.3]} color="#64748b" />
          <group ref={panel} position={[0, 1.55, 0]}>
            <Block position={[0, 0.08, 0]} size={[1.9, 0.08, 1.1]} color="#1d4ed8" />
            <Block position={[0, 0.13, 0]} size={[1.8, 0.02, 1]} color="#2563eb" cast={false} />
            {[-0.6, 0, 0.6].map((x) => (
              <Block key={x} position={[x, 0.145, 0]} size={[0.02, 0.01, 1]} color="#93c5fd" cast={false} />
            ))}
          </group>
        </group>
      )}
      {kind === 'fan' && (
        <group>
          <Block position={[0, 0.7, 0]} size={[0.14, 1.2, 0.14]} color="#475569" />
          <Block position={[0, 1.38, 0]} size={[0.36, 0.36, 0.36]} color="#94a3b8" />
          <group ref={fan} position={[0, 1.38, 0.22]}>
            {[0, 1, 2, 3].map((k) => (
              <group key={k} rotation={[0, 0, (k * Math.PI) / 2]}>
                <Block position={[0, 0.34, 0]} size={[0.16, 0.6, 0.03]} color="#38bdf8" cast={false} />
              </group>
            ))}
          </group>
        </group>
      )}
      {kind === 'alarm' && (
        <group>
          <Block position={[0, 0.7, 0]} size={[0.5, 1.2, 0.4]} color="#e2e8f0" />
          <Block position={[0, 1.0, 0.21]} size={[0.3, 0.3, 0.04]} color="#334155" />
          <mesh ref={beacon} position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 0.22, 14]} />
            <meshStandardMaterial color="#ef4444" emissive="#ff2222" emissiveIntensity={0.1} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/** The projects students chose to show in the Maker Yard, running their own code live */
export function Gadgets() {
  const projects = useGame((s) => s.wallet.projects)
  const remotes = useGame((s) => s.remotes)
  const away = useRef(0)
  // walk away from the yard for a while and your projects go back on the shelf, so pads never stay blocked
  useFrame((_, dt) => {
    const st = useGame.getState()
    if (!st.wallet.projects.some((p) => p.pad !== null)) {
      away.current = 0
      return
    }
    away.current = distToRect(player.x, player.z, MAKER_YARD) > 30 ? away.current + dt : 0
    if (away.current > 20) {
      away.current = 0
      for (const p of st.wallet.projects) if (p.pad !== null) st.takeProject(p.id)
      st.pushToast({ kind: 'info', emoji: '📁', title: 'Projects tidied away', text: 'You left the Maker Yard, so your projects went back on your shelf.' })
    }
  })
  return (
    <group>
      {projects
        .filter((p) => p.pad !== null)
        .map((p) => (
          <Gadget key={p.id} b={p} />
        ))}
      {/* projects other players put in the yard */}
      {Object.entries(remotes).flatMap(([rid, r]) =>
        (r.yard ?? []).map((y) => <Gadget key={`${rid}-${y.pad}`} b={{ id: `${rid}-${y.pad}`, def: y.def, pad: y.pad, prog: y.prog }} />),
      )}
    </group>
  )
}
