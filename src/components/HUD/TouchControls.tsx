import { useEffect, useRef, useState } from 'react'
import { keys, touchInput } from '../../state/sceneRegistry'

/**
 * Mobile Touch Controls:
 *  - Left: floating joystick – touch anywhere in the left zone and drag (walk / sprint / vehicle steering)
 *  - Right: Jump / Bunny-Hop Button (🦘) placed comfortably under the right thumb
 *  - Screen: Direct touch swiping anywhere on screen orbits the 3D camera
 *  - Actions: E, Q, Chat appear dynamically in the center InteractPrompt
 */
export function TouchControls() {
  const [touch, setTouch] = useState(false)

  // Floating joystick: the stick appears wherever the left thumb lands and follows if you drag past its edge
  const [stick, setStick] = useState<{ cx: number; cy: number; kx: number; ky: number } | null>(null)
  const origin = useRef({ x: 0, y: 0 })
  const leftPointerId = useRef<number | null>(null)
  const MAX_R = 46

  useEffect(() => {
    const isTouch =
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      new URLSearchParams(window.location.search).has('touch')
    setTouch(isTouch)
    const onTouch = () => setTouch(true)
    window.addEventListener('touchstart', onTouch, { once: true })
    return () => window.removeEventListener('touchstart', onTouch)
  }, [])

  if (!touch) return null

  /* ---------------- Floating joystick handlers ---------------- */
  const apply = (clientX: number, clientY: number) => {
    let dx = clientX - origin.current.x
    let dy = clientY - origin.current.y
    const dist = Math.hypot(dx, dy)
    if (dist > MAX_R) {
      // drag the whole stick along so the thumb never runs out of room
      const over = dist - MAX_R
      origin.current.x += (dx / dist) * over
      origin.current.y += (dy / dist) * over
      dx = clientX - origin.current.x
      dy = clientY - origin.current.y
    }
    const d = Math.min(Math.hypot(dx, dy), MAX_R)
    const angle = Math.atan2(dy, dx)
    setStick({ cx: origin.current.x, cy: origin.current.y, kx: Math.cos(angle) * d, ky: Math.sin(angle) * d })
    if (d < 6) {
      touchInput.moveX = 0
      touchInput.moveY = 0
      touchInput.moveActive = false
    } else {
      const norm = d / MAX_R
      touchInput.moveX = Math.cos(angle) * norm
      touchInput.moveY = -Math.sin(angle) * norm
      touchInput.moveActive = true
    }
  }

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current !== null) return
    e.preventDefault()
    leftPointerId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    origin.current = { x: e.clientX, y: e.clientY }
    apply(e.clientX, e.clientY)
  }
  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current === e.pointerId) apply(e.clientX, e.clientY)
  }
  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current !== e.pointerId) return
    leftPointerId.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    setStick(null)
    touchInput.moveX = 0
    touchInput.moveY = 0
    touchInput.moveActive = false
  }

  return (
    <>
      {/* 1. LEFT-SIDE TOUCH ZONE: touch anywhere here and drag to move */}
      <div
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className="pointer-events-auto fixed bottom-0 left-0 z-20 h-[68%] w-[46%] select-none touch-none"
      >
        {!stick && (
          <div className="pointer-events-none absolute bottom-6 left-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-white/25 text-[10px] font-semibold uppercase tracking-wide text-white/40">
            move
          </div>
        )}
      </div>
      {stick && (
        <div className="pointer-events-none fixed z-30" style={{ left: stick.cx, top: stick.cy }}>
          <div className="absolute h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300/70 bg-slate-900/40 shadow-[0_0_20px_rgba(34,211,238,0.35)] backdrop-blur-md" />
          <div
            className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-xl"
            style={{ transform: `translate3d(${stick.kx}px, ${stick.ky}px, 0) translate(-50%, -50%)` }}
          />
        </div>
      )}

      {/* 2. JUMP BUTTON (Bottom-Right, where right thumb naturally rests) */}
      <div className="pointer-events-auto fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 select-none">
        <button
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            keys.add('jump')
          }}
          onPointerUp={() => keys.delete('jump')}
          onPointerLeave={() => keys.delete('jump')}
          onPointerCancel={() => keys.delete('jump')}
          className="flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-white/80 bg-gradient-to-b from-sky-400 to-sky-600 text-2xl font-bold text-white shadow-xl shadow-sky-500/25 active:scale-90 transition-transform"
          title="Jump / Hop"
          aria-label="Jump / Hop"
        >
          🦘
        </button>
      </div>
    </>
  )
}
