import * as sceneReg from '../../state/sceneRegistry'
import { useMeta } from '../../state/meta'
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGame, dayPhase, getTownEcoStatus } from '../../state/gameStore'
import { env, player, touchInput, view } from '../../state/sceneRegistry'
import { useView } from '../../state/viewMode'
import { groundY } from '../../state/world'
import { PRESETS, usePreset, useSettings } from '../../state/settings'
import { RemotePlayers } from './RemotePlayers'
import { Birds, ChimneySmoke, CloudShadows, EnvDriver, FootPuffs, Puddles, Rain, WindLeaves } from './Weather'
import { Grass, NatureClock } from './Nature'
import { Ground } from './Ground'
import {
  Benches,
  CommunityGarden,
  Beach,
  Farm,
  FlowerBeds,

  LearningCorner,
  Neighbourhood,
  PlazaLamps,
  Taps,
  Trees,
  WindTurbines,
} from './Town'
import { Bins } from './Bins'
import { TrashItems } from './TrashItems'
import { NPCs } from './NPCs'
import { Animals } from './Animals'
import { Saplings } from './Collectibles'
import { Player } from './Player'
import { Stands, Traffic } from './Vehicles'
import { Roads } from './Roads'
import { PathKerbs } from './PathKerbs'
import { EcoHub } from './Depots'
import { Trucks } from './Trucks'
import { Signposts } from './Signposts'
import { School, SportsGround } from './School'
import { Store } from './Store'
import { GreenHeart } from './GreenHeart'
import { Gadgets } from './Gadgets'
import { Heaps } from './Fun'
import { Bursts, Fireflies, Floaters } from './Effects'
import { sharedMaterials } from './primitives'
import { Outskirts, Sky, skyUniforms } from './Horizon'

const CAM_OFFSET = new THREE.Vector3(30, 30, 30)

/**
 * Camera rig with three views (press V or use the button):
 *  🗺️ Overview – isometric camera that follows you (wheel / pinch to zoom)
 *  🎥 Behind you – a perspective camera over your shoulder
 *  👁️ First person – you see through the hero's eyes
 * In the last two, W/S walk, A/D turn, and dragging the mouse (or a finger) looks around.
 */
