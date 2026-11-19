import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame, starProgress, starsFor, getTownEcoStatus } from '../../state/gameStore'
import { STAR_THRESHOLDS } from '../../state/gameData'
import { Icon } from '../UI/Icons'

/**
 * Streamlined AAA-style Hero Status Bar:
 * Compact, horizontal, non-intrusive HUD capsule on top-left.
 * Click to expand detailed stats breakdown popover.
 */
export function StatsBar() {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const energy = useGame((s) => s.energy)
  const happiness = useGame((s) => s.happiness)
  const points = useGame((s) => s.points)
  const name = useGame((s) => s.profile.name)
  const shirt = useGame((s) => s.profile.shirt)
  const coins = useGame((s) => s.wallet.coins)
  const badges = useGame((s) => s.badges.length)
  const stats = useGame((s) => s.stats)
  const townEco = getTownEcoStatus(stats)
  const stars = starsFor(points)
  const next = STAR_THRESHOLDS[stars]

  return (
    <div className="relative pointer-events-auto select-none">
      {/* 1. SLIM HORIZONTAL STATUS CAPSULE (Mobile, Laptop, Desktop) */}
      <button
        onClick={() => setDetailsOpen((o) => !o)}
        className="glass flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 rounded-2xl shadow-xl hover:bg-white/15 active:scale-98 transition-all border border-white/20"
        title="Click for detailed stats"
        aria-label="View eco status"
      >
        {/* Avatar */}
        <div
          className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ring-2 ring-white/50 shadow-md"
          style={{ background: shirt }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>

        {/* Name & Micro Status Gauges */}
        <div className="flex flex-col text-left min-w-0">
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="truncate text-xs font-bold text-white max-w-[5.5rem] sm:max-w-[7.5rem]">{name}</span>
            <span className="flex items-center text-[10px] font-bold text-amber-300">
              ★ {stars}
            </span>
          </div>

          {/* Micro Energy & Happiness Gauges side-by-side */}
          <div className="flex items-center gap-2 text-[10px] font-semibold">
            {/* Energy Gauge */}
            <div className="flex items-center gap-1" title={`Eco-Energy: ${Math.round(energy)}%`}>
              <span className="text-[10px] leading-none text-emerald-300">⚡</span>
              <div className="h-1.5 w-10 sm:w-14 overflow-hidden rounded-full bg-black/35">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-400 transition-all duration-300"
                  style={{ width: `${Math.max(4, Math.min(100, energy))}%` }}
                />
              </div>
              <span className="text-[9px] tabular-nums text-emerald-300 font-bold">{Math.round(energy)}%</span>
            </div>

            {/* Happiness Gauge */}
            <div className="flex items-center gap-1" title={`Happiness: ${Math.round(happiness)}%`}>
              <span className="text-[10px] leading-none text-amber-300">😊</span>
              <div className="h-1.5 w-10 sm:w-14 overflow-hidden rounded-full bg-black/35">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-300"
                  style={{ width: `${Math.max(4, Math.min(100, happiness))}%` }}
                />
              </div>
              <span className="text-[9px] tabular-nums text-amber-300 font-bold">{Math.round(happiness)}%</span>
            </div>
          </div>
        </div>

        {/* Coins Pill */}
        <div className="flex items-center gap-1 rounded-xl bg-amber-400/20 px-2 py-1 text-xs font-bold text-amber-200 border border-amber-300/30">
          <Icon name="coin" size={13} />
          <span className="tabular-nums">{coins}</span>
        </div>

        <span className="text-[9px] text-white/50 pl-0.5">▼</span>
      </button>

      {/* 2. DETAILED STATS SHEET / POPOVER (On Click) */}
      <AnimatePresence>
        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="hud-card fixed top-14 left-2 sm:left-3 z-40 w-[min(90vw,19rem)] p-4 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white/50 shadow"
                  style={{ background: shirt }}
                >
                  {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-slate-900">{name}</div>
                  <div className="text-[11px] font-semibold text-emerald-600">CYBERSQUARE Eco Hero</div>
                </div>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 text-xs font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Town Evolution Tier Card */}
            <div className="mb-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-800">Town Evolution</span>
                <span style={{ color: townEco.color }}>{townEco.label}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Tier {townEco.tier}/3</span>
                <span>{townEco.score} Eco Actions Completed</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (townEco.score / 25) * 100)}%`,
                    backgroundColor: townEco.color,
                  }}
                />
              </div>
            </div>

            {/* Coins & Stars Row */}
            <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-amber-700">
                <Icon name="coin" size={14} />
                {coins} coins
              </span>
              <div className="flex gap-0.5 text-amber-400" title={`${stars} of ${STAR_THRESHOLDS.length} stars`}>
                {STAR_THRESHOLDS.map((_, i) => (
                  <Icon key={i} name="star" size={11} fill={i < stars} className={i < stars ? '' : 'text-slate-300'} />
                ))}
              </div>
            </div>

            {/* Detailed Progress Bars */}
            <div className="space-y-2.5 text-xs">
              {/* Eco-Energy */}
              <div>
                <div className="mb-1 flex justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5 text-emerald-600">⚡ Eco-Energy</span>
                  <span className="tabular-nums">{Math.round(energy)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                    animate={{ width: `${Math.max(3, Math.min(100, energy))}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>

              {/* Happiness */}
              <div>
                <div className="mb-1 flex justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5 text-amber-600">😊 Happiness</span>
                  <span className="tabular-nums">{Math.round(happiness)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                    animate={{ width: `${Math.max(3, Math.min(100, happiness))}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>

              {/* Star Points Progress */}
              <div>
                <div className="mb-1 flex justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5 text-violet-600">★ Star Progress</span>
                  <span className="tabular-nums font-bold text-violet-700">{points} pts {next !== undefined ? `/ ${next}` : '(Max)'}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
                    animate={{ width: `${next === undefined ? 100 : starProgress(points) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            </div>

            {/* Badges footer */}
            <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
              <span>🏅 {badges} badges earned</span>
              <span className="text-slate-400">Tap outside to close</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
