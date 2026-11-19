import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { usePreset } from '../../state/settings'
import { RIVER, ROADS_EW, ROAD_X, WORLD_HALF } from '../../state/world'
import { Block, sharedMaterials } from './primitives'
import { getTexture } from './textures'
import { seeded } from './Weather'

/* ------------------------------------------------------------------ */
/* Sky dome: gradient, sun / moon, drifting clouds and night stars       */
/* ------------------------------------------------------------------ */

export const skyUniforms = {
  uTop: { value: new THREE.Color('#3f95de') },
  uHorizon: { value: new THREE.Color('#a8dcf5') },
  uSunColor: { value: new THREE.Color('#fff2c0') },
  uSunDir: { value: new THREE.Vector3(14, 26, 9).normalize() },
  uNight: { value: 0 },
  uRain: { value: 0 },
  uTime: { value: 0 },
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunColor; uniform vec3 uSunDir;
uniform float uNight; uniform float uRain; uniform float uTime;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.5));
  // stars
  vec2 sp = d.xz / (d.y + 1.1) * 220.0;
  float star = step(0.992, hash(floor(sp))) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(sp)) * 40.0));
  float star2 = step(0.997, hash(floor(sp * 0.37) + 7.0));
  col += vec3(star + star2) * uNight * smoothstep(0.04, 0.35, h) * (1.0 - uRain);
  // sun / moon
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(sd, 900.0) * 3.0 + pow(sd, 40.0) * 0.35 + pow(sd, 6.0) * 0.12) * (1.0 - uRain * 0.7);
  // clouds
  if (d.y > 0.0) {
    vec2 cp = d.xz / (d.y + 0.22) * 1.5 + vec2(uTime * 0.012, uTime * 0.005);
    float c = fbm(cp);
    c = smoothstep(0.52 - uRain * 0.2, 0.9, c);
    vec3 cc = mix(vec3(1.0), uHorizon * 1.15, 0.25);
    cc = mix(cc, vec3(0.42, 0.46, 0.54), uRain * 0.75);
    cc *= mix(1.0, 0.22, uNight);
    float under = smoothstep(0.0, 0.3, d.y);
    col = mix(col, cc, c * under * 0.92);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`

/** Big sky sphere that stays centred on the camera */
export function Sky() {
  const mesh = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false }),
    [],
  )
  useFrame((_, dt) => {
    skyUniforms.uTime.value += dt
    if (mesh.current) mesh.current.position.copy(camera.position)
  })
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[420, 32, 20]} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Beyond the map: endless grass, sea, river, road, hills and forests     */
/* ------------------------------------------------------------------ */

const E = WORLD_HALF + 1

function InstancedField({ geometry, material, items, castShadow = false }: { geometry: THREE.BufferGeometry; material: THREE.Material; items: { p: [number, number, number]; s: [number, number, number]; c: string; r?: number }[]; castShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const im = ref.current
    if (!im) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const col = new THREE.Color()
    items.forEach((it, i) => {
      q.setFromEuler(e.set(0, it.r ?? 0, 0))
      m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...it.s))
      im.setMatrixAt(i, m)
      im.setColorAt(i, col.set(it.c))
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} frustumCulled={false} />
}

export function Outskirts() {
  const { grass } = usePreset()
  const grassTex = useMemo(() => getTexture('grass', 160, 160), [])

  // geometries & materials shared by the instanced scenery
  const mountainGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 5, 1).translate(0, 0.5, 0), [])
  const hillGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 7, 1).translate(0, 0.5, 0), [])
  const pineGeo = useMemo(() => new THREE.ConeGeometry(0.9, 2.8, 6).translate(0, 1.9, 0), [])
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.13, 0.17, 0.7, 5).translate(0, 0.35, 0), [])
  const rockGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), [])
  const flat = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), [])
  const trunkMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#6b4423' }), [])

  const mountains = useMemo(() => {
    const r = seeded(4242)
    const out: { p: [number, number, number]; s: [number, number, number]; c: string; r: number }[] = []
    const snow: typeof out = []
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + (r() - 0.5) * 0.1
      const dist = 150 + r() * 70
      const x = Math.cos(a) * dist
      const z = Math.sin(a) * dist
      const h = 26 + r() * 30
      const w = 30 + r() * 30
      const far = (dist - 150) / 70
      const c = new THREE.Color('#6e8f7a').lerp(new THREE.Color('#8097b2'), far * 0.8 + r() * 0.15).getStyle()
      out.push({ p: [x, -3, z], s: [w, h, w], c, r: r() * 3 })
      if (h > 38) snow.push({ p: [x, -3 + h * 0.66, z], s: [w * 0.36, h * 0.36, w * 0.36], c: '#f4f8ff', r: 0 })
    }
    // a few far islands out at sea (east)
    for (let i = 0; i < 4; i++) out.push({ p: [210 + r() * 80, -2, -80 + i * 55], s: [34, 10 + r() * 8, 34], c: '#6f9a74', r: r() * 3 })
    return { out, snow }
  }, [])

  const hills = useMemo(() => {
    const r = seeded(99)
    const out: { p: [number, number, number]; s: [number, number, number]; c: string; r: number }[] = []
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + (r() - 0.5) * 0.15
      // a square ring just outside the (square) playable map
      const ring = WORLD_HALF + 24 + r() * 30
      const m = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)))
      const x = (Math.cos(a) / m) * ring
      const z = (Math.sin(a) / m) * ring
      if (x > WORLD_HALF - 4) continue // the east side is the sea
      const h = 7 + r() * 9
      const w = 20 + r() * 18
      const c = new THREE.Color('#5fae4b').lerp(new THREE.Color('#79b96a'), r()).getStyle()
      out.push({ p: [x, -1, z], s: [w, h, w], c, r: r() * 3 })
    }
    return out
  }, [])

  const trees = useMemo(() => {
    const r = seeded(31337)
    const want = grass ? 1100 : 420
    const tr: { p: [number, number, number]; s: [number, number, number]; c: string; r: number }[] = []
    const tk: typeof tr = []
    const greens = ['#2d8a45', '#267a3c', '#37994d', '#1f6e37']
    let tries = 0
    while (tr.length < want && tries < want * 40) {
      tries++
      const x = (r() - 0.5) * 270
      const z = (r() - 0.5) * 270
      const d = Math.max(Math.abs(x), Math.abs(z))
      if (d < E + 0.5 || x > WORLD_HALF + 0.5) continue
      if (r() > Math.exp(-(d - E) / 28)) continue
      if (Math.abs(x - ROAD_X) < 4.5) continue // keep the road clear
      if (x < 0 && ROADS_EW.some((r) => Math.abs(z - r.z) < 4)) continue
      if (Math.abs(z - (RIVER.z0 + RIVER.z1) / 2) < 5 && x < 0) continue // and the river
      const s = 1.1 + r() * 1.5
      tr.push({ p: [x, 0, z], s: [s, s * (0.9 + r() * 0.5), s], c: greens[Math.floor(r() * greens.length)], r: r() * 3 })
      tk.push({ p: [x, 0, z], s: [s, s, s], c: '#6b4423', r: 0 })
    }
    return { tr, tk }
  }, [grass])

  // boulders & shrubs along the playable edge so the border looks like a natural boundary
  const border = useMemo(() => {
    const r = seeded(555)
    const out: { p: [number, number, number]; s: [number, number, number]; c: string; r: number }[] = []
    const tones = ['#9ca3af', '#a8a29e', '#8b95a3', '#6f8f5a', '#5f8a4f']
    for (let t = -WORLD_HALF; t <= WORLD_HALF; t += 2.6) {
      for (const side of ['n', 's', 'w', 'e'] as const) {
        const x = side === 'w' ? -WORLD_HALF - 0.1 : side === 'e' ? WORLD_HALF + 0.1 : t
        const z = side === 'n' ? -WORLD_HALF - 0.1 : side === 's' ? WORLD_HALF + 0.1 : t
        if (side === 'e') continue // sea / beach side
        if ((side === 'n' || side === 's') && Math.abs(x - ROAD_X) < 3.4) continue // road gate
        if (side === 'w' && Math.abs(z - (RIVER.z0 + RIVER.z1) / 2) < 4.2) continue
        if (side === 'w' && ROADS_EW.some((r) => Math.abs(z - r.z) < 3.4)) continue
        const s = 0.7 + r() * 0.9
        const shrub = r() > 0.6
        out.push({ p: [x + (r() - 0.5), shrub ? s * 0.3 : s * 0.35, z + (r() - 0.5)], s: [s * 1.2, shrub ? s * 0.7 : s * 0.8, s], c: tones[Math.floor(r() * tones.length)], r: r() * 3 })
      }
    }
    return out
  }, [])

  const riverMid = (RIVER.z0 + RIVER.z1) / 2
  const riverW = RIVER.z1 - RIVER.z0
  const FAR = 520

  return (
    <group>
      {/* endless grass under everything */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[1400, 1400]} />
        <meshLambertMaterial color="#72c24a" map={grassTex} />
      </mesh>

      {/* sea to the east, with a foamy sandy shore */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[E + 330, 0.02, 0]} material={sharedMaterials.water}>
        <planeGeometry args={[660, 1400]} />
      </mesh>
      <Block position={[E + 0.6, 0.012, 0]} size={[1.6, 0.03, 2 * FAR]} color="#f2dc9b" cast={false} receive={false} />
      <Block position={[E + 1.6, 0.05, 0]} size={[0.5, 0.02, 2 * FAR]} color="#ffffff" cast={false} receive={false} />

      {/* the river keeps flowing west to the hills, and east into the sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-E - 200, 0.045, riverMid]} material={sharedMaterials.water}>
        <planeGeometry args={[400, riverW]} />
      </mesh>
      <Block position={[-E - 200, 0.02, RIVER.z0 - 0.8]} size={[400, 0.05, 1.6]} color="#f2dc9b" cast={false} receive={false} tex="sand" texScale={3} />
      <Block position={[-E - 200, 0.02, RIVER.z1 + 0.8]} size={[400, 0.05, 1.6]} color="#f2dc9b" cast={false} receive={false} tex="sand" texScale={3} />

      {/* the road carries on into the distance */}
      {[-1, 1].map((sd) => (
        <Block key={sd} position={[ROAD_X, 0.05, sd * (E + 150)]} size={[5, 0.1, 300]} color="#55565e" cast={false} receive={false} tex="asphalt" texScale={3} />
      ))}

      {ROADS_EW.flatMap((r) =>
        [-1].map((sd) => <Block key={`${r.z}${sd}`} position={[sd * (E + 150), 0.05, r.z]} size={[300, 0.1, 5]} color="#55565e" cast={false} receive={false} tex="asphalt" texScale={3} />),
      )}

      <InstancedField geometry={hillGeo} material={flat} items={hills} />
      <InstancedField geometry={mountainGeo} material={flat} items={mountains.out} />
      <InstancedField geometry={mountainGeo} material={flat} items={mountains.snow} />
      <InstancedField geometry={pineGeo} material={flat} items={trees.tr} />
      <InstancedField geometry={trunkGeo} material={trunkMat} items={trees.tk} />
      <InstancedField geometry={rockGeo} material={flat} items={border} castShadow />

      {/* "road closed" barriers where the road leaves the playable town */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[ROAD_X, 0, sd * (WORLD_HALF - 1.4)]}>
          {[-2.4, 2.4].map((x) => (
            <Block key={x} position={[x, 0.45, 0]} size={[0.2, 0.9, 0.2]} color="#334155" />
          ))}
        </group>
      ))}
    </group>
  )
}
