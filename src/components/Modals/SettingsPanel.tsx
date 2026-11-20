import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame, isNight } from '../../state/gameStore'
import { DAY_LENGTH } from '../../state/gameData'
import { PRESETS, useSettings, type Quality } from '../../state/settings'
import { useAuth } from '../../state/auth'

type Tab = 'game' | 'graphics' | 'sound' | 'access' | 'account'

/** Who am I playing as, log out, change password, delete my data */
function AccountTab() {
  const status = useAuth((a) => a.status)
  const user = useAuth((a) => a.user)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [delPw, setDelPw] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (status !== 'in' || !user)
    return (
      <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
        You are playing as a guest, so your coins and story are only kept on this device. Log out of the guest session (reload the page) and choose <b>Sign up</b> to keep them in an account – your guest progress is carried over.
        <button onClick={() => window.location.reload()} className="mt-2 block w-full rounded-lg bg-amber-500 py-1.5 text-white">
          Go to sign up
        </button>
      </div>
    )
  const field = 'w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-400'
  return (
    <>
      <div className="rounded-xl bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
        ✅ Logged in as <b>{user.username}</b>
        <div className="mt-0.5 text-[10px] font-medium text-emerald-700">Coins, items, projects, badges and story are saved to your account automatically.</div>
      </div>
      <button onClick={() => void useAuth.getState().logout()} className="w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">
        Log out
      </button>
      <Section title="Change password">
        <div className="grid gap-1.5">
          <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="Current password" className={field} autoComplete="current-password" />
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (6+ characters)" className={field} autoComplete="new-password" />
          <button
            onClick={async () => {
              const err = await useAuth.getState().changePassword(oldPw, newPw)
              setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Password changed.' })
              if (!err) (setOldPw(''), setNewPw(''))
            }}
            className="rounded-lg bg-indigo-500 py-1.5 text-xs font-bold text-white hover:bg-indigo-600"
          >
            Change password
          </button>
        </div>
      </Section>
      <Section title="Delete my account">
        {confirmDelete ? (
          <div className="grid gap-1.5">
            <p className="text-[11px] font-semibold text-rose-700">This erases your coins, items, projects and story for good.</p>
            <input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} placeholder="Type your password" className={field} />
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg bg-slate-100 py-1.5 text-xs font-bold">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const err = await useAuth.getState().deleteAccount(delPw)
                  if (err) setMsg({ ok: false, text: err })
                  else window.location.reload()
                }}
                className="rounded-lg bg-rose-500 py-1.5 text-xs font-bold text-white"
              >
                Delete forever
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="w-full rounded-lg bg-rose-50 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Delete my account & data
          </button>
        )}
      </Section>
      {msg && <p className={`rounded-lg p-2 text-[11px] font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p>}
    </>
  )
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 select-none">
      <span className="leading-tight">
        <span className="block text-xs sm:text-sm font-bold text-slate-800">{label}</span>
        {hint && <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </label>
  )
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block py-1">
      <span className="flex justify-between text-xs sm:text-sm font-bold text-slate-800">
        {label}
        <span className="text-slate-400 font-semibold">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
      />
    </label>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">{title}</div>
      {children}
    </div>
  )
}

/** Teacher/player settings with tabs: game, graphics, sound, accessibility */
export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('game')
  const paused = useGame((s) => s.paused)
  const settings = useGame((s) => s.settings)
  const isHost = useGame((s) => s.isHost)
  const togglePause = useGame((s) => s.togglePause)
  const update = useGame((s) => s.updateSettings)
  const reset = useGame((s) => s.reset)
  const night = useGame((s) => isNight(s.clock))

  const st = useSettings()
  const [fps, setFps] = useState(0)
  useEffect(() => {
    if (!open || tab !== 'graphics') return
    const id = setInterval(() => setFps((window as unknown as { __ecoFps?: number }).__ecoFps ?? 0), 500)
    return () => clearInterval(id)
  }, [open, tab])

  const qualityBtn = (q: 'auto' | Quality, label: string) => (
    <button
      key={q}
      onClick={() => st.setQuality(q)}
      className={`rounded-xl py-1.5 text-xs sm:text-sm font-bold transition active:scale-95 ${
        st.quality === q ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  )

  const d = st.device

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-xs pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="hud-card flex max-h-[82vh] w-[min(92vw,23rem)] sm:w-84 flex-col overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 shrink-0">
              <span className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>⚙️</span> Settings
              </span>
              <button
                onClick={onClose}
                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition text-base font-bold"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            {/* Tab selector */}
            <div className="mx-3.5 mt-2.5 grid grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1 text-[11px] sm:text-xs font-bold shrink-0">
              {(
                [
                  ['game', '🎮 Game'],
                  ['graphics', '🖥️ Look'],
                  ['sound', '🔊 Audio'],
                  ['access', '♿ Access'],
                  ['account', '👤 Me'],
                ] as [Tab, string][]
              ).map(([t, l]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg py-1.5 transition text-center ${
                    tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Content: scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
              {tab === 'game' && (
                <>
                  <button
                    onClick={togglePause}
                    className={`toy-btn mb-3 w-full bg-gradient-to-b py-2 text-xs sm:text-sm ${
                      paused ? 'from-green-400 to-green-600' : 'from-slate-400 to-slate-500'
                    }`}
                  >
                    {paused ? '▶ Resume game' : '⏸ Pause game'}
                  </button>
                  {!isHost && (
                    <p className="mb-2 rounded-lg bg-cyan-50 p-2 text-[10px] sm:text-[11px] font-semibold text-cyan-800">
                      🔗 You joined another tab’s town. World settings come from the host tab.
                    </p>
                  )}
                  <Section title="World">
                    <Toggle label="Day & night cycle" value={settings.dayNight} onChange={(v) => isHost && update({ dayNight: v })} />
                    <Toggle label="Weather" hint="Wind, rain and storms" value={settings.weather} onChange={(v) => isHost && update({ weather: v })} />
                    <Toggle label="Show eco tips" value={settings.showTips} onChange={(v) => update({ showTips: v })} />
                    {isHost && (
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() =>
                            useGame.setState((s) => ({
                              clock: Math.floor(s.clock / DAY_LENGTH) * DAY_LENGTH + DAY_LENGTH * (night ? 1.05 : 0.75),
                            }))
                          }
                          className="rounded-xl bg-indigo-50 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition active:scale-98"
                        >
                          {night ? '☀️ Skip to morning' : '🌙 Skip to night'}
                        </button>
                        <button
                          onClick={() =>
                            useGame.setState((s) => ({
                              weather: {
                                ...s.weather,
                                raining: 30,
                                storm: s.weather.raining > 0,
                                windTarget: s.weather.raining > 0 ? 0.95 : 0.5,
                              },
                            }))
                          }
                          className="rounded-xl bg-sky-50 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition active:scale-98"
                        >
                          🌧️ Make it rain
                        </button>
                      </div>
                    )}
                  </Section>
                  <Section title="🛠️ Testing Hacks">
                    <button
                      onClick={() => {
                        useGame.getState().addTestPoints(2000)
                        onClose()
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-2.5 px-3 text-xs sm:text-sm font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition active:scale-98"
                    >
                      <span className="text-base">⚡</span>
                      <span>+2,000 Points & Paradise Town</span>
                    </button>
                    <p className="mt-1 text-[10px] text-slate-500 font-medium text-center">
                      Adds 2,000 pts, +500 coins, max stats & triggers Paradise Tier. Shortcut: press <kbd className="bg-slate-200 px-1 py-0.5 rounded font-bold text-slate-800">H</kbd>
                    </p>
                  </Section>
                  <button
                    onClick={() => {
                      reset()
                      onClose()
                    }}
                    className="w-full mt-2 rounded-xl bg-red-50 hover:bg-red-100 py-2 text-xs sm:text-sm font-bold text-red-600 transition active:scale-98"
                  >
                    ↺ Restart {isHost ? 'game' : 'my player'}
                  </button>
                </>
              )}

              {tab === 'graphics' && (
                <>
                  <Section title="Quality">
                    <div className="grid grid-cols-4 gap-1.5">
                      {qualityBtn('auto', 'Auto')}
                      {qualityBtn('low', 'Low')}
                      {qualityBtn('medium', 'Mid')}
                      {qualityBtn('high', 'High')}
                    </div>
                    <p className="mt-2 text-[11px] sm:text-xs font-semibold text-slate-500">
                      Now using <b className="text-indigo-600">{PRESETS[st.resolved].label}</b>
                      {st.quality === 'auto' && (st.autoDowngrade ? ' (lowered because the game was slow)' : ' (picked for this device)')} · {fps} FPS
                    </p>
                  </Section>
                  <Section title="What each level does">
                    <ul className="space-y-1 text-[11px] sm:text-xs text-slate-600">
                      <li>
                        <b>Low:</b> no shadows or grass, light rain. Best for older mobile phones & Chromebooks.
                      </li>
                      <li>
                        <b>Mid:</b> shadows, swaying grass, puddles, cloud shadows, birds.
                      </li>
                      <li>
                        <b>High:</b> sharper, denser grass & rain, night-time glow.
                      </li>
                    </ul>
                  </Section>
                  <Section title="Your device">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-xl bg-slate-50 p-2.5 text-[10px] sm:text-[11px]">
                      <dt className="font-bold text-slate-500">Graphics</dt>
                      <dd className="truncate text-slate-800" title={d.gpu}>
                        {d.gpu}
                      </dd>
                      <dt className="font-bold text-slate-500">WebGL 2</dt>
                      <dd className="text-slate-800">{d.webgl2 ? '✅ yes' : '⚠️ no'}</dd>
                      <dt className="font-bold text-slate-500">CPU cores</dt>
                      <dd className="text-slate-800">{d.cores}</dd>
                      <dt className="font-bold text-slate-500">Memory</dt>
                      <dd className="text-slate-800">{d.memory ? `${d.memory} GB` : 'not reported'}</dd>
                      <dt className="font-bold text-slate-500">Screen</dt>
                      <dd className="text-slate-800">
                        {d.screen} @{d.pixelRatio}x{d.touch ? ' · touch' : ''}
                      </dd>
                      <dt className="font-bold text-slate-500">Suggested</dt>
                      <dd className="text-slate-800">
                        {PRESETS[d.tier].label}
                      </dd>
                    </dl>
                  </Section>
                </>
              )}

              {tab === 'account' && <AccountTab />}

              {tab === 'sound' && (
                <>
                  <Toggle label="Mute all sound" value={st.audio.muted} onChange={(v) => st.setAudio({ muted: v })} />
                  <Slider label="Master volume" value={st.audio.master} onChange={(v) => st.setAudio({ master: v })} />
                  <Slider label="Music" value={st.audio.music} onChange={(v) => st.setAudio({ music: v })} />
                  <Slider label="Sound effects" value={st.audio.sfx} onChange={(v) => st.setAudio({ sfx: v })} />
                  <Slider label="Nature ambience" value={st.audio.ambience} onChange={(v) => st.setAudio({ ambience: v })} />
                  <Toggle label="Footstep sounds" value={st.audio.footsteps} onChange={(v) => st.setAudio({ footsteps: v })} />
                  <p className="mt-2 text-[10px] sm:text-[11px] font-medium text-slate-500">Tip: set Music or Nature sounds to 0% to turn them off completely.</p>
                </>
              )}

              {tab === 'access' && (
                <>
                  <Toggle label="Colour-blind helpers" hint="Shapes & letters on bins (C / R / T)" value={st.access.colorblind} onChange={(v) => st.setAccess({ colorblind: v })} />
                  <Toggle label="High contrast" hint="Stronger outlines and darker text" value={st.access.highContrast} onChange={(v) => st.setAccess({ highContrast: v })} />
                  <Toggle label="Reduce motion" hint="Fewer animations, softer lightning flashes" value={st.access.reducedMotion} onChange={(v) => st.setAccess({ reducedMotion: v })} />
                  <Toggle label="Sound captions" hint="Show text for bells, thunder and chat" value={st.access.captions} onChange={(v) => st.setAccess({ captions: v })} />
                  <Toggle label="Always run" hint="Run without holding Shift (Shift to walk)" value={st.access.alwaysRun} onChange={(v) => st.setAccess({ alwaysRun: v })} />
                  <Section title="Text & button size">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        [1, 'Normal'],
                        [1.15, 'Large'],
                        [1.3, 'Extra'],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => st.setAccess({ textScale: v as number })}
                          className={`rounded-xl py-1.5 text-xs sm:text-sm font-bold transition active:scale-98 ${
                            st.access.textScale === v ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </Section>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
