import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { particles } from '../../state/sceneRegistry'
import { useGame, isNight } from '../../state/gameStore'
import { Label, Near, Twinkles } from './primitives'

/** "+10 ⭐" / "Oops!" popups that float up from where something happened */
export function Floaters() {
  const floaters = useGame((s) => s.floaters)
  return (
    <group>
      {floaters.map((f) => (
        <Label key={f.id} position={[f.x, 2.6, f.z]}>
          <motion.div
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -60, opacity: [0, 1, 1, 0], scale: 1.1 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            className="text-outline whitespace-nowrap text-2xl font-bold"
            style={{ color: f.color }}
          >
            {f.text}
          </motion.div>
        </Label>
      ))}
    </group>
  )
}

/** Big floating mood emoji over the plaza */
export function CommunityMood() {
  const happiness = useGame((s) => s.happiness)
  const mood = happiness > 62 ? { e: '😄', t: 'Happy', c: 'text-yellow-500' } : happiness > 35 ? { e: '🙂', t: 'Okay', c: 'text-amber-500' } : { e: '😟', t: 'Sad', c: 'text-sky-600' }
  return (
    <Near x={-2} z={-5} r={16}>
      <group position={[-2, 0, -5]}>
        <Label position={[0, 4.2, 0]}>
          <div className="flex animate-[float_3s_ease-in-out_infinite] flex-col items-center">
            <div className={`text-outline text-lg font-bold ${mood.c}`}>Town mood: {mood.t}</div>
            <div className="text-5xl drop-shadow-[0_0_14px_rgba(255,230,90,0.9)]">{mood.e}</div>
          </div>
        </Label>
        {happiness > 55 && <Twinkles position={[0, 1.5, 0]} count={28} scale={[6, 3, 6]} color="#86efac" />}
      </group>
    </Near>
  )
}

/** Fireflies in the park and woods at night */
export function Fireflies() {
  const night = useGame((s) => isNight(s.clock))
  if (!night) return null
  return (
    <>
      <Twinkles position={[20, 1.5, -20]} count={50} scale={[16, 3, 16]} color="#fef08a" />
      <Twinkles position={[0, 1.5, 41]} count={60} scale={[60, 3, 6]} color="#fef08a" />
      <Twinkles position={[36, 1.5, -36]} count={40} scale={[14, 3, 14]} color="#fef08a" />
    </>
  )
}

/** Grain, water drops, dirt and sparkles thrown by actions (see emitBurst) */
export function Bursts() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const col = useMemo(() => new THREE.Color(), [])
  const MAX = 160
  useFrame((_, rawDt) => {
    const im = mesh.current
    if (!im) return
    const dt = Math.min(rawDt, 0.05)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.life -= dt
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }
      p.vy -= 9 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      if (p.y < 0.06) {
        p.y = 0.06
        p.vy *= -0.3
        p.vx *= 0.6
        p.vz *= 0.6
      }
    }
    for (let i = 0; i < MAX; i++) {
      const p = particles[i]
      if (!p) {
        dummy.position.set(0, -50, 0)
        dummy.scale.setScalar(0.0001)
      } else {
        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.setScalar(p.size * 10 * Math.min(1, p.life / 0.3))
        im.setColorAt(i, col.set(p.color))
      }
      dummy.updateMatrix()
      im.setMatrixAt(i, dummy.matrix)
    }
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} frustumCulled={false}>
      <sphereGeometry args={[0.1, 6, 5]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
