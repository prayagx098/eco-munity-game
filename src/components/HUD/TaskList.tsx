import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { useUI } from '../../state/ui'
import { DAILY_BONUS, DAILY_JOBS, SORT_COIN_CAP, dailyOf } from '../../state/earn'

/** Small icon button with a done/total badge; opens the tasks popup */
export function TaskButton() {
  const tasks = useGame((s) => s.tasks)
  const open = useUI((s) => s.tasksOpen)
  const setTasks = useUI((s) => s.setTasks)
  const done = tasks.filter((t) => t.progress >= t.target).length
  return (
    <button onClick={() => setTasks()} className={`glass-btn relative ${open ? 'bg-white/30' : ''}`} aria-label="Tasks (T)" title="Tasks (T)">
      <span className="text-lg">📋</span>
      <span className="absolute -right-1 -bottom-1 rounded-full bg-emerald-400 px-1.5 text-[10px] leading-4 font-bold text-slate-900">
        {done}/{tasks.length}
      </span>
    </button>
  )
}

/** The task list, shown in a centred popup only when asked for */
export function TaskPopup() {
  const open = useUI((s) => s.tasksOpen)
  const setTasks = useUI((s) => s.setTasks)
  const tasks = useGame((s) => s.tasks)
  const round = useGame((s) => s.round)
  const wallet = useGame((s) => s.wallet)
  const daily = dailyOf(wallet)
  const done = tasks.filter((t) => t.progress >= t.target).length
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTasks(false)}>
          <motion.div
            initial={{ scale: 0.94, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-light w-full max-w-[min(90vw,19rem)] sm:max-w-xs overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl"
            role="dialog"
            aria-label="Tasks"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <div>
                <div className="text-sm sm:text-base font-bold text-slate-900">Tasks</div>
                <div className="text-[11px] font-medium text-slate-500">
                  Challenge {round + 1} · {done} of {tasks.length} done
                </div>
              </div>
              <button onClick={() => setTasks(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="mx-4 mb-2 h-1 overflow-hidden rounded-full bg-slate-100">
              <motion.div className="h-full bg-emerald-400" animate={{ width: `${(done / Math.max(1, tasks.length)) * 100}%` }} />
            </div>
            <ul className="space-y-0.5 px-2.5 pb-3 max-h-[50vh] overflow-y-auto">
              {tasks.map((t) => {
                const ok = t.progress >= t.target
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-slate-700">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${ok ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{ok ? '✓' : ''}</span>
                    <span className={`flex-1 ${ok ? 'text-slate-400 line-through' : ''}`}>
                      {t.emoji} {t.label}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {t.progress}/{t.target}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-slate-100 px-5 pt-3 pb-4">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">Daily jobs</div>
                <div className="text-[11px] font-medium text-slate-500">all four: +{DAILY_BONUS} 🪙 bonus</div>
              </div>
              <ul className="space-y-1">
                {DAILY_JOBS.map((j) => {
                  const p = daily.prog[j.id] ?? 0
                  const ok = daily.done.includes(j.id)
                  return (
                    <li key={j.id} className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${ok ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{ok ? '✓' : ''}</span>
                      <span className={`flex-1 ${ok ? 'text-slate-400 line-through' : ''}`}>
                        {j.emoji} {j.label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                        {p}/{j.target} · +{j.coins}🪙
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
                ♻️ 1 🪙 for every item in the right bin ({daily.sortPaid}/{SORT_COIN_CAP} today) · 💡 4 🪙 for each right answer at the Learning Corner · 🔧 bonus coins the first time you build each project
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
