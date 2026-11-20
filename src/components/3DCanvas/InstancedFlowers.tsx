import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useSway } from './Nature'

export interface FlowerSpec {
  x: number
  z: number
  h: number
  c: string
}

const paint = (g: THREE.BufferGeometry, color: string) => {
  const c = new THREE.Color(color)
  const n = g.getAttribute('position').count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

/** stem with two leaves: one draw call for all flowers in a bed */
function buildStem() {
  const stem = paint(new THREE.CylinderGeometry(0.014, 0.022, 1, 6).translate(0, 0.5, 0), '#2f9a3a')
  const leaf = (rot: number, y: number) =>
    paint(new THREE.SphereGeometry(0.07, 8, 6).scale(0.55, 0.12, 1.5).rotateX(-0.5).translate(0, 0, 0.1).rotateY(rot).translate(0, y, 0), '#3cb043')
  return mergeGeometries([stem, leaf(0.6, 0.25), leaf(0.6 + Math.PI * 0.9, 0.42)])!
}

/** petal ring + centre; petals take the instance colour, the centre stays golden (it is baked white then tinted by colour attr) */
function buildBloom() {
  const parts: THREE.BufferGeometry[] = []
  const petals = 6
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2
    parts.push(paint(new THREE.SphereGeometry(0.075, 8, 6).scale(0.55, 0.2, 1).translate(0, 0, 0.085).rotateX(-0.25).rotateY(a), '#ffffff'))
  }
  parts.push(paint(new THREE.SphereGeometry(0.05, 10, 8).scale(1, 0.7, 1).translate(0, 0.01, 0), '#ffd23f'))
  return mergeGeometries(parts)!
}

/**
 * A flower bed's blossoms drawn as two instanced meshes (stems + blooms) that sway together,
 * instead of ~3 meshes and a wind callback per flower.
 */
export function InstancedFlowers({ flowers, phase }: { flowers: FlowerSpec[]; phase: number }) {
  const sway = useSway(phase, 2.5)
  const stems = useRef<THREE.InstancedMesh>(null)
  const blooms = useRef<THREE.InstancedMesh>(null)
  const stemGeo = useMemo(buildStem, [])
  const bloomGeo = useMemo(buildBloom, [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const sc = new THREE.Vector3()
    const col = new THREE.Color()
    flowers.forEach((f, i) => {
      const yaw = (i * 2.399) % (Math.PI * 2)
      q.setFromEuler(e.set(0, yaw, 0))
      m.compose(p.set(f.x, 0, f.z), q, sc.set(1, f.h, 1))
      stems.current?.setMatrixAt(i, m)
      const tilt = Math.sin(i * 12.9898) * 0.25
      q.setFromEuler(e.set(0.55 + tilt, yaw, 0))
      m.compose(p.set(f.x, f.h, f.z), q, sc.setScalar(1 + (i % 3) * 0.12))
      blooms.current?.setMatrixAt(i, m)
      blooms.current?.setColorAt(i, col.set(f.c))
    })
    for (const im of [stems.current, blooms.current]) {
      if (!im) continue
      im.instanceMatrix.needsUpdate = true
      im.computeBoundingSphere()
    }
    if (blooms.current?.instanceColor) blooms.current.instanceColor.needsUpdate = true
  }, [flowers])
  return (
    <group position={[0, 0.42, 0]}>
      <group ref={sway}>
        <instancedMesh ref={stems} args={[stemGeo, undefined, flowers.length]} key={`s${flowers.length}`}>
          <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
        </instancedMesh>
        <instancedMesh ref={blooms} args={[bloomGeo, undefined, flowers.length]} key={`b${flowers.length}`}>
          <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
        </instancedMesh>
      </group>
    </group>
  )
}
