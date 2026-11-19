import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, MeshStandardMaterial } from 'three'
import { BIN_DEFS } from '../../state/gameData'
import { useGame } from '../../state/gameStore'
import { BIN_CAP, BIN_SLOTS, BIN_STATIONS } from '../../state/world'
import { Label, Near, Plastic } from './primitives'
import { useSettings } from '../../state/settings'
import { binLift } from '../../state/sceneRegistry'

const LETTER = { compost: 'C', recycle: 'R', trash: 'T' } as const

/** Shape symbols on the bin front for colour-blind players */
function BinSymbol({ kind }: { kind: Slot['kind'] }) {
  const white = <Plastic color="#ffffff" />
  if (kind === 'compost')
    return (
      <mesh rotation={[0, 0, 0.6]} scale={[1, 0.55, 0.2]}>
        <sphereGeometry args={[0.28, 10, 8]} />
        {white}
      </mesh>
    )
  if (kind === 'recycle')
    return (
      <mesh>
        <torusGeometry args={[0.24, 0.07, 8, 3]} />
        {white}
      </mesh>
    )
  return (
    <group>
      {[0.785, -0.785].map((r) => (
        <mesh key={r} rotation={[0, 0, r]}>
          <boxGeometry args={[0.55, 0.11, 0.06]} />
          {white}
        </mesh>
      ))}
    </group>
  )
}

type Slot = (typeof BIN_SLOTS)[number]

function Bin({ slot }: { slot: Slot }) {
  const def = BIN_DEFS[slot.kind]
  const colorblind = useSettings((s) => s.access.colorblind)
  const group = useRef<Group>(null)
  const glow = useRef<MeshStandardMaterial>(null)
  const fill = useGame((s) => s.binFill[slot.id] ?? 0)
  const full = fill >= BIN_CAP
  const beacon = useRef<MeshStandardMaterial>(null)

  // Grow + glow + wobble when you're carrying litter and standing at this bin
  const holder = useRef<Group>(null)
  const [lifted, setLifted] = useState(false)
  useFrame((state, dt) => {
    const l = !!binLift[slot.id]
    if (holder.current) holder.current.visible = !l
    if (l !== lifted) setLifted(l)
    const s = useGame.getState()
    const target = s.nearby?.kind === 'bin' && s.nearby.targetId === slot.id
    const carrying = s.carrying?.kind === 'trash'
    if (group.current) {
      const cur = group.current.scale.x
      const next = cur + ((target ? 1.15 : 1) - cur) * Math.min(1, dt * 12)
      group.current.scale.setScalar(next)
      group.current.rotation.z = target && !useSettings.getState().access.reducedMotion ? Math.sin(state.clock.elapsedTime * 14) * 0.03 : 0
    }
    if (glow.current) glow.current.emissiveIntensity = target ? 0.5 : carrying ? 0.12 : 0
    if (beacon.current) beacon.current.emissiveIntensity = full && Math.floor(state.clock.elapsedTime * 3) % 2 ? 2.5 : 0.2
  })

  return (
    <group position={[slot.x, 0, slot.z]}>
      <group ref={holder}>
      <group scale={0.7}>
      <group ref={group} rotation={[0, Math.PI / 4, 0]}>
        <mesh position={[0, 0.75, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.82, 0.68, 1.5, 4, 1]} />
          <meshStandardMaterial ref={glow} color={def.color} emissive={def.color} emissiveIntensity={0} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <cylinderGeometry args={[0.88, 0.88, 0.14, 4, 1]} />
          <Plastic color={def.dark} />
        </mesh>
        <mesh position={[0, 1.63, 0]} rotation={[0, Math.PI / 4, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.03, 4, 1]} />
          <meshStandardMaterial color="#1f2937" roughness={0.9} />
        </mesh>
        {colorblind && (
          <group position={[0, 0.85, 0.56]} rotation={[-0.08, 0, 0]}>
            <BinSymbol kind={slot.kind} />
          </group>
        )}
        {/* fill gauge on the front: one light per item inside */}
        {Array.from({ length: BIN_CAP }, (_, i) => (
          <mesh key={i} position={[0, 0.28 + i * 0.17, 0.62 - i * 0.02]}>
            <boxGeometry args={[0.3, 0.1, 0.05]} />
            <meshStandardMaterial color={i < fill ? (full ? '#ef4444' : '#fde047') : '#1f2937'} emissive={i < fill ? (full ? '#ef4444' : '#fde047') : '#000000'} emissiveIntensity={i < fill ? 0.8 : 0} />
          </mesh>
        ))}
        {/* a full bin overflows and flashes a red beacon */}
        {full && (
          <group position={[0, 1.7, 0]}>
            {[[0.2, 0, 0.1], [-0.25, 0.05, -0.1], [0, 0.18, 0]].map(([x, y, z], i) => (
              <mesh key={i} position={[x, y, z]} castShadow>
                <dodecahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial color={def.color} roughness={0.8} />
              </mesh>
            ))}
            <mesh position={[0, 0.55, 0]}>
              <sphereGeometry args={[0.12, 10, 8]} />
              <meshStandardMaterial ref={beacon} color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
            </mesh>
          </group>
        )}
      </group>
      </group>
      {!lifted && (
      <Near x={slot.x} z={slot.z} r={13}>
        <Label position={[0, 2.05, 0]}>
          <div className="flex animate-[float_2.4s_ease-in-out_infinite] flex-col items-center">
            {full && <div className="mb-1 whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">Full · truck coming 🚛</div>}
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white text-xl shadow-lg" style={{ background: def.color }}>
              {colorblind ? <span className="font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">{LETTER[slot.kind]}</span> : def.emoji}
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[13px] font-bold text-white [text-shadow:0_2px_3px_rgba(0,0,0,0.45)]">{def.label}</div>
          </div>
        </Label>
      </Near>
      )}
      </group>
    </group>
  )
}

export function Bins() {
  return (
    <group>
      {BIN_SLOTS.map((b) => (
        <Bin key={b.id} slot={b} />
      ))}
      {/* concrete pads under each station */}
      {BIN_STATIONS.map((st) => (
        <mesh key={st.id} position={[st.x, 0.06, st.z]} receiveShadow>
          <boxGeometry args={[4.3, 0.08, 1.3]} />
          <meshStandardMaterial color="#cfcbd3" />
        </mesh>
      ))}
    </group>
  )
}
