import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { BADGES } from '../../state/gameData'

export function BadgesPanel() {
  const open = useGame((s) => s.badgesOpen)
  const earned = useGame((s) => s.badges)
  const toggle = useGame((s) => s.toggleBadges)
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-indigo-950/45 p-3 sm:p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => toggle(false)}>
          <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="hud-card flex max-h-[72vh] w-[min(90vw,24rem)] sm:max-w-md md:max-w-lg flex-col overflow-hidden p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl">
            <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-lg sm:text-xl font-bold">🏅 Badges</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {earned.length}/{BADGES.length}
                </span>
                <button onClick={() => toggle(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">✕</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {BADGES.map((b) => {
                const got = earned.includes(b.id)
                return (
                  <div key={b.id} className={`flex items-center gap-2 rounded-xl p-2 ${got ? 'bg-gradient-to-br from-amber-100 to-yellow-50 ring-2 ring-amber-300' : 'bg-slate-50'}`}>
                    <span className={`text-2xl ${got ? '' : 'opacity-30 grayscale'}`}>{b.emoji}</span>
                    <div className="min-w-0 leading-tight">
                      <div className={`truncate text-xs font-bold ${got ? 'text-slate-900' : 'text-slate-400'}`}>{b.name}</div>
                      <div className="line-clamp-2 text-[10px] font-medium text-slate-500">{b.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
