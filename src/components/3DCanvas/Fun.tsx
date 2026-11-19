import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, Mesh } from 'three'
import { useGame } from '../../state/gameStore'
import { HEAPS } from '../../state/world'
import { Block, Label, Marker, Near } from './primitives'

/** A steaming compost heap; it flattens and cools once somebody has turned it */
function Heap({ id, x, z }: { id: string; x: number; z: number }) {
  const needs = useGame((s) => s.heaps[id])
  const mound = useRef<Mesh>(null)
  const steam = useRef<Group>(null)
  useFrame(({ clock }, dt) => {
    const m = mound.current
    if (m) {
      const want = needs ? 1.15 : 0.8
      m.scale.y += (want - m.scale.y) * Math.min(1, dt * 4)
      m.scale.x = m.scale.z = 1.2 - (m.scale.y - 0.8) * 0.3
    }
    if (steam.current) {
      steam.current.visible = !!needs
      steam.current.children.forEach((c, i) => {
        const t = (clock.elapsedTime * 0.6 + i / 3) % 1
        c.position.y = 0.8 + t * 1.2
        c.scale.setScalar(0.15 + t * 0.35)
        ;((c as Mesh).material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - t)
      })
    }
  })
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, 0.12, 0]} size={[2.6, 0.24, 2.2]} color="#a4643a" tex="wood" texScale={1.2} />
      <mesh ref={mound} position={[0, 0.25, 0]} scale={[1.2, 0.8, 1.2]} castShadow>
        <sphereGeometry args={[0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a2f1b" roughness={1} />
      </mesh>
      {/* pitchfork */}
      <group position={[1.1, 0, 0.6]} rotation={[0, 0, -0.15]}>
        <Block position={[0, 0.8, 0]} size={[0.07, 1.6, 0.07]} color="#8a5a2b" tex="wood" texScale={1} />
        <Block position={[0, 1.65, 0]} size={[0.4, 0.06, 0.06]} color="#94a3b8" />
        {[-0.15, 0, 0.15].map((dx) => (
          <Block key={dx} position={[dx, 1.8, 0]} size={[0.04, 0.3, 0.04]} color="#94a3b8" />
        ))}
      </group>
      <group ref={steam}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * 0.3, 1, 0]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#e5e7eb" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {needs && (
        <Near x={x} z={z} r={18}>
          <Label position={[0, 2.5, 0]}>
            <Marker emoji="🪱" text="Needs turning!" color="bg-amber-200" />
          </Label>
        </Near>
      )}
    </group>
  )
}

export function Heaps() {
  return (
    <>
      {HEAPS.map((h) => (
        <Heap key={h.id} {...h} />
      ))}
    </>
  )
}
