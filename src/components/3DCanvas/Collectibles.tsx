import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useGame } from '../../state/gameStore'
import { bodies } from '../../state/sceneRegistry'
import { setDynamicObstacle } from '../../state/world'
import { GrowIn, Label, LegoTree, Marker, Near, Plastic } from './primitives'

/* ------------------------------------------------------------------ */
/* Eco-coins (walk over them to collect)                                */
/* ------------------------------------------------------------------ */

function Coin({ x, z }: { x: number; z: number }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 2.5
    ref.current.position.y = 0.7 + Math.sin(clock.elapsedTime * 3 + x) * 0.12
  })
  return (
    <group ref={ref} position={[x, 0.7, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.08, 20]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.25} emissive="#b45309" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.045]} scale={[1, 1.4, 1]}>
        <circleGeometry args={[0.13, 3]} />
        <meshBasicMaterial color="#16a34a" />
      </mesh>
    </group>
  )
}

export function Coins() {
  const coins = useGame((s) => s.coins)
  return (
    <group>
      {coins.map((c) => (
        <Coin key={c.id} x={c.x} z={c.z} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Tree-planting spots                                                  */
/* ------------------------------------------------------------------ */

export function Saplings() {
  const spots = useGame((s) => s.saplings)

  // Newly planted trees become solid obstacles so players, vehicles and balls cannot walk through them
  useEffect(() => {
    spots.forEach((sp) => {
      const key = `sapling-${sp.id}`
      if (sp.planted) {
        setDynamicObstacle(key, { x: sp.x, z: sp.z, r: 0.45 })
        bodies.set(key, { x: sp.x, z: sp.z, r: 0.45 })
      } else {
        setDynamicObstacle(key, null)
        bodies.delete(key)
      }
    })
    return () => {
      spots.forEach((sp) => {
        const key = `sapling-${sp.id}`
        setDynamicObstacle(key, null)
        bodies.delete(key)
      })
    }
  }, [spots])

  return (
    <group>
      {spots.map((sp) =>
        sp.planted ? (
          <GrowIn key={sp.id} position={[sp.x, 0, sp.z]}>
            <LegoTree position={[0, 0, 0]} scale={0.85} tone={Math.round(sp.x)} />
          </GrowIn>
        ) : (
          <group key={sp.id} position={[sp.x, 0, sp.z]}>
            <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.55, 0.75, 0.22, 14]} />
              <Plastic color="#7a4a24" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.36, 5]} />
              <Plastic color="#3cb043" />
            </mesh>
            {[-1, 1].map((d) => (
              <mesh key={d} position={[d * 0.1, 0.54, 0]} rotation={[0, 0, d * -0.7]} scale={[1, 0.35, 0.6]}>
                <sphereGeometry args={[0.12, 8, 6]} />
                <Plastic color="#4ade80" />
              </mesh>
            ))}
            <Near x={sp.x} z={sp.z} r={14}>
              <Label position={[0, 1.2, 0]}>
                <Marker emoji="🌱" text="Plant here" color="bg-lime-300" />
              </Label>
            </Near>
          </group>
        ),
      )}
    </group>
  )
}
