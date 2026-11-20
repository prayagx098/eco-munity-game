/** The shop catalogue: clothes, shoes, hats and more you buy with coins earned by finishing tasks. */
export type Cat = 'shirt' | 'pants' | 'shoes' | 'hair' | 'hat' | 'glasses' | 'back' | 'vehicle'

export interface Item {
  id: string
  cat: Cat
  name: string
  price: number
  icon: string
  color?: string
  color2?: string
  /** shirts: 'stripes' | 'band' | 'twotone'; shoes: 'boots'; hats/glasses/back: the shape */
  style?: string
  /** the cloth it is made of: cotton, knit, denim, leather, satin, sequin, galaxy, neon, metal, mesh, fleece, camo… */
  fabric?: string
  /** extra parts: hood, collar, pockets, zip, ribbed, cargo */
  extras?: string[]
  /** special effects while worn: 'sparkle' (glittery aura) or 'steps' (light-up footsteps) */
  fx?: 'sparkle' | 'steps'
  /** backpacks: how many extra things it lets you carry */
  cap?: number
}

export const CATS: { id: Cat; name: string; icon: string }[] = [
  { id: 'shirt', name: 'Shirts', icon: '👕' },
  { id: 'pants', name: 'Pants', icon: '👖' },
  { id: 'shoes', name: 'Shoes', icon: '👟' },
  { id: 'hair', name: 'Hair', icon: '💇' },
  { id: 'hat', name: 'Hats', icon: '🧢' },
  { id: 'glasses', name: 'Glasses', icon: '🕶️' },
  { id: 'back', name: 'Back', icon: '🎒' },
  { id: 'vehicle', name: 'Rides', icon: '🚲' },
]

