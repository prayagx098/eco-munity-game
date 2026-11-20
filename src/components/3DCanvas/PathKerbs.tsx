import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PATHS, type Rect } from '../../state/world'

const KERB_W = 0.16
const KERB_H = 0.13
const STEP = 1.2

/**
 * A neat stone kerb along every footpath and plaza edge, so paving reads as deliberately laid out instead of
 * flat tiles on grass. Edge pieces that would sit inside another path (where two paths join) are left out.
 * All kerbs are one InstancedMesh (a single draw call).
 */
export function PathKerbs() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const items = useMemo(() => {
    const inside = (x: number, z: number, skip: Rect) => PATHS.some((p) => p !== skip && x > p.x0 - 0.02 && x < p.x1 + 0.02 && z > p.z0 - 0.02 && z < p.z1 + 0.02)
    const out: { x: number; z: number; sx: number; sz: number }[] = []
    for (const p of PATHS) {
      const w = p.x1 - p.x0
      const d = p.z1 - p.z0
      if (w < 1 || d < 1) continue
      // north and south edges (run along x), then west and east edges (run along z)
      for (const z of [p.z0, p.z1]) {
        const off = z === p.z0 ? -KERB_W / 2 : KERB_W / 2
        for (let x = p.x0; x < p.x1 - 1e-6; x += STEP) {
          const len = Math.min(STEP, p.x1 - x)
          const mx = x + len / 2
          if (inside(mx, z + off * 3, p) || inside(mx, z, p)) continue
          out.push({ x: mx, z: z + off, sx: len, sz: KERB_W })
        }
      }
      for (const x of [p.x0, p.x1]) {
        const off = x === p.x0 ? -KERB_W / 2 : KERB_W / 2
        for (let z = p.z0; z < p.z1 - 1e-6; z += STEP) {
          const len = Math.min(STEP, p.z1 - z)
          const mz = z + len / 2
          if (inside(x + off * 3, mz, p) || inside(x, mz, p)) continue
          out.push({ x: x + off, z: mz, sx: KERB_W, sz: len })
        }
      }
    }
    return out
  }, [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    items.forEach((k, i) => {
      ref.current?.setMatrixAt(i, m.compose(p.set(k.x, KERB_H / 2, k.z), q, s.set(k.sx, KERB_H, k.sz)))
      ref.current?.setColorAt(i, c.set(i % 2 ? '#a5a199' : '#b3afa7'))
    })
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
      ref.current.computeBoundingSphere()
    }
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow key={items.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  )
}
