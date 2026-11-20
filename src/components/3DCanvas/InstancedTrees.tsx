import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePreset } from '../../state/settings'
import { getTexture, type TexName } from './textures'

type Tree = [number, number, number]

interface Part {
  size: [number, number, number]
  /** local position inside the tree (before scaling) */
  pos: [number, number, number]
  tex: TexName
  /** colour for the i-th tree (the tone cycles through a few greens) */
  color: (tone: number) => string
  /** studs are small cylinders, the rest boxes */
  stud?: boolean
}

const GREENS = ['#3fa63a', '#4cb944', '#2f9a3a']
const PINES = ['#1f7a3a', '#277f3f', '#2d8f46']

/** Brick tree – the same shapes LegoTree draws, one instanced mesh per brick */
const TREE_PARTS: Part[] = [
  { size: [0.5, 1.2, 0.5], pos: [0, 0.6, 0], tex: 'wood', color: () => '#8a5a2b' },
  { size: [2, 1.2, 2], pos: [0, 1.7, 0], tex: 'grass', color: (t) => GREENS[t % 3] },
  { size: [1.5, 0.9, 1.5], pos: [0, 2.75, 0], tex: 'grass', color: (t) => GREENS[t % 3] },
  { size: [0.9, 0.6, 0.9], pos: [0, 3.5, 0], tex: 'grass', color: (t) => GREENS[t % 3] },
]
const PINE_PARTS: Part[] = [
  { size: [0.45, 1, 0.45], pos: [0, 0.5, 0], tex: 'wood', color: () => '#7a4a24' },
  ...[2.2, 1.7, 1.2, 0.7].map((w, i): Part => ({ size: [w, 0.8, w], pos: [0, 0.9 + 0.4 + i * 0.85, 0], tex: 'grass', color: (t) => PINES[t % 3] })),
  { size: [0.3, 0.4, 0.3], pos: [0, 0.9 + 3.7, 0], tex: 'grass', color: (t) => PINES[t % 3] },
]

const _m = new THREE.Matrix4()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _c = new THREE.Color()

function PartMesh({ part, trees, castShadow }: { part: Part; trees: { x: number; z: number; s: number; tone: number }[]; castShadow: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const map = useMemo(() => getTexture(part.tex, Math.max(part.size[0], part.size[2]) / 1.2, part.size[1] / 1.2), [part])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    trees.forEach((t, i) => {
      _p.set(t.x, part.pos[1] * t.s, t.z)
      _s.setScalar(t.s)
      _m.compose(_p, _q, _s)
      mesh.setMatrixAt(i, _m)
      mesh.setColorAt(i, _c.set(part.color(t.tone)))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [trees, part])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, trees.length]} castShadow={castShadow} receiveShadow frustumCulled>
      <boxGeometry args={part.size} />
      <meshStandardMaterial map={map} bumpMap={map} bumpScale={0.35} roughness={0.5} />
    </instancedMesh>
  )
}

/** All trees in a handful of draw calls instead of ~7 meshes (and a wind callback) per tree */
export function InstancedTrees({ trees }: { trees: Tree[] }) {
  const { shadows } = usePreset()
  const { round, pine } = useMemo(() => {
    const round: { x: number; z: number; s: number; tone: number }[] = []
    const pine: { x: number; z: number; s: number; tone: number }[] = []
    trees.forEach(([x, z, s], i) => {
      const isPine = (x > 28 && z < -24) || z > 38 || (x < -2 && z < -26)
      ;(isPine ? pine : round).push({ x, z, s, tone: i })
    })
    return { round, pine }
  }, [trees])
  return (
    <group>
      {round.length > 0 && TREE_PARTS.map((p, i) => <PartMesh key={`t${i}`} part={p} trees={round} castShadow={shadows} />)}
      {pine.length > 0 && PINE_PARTS.map((p, i) => <PartMesh key={`p${i}`} part={p} trees={pine} castShadow={shadows} />)}
    </group>
  )
}
