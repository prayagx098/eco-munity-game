import { LEARNING_ARCH_Z, LEARNING_BOARD, LEARNING_CORNER, LEARNING_FORECOURT } from '../../state/world'
import { Block, Label, Marker, Near, Sign3D } from './primitives'

const WOOD = '#8f5527'
const G = LEARNING_CORNER

/**
 * The Learning Centre: a raised classroom deck under an open pergola, set back from the road.
 * You arrive over a paved forecourt (hedged, with lamps, benches and flower beds), walk under an entrance arch
 * and climb three steps. The back of the deck holds the chalkboard, desks and bookshelf.
 */
export function LearningCentre() {
  const w = G.x1 - G.x0
  const d = G.z1 - G.z0
  const cx = (G.x0 + G.x1) / 2
  const cz = (G.z0 + G.z1) / 2
  const top = 0.4
  const gap = 1.7 // half width of the entrance opening in the front rail
  const postsX = [G.x0 + 0.3, -3.5, 3.5, G.x1 - 0.3]
  return (
    <group>
      {/* deck, stone plinth */}
      <Block position={[cx, 0.05, cz]} size={[w + 0.5, 0.1, d + 0.5]} color="#94a3b8" tex="paving" texScale={1.5} cast={false} />
      <Block position={[cx, 0.25, cz]} size={[w, 0.3, d]} color="#b9773e" tex="wood" texScale={2.2} />

      {/* rails: back, both sides, front in two pieces around the entrance */}
      {[
        [cx, G.z0 + 0.1, w, 0.1],
        [G.x0 + 0.1, cz, 0.1, d],
        [G.x1 - 0.1, cz, 0.1, d],
      ].map(([x, z, sw, sd], i) => (
        <Block key={i} position={[x, top + 0.6, z]} size={[sw, 0.09, sd]} color={WOOD} />
      ))}
      <Block position={[(G.x0 - gap) / 2, top + 0.6, G.z1 - 0.1]} size={[-gap - G.x0, 0.09, 0.1]} color={WOOD} />
      <Block position={[(G.x1 + gap) / 2, top + 0.6, G.z1 - 0.1]} size={[G.x1 - gap, 0.09, 0.1]} color={WOOD} />

      {/* open pergola over the deck: posts, beams and cross slats */}
      {postsX.flatMap((x) => [G.z0 + 0.35, G.z1 - 0.35].map((z) => <Block key={`${x}${z}`} position={[x, top + 1.7, z]} size={[0.22, 3.4, 0.22]} color="#f1f5f9" />))}
      {[G.z0 + 0.35, G.z1 - 0.35].map((z) => (
        <Block key={z} position={[cx, top + 3.45, z]} size={[w - 0.2, 0.22, 0.26]} color="#e2e8f0" />
      ))}
      {Array.from({ length: 12 }, (_, i) => G.x0 + 0.9 + i * ((w - 1.8) / 11)).map((x) => (
        <Block key={x} position={[x, top + 3.62, cz]} size={[0.16, 0.12, d - 0.2]} color="#a3763d" cast={false} />
      ))}

      {/* chalkboard on posts, study desks and a bookshelf */}
      <group position={[cx, top, G.z0 + 0.9]}>
        <Block position={[0, 1.5, 0]} size={[6, 2.2, 0.16]} color="#7a4a24" />
        <Block position={[0, 1.5, 0.09]} size={[5.6, 1.8, 0.04]} color="#14532d" cast={false} />
        <Sign3D text="💡 Today I learned…" position={[0, 2.15, 0.13]} width={3.8} height={0.5} bg="#14532d" border="#bbf7d0" />
        {[-1.9, -0.6, 0.7, 1.9].map((x, k) => (
          <Block key={x} position={[x, 1.15, 0.12]} size={[0.7 + (k % 2) * 0.3, 0.06, 0.02]} color="#f8fafc" cast={false} />
        ))}
        <Block position={[-2.9, 0.6, 0]} size={[0.14, 1.2, 0.14]} color="#7a4a24" />
        <Block position={[2.9, 0.6, 0]} size={[0.14, 1.2, 0.14]} color="#7a4a24" />
      </group>
      {[cz + 0.2, cz + 2.2].flatMap((z) =>
        [-3.6, -1.2, 1.2, 3.6].map((x) => (
          <group key={`${x}${z}`} position={[cx + x, top, z]}>
            <Block position={[0, 0.62, 0]} size={[1.8, 0.1, 0.9]} color="#d9a15b" tex="wood" texScale={1} />
            <Block position={[-0.8, 0.3, 0]} size={[0.1, 0.6, 0.8]} color={WOOD} />
            <Block position={[0.8, 0.3, 0]} size={[0.1, 0.6, 0.8]} color={WOOD} />
            <Block position={[-0.3, 0.7, 0]} size={[0.5, 0.05, 0.36]} color="#38bdf8" cast={false} />
            <Block position={[0.35, 0.7, 0.05]} size={[0.3, 0.12, 0.24]} color="#fb7185" cast={false} />
            <Block position={[0, 0.3, 0.7]} size={[0.5, 0.6, 0.5]} color="#7c3aed" />
          </group>
        )),
      )}
      <group position={[G.x1 - 0.9, top, G.z0 + 3.2]}>
        <Block position={[0, 1.0, 0]} size={[0.5, 2.0, 1.8]} color="#92400e" tex="wood" texScale={1} />
        {[0.4, 0.95, 1.5].map((y, i) => (
          <Block key={y} position={[-0.27, y, 0]} size={[0.06, 0.4, 1.6]} color={['#ef4444', '#3b82f6', '#22c55e'][i]} cast={false} />
        ))}
      </group>

      {/* three entrance steps with handrails, in the opening of the front rail */}
      {[0.13, 0.27, 0.4].map((h, i) => (
        <Block key={i} position={[cx, h / 2, G.z1 + 1.04 - i * 0.42]} size={[gap * 2 + 0.2, h, 0.42]} color="#cbd5e1" tex="paving" texScale={1} />
      ))}
      {[-1, 1].map((sd) => (
        <Block key={sd} position={[cx + sd * (gap + 0.05), 0.75, G.z1 + 0.65]} size={[0.08, 0.9, 1.5]} color={WOOD} />
      ))}

      {/* entrance arch over the path, with a name board on both faces */}
      {[-2.1, 2.1].map((x) => (
        <group key={x} position={[x, 0, LEARNING_ARCH_Z]}>
          <Block position={[0, 0.15, 0]} size={[0.95, 0.3, 0.95]} color="#94a3b8" tex="paving" texScale={1} />
          <Block position={[0, 1.9, 0]} size={[0.7, 3.2, 0.7]} color="#d6a76a" tex="brick" texScale={1.2} />
          <Block position={[0, 3.6, 0]} size={[0.95, 0.2, 0.95]} color="#94a3b8" />
        </group>
      ))}
      <Block position={[0, 3.35, LEARNING_ARCH_Z]} size={[5.2, 0.9, 0.6]} color="#4338ca" />
      <Sign3D text="📚 LEARNING CENTRE" position={[0, 3.35, LEARNING_ARCH_Z + 0.34]} width={4.7} height={0.7} bg="#4338ca" border="#c7d2fe" />
      <Sign3D text="📚 LEARNING CENTRE" position={[0, 3.35, LEARNING_ARCH_Z - 0.34]} rotation={[0, Math.PI, 0]} width={4.7} height={0.7} bg="#4338ca" border="#c7d2fe" />

      {/* hedges close the forecourt on three sides; the path stays open */}
      {[
        [(LEARNING_FORECOURT.x0 - 2.4) / 2 + 0, -50.5, 5.1 + 0.2, 0.5],
        [(LEARNING_FORECOURT.x1 + 2.4) / 2 + 0, -50.5, 5.1 + 0.2, 0.5],
      ].map(([x, z, sw, sd], i) => (
        <Block key={i} position={[x, 0.4, z]} size={[sw, 0.8, sd]} color="#2f9a3a" tex="grass" texScale={1} />
      ))}
      {[LEARNING_FORECOURT.x0, LEARNING_FORECOURT.x1].map((x) => (
        <Block key={x} position={[x, 0.4, (G.z1 + -50.3) / 2]} size={[0.5, 0.8, -50.3 - G.z1]} color="#2f9a3a" tex="grass" texScale={1} />
      ))}

      {/* flag */}
      <Block position={[G.x1 - 1.6, 2.4, G.z1 + 0.9]} size={[0.1, 4.4, 0.1]} color="#e2e8f0" />
      <Block position={[G.x1 - 1.0, 3.9, G.z1 + 0.9]} size={[1.1, 0.7, 0.04]} color="#22c55e" />

      <Near x={LEARNING_BOARD[0]} z={LEARNING_BOARD[1]} r={26}>
        <Label position={[LEARNING_BOARD[0], 2.9, LEARNING_BOARD[1] + 1]}>
          <Marker emoji="💡" text="Learn!" color="bg-indigo-200" />
        </Label>
      </Near>
    </group>
  )
}