export const ITEMS: Item[] = [
  // shirts - every one is a different fabric with its own look
  { id: 'shirt-sunny', cat: 'shirt', name: 'Sunny cotton tee', price: 15, icon: '👕', color: '#facc15', fabric: 'cotton' },
  { id: 'shirt-knit', cat: 'shirt', name: 'Cozy knit sweater', price: 30, icon: '🧶', color: '#fb7185', fabric: 'knit', extras: ['ribbed'] },
  { id: 'shirt-ocean', cat: 'shirt', name: 'Ocean stripes', price: 30, icon: '👕', color: '#38bdf8', color2: '#ffffff', style: 'stripes', fabric: 'cotton' },
  { id: 'shirt-denim', cat: 'shirt', name: 'Denim jacket', price: 40, icon: '🧥', color: '#4b7bb8', fabric: 'denim', extras: ['collar', 'pockets'] },
  { id: 'shirt-jersey', cat: 'shirt', name: 'Mesh sports jersey', price: 40, icon: '🎽', color: '#dc2626', color2: '#ffffff', style: 'band', fabric: 'mesh' },
  { id: 'shirt-hoodie', cat: 'shirt', name: 'Forest fleece hoodie', price: 45, icon: '🧥', color: '#15803d', fabric: 'fleece', extras: ['hood'] },
  { id: 'shirt-satin', cat: 'shirt', name: 'Satin evening shirt', price: 45, icon: '👔', color: '#7c3aed', fabric: 'satin', extras: ['collar'] },
  { id: 'shirt-leather', cat: 'shirt', name: 'Leather jacket', price: 55, icon: '🧥', color: '#1c1917', fabric: 'leather', extras: ['collar', 'zip'] },
  { id: 'shirt-sunset', cat: 'shirt', name: 'Sunset gradient tee', price: 55, icon: '🌅', color: '#fb923c', color2: '#f43f5e', fabric: 'gradient' },
  { id: 'shirt-sequin', cat: 'shirt', name: 'Sequin party top', price: 75, icon: '✨', color: '#ec4899', fabric: 'sequin', fx: 'sparkle' },
  { id: 'shirt-neon', cat: 'shirt', name: 'Neon eco tee', price: 80, icon: '💡', color: '#052e16', color2: '#22ff88', fabric: 'neon' },
  { id: 'shirt-galaxy', cat: 'shirt', name: 'Galaxy hoodie', price: 95, icon: '🌌', color: '#312e81', fabric: 'galaxy', extras: ['hood'], fx: 'sparkle' },
  { id: 'shirt-gold', cat: 'shirt', name: 'Champion gold', price: 130, icon: '🏆', color: '#eab308', fabric: 'metal', fx: 'sparkle' },
  // pants
  { id: 'pants-cargo', cat: 'pants', name: 'Cargo pants', price: 25, icon: '👖', color: '#a16207', fabric: 'twill', extras: ['cargo'] },
  { id: 'pants-shorts', cat: 'pants', name: 'Summer shorts', price: 20, icon: '🩳', color: '#f97316', fabric: 'cotton', style: 'shorts' },
  { id: 'pants-jogger', cat: 'pants', name: 'Cozy joggers', price: 25, icon: '👖', color: '#64748b', fabric: 'fleece' },
  { id: 'pants-white', cat: 'pants', name: 'White linen', price: 25, icon: '👖', color: '#e5e7eb', fabric: 'cotton' },
  { id: 'pants-camo', cat: 'pants', name: 'Camo pants', price: 35, icon: '🪖', color: '#5b6b3a', fabric: 'camo', extras: ['cargo'] },
  { id: 'pants-leather', cat: 'pants', name: 'Leather pants', price: 45, icon: '👖', color: '#111827', fabric: 'leather' },
  { id: 'pants-glitter', cat: 'pants', name: 'Glitter pants', price: 60, icon: '✨', color: '#a855f7', fabric: 'sequin', fx: 'sparkle' },
  // shoes
  { id: 'shoes-red', cat: 'shoes', name: 'Red sneakers', price: 20, icon: '👟', color: '#ef4444' },
  { id: 'shoes-white', cat: 'shoes', name: 'White sneakers', price: 25, icon: '👟', color: '#f8fafc' },
  { id: 'shoes-boots', cat: 'shoes', name: 'Brown boots', price: 40, icon: '🥾', color: '#7c4a21', style: 'boots' },
  { id: 'shoes-rain', cat: 'shoes', name: 'Yellow rain boots', price: 45, icon: '🥾', color: '#facc15', style: 'boots' },
  { id: 'shoes-glow', cat: 'shoes', name: 'Light-up shoes', price: 55, icon: '💫', color: '#22d3ee', style: 'glow', fx: 'steps' },
  { id: 'shoes-glitter', cat: 'shoes', name: 'Glitter shoes', price: 60, icon: '✨', color: '#f472b6', style: 'glitter', fx: 'sparkle' },
  { id: 'shoes-gold', cat: 'shoes', name: 'Golden sneakers', price: 90, icon: '👟', color: '#eab308', style: 'gold' },
  // hair
  { id: 'hair-black', cat: 'hair', name: 'Black hair', price: 15, icon: '💇', color: '#111827' },
  { id: 'hair-blonde', cat: 'hair', name: 'Blonde hair', price: 15, icon: '💇', color: '#fde68a' },
  { id: 'hair-red', cat: 'hair', name: 'Red hair', price: 20, icon: '💇', color: '#dc2626' },
  { id: 'hair-blue', cat: 'hair', name: 'Blue hair', price: 30, icon: '💇', color: '#3b82f6' },
  { id: 'hair-pink', cat: 'hair', name: 'Pink hair', price: 30, icon: '💇', color: '#f472b6' },
  { id: 'hair-green', cat: 'hair', name: 'Green hair', price: 30, icon: '💇', color: '#22c55e' },
  { id: 'hair-silver', cat: 'hair', name: 'Silver hair', price: 40, icon: '💇', color: '#cbd5e1' },
  // hats
  { id: 'hat-cap', cat: 'hat', name: 'Red cap', price: 25, icon: '🧢', color: '#ef4444', style: 'cap' },
  { id: 'hat-beanie', cat: 'hat', name: 'Blue beanie', price: 30, icon: '🧶', color: '#2563eb', style: 'beanie' },
  { id: 'hat-party', cat: 'hat', name: 'Party hat', price: 30, icon: '🎉', color: '#a855f7', style: 'party' },
  { id: 'hat-straw', cat: 'hat', name: 'Straw hat', price: 35, icon: '👒', color: '#e9c46a', style: 'straw' },
  { id: 'hat-helmet', cat: 'hat', name: 'Bike helmet', price: 40, icon: '⛑️', color: '#22c55e', style: 'helmet' },
  { id: 'hat-phones', cat: 'hat', name: 'Headphones', price: 50, icon: '🎧', color: '#334155', style: 'phones' },
  { id: 'hat-top', cat: 'hat', name: 'Top hat', price: 60, icon: '🎩', color: '#1f2937', style: 'top' },
  { id: 'hat-crown', cat: 'hat', name: 'Golden crown', price: 120, icon: '👑', color: '#facc15', style: 'crown' },
  // glasses
  { id: 'glasses-round', cat: 'glasses', name: 'Round glasses', price: 20, icon: '👓', color: '#1f2937', style: 'round' },
  { id: 'glasses-sun', cat: 'glasses', name: 'Sunglasses', price: 30, icon: '🕶️', color: '#111827', style: 'sun' },
  { id: 'glasses-heart', cat: 'glasses', name: 'Heart glasses', price: 40, icon: '😍', color: '#ec4899', style: 'heart' },
  { id: 'glasses-star', cat: 'glasses', name: 'Star glasses', price: 50, icon: '🤩', color: '#facc15', style: 'star' },
  // back
  { id: 'back-pack-mini', cat: 'back', name: 'Mini pouch bag', price: 20, icon: '👝', color: '#f59e0b', style: 'pack', cap: 6 },
  { id: 'back-pack-blue', cat: 'back', name: 'Blue school bag', price: 35, icon: '🎒', color: '#2563eb', style: 'pack', cap: 12 },
  { id: 'back-pack-green', cat: 'back', name: 'Green day pack', price: 35, icon: '🎒', color: '#16a34a', style: 'pack', cap: 12 },
  { id: 'back-pack-hike', cat: 'back', name: 'Orange hiking pack', price: 70, icon: '🥾', color: '#ea580c', style: 'pack', cap: 24 },
  { id: 'back-pack-lab', cat: 'back', name: 'Maker lab backpack', price: 110, icon: '🧪', color: '#7c3aed', style: 'pack', cap: 36 },
  { id: 'back-pack-mega', cat: 'back', name: 'Mega explorer pack', price: 160, icon: '🧳', color: '#0f172a', style: 'pack', cap: 54 },
  { id: 'back-cape-red', cat: 'back', name: 'Red cape', price: 70, icon: '🦸', color: '#dc2626', style: 'cape' },
  { id: 'back-cape-blue', cat: 'back', name: 'Blue cape', price: 70, icon: '🦸', color: '#2563eb', style: 'cape' },
  { id: 'back-wings', cat: 'back', name: 'Angel wings', price: 120, icon: '🪽', color: '#ffffff', style: 'wings' },
  // rides
  { id: 'veh-bike', cat: 'vehicle', name: 'Personal Solar Cycle', price: 60, icon: '🚲', color: '#0ea5e9' },
  { id: 'veh-scooter', cat: 'vehicle', name: 'Personal Solar Scooter', price: 75, icon: '🛴', color: '#0284c7' },
  { id: 'veh-board', cat: 'vehicle', name: 'Personal Eco Skateboard', price: 50, icon: '🛹', color: '#10b981' },
]

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]))

