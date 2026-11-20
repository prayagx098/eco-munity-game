import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { CHAPTERS, SPEAKERS, progressOf, useStory } from '../../state/story'

/** Small goal tracker under the profile: what the current chapter asks for */
export function StoryTracker() {
  const stage = useStory((s) => s.stage)
  const chapter = useStory((s) => s.chapter)
  const base = useStory((s) => s.base)
  const seen = useStory((s) => s.seen)
  const completed = useStory((s) => s.completed.length)
  const setBook = useStory((s) => s.setBook)
  const stats = useGame((s) => s.stats)
  const delivered = useGame((s) => s.delivered)
  const [open, setOpen] = useState(true)
  void base
  void seen
  void stats
  void delivered
  if (stage !== 'active' && stage !== 'outro') return null
  const ch = CHAPTERS[chapter]
  const prog = progressOf(ch)
  return (
    <div className="pointer-events-auto w-[min(60vw,15rem)] sm:w-60 rounded-xl glass shadow-lg overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left">
        <span className="text-base leading-none">{ch.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-bold tracking-wide text-emerald-300 uppercase">
            Chapter {chapter + 1}/{CHAPTERS.length} · {completed}/7 Sparks
          </span>
          <span className="block truncate text-xs font-bold">{ch.title}</span>
        </span>
        <span className="text-[10px] text-white/60">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <ul className="space-y-1 px-2.5 pb-2">
          {prog.map(({ obj, have, need, done }) => (
            <li key={obj.id} className="flex items-start gap-1.5 text-[11px] leading-tight">
              <span className={`mt-px ${done ? 'text-emerald-300' : 'text-white/50'}`}>{done ? '✔' : '○'}</span>
              <span className={`min-w-0 flex-1 ${done ? 'text-white/50 line-through' : 'text-white'}`}>
                {obj.text}
                {need > 1 && <b className="ml-1 text-amber-300">{have}/{need}</b>}
                {obj.where && !done && <span className="block text-[10px] text-sky-200/80">📍 {obj.where}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => setBook(true)} className="w-full border-t border-white/10 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10">
        📖 Open story book
      </button>
    </div>
  )
}

/** Cutscene: a speaker portrait and a typed-out line, advanced with a tap, Space, Enter or E */
export function StoryDialog() {
  const dialog = useStory((s) => s.dialog)
  const advance = useStory((s) => s.advance)
  const skip = useStory((s) => s.skip)
  const [shown, setShown] = useState(0)
  const line = dialog ? dialog.lines[dialog.i] : null
  const text = line?.text ?? ''
  const key = dialog ? `${dialog.then}-${dialog.i}` : ''

  useEffect(() => {
    setShown(0)
    if (!key) return
    const t = window.setInterval(() => setShown((n) => (n >= 400 ? n : n + 2)), 22)
    return () => window.clearInterval(t)
  }, [key])

  const next = () => {
    if (shown < text.length) setShown(text.length)
    else advance()
  }

  useEffect(() => {
    if (!dialog) return
    const onKey = (e: KeyboardEvent) => {
      if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(e.code)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (!e.repeat) next()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        skip()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const sp = line ? SPEAKERS[line.who] ?? SPEAKERS.narrator : SPEAKERS.narrator
  return (
    <AnimatePresence>
      {dialog && line && (
        <motion.div className="pointer-events-auto absolute inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-2 pb-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={next}>
          <motion.div
            key={key}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative w-full max-w-2xl cursor-pointer rounded-2xl border-2 bg-white/95 p-3 pl-24 shadow-2xl sm:p-4 sm:pl-28"
            style={{ borderColor: sp.color, minHeight: '5.5rem' }}
          >
            <div className="absolute -top-6 left-3 flex h-20 w-20 items-center justify-center rounded-full border-4 bg-white text-5xl shadow-lg sm:-top-8 sm:h-24 sm:w-24 sm:text-6xl" style={{ borderColor: sp.color }}>
              {sp.emoji}
            </div>
            <div className="text-xs font-extrabold tracking-wide uppercase sm:text-sm" style={{ color: sp.color }}>
              {sp.name}
            </div>
            <p className="mt-0.5 text-sm leading-snug font-medium text-slate-800 sm:text-base">
              {text.slice(0, shown)}
              <span className="opacity-0">{text.slice(shown)}</span>
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  skip()
                }}
                className="rounded px-1.5 py-0.5 hover:bg-slate-100"
              >
                Skip ⏩
              </button>
              <span className="animate-pulse font-semibold text-slate-500">
                {dialog.i + 1}/{dialog.lines.length} · tap or press Space ▶
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** The story book: every chapter, the Sparks you found, and a certificate at the end */
export function StoryBook() {
  const open = useStory((s) => s.bookOpen)
  const setBook = useStory((s) => s.setBook)
  const chapter = useStory((s) => s.chapter)
  const stage = useStory((s) => s.stage)
  const completed = useStory((s) => s.completed)
  const restart = useStory((s) => s.restart)
  const name = useGame((s) => s.profile.name)
  const saved = useStory((s) => s.saved)
  const [confirm, setConfirm] = useState(false)
  const finished = stage === 'finished'
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-indigo-950/50 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBook(false)}>
          <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="hud-card flex max-h-[80vh] w-[min(92vw,30rem)] flex-col overflow-hidden rounded-2xl p-3.5 shadow-2xl sm:rounded-3xl sm:p-4">
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">📖 The Green Heart</h2>
                <div className="text-[11px] font-medium text-slate-500">
                  {completed.length}/7 Sparks restored ·{' '}
                  {saved === 'offline' ? '⚠️ server unreachable – progress not saved' : saved === 'error' ? '⚠️ could not save' : saved === 'saving' || saved === 'loading' ? '☁️ saving…' : '☁️ saved'}
                </div>
              </div>
              <button onClick={() => setBook(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>
            <div className="mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2">
              {CHAPTERS.map((c) => (
                <span key={c.id} className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${completed.includes(c.id) ? 'shadow-[0_0_12px] ring-2 ring-white/70' : 'opacity-25 grayscale'}`} style={{ background: c.spark.color, boxShadow: completed.includes(c.id) ? `0 0 14px ${c.spark.color}` : undefined }} title={c.spark.name}>
                  {c.spark.emoji}
                </span>
              ))}
            </div>
            {finished && (
              <div className="mb-2 rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-emerald-50 p-3 text-center">
                <div className="text-3xl">🏅</div>
                <div className="text-sm font-extrabold text-slate-900">Certificate of Eco Ranger</div>
                <div className="text-xs text-slate-600">
                  <b>{name}</b> brought back all seven Sparks and saved the Green Heart of Eco-munity!
                </div>
              </div>
            )}
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {CHAPTERS.map((c, i) => {
                const done = completed.includes(c.id)
                const current = !finished && i === chapter
                const locked = !done && !current
                return (
                  <li key={c.id} className={`flex items-start gap-2 rounded-xl p-2 ${done ? 'bg-emerald-50' : current ? 'bg-amber-50 ring-2 ring-amber-300' : 'bg-slate-50'} ${locked ? 'opacity-50' : ''}`}>
                    <span className="text-2xl">{locked ? '🔒' : c.emoji}</span>
                    <div className="min-w-0 leading-tight">
                      <div className="text-xs font-bold text-slate-900">
                        Chapter {i + 1}: {c.title} {done && '✔'}
                      </div>
                      {!locked && (
                        <div className="mt-0.5 text-[11px] text-slate-600">
                          {done ? <>💡 {c.fact}</> : c.objectives.map((o) => <div key={o.id}>• {o.text}{o.where ? ` (${o.where})` : ''}</div>)}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-2 flex justify-end">
              {confirm ? (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  Restart the story from chapter 1?
                  <button className="rounded bg-rose-500 px-2 py-0.5 font-bold text-white" onClick={() => (restart(), setConfirm(false))}>
                    Yes
                  </button>
                  <button className="rounded bg-slate-200 px-2 py-0.5 font-bold" onClick={() => setConfirm(false)}>
                    No
                  </button>
                </span>
              ) : (
                <button className="text-[11px] font-semibold text-slate-400 hover:text-slate-600" onClick={() => setConfirm(true)}>
                  ↺ Restart story
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
