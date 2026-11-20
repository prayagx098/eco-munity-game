import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { HAIR_COLORS, PANTS_COLORS, SHIRT_COLORS } from '../../state/gameData'
import { requestFullscreenSafe } from '../../utils/fullscreen'
import { useAuth } from '../../state/auth'

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15'

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const DEFAULT_LOOK = { shirt: '#3b82f6', hair: '#7c3f12', pants: '#1e3a8a' }

/** No character creator: your nickname is your name, and a first-time player gets a random simple look. */
function AutoStart() {
  const screen = useGame((s) => s.screen)
  const user = useAuth((a) => a.user)
  const started = useRef(false)
  useEffect(() => {
    if (screen !== 'welcome' || started.current) return
    started.current = true
    const g = useGame.getState()
    const saved = g.profile
    const neverCustomised = saved.shirt === DEFAULT_LOOK.shirt && saved.hair === DEFAULT_LOOK.hair && saved.pants === DEFAULT_LOOK.pants
    const look = neverCustomised ? { shirt: pick(SHIRT_COLORS), hair: pick(HAIR_COLORS), pants: pick(PANTS_COLORS) } : { shirt: saved.shirt, hair: saved.hair, pants: saved.pants }
    const name = user ? user.username.slice(0, 14) : `Guest${Math.floor(100 + Math.random() * 900)}`
    g.start({ name, ...look })
  }, [screen, user])
  return null
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
    requestFullscreenSafe()
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
                <button onClick={() => (requestFullscreenSafe(), useAuth.getState().playAsGuest())} className="mt-3 text-xs font-semibold text-slate-500 underline">
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
                  <button onClick={() => (requestFullscreenSafe(), useAuth.getState().playAsGuest())} className="text-xs font-semibold text-slate-500 underline">
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
  return status === 'in' || status === 'guest' ? <AutoStart /> : <AuthGate />
}
