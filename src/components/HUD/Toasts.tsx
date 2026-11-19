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
    <div className="pointer-events-none flex w-[min(88vw,19rem)] sm:w-80 flex-col items-center gap-1.5">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: t.kind === 'badge' ? [1, 1.05, 1] : 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            onClick={() => dismiss(t.id)}
            className={`glass pointer-events-auto flex w-full items-start gap-2.5 rounded-xl px-3 py-1.5 text-left shadow-lg ${STYLES[t.kind]}`}
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
