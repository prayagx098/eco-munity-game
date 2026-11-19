import { memo, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { BIN_DEFS } from '../../state/gameData'
import { npcPositions, player, remotePlayers, view } from '../../state/sceneRegistry'
import {
  BARN,
  BEACH,
  LEARNING_CORNER,
  SEA,
  BIN_SLOTS,
  SCHOOL_BUILDING,
  GARDEN_PLOTS,
  HOUSES,
  PATHS,
  POND,
  RECYCLING_CENTER,
  RIVER,
  ROAD_X,
  ROADS_EW,
  SCHOOL_E,
  SCHOOL_FIELD,
  SCHOOL_S,
  SCHOOL_W,
  SCHOOL_WALLS,
  HEAPS,
  STANDS,
  TAPS,
  WORLD_HALF,
  ZONES,
  type Rect,
} from '../../state/world'

const R = (r: Rect, fill: string, key?: string | number, opacity = 1) => (
  <rect key={key} x={r.x0} y={r.z0} width={r.x1 - r.x0} height={r.z1 - r.z0} fill={fill} opacity={opacity} />
)

/** Ticks a few times a second so live positions (player, NPCs) refresh */
function useTicker(ms = 250) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

/** The parts of the map that never change, drawn once */
const MapStatic = memo(function MapStatic({ dot }: { dot: number }) {
  const W = WORLD_HALF
  return (
    <>
        <rect x={-W - 1} y={-W - 1} width={W * 2 + 2} height={W * 2 + 2} fill="#86d45a" rx={2} />
        <rect x={-W} y={-W} width={16} height={W * 2} fill="#c9e8a8" />
        {/* water */}
        <rect x={-W} y={RIVER.z0} width={W * 2} height={RIVER.z1 - RIVER.z0} fill="#3fa9e0" />
        <circle cx={POND.x} cy={POND.z} r={POND.r} fill="#3fa9e0" />
        <rect x={BEACH.x0} y={BEACH.z0} width={BEACH.x1 - BEACH.x0} height={BEACH.z1 - BEACH.z0} fill="#f2dc9b" />
        <rect x={SEA.x0} y={SEA.z0} width={SEA.x1 - SEA.x0} height={SEA.z1 - SEA.z0} fill="#3fa9e0" />
        {R(LEARNING_CORNER, '#b9773e')}
        {/* road + paths */}
        <rect x={ROAD_X - 2.5} y={-W} width={5} height={W * 2} fill="#55565e" />
        {ROADS_EW.map((r) => (
          <rect key={r.z} x={-W} y={r.z - 2.5} width={W * 2} height={5} fill="#55565e" />
        ))}
        {PATHS.map((p, i) => R(p, '#f1eff3', i))}
        <rect x={-2.4} y={RIVER.z0} width={4.8} height={RIVER.z1 - RIVER.z0} fill="#b9773e" />
        {/* buildings */}
        {R(SCHOOL_BUILDING, '#2563eb')}
        {R(SCHOOL_FIELD, '#4fb847')}
        {[SCHOOL_S, SCHOOL_W, SCHOOL_E, ...SCHOOL_WALLS].map((r, i) => R(r, '#2563eb', `sc${i}`))}
        {R(RECYCLING_CENTER, '#047857')}
        {R(BARN, '#dc2626')}
        {/* bins */}
        {BIN_SLOTS.map((b) => (
          <circle key={b.id} cx={b.x} cy={b.z} r={0.7 * dot} fill={BIN_DEFS[b.kind].color} stroke="#fff" strokeWidth={0.2} />
        ))}
    </>
  )
})

/**
 * Top-down town map, rotated 45° so it matches what you see on screen.
 * Shared by the corner mini-map and the full-screen map (M).
 */
function MapSvg({ big }: { big?: boolean }) {
  useTicker(big ? 200 : 400)
  const s = useGame()
  const W = WORLD_HALF
  const k = 0.72
  const sx = k * (player.x - player.z)
  const sy = k * (player.x + player.z)
  const viewBox = big ? '-61 -43 122 86' : `${sx - 22} ${sy - 15} 44 30`
  const thirsty = GARDEN_PLOTS.filter((p) => s.plots[p.id] >= 60)
  const dot = big ? 1 : 1.4
  return (
    <svg viewBox={viewBox} className="block h-full w-full">
      <g transform={`matrix(${k},${k},${-k},${k},0,0)`}>
        <MapStatic dot={dot} />
        {HOUSES.map((h) => (
          <rect key={h.id} x={h.x - 1.7} y={h.z - 2.5} width={3.4} height={5} fill={s.lights[h.id] ? '#facc15' : '#e08b6b'} />
        ))}
        {GARDEN_PLOTS.map((p) => R(p, s.plots[p.id] >= 60 ? '#60a5fa' : '#7a4a24', p.id))}
        {/* activity markers */}
        {s.saplings.filter((p) => !p.planted).map((p) => (
          <circle key={p.id} cx={p.x} cy={p.z} r={0.9 * dot} fill="#a3e635" stroke="#14532d" strokeWidth={0.3} />
        ))}
        {thirsty.map((p) => (
          <circle key={p.id} cx={(p.x0 + p.x1) / 2} cy={(p.z0 + p.z1) / 2} r={1 * dot} fill="#38bdf8" stroke="#fff" strokeWidth={0.3} />
        ))}
        {TAPS.filter((t) => s.leaks[t.id]).map((t) => (
          <circle key={t.id} cx={t.x} cy={t.z} r={0.9 * dot} fill="#22d3ee" stroke="#fff" strokeWidth={0.3} />
        ))}
        {HEAPS.filter((h) => s.heaps[h.id]).map((h) => (
          <circle key={h.id} cx={h.x} cy={h.z} r={0.9 * dot} fill="#92400e" stroke="#fff" strokeWidth={0.3} />
        ))}
        {STANDS.map((st) => (
          <rect key={st.id} x={st.x - 0.7 * dot} y={st.z - 0.7 * dot} width={1.4 * dot} height={1.4 * dot} fill="#8b5cf6" stroke="#fff" strokeWidth={0.25} />
        ))}
        {s.coins.map((c) => (
          <circle key={c.id} cx={c.x} cy={c.z} r={0.55 * dot} fill="#fbbf24" />
        ))}
        {s.trash.map((t) => (
          <circle key={t.id} cx={t.x} cy={t.z} r={0.6 * dot} fill="#ef4444" stroke="#fff" strokeWidth={0.2} />
        ))}
        {/* people */}
        {[...npcPositions.entries()].map(([id, n]) =>
          n.kind === 'villager' && !big ? null : (
            <circle key={id} cx={n.x} cy={n.z} r={0.7 * dot} fill={n.color} stroke="#fff" strokeWidth={0.35} />
          ),
        )}
        {/* real players in other tabs */}
        {[...remotePlayers.entries()].map(([id, r]) =>
          s.remotes[id] ? (
            <g key={id} transform={`translate(${r.x} ${r.z}) rotate(${(-r.heading * 180) / Math.PI})`}>
              <path d={`M0 ${2 * dot} L${-1.3 * dot} ${-1.2 * dot} L0 ${-0.5 * dot} L${1.3 * dot} ${-1.2 * dot} Z`} fill="#22d3ee" stroke="#0e7490" strokeWidth={0.35} />
            </g>
          ) : null,
        )}
        {/* you */}
        <g transform={`translate(${player.x} ${player.z}) rotate(${(-player.heading * 180) / Math.PI})`}>
          <path d={`M0 ${2.2 * dot} L${-1.5 * dot} ${-1.4 * dot} L0 ${-0.6 * dot} L${1.5 * dot} ${-1.4 * dot} Z`} fill="#facc15" stroke="#1e1b4b" strokeWidth={0.4} />
        </g>
      </g>
      {/* zone labels (drawn un-rotated so text stays upright) */}
      {big &&
        ZONES.map((z) => {
          const cx = (Math.max(z.x0, -W) + Math.min(z.x1, W)) / 2
          const cz = (Math.max(z.z0, -W) + Math.min(z.z1, W)) / 2
          const sx = k * (cx - cz)
          const sy = k * (cx + cz)
          const seen = s.visitedZones.includes(z.id)
          return (
            <text key={z.id} x={sx} y={sy} textAnchor="middle" fontSize={2.2} fontWeight={700} fill={seen ? '#1e1b4b' : '#64748b'} stroke="#fff" strokeWidth={0.5} paintOrder="stroke">
              {seen ? `${z.emoji} ${z.name}` : '❔ ???'}
            </text>
          )
        })}
    </svg>
  )
}

export function MiniMap() {
  const toggle = useGame((s) => s.toggleBigMap)
  return (
    <div className="glass relative overflow-hidden p-1 sm:p-1.5 shadow-lg">
      <button
        onClick={() => toggle(true)}
        className="block h-16 w-20 sm:h-24 sm:w-36 md:h-28 md:w-44 overflow-hidden rounded-lg sm:rounded-xl bg-sky-200 transition-transform active:scale-95"
        title="Open map (M)"
      >
        <MapSvg />
      </button>

      {/* Mini zoom controls (visible on sm+) */}
      <div className="hidden sm:flex absolute top-2 right-2 flex-col gap-1">
        {[
          ['+', 1.15],
          ['−', 1 / 1.15],
        ].map(([t, f]) => (
          <button
            key={t as string}
            onClick={() => (view.zoom = Math.min(view.maxZoom, Math.max(view.minZoom, view.zoom * (f as number))))}
            className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-slate-900/55 text-xs sm:text-base leading-none font-medium text-white backdrop-blur hover:bg-slate-900/75"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Map expand indicator badge for mobile */}
      <div className="sm:hidden absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded bg-slate-900/65 text-[9px] text-white pointer-events-none">
        ⤢
      </div>

      <div className="hidden sm:flex justify-center gap-2 pt-1 pb-0.5 text-[9px] sm:text-[10px] font-medium text-white/70">
        <span>▲ you</span>
        <span className="text-red-300">● litter</span>
        <span>M · full map</span>
      </div>
    </div>
  )
}

const LEGEND = [
  ['#facc15', '▲ You'],
  ['#22d3ee', '▲ Other players'],
  ['#ef4444', 'Litter'],
  ['#a3e635', 'Tree spot'],
  ['#38bdf8', 'Thirsty garden'],
  ['#22d3ee', 'Leaking tap'],
  ['#facc15', 'Wasted lights (yellow house)'],
  ['#fbbf24', 'Eco-coin'],
]

export function BigMap() {
  const open = useGame((s) => s.bigMap)
  const toggle = useGame((s) => s.toggleBigMap)
  const visited = useGame((s) => s.visitedZones.length)
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-indigo-950/50 p-3 sm:p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => toggle(false)}>
          <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} className="hud-card flex w-[min(94vw,52rem)] max-h-[82vh] overflow-y-auto flex-col gap-3 p-3.5 sm:p-4 md:flex-row rounded-2xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-[92/64] min-h-[14rem] flex-1 overflow-hidden rounded-xl sm:rounded-2xl bg-sky-200">
              <MapSvg big />
            </div>
            <div className="w-full shrink-0 md:w-48 text-xs sm:text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-base sm:text-lg font-bold">🗺️ Town Map</h2>
                <button onClick={() => toggle(false)} className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">✕</button>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-slate-500">
                Explored {visited}/{ZONES.length} zones
              </div>
              <ul className="mt-2.5 space-y-1 text-xs font-semibold">
                {LEGEND.map(([c, t]) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white" style={{ background: c }} />
                    <span className="truncate">{t}</span>
                  </li>
                ))}
                {Object.values(BIN_DEFS).map((b) => (
                  <li key={b.kind} className="flex items-center gap-1.5">
                    <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white" style={{ background: b.color }} />
                    <span className="truncate">{b.label} bin</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-400">Tap anywhere outside to close.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