/** coins for finishing one task (grows a little every round) and for finishing a whole round */
export const TASK_COINS = 12
export const ROUND_BONUS = 30
export const START_COINS = 20

export interface Wallet {
  coins: number
  owned: string[]
  equipped: Partial<Record<Cat, string>>
  /** your original look from the welcome screen (shown when nothing is equipped) */
  base: { shirt: string; pants: string; hair: string } | null
  /** which task rewards were already paid out */
  paid: string[]
  /** things bought at the store counters: id → how many */
  inv: Record<string, number>
  /** projects the student built (kept on their shelf; some stand in the Maker Yard) */
  projects: Built[]
  /** projects that already paid their first-build reward */
  built: string[]
  /** today's earnings, so every source has a daily limit */
  daily: Daily
}

export interface Daily {
  day: string
  /** coins already paid today for sorting litter */
  sortPaid: number
  /** progress on each daily job */
  prog: Record<string, number>
  done: string[]
  /** right quiz answers paid today */
  quizPaid: number
}
export const todayKey = () => new Date().toDateString()
export const freshDaily = (): Daily => ({ day: todayKey(), sortPaid: 0, prog: {}, done: [], quizPaid: 0 })

import type { Built } from './projects'

export const HAND_SLOTS = 6
export function capacityOf(owned: string[]) {
  return HAND_SLOTS + owned.reduce((m, id) => Math.max(m, ITEM_BY_ID[id]?.cap ?? 0), 0)
}

const KEY = 'eco-wallet-v1'

export function loadWallet(): Wallet {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const w = JSON.parse(raw) as Wallet
      return { coins: w.coins ?? 0, owned: w.owned ?? [], equipped: w.equipped ?? {}, base: w.base ?? null, paid: w.paid ?? [], inv: w.inv ?? {}, projects: (w.projects ?? []).map((p) => ({ ...p, pad: null })), built: w.built ?? [], daily: w.daily && w.daily.day === todayKey() ? w.daily : freshDaily() }  // projects always start the game on the shelf
    }
  } catch {
    /* storage unavailable */
  }
  return { coins: START_COINS, owned: [], equipped: {}, base: null, paid: [], inv: {}, projects: [], built: [], daily: freshDaily() }
}

export function saveWallet(w: Wallet) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w))
  } catch {
    /* ignore */
  }
}
