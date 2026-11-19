import { useGame, clockLabel, dayPhase, isNight, getTownEcoStatus } from '../../state/gameStore'
import { useUI } from '../../state/ui'
import { useView, VIEW_LABELS } from '../../state/viewMode'
import { Icon, type IconName } from '../UI/Icons'

/** Top-centre pill: time of day + weather, and how many players are online */
export function StatusPill() {
  const clock = useGame((s) => Math.floor(s.clock / 5) * 5)
  const raining = useGame((s) => s.weather.raining > 0)
  const storm = useGame((s) => s.weather.storm)
  const windy = useGame((s) => s.weather.wind > 0.55)
  const online = useGame((s) => Object.keys(s.remotes).length + 1)
  const stats = useGame((s) => s.stats)
  const townEco = getTownEcoStatus(stats)
  const companion = useGame((s) => s.companion)
  const night = isNight(clock)
  const p = dayPhase(clock)
  const icon = storm ? '⛈️' : raining ? '🌧️' : night ? '🌙' : p > 0.58 ? '🌇' : p < 0.05 ? '🌅' : '☀️'
  return (
    <div className="glass flex h-7 sm:h-8.5 items-center divide-x divide-white/15 text-[10px] sm:text-xs font-semibold px-0.5 rounded-full shadow-lg">
      <div className="flex items-center gap-1.5 px-2 sm:px-3">
        <span className="text-xs sm:text-sm leading-none">{icon}</span>
        <span className="tabular-nums">{clockLabel(clock)}</span>
        {windy && <span className="hidden sm:inline text-white/60">· windy</span>}
      </div>
      <div className="flex items-center gap-1.5 px-2 sm:px-3" title="Players online">
        <span className={`h-1.5 w-1.5 rounded-full ${online > 1 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/40'}`} />
        <span className="tabular-nums">{online}</span>
        <span className="hidden sm:inline">online</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 sm:px-2.5" title={`Town Evolution: ${townEco.label}`}>
        <span className="text-xs leading-none">{townEco.tier === 3 ? '🌟' : townEco.tier === 2 ? '🌿' : '🌱'}</span>
        <span className="hidden sm:inline font-bold" style={{ color: townEco.color }}>
          {townEco.tier === 3 ? 'Eco-Paradise' : townEco.tier === 2 ? 'Greening' : 'Developing'}
        </span>
      </div>
      {companion && (
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 text-pink-300" title={`Companion: ${companion.name}`}>
          <span className="text-xs leading-none">🐾</span>
          <span className="hidden sm:inline font-bold">{companion.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              useGame.getState().dismissCompanion()
            }}
            className="ml-0.5 rounded-full bg-white/20 hover:bg-rose-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white transition pointer-events-auto"
            title={`Tell ${companion.name} to stay / unpet`}
          >
            Stay ✕
          </button>
        </div>
      )}
    </div>
  )
}

function DockButton({ icon, label, onClick, active, badge }: { icon: IconName; label: string; onClick: () => void; active?: boolean; badge?: string | number }) {
  return (
    <button onClick={onClick} className={`group relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl transition ${active ? 'bg-white/20' : 'hover:bg-white/12'} active:scale-95`} aria-label={label} title={label}>
      <Icon name={icon} size={15} />
      {badge !== undefined && <span className="absolute -top-1 -right-1 min-w-3.5 rounded-full bg-emerald-400 px-0.5 text-center text-[8px] sm:text-[9px] leading-3.5 sm:leading-4 font-bold text-slate-900">{badge}</span>}
    </button>
  )
}

/** A small icon dock under the map */
export function Dock({ onSettings, settingsOpen }: { onSettings: () => void; settingsOpen: boolean }) {
  const tasks = useGame((s) => s.tasks)
  const badges = useGame((s) => s.badges.length)
  const toggleBadges = useGame((s) => s.toggleBadges)
  const tasksOpen = useUI((s) => s.tasksOpen)
  const helpOpen = useUI((s) => s.helpOpen)
  const setTasks = useUI((s) => s.setTasks)
  const setHelp = useUI((s) => s.setHelp)
  const mode = useView((s) => s.mode)
  const cycle = useView((s) => s.cycle)
  const coins = useGame((s) => s.wallet.coins)
  const invOpen = useGame((s) => s.invOpen)
  const setInv = useGame((s) => s.setInv)
  const done = tasks.filter((t) => t.progress >= t.target).length
  return (
    <div className="glass pointer-events-auto grid grid-cols-3 gap-0.5 p-0.5 sm:p-1 sm:flex sm:items-center sm:gap-0.5 shadow-lg">
      <DockButton icon="tasks" label="Tasks (T)" onClick={() => setTasks()} active={tasksOpen} badge={`${done}/${tasks.length}`} />
      <DockButton icon="bag" label="Backpack (I)" onClick={() => setInv()} active={invOpen} badge={coins} />
      <DockButton icon="award" label="Badges (B)" onClick={() => toggleBadges(true)} badge={badges || undefined} />
      <DockButton icon="camera" label={`Camera: ${VIEW_LABELS[mode].name} (V)`} onClick={cycle} />
      <DockButton icon="help" label="How to play" onClick={() => setHelp()} active={helpOpen} />
      <DockButton icon="settings" label="Settings" onClick={onSettings} active={settingsOpen} />
    </div>
  )
}
