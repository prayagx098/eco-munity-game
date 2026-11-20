import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HEART_POS } from '../../state/world'
import { CHAPTERS, useStory } from '../../state/story'
import { Block, Sign3D } from './primitives'

const R = 0.95

/**
 * The Green Heart: a floating crystal on a stone pedestal in the plaza. It starts grey and dim, and every
 * Spark you win back lights it up and sends a coloured orb circling around it.
 */
export function GreenHeart() {
  const crystal = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const halo = useRef<THREE.Mesh>(null)
  const orbs = useRef<THREE.Mesh[]>([])
  const cur = useRef(0)
  const green = useRef(new THREE.Color('#22c55e'))
  const grey = useRef(new THREE.Color('#6b7280'))
  useFrame(({ clock }, dt) => {
    const sparks = useStory.getState().completed.length
    cur.current += (sparks / 7 - cur.current) * Math.min(1, dt * 1.5)
    const k = cur.current
    const t = clock.elapsedTime
    if (crystal.current) {
      crystal.current.position.y = 1.9 + Math.sin(t * 1.4) * 0.12
      crystal.current.rotation.y = t * (0.4 + k * 0.6)
      const s = 0.85 + k * 0.35
      crystal.current.scale.set(s, s * 1.25, s)
    }
    if (mat.current) {
      mat.current.color.copy(grey.current).lerp(green.current, k)
      mat.current.emissive.copy(grey.current).lerp(green.current, k)
      mat.current.emissiveIntensity = 0.15 + k * 1.6 + Math.sin(t * 2.4) * 0.12 * (0.3 + k)
    }
    if (halo.current) {
      halo.current.position.y = 1.9 + Math.sin(t * 1.4) * 0.12
      const hs = 0.9 + k * 1.5 + Math.sin(t * 2) * 0.05
      halo.current.scale.setScalar(hs)
      ;(halo.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + k * 0.22
    }
    const done = useStory.getState().completed
    orbs.current.forEach((o, i) => {
      if (!o) return
      const got = done.includes(CHAPTERS[i].id)
      o.visible = got
      if (!got) return
      const a = t * 0.9 + (i / 7) * Math.PI * 2
      o.position.set(Math.cos(a) * 1.15, 1.9 + Math.sin(t * 1.6 + i) * 0.3, Math.sin(a) * 1.15)
    })
  })
  return (
    <group position={[HEART_POS[0], 0, HEART_POS[1]]}>
      {/* stone pedestal */}
      <Block position={[0, 0.2, 0]} size={[R * 2, 0.4, R * 2]} color="#94a3b8" tex="paving" texScale={1.5} />
      <Block position={[0, 0.75, 0]} size={[R * 1.2, 0.7, R * 1.2]} color="#cbd5e1" tex="paving" texScale={1.5} />
      <Block position={[0, 1.15, 0]} size={[R * 1.5, 0.1, R * 1.5]} color="#64748b" />
      <mesh ref={crystal} position={[0, 1.9, 0]} castShadow>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial ref={mat} color="#6b7280" emissive="#6b7280" emissiveIntensity={0.2} roughness={0.15} metalness={0.2} flatShading />
      </mesh>
      <mesh ref={halo} position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.9, 20, 14]} />
        <meshBasicMaterial color="#86efac" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {CHAPTERS.map((c, i) => (
        <mesh key={c.id} ref={(m) => void (m && (orbs.current[i] = m))} visible={false}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshBasicMaterial color={c.spark.color} />
        </mesh>
      ))}
      <Sign3D text="💚 The Green Heart" position={[0, 0.2, R + 0.02]} width={1.7} height={0.4} bg="#14532d" border="#bbf7d0" />
    </group>
  )
}
