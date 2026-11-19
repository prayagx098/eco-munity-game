import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from '../../state/sceneRegistry'
import { usePreset } from '../../state/settings'
import { useGame, getTownEcoStatus } from '../../state/gameStore'
import { NO_GRASS, PATHS, POND, RIVER, ROAD_X, ROADS_EW, WORLD_HALF, collides } from '../../state/world'
import { seeded } from './Weather'
import { getTexture } from './textures'

/** Shared uniforms so one update per frame animates every swaying thing */
export const natureUniforms = {
  uTime: { value: 0 },
  uWind: { value: 0.2 },
  uDir: { value: new THREE.Vector2(1, 0) },
  uEcoClarity: { value: 0.5 },
}

export function NatureClock() {
  const { waterWaves } = usePreset()
  useFrame((_, dt) => {
    natureUniforms.uTime.value += waterWaves ? Math.min(dt, 0.05) : 0
    natureUniforms.uWind.value = env.wind
    natureUniforms.uDir.value.set(Math.cos(env.windDir), Math.sin(env.windDir))
    const stats = useGame.getState().stats
    const eco = getTownEcoStatus(stats)
    natureUniforms.uEcoClarity.value = eco.waterClarity
  })
  return null
}

/* ------------------------------------------------------------------ */
/* Grass tufts that sway in the wind (one instanced mesh, GPU animated) */
/* ------------------------------------------------------------------ */

const onPath = (x: number, z: number) => PATHS.some((p) => x > p.x0 - 0.3 && x < p.x1 + 0.3 && z > p.z0 - 0.3 && z < p.z1 + 0.3)

