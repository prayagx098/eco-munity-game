import { create } from 'zustand'
import { player, view, type ViewMode } from './sceneRegistry'

const ORDER: ViewMode[] = ['iso', 'third']

export const VIEW_LABELS: Record<ViewMode, { name: string; emoji: string }> = {
  iso: { name: 'Overview', emoji: '🗺️' },
  third: { name: 'Behind you', emoji: '🎥' },
}

/** Which camera is active. Changing it also points the new camera the way the hero is facing. */
export const useView = create<{ mode: ViewMode; set: (m: ViewMode) => void; cycle: () => void }>((set, get) => ({
  mode: 'iso',
  set: (m) => {
    if (m !== 'iso') {
      view.yaw = player.heading
      view.pitch = 0.32
    }
    view.mode = m
    set({ mode: m })
  },
  cycle: () => get().set(ORDER[(ORDER.indexOf(get().mode) + 1) % ORDER.length]),
}))
