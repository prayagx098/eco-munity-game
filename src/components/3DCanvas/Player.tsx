import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group } from 'three'
import { useGame, findInteraction } from '../../state/gameStore'
import { TRASH_BY_ID } from '../../state/gameData'
import { act, bodies, dress, emitBurst, env, keys, npcPositions, player, remotePlayers, touchInput, view } from '../../state/sceneRegistry'
import { useSettings } from '../../state/settings'
import { footstepsOn, sfx } from '../../audio/audio'
import { emitPuff } from './Weather'
import { useStory } from '../../state/story'
import { VEHICLES, airborne, collides, groundY, zoneAt } from '../../state/world'
import { Minifig, SpeechBubble, type MinifigAnim } from './NPCs'
import { TrashShape } from './TrashItems'
import { VehicleMesh } from './Vehicles'
import { ITEM_BY_ID } from '../../state/shop'

/** True if stepping to (nx,nz) would push you into an animal or villager (stepping away is always allowed) */
function bodyBlocked(ox: number, oz: number, nx: number, nz: number, rad: number) {
  for (const b of bodies.values()) {
    const rr = (rad + b.r) ** 2
    const dn = (nx - b.x) ** 2 + (nz - b.z) ** 2
    if (dn < rr && dn < (ox - b.x) ** 2 + (oz - b.z) ** 2) return true
  }
  for (const n of npcPositions.values()) {
    const rr = (rad + 0.35) ** 2
    const dn = (nx - n.x) ** 2 + (nz - n.z) ** 2
    if (dn < rr && dn < (ox - n.x) ** 2 + (oz - n.z) ** 2) return true
  }
  return false
}

const WALK = 4.6
const RUN = 7.6
const SQRT1_2 = Math.SQRT1_2

/**
 * The character you control.
 * WASD / arrows move relative to the screen (isometric), Shift runs.
 * Every ~0.1s it also works out what you can interact with.
 */
