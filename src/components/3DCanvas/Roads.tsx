import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { JUNCTIONS, LANE_OFF, ROAD_X, ROAD_W, ROADS_EW, WALK_W, WORLD_HALF, lightState } from '../../state/world'
import { Block } from './primitives'

const SIZE = WORLD_HALF * 2 + 2
const HALF = ROAD_W / 2

/** East–west cross roads with kerbs, lane marks, zebra crossings and end-of-road barriers */
export function Roads() {
  return (
    <group>
      {ROADS_EW.map((r) => (
        <CrossRoad key={r.z} z={r.z} />
      ))}
      {JUNCTIONS.map((j, i) => (
        <Junction key={i} x={j.x} z={j.z} />
      ))}
      <TrafficLights />
    </group>
  )
}

function CrossRoad({ z }: { z: number }) {
  const dashes = useMemo(() => {
    const out: number[] = []
    for (let x = -WORLD_HALF + 1; x <= WORLD_HALF - 1; x += 3) if (Math.abs(x - ROAD_X) > HALF + 1.5 && Math.abs(x) > 2.4) out.push(x)
    return out
  }, [])
  // paving strips either side, interrupted by the junction with the main road
  const segs: [number, number][] = [[-WORLD_HALF - 1, ROAD_X - HALF - WALK_W], [ROAD_X + HALF + WALK_W, WORLD_HALF + 1]]
  return (
    <group>
      <Block position={[0, 0.05, z]} size={[SIZE, 0.1, ROAD_W]} color="#55565e" cast={false} roughness={0.95} tex="asphalt" texScale={3} bump={0.8} />
      {dashes.map((x) => (
        <Block key={x} position={[x, 0.115, z]} size={[1.4, 0.02, 0.18]} color="#ffffff" cast={false} />
      ))}
      {[-1, 1].flatMap((sd) =>
        segs.map(([a, b]) => (
          <Block key={`${sd}${a}`} position={[(a + b) / 2, 0.08, z + sd * (HALF + WALK_W / 2)]} size={[b - a, 0.16, WALK_W]} color="#d8d2c8" cast={false} tex="paving" texScale={1.4} />
        )),
      )}
      {/* zebra crossing where the footpath north/south crosses the road */}
      {Array.from({ length: 9 }, (_, i) => (
        <Block key={i} position={[0, 0.12, z - 3.6 + i * 0.9]} size={[2.8, 0.02, 0.5]} color="#ffffff" cast={false} receive={false} />
      ))}
      {/* barriers where the road leaves the town */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (WORLD_HALF - 1.4), 0, z]} rotation={[0, Math.PI / 2, 0]}>
          {[-HALF, HALF].map((x) => (
            <Block key={x} position={[x, 0.45, 0]} size={[0.2, 0.9, 0.2]} color="#334155" />
          ))}
        </group>
      ))}
    </group>
  )
}

/** The square where a cross road meets the main road, with stop lines */
function Junction({ x, z }: { x: number; z: number }) {
  const w = ROAD_W
  const sl = HALF + 0.15
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, 0.055, 0]} size={[w, 0.11, w + 0.4]} color="#55565e" cast={false} roughness={0.95} tex="asphalt" texScale={3} bump={0.8} />
      {/* paved corners where the footpaths meet */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <Block key={`${sx}${sz}`} position={[sx * (HALF + WALK_W / 2), 0.08, sz * (HALF + WALK_W / 2)]} size={[WALK_W, 0.16, WALK_W]} color="#d8d2c8" cast={false} tex="paving" texScale={1.4} />
      )))}
      {/* stop lines: one per approaching lane */}
      <Block position={[-LANE_OFF, 0.125, -sl]} size={[LANE_OFF * 1.8, 0.02, 0.3]} color="#ffffff" cast={false} />
      <Block position={[LANE_OFF, 0.125, sl]} size={[LANE_OFF * 1.8, 0.02, 0.3]} color="#ffffff" cast={false} />
      <Block position={[-sl, 0.125, LANE_OFF]} size={[0.3, 0.02, LANE_OFF * 1.8]} color="#ffffff" cast={false} />
      <Block position={[sl, 0.125, -LANE_OFF]} size={[0.3, 0.02, LANE_OFF * 1.8]} color="#ffffff" cast={false} />
    </group>
  )
}

/** pole stands on the footpath corner; the arm reaches out over the lane it serves */
const POLE = HALF + WALK_W / 2 + 0.1
const ARM = POLE - LANE_OFF
const COLORS: [string, string][] = [
  ['#ef4444', '#7f1d1d'],
  ['#facc15', '#78590a'],
  ['#22c55e', '#14532d'],
]

/** Traffic lights on every corner of both junctions; the colours follow the shared clock */
function TrafficLights() {
  const heads = useMemo(
    () =>
      JUNCTIONS.flatMap((j) => [
        { x: j.x + POLE, z: j.z - POLE, rot: Math.PI, axis: 'z' as const },
        { x: j.x - POLE, z: j.z + POLE, rot: 0, axis: 'z' as const },
        { x: j.x - POLE, z: j.z - POLE, rot: -Math.PI / 2, axis: 'x' as const },
        { x: j.x + POLE, z: j.z + POLE, rot: Math.PI / 2, axis: 'x' as const },
      ]),
    [],
  )
  const mats = useRef<THREE.MeshStandardMaterial[][]>(heads.map(() => []))
  useFrame(() => {
    const now = Date.now() / 1000
    const st = { z: lightState('z', now), x: lightState('x', now) }
    heads.forEach((h, i) => {
      const on = st[h.axis]
      ;[0, 1, 2].forEach((k) => {
        const m = mats.current[i][k]
        if (!m) return
        const lit = (k === 0 && on === 'red') || (k === 1 && on === 'yellow') || (k === 2 && on === 'green')
        m.emissiveIntensity = lit ? 2.6 : 0
        m.color.set(lit ? COLORS[k][0] : COLORS[k][1])
        m.emissive.set(COLORS[k][0])
      })
    })
  })
  return (
    <group>
      {heads.map((h, i) => (
        <group key={i} position={[h.x, 0, h.z]} rotation={[0, h.rot, 0]}>
          {/* base, upright pole and the horizontal arm that makes the L */}
          <Block position={[0, 0.1, 0]} size={[0.4, 0.2, 0.4]} color="#475569" />
          <Block position={[0, 2.3, 0]} size={[0.16, 4.6, 0.16]} color="#334155" />
          <Block position={[ARM / 2, 4.55, 0]} size={[ARM + 0.16, 0.14, 0.14]} color="#334155" />
          <Block position={[ARM / 2, 4.2, 0]} size={[0.07, 0.6, 0.07]} color="#475569" rotation={[0, 0, 0]} />
          {/* signal head hangs over the lane */}
          <group position={[ARM, 3.35, 0]}>
            <Block position={[0, 0.72, 0]} size={[0.1, 0.5, 0.1]} color="#334155" />
            <Block position={[0, 0, 0.0]} size={[0.5, 1.35, 0.32]} color="#1f2937" />
            <Block position={[0, 0, 0.17]} size={[0.58, 1.43, 0.04]} color="#facc15" cast={false} />
          {COLORS.map(([c], k) => (
            <mesh key={k} position={[0, 0.42 - k * 0.42, 0.2]}>
              <sphereGeometry args={[0.15, 14, 10]} />
              <meshStandardMaterial
                ref={(m) => {
                  if (m) mats.current[i][k] = m
                }}
                color={c}
                emissive={c}
                emissiveIntensity={0}
              />
            </mesh>
          ))}
          </group>
        </group>
      ))}
    </group>
  )
}
