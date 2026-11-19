import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { bodies, npcPositions, player, remotePlayers } from '../../state/sceneRegistry'
import { STANDS, VEHICLES, ROAD_X, WORLD_HALF, JUNCTIONS, groundY, lightState, type VehicleEntity, type VehicleKind } from '../../state/world'
import { Label, Marker, Near } from './primitives'
import { useGame, isNight } from '../../state/gameStore'

/* ------------------------------------------------------------------ */
/* HIGH-TECH MODERN AUTOMOTIVE WHEEL                                  */
/* ------------------------------------------------------------------ */

export function Wheel({
  r = 0.32,
  w = 0.15,
  spin,
  wheelRef,
  rimColor = '#1e293b',
  hubColor = '#f8fafc',
  caliperColor = '#ef4444',
  isMotorcycle = false,
}: {
  r?: number
  w?: number
  spin?: boolean
  wheelRef?: (g: Group | null) => void
  rimColor?: string
  hubColor?: string
  caliperColor?: string
  isMotorcycle?: boolean
}) {
  return (
    <group>
      {/* Stationary Sport Brake Caliper (mounted at 10 o'clock on the rotor, stays stationary relative to chassis) */}
      <group position={[0, r * 0.42, isMotorcycle ? 0 : r * 0.22]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[r * 0.22, r * 0.36, w * 0.45]} />
          <meshStandardMaterial color={caliperColor} metalness={0.65} roughness={0.25} />
        </mesh>
      </group>

      {/* Rotating Wheel Group (Tire, Rim, Rotor, Spokes, Hub) */}
      <group ref={spin ? wheelRef : undefined}>
        {/* Outer Treaded Rubber Tire */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[r, r, w, 24]} />
          <meshStandardMaterial color="#141417" roughness={0.94} metalness={0.06} />
        </mesh>

        {/* Rounded Tire Sidewall Shoulders */}
        {[-w / 2, w / 2].map((xOffset, i) => (
          <mesh key={i} position={[xOffset, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.94, r * 0.94, 0.012, 24]} />
            <meshStandardMaterial color="#1c1d22" roughness={0.9} metalness={0.05} />
          </mesh>
        ))}

        {/* Deep-Dish Alloy Barrel */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.74, r * 0.74, w + 0.005, 20]} />
          <meshStandardMaterial color={rimColor} metalness={0.88} roughness={0.2} />
        </mesh>

        {/* Machined Outer Rim Lip */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.73, r * 0.73, w + 0.012, 20]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.96} roughness={0.12} />
        </mesh>

        {/* Ventilated Steel Brake Rotor */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.54, r * 0.54, w * 0.35, 18]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.22} />
        </mesh>

        {/* Modern Alloy Spokes (5-Spoke Star Design with diamond-cut faces) */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i * 2 * Math.PI) / 5
          const spokeLen = r * 0.68
          const spokeX = (w + 0.014) / 2
          return (
            <group key={i} rotation={[angle, 0, 0]}>
              {/* Spoke on outer face */}
              <mesh position={[spokeX, spokeLen / 2, 0]}>
                <boxGeometry args={[0.015, spokeLen, r * 0.16]} />
                <meshStandardMaterial color="#f8fafc" metalness={0.92} roughness={0.15} />
              </mesh>
              {/* Dark contrasting spoke backing */}
              <mesh position={[spokeX - 0.01, spokeLen / 2, 0]}>
                <boxGeometry args={[0.018, spokeLen, r * 0.2]} />
                <meshStandardMaterial color={rimColor} metalness={0.85} roughness={0.3} />
              </mesh>
              {/* Spoke on inner face (for open motorcycle wheels) */}
              {isMotorcycle && (
                <mesh position={[-spokeX, spokeLen / 2, 0]}>
                  <boxGeometry args={[0.015, spokeLen, r * 0.16]} />
                  <meshStandardMaterial color="#f8fafc" metalness={0.92} roughness={0.15} />
                </mesh>
              )}
            </group>
          )
        })}

        {/* Center Hubcap & Chrome Lug Nuts */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.22, r * 0.22, w + 0.025, 14]} />
          <meshStandardMaterial color={hubColor} metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Center Emblem */}
        <mesh position={[(w + 0.028) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.1, r * 0.1, 0.005, 12]} />
          <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.6} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* FUTURISTIC SOLAR HYPER-CYCLE (RIDEABLE PLAYER VEHICLE)             */
/* ------------------------------------------------------------------ */

