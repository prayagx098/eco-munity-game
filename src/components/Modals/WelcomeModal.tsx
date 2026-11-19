import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { HAIR_COLORS, PANTS_COLORS, SHIRT_COLORS } from '../../state/gameData'
import { Icon } from '../UI/Icons'

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 text-xs font-medium text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className={`h-6 w-6 rounded-full transition hover:scale-110 ${value === c ? 'ring-2 ring-slate-900 ring-offset-2' : 'ring-1 ring-black/10'}`}
            style={{ background: c }}
            aria-label={`${label} ${c}`}
          />
        ))}
      </div>
    </div>
  )
}

/** Preview of your character */
function AvatarPreview({ shirt, hair, pants }: { shirt: string; hair: string; pants: string }) {
  return (
    <svg viewBox="0 0 100 150" className="h-32 w-24 sm:h-40 sm:w-28 drop-shadow-[0_10px_12px_rgba(15,23,42,0.18)]">
      <rect x="28" y="12" width="44" height="14" rx="6" fill={hair} />
      <rect x="30" y="18" width="40" height="38" rx="12" fill="#ffd23f" />
      <rect x="28" y="16" width="10" height="20" rx="4" fill={hair} />
      <circle cx="42" cy="36" r="3" fill="#111" />
      <circle cx="58" cy="36" r="3" fill="#111" />
      <path d="M42 45 q8 7 16 0" stroke="#111" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <rect x="43" y="56" width="14" height="6" fill="#f5c020" />
      <path d="M30 62 h40 l6 38 h-52 z" fill={shirt} />
      <rect x="14" y="64" width="14" height="34" rx="6" fill={shirt} transform="rotate(10 21 64)" />
      <rect x="72" y="64" width="14" height="34" rx="6" fill={shirt} transform="rotate(-10 79 64)" />
      <circle cx="18" cy="100" r="6" fill="#ffd23f" />
      <circle cx="82" cy="100" r="6" fill="#ffd23f" />
      <rect x="24" y="100" width="52" height="8" fill={pants} />
      <rect x="25" y="108" width="23" height="34" rx="3" fill={pants} />
      <rect x="52" y="108" width="23" height="34" rx="3" fill={pants} />
    </svg>
  )
}

function Field({ label, icon, children }: { label: string; icon: 'users' | 'school'; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon name={icon} size={13} />
        {label}
      </span>
      {children}
    </label>
  )
}

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15'

export function WelcomeModal() {
  const screen = useGame((s) => s.screen)
  const start = useGame((s) => s.start)
  const saved = useGame((s) => s.profile)
  const others = useGame((s) => Object.values(s.remotes).map((r) => r.name).join(', '))
  const [name, setName] = useState(saved.name === 'Eco Hero' ? '' : saved.name)
  const [shirt, setShirt] = useState(saved.shirt)
  const [hair, setHair] = useState(saved.hair)
  const [pants, setPants] = useState(saved.pants)

  const go = () => start({ name: name.trim().slice(0, 14) || 'Eco Hero', shirt, hair, pants })

  return (
    <AnimatePresence>
      {screen === 'welcome' && (
        <motion.div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gradient-to-br from-emerald-900/50 via-slate-900/55 to-sky-900/50 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            initial={{ scale: 0.97, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="glass-light grid w-[min(92vw,40rem)] max-h-[82vh] overflow-y-auto rounded-2xl sm:rounded-3xl md:grid-cols-[12rem_1fr] shadow-2xl"
          >
            {/* left: preview */}
            <div className="flex flex-col items-center justify-center gap-3 bg-slate-50 px-4 py-5 sm:px-5 sm:py-6" style={{ backgroundImage: `radial-gradient(circle at 50% 38%, ${shirt}22, transparent 65%)` }}>
              <motion.div key={shirt + hair + pants} initial={{ scale: 0.96 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
                <AvatarPreview shirt={shirt} hair={hair} pants={pants} />
              </motion.div>
              <div className="text-center leading-tight">
                <div className="text-sm font-semibold text-slate-900">{name.trim() || 'Eco Hero'}</div>
                <div className="text-[11px] text-slate-500">CYBERSQUARE</div>
              </div>
            </div>

            {/* right: form */}
            <div className="flex flex-col p-4 sm:p-6">
              <div className="mb-0.5 text-[10px] font-semibold tracking-widest text-emerald-600 uppercase">Eco-munity</div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Create your hero</h1>
              <p className="mt-0.5 mb-4 text-xs text-slate-500">Explore the town, team up with friends and make it clean, green and happy.</p>

              <div className="grid gap-3">
                <Field label="Your name" icon="users">
                  <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} maxLength={14} placeholder="Eco Hero" className={INPUT} autoFocus />
                </Field>
              </div>

              <div className="mt-4 space-y-2.5">
                <Swatches label="Shirt" colors={SHIRT_COLORS} value={shirt} onPick={setShirt} />
                <Swatches label="Hair" colors={HAIR_COLORS} value={hair} onPick={setHair} />
                <Swatches label="Pants" colors={PANTS_COLORS} value={pants} onPick={setPants} />
              </div>

              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                {[
                  ['WASD', 'walk'],
                  ['Shift', 'run'],
                  ['E', 'interact'],
                  ['V', 'camera'],
                  ['T', 'tasks'],
                  ['C', 'chat'],
                ].map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1">
                    <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">{k}</kbd>
                    {v}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${others ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {others ? `In town now: ${others}` : 'Open another tab to play together'}
                </div>
                <button onClick={go} className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600 active:scale-[0.98]">
                  Start exploring
                  <Icon name="play" size={13} fill />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
