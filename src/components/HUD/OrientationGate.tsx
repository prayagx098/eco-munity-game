import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { isFullscreen, enterGameFullscreen } from '../../utils/fullscreen'

/**
 * OrientationGate:
 * 1. Prompts mobile users holding their device in portrait to rotate to landscape (horizontal).
 * 2. Constantly encourages / prompts users on mobile to enter Fullscreen mode while playing.
 */
export function OrientationGate() {
  const [isPortrait, setIsPortrait] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const playing = useGame((s) => s.screen === 'playing')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const check = () => {
      const mobile =
        window.matchMedia('(pointer: coarse)').matches ||
        navigator.maxTouchPoints > 0 ||
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const portrait = window.innerHeight > window.innerWidth && mobile
      setIsMobile(mobile)
      setIsPortrait(portrait)
      setFullscreen(isFullscreen())
      if (!portrait) {
        setDismissed(false) // reset dismiss when user successfully rotates to landscape
      }
    }

    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    document.addEventListener('fullscreenchange', check)
    document.addEventListener('webkitfullscreenchange', check)

    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
      document.removeEventListener('fullscreenchange', check)
      document.removeEventListener('webkitfullscreenchange', check)
    }
  }, [])

  return (
    <>
      {/* 1. HORIZONTAL / LANDSCAPE ENFORCEMENT OVERLAY */}
      <AnimatePresence>
        {isMobile && isPortrait && !dismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center text-white backdrop-blur-xl pointer-events-auto select-none"
          >
            {/* Animated Rotating Phone Graphic */}
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <motion.div
                animate={{ rotate: [0, 0, 90, 90, 0] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                className="flex h-16 w-10 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
              >
                {/* Speaker pill & screen indicator */}
                <div className="flex flex-col items-center gap-1">
                  <div className="h-1 w-3 rounded-full bg-emerald-400/80" />
                  <div className="text-[10px] font-bold text-emerald-300">3D</div>
                </div>
              </motion.div>

              {/* Directional rotation arrows */}
              <svg className="absolute inset-0 h-full w-full text-emerald-400/40 animate-spin" style={{ animationDuration: '6s' }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" />
              </svg>
            </div>

            <div className="mb-2 text-xs font-bold tracking-widest text-emerald-400 uppercase">Horizontal Mode</div>
            <h2 className="mb-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Turn Phone Sideways
            </h2>
            <p className="mb-6 max-w-xs text-xs text-slate-300 sm:text-sm">
              Eco-munity is an open-world 3D town designed for widescreen horizontal play. Rotate your device for the best controls and view.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => enterGameFullscreen()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(16,185,129,0.4)] transition hover:from-emerald-600 hover:to-teal-700 active:scale-98"
              >
                <span className="text-base">⛶</span>
                <span>Enter Fullscreen Landscape</span>
              </button>

              <button
                onClick={() => setDismissed(true)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition py-1"
              >
                Continue in vertical mode anyway →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FULLSCREEN NUDGE PILL (When playing on mobile without fullscreen active) */}
      <AnimatePresence>
        {isMobile && !fullscreen && playing && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
          >
            <button
              onClick={() => enterGameFullscreen()}
              className="flex items-center gap-2 rounded-full bg-emerald-500/90 hover:bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md border border-white/30 active:scale-95 transition animate-pulse"
              title="Click to enter edge-to-edge fullscreen"
            >
              <span>⛶</span>
              <span>Tap for Fullscreen Mode</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
