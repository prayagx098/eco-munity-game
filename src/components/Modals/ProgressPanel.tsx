import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { useMeta, MISSION_POOL, STREAK_BONUS, WEEK_COINS, WEEK_GOAL, todayKey, yesterdayKey, type PanelTab } from '../../state/meta'
import { GROW_SECS, TREE_RANKS, growth, stageOf } from '../../state/forest'

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'missions', label: '🎯 Missions' },
  { id: 'trees', label: '🌳 My Trees' },
]

/** the streak as the player would see it today (it lapses if they skipped a day) */
export const liveStreak = (s: { count: number; lastDay: string }) => (s.lastDay === todayKey() || s.lastDay === yesterdayKey() ? s.count : 0)

function Bar({ value, max, color = 'bg-emerald-500' }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} />
    </div>
  )
}

function Missions() {
  const missions = useMeta((m) => m.missions)
  const streak = useMeta((m) => m.streak)
  const week = useMeta((m) => m.week)
  const claim = useMeta((m) => m.claim)
  const claimWeek = useMeta((m) => m.claimWeek)
  const live = liveStreak(streak)
  const nextBonus = Object.keys(STREAK_BONUS).map(Number).find((d) => d > live)
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-100 to-amber-50 p-3 ring-1 ring-orange-200">
        <div className="text-3xl">{live > 0 ? '🔥' : '🌱'}</div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-extrabold text-orange-900">{live > 0 ? `${live}-day streak!` : 'Start a streak today'}</div>
          <div className="text-[11px] font-medium text-orange-800/80">
            Finish a mission every day to keep it going · best: {streak.best} {nextBonus ? `· ${nextBonus} days = +${STREAK_BONUS[nextBonus]} 🪙` : ''}
          </div>
        </div>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Today's missions</div>
      {missions.map((m) => {
        const def = MISSION_POOL.find((d) => d.id === m.id)
        if (!def) return null
        const done = m.got >= m.n
        return (
          <div key={m.id} className={`flex items-center gap-3 rounded-2xl p-2.5 ring-1 ${m.claimed ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-slate-200'}`}>
            <div className="text-2xl">{def.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold leading-snug text-slate-800">{def.text(m.n)}</div>
              <div className="mt-1 flex items-center gap-2">
                <Bar value={m.got} max={m.n} color={done ? 'bg-emerald-500' : 'bg-sky-500'} />
                <span className="text-[10px] font-bold tabular-nums text-slate-500">{m.got}/{m.n}</span>
              </div>
            </div>
            {m.claimed ? (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">✓ Done</span>
            ) : (
              <button
                disabled={!done}
                onClick={() => claim(m.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition active:scale-95 ${done ? 'bg-amber-400 text-amber-950 shadow' : 'bg-slate-100 text-slate-400'}`}
              >
                {done ? `Claim ${m.coins} 🪙` : `${m.coins} 🪙`}
              </button>
            )}
          </div>
        )
      })}

      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">This week</div>
      <div className="flex items-center gap-3 rounded-2xl bg-violet-50 p-2.5 ring-1 ring-violet-200">
        <div className="text-2xl">🎁</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-violet-900">Weekly chest: finish {WEEK_GOAL} missions</div>
          <div className="mt-1 flex items-center gap-2">
            <Bar value={week.done} max={WEEK_GOAL} color="bg-violet-500" />
            <span className="text-[10px] font-bold tabular-nums text-violet-700">{Math.min(week.done, WEEK_GOAL)}/{WEEK_GOAL}</span>
          </div>
        </div>
        {week.claimed ? (
          <span className="rounded-full bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-700">✓ Opened</span>
        ) : (
          <button disabled={week.done < WEEK_GOAL} onClick={claimWeek} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold active:scale-95 ${week.done >= WEEK_GOAL ? 'bg-violet-500 text-white shadow' : 'bg-white text-slate-400'}`}>
            {week.done >= WEEK_GOAL ? `Open ${WEEK_COINS} 🪙` : `${WEEK_COINS} 🪙`}
          </button>
        )}
      </div>
      <p className="text-center text-[10px] font-medium text-slate-400">New missions arrive every day. Unclaimed ones are replaced at midnight.</p>
    </div>
  )
}

function Trees() {
  const saplings = useGame((s) => s.saplings)
  const elapsed = useGame((s) => Math.floor(s.elapsed / 3) * 3)
  const forest = useMeta((m) => m.forest)
  const me = useGame((s) => s.profile.name)
  const rank = [...TREE_RANKS].reverse().find((r) => forest.planted >= r.at)
  const next = TREE_RANKS.find((r) => r.at > forest.planted)
  const planted = saplings.filter((p) => p.planted)
  const grown = planted.filter((p) => growth(p, elapsed) >= 1).length
  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-100 to-lime-50 p-3 ring-1 ring-emerald-200">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{rank?.emoji ?? '🌰'}</div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-extrabold text-emerald-900">{rank?.name ?? 'Plant your first tree!'}</div>
            <div className="text-[11px] font-medium text-emerald-800/80">
              {forest.planted} planted · {forest.harvested} harvested {next ? `· next rank at ${next.at}` : '· top rank!'}
            </div>
          </div>
        </div>
        {next && (
          <div className="mt-2">
            <Bar value={forest.planted} max={next.at} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <span>The Pine Forest</span>
        <span>
          {planted.length}/{saplings.length} plots · {grown} fully grown
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {saplings.map((p, i) => {
          const g = growth(p, elapsed)
          const st = stageOf(g)
          return (
            <div key={p.id} className={`rounded-xl p-2 ring-1 ${p.planted ? (p.by === me ? 'bg-emerald-50 ring-emerald-300' : 'bg-white ring-slate-200') : 'bg-slate-50 ring-slate-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.planted ? st.emoji : '🟫'}</span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[11px] font-bold text-slate-800">{p.planted ? `${st.name}${p.by ? ` · ${p.by === me ? 'you' : p.by}` : ''}` : `Plot ${i + 1}: free`}</div>
                  <div className="text-[10px] font-medium text-slate-500">{p.planted ? (g >= 1 ? 'Ready to harvest 🧺' : `${Math.round(g * 100)}% grown`) : 'Ready for a new tree'}</div>
                </div>
              </div>
              {p.planted && g < 1 && <div className="mt-1.5"><Bar value={g} max={1} /></div>}
            </div>
          )
        })}
      </div>
      <p className="rounded-xl bg-sky-50 p-2.5 text-[11px] font-medium leading-snug text-sky-900 ring-1 ring-sky-200">
        🌍 <b>The forest never overflows.</b> It has {saplings.length} plots right now (more open up as the town grows, never more than the forest can hold). A tree takes about {Math.round(GROW_SECS / 60 * 10) / 10} minutes to grow. Once it's fully grown you can <b>harvest its seeds</b> for coins, and the plot is free to plant again. Your total keeps growing forever in your record above.
      </p>
    </div>
  )
}

export function ProgressPanel() {
  const panel = useMeta((m) => m.panel)
  const setPanel = useMeta((m) => m.setPanel)
  const claimable = useMeta((m) => m.missions.filter((x) => !x.claimed && x.got >= x.n).length)
  useEffect(() => {
    if (panel) useMeta.getState().ensureToday()
  }, [panel])
  return (
    <AnimatePresence>
      {panel && (
        <motion.div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-indigo-950/45 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanel(null)}>
          <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="hud-card flex max-h-[82vh] w-[min(94vw,30rem)] flex-col overflow-hidden rounded-3xl p-3.5 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">My Journey</h2>
              <button onClick={() => setPanel(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <div className="mb-2.5 flex gap-1 rounded-2xl bg-slate-100 p-1">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setPanel(t.id)} className={`relative flex-1 rounded-xl px-2 py-1.5 text-[12px] font-bold transition ${panel === t.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
                  {t.label}
                  {t.id === 'missions' && claimable > 0 && <span className="absolute -right-0.5 -top-1 rounded-full bg-amber-400 px-1 text-[9px] font-extrabold text-amber-950">{claimable}</span>}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {panel === 'missions' && <Missions />}
              {panel === 'trees' && <Trees />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
