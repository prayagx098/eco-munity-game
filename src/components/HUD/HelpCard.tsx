import { AnimatePresence, motion } from 'framer-motion'
import { BIN_LIST } from '../../state/gameData'
import { useUI } from '../../state/ui'

const CONTROLS: [string, string][] = [
  ['W A S D', 'Walk (A/D turn in 3D views)'],
  ['Shift', 'Run / ride faster'],
  ['E · Space', 'Interact · hop on / off'],
  ['Q', 'Put down what you carry'],
  ['C', 'Chat with a nearby player'],
  ['V', 'Switch camera'],
  ['T · I · M · B', 'Tasks · backpack · map · badges'],
]

/** "?" icon that opens the controls guide */
export function HelpButton() {
  const open = useUI((s) => s.helpOpen)
  const setHelp = useUI((s) => s.setHelp)
  return (
    <button onClick={() => setHelp()} className={`glass-btn ${open ? 'bg-white/30' : ''}`} aria-label="How to play" title="How to play">
      <span className="text-base font-bold">?</span>
    </button>
  )
}

export function HelpPopup() {
  const open = useUI((s) => s.helpOpen)
  const setHelp = useUI((s) => s.setHelp)
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHelp(false)}>
          <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-light w-full max-w-[min(90vw,21rem)] sm:max-w-sm max-h-[72vh] overflow-y-auto p-3.5 sm:p-4 text-xs rounded-2xl sm:rounded-3xl shadow-2xl">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-sm sm:text-base font-bold text-slate-900">How to play</div>
              <button onClick={() => setHelp(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>
            <ul className="space-y-1">
              {CONTROLS.map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-2 text-[11px]">
                  <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">{k}</kbd>
                  <span className="text-right text-slate-600">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 mb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">Things to do</div>
            <p className="leading-snug text-slate-600 text-[11px]">♻️ Sort litter · 🌱 plant trees · 💧 water plants · 🚰 fix taps · 🌾 feed animals · 🪱 turn compost · 🚲 ride eco vehicles · 🦘 hop & jump · ⚽ play football · 🐶 make friends</p>
            <div className="mt-2.5 grid grid-cols-3 gap-1 text-center text-[10px] font-bold text-white">
              {BIN_LIST.map((b) => (
                <div key={b.kind} className="rounded-xl px-1 py-1.5" style={{ background: b.color }}>
                  <div className="text-lg">{b.emoji}</div>
                  {b.label}
                  <div className="font-medium opacity-90">{b.holds}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
