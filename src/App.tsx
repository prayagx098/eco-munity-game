import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { GameCanvas } from './components/3DCanvas/GameCanvas'
import { SceneBoundary } from './components/3DCanvas/SceneBoundary'
import { HUD } from './components/HUD/HUD'
import { BigMap } from './components/HUD/MiniMap'
import { WelcomeModal } from './components/Modals/WelcomeModal'
import { RoundCompleteModal } from './components/Modals/RoundCompleteModal'
import { BadgesPanel } from './components/Modals/BadgesPanel'
import { useGameLoop } from './hooks/useGameLoop'
import { useKeyboard } from './hooks/useKeyboard'
import { useAudio } from './hooks/useAudio'
import { useGame } from './state/gameStore'
import { PRESETS, useSettings } from './state/settings'
import { startNet } from './net/net'

startNet()

export default function App() {
  useGameLoop()
  useKeyboard()
  useAudio()
  const access = useSettings((s) => s.access)
  const playing = useGame((s) => s.screen === 'playing')

  // accessibility classes on <html>
  useEffect(() => {
    const c = document.documentElement.classList
    c.toggle('a11y-contrast', access.highContrast)
    c.toggle('a11y-motion', access.reducedMotion)
  }, [access.highContrast, access.reducedMotion])

  // tell the player which graphics level was picked for their device
  useEffect(() => {
    if (!playing) return
    const st = useSettings.getState()
    if (st.quality !== 'auto') return
    const t = setTimeout(
      () =>
        useGame.getState().pushToast({
          kind: 'info',
          emoji: '🖥️',
          title: `Graphics: ${PRESETS[st.resolved].label} (auto)`,
          text: `Picked for your device (${st.device.reasons[0].toLowerCase()}). Change it in ⚙️ Settings → Look.`,
        }),
      1800,
    )
    return () => clearTimeout(t)
  }, [playing])

  return (
    <MotionConfig reducedMotion={access.reducedMotion ? 'always' : 'never'}>
      <div className="relative h-full w-full">
        <SceneBoundary>
          <GameCanvas />
        </SceneBoundary>
        <div className="pointer-events-none absolute inset-0" style={{ zoom: access.textScale }}>
          <HUD />
          <BigMap />
          <BadgesPanel />
          <RoundCompleteModal />
          <WelcomeModal />
        </div>
      </div>
    </MotionConfig>
  )
}
