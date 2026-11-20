import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame, clockLabel, dayPhase, isNight } from '../../state/gameStore'
import { TRASH_BY_ID } from '../../state/gameData'
import { SCHOOL_NAME, ZONES } from '../../state/world'
import { useSettings } from '../../state/settings'
import { player } from '../../state/sceneRegistry'

function Key({ k }: { k: string }) {
  return <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-white/90 px-1.5 text-xs font-bold text-slate-900">{k}</kbd>
}

/** Bottom-centre: what you can do right now */
export function InteractPrompt() {
  const nearby = useGame((s) => s.nearby)
  const mateId = useGame((s) => s.nearbyMate)
  const mate = useGame((s) => (s.nearbyMate ? s.remotes[s.nearbyMate] : undefined))
  const carrying = useGame((s) => s.carrying)
  const chatOpen = useGame((s) => !!s.chatWith)
  const interact = useGame((s) => s.interact)
  const openChat = useGame((s) => s.openChat)
  const drop = useGame((s) => s.dropCarried)

  const type = carrying?.kind === 'trash' ? TRASH_BY_ID[carrying.typeId] : null
  // player.vehicle lives outside React, so watch it lightly to show a tap-able "get off" button
  const [riding, setRiding] = useState<string | null>(player.vehicle)
  useEffect(() => {
    const t = setInterval(() => setRiding((r) => (r === player.vehicle ? r : player.vehicle)), 150)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      <AnimatePresence>
        {carrying && (
          <motion.div key="carry" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass px-3.5 py-1.5 text-xs font-medium">
            Carrying {type?.emoji} <b>{type?.label}</b> · walk to a bin station · <span className="opacity-70">Q to drop</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-wrap justify-center gap-2">
        <AnimatePresence mode="popLayout">
          {riding && (
            <motion.button key="dismount" initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} onClick={interact} className="glass pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
              <Key k="E" />
              <span className="mr-1 text-xl">🚶</span>
              Get off
            </motion.button>
          )}
          {nearby && !riding && (
            <motion.button
              key={nearby.key}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={interact}
              className="glass pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-sm font-semibold hover:bg-white/10"
            >
              <Key k="E" />
              <span className="mr-1 text-xl">{nearby.emoji}</span>
              {nearby.label}
            </motion.button>
          )}
          {mate && mateId && !chatOpen && (
            <motion.button
              key={`chat-${mateId}`}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => openChat(mateId)}
              className="glass pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-sm font-semibold hover:bg-white/10"
            >
              <Key k="C" />
              💬 Chat with {mate.name}
            </motion.button>
          )}
          {carrying && !nearby && (
            <motion.button key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={drop} className="glass pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
              <Key k="Q" /> Put it down
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Big zone title when you walk into a new area */
export function ZoneBanner() {
  const zoneId = useGame((s) => s.zone)
  const [shown, setShown] = useState<string | null>(null)
  useEffect(() => {
    if (!zoneId) return
    setShown(zoneId)
    const t = setTimeout(() => setShown(null), 2200)
    return () => clearTimeout(t)
  }, [zoneId])
  const zone0 = ZONES.find((z) => z.id === shown)
  const zone = zone0 ? { ...zone0, name: zone0.id === 'school' ? SCHOOL_NAME : zone0.name, emoji: zone0.id === 'school' ? '🏫' : zone0.emoji } : undefined
  return (
    <AnimatePresence>
      {zone && (
        <motion.div key={zone.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -10 }} className="glass px-4 py-1.5 text-center text-sm font-semibold">
          {zone.emoji} {zone.name}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Time of day, weather, badges and how many players are online – all as tiny chips */
export function ClockPill() {
  const clock = useGame((s) => Math.floor(s.clock / 5) * 5)
  const raining = useGame((s) => s.weather.raining > 0)
  const storm = useGame((s) => s.weather.storm)
  const windy = useGame((s) => s.weather.wind > 0.55)
  const badges = useGame((s) => s.badges.length)
  const toggleBadges = useGame((s) => s.toggleBadges)
  const online = useGame((s) => Object.keys(s.remotes).length + 1)
  const night = isNight(clock)
  const p = dayPhase(clock)
  const icon = storm ? '⛈️' : raining ? '🌧️' : night ? '🌙' : p > 0.58 ? '🌇' : p < 0.05 ? '🌅' : '☀️'
  return (
    <div className="flex items-center gap-1.5">
      <div className="glass flex h-8 items-center gap-1.5 px-2.5 text-xs font-semibold">
        <span>{icon}</span>
        {clockLabel(clock)}
        {windy && <span title="Windy">💨</span>}
      </div>
      <button onClick={() => toggleBadges(true)} className="glass pointer-events-auto flex h-8 items-center gap-1 px-2.5 text-xs font-semibold hover:bg-white/10" title="Badges (B)">
        🏅 {badges}
      </button>
      <div className="glass flex h-8 items-center gap-1.5 px-2.5 text-xs font-semibold" title="Players online">
        <span className={`h-2 w-2 rounded-full ${online > 1 ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        {online} online
      </div>
    </div>
  )
}

/** Text captions for important sounds (accessibility) */
export function Captions() {
  const captions = useGame((s) => s.captions)
  const on = useSettings((s) => s.access.captions)
  if (!on) return null
  return (
    <div className="flex flex-col items-start gap-1">
      {captions.map((c) => (
        <div key={c.id} className="rounded-lg bg-black/75 px-3 py-1 text-sm font-semibold text-white">
          {c.text}
        </div>
      ))}
    </div>
  )
}
