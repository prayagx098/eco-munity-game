import { SIGNPOSTS, type Signpost } from '../../state/world'
import { Block, Sign3D } from './primitives'

const PLANK = 2.5

/** A post whose boards each point toward a place. The text is painted on both faces and reads along the arrow. */
function DirectionPost({ x, z, targets }: Signpost) {
  const H = 3.3
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, H / 2, 0]} size={[0.15, H, 0.15]} color="#7a4a24" tex="wood" texScale={1} />
      <Block position={[0, H + 0.08, 0]} size={[0.3, 0.16, 0.3]} color="#5b3a22" />
      {targets.slice(0, 6).map((t, i) => {
        const dx = t.x - x
        const dz = t.z - z
        const len = Math.hypot(dx, dz) || 1
        const ux = dx / len
        const uz = dz / len
        const phi = Math.atan2(-uz, ux)
        const y = H - 0.35 - i * 0.43
        return (
          <group key={t.label} position={[ux * PLANK * 0.5, y, uz * PLANK * 0.5]} rotation={[0, phi, 0]}>
            <Sign3D text={`${t.label} →`} position={[0, 0, 0.05]} width={PLANK} height={0.36} bg={t.color} border="#fef3c7" />
            <Sign3D text={`← ${t.label}`} position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]} width={PLANK} height={0.36} bg={t.color} border="#fef3c7" />
          </group>
        )
      })}
    </group>
  )
}

export function Signposts() {
  return (
    <>
      {SIGNPOSTS.map((p, i) => (
        <DirectionPost key={i} {...p} />
      ))}
    </>
  )
}
