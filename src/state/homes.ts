/** What a child can do to their home on Maple Street. The first colour of each kind is free; the rest cost coins. */

export interface HomeDecor {
  wall?: string
  roof?: string
  door?: string
  /** ids of extras switched on: 'flowers' | 'fence' | 'lights' | 'gnome' */
  extras?: string[]
}

export interface HomeState extends HomeDecor {
  owner: string
}

export type HomeKind = 'wall' | 'roof' | 'door' | 'extra'
export interface HomeItem {
  id: string
  kind: HomeKind
  name: string
  emoji: string
  price: number
  color?: string
}

export const HOME_ITEMS: HomeItem[] = [
  // walls
  { id: 'wall-cream', kind: 'wall', name: 'Cream', emoji: '🟨', price: 0, color: '#f3e3b3' },
  { id: 'wall-sky', kind: 'wall', name: 'Sky blue', emoji: '🟦', price: 20, color: '#9ec9ec' },
  { id: 'wall-mint', kind: 'wall', name: 'Mint', emoji: '🟩', price: 20, color: '#a9dfc0' },
  { id: 'wall-peach', kind: 'wall', name: 'Peach', emoji: '🟧', price: 20, color: '#f6b99a' },
  { id: 'wall-lilac', kind: 'wall', name: 'Lilac', emoji: '🟪', price: 25, color: '#c9b3ec' },
  { id: 'wall-rose', kind: 'wall', name: 'Rose', emoji: '🟥', price: 25, color: '#eba3ad' },
  { id: 'wall-white', kind: 'wall', name: 'Snow white', emoji: '⬜', price: 30, color: '#f6f4ef' },
  // roofs
  { id: 'roof-brick', kind: 'roof', name: 'Brick red', emoji: '🟥', price: 0, color: '#b4533a' },
  { id: 'roof-slate', kind: 'roof', name: 'Slate', emoji: '⬛', price: 20, color: '#475569' },
  { id: 'roof-teal', kind: 'roof', name: 'Teal', emoji: '🟦', price: 25, color: '#2a8f8a' },
  { id: 'roof-green', kind: 'roof', name: 'Moss green', emoji: '🟩', price: 25, color: '#4f8a4a' },
  { id: 'roof-purple', kind: 'roof', name: 'Plum', emoji: '🟪', price: 30, color: '#7a4ea8' },
  // doors
  { id: 'door-blue', kind: 'door', name: 'Blue door', emoji: '🚪', price: 0, color: '#3f6fb5' },
  { id: 'door-red', kind: 'door', name: 'Red door', emoji: '🚪', price: 10, color: '#c2403a' },
  { id: 'door-yellow', kind: 'door', name: 'Sunny door', emoji: '🚪', price: 10, color: '#e0a82e' },
  { id: 'door-green', kind: 'door', name: 'Green door', emoji: '🚪', price: 10, color: '#3f9a5a' },
  { id: 'door-pink', kind: 'door', name: 'Pink door', emoji: '🚪', price: 15, color: '#e377a4' },
  // extras
  { id: 'flowers', kind: 'extra', name: 'Window flower boxes', emoji: '🌷', price: 30 },
  { id: 'fence', kind: 'extra', name: 'White picket fence', emoji: '🏡', price: 40 },
  { id: 'lights', kind: 'extra', name: 'Fairy lights (LED!)', emoji: '✨', price: 50 },
  { id: 'gnome', kind: 'extra', name: 'Garden gnome', emoji: '🧙', price: 35 },
]
export const HOME_ITEM_BY_ID = Object.fromEntries(HOME_ITEMS.map((i) => [i.id, i]))
export const HOME_DEFAULTS = { wall: 'wall-cream', roof: 'roof-brick', door: 'door-blue' }

/** the colour a decor id stands for */
export const homeColor = (id: string | undefined, fallback: string) => (id && HOME_ITEM_BY_ID[id]?.color) || fallback
