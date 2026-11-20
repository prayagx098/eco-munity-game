import { create } from 'zustand'
import { useGame, type Stats } from './gameStore'
import { saveWallet } from './shop'
import { sfx } from '../audio/audio'
import { HOME_ITEM_BY_ID, HOME_DEFAULTS, type HomeDecor } from './homes'

/**
 * A player's long-term progress: today's missions + streak, the weekly chest, their tree record and their home.
 * Saved with the account (and in this browser for guests).
 */

/* ----------------------------- dates ----------------------------- */
const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayKey = () => keyOf(new Date())
export const yesterdayKey = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return keyOf(d)
}
/** the Monday of this week */
export const weekKey = () => {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return keyOf(d)
}

/* ----------------------------- missions ----------------------------- */
type MissionStat = keyof Stats | 'harvested'
interface MissionDef {
  id: string
  emoji: string
  text: (n: number) => string
  stat: MissionStat
  n: [number, number]
  coins: [number, number]
}
export const MISSION_POOL: MissionDef[] = [
  { id: 'sort', emoji: '♻️', text: (n) => `Sort ${n} pieces of litter into the right bins`, stat: 'sorted', n: [5, 9], coins: [12, 20] },
  { id: 'plant', emoji: '🌳', text: (n) => `Plant ${n} tree${n > 1 ? 's' : ''} in the Pine Forest`, stat: 'trees', n: [1, 2], coins: [14, 22] },
  { id: 'water', emoji: '💧', text: (n) => `Water the garden ${n} time${n > 1 ? 's' : ''}`, stat: 'watered', n: [1, 3], coins: [10, 18] },
  { id: 'lights', emoji: '💡', text: (n) => `Switch off ${n} wasted light${n > 1 ? 's' : ''}`, stat: 'lightsOff', n: [1, 2], coins: [10, 16] },
  { id: 'tap', emoji: '🔧', text: (n) => `Fix ${n} leaking tap${n > 1 ? 's' : ''}`, stat: 'tapsFixed', n: [1, 1], coins: [14, 18] },
  { id: 'learn', emoji: '📚', text: (n) => `Learn something new ${n} time${n > 1 ? 's' : ''} at the Learning Corner`, stat: 'learned', n: [2, 3], coins: [12, 18] },
  { id: 'compost', emoji: '🪱', text: (n) => `Turn the compost heap ${n} time${n > 1 ? 's' : ''}`, stat: 'turned', n: [1, 2], coins: [10, 16] },
  { id: 'ride', emoji: '🚲', text: (n) => `Ride a solar bike ${n} time${n > 1 ? 's' : ''}`, stat: 'rode', n: [1, 2], coins: [8, 14] },
  { id: 'pond', emoji: '🦆', text: (n) => `Rescue ${n} piece${n > 1 ? 's' : ''} of litter from the pond`, stat: 'pondCleaned', n: [1, 3], coins: [12, 20] },
  { id: 'kind', emoji: '💬', text: (n) => `Say ${n} kind thing${n > 1 ? 's' : ''} to your neighbours`, stat: 'kindWords', n: [1, 2], coins: [8, 12] },
  { id: 'harvest', emoji: '🧺', text: (n) => `Harvest seeds from ${n} fully grown tree${n > 1 ? 's' : ''}`, stat: 'harvested', n: [1, 1], coins: [14, 18] },
]
const DEF_BY_ID = Object.fromEntries(MISSION_POOL.map((m) => [m.id, m]))

export interface Mission {
  id: string
  n: number
  got: number
  coins: number
  claimed: boolean
}

/** same missions for everyone on a given day (nice for a class) */
function seeded(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}
export function makeDaily(day: string): Mission[] {
  const rnd = seeded(day)
  const pool = [...MISSION_POOL]
  const out: Mission[] = []
  while (out.length < 3 && pool.length) {
    const d = pool.splice(Math.floor(rnd() * pool.length), 1)[0]
    const n = d.n[0] + Math.floor(rnd() * (d.n[1] - d.n[0] + 1))
    const coins = d.coins[0] + Math.floor(rnd() * (d.coins[1] - d.coins[0] + 1))
    out.push({ id: d.id, n, got: 0, coins, claimed: false })
  }
  return out
}

export const WEEK_GOAL = 10
export const WEEK_COINS = 60
/** streak days that pay a bonus the first time they are reached */
export const STREAK_BONUS: Record<number, number> = { 3: 15, 7: 50, 14: 100, 30: 250 }

/* ----------------------------- state ----------------------------- */
export interface MetaData {
  day: string
  missions: Mission[]
  streak: { count: number; best: number; lastDay: string; paid: number }
  week: { key: string; done: number; claimed: boolean }
  forest: { planted: number; harvested: number }
  home: { house: string | null; decor: HomeDecor; owned: string[] }
}

const blank = (): MetaData => ({
  day: '',
  missions: [],
  streak: { count: 0, best: 0, lastDay: '', paid: 0 },
  week: { key: '', done: 0, claimed: false },
  forest: { planted: 0, harvested: 0 },
  home: { house: null, decor: { ...HOME_DEFAULTS, extras: [] }, owned: ['wall-cream', 'roof-brick', 'door-blue'] },
})