export function Grass() {
  const { grass } = usePreset()
  const mesh = useRef<THREE.InstancedMesh>(null)

  const material = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, natureUniforms)
      shader.vertexShader =
        `uniform float uTime; uniform float uWind; uniform vec2 uDir;\n` +
        shader.vertexShader.replace(
          '#include <project_vertex>',
          `vec4 mvPosition = vec4( transformed, 1.0 );
           #ifdef USE_INSTANCING
             mvPosition = instanceMatrix * mvPosition;
           #endif
           float hh = clamp(position.y / 0.42, 0.0, 1.0);
           float wave = sin(uTime * 1.7 + mvPosition.x * 0.35 + mvPosition.z * 0.27) * 0.5 + 0.5;
           float gust = sin(uTime * 4.3 + mvPosition.x * 1.3) * 0.25;
           float bend = (0.04 + uWind * 0.32) * (wave + gust * uWind) * hh * hh;
           mvPosition.xz += uDir * bend;
           mvPosition.y -= bend * 0.3;
           mvPosition = modelViewMatrix * mvPosition;
           gl_Position = projectionMatrix * mvPosition;`,
        )
    }
    return m
  }, [])

  const geometry = useMemo(() => {
    // three thin blades in a little tuft
    const g = new THREE.BufferGeometry()
    const pos: number[] = []
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      const ox = Math.cos(a) * 0.05
      const oz = Math.sin(a) * 0.05
      const lean = 0.08
      pos.push(ox - 0.03, 0, oz, ox + 0.03, 0, oz, ox + Math.cos(a) * lean, 0.42 - i * 0.06, oz + Math.sin(a) * lean)
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }, [])

  const matrices = useMemo(() => {
    const r = seeded(1234)
    const out: THREE.Matrix4[] = []
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    let tries = 0
    while (out.length < grass && tries < grass * 6) {
      tries++
      const x = (r() - 0.5) * (WORLD_HALF * 2 - 2)
      const z = (r() - 0.5) * (WORLD_HALF * 2 - 2)
      if (Math.abs(x - ROAD_X) < 4.8) continue // north-south road & sidewalks
      if (ROADS_EW.some((r) => Math.abs(z - r.z) < 4.8)) continue // cross roads & sidewalks
      if (z > RIVER.z0 - 1.6 && z < RIVER.z1 + 1.6) continue // river & banks
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.1) continue
      if (x > 27.5 && x < 38.5 && z > 15.8 && z < 25) continue // farm yard
      if (NO_GRASS.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1)) continue
      if (onPath(x, z) || collides(x, z, 0.35)) continue
      const s = 0.7 + r() * 0.8
      q.setFromEuler(e.set(0, r() * Math.PI * 2, 0))
      out.push(m.clone().compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.8 + r() * 0.6), s)))
    }
    return out
  }, [grass])

  const colored = useRef(false)
  useFrame(() => {
    const im = mesh.current
    if (!im || colored.current) return
    colored.current = true
    const c = new THREE.Color()
    const shades = ['#5fb83a', '#6cc444', '#4fa832', '#7ed957', '#58b13c']
    matrices.forEach((mat, i) => {
      im.setMatrixAt(i, mat)
      im.setColorAt(i, c.set(shades[i % shades.length]))
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
  })

  if (!grass) return null
  return <instancedMesh ref={mesh} args={[geometry, material, matrices.length]} receiveShadow />
}

/* ------------------------------------------------------------------ */
/* Animated water (river + pond)                                        */
/* ------------------------------------------------------------------ */

function waterMaterial(flow: number, mode: 'river' | 'pond', size: number) {
  const m = new THREE.MeshStandardMaterial({ color: '#3aa3dd', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.93 })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, natureUniforms)
    shader.uniforms.uFlow = { value: flow }
    shader.uniforms.uMode = { value: mode === 'pond' ? 1 : 0 }
    shader.uniforms.uSize = { value: size }
    shader.vertexShader =
      `uniform float uTime; uniform float uWind; uniform float uFlow; varying float vWave; varying vec2 vXY;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec2 p = position.xy;
         float w1 = sin(p.x * 0.9 - uTime * (1.2 + uFlow) + p.y * 0.4);
         float w2 = sin(p.y * 1.4 + uTime * 1.1 + p.x * 0.3);
         float w3 = sin((p.x + p.y) * 2.3 - uTime * 2.6) * (0.3 + uWind);
         vWave = (w1 + w2 + w3) / 3.0;
         vXY = p;
         transformed.z += vWave * (0.05 + uWind * 0.06);`,
      )
    shader.fragmentShader =
      `uniform float uTime; uniform float uMode; uniform float uSize; uniform float uEcoClarity; varying float vWave; varying vec2 vXY;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float sparkle = smoothstep(0.55, 0.95, vWave);
         float ripple = smoothstep(0.92, 1.0, sin(vXY.x * 3.1 + vXY.y * 2.7 + uTime * 1.5) * sin(vXY.y * 2.2 - uTime));
         float edge = uMode > 0.5 ? length(vXY) / uSize : abs(vXY.y) / uSize;
         vec3 murky = vec3(0.24, 0.30, 0.22);
         vec3 cleanDeep = uMode > 0.5 ? vec3(0.07, 0.38, 0.58) : vec3(0.05, 0.45, 0.72);
         vec3 cleanShallow = vec3(0.25, 0.76, 0.88);
         vec3 deep = mix(murky, cleanDeep, uEcoClarity);
         vec3 shallow = mix(murky * 1.25, cleanShallow, uEcoClarity);
         diffuseColor.rgb = mix(deep, shallow, smoothstep(0.4, 1.0, edge));
         diffuseColor.rgb = mix(diffuseColor.rgb * 0.95, vec3(0.8, 0.95, 1.0), (sparkle * 0.35 + ripple * 0.3) * (0.4 + uEcoClarity * 0.6));
         float foam = smoothstep(0.88, 0.99, edge) * (0.55 + 0.45 * sin(uTime * 2.0 + edge * 50.0 + vXY.x * 0.7));
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), foam * 0.8 * uEcoClarity);`,
      )
  }
  return m
}

