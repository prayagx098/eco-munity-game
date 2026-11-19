import { useEffect } from 'react'
import { useGame, isNight } from '../state/gameStore'
import { HEAPS, HOUSES, RESPAWN_HIDDEN_DIST, STANDS, LITTER_SPOTS, POND, TAPS } from '../state/world'
import { npcPositions, player, remotePlayers } from '../state/sceneRegistry'
import { bridge } from '../state/netBridge'

const s_playing = () => useGame.getState().screen === 'playing'
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

/**
 * Drives the game's timed systems:
 *  meters/clock tick, NPC litter, coin respawns, wasted lights, leaking taps,
 *  (all host-tab only).
 */
export function useGameLoop() {
  useEffect(() => {
    /** world timers only run in the host tab (the one simulating the shared world) */
    const live = () => {
      const s = useGame.getState()
      return bridge.isHost && s.screen === 'playing' && !s.roundComplete && (!s.paused || Object.keys(s.remotes).length > 0) ? s : null
    }
    const timers: ReturnType<typeof setInterval>[] = []
    const every = (ms: number, fn: () => void) => timers.push(setInterval(fn, ms))

    every(1000, () => useGame.getState().tick(1))
    every(500, () => {
      if (live()) useGame.getState().processJobs()
    })

    // NPCs drop litter; some floats into the pond
    every(6000, () => {
      const s = live()
      if (!s) return
      if (Math.random() < 0.22) {
        const a = Math.random() * Math.PI * 2
        const r = POND.r - 1.2 - Math.random() * 1.2
        return s.spawnTrash(POND.x + Math.cos(a) * r, POND.z + Math.sin(a) * r, true)
      }
      const villagers = [...npcPositions.values()].filter((n) => n.kind === 'villager')
      if (villagers.length && Math.random() < 0.6) {
        const v = rand(villagers)
        return s.spawnTrash(v.x + (Math.random() - 0.5), v.z + (Math.random() - 0.5))
      }
      const [x, z] = rand(LITTER_SPOTS)
      s.spawnTrash(x + (Math.random() - 0.5) * 2, z + (Math.random() - 0.5) * 2)
    })

    // Someone forgot to switch the lights off…
    every(22000, () => {
      const s = live()
      if (!s || isNight(s.clock)) return
      const off = HOUSES.filter((h) => !s.lights[h.id])
      if (Object.values(s.lights).filter(Boolean).length >= 3 || !off.length) return
      useGame.setState({ lights: { ...s.lights, [rand(off).id]: true } })
    })

    // …and a tap starts dripping
    every(28000, () => {
      const s = live()
      if (!s) return
      const fine = TAPS.filter((t) => !s.leaks[t.id])
      if (Object.values(s.leaks).filter(Boolean).length >= 3 || !fine.length) return
      useGame.setState({ leaks: { ...s.leaks, [rand(fine).id]: true } })
    })

    // a vehicle that was taken is replaced later, once nobody is looking at its stand
    every(3000, () => {
      const s = live() ?? (bridge.isHost && s_playing() ? useGame.getState() : null)
      if (!s) return
      const due = Object.entries(s.standTimers).filter(([, t]) => s.elapsed >= t)
      if (!due.length) return
      const watchers = [{ x: player.x, z: player.z }, ...remotePlayers.values()]
      const timers = { ...s.standTimers }
      const vehicles = [...s.vehicles]
      let changed = false
      for (const [id] of due) {
        const st = STANDS.find((x) => x.id === id)
        if (!st) {
          delete timers[id]
          continue
        }
        if (watchers.some((w) => Math.hypot(w.x - st.x, w.z - st.z) < RESPAWN_HIDDEN_DIST)) continue
        if (vehicles.some((v) => Math.hypot(v.x - st.x, v.z - st.z) < 1.6)) {
          delete timers[id]
          changed = true
          continue
        }
        vehicles.push({ id: `${st.id}-${Math.floor(s.elapsed)}`, kind: st.kind, x: st.x, z: st.z, rot: st.rot, home: st.id })
        delete timers[id]
        changed = true
      }
      if (changed) {
        useGame.setState({ vehicles, standTimers: timers })
        bridge.worldDirty()
      }
    })

    // …compost heaps need turning
    every(45000, () => {
      const s = live()
      if (!s) return
      const ready = HEAPS.filter((h) => !s.heaps[h.id])
      if (Object.values(s.heaps).filter(Boolean).length >= 2 || !ready.length) return
      useGame.setState({ heaps: { ...s.heaps, [rand(ready).id]: true } })
    })

    return () => timers.forEach(clearInterval)
  }, [])
}
