import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { CHAT_EMOJIS, QUICK_PHRASES } from '../../state/gameData'
import { keys } from '../../state/sceneRegistry'
import { MinifigAvatar } from '../UI/Avatars'

const NO_MESSAGES: never[] = []

/**
 * Proximity chat. Opens when you're next to another player (press C).
 * Messages also pop up as speech bubbles above heads in the 3D world.
 */
export function ChatPanel() {
  const mateId = useGame((s) => s.chatWith)
  const mate = useGame((s) => (s.chatWith ? s.remotes[s.chatWith] : undefined))
  const msgs = useGame((s) => (s.chatWith ? s.chats[s.chatWith] : undefined)) ?? NO_MESSAGES
  const typing = false
  const profile = useGame((s) => s.profile)
  const send = useGame((s) => s.sendChat)
  const close = useGame((s) => s.closeChat)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mateId) return
    keys.clear() // stop walking while you type
    const t = setTimeout(() => input.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [mateId])

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [msgs.length, typing])

  const submit = (t = text) => {
    if (!t.trim()) return
    send(t)
    setText('')
    input.current?.focus()
  }

  return (
    <AnimatePresence>
      {mateId && mate && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          className="hud-card pointer-events-auto flex h-[19rem] max-h-[46vh] w-[min(90vw,18.5rem)] sm:w-80 sm:h-[22rem] flex-col overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 sm:py-2" style={{ background: '#a5f3fc' }}>
            <MinifigAvatar hair={mate.hair} shirt={mate.shirt} bg="#ffffff" size={34} />
            <div className="flex-1 min-w-0 leading-tight">
              <div className="truncate text-xs sm:text-sm font-bold text-slate-900">{mate.name}</div>
              <div className="truncate text-[10px] font-semibold text-slate-600">🧑 Player · nearby</div>
            </div>
            <button onClick={close} className="ml-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white/80 text-xs font-bold text-slate-600 hover:bg-white" title="Close (Esc)">
              ✕
            </button>
          </div>

          <div ref={list} className="flex-1 space-y-1.5 overflow-y-auto bg-slate-50 px-2.5 py-2">
            <div className="mx-auto w-fit rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700">💚 Be kind: friendly words earn bonus points!</div>
            {msgs.map((m) => {
              const mine = m.from === 'you'
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-2.5 py-1 text-xs leading-snug font-medium shadow-sm ${mine ? 'rounded-br-none bg-indigo-500 text-white' : 'rounded-bl-none bg-white text-slate-800'}`}>
                    {!mine && <div className="text-[10px] font-bold text-slate-400">{mate.name}</div>}
                    {mine && <div className="text-[10px] font-bold text-indigo-200">{profile.name}</div>}
                    {m.text}
                    {m.flagged && <div className="mt-0.5 text-[10px] font-semibold text-amber-200">Some words were hidden. Let’s keep chat kind 💚</div>}
                  </div>
                </motion.div>
              )
            })}
            {typing && (
              <div className="flex">
                <div className="flex gap-1 rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white px-2 pt-1.5 pb-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {QUICK_PHRASES.map((q) => (
                <button key={q} onClick={() => submit(q)} className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100">
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 pb-1">
              {CHAT_EMOJIS.map((e) => (
                <button key={e} onClick={() => setText((t) => t + e)} className="rounded px-1 text-sm hover:bg-slate-100">
                  {e}
                </button>
              ))}
            </div>
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              <input
                ref={input}
                value={text}
                maxLength={140}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Message ${mate.name}…`}
                className="flex-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button type="submit" className="toy-btn bg-gradient-to-b from-indigo-400 to-indigo-600 px-3 text-xs py-1">
                Send
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
