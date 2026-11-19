import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { useGame, type TrashItem } from '../../state/gameStore'
import { TRASH_BY_ID, type TrashType } from '../../state/gameData'
import { Plastic } from './primitives'

/** Low-poly mesh for each kind of litter */
export function TrashShape({ type }: { type: TrashType }) {
  switch (type.shape) {
    case 'bottle':
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.5, 12]} />
            <meshStandardMaterial color={type.color} roughness={0.1} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.31, 0]}>
            <cylinderGeometry args={[0.07, 0.12, 0.14, 12]} />
            <meshStandardMaterial color={type.color} roughness={0.1} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.41, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.07, 12]} />
            <Plastic color="#1d4ed8" />
          </mesh>
        </group>
      )
    case 'jug':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.32, 0.4, 0.32]} />
            <Plastic color={type.color} />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.1, 10]} />
            <Plastic color="#ef4444" />
          </mesh>
          <mesh position={[0.16, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.09, 0.03, 6, 12]} />
            <Plastic color={type.color} />
          </mesh>
        </group>
      )
    case 'can':
      return (
        <group rotation={[0, 0.6, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.34, 14]} />
            <Plastic color={type.color} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.11, 0.13, 0.03, 14]} />
            <Plastic color="#d1d5db" metalness={0.6} />
          </mesh>
        </group>
      )
    case 'paper':
      if (type.id === 'tissue')
        return (
          <mesh position={[0, 0.14, 0]} castShadow>
            <icosahedronGeometry args={[0.18, 0]} />
            <Plastic color="#ffffff" roughness={0.9} />
          </mesh>
        )
      return (
        <group>
          <mesh position={[-0.12, 0.05, 0]} rotation={[0, 0, 0.25]} castShadow>
            <boxGeometry args={[0.32, 0.03, 0.42]} />
            <Plastic color={type.color} roughness={0.9} />
          </mesh>
          <mesh position={[0.12, 0.05, 0]} rotation={[0, 0, -0.25]} castShadow>
            <boxGeometry args={[0.32, 0.03, 0.42]} />
            <Plastic color="#d6d0bd" roughness={0.9} />
          </mesh>
        </group>
      )
    case 'box':
      return (
        <group>
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.5, 0.36, 0.42]} />
            <Plastic color={type.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.365, 0]}>
            <boxGeometry args={[0.1, 0.01, 0.43]} />
            <Plastic color="#a87a45" />
          </mesh>
        </group>
      )
    case 'peel':
      return (
        <group>
          {[0, 2.1, 4.2].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * 0.14, 0.05, Math.sin(a) * 0.14]} rotation={[0, -a, 0.15]} castShadow>
              <boxGeometry args={[0.32, 0.05, 0.11]} />
              <Plastic color={type.color} />
            </mesh>
          ))}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.1, 8]} />
            <Plastic color="#6b4423" />
          </mesh>
        </group>
      )
    case 'apple':
      return (
        <group position={[0, 0.17, 0]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.2, 10]} />
            <Plastic color="#fdf2d0" />
          </mesh>
          {[0.12, -0.12].map((y) => (
            <mesh key={y} position={[0, y, 0]} scale={[1, 0.55, 1]} castShadow>
              <sphereGeometry args={[0.15, 12, 10]} />
              <Plastic color={type.color} />
            </mesh>
          ))}
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.1, 6]} />
            <Plastic color="#6b4423" />
          </mesh>
        </group>
      )
    case 'leaf':
      return (
        <group>
          {['#d9822b', '#c0392b', '#e5a21a'].map((c, i) => (
            <mesh key={i} position={[(i - 1) * 0.16, 0.04 + i * 0.02, (i % 2) * 0.1]} rotation={[0, i * 0.9, 0]} scale={[1, 0.15, 0.55]} castShadow>
              <sphereGeometry args={[0.2, 8, 6]} />
              <Plastic color={c} />
            </mesh>
          ))}
        </group>
      )
    case 'bag':
      return (
        <group position={[0, 0.06, 0]} rotation={[0, 0.4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.1, 0.3]} />
            <Plastic color={type.color} metalness={0.45} roughness={0.2} />
          </mesh>
          {[-0.23, 0.23].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[0.05, 0.04, 0.32]} />
              <Plastic color="#f0abfc" metalness={0.45} roughness={0.2} />
            </mesh>
          ))}
        </group>
      )
    case 'cup':
      return (
        <group position={[0, 0.18, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.11, 0.36, 14]} />
            <Plastic color={type.color} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.152, 0.13, 0.14, 14]} />
            <Plastic color="#a16207" />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.05, 14]} />
            <Plastic color="#1f2937" />
          </mesh>
        </group>
      )
  }
}

function TrashPiece({ item }: { item: TrashItem }) {
  const type = TRASH_BY_ID[item.typeId]
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const born = useRef(0)

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    born.current = Math.min(1, born.current + dt * 2.5)
    const t = state.clock.elapsedTime
    const s = useGame.getState()
    const targeted = s.nearby?.kind === 'pickup' && s.nearby.targetId === item.id
    g.position.y = item.inPond ? 0.05 + Math.sin(t * 2 + item.x) * 0.05 : 0.12 + (targeted ? 0.3 : 0) + Math.sin(t * 2 + item.x) * 0.03
    g.rotation.y = item.inPond ? Math.sin(t * 0.7 + item.z) * 0.6 : targeted ? t * 2 : 0
    const sc = 0.8 * (born.current < 1 ? born.current * (1.3 - 0.3 * born.current) : 1) * (targeted ? 1.15 : 1)
    g.scale.setScalar(Math.max(0.001, sc))
    if (ring.current) {
      const p = 1 + Math.sin(t * 4) * 0.12
      ring.current.scale.set(p, p, p)
    }
  })

  return (
    <>
      <mesh ref={ring} position={[item.x, item.inPond ? 0.1 : 0.12, item.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.62, 24]} />
        <meshBasicMaterial color={item.inPond ? '#ffffff' : '#fff7a8'} transparent opacity={0.85} />
      </mesh>
      <group ref={group} position={[item.x, 0.12, item.z]} scale={0.001}>
        <TrashShape type={type} />
      </group>
    </>
  )
}

export function TrashItems() {
  const trash = useGame((s) => s.trash)
  return (
    <group>
      {trash.map((t) => (
        <TrashPiece key={t.id} item={t} />
      ))}
    </group>
  )
}