export function VehicleMesh({ kind: _kind, spin = false, odoRef }: { kind: VehicleKind; spin?: boolean; odoRef?: { current: number } }) {
  const wheels = useRef<Group[]>([])
  useFrame(() => {
    if (!spin) return
    const o = odoRef ? odoRef.current : player.odo
    for (const w of wheels.current) if (w) w.rotation.x = o / 0.32
  })
  const setW = (i: number) => (g: Group | null) => {
    if (g) wheels.current[i] = g
  }

  return (
    <group>
      {/* 1. FRONT SUSPENSION & WHEEL */}
      <group position={[0, 0.32, 0.62]}>
        <Wheel r={0.32} w={0.09} spin={spin} wheelRef={setW(0)} rimColor="#0f172a" hubColor="#f8fafc" caliperColor="#06b6d4" isMotorcycle />
      </group>

      {/* Aerodynamic Front Hugger Fender */}
      <mesh position={[0, 0.62, 0.6]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[0.15, 0.035, 0.44]} />
        <meshStandardMaterial color="#0891b2" metalness={0.82} roughness={0.2} />
      </mesh>

      {/* Inverted (USD) Telescopic Fork: Gold Stanchions & Chrome Sliders */}
      {[-0.075, 0.075].map((x) => (
        <group key={x} position={[x, 0.58, 0.56]} rotation={[-0.24, 0, 0]}>
          {/* Upper Gold Anodized Tube */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.28, 12]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.92} roughness={0.18} />
          </mesh>
          {/* Lower Chrome Slider */}
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.24, 12]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.08} />
          </mesh>
        </group>
      ))}

      {/* CNC Billet Triple Clamps */}
      <mesh position={[0, 0.78, 0.51]} rotation={[-0.24, 0, 0]}>
        <boxGeometry args={[0.22, 0.03, 0.08]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.68, 0.54]} rotation={[-0.24, 0, 0]}>
        <boxGeometry args={[0.22, 0.03, 0.08]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* 2. REAR WHEEL & SWINGARM */}
      <group position={[0, 0.32, -0.62]}>
        <Wheel r={0.32} w={0.09} spin={spin} wheelRef={setW(1)} rimColor="#0f172a" hubColor="#f8fafc" caliperColor="#06b6d4" isMotorcycle />
      </group>

      {/* Rear Hugger Fender */}
      <mesh position={[0, 0.62, -0.6]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.15, 0.035, 0.44]} />
        <meshStandardMaterial color="#0891b2" metalness={0.82} roughness={0.2} />
      </mesh>

      {/* Heavy-Duty Rear Swingarm (Asymmetric Box Section) */}
      {[-0.075, 0.075].map((x) => (
        <mesh key={x} position={[x, 0.44, -0.3]} rotation={[0.26, 0, 0]}>
          <boxGeometry args={[0.03, 0.065, 0.64]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Visible Rear Monoshock Coilover Suspension */}
      <group position={[0, 0.54, -0.15]} rotation={[-0.32, 0, 0]}>
        {/* Damper Shaft */}
        <mesh>
          <cylinderGeometry args={[0.016, 0.016, 0.28, 10]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Race-Red Coil Spring */}
        <mesh>
          <cylinderGeometry args={[0.034, 0.034, 0.24, 12]} />
          <meshStandardMaterial color="#ef4444" metalness={0.65} roughness={0.25} />
        </mesh>
      </group>

      {/* 3. HYDROFORMED ALLOY CHASSIS & POWERTRAIN */}
      {/* Twin-spar Upper Main Frame */}
      <mesh position={[0, 0.62, 0.12]}>
        <boxGeometry args={[0.16, 0.12, 0.68]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Lower Down-tube / Cradle */}
      <mesh position={[0, 0.42, 0.18]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.12, 0.08, 0.52]} />
        <meshStandardMaterial color="#0891b2" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* High-Voltage Battery Pack with Horizontal Cooling Fins */}
      <group position={[0, 0.48, 0.02]}>
        <mesh>
          <boxGeometry args={[0.18, 0.24, 0.38]} />
          <meshStandardMaterial color="#022c22" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Horizontal CNC Cooling Slats */}
        {[-0.08, -0.03, 0.03, 0.08].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[0.19, 0.015, 0.36]} />
            <meshStandardMaterial color="#06b6d4" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
        {/* Transparent Neon Energy Window (Pulsing Cyan Core) */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.095, 0, 0]} rotation={[0, side * (Math.PI / 2), 0]}>
            <planeGeometry args={[0.26, 0.14]} />
            <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={2.5} roughness={0.1} />
          </mesh>
        ))}
      </group>

      {/* Mid-Drive Brushless Electric Motor */}
      <mesh position={[0, 0.34, -0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.2, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.15} />
      </mesh>

      {/* 4. INTEGRATED AERODYNAMIC PHOTOVOLTAIC SOLAR COWL */}
      <group position={[0, 0.82, 0.18]} rotation={[-0.14, 0, 0]}>
        {/* Sculpted Solar Fairing Body */}
        <mesh>
          <boxGeometry args={[0.34, 0.045, 0.52]} />
          <meshStandardMaterial color="#0f172a" metalness={0.82} roughness={0.22} />
        </mesh>
        {/* High-Efficiency Monocrystalline Sapphire Solar Array */}
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 0.46]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.08} emissive="#0369a1" emissiveIntensity={0.35} />
        </mesh>
        {/* Ultra-Fine Silver Grid Busbars */}
        <mesh position={[0, 0.028, 0]}>
          <boxGeometry args={[0.01, 0.005, 0.44]} />
          <meshStandardMaterial color="#e0f2fe" metalness={0.95} roughness={0.1} />
        </mesh>
        {[-0.14, 0, 0.14].map((z, i) => (
          <mesh key={i} position={[0, 0.028, z]}>
            <boxGeometry args={[0.28, 0.005, 0.008]} />
            <meshStandardMaterial color="#e0f2fe" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}
        {/* Aerodynamic Solar Winglets */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.19, -0.015, 0]} rotation={[0, 0, s * -0.25]}>
            <boxGeometry args={[0.08, 0.02, 0.4]} />
            <meshStandardMaterial color="#06b6d4" metalness={0.85} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* 5. COCKPIT, CONTROLS & HEADLIGHT */}
      {/* Clip-on Sport Handlebars */}
      <mesh position={[0, 0.92, 0.48]} rotation={[-0.24, 0, 0]}>
        <boxGeometry args={[0.54, 0.035, 0.035]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Ergonomic Cyan Textured Handgrips */}
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} position={[x, 0.92, 0.48]}>
          <boxGeometry args={[0.07, 0.05, 0.05]} />
          <meshStandardMaterial color="#06b6d4" roughness={0.8} />
        </mesh>
      ))}
      {/* Bar-End Aero Mirrors with Amber Indicator Tips */}
      {[-0.29, 0.29].map((x) => (
        <group key={x} position={[x, 0.92, 0.48]}>
          <mesh>
            <boxGeometry args={[0.025, 0.05, 0.07]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.02, 0.02, 0.01]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
          </mesh>
        </group>
      ))}

      {/* Digital Full-Color TFT Cockpit Display */}
      <group position={[0, 0.95, 0.44]} rotation={[-0.5, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.16, 0.025, 0.1]} />
          <meshStandardMaterial color="#090d16" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.13, 0.07]} />
          <meshStandardMaterial color="#052e16" emissive="#22c55e" emissiveIntensity={1.8} roughness={0.1} />
        </mesh>
      </group>

      {/* Laser LED Projector Headlight Blade */}
      <group position={[0, 0.74, 0.6]} rotation={[-0.18, 0, 0]}>
        {/* Headlight Shell */}
        <mesh>
          <boxGeometry args={[0.18, 0.09, 0.14]} />
          <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Razor-thin LED DRL Blade */}
        <mesh position={[0, 0.035, 0.072]}>
          <boxGeometry args={[0.15, 0.015, 0.01]} />
          <meshStandardMaterial color="#ffffff" emissive="#f8fafc" emissiveIntensity={3.8} />
        </mesh>
        {/* Dual Projector Lenses */}
        {[-0.045, 0.045].map((x) => (
          <mesh key={x} position={[x, -0.01, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.015, 14]} />
            <meshStandardMaterial color="#ffffff" emissive="#e0f2fe" emissiveIntensity={3.5} />
          </mesh>
        ))}
      </group>

      {/* 6. CONTOURED SEAT & TAIL BLADE */}
      {/* Molded Solo Sport Seat */}
      <mesh position={[0, 0.74, -0.22]}>
        <boxGeometry args={[0.24, 0.065, 0.32]} />
        <meshStandardMaterial color="#171717" roughness={0.88} />
      </mesh>
      {/* Tapered Aero Tail Cowl */}
      <mesh position={[0, 0.72, -0.42]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.18, 0.06, 0.22]} />
        <meshStandardMaterial color="#0891b2" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Razor-Thin Red OLED Taillight Blade */}
      <mesh position={[0, 0.72, -0.535]}>
        <boxGeometry args={[0.16, 0.025, 0.015]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3.5} />
      </mesh>

      {/* Knurled Machined Aluminum Footpegs */}
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.36, -0.04]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.09, 12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
        </mesh>
      ))}
    </group>
  )
}

