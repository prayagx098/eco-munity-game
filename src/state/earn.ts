/** Ways to earn coins besides the round tasks. Every source has a daily limit so nothing can be farmed. */
import { freshDaily, saveWallet, todayKey, type Daily, type Wallet } from './shop'

export interface DailyJob {
  id: string
  label: string
  emoji: string
  /** the stats (from the store) that count towards it */
  stats: string[]
  target: number
  coins: number
}

export const DAILY_JOBS: DailyJob[] = [
  { id: 'sort', label: 'Sort 8 items correctly', emoji: '♻️', stats: ['sorted'], target: 8, coins: 8 },
  { id: 'water', label: 'Water the garden twice', emoji: '💧', stats: ['watered'], target: 2, coins: 6 },
  { id: 'fix', label: 'Fix taps or switch off lights (2)', emoji: '🔧', stats: ['tapsFixed', 'lightsOff'], target: 2, coins: 7 },
  { id: 'compost', label: 'Turn the compost heaps twice', emoji: '🪱', stats: ['turned'], target: 2, coins: 7 },
]
export const DAILY_BONUS = 10
/** coins per correctly sorted item, and the most this can pay in a day */
export const SORT_COIN = 1
export const SORT_COIN_CAP = 30
export const QUIZ_COIN = 4
export const QUIZ_CAP = 5
/** first time a project is built: coins by level */
export const PROJECT_COINS: Record<number, number> = { 1: 15, 2: 25, 3: 40 }

type Stats = Record<string, number>
interface Store {
  getState: () => { stats: Stats; wallet: Wallet; addCoins: (n: number, why: string, quiet?: boolean) => void }
  setState: (p: { wallet: Wallet }) => void
  subscribe: (fn: (s: { stats: Stats }) => void) => void
}

/** the wallet with today's earnings (starting a fresh day when the date changed) */
export function dailyOf(w: Wallet): Daily {
  return w.daily && w.daily.day === todayKey() ? w.daily : freshDaily()
}

/** watch the player's stats and pay out the daily jobs and per-item cleanup coins */
export function initEarning(store: Store) {
  let prev: Stats = { ...store.getState().stats }
  store.subscribe((s) => {
    const cur = s.stats
    const delta = (k: string) => Math.max(0, (cur[k] ?? 0) - (prev[k] ?? 0))
    const gained = Object.keys(cur).some((k) => delta(k) > 0)
    const snapshot = { ...cur }
    if (!gained) {
      prev = snapshot
      return
    }
    const st = store.getState()
    let daily = { ...dailyOf(st.wallet), prog: { ...dailyOf(st.wallet).prog }, done: [...dailyOf(st.wallet).done] }
    let pay = 0
    const notes: string[] = []
    // a coin for each litter item put in the right bin
    const sorted = delta('sorted')
    if (sorted > 0 && daily.sortPaid < SORT_COIN_CAP) {
      const c = Math.min(sorted * SORT_COIN, SORT_COIN_CAP - daily.sortPaid)
      daily.sortPaid += c
      pay += c
    }
    for (const job of DAILY_JOBS) {
      if (daily.done.includes(job.id)) continue
      const add = job.stats.reduce((a, k) => a + delta(k), 0)
      if (add <= 0) continue
      daily.prog[job.id] = Math.min(job.target, (daily.prog[job.id] ?? 0) + add)
      if (daily.prog[job.id] >= job.target) {
        daily.done.push(job.id)
        pay += job.coins
        notes.push(`${job.emoji} ${job.label}`)
      }
    }
    let bonus = false
    if (notes.length && DAILY_JOBS.every((j) => daily.done.includes(j.id))) {
      pay += DAILY_BONUS
      bonus = true
    }
    prev = snapshot
    const wallet = { ...st.wallet, daily, coins: st.wallet.coins + pay }
    saveWallet(wallet)
    store.setState({ wallet })
    if (notes.length) st.addCoins(0, `${notes.join(' · ')} · daily job done${bonus ? ` · all done, +${DAILY_BONUS} bonus` : ''}`, false)
  })
}

export { todayKey }
