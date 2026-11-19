import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame, isNight } from '../../state/gameStore'
import { DAY_LENGTH } from '../../state/gameData'
import { PRESETS, useSettings, type Quality } from '../../state/settings'


type Tab = 'game' | 'graphics' | 'sound' | 'access'

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="leading-tight">
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-[11px] font-medium text-slate-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? 'bg-green-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </label>
  )
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block py-1">
      <span className="flex justify-between text-sm font-bold">
        {label}
        <span className="text-slate-400">{Math.round(value * 100)}%</span>
      </span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-indigo-500" />
    </label>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-400 uppercase">{title}</div>
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
      className={`rounded-xl py-1.5 text-sm font-bold ${st.quality === q ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  )

  const d = st.device

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="hud-card pointer-events-auto absolute top-full right-0 z-30 mt-2 flex max-h-[62vh] w-[min(90vw,19rem)] sm:w-76 origin-top-right flex-col overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
            <span className="text-base font-bold text-slate-900">⚙️ Settings</span>
            <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Close settings">
              ✕
            </button>
          </div>
          <div className="mx-3 mt-2 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-bold">
            {(
              [
                ['game', '🎮 Game'],
                ['graphics', '🖥️ Look'],
                ['sound', '🔊 Sound'],
                ['access', '♿ Access'],
              ] as [Tab, string][]
            ).map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-1.5 ${tab === t ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto px-4 py-3">
            {tab === 'game' && (
              <>
                <button onClick={togglePause} className={`toy-btn mb-3 w-full bg-gradient-to-b py-2 ${paused ? 'from-green-400 to-green-600' : 'from-slate-400 to-slate-500'}`}>
                  {paused ? '▶ Resume game' : '⏸ Pause game'}
                </button>
                {!isHost && <p className="mb-2 rounded-lg bg-cyan-50 p-2 text-[11px] font-semibold text-cyan-800">🔗 You joined another tab’s town. World settings come from the host tab.</p>}
                <Section title="World">
                  <Toggle label="Day & night cycle" value={settings.dayNight} onChange={(v) => isHost && update({ dayNight: v })} />
                  <Toggle label="Weather" hint="Wind, rain and storms" value={settings.weather} onChange={(v) => isHost && update({ weather: v })} />
                  <Toggle label="Show eco tips" value={settings.showTips} onChange={(v) => update({ showTips: v })} />
                  {isHost && (
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => useGame.setState((s) => ({ clock: Math.floor(s.clock / DAY_LENGTH) * DAY_LENGTH + DAY_LENGTH * (night ? 1.05 : 0.75) }))}
                        className="rounded-xl bg-indigo-50 py-1.5 text-xs font-bold text-indigo-700"
                      >
                        {night ? '☀️ Skip to morning' : '🌙 Skip to night'}
                      </button>
                      <button
                        onClick={() => useGame.setState((s) => ({ weather: { ...s.weather, raining: 30, storm: s.weather.raining > 0, windTarget: s.weather.raining > 0 ? 0.95 : 0.5 } }))}
                        className="rounded-xl bg-sky-50 py-1.5 text-xs font-bold text-sky-700"
                      >
                        🌧️ Make it rain
                      </button>
                    </div>
                  )}
                </Section>
                <button
                  onClick={() => {
                    reset()
                    onClose()
                  }}
                  className="w-full rounded-xl bg-red-50 py-1.5 text-sm font-bold text-red-600"
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
                  <p className="mt-1.5 text-xs font-semibold text-slate-500">
                    Now using <b className="text-indigo-600">{PRESETS[st.resolved].label}</b>
                    {st.quality === 'auto' && (st.autoDowngrade ? ' (lowered because the game was slow)' : ' (picked for this device)')} · {fps} FPS
                  </p>
                </Section>
                <Section title="What each level does">
                  <ul className="space-y-1 text-[12px] text-slate-600">
                    <li>
                      <b>Low:</b> no shadows or grass, light rain. Best for older laptops & Chromebooks.
                    </li>
                    <li>
                      <b>Mid:</b> shadows, swaying grass, puddles, cloud shadows, smoke, birds.
                    </li>
                    <li>
                      <b>High:</b> sharper, denser grass & rain, night-time glow.
                    </li>
                  </ul>
                </Section>
                <Section title="Your device">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-xl bg-slate-50 p-2 text-[11px]">
                    <dt className="font-bold">Graphics</dt>
                    <dd className="truncate" title={d.gpu}>
                      {d.gpu}
                    </dd>
                    <dt className="font-bold">WebGL 2</dt>
                    <dd>{d.webgl2 ? '✅ yes' : '⚠️ no'}</dd>
                    <dt className="font-bold">CPU cores</dt>
                    <dd>{d.cores}</dd>
                    <dt className="font-bold">Memory</dt>
                    <dd>{d.memory ? `${d.memory} GB` : 'not reported'}</dd>
                    <dt className="font-bold">Screen</dt>
                    <dd>
                      {d.screen} @{d.pixelRatio}x{d.touch ? ' · touch' : ''}
                    </dd>
                    <dt className="font-bold">Browser</dt>
                    <dd>{d.browser}</dd>
                    <dt className="font-bold">Suggested</dt>
                    <dd>
                      {PRESETS[d.tier].label} – {d.reasons.join(', ')}
                    </dd>
                  </dl>
                </Section>
              </>
            )}

            {tab === 'sound' && (
              <>
                <Toggle label="Mute all sound" value={st.audio.muted} onChange={(v) => st.setAudio({ muted: v })} />
                <Slider label="Master volume" value={st.audio.master} onChange={(v) => st.setAudio({ master: v })} />
                <Slider label="Music" value={st.audio.music} onChange={(v) => st.setAudio({ music: v })} />
                <Slider label="Sound effects" value={st.audio.sfx} onChange={(v) => st.setAudio({ sfx: v })} />
                <Slider label="Nature sounds (wind, rain, water)" value={st.audio.ambience} onChange={(v) => st.setAudio({ ambience: v })} />
                <Toggle label="Footstep sounds" value={st.audio.footsteps} onChange={(v) => st.setAudio({ footsteps: v })} />
                <p className="mt-2 text-[11px] font-medium text-slate-500">Tip: set Music or Nature sounds to 0% to turn them off completely.</p>
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
                        className={`rounded-xl py-1.5 text-sm font-bold ${st.access.textScale === v ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}
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
      )}
    </AnimatePresence>
  )
}
