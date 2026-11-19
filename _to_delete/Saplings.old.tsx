import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useGame, type SaplingSpot } from '../../state/gameStore'
import { GrowIn, Label, LegoTree, Plastic } from './primitives'

/** A dirt mound the player can tap to plant a tree */
function Spot({ spot }: { spot: SaplingSpot }) {
  const sprout = useRef<Group>(null)
  const [hover, setHover] = useState(false)
  const plantTree = useGame((s) => s.plantTree)
  const dilemmaOpen = useGame((s) => !!s.dilemma)

  useFrame(({ clock }) => {
    if (sprout.current) sprout.current.rotation.z = Math.sin(clock.elapsedTime * 2 + spot.x) * 0.15
  })

  if (spot.planted)
    return (
      <GrowIn position={[spot.x, 0, spot.z]}>
        <LegoTree position={[0, 0, 0]} scale={0.8} tone={Math.abs(Math.round(spot.x))} />
      </GrowIn>
    )

  return (
    <group
      position={[spot.x, 0, spot.z]}
      scale={hover ? 1.15 : 1}
      onClick={(e) => {
        e.stopPropagation()
        if (useGame.getState().heldId) return
        plantTree(spot.id)
        document.body.style.cursor = ''
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.75, 0.22, 16]} />
        <Plastic color="#7a4a24" roughness={0.9} />
      </mesh>
      <group ref={sprout} position={[0, 0.2, 0]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.36, 6]} />
          <Plastic color="#3cb043" />
        </mesh>
        {[-1, 1].map((d) => (
          <mesh key={d} position={[d * 0.1, 0.34, 0]} rotation={[0, 0, d * -0.7]} scale={[1, 0.35, 0.6]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <Plastic color="#4ade80" />
          </mesh>
        ))}
      </group>
      {/* bigger invisible hit area */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.9, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {!dilemmaOpen && (
        <Label position={[0, 1.2, 0]}>
          <div className="animate-[float_2s_ease-in-out_infinite] whitespace-nowrap rounded-full bg-lime-300 px-2 py-0.5 text-xs font-bold text-green-900 shadow-md ring-2 ring-white">
            🌱 Tap to plant
          </div>
        </Label>
      )}
    </group>
  )
}

export function Saplings() {
  const spots = useGame((s) => s.saplings)
  return (
    <group>
      {spots.map((s) => (
        <Spot key={s.id} spot={s} />
      ))}
    </group>
  )
}