export function River() {
  const mat = useMemo(() => waterMaterial(1.2, 'river', (RIVER.z1 - RIVER.z0) / 2), [])
  const w = WORLD_HALF * 2 + 2
  const d = RIVER.z1 - RIVER.z0
  return (
    <mesh position={[0, 0.06, (RIVER.z0 + RIVER.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat}>
      <planeGeometry args={[w, d, 120, 8]} />
    </mesh>
  )
}

/** A reed / cattail clump that sways in the wind */
function Reeds({ x, z, seed }: { x: number; z: number; seed: number }) {
  const sway = useSway(seed * 1.7, 1.4)
  const blades = useMemo(() => {
    const r = seeded(seed)
    return Array.from({ length: 6 }, () => ({ dx: (r() - 0.5) * 0.45, dz: (r() - 0.5) * 0.45, h: 0.9 + r() * 0.7, cat: r() > 0.55 }))
  }, [seed])
  return (
    <group position={[x, 0.1, z]} ref={sway}>
      {blades.map((b, i) => (
        <group key={i} position={[b.dx, 0, b.dz]}>
          <mesh position={[0, b.h / 2, 0]} castShadow>
            <boxGeometry args={[0.05, b.h, 0.05]} />
            <meshStandardMaterial color="#4f9a3a" roughness={0.8} />
          </mesh>
          {b.cat && (
            <mesh position={[0, b.h + 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.3, 8]} />
              <meshStandardMaterial color="#6b3f1d" roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

function LilyPad({ x, z, rot, flower }: { x: number; z: number; rot: number; flower: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.13 + Math.sin(clock.elapsedTime * 1.3 + x * 3 + z) * 0.012
  })
  return (
    <group ref={ref} position={[x, 0.13, z]} rotation={[0, rot, 0]}>
      <mesh>
        <cylinderGeometry args={[0.45, 0.45, 0.025, 14, 1, false, 0, Math.PI * 1.75]} />
        <meshStandardMaterial color="#3da34a" roughness={0.6} />
      </mesh>
      {flower && (
        <mesh position={[0.1, 0.1, 0.05]}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <meshStandardMaterial color="#f9a8d4" emissive="#f472b6" emissiveIntensity={0.15} />
        </mesh>
      )}
    </group>
  )
}

/** The duck pond: a sloping sandy bank, a ring of stones, reeds, lily pads and shaded water */
export function Pond() {
  const mat = useMemo(() => waterMaterial(0, 'pond', POND.r), [])
  const r = POND.r
  const bank = useMemo(() => {
    const pts = [
      [r - 0.2, 0.04],
      [r + 0.05, 0.17],
      [r + 0.45, 0.24],
      [r + 1.0, 0.15],
      [r + 1.8, 0.03],
    ].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(pts, 56)
  }, [r])
  const sand = useMemo(() => getTexture('sand', 10, 1), [])
  const stones = useMemo(() => {
    const rnd = seeded(77)
    return Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2 + (rnd() - 0.5) * 0.08
      const rad = r + 0.35 + rnd() * 0.3
      const s = 0.28 + rnd() * 0.28
      return { x: Math.cos(a) * rad, z: Math.sin(a) * rad, s, rot: rnd() * 3, tone: ['#9ca3af', '#a8a29e', '#8b95a3', '#b6b0a6'][i % 4] }
    })
  }, [r])
  const reeds = useMemo(() => [0.3, 1.1, 2.0, 3.6, 4.4, 5.5].map((a, i) => ({ x: Math.cos(a) * (r + 0.9), z: Math.sin(a) * (r + 0.9), seed: 11 + i })), [r])
  const pads = useMemo(() => [[2, 1.5], [-2.5, -1], [0.5, -3], [-1, 3], [3, -1.5], [-3.2, 2.2]].map(([x, z], i) => ({ x, z, rot: i * 1.3, flower: i % 3 === 0 })), [])
  return (
    <group position={[POND.x, 0, POND.z]}>
      <mesh geometry={bank} receiveShadow>
        <meshStandardMaterial color="#c8b27a" roughness={0.95} map={sand} side={THREE.DoubleSide} />
      </mesh>
      {/* the pond bed, so you see depth under the clear edges */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r, 40]} />
        <meshStandardMaterial color="#2f5d62" roughness={1} />
      </mesh>
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat}>
        <circleGeometry args={[r, 56, 0, Math.PI * 2]} />
      </mesh>
      {stones.map((st, i) => (
        <mesh key={i} position={[st.x, 0.12 + st.s * 0.25, st.z]} rotation={[0.2, st.rot, 0.15]} scale={[1.15, 0.75, 1]} castShadow receiveShadow>
          <dodecahedronGeometry args={[st.s, 0]} />
          <meshStandardMaterial color={st.tone} roughness={0.95} flatShading />
        </mesh>
      ))}
      {reeds.map((rd) => (
        <Reeds key={rd.seed} {...rd} />
      ))}
      {pads.map((p, i) => (
        <LilyPad key={i} {...p} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Swaying helper for trees, flowers, flags                             */
/* ------------------------------------------------------------------ */

/** Returns a ref; the group leans with the wind (strength scales the bend) */
export function useSway(phase: number, strength = 1) {
  const ref = useRef<THREE.Group>(null)
  const { sway } = usePreset()
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g || !sway) return
    const t = clock.elapsedTime
    const w = env.wind
    const lean = (0.015 + w * 0.09) * strength
    const osc = Math.sin(t * (1.3 + w * 2.2) + phase) * 0.6 + Math.sin(t * 3.7 + phase * 2) * 0.25 * w
    const amt = lean * (0.6 + osc)
    g.rotation.x = Math.sin(env.windDir) * amt
    g.rotation.z = -Math.cos(env.windDir) * amt
  })
  return ref
}
