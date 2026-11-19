import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group } from 'three'
import { useGame } from '../../state/gameStore'
import { ball, emitBurst, player } from '../../state/sceneRegistry'
import { FOOTBALL_SPOT, GOALS, SCHOOL_BUILDING, SCHOOL_E, SCHOOL_FIELD, SCHOOL_GATE, SCHOOL_INNER, SCHOOL_S, SCHOOL_W, SCHOOL_WALLS, collides, type Rect } from '../../state/world'
import { Block, Label, Near, Sign3D, sharedMaterials } from './primitives'

const BRICK = '#f3d9a4'
const ROOF = '#2563eb'

const mid = (r: Rect): [number, number, number, number] => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0, r.z1 - r.z0]

function Pitch() {
  const f = SCHOOL_FIELD
  const [cx, cz, w, d] = mid(f)
  const stripes = 6
  const white = '#f8fafc'
  const line = (x: number, z: number, lw: number, ld: number, key: string) => <Block key={key} position={[x, 0.075, z]} size={[lw, 0.02, ld]} color={white} cast={false} receive={false} />
  const ins = 0.55
  return (
    <group>
      <Block position={[cx, 0.03, cz]} size={[w, 0.06, d]} color="#3fa83a" cast={false} tex="grass" texScale={3} />
      {Array.from({ length: stripes }, (_, i) =>
        i % 2 ? null : <Block key={i} position={[cx, 0.062, f.z0 + ((i + 0.5) * d) / stripes]} size={[w, 0.02, d / stripes]} color="#58c14a" cast={false} receive={false} tex="grass" texScale={3} />,
      )}
      {/* touch lines, goal lines, halfway line */}
      {line(cx, f.z0 + ins, w - 2 * ins, 0.1, 'n')}
      {line(cx, f.z1 - ins, w - 2 * ins, 0.1, 's')}
      {line(f.x0 + ins, cz, 0.1, d - 2 * ins, 'w')}
      {line(f.x1 - ins, cz, 0.1, d - 2 * ins, 'e')}
      {line(cx, FOOTBALL_SPOT[1], w - 2 * ins, 0.1, 'mid')}
      <mesh position={[cx, 0.08, FOOTBALL_SPOT[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.6, 40]} />
        <meshBasicMaterial color={white} />
      </mesh>
      {/* penalty boxes */}
      {[f.z0 + ins, f.z1 - ins].map((gz, i) => {
        const dir = i === 0 ? 1 : -1
        const bz = gz + dir * 2.4
        return (
          <group key={i}>
            {line(cx, bz, 5.2, 0.1, `b${i}`)}
            {line(cx - 2.6, (gz + bz) / 2, 0.1, 2.4, `l${i}`)}
            {line(cx + 2.6, (gz + bz) / 2, 0.1, 2.4, `r${i}`)}
          </group>
        )
      })}
    </group>
  )
}

function Goal({ z, dir }: { z: number; dir: 1 | -1 }) {
  const g = GOALS[0]
  const w = g.x1 - g.x0
  const cx = (g.x0 + g.x1) / 2
  const depth = 0.8
  return (
    <group position={[cx, 0, z]}>
      {[-w / 2, w / 2].map((x) => (
        <Block key={x} position={[x, 0.8, 0]} size={[0.1, 1.6, 0.1]} color="#f8fafc" />
      ))}
      <Block position={[0, 1.6, 0]} size={[w + 0.1, 0.1, 0.1]} color="#f8fafc" />
      {[-w / 2, w / 2].map((x) => (
        <Block key={`b${x}`} position={[x, 0.8, dir * depth]} size={[0.05, 1.6, 0.05]} color="#e2e8f0" cast={false} />
      ))}
      {/* net */}
      <mesh position={[0, 0.8, dir * depth]}>
        <planeGeometry args={[w, 1.6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      {[-w / 2, w / 2].map((x) => (
        <mesh key={`s${x}`} position={[x, 0.8, (dir * depth) / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[depth, 1.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 1.6, (dir * depth) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, depth]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Stepped spectator stand with coloured seats; `face` is the side the seats look towards (+1 = east) */
function Stand({ rect, face }: { rect: Rect; face: 1 | -1 }) {
  const [cx, cz, w, d] = mid(rect)
  const seat = ['#ef4444', '#3b82f6', '#facc15']
  return (
    <group position={[cx, 0, cz]}>
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <Block position={[face * (i - 1) * (w / 3), 0.4 + i * 0.5, 0]} size={[w / 3, 0.8 + i * 1.0, d]} color="#cbd5e1" tex="brick" texScale={1.4} />
          <Block position={[face * (i - 1) * (w / 3), 0.85 + i * 1.0, 0]} size={[w / 3 - 0.1, 0.12, d - 0.4]} color={seat[i]} cast={false} />
        </group>
      ))}
    </group>
  )
}

function Clubhouse({ rect }: { rect: Rect }) {
  const [cx, cz, w, d] = mid(rect)
  return (
    <group position={[cx, 0, cz]}>
      <Block position={[0, 1.3, 0]} size={[w, 2.6, d]} color={BRICK} tex="brick" texScale={1.6} />
      <Block position={[0, 2.75, 0]} size={[w + 0.4, 0.3, d + 0.4]} color="#15803d" tex="roof" texScale={2} />
      {[-5, -1.5, 1.5, 5].map((x) => (
        <Block key={x} position={[x, 1.5, -d / 2 - 0.02]} size={[1.5, 0.9, 0.08]} material={sharedMaterials.windowGlow} color="" />
      ))}
    </group>
  )
}

function FootballScoreboard() {
  const match = useGame((s) => s.footballMatch)
  const red = match?.red ?? 0
  const blue = match?.blue ?? 0
  const cx = -46.5
  const cz = 10.9
  return (
    <group position={[cx, 3.4, cz]} rotation={[0, Math.PI, 0]}>
      <Block position={[0, 0, 0]} size={[4.8, 1.5, 0.2]} color="#090d16" />
      <Block position={[0, 0, 0.1]} size={[4.5, 1.25, 0.04]} color="#030712" />
      <Block position={[0, 0.72, 0.05]} size={[4.8, 0.12, 0.22]} color="#eab308" />
      <Label position={[0, 0, 0.16]}>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-amber-400 bg-slate-950/95 px-4 py-1.5 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
          <div className="text-[10px] font-black tracking-widest text-amber-400">⚽ CLASSROOM DERBY ⚽</div>
          <div className="flex items-center gap-3 font-mono text-base font-black">
            <span className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]">RED {red}</span>
            <span className="text-slate-500">:</span>
            <span className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.9)]">{blue} BLUE</span>
          </div>
        </div>
      </Label>
    </group>
  )
}

/** The old school lot is now a public sports ground: stands, a clubhouse, a walkway around the pitch and one gate */
export function SportsGround() {
  const G = SCHOOL_GATE
  const gx = G.x
  const I = SCHOOL_INNER
  return (
    <group>
      {/* spectator stands on the west and east sides, a clubhouse on the south side */}
      <Stand rect={SCHOOL_W} face={1} />
      <Stand rect={SCHOOL_E} face={-1} />
      <Clubhouse rect={SCHOOL_S} />
      {/* north wall with the single gate */}
      {SCHOOL_WALLS.map(({ x0: a, x1: b }) => (
        <group key={a}>
          <Block position={[(a + b) / 2, 0.8, G.z]} size={[b - a, 1.6, 0.6]} color={BRICK} tex="brick" texScale={1.2} />
          <Block position={[(a + b) / 2, 1.7, G.z]} size={[b - a + 0.1, 0.2, 0.75]} color="#b45309" />
        </group>
      ))}
      {[gx - G.w / 2, gx + G.w / 2].map((x) => (
        <Block key={x} position={[x, 1.4, G.z]} size={[0.5, 2.8, 0.7]} color="#e7c98e" tex="brick" texScale={1} />
      ))}
      <Block position={[gx, 3.05, G.z]} size={[G.w + 0.9, 0.35, 0.8]} color="#1d4ed8" />
      <Block position={[gx, 3.75, G.z]} size={[G.w + 2.4, 1.0, 0.18]} color="#1e3a8a" />
      <Sign3D text="⚽ SPORTS GROUND" position={[gx, 3.75, G.z - 0.12]} rotation={[0, Math.PI, 0]} width={G.w + 2.2} height={0.85} bg="#1e3a8a" border="#fbbf24" />

      {/* benches and planters along the walkway */}
      {[-9, 2].map((z) => (
        <group key={z} position={[I.x0 + 0.6, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <Block position={[0, 0.35, 0]} size={[1.6, 0.1, 0.5]} color="#c0703a" tex="wood" texScale={1.2} />
          <Block position={[0, 0.65, -0.22]} size={[1.6, 0.4, 0.08]} color="#c0703a" tex="wood" texScale={1.2} />
          {[-0.65, 0.65].map((x) => (
            <Block key={x} position={[x, 0.17, 0]} size={[0.1, 0.34, 0.45]} color="#2a2e38" />
          ))}
        </group>
      ))}
      {[
        [I.x0 + 0.8, I.z0 + 0.8],
        [I.x1 - 0.8, I.z0 + 0.8],
        [I.x0 + 0.8, I.z1 - 0.8],
        [I.x1 - 0.8, I.z1 - 0.8],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Block position={[0, 0.25, 0]} size={[0.8, 0.5, 0.8]} color="#a4643a" tex="wood" texScale={1} />
          <Block position={[0, 0.8, 0]} size={[0.6, 0.6, 0.6]} color="#3fa63a" tex="grass" texScale={0.8} />
        </group>
      ))}

      <Pitch />
      <Goal z={SCHOOL_FIELD.z0 + 0.6} dir={-1} />
      <Goal z={SCHOOL_FIELD.z1 - 0.6} dir={1} />
      <FootballScoreboard />

      {/* referee whistle stand at sideline */}
      <group position={[-39.5, 0, -3.2]}>
        <Block position={[0, 0.45, 0]} size={[0.15, 0.9, 0.15]} color="#475569" />
        <Block position={[0, 0.95, 0]} size={[0.4, 0.2, 0.3]} color="#f59e0b" />
        <Sign3D text="📢 REFEREE DESK" position={[0, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]} width={1.8} height={0.45} bg="#0f172a" border="#f59e0b" />
      </group>

      {/* flag pole */}
      <group position={[SCHOOL_FIELD.x1 - 0.6, 0, SCHOOL_FIELD.z0 + 1]}>
        <Block position={[0, 2.4, 0]} size={[0.08, 4.8, 0.08]} color="#e2e8f0" />
        <Block position={[0.45, 4.3, 0]} size={[0.9, 0.55, 0.03]} color="#22c55e" />
      </group>
      <Football />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* The football                                                          */
/* ------------------------------------------------------------------ */

function ballTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#fafafa'
  g.fillRect(0, 0, 128, 64)
  g.fillStyle = '#1f2937'
  const pts: [number, number][] = [[10, 14], [42, 10], [74, 16], [106, 12], [26, 40], [58, 44], [90, 40], [122, 46], [64, 6], [64, 58]]
  for (const [x, y] of pts) {
    g.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      g.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8)
    }
    g.closePath()
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A ball you can dribble by walking into it, or kick hard with E. Score between the posts! */
export function Football() {
  const g = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const tex = useMemo(ballTexture, [])
  const st = useRef({ resetAt: 0, outside: 0 })
  const R = 0.24

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const b = ball
    const now = clock.elapsedTime
    if (st.current.resetAt && now > st.current.resetAt) {
      st.current.resetAt = 0
      b.x = FOOTBALL_SPOT[0]
      b.z = FOOTBALL_SPOT[1]
      b.vx = b.vz = b.vy = 0
      b.y = R
    }
    // dribbling: walk into the ball and it rolls ahead of you
    const dx = b.x - player.x
    const dz = b.z - player.z
    const d = Math.hypot(dx, dz) || 0.001
    if (!st.current.resetAt && d < 0.8 && player.moving && !player.vehicle) {
      const push = player.running ? 8 : 5.5
      b.vx = (dx / d) * push
      b.vz = (dz / d) * push
    } else if (d < 0.45) {
      b.x += (dx / d) * (0.45 - d)
      b.z += (dz / d) * (0.45 - d)
    }
    // physics
    const f = Math.exp(-1.5 * dt)
    b.vx *= f
    b.vz *= f
    const ox = b.x
    const oz = b.z
    b.x += b.vx * dt
    b.z += b.vz * dt
    b.vy -= 14 * dt
    b.y += b.vy * dt
    if (b.y < R) {
      b.y = R
      b.vy = Math.abs(b.vy) > 1 ? -b.vy * 0.5 : 0
    }
    const F = SCHOOL_FIELD
    const I = SCHOOL_INNER
    const G = SCHOOL_GATE
    const inside = (x: number, z: number) => x > I.x0 && x < I.x1 && z > I.z0 && z < I.z1
    const inGate = (x: number) => x > G.x - G.w / 2 + R && x < G.x + G.w / 2 - R
    if (inside(ox, oz)) {
      // inside the school: bounce off the buildings (the ball can roll out through the gate)
      if (b.x < I.x0 + R) (b.x = I.x0 + R), (b.vx = Math.abs(b.vx) * 0.7)
      if (b.x > I.x1 - R) (b.x = I.x1 - R), (b.vx = -Math.abs(b.vx) * 0.7)
      if (b.z > I.z1 - R) (b.z = I.z1 - R), (b.vz = -Math.abs(b.vz) * 0.7)
      if (b.z < I.z0 + R && !inGate(b.x)) (b.z = I.z0 + R), (b.vz = Math.abs(b.vz) * 0.7)
    }
    if (!inside(b.x, b.z)) {
      // outside the gate: ordinary world collisions
      if (collides(b.x, oz, R)) (b.x = ox), (b.vx *= -0.6)
      if (collides(b.x, b.z, R)) (b.z = oz), (b.vz *= -0.6)
      st.current.outside += dt
      if (st.current.outside > 14) st.current.resetAt = now
    } else st.current.outside = 0
    // goals!
    const GL = GOALS[0]
    if (!st.current.resetAt && now - b.lastGoal > 2 && b.x > GL.x0 && b.x < GL.x1 && b.y < 1.7 && (b.z < F.z0 + 0.4 || b.z > F.z1 - 0.4) && inside(b.x, b.z)) {
      b.lastGoal = now
      st.current.resetAt = now + 1.8
      const isNorth = b.z < FOOTBALL_SPOT[1]
      const team = isNorth ? 'red' : 'blue'
      const gz = isNorth ? F.z0 + 0.6 : F.z1 - 0.6
      for (const c of ['#facc15', '#ef4444', '#3b82f6', '#22c55e', '#ffffff']) emitBurst({ x: b.x, z: gz, y: 1.2, color: c, n: 8, spread: 2.6, size: 0.08 })
      useGame.getState().dispatch({ kind: 'goal' })
      useGame.getState().scoreFootballGoal(team)
      b.vx = b.vz = 0
    }
    // draw
    if (g.current) g.current.position.set(b.x, b.y, b.z)
    if (spin.current) {
      spin.current.rotation.x += (b.vz * dt) / R
      spin.current.rotation.z -= (b.vx * dt) / R
    }
  })

  return (
    <group ref={g} position={[FOOTBALL_SPOT[0], R, FOOTBALL_SPOT[1]]}>
      <group ref={spin}>
        <mesh castShadow>
          <sphereGeometry args={[R, 16, 12]} />
          <meshStandardMaterial map={tex} roughness={0.5} />
        </mesh>
      </group>
      <Near x={FOOTBALL_SPOT[0]} z={FOOTBALL_SPOT[1]} r={9}>
        <Label position={[0, 0.9, 0]}>
          <div className="whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow">⚽ walk into it or press E to kick</div>
        </Label>
      </Near>
    </group>
  )
}

/** The CYBERSQUARE school: one long building north of the plaza with a central entrance and a flag */
export function School() {
  const R = SCHOOL_BUILDING
  const [cx, cz, w, d] = mid(R)
  const front = d / 2 + 0.02
  const winX = [-7.2, -4.8, 4.8, 7.2]
  return (
    <group position={[cx, 0, cz]}>
      <Block position={[0, 0.12, 0]} size={[w + 0.4, 0.24, d + 0.4]} color="#b45309" tex="brick" texScale={1.2} />
      <Block position={[0, 2.2, 0]} size={[w, 4, d]} color={BRICK} tex="brick" texScale={1.6} />
      <Block position={[0, 4.35, 0]} size={[w + 0.6, 0.3, d + 0.6]} color={ROOF} tex="roof" texScale={2} />
      <Block position={[0, 4.7, 0]} size={[w - 0.6, 0.4, d - 0.6]} color="#1d4ed8" tex="roof" texScale={2} />
      {/* central entrance block */}
      <Block position={[0, 2.9, front + 0.5]} size={[5.2, 5.8, 1.0]} color="#e7c98e" tex="brick" texScale={1.2} />
      <Block position={[0, 5.9, front + 0.5]} size={[5.6, 0.35, 1.3]} color={ROOF} />
      <Block position={[0, 1.35, front + 1.02]} size={[2.4, 2.5, 0.1]} color="#7fc8f8" roughness={0.1} />
      <Block position={[0, 0.2, front + 1.6]} size={[3.4, 0.4, 1.2]} color="#cbd5e1" tex="brick" texScale={1} />
      <Sign3D text="🏫 CYBERSQUARE" position={[0, 4.45, front + 1.06]} width={4.8} height={0.85} bg="#1e3a8a" border="#fbbf24" />
      {/* windows on both long sides */}
      {[1.55, 3.0].flatMap((y) =>
        winX.flatMap((x) => [
          <Block key={`s${x}${y}`} position={[x, y, front]} size={[1.4, 0.9, 0.08]} material={sharedMaterials.windowGlow} color="" />,
          <Block key={`n${x}${y}`} position={[x, y, -front]} size={[1.4, 0.9, 0.08]} material={sharedMaterials.windowGlow} color="" />,
        ]),
      )}
      {/* flag pole */}
      <group position={[w / 2 + 0.8, 0, d / 2 + 0.8]}>
        <Block position={[0, 2.8, 0]} size={[0.08, 5.6, 0.08]} color="#e2e8f0" />
        <Block position={[0.5, 5.1, 0]} size={[1.0, 0.6, 0.03]} color="#22c55e" />
      </group>
      {/* planters either side of the steps */}
      {[-3.6, 3.6].map((x) => (
        <group key={x} position={[x, 0, front + 1.9]}>
          <Block position={[0, 0.25, 0]} size={[1.0, 0.5, 0.8]} color="#a4643a" tex="wood" texScale={1} />
          <Block position={[0, 0.7, 0]} size={[0.8, 0.5, 0.6]} color="#3fa63a" tex="grass" texScale={0.8} />
        </group>
      ))}

      {/* Quiz Bowl Podium Station */}
      <group position={[-6, 0, front + 1.6]}>
        <Block position={[0, 0.45, 0]} size={[1.2, 0.9, 1.0]} color="#1e1b4b" />
        <Block position={[0, 0.95, 0]} size={[1.4, 0.1, 1.2]} color="#4338ca" />
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.18, 0.1, 0.4, 8]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
        </mesh>
        <Sign3D text="🏆 ECO QUIZ BOWL" position={[0, 1.85, 0]} width={2.2} height={0.5} bg="#312e81" border="#fbbf24" />
        <Near x={-6} z={-15.4} r={6}>
          <Label position={[0, 2.3, 0]}>
            <div className="whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-900 shadow">
              🏆 Press E to play Kahoot Quiz!
            </div>
          </Label>
        </Near>
      </group>
    </group>
  )
}
