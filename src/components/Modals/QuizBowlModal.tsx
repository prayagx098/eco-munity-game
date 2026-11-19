import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { QUIZ } from '../../state/gameData'

const KAHOOT_STYLES = [
  { bg: 'bg-red-500 hover:bg-red-600', border: 'border-red-600', icon: '▲', label: 'red' },
  { bg: 'bg-blue-500 hover:bg-blue-600', border: 'border-blue-600', icon: '◆', label: 'blue' },
  { bg: 'bg-amber-500 hover:bg-amber-600', border: 'border-amber-600', icon: '●', label: 'yellow' },
  { bg: 'bg-emerald-500 hover:bg-emerald-600', border: 'border-emerald-600', icon: '■', label: 'green' },
]

export function QuizBowlModal() {
  const bowl = useGame((s) => s.quizBowl)
  const answer = useGame((s) => s.answerQuizBowl)
  const restart = useGame((s) => s.startQuizBowl)
  const close = useGame((s) => s.closeQuizBowl)

  const [picked, setPicked] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'right' | 'wrong' | null>(null)
  const [timeLeft, setTimeLeft] = useState(15)

  const q = bowl ? QUIZ[bowl.questionIdx % QUIZ.length] : null

  // Reset local state on new question
  useEffect(() => {
    setPicked(null)
    setFeedback(null)
    setTimeLeft(15)
  }, [bowl?.questionIdx])

  // 15s timer countdown
  useEffect(() => {
    if (!bowl?.active || bowl.finished || feedback !== null) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timeout counts as incorrect answer
          setFeedback('wrong')
          answer(-1)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [bowl?.active, bowl?.finished, feedback, answer])

  if (!bowl?.active) return null

  return (
    <AnimatePresence>
      <motion.div
        className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.92, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[min(92vw,22rem)] sm:max-w-md overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-slate-900/95 text-white shadow-2xl"
          role="dialog"
          aria-label="Multiplayer Eco Quiz Bowl"
        >
          {bowl.finished ? (
            /* Celebration Podium Screen */
            <div className="p-5 text-center sm:p-6">
              <div className="mb-2 text-4xl animate-bounce">🏆</div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-400">Podium Finisher</div>
              <h2 className="text-xl font-extrabold text-white sm:text-2xl">Eco Quiz Bowl Complete!</h2>

              <div className="my-4 flex items-center justify-center gap-3 rounded-2xl bg-white/5 p-3 sm:p-4 border border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-black text-amber-300">{bowl.score}/5</div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Score</div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-400">+{bowl.score * 5} 🪙</div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Coins Won</div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-2xl font-black text-orange-400">x{bowl.streak}</div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Max Streak</div>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-5">
                {bowl.score >= 4
                  ? '🌟 Amazing! You are an official Eco Quiz Master!'
                  : 'Great effort! Review the lessons at the Learning Corner and try again!'}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={restart}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500"
                >
                  🔄 Play Again
                </button>
                <button
                  onClick={close}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700 border border-white/10"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Active Question Screen */
            <div>
              {/* Header */}
              <div className="relative border-b border-white/10 bg-slate-950 px-4 py-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    🏆 Eco Quiz Bowl
                  </span>
                  <div className="flex items-center gap-2">
                    {bowl.streak > 1 && (
                      <span className="rounded-full bg-orange-500/20 border border-orange-500/50 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                        🔥 x{bowl.streak}
                      </span>
                    )}
                    <span className="font-mono text-[11px] font-bold text-slate-300">
                      Q{bowl.questionIdx + 1}/5
                    </span>
                    <button
                      onClick={close}
                      className="text-slate-400 hover:text-white text-base leading-none pl-1"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Question */}
                <div className="mt-2 text-sm sm:text-base font-extrabold text-white leading-snug">
                  {q?.q}
                </div>

                {/* 15s Countdown Progress Bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      timeLeft > 6 ? 'bg-emerald-400' : timeLeft > 3 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${(timeLeft / 15) * 100}%` }}
                  />
                </div>
              </div>

              {/* 4 Kahoot-style Answer Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 sm:p-4">
                {q?.options.map((opt, i) => {
                  const style = KAHOOT_STYLES[i % KAHOOT_STYLES.length]
                  const isChosen = picked === i
                  const isCorrect = i === q.answer
                  let btnBg = style.bg
                  if (feedback !== null) {
                    if (isCorrect) btnBg = 'bg-emerald-600 ring-2 ring-emerald-300'
                    else if (isChosen) btnBg = 'bg-rose-600 ring-2 ring-rose-300'
                    else btnBg = 'bg-slate-800/60 opacity-40'
                  }

                  return (
                    <button
                      key={opt}
                      disabled={feedback !== null}
                      onClick={() => {
                        setPicked(i)
                        const ok = answer(i)
                        setFeedback(ok ? 'right' : 'wrong')
                      }}
                      className={`flex items-center gap-2.5 rounded-xl border ${style.border} ${btnBg} p-3 text-left font-bold text-white shadow-md transition-all active:scale-95`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/25 text-xs font-black">
                        {style.icon}
                      </span>
                      <span className="text-xs sm:text-sm leading-tight">{opt}</span>
                    </button>
                  )
                })}
              </div>

              {/* Immediate Feedback Banner */}
              {feedback !== null && (
                <div
                  className={`mx-3 mb-3 sm:mx-4 sm:mb-4 rounded-xl p-2.5 text-xs font-medium border ${
                    feedback === 'right'
                      ? 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200'
                      : 'border-rose-500/50 bg-rose-950/80 text-rose-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    {feedback === 'right' ? '🎉 Correct!' : '❌ Incorrect!'}
                  </div>
                  {q?.fact}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