function FollowCamera() {
  const { camera, size, gl, set } = useThree()
  const target = useRef(new THREE.Vector3(player.x, 0, player.z))
  const iso = useRef<THREE.Camera>(camera)
  const persp = useMemo(() => new THREE.PerspectiveCamera(65, 1, 0.1, 500), [])
  const mode = useView((s) => s.mode)
  const look = useRef(new THREE.Vector3())
  const eye = useRef(new THREE.Vector3())
  const bob = useRef({ phase: 0, amp: 0 })

  // keep a handle on the isometric camera Canvas created, and swap cameras when the view changes
  useEffect(() => {
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) iso.current = camera
  }, [camera])
  useEffect(() => {
    const want = mode === 'iso' ? iso.current : persp
    if (want && want !== camera) {
      persp.aspect = size.width / size.height
      persp.updateProjectionMatrix()
      set({ camera: want as THREE.PerspectiveCamera })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])
  useEffect(() => {
    persp.aspect = size.width / size.height
    persp.updateProjectionMatrix()
  }, [size, persp])

  useEffect(() => {
    const el = gl.domElement
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      view.zoom = THREE.MathUtils.clamp(view.zoom * Math.exp(-e.deltaY * 0.0012), view.minZoom, view.maxZoom)
    }
    // drag with the mouse or touch to look around (behind-you view)
    const look_ = (dx: number, dy: number) => {
      view.yaw -= dx * 0.006
      view.pitch = THREE.MathUtils.clamp(view.pitch + dy * 0.005, 0.05, 1.0)
    }

    // Direct screen touch controls: swipe anywhere on screen to look/orbit, two-finger pinch to zoom
    let lookTouchId: number | null = null
    let lastLook: { x: number; y: number } | null = null
    let pinch = 0

    const touchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (lookTouchId === null) {
          lookTouchId = t.identifier
          lastLook = { x: t.clientX, y: t.clientY }
        }
      }
    }

    const touchMove = (e: TouchEvent) => {
      // If two fingers on the 3D canvas, pinch to zoom
      if (e.targetTouches.length >= 2) {
        const d = Math.hypot(
          e.targetTouches[0].clientX - e.targetTouches[1].clientX,
          e.targetTouches[0].clientY - e.targetTouches[1].clientY
        )
        if (pinch > 0) {
          view.zoom = THREE.MathUtils.clamp(view.zoom * (d / pinch), view.minZoom, view.maxZoom)
        }
        pinch = d
        return
      }
      pinch = 0

      // Single finger on canvas: orbit camera in 360°
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier === lookTouchId && view.mode !== 'iso') {
          if (lastLook) {
            look_(t.clientX - lastLook.x, t.clientY - lastLook.y)
          }
          lastLook = { x: t.clientX, y: t.clientY }
        }
      }
    }

    const touchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier === lookTouchId) {
          lookTouchId = null
          lastLook = null
        }
      }
      if (e.targetTouches.length < 2) pinch = 0
    }

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.buttons && view.mode !== 'iso') look_(e.movementX, e.movementY)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('touchstart', touchStart, { passive: true })
    el.addEventListener('touchmove', touchMove, { passive: true })
    el.addEventListener('touchend', touchEnd)
    el.addEventListener('touchcancel', touchEnd)
    el.addEventListener('pointermove', move)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('touchstart', touchStart)
      el.removeEventListener('touchmove', touchMove)
      el.removeEventListener('touchend', touchEnd)
      el.removeEventListener('touchcancel', touchEnd)
      el.removeEventListener('pointermove', move)
    }
  }, [gl])

  useFrame((_, dt) => {
    // Mobile dual-joystick camera look rotation
    if (touchInput.lookActive) {
      view.yaw -= touchInput.lookX * 3.4 * dt
      view.pitch = THREE.MathUtils.clamp(view.pitch + touchInput.lookY * 2.4 * dt, 0.05, 1.0)
    }

    const reduced = useSettings.getState().access.reducedMotion
    const k = reduced ? 1 : 1 - Math.exp(-dt * 6)
    const gy = groundY(player.x, player.z)
    if (view.mode === 'iso') {
      if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return
      target.current.x += (player.x - target.current.x) * k
      target.current.z += (player.z - target.current.z) * k
      camera.position.copy(target.current).add(CAM_OFFSET)
      camera.lookAt(target.current)
      const cam = camera as THREE.OrthographicCamera
      const fit = THREE.MathUtils.clamp(Math.min(size.width / 1440, size.height / 860), 0.55, 1.4)
      const z = view.zoom * fit
      if (Math.abs(cam.zoom - z) > 0.01) {
        cam.zoom += (z - cam.zoom) * Math.min(1, dt * 8)
        cam.updateProjectionMatrix()
      }
      return
    }
    if (!(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return
    // keep the overview camera centred on you so switching back is seamless
    target.current.set(player.x, 0, player.z)
    const sy = Math.sin(view.yaw)
    const cy = Math.cos(view.yaw)
    const cp = Math.cos(view.pitch)
    const sp = Math.sin(view.pitch)
    // footstep bob: the view bounces and sways a little as you walk
    const bb = bob.current
    const walking = player.moving && !player.vehicle && !reduced
    bb.amp += ((walking ? (player.running ? 1 : 0.65) : 0) - bb.amp) * Math.min(1, dt * 8)
    if (walking) bb.phase += dt * (player.running ? 13 : 9)
    const bobY = Math.abs(Math.sin(bb.phase)) * 0.07 * bb.amp
    const ride = player.vehicle ? 0.34 : 0
    {
      const dist = THREE.MathUtils.clamp((3.7 * 62) / view.zoom, 2.2, 9)
      look.current.set(player.x, 1.25 + gy + ride, player.z)
      eye.current.set(player.x - sy * cp * dist, 1.25 + gy + ride + sp * dist + 0.3 + bobY * 0.35, player.z - cy * cp * dist)
      const kk = reduced ? 1 : 1 - Math.exp(-dt * 14)
      camera.position.lerp(eye.current, kk)
      camera.lookAt(look.current)
    }
  })
  return null
}

const SKY_DAY = new THREE.Color('#a8dcf5')
const SKY_DUSK = new THREE.Color('#f6a873')
const SKY_NIGHT = new THREE.Color('#1b2550')
const SUN_DAY = new THREE.Color('#ffffff')
const SUN_DUSK = new THREE.Color('#ffb36b')
const SUN_NIGHT = new THREE.Color('#6f86d6')
const SKY_RAIN = new THREE.Color('#7b8a9c')
const FLASH = new THREE.Color('#f8fbff')
const TOP_DAY = new THREE.Color('#3f95de')
const TOP_NIGHT = new THREE.Color('#050a20')
const TOP_DUSK = new THREE.Color('#5b5aa6')
const TOP_RAIN = new THREE.Color('#566679')
const MOON = new THREE.Color('#c9d6ff')

/** 0..1 brightness for a phase of the day */
function lightLevel(p: number) {
  if (p < 0.05) return 0.4 + (p / 0.05) * 0.6
  if (p < 0.6) return 1
  if (p < 0.7) return 1 - ((p - 0.6) / 0.1) * 0.84
  if (p < 0.95) return 0.16
  return 0.16 + ((p - 0.95) / 0.05) * 0.24
}

/** Sun, sky and lamps that change with the time of day. The sun follows the player for crisp shadows. */
function DayNightLighting() {
  const { shadows, shadowSize } = usePreset()
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const lantern = useRef<THREE.PointLight>(null)
  const { scene } = useThree()
  const sky = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    if (sun.current) scene.add(sun.current.target)
    scene.background = sky
    scene.fog = new THREE.Fog(sky, 70, 130)
  }, [scene, sky])

  useFrame(() => {
    const s = useGame.getState()
    const eco = getTownEcoStatus(s.stats)
    const p = dayPhase(s.clock)
    const L = lightLevel(p) * (1 - env.rain * 0.35)
    const dusk = p > 0.58 && p < 0.72 ? 1 - Math.abs(p - 0.65) / 0.07 : p > 0.94 || p < 0.04 ? 0.6 : 0
    // sky colour
    sky.copy(L > 0.5 ? SKY_DAY : SKY_NIGHT)
    if (L <= 0.5) sky.lerp(SKY_DAY, (L - 0.25) / 0.25)
    if (dusk > 0) sky.lerp(SKY_DUSK, dusk * 0.7)
    if (env.rain > 0) sky.lerp(SKY_RAIN, env.rain * 0.6)
    if (env.flash > 0) sky.lerp(FLASH, env.flash * 0.8)

    // Dynamic Town Evolution: smog clears into golden horizon in Greening & Paradise tiers
    if (eco.tier === 1) {
      sky.lerp(new THREE.Color('#94a3b8'), 0.1)
    } else if (eco.tier >= 2) {
      if (dusk > 0 || (p > 0.52 && p < 0.72)) {
        sky.lerp(new THREE.Color('#fbbf24'), 0.16 * (eco.tier === 3 ? 1.4 : 1.0))
      }
    }

    const night0 = THREE.MathUtils.clamp(1 - (L - 0.16) / 0.84, 0, 1)
    // sky dome colours follow the same time of day
    const su = skyUniforms
    su.uHorizon.value.copy(sky)
    su.uTop.value.copy(TOP_DAY).lerp(TOP_NIGHT, night0)
    if (dusk > 0) su.uTop.value.lerp(TOP_DUSK, dusk * 0.6)
    if (env.rain > 0) su.uTop.value.lerp(TOP_RAIN, env.rain * 0.7)
    if (env.flash > 0) su.uTop.value.lerp(FLASH, env.flash * 0.7)
    su.uNight.value = night0
    su.uRain.value = env.rain
    su.uSunColor.value.copy(night0 > 0.6 ? MOON : SUN_DAY).lerp(SUN_DUSK, dusk * 0.8)
    if (eco.tier >= 2 && (dusk > 0 || (p > 0.52 && p < 0.72))) {
      su.uSunColor.value.lerp(new THREE.Color('#f59e0b'), 0.22)
    }
    if (scene.fog) {
      const f = scene.fog as THREE.Fog
      f.color.copy(sky)
      // overview: close, cosy fog · walking views: long view so hills and mountains show
      const wide = view.mode !== 'iso'
      const clarityBonus = (eco.tier - 1) * 18
      f.near = (wide ? 55 : 70) - env.rain * (wide ? 25 : 35) + clarityBonus * 0.4
      f.far = (wide ? 260 : 130) - env.rain * (wide ? 110 : 55) + clarityBonus
    }
    if (hemi.current) hemi.current.intensity = 0.06 + 1.64 * L + env.flash * 2.5
    if (amb.current) amb.current.intensity = 0.05 + 0.25 * L
    if (sun.current) {
      sun.current.intensity = 0.05 + 2.45 * L + env.flash * 3
      sun.current.color.copy(L < 0.5 ? SUN_NIGHT : SUN_DAY).lerp(SUN_DUSK, dusk)
      sun.current.position.set(player.x + 14, 26, player.z + 9)
      sun.current.target.position.set(player.x, 0, player.z)
    }
    const night = THREE.MathUtils.clamp(1 - (L - 0.16) / 0.84, 0, 1)
    if (lantern.current) {
      lantern.current.position.set(player.x, 2.2, player.z)
      lantern.current.intensity = night * 4
    }
    sharedMaterials.lampGlow.emissiveIntensity = 0.15 + Math.max(night, env.rain * 0.6) * 2.4
    sharedMaterials.windowGlow.emissiveIntensity = night * 0.9
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#f8fafc', '#34d399', 1.8]} />
      <ambientLight ref={amb} intensity={0.32} />
      {/* a warm glow around you so you can find your way at night */}
      <pointLight ref={lantern} color="#ffcf8a" intensity={0} distance={11} decay={1} />
      <directionalLight
        ref={sun}
        position={[14, 26, 9]}
        intensity={2.4}
        castShadow={shadows}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.00035}
        shadow-normalBias={0.035}
      />
    </>
  )
}

