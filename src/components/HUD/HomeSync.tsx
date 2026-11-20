import { useEffect } from 'react'
import { useGame } from '../../state/gameStore'
import { useMeta } from '../../state/meta'

/**
 * Your home is saved with you. When you join a room, move back in (if it is still free), or forget it
 * if somebody else has it now. Also keeps today's missions fresh.
 */
export function HomeSync() {
  const playing = useGame((s) => s.screen === 'playing')
  const net = useGame((s) => s.netStatus)
  const name = useGame((s) => s.profile.name)
  const house = useMeta((m) => m.home.house)
  const homes = useGame((s) => s.homes)

  useEffect(() => {
    if (playing) useMeta.getState().ensureToday()
  }, [playing])

  useEffect(() => {
    if (!playing || !house || net === 'waking') return
    const t = setTimeout(() => {
      const cur = useGame.getState().homes[house]
      if (cur?.owner === name) return
      if (!cur) useGame.getState().dispatch({ kind: 'home', op: 'claim', id: house, decor: useMeta.getState().home.decor })
      else useMeta.getState().setHome(null) // somebody else lives there now
    }, 2500)
    return () => clearTimeout(t)
  }, [playing, net, house, name, homes])

  return null
}
