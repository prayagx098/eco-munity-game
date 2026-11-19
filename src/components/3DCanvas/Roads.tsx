import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { JUNCTIONS, ROAD_X, ROAD_W, ROADS_EW, WORLD_HALF, lightState } from '../../state/world'
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
    for (let x = -WORLD_HALF + 1; x <= WORLD_HALF - 1; x += 3) if (Math.abs(x - ROAD_X) > 5 && Math.abs(x) > 2.4) out.push(x)
    return out
  }, [])
  // paving strips either side, interrupted by the junction with the main road
  const segs: [number, number][] = [[-WORLD_HALF - 1, ROAD_X - 3.7], [ROAD_X + 3.7, WORLD_HALF + 1]]
  return (
    <group>
      <Block position={[0, 0.05, z]} size={[SIZE, 0.1, ROAD_W]} color="#55565e" cast={false} roughness={0.95} tex="asphalt" texScale={3} bump={0.8} />
      {dashes.map((x) => (
        <Block key={x} position={[x, 0.115, z]} size={[1.4, 0.02, 0.18]} color="#ffffff" cast={false} />
      ))}
      {[-1, 1].flatMap((sd) =>
        segs.map(([a, b]) => (
          <Block key={`${sd}${a}`} position={[(a + b) / 2, 0.08, z + sd * (HALF + 0.65)]} size={[b - a, 0.16, 1.3]} color="#d8d2c8" cast={false} tex="paving" texScale={1.4} />
        )),
      )}
      {/* zebra crossing where the footpath north/south crosses the road */}
      {Array.from({ length: 6 }, (_, i) => (
        <Block key={i} position={[0, 0.12, z - 2.25 + i * 0.9]} size={[2.8, 0.02, 0.5]} color="#ffffff" cast={false} receive={false} />
      ))}
      {/* barriers where the road leaves the town */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (WORLD_HALF - 1.4), 0, z]} rotation={[0, Math.PI / 2, 0]}>
          {[-2.4, 2.4].map((x) => (
            <Block key={x} position={[x, 0.45, 0]} size={[0.2, 0.9, 0.2]} color="#334155" />
          ))}
        </group>
      ))}
    </group>
  )
}

/** The square where a cross road meets the main road, with stop lines */
function Junction({ x, z }: { x: number; z: number }) {
  const w = 7.4
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, 0.055, 0]} size={[w, 0.11, w + 0.4]} color="#55565e" cast={false} roughness={0.95} tex="asphalt" texScale={3} bump={0.8} />
      {/* stop lines: one per approaching lane */}
      <Block position={[-1.25, 0.125, -3.9]} size={[2.4, 0.02, 0.3]} color="#ffffff" cast={false} />
      <Block position={[1.25, 0.125, 3.9]} size={[2.4, 0.02, 0.3]} color="#ffffff" cast={false} />
      <Block position={[-3.9, 0.125, 1.25]} size={[0.3, 0.02, 2.4]} color="#ffffff" cast={false} />
      <Block position={[3.9, 0.125, -1.25]} size={[0.3, 0.02, 2.4]} color="#ffffff" cast={false} />
    </group>
  )
}

const POLE = 4.6
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
          <Block position={[0, 1.7, 0]} size={[0.14, 3.4, 0.14]} color="#334155" />
          <Block position={[0, 3.45, 0.1]} size={[0.5, 1.35, 0.32]} color="#1f2937" />
          <Block position={[0, 3.45, 0.27]} size={[0.58, 1.43, 0.04]} color="#facc15" cast={false} />
          {COLORS.map(([c], k) => (
            <mesh key={k} position={[0, 3.9 - k * 0.42, 0.3]}>
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
      ))}
    </group>
  )
}