/**
 * Watches the frame rate. In every mode the render resolution scales down when frames drop and back up
 * when there is headroom; in Auto mode it also steps the quality preset down if the device keeps struggling.
 */
function AutoQuality() {
  const quality = useSettings((s) => s.quality)
  const resolved = useSettings((s) => s.resolved)
  const setDpr = useThree((s) => s.setDpr)
  const max = Math.min(PRESETS[resolved].dpr, window.devicePixelRatio || 1)
  return (
    <PerformanceMonitor
      bounds={() => [26, 50]}
      flipflops={3}
      onChange={({ factor }) => setDpr(Math.max(1, Math.min(max, 1 + (max - 1) * factor)))}
      onDecline={() => {
        if (quality !== 'auto') return
        const q = useSettings.getState().downgrade()
        if (q) useGame.getState().pushToast({ kind: 'info', emoji: '⚙️', title: `Graphics lowered to ${PRESETS[q].label}`, text: 'The game was running slowly. Change it any time in Settings.' })
      }}
    />
  )
}

/** Dev overlay (add ?stats to the URL): FPS / frame time graph plus live draw calls, triangles and geometry counts */
function DebugStats() {
  const gl = useThree((s) => s.gl)
  const el = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const d = document.createElement('div')
    d.style.cssText = 'position:fixed;left:0;top:50px;z-index:99999;font:11px monospace;color:#0f0;background:#000a;padding:3px 6px;pointer-events:none;white-space:pre'
    document.body.appendChild(d)
    el.current = d
    return () => d.remove()
  }, [])
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < 0.5 || !el.current) return
    acc.current = 0
    const i = gl.info
    el.current.textContent = `calls ${i.render.calls}  tris ${(i.render.triangles / 1000).toFixed(1)}k\ngeom ${i.memory.geometries}  tex ${i.memory.textures}  dpr ${gl.getPixelRatio().toFixed(2)}`
  })
  return <Stats />
}