export function Player() {
  const group = useRef<Group>(null)
  const tv = useRef(0)
  const anim = useRef<MinifigAnim>({ speed: 0 })
  const lastScan = useRef(0)
  const stepT = useRef(0)
  const lastOdo = useRef(0)
  const fxT = useRef(0)
  const stepFx = useRef(0)
  const veh = useRef<Group>(null)
  const vehicle = useRef(player.vehicle)
  const [, setV] = useState(0)
  const profile = useGame((s) => s.profile)
  const carrying = useGame((s) => s.carrying)

  // Physics state: jumping/hopping, bike banking lean, pitch dive & suspension
  const jumpY = useRef(0)
  const jumpVy = useRef(0)
  const isGrounded = useRef(true)
  const squash = useRef(1)
  const lean = useRef(0)
  const pitch = useRef(0)
  const prevSpeed = useRef(0)
  const driftT = useRef(0)
  const steerS = useRef(0)
  const accelS = useRef(0)

  useFrame((_state, rawDt) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(rawDt, 0.05)
    const s = useGame.getState()
    const busy = !!act.kind
    const canMove = s.screen === 'playing' && !s.paused && !s.bigMap && !s.roundComplete && !s.chatWith && !s.shopOpen && !s.goodsCounter && !s.invOpen && !s.binOpen && s.quiz === null && !busy && !useStory.getState().dialog
    const turnTo = (tx: number, tz: number, rate: number) => {
      const diff = Math.atan2(Math.sin(Math.atan2(tx - player.x, tz - player.z) - player.heading), Math.cos(Math.atan2(tx - player.x, tz - player.z) - player.heading))
      player.heading += diff * Math.min(1, dt * rate)
    }

    // --- movement ---
    let ix = 0
    let iy = 0
    if (canMove) {
      if (keys.has('up')) iy += 1
      if (keys.has('down')) iy -= 1
      if (keys.has('left')) ix -= 1
      if (keys.has('right')) ix += 1
      if (touchInput.moveActive) {
        ix += touchInput.moveX
        iy += touchInput.moveY
      }
    }
    const len = Math.hypot(ix, iy)
    const alwaysRun = useSettings.getState().access.alwaysRun
    const prevX = player.x
    const prevZ = player.z

    // --- driving: W accelerates, S brakes / reverses, A and D steer (and only turn while rolling) ---
    if (player.vehicle) {
      const spec = VEHICLES[player.vehicle]
      const gas = canMove ? (keys.has('up') ? 1 : 0) - (keys.has('down') ? 1 : 0) + (touchInput.moveActive ? touchInput.moveY : 0) : 0
      const steerIn = canMove ? THREE.MathUtils.clamp((keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0) + (touchInput.moveActive ? touchInput.moveX : 0), -1, 1) : 0
      // handlebars swing smoothly instead of snapping, which removes the jerk when tapping a key
      steerS.current += (steerIn - steerS.current) * Math.min(1, dt * 9)
      const steer = steerS.current
      const top = keys.has('run') ? spec.run : spec.speed
      const goal = gas > 0 ? top : gas < 0 ? -top * 0.4 : 0
      const rate = gas === 0 ? 5 : gas > 0 && player.vspeed >= 0 ? 6 : 9
      player.vspeed += Math.max(-rate * dt, Math.min(rate * dt, goal - player.vspeed))
      const grip = Math.min(1, Math.abs(player.vspeed) / 2.5)
      const turn = 2.4
      player.heading -= steer * grip * Math.sign(player.vspeed || 1) * turn * dt
      const rad = spec.radius
      const step = player.vspeed * dt
      const px = player.x
      const pz = player.z
      const nx = px + Math.sin(player.heading) * step
      const nz = pz + Math.cos(player.heading) * step
      let moved = false
      if (!collides(nx, pz, rad, px, pz) && !bodyBlocked(px, pz, nx, pz, rad)) (player.x = nx), (moved = true)
      if (!collides(player.x, nz, rad, px, pz) && !bodyBlocked(player.x, pz, player.x, nz, rad)) (player.z = nz), (moved = true)
      if (!moved && Math.abs(player.vspeed) > 0.5) player.vspeed *= Math.max(0, 1 - 6 * dt) // bumped into something
      player.odo += Math.hypot(player.x - px, player.z - pz)
      player.moving = Math.abs(player.vspeed) > 0.4
      player.running = false
      if (view.mode !== 'iso') view.yaw = player.heading

      // Dynamic Bike Physics: roll lean into turns, pitch dive/squat, drift sparks
      const speedRatio = THREE.MathUtils.clamp(player.vspeed / top, -1, 1)
      const targetLean = steer * Math.abs(speedRatio) * 0.45
      lean.current += (targetLean - lean.current) * Math.min(1, dt * 6)

      const accel = (player.vspeed - prevSpeed.current) / Math.max(0.001, dt)
      prevSpeed.current = player.vspeed
      accelS.current += (accel - accelS.current) * Math.min(1, dt * 5) // filtered, so collisions don't snap the nose
      const targetPitch = THREE.MathUtils.clamp(-accelS.current * 0.012, -0.07, 0.1)
      pitch.current += (targetPitch - pitch.current) * Math.min(1, dt * 6)

      const isDrifting = (Math.abs(steer) > 0.55 && Math.abs(player.vspeed) > 4.2) || (gas < 0 && player.vspeed > 3)
      if (isDrifting) {
        driftT.current += dt
        if (driftT.current > 0.08) {
          driftT.current = 0
          emitPuff(player.x - Math.sin(player.heading) * 0.55, player.z - Math.cos(player.heading) * 0.55, false)
        }
      }
    } else {
      lean.current += (0 - lean.current) * Math.min(1, dt * 12)
      pitch.current += (0 - pitch.current) * Math.min(1, dt * 12)
      prevSpeed.current = 0
    }

    if (len > 0 && !player.vehicle) {
      let dx = 0
      let dz = 0
      if (view.mode === 'iso') {
        // screen → world (camera looks from +x,+z)
        const norm = 1 / len
        const nx = ix * norm
        const ny = iy * norm
        dx = (nx - ny) * SQRT1_2
        dz = (-nx - ny) * SQRT1_2
      } else {
        // behind-you / first person: W S walk where you look, A D turn
        // turning speeds up and slows down smoothly instead of snapping
        tv.current += (ix * 2.3 - tv.current) * Math.min(1, dt * 7)
        view.yaw -= tv.current * dt
        dx = Math.sin(view.yaw) * iy
        dz = Math.cos(view.yaw) * iy
      }

      const isWalking = view.mode === 'iso' ? len > 0.05 : Math.abs(iy) > 0.05 || (touchInput.moveActive && len > 0.05)
      if (isWalking) {
        const wantsRun = (touchInput.moveActive && len > 0.75) || (alwaysRun ? !keys.has('run') : keys.has('run'))
        const base = wantsRun ? RUN : WALK
        const step = base * dt * Math.min(1, Math.max(0.35, len))
        const rad = 0.4
        const nx = player.x + dx * step
        if (!collides(nx, player.z, rad, player.x, player.z) && !bodyBlocked(player.x, player.z, nx, player.z, rad)) player.x = nx
        const nz = player.z + dz * step
        if (!collides(player.x, nz, rad, player.x, player.z) && !bodyBlocked(player.x, player.z, player.x, nz, rad)) player.z = nz
        if (view.mode === 'iso') {
          const target = Math.atan2(dx, dz)
          let diff = target - player.heading
          diff = Math.atan2(Math.sin(diff), Math.cos(diff))
          player.heading += diff * Math.min(1, dt * 14)
        }
      }
    }

    const actualMoved = Math.hypot(player.x - prevX, player.z - prevZ)
    if (!player.vehicle) {
      player.moving = actualMoved > 0.001
      player.running = player.moving && (alwaysRun ? !keys.has('run') : keys.has('run'))
    }
    if (view.mode !== 'iso' && !busy && !s.chatWith && !player.vehicle) {
      // the hero smoothly turns to face where the camera looks
      const diff = Math.atan2(Math.sin(view.yaw - player.heading), Math.cos(view.yaw - player.heading))
      player.heading += diff * Math.min(1, dt * 12)
    }

    // --- interaction sequence: face the target, gesture, apply the result mid-gesture ---
    if (act.kind) {
      act.t += dt
      turnTo(act.tx, act.tz, 16)
      if (view.mode !== 'iso') view.yaw = player.heading
      if (!act.fired && act.t >= act.fireAt) {
        act.fired = true
        act.fire?.()
      }
      anim.current.act = { kind: act.kind, p: Math.min(1, act.t / act.dur) }
      if (act.t >= act.dur) {
        if (!act.fired) act.fire?.()
        act.kind = null
        act.fire = null
        anim.current.act = null
      }
    }

    // while chatting, face the other person
    if (s.chatWith && !busy) {
      const o = npcPositions.get(s.chatWith) ?? remotePlayers.get(s.chatWith)
      if (o) {
        turnTo(o.x, o.z, 10)
        if (view.mode !== 'iso') view.yaw = player.heading
      }
    }
    anim.current.talk = !!s.bubbles['you']
    const speedTarget = player.vehicle ? Math.min(1.2, Math.abs(player.vspeed) / 6) : player.moving ? (player.running ? 1.6 : 1) : 0
    anim.current.speed += (speedTarget - anim.current.speed) * Math.min(1, dt * 10)
    anim.current.armsUp = !!s.carrying && !player.vehicle
    anim.current.ride = !!player.vehicle
    // eco-miles: every stretch you ride earns a little reward
    if (player.odo < lastOdo.current) lastOdo.current = 0
    if (player.vehicle && player.odo - lastOdo.current >= 80) {
      lastOdo.current = player.odo
      s.dispatch({ kind: 'ride' })
    }
    if (vehicle.current !== player.vehicle) {
      vehicle.current = player.vehicle
      setV((n) => n + 1)
    }
    if (veh.current) veh.current.visible = !!player.vehicle

    // --- Jumping & Hopping Physics ---
    const wantsJump = keys.has('jump') && canMove && !player.vehicle
    if (wantsJump && isGrounded.current) {
      isGrounded.current = false
      jumpVy.current = 5.8
      jumpY.current = 0.03
      sfx('jump')
      emitPuff(player.x, player.z, false)
      squash.current = 1.18
    }

    if (!isGrounded.current || jumpY.current > 0) {
      const gravity = 17.0
      jumpVy.current -= gravity * dt
      jumpY.current += jumpVy.current * dt
      if (jumpY.current <= 0) {
        jumpY.current = 0
        jumpVy.current = 0
        isGrounded.current = true
        squash.current = 0.82
        emitPuff(player.x, player.z, false)
        if (footstepsOn()) sfx('step')
      }
    }
    squash.current += (1 - squash.current) * Math.min(1, dt * 15)
    anim.current.jump = isGrounded.current ? 0 : Math.min(1, jumpY.current / 0.7)

    airborne.h = player.vehicle ? 0 : jumpY.current
    const gy = groundY(player.x, player.z)
    const seat = player.vehicle === 'bike' ? 0.34 : 0
    const roadBump = 0

    g.position.set(player.x, gy + 0.06 + jumpY.current + (player.vehicle ? roadBump : 0), player.z)
    g.rotation.y = player.heading

    if (veh.current) {
      veh.current.rotation.z = lean.current
      veh.current.rotation.x = pitch.current
    }

    g.children[0].position.y = seat
    if (player.vehicle) {
      g.children[0].rotation.z = lean.current * 0.6
      g.children[0].rotation.x = pitch.current * 0.85
      g.scale.set(1, 1, 1)
    } else {
      g.children[0].rotation.z = 0
      g.children[0].rotation.x = 0
      const sx = 1 / Math.sqrt(squash.current)
      g.scale.set(sx, squash.current, sx)
    }
    // dress-up twirl: spin and hop once with a shower of sparkles
    if (dress.active) {
      dress.t += dt
      const k = Math.min(1, dress.t / 1.0)
      g.rotation.y = player.heading + k * Math.PI * 2 * (1 - (1 - k) * (1 - k) * 0.4)
      g.position.y += Math.sin(Math.PI * k) * 0.45
      if (Math.floor(dress.t * 14) !== Math.floor((dress.t - dt) * 14)) emitBurst({ x: player.x, z: player.z, y: 0.5 + k * 1.2, color: ['#fde047', '#f472b6', '#67e8f9', '#ffffff'][Math.floor(Math.random() * 4)], n: 2, spread: 1.2, size: 0.03 })
      if (k >= 1) dress.active = false
    }
    // outfit effects: glittery auras and light-up footsteps
    {
      const pr = useGame.getState().profile
      const fxOf = (id?: string) => (id ? ITEM_BY_ID[id]?.fx : undefined)
      const sparkly = [pr.shirtId, pr.pantsId, pr.shoes, pr.hat, pr.back].some((id) => fxOf(id) === 'sparkle' || id === 'hat-crown' || id === 'back-wings')
      fxT.current += dt
      if (sparkly && fxT.current > 0.28) {
        fxT.current = 0
        emitBurst({ x: player.x + (Math.random() - 0.5) * 0.6, z: player.z + (Math.random() - 0.5) * 0.6, y: 0.3 + Math.random() * 1.2, color: ['#fde047', '#ffffff', '#f9a8d4', '#a5f3fc'][Math.floor(Math.random() * 4)], n: 1, spread: 0.3, size: 0.022 })
      }
      if (fxOf(pr.shoes) === 'steps' && player.moving && stepFx.current <= 0) {
        stepFx.current = player.running ? 0.18 : 0.28
        emitBurst({ x: player.x - Math.sin(player.heading) * 0.15, z: player.z - Math.cos(player.heading) * 0.15, y: 0.08, color: ITEM_BY_ID[pr.shoes!].color ?? '#22d3ee', n: 3, spread: 0.5, size: 0.03 })
      }
      stepFx.current -= dt
    }
    g.visible = true

    // footsteps + dust / splashes
    if (player.moving) {
      stepT.current += dt
      const every = player.running ? 0.22 : 0.34
      if (stepT.current > every) {
        stepT.current = 0
        if (footstepsOn()) sfx('step')
        if (player.running || env.rain > 0.3) emitPuff(player.x - Math.sin(player.heading) * 0.2, player.z - Math.cos(player.heading) * 0.2, env.rain > 0.3)
      }
    }

    // --- scans (throttled) ---
    lastScan.current += rawDt
    if (lastScan.current < 0.1 || s.screen !== 'playing') return
    lastScan.current = 0

    s.setNearby(findInteraction(s, player.x, player.z))

    let mate: string | null = null
    let best = 3.2
    // real players in other tabs count first
    for (const [id, r] of remotePlayers) {
      if (!s.remotes[id]) continue
      const d = Math.hypot(r.x - player.x, r.z - player.z) - 0.3
      if (d < best) {
        best = d
        mate = id
      }
    }
    s.setNearbyMate(mate)

    if (s.chatWith) {
      const p = npcPositions.get(s.chatWith) ?? remotePlayers.get(s.chatWith)
      if (p && Math.hypot(p.x - player.x, p.z - player.z) > 7) {
        s.closeChat()
        s.pushToast({ kind: 'info', emoji: '👋', title: 'You walked too far away to chat' })
      }
    }

    s.enterZone(zoneAt(player.x, player.z)?.id ?? null)

    for (const c of s.coins) if (Math.hypot(c.x - player.x, c.z - player.z) < 1.1) s.collectCoin(c.id)

  }, -1)

  const carriedType = carrying?.kind === 'trash' ? TRASH_BY_ID[carrying.typeId] : null

  return (
    <group ref={group}>
      <group>
        <Minifig shirt={profile.shirt} pants={profile.pants} hair={profile.hair} anim={anim} shirt2={profile.shirt2} shirtId={profile.shirtId} pantsId={profile.pantsId} pattern={profile.pattern} shoes={profile.shoes} hat={profile.hat} glasses={profile.glasses} back={profile.back} />
      </group>
      <group ref={veh} visible={false}>
        {player.vehicle && <VehicleMesh kind={player.vehicle} spin />}
      </group>
      {carriedType && (
        <group position={[0, 0.95, 0.42]} scale={0.8}>
          <TrashShape type={carriedType} />
        </group>
      )}
      <SpeechBubble id="you" y={2.45} />
    </group>
  )
}
