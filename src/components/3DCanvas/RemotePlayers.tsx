import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useGame, type Profile } from '../../state/gameStore'
import { TRASH_BY_ID } from '../../state/gameData'
import { env, remotePlayers } from '../../state/sceneRegistry'
import { SCHOOL_FIELD, groundY, type VehicleKind } from '../../state/world'
import { Label } from './primitives'
import { VehicleMesh } from './Vehicles'
import { leadTurn } from '../../utils/headTurn'
import { RemotePet } from './Animals'
import { useVoice } from '../../net/voice'
import { Minifig, SpeechBubble, type MinifigAnim } from './NPCs'
import { TrashShape } from './TrashItems'
import { emitPuff } from './Weather'

/** Another real player (another browser tab), smoothly interpolated */
function RemotePlayer({ id, profile }: { id: string; profile: Profile }) {
  const group = useRef<Group>(null)
  const anim = useRef<MinifigAnim>({ speed: 0 })
  const pos = useRef<{ x: number; z: number; h: number } | null>(null)
  const puffT = useRef(0)
  const [carry, setCarry] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState<VehicleKind | null>(null)
  const [bandana, setBandana] = useState<'red' | 'blue' | null>(null)
  const odo = useRef(0)
  const turnS = useRef({ head: 0 })
  const jumpY = useRef(0)
  const body = useRef<Group>(null)
  const vehRef = useRef<Group>(null)
  const nearby = useGame((s) => s.nearbyMate === id)
  const talking = useVoice((v) => !!v.speaking[id])

  useFrame((_, rawDt) => {
    const g = group.current
    const r = remotePlayers.get(id)
    if (!g) return
    g.visible = !!r
    if (!r) return
    const dt = Math.min(rawDt, 0.05)
    if (!pos.current) pos.current = { x: r.x, z: r.z, h: r.heading }
    const p = pos.current
    const k = 1 - Math.exp(-dt * 12)
    const ox = p.x
    const oz = p.z
    p.x += (r.x - p.x) * k
    p.z += (r.z - p.z) * k
    odo.current += Math.hypot(p.x - ox, p.z - oz)
    if (r.vehicle) {
      let dh = r.heading - p.h
      dh = Math.atan2(Math.sin(dh), Math.cos(dh))
      p.h += dh * k
      turnS.current.head *= 0.8
      anim.current.headYaw = undefined
    } else {
      // same head-first turn as your own character
      p.h = leadTurn(turnS.current, p.h, r.heading, dt, 12)
      anim.current.headYaw = turnS.current.head
    }
    // jump height arrives 10×/s, so ease towards it quickly (and drop faster than it rises)
    const prevJ = jumpY.current
    jumpY.current += ((r.jump ?? 0) - jumpY.current) * (1 - Math.exp(-dt * 22))
    anim.current.jumpVy = (jumpY.current - prevJ) / Math.max(dt, 1e-3)
    g.position.set(p.x, 0.06 + groundY(p.x, p.z) + jumpY.current, p.z)
    g.rotation.y = p.h
    anim.current.speed += ((r.moving ? (r.running ? 1.6 : 1) : 0) - anim.current.speed) * Math.min(1, dt * 10)
    anim.current.armsUp = !!r.carry && !r.vehicle
    anim.current.ride = !!r.vehicle
    anim.current.rideKind = r.vehicle ?? undefined
    // the gesture they are playing (watering, planting, kicking…)
    anim.current.act = r.act ? { kind: r.act.kind, p: r.act.p } : null
    anim.current.jump = Math.min(1, jumpY.current / 0.7)
    if (r.carry !== carry) setCarry(r.carry)
    if (r.vehicle !== vehicle) setVehicle(r.vehicle)
    if (body.current) body.current.position.y = r.vehicle === 'bike' ? 0.34 : r.vehicle === 'scooter' ? 0.08 : r.vehicle === 'board' ? 0.05 : 0
    const onPitch = p.x >= SCHOOL_FIELD.x0 && p.x <= SCHOOL_FIELD.x1 && p.z >= SCHOOL_FIELD.z0 && p.z <= SCHOOL_FIELD.z1
    const curBandana = onPitch ? (p.z < -3.2 ? 'red' : 'blue') : null
    if (curBandana !== bandana) setBandana(curBandana)
    puffT.current += dt
    if (r.running && puffT.current > 0.14) {
      puffT.current = 0
      emitPuff(p.x, p.z, env.rain > 0.3)
    }
  })

  const type = carry ? TRASH_BY_ID[carry] : null

  return (
    <group ref={group}>
      <group ref={body}>
        <Minifig shirt={profile.shirt} pants={profile.pants} hair={profile.hair} anim={anim} shirt2={profile.shirt2} shirtId={profile.shirtId} pantsId={profile.pantsId} pattern={profile.pattern} shoes={profile.shoes} hat={profile.hat} glasses={profile.glasses} back={profile.back} bandana={bandana} />
      </group>
      {vehicle && (
        <group ref={vehRef}>
          <VehicleMesh kind={vehicle} spin odoRef={odo} />
        </group>
      )}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.6, 6]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      {type && (
        <group position={[0, 0.95, 0.42]} scale={0.8}>
          <TrashShape type={type} />
        </group>
      )}
      <SpeechBubble id={id} y={2.6} />
      <Label position={[0, 2.05, 0]}>
        <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-cyan-300 px-2 text-xs font-bold text-slate-900 shadow ring-2 ring-white">
          {talking ? '🔊' : '🧑'} {profile.name}
          {nearby && <span className="rounded-full bg-indigo-500 px-1 text-[10px] text-white">C 💬</span>}
        </div>
      </Label>
    </group>
  )
}

export function RemotePlayers() {
  const remotes = useGame((s) => s.remotes)
  return (
    <group>
      {Object.entries(remotes).map(([id, profile]) => (
        <group key={id}>
          <RemotePlayer id={id} profile={profile} />
          <RemotePet id={id} />
        </group>
      ))}
    </group>
  )
}