/** Night-time glow around lamps and windows (High quality only) */
function Glow() {
  const { bloom } = usePreset()
  if (!bloom) return null
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.55} />
    </EffectComposer>
  )
}

/** Simple FPS meter written to window for the settings panel */
function FpsProbe() {
  const acc = useRef({ t: 0, n: 0 })
  useFrame((_, dt) => {
    acc.current.t += dt
    acc.current.n++
    if (acc.current.t > 1) {
      ;(window as unknown as { __ecoFps: number }).__ecoFps = Math.round(acc.current.n / acc.current.t)
      acc.current = { t: 0, n: 0 }
    }
  })
  return null
}

export function GameCanvas() {
  const resolved = useSettings((s) => s.resolved)
  const q = PRESETS[resolved]
  return (
    <Canvas
      key={resolved}
      shadows={q.shadows}
      orthographic
      dpr={[1, Math.min(q.dpr, window.devicePixelRatio || 1)]}
      gl={{
        antialias: q.antialias,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.12,
      }}
      camera={{ position: [32, 30, 34], zoom: 60, near: 0.1, far: 500 }}
      onContextMenu={(e) => e.preventDefault()}
      onCreated={(st) => {
        st.gl.shadowMap.type = THREE.PCFSoftShadowMap
        st.gl.toneMapping = THREE.ACESFilmicToneMapping
        st.gl.toneMappingExposure = 1.12
        if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { ecoThree: st, ecoReg: { player, view, game: useGame, meta: useMeta, reg: sceneReg } })
      }}
    >
      <AutoQuality />
      {new URLSearchParams(location.search).has('stats') && <DebugStats />}
      <FpsProbe />
      <EnvDriver />
      <NatureClock />
      <FollowCamera />
      <DayNightLighting />

      <Sky />
      <Outskirts />
      <Ground />
      <Roads />
      <PathKerbs />
      <Grass />
      <Puddles />
      <Neighbourhood />
      <WindTurbines />
      <School />
      <SportsGround />
      <Store />
      <Gadgets />
      <EcoHub />
      <GreenHeart />
      <Trucks />
      <Farm />
      <Trees />
      <FlowerBeds />
      <CommunityGarden />
      <Benches />
      <PlazaLamps />
      <Taps />
      <Beach />
      <LearningCorner />
      <Stands />
      <Heaps />
      <Traffic />
      <Signposts />

      <Bins />
      <Saplings />
      <TrashItems />
      <NPCs />
      <RemotePlayers />
      <Animals />
      <Player />

      <Floaters />
      <Bursts />
      <Rain />
      <WindLeaves />
      <CloudShadows />
      <Birds />
      <ChimneySmoke />
      <FootPuffs />
      <Fireflies />
      <Glow />
    </Canvas>
  )
}
