import { useEffect, useRef, useState } from 'react'
import { keys, player, touchInput } from '../../state/sceneRegistry'

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

  // while you ride, the joystick gives way to key-style buttons (steer left/right, gas, brake, boost)
  const [riding, setRiding] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setRiding((r) => (r === !!player.vehicle ? r : !!player.vehicle)), 120)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (riding) {
      // drop any joystick input and held keys when switching mode
      touchInput.moveX = 0
      touchInput.moveY = 0
      touchInput.moveActive = false
      leftPointerId.current = null
      setStick(null)
    } else {
      for (const k of ['up', 'down', 'left', 'right', 'run']) keys.delete(k)
    }
  }, [riding])

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
      {riding && <RideButtons />}
      {/* 1. LEFT-SIDE TOUCH ZONE: touch anywhere here and drag to move */}
      {!riding && <div
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
      </div>}
      {stick && !riding && (
        <div className="pointer-events-none fixed z-30" style={{ left: stick.cx, top: stick.cy }}>
          <div className="absolute h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300/70 bg-slate-900/40 shadow-[0_0_20px_rgba(34,211,238,0.35)] backdrop-blur-md" />
          <div
            className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-xl"
            style={{ transform: `translate3d(${stick.kx}px, ${stick.ky}px, 0) translate(-50%, -50%)` }}
          />
        </div>
      )}

      {/* 2. JUMP BUTTON (Bottom-Right, where right thumb naturally rests) */}
      {!riding && (
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
      )}
    </>
  )
}

/** A hold-to-press on-screen key: adds/removes a key from the shared "keys held" set */
function HoldKey({ k, label, aria, className }: { k: string; label: string; aria: string; className: string }) {
  const release = () => keys.delete(k)
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        keys.add(k)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={aria}
      className={`pointer-events-auto flex select-none touch-none items-center justify-center rounded-2xl border-2 border-white/60 text-3xl font-black text-white shadow-xl backdrop-blur-md active:scale-95 active:brightness-125 ${className}`}
    >
      {label}
    </button>
  )
}

/** Riding controls: ◀ ▶ steer on the left thumb, ▲ gas / ▼ brake (reverse) and ⚡ boost on the right thumb */
function RideButtons() {
  return (
    <>
      <div className="pointer-events-none fixed bottom-5 left-5 z-30 flex gap-3 sm:bottom-6 sm:left-6">
        <HoldKey k="left" label="◀" aria="Steer left" className="h-20 w-20 bg-slate-900/55 sm:h-24 sm:w-24" />
        <HoldKey k="right" label="▶" aria="Steer right" className="h-20 w-20 bg-slate-900/55 sm:h-24 sm:w-24" />
      </div>
      <div className="pointer-events-none fixed bottom-5 right-5 z-30 flex items-end gap-3 sm:bottom-6 sm:right-6">
        <HoldKey k="run" label="⚡" aria="Boost" className="mb-1 h-14 w-14 bg-amber-500/70 text-2xl" />
        <div className="flex flex-col gap-3">
          <HoldKey k="up" label="▲" aria="Accelerate" className="h-20 w-20 bg-emerald-600/70 sm:h-24 sm:w-24" />
          <HoldKey k="down" label="▼" aria="Brake / reverse" className="h-16 w-20 bg-rose-600/65 sm:w-24" />
        </div>
      </div>
    </>
  )
}
