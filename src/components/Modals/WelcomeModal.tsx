import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { HAIR_COLORS, PANTS_COLORS, SHIRT_COLORS } from '../../state/gameData'
import { Icon } from '../UI/Icons'
import { requestFullscreenSafe } from '../../utils/fullscreen'
import { useAuth } from '../../state/auth'

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

function HeroCreator() {
  const account = useAuth((a) => a.user)
  const screen = useGame((s) => s.screen)
  const start = useGame((s) => s.start)
  const saved = useGame((s) => s.profile)
  const others = useGame((s) => Object.values(s.remotes).map((r) => r.name).join(', '))
  const [name, setName] = useState(saved.name === 'Eco Hero' ? '' : saved.name)
  const [shirt, setShirt] = useState(saved.shirt)
  const [hair, setHair] = useState(saved.hair)
  const [pants, setPants] = useState(saved.pants)

  const go = () => {
    requestFullscreenSafe()
    start({ name: name.trim().slice(0, 14) || 'Eco Hero', shirt, hair, pants })
  }

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
              {account && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                  <span>✅ Logged in as {account.username} · your coins & progress are saved</span>
                  <button onClick={() => void useAuth.getState().logout()} className="ml-2 underline">
                    Log out
                  </button>
                </div>
              )}
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

/** Log in / sign up / play as a guest */
function AuthGate() {
  const screen = useGame((s) => s.screen)
  const status = useAuth((a) => a.status)
  const error = useAuth((a) => a.error)
  const busy = useAuth((a) => a.busy)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const submit = () => {
    const a = useAuth.getState()
    if (busy || !username.trim() || !password) return
    void (mode === 'login' ? a.login(username, password) : a.register(username, password))
  }
  return (
    <AnimatePresence>
      {screen === 'welcome' && (
        <motion.div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gradient-to-br from-emerald-900/50 via-slate-900/55 to-sky-900/50 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ scale: 0.97, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="glass-light w-[min(92vw,24rem)] rounded-2xl p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-0.5 text-[10px] font-semibold tracking-widest text-emerald-600 uppercase">Eco-munity</div>
            {status === 'checking' ? (
              <div className="py-4 text-center">
                <div className="mb-2 animate-pulse text-4xl">🌍</div>
                <div className="text-sm font-bold text-slate-900">Signing you in…</div>
                <p className="mt-1 text-[11px] text-slate-500">The game server may need up to 30 seconds to wake up.</p>
                <button onClick={() => useAuth.getState().playAsGuest()} className="mt-3 text-xs font-semibold text-slate-500 underline">
                  Play as guest instead
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{mode === 'login' ? 'Welcome back!' : 'Make your account'}</h1>
                <p className="mt-0.5 mb-3 text-xs text-slate-500">Your coins, items, projects and story are saved to your account.</p>
                <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
                  {(['login', 'register'] as const).map((m) => (
                    <button key={m} onClick={() => (setMode(m), useAuth.getState().clearError())} className={`rounded-lg py-1.5 transition ${mode === m ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
                      {m === 'login' ? 'Log in' : 'Sign up'}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2.5">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Nickname</span>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} maxLength={20} autoCapitalize="none" autoComplete="username" placeholder="e.g. green_panda" className={INPUT} autoFocus />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Password</span>
                    <div className="relative">
                      <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} type={show ? 'text' : 'password'} maxLength={64} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="at least 6 characters" className={INPUT} />
                      <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-slate-400" aria-label="Show password">
                        {show ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </label>
                </div>
                {mode === 'register' && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] font-medium text-amber-800">🔒 Use a made-up nickname – never your real name, school or contact details.</p>}
                {error && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[11px] font-semibold text-rose-700">⚠️ {error}</p>}
                <button onClick={submit} disabled={busy || !username.trim() || !password} className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50">
                  {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
                </button>
                <div className="mt-3 border-t border-slate-100 pt-3 text-center">
                  <button onClick={() => useAuth.getState().playAsGuest()} className="text-xs font-semibold text-slate-500 underline">
                    Play as guest
                  </button>
                  <p className="mt-0.5 text-[10px] text-slate-400">Guests keep their story on this device only until they sign up.</p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function WelcomeModal() {
  const status = useAuth((a) => a.status)
  return status === 'in' || status === 'guest' ? <HeroCreator /> : <AuthGate />
}
