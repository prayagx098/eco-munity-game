import { Block } from './primitives'
import { Pond, River } from './Nature'
import { BRIDGE, PATHS, RIVER, ROADS_EW, ROAD_X, WORLD_HALF } from '../../state/world'

const GRASS = '#7ccf4a'
const PAVING = '#d9d5dc'
const SAND = '#f2dc9b'
const SIZE = WORLD_HALF * 2 + 2

/** Grass, road, river, pond, bridges, paths and the low town wall */
export function Ground() {
  const lanes = Array.from({ length: Math.ceil((WORLD_HALF * 2) / 3) + 1 }, (_, i) => -WORLD_HALF + i * 3)
  const pillars = Array.from({ length: Math.ceil((WORLD_HALF * 2) / 3) }, (_, i) => -WORLD_HALF + 1 + i * 3).filter((z) => (z < -2 || z > 2) && z < RIVER.z0 - 1 && ROADS_EW.every((r) => Math.abs(z - r.z) > 3.4))
  // side pavements of the main road stop where the cross roads begin
  const edges = ROADS_EW.flatMap((r) => [r.z - 3.8, r.z + 3.8])
  const sideSegs: [number, number][] = [[-WORLD_HALF - 1, edges[0]], [edges[1], edges[2]], [edges[3], WORLD_HALF + 1]]
  const riverMid = (RIVER.z0 + RIVER.z1) / 2
  const riverW = RIVER.z1 - RIVER.z0

  return (
    <group>
      {/* Main grass slab + darker edge */}
      <Block position={[0, -0.5, 0]} size={[SIZE, 1, SIZE]} color={GRASS} cast={false} roughness={0.9} tex="grass" texScale={5} bump={0.6} />
      <Block position={[0, -1.6, 0]} size={[SIZE + 0.4, 1.2, SIZE + 0.4]} color="#8a5a2b" cast={false} tex="soil" texScale={3} />

      {/* Maple Street pavement */}
      <Block position={[-37, 0.02, 0]} size={[16, 0.04, SIZE]} color="#c9e8a8" cast={false} tex="grass" texScale={5} />
      {sideSegs.flatMap(([a, b]) => [
        <Block key={`w${a}`} position={[-27.2, 0.08, (a + b) / 2]} size={[1.3, 0.16, b - a]} color="#d8d2c8" cast={false} tex="paving" texScale={1.4} />,
        <Block key={`e${a}`} position={[-21, 0.08, (a + b) / 2]} size={[0.9, 0.16, b - a]} color="#d8d2c8" cast={false} tex="paving" texScale={1.4} />,
      ])}

      {/* Road */}
      <Block position={[ROAD_X, 0.05, 0]} size={[5, 0.1, SIZE]} color="#55565e" cast={false} roughness={0.95} tex="asphalt" texScale={3} bump={0.8} />
      {lanes.filter((z) => ROADS_EW.every((r) => Math.abs(z - r.z) > 4.6)).map((z) => (
        <Block key={z} position={[ROAD_X, 0.115, z]} size={[0.18, 0.02, 1.4]} color="#ffffff" cast={false} />
      ))}

      {/* Low wall + railing between road and town */}
      {[
        [-WORLD_HALF, ROADS_EW[0].z - 3.2],
        [ROADS_EW[0].z + 3.2, -2],
        [2, RIVER.z0 - 1.5],
      ].map(([a, b]) => (
        <group key={a}>
          <Block position={[-20.5, 0.3, (a + b) / 2]} size={[0.35, 0.6, b - a]} color="#e8cfa8" tex="brick" texScale={1.2} />
          <Block position={[-20.5, 1.05, (a + b) / 2]} size={[0.08, 0.08, b - a]} color="#222630" />
        </group>
      ))}
      {pillars.map((z) => (
        <Block key={z} position={[-20.5, 0.65, z]} size={[0.7, 1.3, 0.7]} color="#e3c194" tex="brick" texScale={0.9} />
      ))}

      {/* Paths */}
      {PATHS.map((p, i) => (
        <Block
          key={i}
          position={[(p.x0 + p.x1) / 2, 0.04 + (i % 3) * 0.002, (p.z0 + p.z1) / 2]}
          size={[p.x1 - p.x0, 0.08, p.z1 - p.z0]}
          color={p.x0 === 3 && p.z0 === 24.5 ? '#c08a55' : PAVING}
          cast={false}
          tex={p.x0 === 3 && p.z0 === 24.5 ? 'soil' : 'paving'}
          texScale={p.x0 === 3 && p.z0 === 24.5 ? 3 : 1.5}
          bump={0.5}
        />
      ))}

      {/* River with sandy banks */}
      <Block position={[0, 0.03, RIVER.z0 - 0.8]} size={[SIZE, 0.06, 1.6]} color={SAND} cast={false} tex="sand" texScale={3} />
      <Block position={[0, 0.03, RIVER.z1 + 0.8]} size={[SIZE, 0.06, 1.6]} color={SAND} cast={false} tex="sand" texScale={3} />
      <Block position={[0, -0.05, riverMid]} size={[SIZE, 0.1, riverW]} color="#1e6f9f" cast={false} />
      <River />

      {/* Wooden footbridge */}
      <group position={[0, 0, riverMid]}>
        <Block position={[0, 0.25, 0]} size={[BRIDGE.x1 - BRIDGE.x0, 0.2, riverW + 2]} color="#b9773e" tex="wood" texScale={2.4} />
        {Array.from({ length: 9 }, (_, i) => (
          <Block key={i} position={[0, 0.36, -riverW / 2 - 0.6 + i * 0.95]} size={[BRIDGE.x1 - BRIDGE.x0, 0.02, 0.1]} color="#8f5527" cast={false} tex="wood" texScale={1} />
        ))}
        {[BRIDGE.x0 + 0.1, BRIDGE.x1 - 0.1].map((x) => (
          <group key={x}>
            <Block position={[x, 0.85, 0]} size={[0.12, 0.12, riverW + 2]} color="#8f5527" />
            {[-3.5, -1.2, 1.2, 3.5].map((z) => (
              <Block key={z} position={[x, 0.6, z]} size={[0.14, 0.6, 0.14]} color="#8f5527" />
            ))}
          </group>
        ))}
      </group>
      {/* zebra crossing where the villagers cross to Maple Street */}
      {Array.from({ length: 6 }, (_, i) => (
        <Block key={`z${i}`} position={[ROAD_X - 2.25 + i * 0.9, 0.12, 0]} size={[0.5, 0.02, 2.6]} color="#ffffff" cast={false} receive={false} />
      ))}

      {/* Road bridge deck so the water never shows through the tarmac */}
      <Block position={[ROAD_X, 0.12, riverMid]} size={[5.2, 0.26, riverW + 1.6]} color="#55565e" cast={false} roughness={0.95} tex="asphalt" texScale={3} />
      {Array.from({ length: 5 }, (_, i) => (
        <Block key={i} position={[ROAD_X, 0.26, RIVER.z0 - 0.4 + i * 1.7]} size={[0.18, 0.02, 1.0]} color="#ffffff" cast={false} />
      ))}
      {/* Road bridge railings */}
      {[ROAD_X - 2.6, ROAD_X + 2.6].map((x) => (
        <Block key={x} position={[x, 0.45, riverMid]} size={[0.25, 0.8, riverW + 1.5]} color="#cbd5e1" />
      ))}

      {/* Duck pond */}
      <Pond />

      {/* Farm dirt yard */}
      <Block position={[33, 0.03, 20]} size={[10, 0.05, 8]} color="#c9a26b" cast={false} tex="soil" texScale={2} />
    </group>
  )
}
