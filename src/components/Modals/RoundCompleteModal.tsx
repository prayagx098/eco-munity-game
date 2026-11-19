import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'

const CONFETTI = ['🎉', '⭐', '🌳', '♻️', '💚', '🌻', '✨']

export function RoundCompleteModal() {
  const done = useGame((s) => s.roundComplete)
  const round = useGame((s) => s.round)
  const stats = useGame((s) => s.stats)
  const nextRound = useGame((s) => s.nextRound)

  return (
    <AnimatePresence>
      {done && (
        <motion.div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-indigo-950/35 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {CONFETTI.map((c, i) => (
            <motion.span
              key={i}
              className="absolute top-0 text-4xl"
              style={{ left: `${10 + i * 12}%` }}
              initial={{ y: -60, rotate: 0 }}
              animate={{ y: '100vh', rotate: 360 }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3, ease: 'linear' }}
            >
              {c}
            </motion.span>
          ))}
          <motion.div initial={{ scale: 0.8, y: 15 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="hud-card relative w-[min(88vw,22rem)] sm:max-w-sm p-4 sm:p-5 text-center rounded-2xl sm:rounded-3xl shadow-2xl">
            <div className="text-4xl sm:text-5xl">🏆</div>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-bold">Challenge {round + 1} complete!</h2>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600">Amazing teamwork! The whole town is proud of you. +50 bonus points.</p>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-green-50 p-2">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.sorted}</div>
                <div className="text-[11px] font-semibold text-slate-500">items sorted</div>
              </div>
              <div className="rounded-xl bg-lime-50 p-2">
                <div className="text-xl sm:text-2xl font-bold text-lime-600">{stats.trees + stats.watered + stats.lightsOff + stats.tapsFixed}</div>
                <div className="text-[11px] font-semibold text-slate-500">eco actions</div>
              </div>
            </div>
            <button onClick={nextRound} className="toy-btn mt-4 w-full bg-gradient-to-b from-green-400 to-green-600 px-6 py-2.5 text-base font-bold sm:text-lg">
              Next challenge 🚀
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
