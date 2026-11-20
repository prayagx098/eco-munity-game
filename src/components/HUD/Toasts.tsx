import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'

const STYLES = {
  good: 'border-l-4 border-l-emerald-400',
  bad: 'border-l-4 border-l-amber-400',
  info: 'border-l-4 border-l-sky-400',
  team: 'border-l-4 border-l-violet-400',
  badge: 'border-l-4 border-l-yellow-300',
}

/** Feedback messages with eco tips */
export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const dismiss = useGame((s) => s.dismissToast)
  return (
    <div className="pointer-events-none flex w-[min(52vw,15rem)] sm:w-64 flex-col items-end gap-1">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            onClick={() => dismiss(t.id)}
            className={`glass pointer-events-auto flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1 text-left shadow-lg ${STYLES[t.kind]}`}
          >
            <span className={`leading-none shrink-0 ${t.kind === 'badge' ? 'text-xl' : 'text-lg'}`}>{t.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs leading-snug font-semibold">{t.title}</span>
              {t.text && <span className="block text-[11px] leading-tight font-normal text-white/80">{t.text}</span>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
