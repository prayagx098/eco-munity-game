import { useEffect, useRef, useState } from 'react'
import { keys, touchInput } from '../../state/sceneRegistry'

/**
 * Mobile Touch Controls:
 *  - Left: 360° Analog Virtual Joystick (walk / sprint at max deflection / vehicle steering)
 *  - Right: Jump / Bunny-Hop Button (🦘) placed comfortably under the right thumb
 *  - Screen: Direct touch swiping anywhere on screen orbits the 3D camera
 *  - Actions: E, Q, Chat appear dynamically in the center InteractPrompt
 */
export function TouchControls() {
  const [touch, setTouch] = useState(false)

  // Move joystick local state
  const leftBaseRef = useRef<HTMLDivElement>(null)
  const [leftKnob, setLeftKnob] = useState({ x: 0, y: 0, active: false })
  const leftPointerId = useRef<number | null>(null)

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

  /* ---------------- Left Move Joystick Handlers ---------------- */
  const handleLeftDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    leftPointerId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    updateLeft(e.clientX, e.clientY)
  }

  const handleLeftMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current !== e.pointerId) return
    updateLeft(e.clientX, e.clientY)
  }

  const updateLeft = (clientX: number, clientY: number) => {
    const base = leftBaseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const rawDx = clientX - centerX
    const rawDy = clientY - centerY
    const dist = Math.hypot(rawDx, rawDy)
    const maxR = 40
    const clampedDist = Math.min(dist, maxR)
    const angle = Math.atan2(rawDy, rawDx)
    const kx = Math.cos(angle) * clampedDist
    const ky = Math.sin(angle) * clampedDist

    setLeftKnob({ x: kx, y: ky, active: true })

    const deadzone = 5
    if (dist < deadzone) {
      touchInput.moveX = 0
      touchInput.moveY = 0
      touchInput.moveActive = false
    } else {
      const norm = clampedDist / maxR
      touchInput.moveX = Math.cos(angle) * norm
      touchInput.moveY = -Math.sin(angle) * norm // screen Y is inverted relative to forward Z
      touchInput.moveActive = true
    }
  }

  const handleLeftUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current !== e.pointerId) return
    leftPointerId.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    setLeftKnob({ x: 0, y: 0, active: false })
    touchInput.moveX = 0
    touchInput.moveY = 0
    touchInput.moveActive = false
  }

  return (
    <>
      {/* 1. LEFT VIRTUAL JOYSTICK (Movement) */}
      <div className="pointer-events-auto fixed bottom-5 left-5 sm:bottom-6 sm:left-6 z-30 select-none touch-none">
        <div
          ref={leftBaseRef}
          onPointerDown={handleLeftDown}
          onPointerMove={handleLeftMove}
          onPointerUp={handleLeftUp}
          onPointerCancel={handleLeftUp}
          className={`relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 transition-colors ${
            leftKnob.active ? 'border-cyan-400/80 bg-slate-900/50 shadow-[0_0_20px_rgba(34,211,238,0.35)]' : 'border-white/30 bg-slate-900/35'
          } backdrop-blur-md shadow-2xl`}
        >
          {/* Subtle directional tick marks */}
          <div className="absolute top-1.5 h-1.5 w-0.5 rounded-full bg-white/40" />
          <div className="absolute bottom-1.5 h-1.5 w-0.5 rounded-full bg-white/40" />
          <div className="absolute left-1.5 h-0.5 w-1.5 rounded-full bg-white/40" />
          <div className="absolute right-1.5 h-0.5 w-1.5 rounded-full bg-white/40" />

          {/* Movable Thumbstick Knob */}
          <div
            className="absolute flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-tr from-cyan-500 to-emerald-400 text-white shadow-xl"
            style={{
              transform: `translate3d(${leftKnob.x}px, ${leftKnob.y}px, 0)`,
              transition: leftKnob.active ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1)',
            }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-white/80 shadow-sm" />
          </div>
        </div>
      </div>

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
