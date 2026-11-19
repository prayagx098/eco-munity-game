import { create } from 'zustand'

/** Which small popups are open (tasks, help). Kept apart from the game state. */
export const useUI = create<{ tasksOpen: boolean; helpOpen: boolean; setTasks: (o?: boolean) => void; setHelp: (o?: boolean) => void }>((set) => ({
  tasksOpen: false,
  helpOpen: false,
  setTasks: (o) => set((s) => ({ tasksOpen: o ?? !s.tasksOpen, helpOpen: false })),
  setHelp: (o) => set((s) => ({ helpOpen: o ?? !s.helpOpen, tasksOpen: false })),
}))
