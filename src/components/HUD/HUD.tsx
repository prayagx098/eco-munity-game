import { HomeSync } from './HomeSync'
import { lazy, Suspense, useState } from 'react'
import { useGame } from '../../state/gameStore'
import { StatsBar } from './StatsBar'
import { MiniMap } from './MiniMap'
import { TaskPopup } from './TaskList'
import { Toasts } from './Toasts'
import { StoryBook, StoryDialog, StoryTracker } from './Story'
import { HelpPopup } from './HelpCard'
import { ChatPanel } from './ChatPanel'
import { Captions, InteractPrompt, ZoneBanner } from './Prompts'
import { StatusPill, Dock } from './Status'
import { TouchControls } from './TouchControls'

// Modals are only needed once opened, so they load in separate chunks after the first paint
const ShopModal = lazy(() => import('../Modals/ShopModal').then((m) => ({ default: m.ShopModal })))
const GoodsModal = lazy(() => import('../Modals/StoreModals').then((m) => ({ default: m.GoodsModal })))
const QuizModal = lazy(() => import('../Modals/QuizModal').then((m) => ({ default: m.QuizModal })))
const QuizBowlModal = lazy(() => import('../Modals/QuizBowlModal').then((m) => ({ default: m.QuizBowlModal })))
const InventoryModal = lazy(() => import('../Modals/MakerModals').then((m) => ({ default: m.InventoryModal })))
const BinModal = lazy(() => import('../Modals/MakerModals').then((m) => ({ default: m.BinModal })))
const SettingsPanel = lazy(() => import('../Modals/SettingsPanel').then((m) => ({ default: m.SettingsPanel })))

/**
 * The 2D overlay: a slim stats card, a few chips, the map, and small icon buttons.
 * The wrapper ignores pointer events so nothing blocks the game.
 */
export function HUD() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const paused = useGame((s) => s.paused)
  const playing = useGame((s) => s.screen === 'playing')
  const togglePause = useGame((s) => s.togglePause)
  if (!playing) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Top-left: profile + stats */}
      <div className="pointer-events-auto absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1.5 sm:gap-2 z-20">
        <StatsBar />
        <StoryTracker />
        <Captions />
      </div>

      {/* Top-centre: time, online, zone name and feedback */}
      <div className="pointer-events-none absolute top-2 sm:top-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 sm:gap-2 z-10">
        <StatusPill />
        <ZoneBanner />
      </div>

      {/* Right side feed (like a kill feed): messages stack at the edge and keep the centre clear */}
      <div className="pointer-events-none absolute right-2 sm:right-3 top-[34%] sm:top-[38%] z-10">
        <Toasts />
      </div>

      {/* Top-right: map and a small icon dock */}
      <div className="pointer-events-auto absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-col items-end gap-1.5 sm:gap-2 z-20">
        <div className="pointer-events-auto">
          <MiniMap />
        </div>
        <Dock onSettings={() => setSettingsOpen((o) => !o)} settingsOpen={settingsOpen} />
      </div>

      {/* Bottom-right: chat (elevated on touch to avoid joystick overlap) */}
      <div className="absolute right-3 bottom-24 sm:bottom-3 z-30 flex items-end gap-3">
        <ChatPanel />
      </div>

      {/* Bottom-centre: what you can do */}
      <div className="pointer-events-none absolute bottom-16 sm:bottom-5 left-1/2 -translate-x-1/2 z-20">
        <InteractPrompt />
      </div>

      {/* Mobile Dual Joysticks & Action Controls */}
      <TouchControls />

      <TaskPopup />
      <HomeSync />
      <StoryBook />
      <StoryDialog />
      <Suspense fallback={null}>
      <ShopModal />
      <GoodsModal />
      <InventoryModal />
      <BinModal />
      <QuizModal />
      <QuizBowlModal />
      <HelpPopup />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>

      {paused && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/40">
          <button onClick={togglePause} className="glass px-8 py-3 text-lg font-semibold hover:bg-white/10">
            ⏸ Paused · tap to resume
          </button>
        </div>
      )}
    </div>
  )
}