const LS = 'eco-munity-meta'
const load = (): MetaData => {
  try {
    const raw = localStorage.getItem(LS)
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank()
  } catch {
    return blank()
  }
}
const persist = (m: MetaData) => {
  try {
    localStorage.setItem(LS, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}

export type PanelTab = 'missions' | 'home' | 'trees'
interface MetaState extends MetaData {
  panel: PanelTab | null
  setPanel: (p: PanelTab | null) => void
  /** make sure the missions/week belong to today */
  ensureToday: () => void
  /** count what the player just did (stat deltas from an action result) */
  record: (d: Partial<Record<MissionStat, number>>) => void
  claim: (id: string) => void
  claimWeek: () => void
  recordForest: (f: { planted?: number; harvested?: number }) => void
  /** home */
  setHome: (house: string | null, decor?: HomeDecor) => void
  buyHomeItem: (id: string) => 'ok' | 'poor' | 'owned'
  applyDecor: (patch: HomeDecor) => void
  /** account sync */
  hydrate: (d: Partial<MetaData> | null | undefined) => void
  exportData: () => MetaData
}

const pick = (s: MetaState): MetaData => ({ day: s.day, missions: s.missions, streak: s.streak, week: s.week, forest: s.forest, home: s.home })

export const useMeta = create<MetaState>()((set, get) => ({
  ...load(),
  panel: null,
  setPanel: (panel) => set({ panel }),

  ensureToday: () => {
    const s = get()
    const day = todayKey()
    const wk = weekKey()
    const patch: Partial<MetaData> = {}
    if (s.day !== day) {
      patch.day = day
      patch.missions = makeDaily(day)
    }
    if (s.week.key !== wk) patch.week = { key: wk, done: 0, claimed: false }
    if (Object.keys(patch).length) set(patch)
  },

  record: (d) => {
    get().ensureToday()
    const s = get()
    let changed = false
    const missions = s.missions.map((m) => {
      const inc = d[DEF_BY_ID[m.id]?.stat as MissionStat] ?? 0
      if (!inc || m.got >= m.n) return m
      changed = true
      const got = Math.min(m.n, m.got + inc)
      if (got >= m.n) {
        const def = DEF_BY_ID[m.id]
        sfx('fanfare')
        useGame.getState().pushToast({ kind: 'good', emoji: '🎯', title: 'Mission complete!', text: `${def.emoji} ${def.text(m.n)} — open 🎯 to claim ${m.coins} coins` })
      }
      return { ...m, got }
    })
    if (changed) set({ missions })
  },

  claim: (id) => {
    get().ensureToday()
    const s = get()
    const m = s.missions.find((x) => x.id === id)
    if (!m || m.claimed || m.got < m.n) return
    const g = useGame.getState()
    g.addCoins(m.coins, 'Daily mission done!')
    const today = todayKey()
    let { count, best, paid } = s.streak
    if (s.streak.lastDay !== today) {
      count = s.streak.lastDay === yesterdayKey() ? count + 1 : 1
      if (count === 1) paid = 0
      best = Math.max(best, count)
    }
    const bonus = STREAK_BONUS[count]
    if (bonus && count > paid) {
      paid = count
      g.addCoins(bonus, `🔥 ${count}-day streak bonus!`)
    }
    set({
      missions: s.missions.map((x) => (x.id === id ? { ...x, claimed: true } : x)),
      streak: { count, best, lastDay: today, paid },
      week: { ...s.week, done: s.week.done + 1 },
    })
  },

  claimWeek: () => {
    const s = get()
    if (s.week.claimed || s.week.done < WEEK_GOAL) return
    useGame.getState().addCoins(WEEK_COINS, '🎁 Weekly chest opened!')
    set({ week: { ...s.week, claimed: true } })
  },

  recordForest: (f) => {
    const s = get()
    set({ forest: { planted: s.forest.planted + (f.planted ?? 0), harvested: s.forest.harvested + (f.harvested ?? 0) } })
  },

  setHome: (house, decor) => set((s) => ({ home: { ...s.home, house, decor: decor ?? s.home.decor } })),

  buyHomeItem: (id) => {
    const item = HOME_ITEM_BY_ID[id]
    const s = get()
    if (!item || s.home.owned.includes(id)) return 'owned'
    const g = useGame.getState()
    if (g.wallet.coins < item.price) return 'poor'
    const wallet = { ...g.wallet, coins: g.wallet.coins - item.price }
    saveWallet(wallet)
    useGame.setState({ wallet })
    sfx('fanfare')
    set({ home: { ...s.home, owned: [...s.home.owned, id] } })
    return 'ok'
  },

  applyDecor: (patch) => {
    const s = get()
    const decor = { ...s.home.decor, ...patch }
    set({ home: { ...s.home, decor } })
    if (s.home.house) useGame.getState().dispatch({ kind: 'home', op: 'decor', id: s.home.house, decor })
  },

  hydrate: (d) => {
    const b = blank()
    const next: MetaData = d ? { ...b, ...d, streak: { ...b.streak, ...d.streak }, week: { ...b.week, ...d.week }, forest: { ...b.forest, ...d.forest }, home: { ...b.home, ...d.home } } : b
    set(next)
    get().ensureToday()
  },

  exportData: () => pick(get()),
}))

// keep this browser's copy up to date, and roll the day over at midnight
useMeta.subscribe((s) => persist(pick(s)))
if (typeof window !== 'undefined') setInterval(() => useMeta.getState().ensureToday(), 60_000)
