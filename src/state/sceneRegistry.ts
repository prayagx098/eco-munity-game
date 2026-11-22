/**
 * Fast-changing, per-frame data that should NOT live in React state
 * (it would re-render every frame). The 3D scene writes here in useFrame;
 * the game logic, HUD, mini-map and multiplayer layer read from it.
 */
import { PLAYER_START, type VehicleKind } from './world'

export interface NpcSnapshot {
  x: number
  z: number
  color: string
  name?: string
  kind: 'villager' | 'static'
}

/** Live NPC positions, keyed by NPC id  */
export const npcPositions = new Map<string, NpcSnapshot>()

/** NPC positions received from the host tab (guests follow these) */
export const hostNpcs = new Map<string, { x: number; z: number }>()

/** The player you control */
export const player = {
  x: PLAYER_START[0],
  z: PLAYER_START[1],
  heading: Math.PI * 0.75,
  moving: false,
  running: false,
  /** eco vehicle you are riding (null when on foot) */
  vehicle: null as null | VehicleKind,
  /** distance covered by the wheels (spins them) */
  odo: 0,
  /** forward speed while riding (negative = reversing) */
  vspeed: 0,
}

/** Bicycle bell ring timestamp and position (causes nearby NPCs to wave or move aside) */
export const lastBellRing = { time: 0, x: 0, z: 0 }

/** Bin reaction states for wobble feedback and green sparkle fireworks */
export const wobbleBinState = { slotId: null as string | null, time: 0 }
export const binSparkleState = { slotId: null as string | null, time: 0 }

/** Dog fetch stick physics & animation state */
export const fetchStick = {
  active: false,
  x: 0,
  y: 0,
  z: 0,
  targetX: 0,
  targetZ: 0,
  state: 'idle' as 'idle' | 'flying' | 'on_ground' | 'returning',
  progress: 0,
}

/** Duck feeding seed locations on pond surface */
export const duckFeeds: Array<{ id: number; x: number; z: number; time: number }> = []

/** The school football (position, velocity, height) */
export const ball = { x: -11, z: 19.5, y: 0.22, vx: 0, vz: 0, vy: 0, lastGoal: 0 }
/** which depots currently have a truck unloading (the buildings react to it) */
/** bins currently lifted by a truck's crane (the station hides them while the truck holds them) */
export const binLift: Record<string, boolean> = {}
export const depot = { recycle: false, compost: false, trash: false }
/** Solid bodies of animals (and other things that move) so you cannot walk through them */
export const bodies = new Map<string, { x: number; z: number; r: number }>()

/** Live companion position and waiting status (so interaction distance and bike logic know where pet is) */
export const companionPos = { x: 0, z: 0, waiting: false, heading: 0, moving: false }

/** the football as the host last reported it (other players glide the ball towards this) */
export const ballNet = { x: 0, z: 0, y: 0.22, vx: 0, vz: 0, vy: 0, at: 0 }

/** the little twirl + sparkle shown when you put something on in the shop */
export const dress = { active: false, t: 0 }


/** Other real players (other tabs) – target positions for smooth interpolation */
export interface RemoteSnapshot {
  x: number
  z: number
  heading: number
  moving: boolean
  running: boolean
  carry: string | null // trash type id, 'pet', or null
  vehicle: VehicleKind | null
  /** height above the ground while jumping */
  jump: number
  /** the gesture they are playing right now (watering, planting…) and how far through it they are */
  act?: { kind: string; p: number } | null
  /** they joined voice chat */
  voice?: boolean
  /** their companion pet, so everybody sees it */
  pet?: { kind: 'dog' | 'cat' | 'duck'; name: string; x: number; z: number; h: number; moving: boolean; waiting: boolean } | null
  seen: number
}
export const remotePlayers = new Map<string, RemoteSnapshot>()

/** Keys currently held down (keyboard + on-screen touch pad) */
export const keys = new Set<string>()

/** Dual analog virtual joysticks for mobile touch screens */
export const touchInput = {
  moveX: 0, // -1 (left) to 1 (right)
  moveY: 0, // -1 (down/back) to 1 (up/forward)
  moveActive: false,
  lookX: 0, // delta X
  lookY: 0, // delta Y
  lookActive: false,
}

/** Camera zoom (orthographic), changed by the mouse wheel and +/- buttons */
export type ViewMode = 'iso' | 'third'
export const view = {
  zoom: 62,
  minZoom: 30,
  maxZoom: 120,
  /** camera style: isometric overview or behind-the-back */
  mode: 'iso' as ViewMode,
  /** direction you face in the behind-you view (radians, same convention as player.heading) */
  yaw: Math.PI * 0.75,
  pitch: 0.3,
}

/** The action the player is performing right now (turn → gesture → effect), see Player.tsx */
export const act = {
  kind: null as string | null,
  t: 0,
  dur: 0.9,
  fireAt: 0.4,
  tx: 0,
  tz: 0,
  fired: false,
  fire: null as (() => void) | null,
}

/** Little particle bursts (grain, splashes, sparkles) drawn by Effects.tsx */
export interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  max: number
  color: string
  size: number
}
export const particles: Particle[] = []

export function emitBurst(o: { x: number; y?: number; z: number; to?: [number, number]; color: string; n?: number; spread?: number; size?: number }) {
  const n = o.n ?? 10
  const y0 = o.y ?? 0.8
  for (let i = 0; i < n; i++) {
    let vx: number, vy: number, vz: number, life: number
    if (o.to) {
      const T = 0.4 + Math.random() * 0.15
      vx = (o.to[0] - o.x) / T + (Math.random() - 0.5) * 0.8
      vz = (o.to[1] - o.z) / T + (Math.random() - 0.5) * 0.8
      vy = (0.45 - y0 + 4.5 * T * T) / T
      life = T + 0.5
    } else {
      const a = Math.random() * Math.PI * 2
      const sp = (o.spread ?? 1.6) * (0.4 + Math.random() * 0.6)
      vx = Math.cos(a) * sp
      vz = Math.sin(a) * sp
      vy = 2 + Math.random() * 2.2
      life = 0.7 + Math.random() * 0.4
    }
    if (particles.length < 160) particles.push({ x: o.x, y: y0, z: o.z, vx, vy, vz, life, max: life, color: o.color, size: o.size ?? 0.09 })
  }
}

/** Smoothed environment values the 3D scene animates with */
export const env = {
  wind: 0.2, // 0 calm … 1 stormy
  windDir: 0.6, // radians, direction the wind blows towards
  rain: 0, // 0..1 intensity
  flash: 0, // lightning flash, decays to 0
  night: 0, // 0 day … 1 night
}

export const distToPlayer = (x: number, z: number) => Math.hypot(x - player.x, z - player.z)
