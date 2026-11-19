import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { QUIZ } from '../../state/gameData'
import { QUIZ_CAP, QUIZ_COIN, dailyOf } from '../../state/earn'

/** A quick question at the Learning Corner chalkboard: a right answer earns coins */
export function QuizModal() {
  const idx = useGame((s) => s.quiz)
  const answer = useGame((s) => s.answerQuiz)
  const close = useGame((s) => s.closeQuiz)
  const daily = useGame((s) => dailyOf(s.wallet))
  const [picked, setPicked] = useState<number | null>(null)
  const [result, setResult] = useState<'right' | 'wrong' | null>(null)
  useEffect(() => {
    setPicked(null)
    setResult(null)
  }, [idx])
  const q = idx === null ? null : QUIZ[idx]
  const left = QUIZ_CAP - daily.quizPaid
  return (
    <AnimatePresence>
      {q && (
        <motion.div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-3 sm:p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-light w-full max-w-[min(90vw,21rem)] sm:max-w-sm overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl" role="dialog" aria-label="Learning Corner quiz">
            <div className="bg-emerald-700 px-4 py-2.5 text-white">
              <div className="text-[10px] sm:text-xs font-semibold tracking-wide uppercase opacity-85">📚 Learning Corner</div>
              <div className="text-sm sm:text-base font-bold leading-snug">{q.q}</div>
            </div>
            <div className="space-y-1.5 p-3 sm:p-4">
              {q.options.map((o, i) => {
                const right = result && i === q.answer
                const wrong = result === 'wrong' && i === picked
                return (
                  <button
                    key={o}
                    disabled={result !== null}
                    onClick={() => {
                      setPicked(i)
                      setResult(answer(i))
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-xs sm:text-sm font-medium transition ${right ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : wrong ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}
                  >
                    {o}
                  </button>
                )
              })}
              {result && (
                <div className={`rounded-xl p-2.5 text-xs ${result === 'right' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <b>{result === 'right' ? (left > 0 ? `Correct! +${QUIZ_COIN} 🪙` : 'Correct! (today’s quiz coins used up)') : 'Not quite.'}</b> {q.fact}
                </div>
              )}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                <span>
                  {left > 0 ? `${left} paid answers left` : 'No paid answers left'}
                </span>
                <button onClick={close} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                  {result ? 'Done' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