/** A vehicle waiting at a stand or parked wherever the last rider left it */
function VehicleItem({ v }: { v: VehicleEntity }) {
  const spec = VEHICLES[v.kind]
  const ref = useRef<Group>(null)
  const near = useGame((s) => s.nearby?.targetId === v.id)
  useEffect(() => () => void bodies.delete(`veh-${v.id}`), [v.id])
  useFrame(({ clock }) => {
    bodies.set(`veh-${v.id}`, { x: v.x, z: v.z, r: 0.55 })
    if (ref.current) ref.current.position.y = near ? 0.05 + Math.sin(clock.elapsedTime * 3) * 0.03 : 0
  })
  return (
    <group position={[v.x, groundY(v.x, v.z), v.z]} rotation={[0, v.rot, 0]}>
      <group ref={ref}>
        <VehicleMesh kind={v.kind} />
      </group>
      <Near x={v.x} z={v.z} r={14}>
        <Label position={[0, 2.1, 0]}>
          <Marker emoji={spec.emoji} text={spec.name} color="bg-cyan-100" />
        </Label>
      </Near>
    </group>
  )
}

/** Pick-up pads (always there) and the vehicles currently standing around */
export function Stands() {
  const vehicles = useGame((s) => s.vehicles)
  return (
    <>
      {STANDS.map((st) => (
        <group key={st.id} position={[st.x, 0, st.z]} rotation={[0, st.rot, 0]}>
          {/* High-tech Induction Charging Pad */}
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[1.6, 0.04, 2.6]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.3, 2.2]} />
            <meshStandardMaterial color="#0e7490" emissive="#06b6d4" emissiveIntensity={0.3} roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      ))}
      {vehicles.map((v) => (
        <VehicleItem key={v.id} v={v} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* NPC TRAFFIC FLEET: REALISTIC MODERN VEHICLES                       */
/* ------------------------------------------------------------------ */

interface CarSpec {
  id: string
  axis: 'z' | 'x'
  road?: number
  lane: 1 | -1
  pos: number
  speed: number
  kind: 'bus' | 'ev' | 'taxi'
  color: string
}

const CARS: CarSpec[] = [
  { id: 'bus', axis: 'z', lane: 1, pos: -40, speed: 4.2, kind: 'bus', color: '#0ea5e9' },
  { id: 'ev1', axis: 'z', lane: -1, pos: 30, speed: 5.2, kind: 'ev', color: '#0284c7' },
  { id: 'taxi', axis: 'z', lane: 1, pos: 10, speed: 5, kind: 'taxi', color: '#facc15' },
  { id: 'ev2', axis: 'z', lane: -1, pos: -30, speed: 4.6, kind: 'ev', color: '#10b981' },
  { id: 'n-east', axis: 'x', road: -47, lane: 1, pos: -50, speed: 5, kind: 'ev', color: '#6366f1' },
  { id: 'n-west', axis: 'x', road: -47, lane: -1, pos: 40, speed: 4.4, kind: 'taxi', color: '#facc15' },
  { id: 's-east', axis: 'x', road: 48, lane: 1, pos: -10, speed: 4.6, kind: 'bus', color: '#14b8a6' },
  { id: 's-west', axis: 'x', road: 48, lane: -1, pos: 30, speed: 5.2, kind: 'ev', color: '#059669' },
]

/* ------------------------------------------------------------------ */
/* 1. MODERN ELECTRIC CAR (EV Gran Turismo / Fastback Sedan)         */
/* ------------------------------------------------------------------ */

function ElectricCarBody({
  color,
  len,
  night,
  wheelRef,
}: {
  color: string
  len: number
  night: boolean
  wheelRef: (i: number) => (w: Group | null) => void
}) {
  const w = 1.54
  const bodyH = 0.44

  return (
    <group>
      {/* 1. LOWER GROUND EFFECTS: Front Splitter, Side Aero Skirts, Rear Diffuser */}
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[w - 0.08, 0.1, len + 0.08]} />
        <meshStandardMaterial color="#090d16" metalness={0.4} roughness={0.25} />
      </mesh>
      {/* Front Aerodynamic Chin Splitter */}
      <mesh position={[0, 0.2, len / 2 + 0.08]}>
        <boxGeometry args={[w - 0.12, 0.04, 0.14]} />
        <meshStandardMaterial color="#090d16" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Rear 4-Fin Aero Diffuser */}
      <group position={[0, 0.22, -len / 2 - 0.08]}>
        <mesh>
          <boxGeometry args={[w - 0.12, 0.06, 0.14]} />
          <meshStandardMaterial color="#090d16" metalness={0.5} roughness={0.2} />
        </mesh>
        {[-0.35, -0.12, 0.12, 0.35].map((fx) => (
          <mesh key={fx} position={[fx, -0.02, 0]}>
            <boxGeometry args={[0.02, 0.05, 0.15]} />
            <meshStandardMaterial color="#090d16" metalness={0.6} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* 2. SCULPTED MAIN BODY (High-Gloss Metallic Automotive Clearcoat) */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bodyH, len]} />
        <meshStandardMaterial color={color} metalness={0.82} roughness={0.18} />
      </mesh>

      {/* Sloping Aerodynamic Hood with Sculpted Crease Ridges */}
      <mesh position={[0, 0.65, len * 0.3]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[w - 0.06, 0.12, len * 0.42]} />
        <meshStandardMaterial color={color} metalness={0.82} roughness={0.18} />
      </mesh>

      {/* Rear Decklid with Integrated Ducktail Spoiler */}
      <mesh position={[0, 0.68, -len * 0.34]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[w - 0.06, 0.14, len * 0.34]} />
        <meshStandardMaterial color={color} metalness={0.82} roughness={0.18} />
      </mesh>
      {/* Ducktail Carbon Lip */}
      <mesh position={[0, 0.77, -len / 2 + 0.02]}>
        <boxGeometry args={[w - 0.12, 0.035, 0.1]} />
        <meshStandardMaterial color="#090d16" metalness={0.5} roughness={0.25} />
      </mesh>

      {/* Flared Wheel Arches (Fender Moldings) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* Front Fender Arch */}
          <mesh position={[s * (w / 2 + 0.01), 0.42, len * 0.32]}>
            <boxGeometry args={[0.04, 0.22, 0.78]} />
            <meshStandardMaterial color={color} metalness={0.82} roughness={0.18} />
          </mesh>
          {/* Rear Fender Arch */}
          <mesh position={[s * (w / 2 + 0.01), 0.42, -len * 0.32]}>
            <boxGeometry args={[0.04, 0.22, 0.78]} />
            <meshStandardMaterial color={color} metalness={0.82} roughness={0.18} />
          </mesh>
        </group>
      ))}

      {/* 3. GREENHOUSE: Curved Fastback Canopy, Pillars & Smoked Glass */}
      {/* Central Cabin Shell */}
      <mesh position={[0, 0.98, -0.04]}>
        <boxGeometry args={[w - 0.16, 0.48, len * 0.54]} />
        <meshStandardMaterial color="#090d16" metalness={0.3} roughness={0.3} />
      </mesh>

      {/* Sweeping Windshield (Angled Raked Smoked Glass) */}
      <mesh position={[0, 0.96, len * 0.24]} rotation={[-0.46, 0, 0]}>
        <boxGeometry args={[w - 0.22, 0.46, 0.03]} />
        <meshStandardMaterial color="#020617" metalness={0.92} roughness={0.06} transparent opacity={0.85} emissive={night ? '#ffcf6b' : '#000000'} emissiveIntensity={night ? 0.35 : 0} />
      </mesh>

      {/* Fastback Rear Window */}
      <mesh position={[0, 0.97, -len * 0.3]} rotation={[0.44, 0, 0]}>
        <boxGeometry args={[w - 0.22, 0.45, 0.03]} />
        <meshStandardMaterial color="#020617" metalness={0.92} roughness={0.06} transparent opacity={0.85} emissive={night ? '#ffcf6b' : '#000000'} emissiveIntensity={night ? 0.35 : 0} />
      </mesh>

      {/* Flush Tinted Side Windows with Dark B-Pillar */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 - 0.075), 0.98, -0.04]}>
          <mesh>
            <boxGeometry args={[0.02, 0.36, len * 0.46]} />
            <meshStandardMaterial color="#020617" metalness={0.92} roughness={0.06} transparent opacity={0.85} emissive={night ? '#ffcf6b' : '#000000'} emissiveIntensity={night ? 0.35 : 0} />
          </mesh>
          {/* Gloss Black B-Pillar */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.03, 0.37, 0.08]} />
            <meshStandardMaterial color="#090d16" metalness={0.5} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* CONTINUOUS PANORAMIC ROOFTOP SOLAR GLASS */}
      <group position={[0, 1.23, -0.04]}>
        {/* Frame */}
        <mesh>
          <boxGeometry args={[w - 0.2, 0.025, len * 0.48]} />
          <meshStandardMaterial color="#090d16" metalness={0.5} roughness={0.2} />
        </mesh>
        {/* Deep Sapphire Photovoltaic Cells */}
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.26, len * 0.44]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.08} emissive="#0369a1" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* INTERIOR GLIMPSE: Minimalist Dashboard Screen & Steering Wheel */}
      <group position={[0, 0.78, len * 0.08]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[w - 0.35, 0.08, 0.22]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Glowing Center Infotainment Touchscreen */}
        <mesh position={[0, 0.06, 0.04]} rotation={[-0.3, 0, 0]}>
          <planeGeometry args={[0.24, 0.12]} />
          <meshStandardMaterial color="#0891b2" emissive="#06b6d4" emissiveIntensity={night ? 2.0 : 0.8} />
        </mesh>
        {/* Sport Steering Wheel */}
        <mesh position={[-0.3, 0.08, 0.06]} rotation={[0.4, 0, 0]}>
          <torusGeometry args={[0.09, 0.015, 8, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.6} />
        </mesh>
      </group>

      {/* Flush Pop-Out Door Handles */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {[-0.2, 0.25].map((z, idx) => (
            <mesh key={idx} position={[s * (w / 2 + 0.008), 0.62, z]}>
              <boxGeometry args={[0.01, 0.025, 0.12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Aerodynamic Side Mirrors with Amber LED Turn Signals */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 + 0.11), 0.84, len * 0.18]}>
          {/* Mirror Housing */}
          <mesh>
            <boxGeometry args={[0.15, 0.07, 0.12]} />
            <meshStandardMaterial color={color} metalness={0.82} roughness={0.18} />
          </mesh>
          {/* Aero Stalk */}
          <mesh position={[-s * 0.06, -0.04, 0]}>
            <boxGeometry args={[0.04, 0.05, 0.04]} />
            <meshStandardMaterial color="#090d16" metalness={0.5} roughness={0.2} />
          </mesh>
          {/* Amber LED Signal Strip */}
          <mesh position={[0, 0, 0.062]}>
            <boxGeometry args={[0.12, 0.018, 0.01]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={night ? 3.0 : 1.2} />
          </mesh>
        </group>
      ))}

      {/* 4. LIGHTING & FASCIA */}
      {/* Front Nose: Clean Grille-less Aerodynamic Front with Air Curtains */}
      <mesh position={[0, 0.5, len / 2 + 0.02]}>
        <boxGeometry args={[w - 0.2, 0.16, 0.04]} />
        <meshStandardMaterial color="#090d16" metalness={0.6} roughness={0.25} />
      </mesh>
      {/* Side Air Curtain Scoops */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.1), 0.42, len / 2 + 0.025]}>
          <boxGeometry args={[0.08, 0.14, 0.03]} />
          <meshStandardMaterial color="#090d16" metalness={0.4} roughness={0.3} />
        </mesh>
      ))}

      {/* Full-Width Front Continuous LED Light Blade */}
      <mesh position={[0, 0.62, len / 2 + 0.035]}>
        <boxGeometry args={[w - 0.14, 0.035, 0.02]} />
        <meshStandardMaterial color="#ffffff" emissive="#f8fafc" emissiveIntensity={night ? 3.8 : 1.2} />
      </mesh>

      {/* Dual Projector Headlights with Jewel Lenses */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 - 0.2), 0.56, len / 2 + 0.035]}>
          <mesh>
            <boxGeometry args={[0.2, 0.08, 0.02]} />
            <meshStandardMaterial color="#090d16" metalness={0.8} roughness={0.15} />
          </mesh>
          {/* Dual LED Projector Bulbs */}
          {[-0.05, 0.05].map((bx, i) => (
            <mesh key={i} position={[bx, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.028, 0.028, 0.015, 12]} />
              <meshStandardMaterial color="#ffffff" emissive="#e0f2fe" emissiveIntensity={night ? 4.0 : 1.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* License Plate (Front & Rear) */}
      <mesh position={[0, 0.38, len / 2 + 0.035]}>
        <boxGeometry args={[0.32, 0.08, 0.01]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.44, -len / 2 - 0.03]}>
        <boxGeometry args={[0.32, 0.08, 0.01]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>

      {/* Rear Full-Width 3D OLED Red Taillight Blade */}
      <mesh position={[0, 0.62, -len / 2 - 0.025]}>
        <boxGeometry args={[w - 0.12, 0.045, 0.02]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={night ? 3.6 : 1.2} />
      </mesh>
      {/* Wrapped Corner Tail Blades */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.07), 0.62, -len / 2 + 0.02]}>
          <boxGeometry args={[0.02, 0.045, 0.08]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={night ? 3.6 : 1.2} />
        </mesh>
      ))}

      {/* 5. 4x 19-INCH HIGH-PERFORMANCE ALLOY WHEELS */}
      {[-1, 1].flatMap((s, sIdx) =>
        [len * 0.32, -len * 0.32].map((z, zIdx) => (
          <group key={`${s}${zIdx}`} position={[s * (w / 2 - 0.01), 0.32, z]}>
            <Wheel r={0.3} w={0.16} spin wheelRef={wheelRef(sIdx * 2 + zIdx)} rimColor="#0f172a" hubColor="#f8fafc" caliperColor="#ef4444" />
          </group>
        )),
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 2. MODERN SOLAR TAXI (High-Gloss Yellow EV with Teardrop Aero Pod) */
/* ------------------------------------------------------------------ */

function SolarTaxiBody({
  len,
  night,
  wheelRef,
}: {
  len: number
  night: boolean
  wheelRef: (i: number) => (w: Group | null) => void
}) {
  const w = 1.54
  const taxiYellow = '#facc15'

  return (
    <group>
      {/* Base High-End Modern EV in High-Gloss Taxi Yellow */}
      <ElectricCarBody color={taxiYellow} len={len} night={night} wheelRef={wheelRef} />

      {/* Modern High-Contrast Door Checkerboard Racing Decal */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 + 0.006), 0.46, 0]}>
          {[-0.55, -0.33, -0.11, 0.11, 0.33, 0.55].map((z, idx) => (
            <mesh key={idx} position={[0, 0, z]}>
              <planeGeometry args={[0.11, 0.08]} />
              <meshBasicMaterial color={idx % 2 === 0 ? '#090d16' : '#f8fafc'} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Sleek Aerodynamic Teardrop Roof Taxi Pod */}
      <group position={[0, 1.34, 0.02]}>
        {/* Aerodynamic Mounting Pedestal */}
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.24, 0.04, 0.28]} />
          <meshStandardMaterial color="#090d16" metalness={0.6} roughness={0.2} />
        </mesh>
        {/* Teardrop Pod Body */}
        <mesh>
          <boxGeometry args={[0.48, 0.14, 0.32]} />
          <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={night ? 2.6 : 0.8} roughness={0.2} />
        </mesh>
        {/* Glowing Luminous "TAXI" Badge */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.245, 0, 0]} rotation={[0, s * (Math.PI / 2), 0]}>
            <planeGeometry args={[0.22, 0.08]} />
            <meshBasicMaterial color="#090d16" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 3. MODERN ELECTRIC TRANSIT BUS (Eco-Transit 101 Shuttle)           */
/* ------------------------------------------------------------------ */

function ElectricBusBody({
  color,
  len,
  night,
  wheelRef,
}: {
  color: string
  len: number
  night: boolean
  wheelRef: (i: number) => (w: Group | null) => void
}) {
  const w = 1.95
  const h = 2.05

  return (
    <group>
      {/* 1. LOWER CHASSIS & HEAVY-DUTY BUMPERS */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[w - 0.06, 0.16, len + 0.1]} />
        <meshStandardMaterial color="#090d16" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Front & Rear Wrap-Around Bumpers with Impact Guards */}
      <mesh position={[0, 0.38, len / 2 + 0.08]}>
        <boxGeometry args={[w + 0.02, 0.26, 0.18]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.38, -len / 2 - 0.08]}>
        <boxGeometry args={[w + 0.02, 0.26, 0.18]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.25} />
      </mesh>

      {/* 2. MAIN SCULPTED BUS BODY */}
      <mesh position={[0, 1.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, len]} />
        <meshStandardMaterial color={color} metalness={0.78} roughness={0.22} />
      </mesh>

      {/* 3. FLUSH GLASS GLAZING: Continuous Panoramic Dark Tint Band */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 + 0.008), 1.58, 0]}>
          {/* Continuous Flush Smoked Glass Ribbon */}
          <mesh>
            <boxGeometry args={[0.015, 0.88, len * 0.86]} />
            <meshStandardMaterial color="#020617" metalness={0.92} roughness={0.06} transparent opacity={0.88} emissive={night ? '#ffcf6b' : '#000000'} emissiveIntensity={night ? 0.35 : 0} />
          </mesh>
          {/* Structural Hidden Pillars between window panes */}
          {[-1.6, -0.8, 0, 0.8, 1.6].map((z, idx) => (
            <mesh key={idx} position={[0.005, 0, z]}>
              <boxGeometry args={[0.018, 0.89, 0.06]} />
              <meshStandardMaterial color="#090d16" metalness={0.4} roughness={0.2} />
            </mesh>
          ))}
          {/* Boarding Doors on Right-Hand Side (s === 1) */}
          {s === 1 && (
            <group position={[0, -0.42, 0.85]}>
              <mesh>
                <boxGeometry args={[0.025, 1.48, 0.88]} />
                <meshStandardMaterial color="#090d16" metalness={0.6} roughness={0.2} />
              </mesh>
              {/* Dual Floor-to-Ceiling Door Glass Panes */}
              {[-0.2, 0.2].map((dz) => (
                <mesh key={dz} position={[0.015, 0.1, dz]}>
                  <boxGeometry args={[0.01, 1.05, 0.34]} />
                  <meshStandardMaterial color="#38bdf8" roughness={0.1} transparent opacity={0.7} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      ))}

      {/* 4. CURVED PANORAMIC FRONT WINDSHIELD & DIGITAL DESTINATION MATRIX */}
      {/* Sweeping Wrap-Around Windshield */}
      <mesh position={[0, 1.46, len / 2 + 0.02]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[w - 0.16, 0.98, 0.04]} />
        <meshStandardMaterial color="#020617" metalness={0.92} roughness={0.06} transparent opacity={0.86} emissive={night ? '#ffcf6b' : '#000000'} emissiveIntensity={night ? 0.35 : 0} />
      </mesh>
      {/* Windshield Wipers */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 1.08, len / 2 + 0.05]} rotation={[0, 0, 0.45]}>
          <boxGeometry args={[0.42, 0.02, 0.015]} />
          <meshStandardMaterial color="#090d16" metalness={0.8} />
        </mesh>
      ))}

      {/* High-Resolution Digital Route Marquee */}
      <group position={[0, 2.15, len / 2 + 0.035]} rotation={[-0.08, 0, 0]}>
        <mesh>
          <boxGeometry args={[w - 0.28, 0.26, 0.04]} />
          <meshStandardMaterial color="#022c22" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[w - 0.34, 0.2]} />
          <meshStandardMaterial color="#10b981" emissive="#34d399" emissiveIntensity={night ? 3.5 : 1.8} />
        </mesh>
      </group>

      {/* Front Quad Projector Headlights with Halo DRL Rings */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 - 0.24), 0.62, len / 2 + 0.1]}>
          <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.04, 16]} />
            <meshStandardMaterial color="#ffffff" emissive="#f8fafc" emissiveIntensity={night ? 3.8 : 1.5} />
          </mesh>
          <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 16]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={night ? 3.0 : 1.2} />
          </mesh>
        </group>
      ))}

      {/* 5. AERODYNAMIC ROOFTOP SHROUDS & SOLAR MODULES */}
      {/* Streamlined Full-Length Aero Cowling */}
      <group position={[0, 2.42, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[w - 0.28, 0.28, len * 0.82]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.25} />
        </mesh>
        {/* High-Capacity Photovoltaic Solar Modules */}
        {[-1.2, 0, 1.2].map((z, idx) => (
          <mesh key={idx} position={[0, 0.145, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w - 0.36, 0.95]} />
            <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.08} emissive="#0369a1" emissiveIntensity={0.35} />
          </mesh>
        ))}
      </group>

      {/* 6. REAR STYLING & VERTICAL BLADE LIGHTS */}
      {/* Rear Window */}
      <mesh position={[0, 1.68, -len / 2 - 0.02]}>
        <boxGeometry args={[w - 0.38, 0.68, 0.04]} />
        <meshStandardMaterial color="#020617" metalness={0.92} roughness={0.06} transparent opacity={0.86} emissive={night ? '#ffcf6b' : '#000000'} emissiveIntensity={night ? 0.35 : 0} />
      </mesh>
      {/* Vertical Triple-Tier LED Blade Lights */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 - 0.16), 0.98, -len / 2 - 0.025]}>
          {/* Red Brake Light */}
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.08, 0.2, 0.02]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={night ? 3.6 : 1.2} />
          </mesh>
          {/* Amber Indicator */}
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.08, 0.15, 0.02]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={night ? 3.0 : 1.0} />
          </mesh>
          {/* White Reverse Blade */}
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.08, 0.12, 0.02]} />
            <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={night ? 2.5 : 0.8} />
          </mesh>
        </group>
      ))}

      {/* 7. 6x HEAVY-DUTY COMMERCIAL WHEELS */}
      {[-1, 1].flatMap((s, sIdx) =>
        [len * 0.34, -len * 0.18, -len * 0.36].map((z, zIdx) => (
          <group key={`${s}${zIdx}`} position={[s * (w / 2 - 0.01), 0.36, z]}>
            <Wheel r={0.36} w={0.2} spin wheelRef={wheelRef(sIdx * 3 + zIdx)} rimColor="#0f172a" hubColor="#f8fafc" caliperColor="#0ea5e9" />
          </group>
        )),
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* CAR WRAPPER & TRAFFIC MANAGER                                      */
/* ------------------------------------------------------------------ */

function Car({ c }: { c: CarSpec }) {
  const g = useRef<Group>(null)
  const wheels = useRef<Group[]>([])
  const st = useRef({ p: c.pos, v: c.speed, odo: 0 })
  const alongZ = c.axis === 'z'
  // right-hand traffic: lane offset from road centre line
  const lat = alongZ ? ROAD_X - c.lane * 1.25 : (c.road ?? 0) + c.lane * 1.25
  const len = c.kind === 'bus' ? 5.2 : 2.95
  const bodyKey = `car-${c.id}`

  useEffect(
    () => () => {
      for (let i = 0; i < 3; i++) bodies.delete(`${bodyKey}-${i}`)
    },
    [bodyKey],
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const paused = useGame.getState().paused

    const ahead = (x: number, z: number) => {
      const along = alongZ ? z : x
      const across = alongZ ? x : z
      const d = (along - s.p) * c.lane
      return Math.abs(across - lat) < 2.2 && d > 0 && d < len + 4
    }

    let blocked = false
    if (ahead(player.x, player.z)) blocked = true
    else {
      for (const r of remotePlayers.values()) if (ahead(r.x, r.z)) blocked = true
      if (!blocked) for (const n of npcPositions.values()) if (ahead(n.x, n.z)) blocked = true
      if (!blocked) for (const [k, b] of bodies) if (!k.startsWith('veh-') && !k.startsWith(bodyKey) && ahead(b.x, b.z)) blocked = true
    }

    for (const j of JUNCTIONS) {
      if (!alongZ && j.z !== c.road) continue
      const jp = alongZ ? j.z : j.x
      const toLine = (jp - s.p) * c.lane - 3.6
      if (toLine > -0.2 && toLine < 9) {
        const light = lightState(c.axis)
        if (light === 'red' || (light === 'yellow' && toLine > 2.5)) blocked = true
      }
    }

    const want = blocked || paused ? 0 : c.speed
    s.v += (want - s.v) * Math.min(1, dt * (blocked ? 4 : 1.5))
    s.p += s.v * dt * c.lane
    s.odo += s.v * dt
    const lim = WORLD_HALF - 3.6
    if (s.p > lim) s.p = -lim
    if (s.p < -lim) s.p = lim
    const x = alongZ ? lat : s.p
    const z = alongZ ? s.p : lat
    if (g.current) {
      g.current.position.set(x, 0.06 + groundY(x, z), z)
      g.current.rotation.y = alongZ ? (c.lane > 0 ? 0 : Math.PI) : c.lane > 0 ? Math.PI / 2 : -Math.PI / 2
    }

    const fwdX = alongZ ? 0 : c.lane
    const fwdZ = alongZ ? c.lane : 0
    const cars = len > 3 ? 3 : 2
    for (let i = 0; i < cars; i++) {
      const off = (i - (cars - 1) / 2) * (len / cars)
      bodies.set(`${bodyKey}-${i}`, { x: x + fwdX * off, z: z + fwdZ * off, r: 0.95 })
    }
    for (const w of wheels.current) if (w) w.rotation.x = s.odo / 0.3
  })

  const setW = (i: number) => (w: Group | null) => {
    if (w) wheels.current[i] = w
  }
  const night = useGame((s) => isNight(s.clock))

  return (
    <group ref={g}>
      {c.kind === 'bus' ? (
        <ElectricBusBody color={c.color} len={len} night={night} wheelRef={setW} />
      ) : c.kind === 'taxi' ? (
        <SolarTaxiBody len={len} night={night} wheelRef={setW} />
      ) : (
        <ElectricCarBody color={c.color} len={len} night={night} wheelRef={setW} />
      )}
      <Near getPos={() => (alongZ ? [lat, st.current.p] : [st.current.p, lat])} r={12}>
        <Label position={[0, c.kind === 'bus' ? 3.2 : 2.3, 0]}>
          <div className="whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shadow ring-1 ring-white">
            ⚡ {c.kind === 'bus' ? 'Electric bus' : c.kind === 'taxi' ? 'Solar taxi' : 'Electric car'}
          </div>
        </Label>
      </Near>
    </group>
  )
}

export function Traffic() {
  return (
    <>
      {CARS.map((c) => (
        <Car key={c.id} c={c} />
      ))}
    </>
  )
}
