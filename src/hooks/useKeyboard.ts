import { useMeta } from '../state/meta'
import { useEffect } from 'react'
import { useGame } from '../state/gameStore'
import { keys, view } from '../state/sceneRegistry'
import { useView } from '../state/viewMode'
import { useUI } from '../state/ui'
import { useStory } from '../state/story'
import { toggleFullscreen } from '../utils/fullscreen'

const MOVE_KEYS: Record<string, string> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jump',
}

const typingInField = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/**
 * Keyboard controls:
 *  WASD / arrows move · Shift runs · E / Space interact · Q drop
 *  C / Enter chat with a nearby player · M map · B badges · +/- zoom · Esc close
 */
export function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = useGame.getState()
      if (e.code === 'Escape') {
        if (useMeta.getState().panel) useMeta.getState().setPanel(null)
        else if (s.shopOpen) s.setShop(false)
        else if (s.goodsCounter) s.setGoodsCounter(0)
        else if (s.invOpen) s.setInv(false)
        else if (s.binOpen) s.setBin(false)
        else if (s.quiz !== null) s.closeQuiz()
        else if (useUI.getState().tasksOpen || useUI.getState().helpOpen) {
          useUI.getState().setTasks(false)
          useUI.getState().setHelp(false)
        } else if (s.chatWith) s.closeChat()
        else if (s.bigMap) s.toggleBigMap(false)
        else if (s.badgesOpen) s.toggleBadges(false)
        else if (useStory.getState().bookOpen) useStory.getState().setBook(false)
        ;(document.activeElement as HTMLElement | null)?.blur?.()
        return
      }
      if (typingInField(e) || s.screen !== 'playing') return
      const move = MOVE_KEYS[e.code]
      if (move) {
        keys.add(move)
        if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
        return
      }
      if (e.repeat) return
      switch (e.code) {
        case 'KeyE':
          e.preventDefault()
          s.interact()
          break
        case 'KeyP':
          useMeta.getState().setPanel(useMeta.getState().panel ? null : 'missions')
          break
        case 'KeyJ':
          useStory.getState().setBook()
          break
        case 'KeyQ':
          s.dropCarried()
          break
        case 'KeyC':
        case 'Enter':
          if (s.nearbyMate && !s.chatWith) {
            e.preventDefault()
            s.openChat(s.nearbyMate)
          }
          break
        case 'KeyI':
          s.setInv()
          break
        case 'KeyT':
          useUI.getState().setTasks()
          break
        case 'KeyV':
          useView.getState().cycle()
          break
        case 'KeyM':
          s.toggleBigMap()
          break
        case 'KeyB':
          s.toggleBadges()
          break
        case 'KeyF':
          toggleFullscreen()
          break
        case 'KeyH':
          s.addTestPoints(2000)
          break
        case 'Equal':
        case 'NumpadAdd':
          view.zoom = Math.min(view.maxZoom, view.zoom * 1.15)
          break
        case 'Minus':
        case 'NumpadSubtract':
          view.zoom = Math.max(view.minZoom, view.zoom / 1.15)
          break
      }
    }
    const up = (e: KeyboardEvent) => {
      const move = MOVE_KEYS[e.code]
      if (move) keys.delete(move)
    }
    const blur = () => keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
}
