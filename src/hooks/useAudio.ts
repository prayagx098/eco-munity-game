import { useEffect } from 'react'
import { sfx, setMusicMood, unlockAudio, updateAmbience } from '../audio/audio'
import { env, player } from '../state/sceneRegistry'
import { POND, RIVER } from '../state/world'

/**
 * Starts audio on the first click / key press (browser rule), feeds the
 * ambience engine with wind, rain, night and nearby water, and plays the
 * occasional duck quack near the pond.
 */
export function useAudio() {
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)


    const id = setInterval(() => {
      const dPond = Math.hypot(player.x - POND.x, player.z - POND.z) - POND.r
      const dRiver = Math.max(0, Math.abs(player.z - (RIVER.z0 + RIVER.z1) / 2) - 3)
      const water = Math.max(0, 1 - Math.min(dPond, dRiver) / 9)
      updateAmbience({ wind: env.wind, rain: env.rain, night: env.night, water })
      setMusicMood(env.night)
      if (dPond < 4 && Math.random() < 0.008) sfx('quack')
    }, 250)

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      clearInterval(id)
    }
  }, [])
}
