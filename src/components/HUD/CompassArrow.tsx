import { useEffect, useState } from 'react'
import { useGame } from '../../state/gameStore'
import { player, view } from '../../state/sceneRegistry'
import { isGrown } from '../../state/forest'
import { BIN_SLOTS, GARDEN_PLOTS, HEAPS, HOUSES, TAPS } from '../../state/world'

interface Target {
  x: number
  z: number
  emoji: string
  label: string
}

/** the nearest thing in town that needs a helping hand */
function nearest(): (Target & { d: number }) | null {
  const s = useGame.getState()
  const list: Target[] = []
  if (s.carrying?.kind === 'trash') for (const b of BIN_SLOTS) list.push({ x: b.x, z: b.z, emoji: '🗑️', label: 'Find a bin' })
  else for (const t of s.trash) list.push({ x: t.x, z: t.z, emoji: '🧴', label: 'Litter to pick up' })
  for (const h of HOUSES) if (s.lights[h.id]) list.push({ x: h.door[0], z: h.door[1], emoji: '💡', label: 'Wasted light' })
  for (const t of TAPS) if (s.leaks[t.id]) list.push({ x: t.x, z: t.z, emoji: '🔧', label: 'Leaking tap' })
  for (const h of HEAPS) if (s.heaps[h.id]) list.push({ x: h.x, z: h.z, emoji: '🪱', label: 'Compost to turn' })
  for (const p of GARDEN_PLOTS) if ((s.plots[p.id] ?? 0) >= 60) list.push({ x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2, emoji: '💧', label: 'Thirsty plants' })
  for (const sp of s.saplings) {
    if (!sp.planted) list.push({ x: sp.x, z: sp.z, emoji: '🌱', label: 'Plant a tree' })
    else if (isGrown(sp, s.elapsed)) list.push({ x: sp.x, z: sp.z, emoji: '🧺', label: 'Tree ready to harvest' })
  }
  let best: (Target & { d: number }) | null = null
  for (const t of list) {
    const d = Math.hypot(t.x - player.x, t.z - player.z)
    if (!best || d < best.d) best = { ...t, d }
  }
  return best
}

/** Shown when you use the Explorer compass: an arrow to the nearest job, turning with your camera */
export function CompassArrow() {
  const on = useGame((s) => s.compassOn)
  const [t, setT] = useState<{ angle: number; d: number; emoji: string; label: string } | null>(null)
  useEffect(() => {
    if (!on) return
    const tick = () => {
      const n = nearest()
      if (!n) return setT(null)
      // which way is "up" on screen, in world terms
      const f = view.mode === 'iso' ? [-Math.SQRT1_2, -Math.SQRT1_2] : [Math.sin(view.yaw), Math.cos(view.yaw)]
      const r = [-f[1], f[0]]
      const dx = n.x - player.x
      const dz = n.z - player.z
      setT({ angle: Math.atan2(dx * r[0] + dz * r[1], dx * f[0] + dz * f[1]), d: n.d, emoji: n.emoji, label: n.label })
    }
    tick()
    const id = setInterval(tick, 120)
    return () => clearInterval(id)
  }, [on])
  if (!on || !t) return null
  return (
    <div className="glass flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold shadow-lg">
      <span className="inline-block text-lg leading-none text-emerald-300" style={{ transform: `rotate(${t.angle}rad)`, transition: 'transform 0.1s linear' }}>
        ⬆
      </span>
      <span>
        {t.emoji} {t.label} · {Math.round(t.d)} m
      </span>
    </div>
  )
}
