import { create } from 'zustand'
import {
  BADGES,
  QUIZ,
  BIN_DEFS,
  DAY_LENGTH,
  STAR_THRESHOLDS,
  TASK_ROUNDS,
  TRASH_BY_ID,
  TRASH_TYPES,
  VILLAGER_LINES,
  type BinKind,
  type TaskDef,
  type TaskKind,
  type TrashType,
} from './gameData'
import { BIN_SLOTS, HEAPS, LEARNING_BOARD, VEHICLES, MAKER_PADS, MAKER_YARD, initialVehicles, RESPAWN_DELAY, SCHOOL_NAME, BIN_CAP, TRUCK_INFO, jobTimes, type VehicleEntity, type VehicleKind, GARDEN_PLOTS, HOUSES, POND, SAPLING_SPOTS, STATIC_NPCS, TAPS, ZONES, collides, distToRect, offPath } from './world'
import { act, ball, companionPos, dress, emitBurst, npcPositions, player, remotePlayers } from './sceneRegistry'
import { filterMessage, isKind } from './chatBot'
import { bridge } from './netBridge'
import { sfx, type SfxName } from '../audio/audio'
import { ITEM_BY_ID, ROUND_BONUS, TASK_COINS, capacityOf, loadWallet, saveWallet, type Cat, type Wallet } from './shop'
import { PROJECT_BY_ID, type Program } from './projects'
import { PROJECT_COINS, QUIZ_CAP, QUIZ_COIN, dailyOf, initEarning } from './earn'
import { GOOD_BY_ID, pickMaterials, usedSlots } from './goods'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface TrashItem {
  id: string
  typeId: string
  x: number
  z: number
  inPond?: boolean
}

export type Carrying = { kind: 'trash'; typeId: string; fromPond: boolean } | null

export interface TaskState extends TaskDef {
  progress: number
}

export interface Toast {
  id: string
  kind: 'good' | 'bad' | 'info' | 'team' | 'badge'
  emoji: string
  title: string
  text?: string
}

export interface Floater {
  id: string
  x: number
  z: number
  text: string
  color: string
}

export interface SaplingSpot {
  id: string
  x: number
  z: number
  planted: boolean
}

export interface ChatMsg {
  id: string
  from: string
  text: string
  flagged?: boolean
}

export interface Bubble {
  text: string
  n: number
}

export interface PetQuest {
  petIndex: number
  state: 'available' | 'lost' | 'carried' | 'cooldown'
  x: number
  z: number
  hint: string
  readyAt: number
  carrier?: string
}

export interface Profile {
  name: string
  /** things bought in the shop */
  pattern?: string
  shirt2?: string
  shirtId?: string
  pantsId?: string
  shoes?: string
  hat?: string
  glasses?: string
  back?: string
  /** projects standing in the Maker Yard (so other players can see them) */
  yard?: { pad: number; def: string; prog: Program }[]
  shirt: string
  hair: string
  pants: string
}

export interface Weather {
  wind: number
  windTarget: number
  windDir: number
  raining: number // seconds left
  storm: boolean
}

export type InteractionKind = 'pickup' | 'bin' | 'plant' | 'water' | 'lights' | 'tap' | 'feed' | 'look' | 'turn' | 'ride' | 'dog' | 'kick' | 'pet' | 'return-pet' | 'quest' | 'talk' | 'quiz-bowl' | 'adopt' | 'pet-companion' | 'dismiss-companion' | 'whistle'

export interface FootballMatch {
  red: number
  blue: number
  active: boolean
}

export interface CompanionState {
  kind: 'dog' | 'cat' | 'duck'
  name: string
  petAt: number
}

export interface QuizBowlState {
  active: boolean
  questionIdx: number
  score: number
  streak: number
  timer: number
  finished: boolean
}

export interface TownEcoStatus {
  tier: 1 | 2 | 3
  score: number
  label: string
  color: string
  solarCoverage: number
  waterClarity: number
  flowerBloom: number
}

export function getTownEcoStatus(stats: Stats): TownEcoStatus {
  const actions = (stats.sorted * 3) + (stats.trees * 5) + (stats.watered * 2) + (stats.lightsOff * 2) + (stats.tapsFixed * 4) + (stats.turned * 3)
  if (actions >= 25) {
    return {
      tier: 3,
      score: actions,
      label: '🌟 Thriving Eco-Paradise',
      color: '#10b981',
      solarCoverage: 1.0,
      waterClarity: 1.0,
      flowerBloom: 1.0,
    }
  }
  if (actions >= 10) {
    return {
      tier: 2,
      score: actions,
      label: '🌿 Greening Town',
      color: '#38bdf8',
      solarCoverage: 0.5,
      waterClarity: 0.65,
      flowerBloom: 0.6,
    }
  }
  return {
    tier: 1,
    score: actions,
    label: '🌱 Developing Town',
    color: '#f59e0b',
    solarCoverage: 0.0,
    waterClarity: 0.25,
    flowerBloom: 0.2,
  }
}

export interface Interaction {
  key: string
  kind: InteractionKind
  targetId: string
  label: string
  emoji: string
  x: number
  z: number
}

export interface Settings {
  showTips: boolean
  dayNight: boolean
  weather: boolean
}

export type Screen = 'welcome' | 'playing'

export interface Stats {
  sorted: number
  mistakes: number
  trees: number
  watered: number
  lightsOff: number
  tapsFixed: number
  learned: number
  turned: number
  rode: number
  pondCleaned: number
  coins: number
  kindWords: number
}

/** Everything that changes the shared world. Run by the host tab. */
export type Action =
  | { kind: 'pickup'; id: string }
  | { kind: 'sort'; slotId: string; typeId: string; fromPond: boolean }
  | { kind: 'drop'; typeId: string; x: number; z: number }
  | { kind: 'plant'; id: string }
  | { kind: 'water'; id: string }
  | { kind: 'lights'; id: string }
  | { kind: 'tap'; id: string }
  | { kind: 'look' }
  | { kind: 'turn'; id: string }
  | { kind: 'ride' }
  | { kind: 'mount'; id: string }
  | { kind: 'park'; vkind: VehicleKind; x: number; z: number; rot: number }
  | { kind: 'goal' }
  | { kind: 'coin'; id: string }
  | { kind: 'next-round' }
  | { kind: 'kind-words' }
  | { kind: 'chatted' }
  | { kind: 'talked' }

export interface Actor {
  id: string
  name: string
  x: number
  z: number
}

/** What the acting player should experience after an action */
/** One bin that filled up and is waiting for (or being served by) its truck */
export interface TruckJob {
  id: string
  kind: BinKind
  slotId: string
  station: string
  /** host clock (seconds) when the truck set off; null while it waits its turn */
  startedAt: number | null
  cleared: boolean
}

export interface ActionResult {
  /** set when you hop on (kind) or off (null) a vehicle */
  vehicle?: VehicleKind | null
  carrying?: Carrying
  toast?: Omit<Toast, 'id'>
  stat?: Partial<Stats>
  sfx?: SfxName
}

/** Shared world state, broadcast by the host tab */
export interface WorldSnapshot {
  energy: number
  happiness: number
  points: number
  trash: TrashItem[]
  saplings: SaplingSpot[]
  plots: Record<string, number>
  lights: Record<string, boolean>
  leaks: Record<string, boolean>
  heaps: Record<string, boolean>
  vehicles: VehicleEntity[]
  standTimers: Record<string, number>
  binFill: Record<string, number>
  jobs: TruckJob[]
  delivered: Record<BinKind, number>
  coins: { id: string; x: number; z: number }[]
  weather: Weather
  clock: number
  elapsed: number
  round: number
  tasks: TaskState[]
  roundComplete: boolean
  npcs: [string, number, number][]
  settings: Settings
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

let uid = 0
const nid = (p: string) => `${p}-${bridge.myId}-${++uid}`
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const withArticle = (w: string) => (/s$/i.test(w) ? `some ${w}` : /^[aeio]/i.test(w) ? `an ${w}` : `a ${w}`)

export const starsFor = (points: number) => STAR_THRESHOLDS.filter((t) => points >= t).length
export const starProgress = (points: number) => {
  const earned = starsFor(points)
  if (earned >= STAR_THRESHOLDS.length) return 1
  const prev = earned === 0 ? 0 : STAR_THRESHOLDS[earned - 1]
  return (points - prev) / (STAR_THRESHOLDS[earned] - prev)
}

/** 0 = dawn, 0.5 = afternoon, ~0.7–0.95 = night */
export const dayPhase = (t: number) => (t % DAY_LENGTH) / DAY_LENGTH
export const isNight = (t: number) => {
  const p = dayPhase(t)
  return p > 0.7 && p < 0.95
}
export const clockLabel = (t: number) => {
  const hours = (6 + dayPhase(t) * 24) % 24
  const h = Math.floor(hours)
  const m = Math.floor(((hours - h) * 60) / 15) * 15
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const makeTasks = (round: number): TaskState[] =>
  TASK_ROUNDS[round % TASK_ROUNDS.length].map((t) => ({
    ...t,
    target: t.kind === 'explore' ? t.target : t.target + Math.floor(round / TASK_ROUNDS.length) * Math.ceil(t.target / 2),
    progress: 0,
  }))

const makeSaplings = (n = 4): SaplingSpot[] => SAPLING_SPOTS.slice(0, n).map(([x, z]) => ({ id: nid('sapling'), x, z, planted: false }))

const kindsForSort = (type: TrashType, fromPond: boolean): TaskKind[] => {
  const kinds: TaskKind[] = ['sort-any']
  if (type.material === 'plastic') kinds.push('sort-plastic')
  if (type.material === 'paper') kinds.push('sort-paper')
  if (type.material === 'metal') kinds.push('sort-metal')
  if (type.bin === 'compost') kinds.push('compost')
  if (type.bin === 'trash') kinds.push('trash-correct')
  if (fromPond) kinds.push('pond-clean')
  return kinds
}

const pickTrashType = (tasks: TaskState[]): TrashType => {
  const open = tasks.filter((t) => t.progress < t.target).map((t) => t.kind)
  const weights = TRASH_TYPES.map((type) => 1 + kindsForSort(type, false).filter((k) => k !== 'sort-any' && open.includes(k)).length * 2)
  let r = Math.random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < TRASH_TYPES.length; i++) {
    r -= weights[i]
    if (r <= 0) return TRASH_TYPES[i]
  }
  return TRASH_TYPES[0]
}

export const randomPondSpot = (): [number, number] => {
  const a = Math.random() * Math.PI * 2
  const r = POND.r - 1.2 - Math.random() * 1.2
  return [POND.x + Math.cos(a) * r, POND.z + Math.sin(a) * r]
}

const lastLook: Record<string, number> = {}

const BADGE_RULES: Record<string, (s: GameState) => boolean> = {
  'first-sort': (s) => s.stats.sorted >= 1,
  sorter: (s) => s.stats.sorted >= 15,
  'green-thumb': (s) => s.stats.trees >= 3,
  gardener: (s) => s.stats.watered >= 5,
  'power-saver': (s) => s.stats.lightsOff >= 3,
  'water-saver': (s) => s.stats.tapsFixed >= 3,
  'bright-mind': (s) => s.stats.learned >= 3,
  'compost-pro': (s) => s.stats.turned >= 4,
  'pond-guardian': (s) => s.stats.pondCleaned >= 5,
  shopper: (s) => s.wallet.owned.length >= 3,
  'kind-heart': (s) => s.stats.kindWords >= 3,
  'team-player': (s) => s.chattedWith.length >= 1,
  explorer: (s) => s.visitedZones.length >= ZONES.length,
  'pet-friend': (s) => s.companion !== null,
  'striker': (s) => ((s.footballMatch?.red ?? 0) + (s.footballMatch?.blue ?? 0) >= 1),
  'quiz-master': (s) => ((s.quizBowl?.score ?? 0) >= 5),
}

/** Player name for an id (this tab or another tab) */
export const nameOf = (s: GameState, id: string) =>
  id === bridge.myId ? s.profile.name : (s.remotes[id]?.name ?? 'Someone')

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

export interface GameState {
  screen: Screen
  paused: boolean
  elapsed: number
  clock: number
  profile: Profile

  /* multiplayer */
  myId: string
  isHost: boolean
  remotes: Record<string, Profile>

  /* shared world */
  energy: number
  happiness: number
  points: number
  trash: TrashItem[]
  saplings: SaplingSpot[]
  plots: Record<string, number>
  lights: Record<string, boolean>
  leaks: Record<string, boolean>
  heaps: Record<string, boolean>
  vehicles: VehicleEntity[]
  standTimers: Record<string, number>
  binFill: Record<string, number>
  jobs: TruckJob[]
  delivered: Record<BinKind, number>
  coins: { id: string; x: number; z: number }[]
  weather: Weather
  round: number
  tasks: TaskState[]
  roundComplete: boolean

  /* this player */
  carrying: Carrying
  pending: boolean
  /** you made friends with the town dog (so it follows you) */
  chatWith: string | null
  chats: Record<string, ChatMsg[]>
  typing: Record<string, boolean>
  chattedWith: string[]
  talkedTo: string[]
  bubbles: Record<string, Bubble>
  nearby: Interaction | null
  nearbyMate: string | null
  zone: string | null
  visitedZones: string[]
  badges: string[]
  bigMap: boolean
  badgesOpen: boolean
  toasts: Toast[]
  floaters: Floater[]
  captions: { id: string; text: string }[]
  settings: Settings
  stats: Stats

  /* lifecycle */
  start: (profile: Profile) => void
  reset: () => void
  togglePause: () => void
  updateSettings: (s: Partial<Settings>) => void
  tick: (dt: number) => void
  applyOutfit: () => void
  wallet: Wallet
  addCoins: (n: number, why: string, quiet?: boolean) => void
  /** the Learning Corner quiz question being shown (index into QUIZ), or null */
  quiz: number | null
  answerQuiz: (choice: number) => 'right' | 'wrong'
  closeQuiz: () => void
  buyItem: (id: string) => 'ok' | 'poor' | 'owned'
  equipItem: (id: string) => void
  unequip: (cat: Cat) => void
  shopOpen: boolean
  setShop: (o?: boolean) => void
  /** which goods counter (2 or 3) is open, 0 = none */
  goodsCounter: 0 | 2 | 3
  setGoodsCounter: (n: 0 | 2 | 3) => void
  invOpen: boolean
  setInv: (o?: boolean) => void
  buyGood: (id: string) => 'ok' | 'poor' | 'full'
  dumpGood: (id: string) => void
  buildProject: (def: string, prog: Program) => boolean
  placeProject: (id: string) => 'ok' | 'far' | 'full'
  takeProject: (id: string) => void
  dumpProject: (id: string) => void
  binOpen: boolean
  setBin: (o?: boolean) => void
  processJobs: () => void

  /* Pillar 2 Features */
  footballMatch: FootballMatch
  scoreFootballGoal: (team: 'red' | 'blue') => void
  resetFootballMatch: () => void

  companion: CompanionState | null
  adoptCompanion: (kind: 'dog' | 'cat' | 'duck', name: string) => void
  petCompanion: () => void
  dismissCompanion: () => void

  quizBowl: QuizBowlState | null
  startQuizBowl: () => void
  answerQuizBowl: (choice: number) => boolean
  closeQuizBowl: () => void

  /* actions */
  spawnTrash: (x: number, z: number, inPond?: boolean) => void
  setNearby: (n: Interaction | null) => void
  setNearbyMate: (id: string | null) => void
  interact: () => void
  performInteraction: (n: Interaction) => void
  dropCarried: () => void
  dispatch: (a: Action) => void
  performAction: (a: Action, actor: Actor) => ActionResult | null
  applyResult: (r: ActionResult | null) => void
  collectCoin: (id: string) => void
  enterZone: (id: string | null) => void
  teamEvent: (actorId: string, toast: Omit<Toast, 'id'>) => void

  /* multiplayer sync */
  snapshot: () => WorldSnapshot
  applySnapshot: (w: WorldSnapshot) => void
  onRemoteEvent: (e: RemoteEvent) => void

  /* chat */
  openChat: (id: string) => void
  closeChat: () => void
  sendChat: (text: string) => void
  receiveChat: (from: string, text: string) => void
  say: (speaker: string, text: string, broadcast?: boolean) => void


  nextRound: () => void
  toggleBigMap: (open?: boolean) => void
  toggleBadges: (open?: boolean) => void
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  addFloater: (f: Omit<Floater, 'id'>, broadcast?: boolean) => void
  caption: (text: string) => void

  /* host helpers */
  progress: (kinds: TaskKind[], amount?: number) => void
  checkBadges: () => void
  reward: (o: { points?: number; energy?: number; happiness?: number; x?: number; z?: number; label?: string }) => void
}

/** Events the host sends to other tabs */
export type RemoteEvent =
  | { kind: 'result'; r: ActionResult }
  | { kind: 'toast'; toast: Omit<Toast, 'id'> }
  | { kind: 'floater'; f: Omit<Floater, 'id'> }
  | { kind: 'say'; speaker: string; text: string }
  | { kind: 'lightning' }
  | { kind: 'sfx'; name: SfxName; caption?: string }

const sendEvent = (e: RemoteEvent, to: string = 'all') => {
  if (bridge.isHost) bridge.send({ t: 'ev', to, e })
}

const initialWorld = () => ({
  elapsed: 0,
  clock: DAY_LENGTH * 0.08,
  energy: 45,
  happiness: 55,
  points: 0,
  trash: [] as TrashItem[],
  saplings: makeSaplings(),
  plots: { 'plot-0': 72, 'plot-1': 20, 'plot-2': 66, 'plot-3': 35 } as Record<string, number>,
  lights: Object.fromEntries(HOUSES.map((h, i) => [h.id, i === 2 || i === 5])) as Record<string, boolean>,
  leaks: Object.fromEntries(TAPS.map((t, i) => [t.id, i === 1])) as Record<string, boolean>,
  heaps: Object.fromEntries(HEAPS.map((h, i) => [h.id, i === 1])) as Record<string, boolean>,
  vehicles: initialVehicles(),
  standTimers: {} as Record<string, number>,
  binFill: Object.fromEntries(BIN_SLOTS.map((b) => [b.id, b.id === 'park-recycle' ? 4 : b.id === 'plaza-trash' ? 3 : 0])) as Record<string, number>,
  jobs: [] as TruckJob[],
  delivered: { recycle: 0, compost: 0, trash: 0 } as Record<BinKind, number>,
  coins: [] as { id: string; x: number; z: number }[],
  weather: { wind: 0.25, windTarget: 0.25, windDir: 0.6, raining: 0, storm: false } as Weather,
  round: 0,
  tasks: makeTasks(0),
  roundComplete: false,
})

const initialPlayer = () => ({
  screen: 'welcome' as Screen,
  paused: false,
  carrying: null as Carrying,
  pending: false,
  chatWith: null as string | null,
  chats: {} as Record<string, ChatMsg[]>,
  typing: {} as Record<string, boolean>,
  chattedWith: [] as string[],
  talkedTo: [] as string[],
  bubbles: {} as Record<string, Bubble>,
  nearby: null as Interaction | null,
  nearbyMate: null as string | null,
  zone: null as string | null,
  visitedZones: [] as string[],
  badges: [] as string[],
  bigMap: false,
  badgesOpen: false,
  toasts: [] as Toast[],
  floaters: [] as Floater[],
  captions: [] as { id: string; text: string }[],
  stats: { sorted: 0, mistakes: 0, trees: 0, watered: 0, lightsOff: 0, tapsFixed: 0, learned: 0, turned: 0, rode: 0, pondCleaned: 0, coins: 0, kindWords: 0 } as Stats,
  footballMatch: { red: 0, blue: 0, active: true } as FootballMatch,
  companion: null as CompanionState | null,
  quizBowl: null as QuizBowlState | null,
})

/* ------------------------------------------------------------------ */
/* Nearby interaction finder (called by the player controller)         */
/* ------------------------------------------------------------------ */

export function findInteraction(s: GameState, px: number, pz: number): Interaction | null {
  const options: (Interaction & { d: number })[] = []
  const add = (d: number, max: number, i: Omit<Interaction, 'key'>) => {
    if (d <= max) options.push({ ...i, key: `${i.kind}:${i.targetId}`, d })
  }
  const dist = (x: number, z: number) => Math.hypot(x - px, z - pz)

  if (s.carrying?.kind === 'trash') {
    for (const b of BIN_SLOTS) {
      const def = BIN_DEFS[b.kind]
      add(dist(b.x, b.z), 1.9, { kind: 'bin', targetId: b.id, label: `Put in ${def.label}`, emoji: def.emoji, x: b.x, z: b.z })
    }
  } else {
    for (const t of s.trash) {
      const type = TRASH_BY_ID[t.typeId]
      add(dist(t.x, t.z), t.inPond ? 3.2 : 1.7, { kind: 'pickup', targetId: t.id, label: `Pick up ${type.label}`, emoji: type.emoji, x: t.x, z: t.z })
    }
    for (const sp of s.saplings) if (!sp.planted) add(dist(sp.x, sp.z), 1.9, { kind: 'plant', targetId: sp.id, label: 'Plant a tree', emoji: '🌱', x: sp.x, z: sp.z })
    for (const p of GARDEN_PLOTS)
      if (s.plots[p.id] >= 60) add(distToRect(px, pz, p), 1.2, { kind: 'water', targetId: p.id, label: `Water the ${p.crop}s`, emoji: '💧', x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2 })
    for (const h of HOUSES) if (s.lights[h.id]) add(dist(h.door[0], h.door[1]), 2.3, { kind: 'lights', targetId: h.id, label: 'Switch off the wasted lights', emoji: '💡', x: h.door[0], z: h.door[1] })
    for (const t of TAPS) if (s.leaks[t.id]) add(dist(t.x, t.z), 1.8, { kind: 'tap', targetId: t.id, label: 'Fix the leaking tap', emoji: '🔧', x: t.x, z: t.z })
    for (const h of HEAPS) if (s.heaps[h.id]) add(dist(h.x, h.z), 2.0, { kind: 'turn', targetId: h.id, label: 'Turn the compost heap', emoji: '🪱', x: h.x, z: h.z })
    for (const v of s.vehicles) add(dist(v.x, v.z), 2.2, { kind: 'ride', targetId: v.id, label: `Hop on the ${VEHICLES[v.kind].name}`, emoji: VEHICLES[v.kind].emoji, x: v.x, z: v.z })
    add(Math.hypot(ball.x - px, ball.z - pz), 1.7, { kind: 'kick', targetId: 'ball', label: 'Kick the football', emoji: '⚽', x: ball.x, z: ball.z })
    add(dist(LEARNING_BOARD[0], LEARNING_BOARD[1]), 2.4, { kind: 'look', targetId: 'board', label: 'Learn something new', emoji: '💡', x: LEARNING_BOARD[0], z: LEARNING_BOARD[1] })
    for (const n of STATIC_NPCS) {
      add(dist(n.x, n.z), 2.3, { kind: 'talk', targetId: n.id, label: `Talk to ${n.name}`, emoji: '💬', x: n.x, z: n.z })
    }

    // 1. Football Match Whistle (sideline desk at sports field and school)
    const dPitch = dist(-39.5, -3.2)
    const dSchool = dist(-11, 8.5)
    const dWhistle = Math.min(dPitch, dSchool)
    const whistlePos = dPitch < dSchool ? [-39.5, -3.2] : [-11, 8.5]
    add(dWhistle, 2.5, {
      kind: 'whistle',
      targetId: 'match',
      label: `⚽ Match Whistle (Red ${s.footballMatch?.red ?? 0} - Blue ${s.footballMatch?.blue ?? 0})`,
      emoji: '⚽',
      x: whistlePos[0],
      z: whistlePos[1],
    })

    // 3. Animal Companion Spots
    const COMPANIONS = [
      { id: 'pup', name: 'Buster the Pup', x: -2, z: -2, emoji: '🐶' },
      { id: 'cat', name: 'Milo the Cat', x: 10, z: 4, emoji: '🐱' },
      { id: 'duck', name: 'Pip the Duckling', x: 28, z: -23, emoji: '🦆' },
    ]
    if (s.companion) {
      const dComp = Math.hypot(player.x - companionPos.x, player.z - companionPos.z)
      if (dComp < 2.0 && !player.vehicle) {
        const justPet = Date.now() - s.companion.petAt < 6000
        add(dComp, 2.0, {
          kind: justPet ? 'dismiss-companion' : 'pet-companion',
          targetId: 'comp',
          label: justPet ? `👋 Say Goodbye to ${s.companion.name} (Unpet)` : `Pet ${s.companion.name} 💖`,
          emoji: justPet ? '👋' : '🐾',
          x: companionPos.x,
          z: companionPos.z,
        })
      }
    } else {
      for (const pet of COMPANIONS) {
        add(dist(pet.x, pet.z), 2.2, {
          kind: 'adopt',
          targetId: pet.id,
          label: `Adopt ${pet.name}`,
          emoji: pet.emoji,
          x: pet.x,
          z: pet.z,
        })
      }
    }

    // 4. Eco Quiz Bowl (Podium in school courtyard and deck)
    const dPodium = dist(-6, -15.4)
    const dSouth = dist(-6, 26)
    const dBowl = Math.min(dPodium, dSouth)
    const bowlPos = dPodium < dSouth ? [-6, -15.4] : [-6, 26]
    add(dBowl, 2.5, {
      kind: 'quiz-bowl',
      targetId: 'bowl',
      label: '🏆 Play Eco Quiz Bowl',
      emoji: '🏆',
      x: bowlPos[0],
      z: bowlPos[1],
    })
    // villagers only wave hello (see NPCs.tsx); the story characters below can still be talked to
  }
  if (!options.length) return null
  options.sort((a, b) => a.d - b.d)
  const { d: _d, ...best } = options[0]
  void _d
  return best
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

export const useGame = create<GameState>()((set, get) => {
  const me = (): Actor => ({ id: bridge.myId, name: get().profile.name, x: player.x, z: player.z })

  return {
    ...initialWorld(),
    ...initialPlayer(),
    myId: bridge.myId,
    isHost: true,
    remotes: {},
    profile: { name: 'Eco Hero', shirt: '#3b82f6', hair: '#7c3f12', pants: '#1e3a8a' },
    settings: { showTips: true, dayNight: true, weather: true },

    /* ---------------------------- lifecycle ---------------------------- */

    start: (profile) => {
      // the colours chosen on the welcome screen are your base look; shop items go on top of them
      const wallet = { ...get().wallet, base: { shirt: profile.shirt, pants: profile.pants, hair: profile.hair } }
      saveWallet(wallet)
      set({ screen: 'playing', paused: false, profile, wallet })
      get().applyOutfit()
      // only seed litter if this tab is the world (first tab)
      if (bridge.isHost && get().trash.length === 0) {
        const starters: [number, number][] = [
          [-2.5, 2.5],
          [4.5, 1],
          [-1, -3.5],
          [1, 9],
          [12, 0.5],
        ]
        starters.forEach(([x, z]) => get().spawnTrash(x, z))
        ;[0, 1].forEach(() => get().spawnTrash(...randomPondSpot(), true))
      }
      const others = Object.keys(get().remotes).length
      get().pushToast({
        kind: 'info',
        emoji: '👋',
        title: `Welcome, ${profile.name}!`,
        text: others ? `${others} other player${others > 1 ? 's are' : ' is'} in town. Walk up to them to chat!` : 'Walk with WASD / arrow keys. Press E to pick up litter.',
      })
    },

    reset: () => {
      player.x = 2
      player.z = 4
      if (bridge.isHost) set({ ...initialWorld() })
      set({ ...initialPlayer() })
    },

    togglePause: () => set((s) => ({ paused: !s.paused })),

    /* ------------------------------- shop ------------------------------- */
    wallet: loadWallet(),
    shopOpen: false,
    setShop: (o) => set((s) => ({ shopOpen: o ?? !s.shopOpen })),
    goodsCounter: 0,
    setGoodsCounter: (n) => set({ goodsCounter: n }),
    invOpen: false,
    setInv: (o) => set((s) => ({ invOpen: o ?? !s.invOpen })),
    buyGood: (id) => {
      const g = GOOD_BY_ID[id]
      const w = get().wallet
      if (!g) return 'poor'
      if (w.coins < g.price) return 'poor'
      if (usedSlots(w.inv) + g.size > capacityOf(w.owned)) {
        sfx('wrong')
        get().pushToast({ kind: 'bad', emoji: '🎒', title: 'Your bag is full', text: 'Buy a bigger backpack at the Fashion & Bags counter to carry more.' })
        return 'full'
      }
      const wallet = { ...w, coins: w.coins - g.price, inv: { ...w.inv, [id]: (w.inv[id] ?? 0) + 1 } }
      saveWallet(wallet)
      set({ wallet })
      sfx('plant')
      get().pushToast({ kind: 'good', emoji: g.icon, title: `Bought: ${g.name}`, text: 'It is in your backpack (press I).' })
      return 'ok'
    },
    binOpen: false,
    quiz: null,
    answerQuiz: (choice) => {
      const i = get().quiz
      if (i === null) return 'wrong'
      const q = QUIZ[i]
      if (choice !== q.answer) {
        sfx('wrong')
        return 'wrong'
      }
      const w = get().wallet
      const daily = dailyOf(w)
      if (daily.quizPaid < QUIZ_CAP) {
        const wallet = { ...w, daily: { ...daily, quizPaid: daily.quizPaid + 1 } }
        saveWallet(wallet)
        set({ wallet })
        get().addCoins(QUIZ_COIN, 'Right answer at the Learning Corner!')
      } else sfx('correct')
      return 'right'
    },
    closeQuiz: () => set({ quiz: null }),

    /* Pillar 2: High-Energy Mini-Games & Animal Companions */
    footballMatch: { red: 0, blue: 0, active: true },
    scoreFootballGoal: (team) => {
      const match = get().footballMatch ?? { red: 0, blue: 0, active: true }
      const updated = { ...match, [team]: (match[team] ?? 0) + 1 }
      set({ footballMatch: updated })
      sfx('fanfare')
      get().pushToast({
        kind: 'good',
        emoji: '⚽',
        title: `GOAL FOR ${team.toUpperCase()} TEAM!`,
        text: `Match Score: Red ${updated.red} - Blue ${updated.blue}`,
      })
      get().reward({ points: 15, happiness: 5, energy: 2, x: ball.x, z: ball.z, label: '+15 ⚽' })
      get().checkBadges()
    },
    resetFootballMatch: () => {
      set({ footballMatch: { red: 0, blue: 0, active: true } })
      sfx('bell')
      get().pushToast({
        kind: 'info',
        emoji: '⚽',
        title: 'Football Match Reset!',
        text: 'Kick-off from center field. Red vs Blue!',
      })
    },

    companion: null,
    adoptCompanion: (kind, name) => {
      set({ companion: { kind, name, petAt: Date.now() }, happiness: 100 })
      sfx('fanfare')
      get().checkBadges()
      get().pushToast({
        kind: 'good',
        emoji: '💖',
        title: `Adopted ${name}!`,
        text: `${name} is now your loyal companion and will follow you everywhere. Tap to pet!`,
      })
    },
    petCompanion: () => {
      const comp = get().companion
      if (!comp) return
      set({
        companion: { ...comp, petAt: Date.now() },
        happiness: Math.min(100, get().happiness + 15),
      })
      sfx('fanfare')
      get().pushToast({
        kind: 'good',
        emoji: '💖',
        title: `${comp.name} is so happy!`,
        text: 'Caring for animals builds empathy and raises town happiness.',
      })
    },
    dismissCompanion: () => {
      set({ companion: null })
      get().pushToast({
        kind: 'info',
        emoji: '🐾',
        title: 'Companion stayed at the plaza',
        text: 'You can adopt them again anytime!',
      })
    },

    quizBowl: null,
    startQuizBowl: () => {
      set({
        quizBowl: {
          active: true,
          questionIdx: 0,
          score: 0,
          streak: 0,
          timer: 15,
          finished: false,
        },
      })
      sfx('discover')
    },
    answerQuizBowl: (choice) => {
      const bowl = get().quizBowl
      if (!bowl?.active || bowl.finished) return false
      const q = QUIZ[bowl.questionIdx % QUIZ.length]
      const correct = choice === q.answer
      const nextIdx = bowl.questionIdx + 1
      const isFinish = nextIdx >= 5
      const newStreak = correct ? bowl.streak + 1 : 0
      const newScore = correct ? bowl.score + 1 : bowl.score

      if (correct) {
        sfx('correct')
        const bonusPts = 10 * Math.max(1, newStreak)
        get().reward({ points: bonusPts, happiness: 4, energy: 2, x: player.x, z: player.z, label: `+${bonusPts} 💡` })
      } else {
        sfx('wrong')
      }

      set({
        quizBowl: {
          ...bowl,
          questionIdx: nextIdx,
          score: newScore,
          streak: newStreak,
          finished: isFinish,
        },
      })

      if (isFinish) {
        sfx('fanfare')
        get().addCoins(newScore * 5, `Eco Quiz Bowl score: ${newScore}/5!`)
        get().checkBadges()
      }
      return correct
    },
    closeQuizBowl: () => {
      set({ quizBowl: null })
    },
    setBin: (o) => set((st) => ({ binOpen: o ?? !st.binOpen })),
    dumpGood: (id) => {
      const w = get().wallet
      const n = w.inv[id] ?? 0
      if (n <= 0) return
      const inv = { ...w.inv }
      if (n === 1) delete inv[id]
      else inv[id] = n - 1
      const wallet = { ...w, inv }
      saveWallet(wallet)
      set({ wallet })
      sfx('drop')
      get().pushToast({ kind: 'info', emoji: '♻️', title: `${GOOD_BY_ID[id]?.name ?? 'Part'} recycled`, text: 'Electronics go in the e-waste bin so the metals can be reused, never in the normal bin.' })
    },
    buildProject: (def, prog) => {
      const d = PROJECT_BY_ID[def]
      const w = get().wallet
      const used = d && pickMaterials(d.needs, w.inv)
      if (!d || !used) return false
      const inv = { ...w.inv }
      for (const id of used) {
        inv[id]--
        if (inv[id] <= 0) delete inv[id]
      }
      const built = { id: nid('proj'), def, pad: null, prog }
      const wallet = { ...w, inv, projects: [...w.projects, built] }
      saveWallet(wallet)
      set({ wallet })
      sfx('fanfare')
      get().pushToast({ kind: 'good', emoji: d.icon, title: `You built: ${d.name}!`, text: d.fact })
      if (!get().wallet.built.includes(def)) {
        set({ wallet: { ...get().wallet, built: [...get().wallet.built, def] } })
        get().addCoins(PROJECT_COINS[d.level] ?? 15, `First time building the ${d.name}!`)
      }
      return true
    },
    placeProject: (id) => {
      const w = get().wallet
      const pr = w.projects.find((x) => x.id === id)
      if (!pr) return 'far'
      if (distToRect(player.x, player.z, MAKER_YARD) > 5) {
        get().pushToast({ kind: 'bad', emoji: '📍', title: 'Walk to the Maker Yard first', text: 'It is the paved yard just south of the CYBERSQUARE Store.' })
        return 'far'
      }
      const taken = new Set<number | null>([...w.projects.filter((x) => x.pad !== null).map((x) => x.pad), ...Object.values(get().remotes).flatMap((r) => (r.yard ?? []).map((y) => y.pad))])
      let best = -1
      MAKER_PADS.forEach(([px, pz], i) => {
        if (taken.has(i)) return
        if (best < 0 || Math.hypot(px - player.x, pz - player.z) < Math.hypot(MAKER_PADS[best][0] - player.x, MAKER_PADS[best][1] - player.z)) best = i
      })
      if (best < 0) {
        get().pushToast({ kind: 'bad', emoji: '🧱', title: 'The Maker Yard is full', text: 'Take one of your projects back to the shelf to free a pad.' })
        return 'full'
      }
      const wallet = { ...w, projects: w.projects.map((x) => (x.id === id ? { ...x, pad: best } : x)) }
      saveWallet(wallet)
      set({ wallet })
      sfx('wrench')
      emitBurst({ x: MAKER_PADS[best][0], z: MAKER_PADS[best][1], y: 0.6, color: '#fde047', n: 10, spread: 1.2, size: 0.04 })
      return 'ok'
    },
    takeProject: (id) => {
      const w = get().wallet
      const wallet = { ...w, projects: w.projects.map((x) => (x.id === id ? { ...x, pad: null } : x)) }
      saveWallet(wallet)
      set({ wallet })
      sfx('pickup')
    },
    dumpProject: (id) => {
      const w = get().wallet
      const wallet = { ...w, projects: w.projects.filter((x) => x.id !== id) }
      saveWallet(wallet)
      set({ wallet })
      sfx('drop')
    },
    addCoins: (n, why, quiet = false) => {
      if (n > 0) {
        const wallet = { ...get().wallet, coins: get().wallet.coins + n }
        saveWallet(wallet)
        set({ wallet })
        get().addFloater({ x: player.x, z: player.z, text: `+${n} 🪙`, color: '#ca8a04' })
      }
      if (quiet) return
      sfx('coin')
      get().pushToast({ kind: 'good', emoji: '🪙', title: n > 0 ? `+${n} coins` : 'Daily job done!', text: why })
    },
    buyItem: (id) => {
      const item = ITEM_BY_ID[id]
      const w = get().wallet
      if (!item) return 'owned'
      if (w.owned.includes(id)) return 'owned'
      if (w.coins < item.price) return 'poor'
      const wallet = { ...w, coins: w.coins - item.price, owned: [...w.owned, id] }
      saveWallet(wallet)
      set({ wallet })
      sfx('fanfare')
      get().checkBadges()
      get().equipItem(id)
      get().pushToast({ kind: 'good', emoji: item.icon, title: `You bought: ${item.name}`, text: 'It is on already! Change it any time in the shop.' })
      return 'ok'
    },
    equipItem: (id) => {
      const item = ITEM_BY_ID[id]
      const w = get().wallet
      if (!item || !w.owned.includes(id)) return
      const wallet = { ...w, equipped: { ...w.equipped, [item.cat]: id } }
      saveWallet(wallet)
      set({ wallet })
      get().applyOutfit()
      // a little twirl with sparkles so putting something on feels special
      dress.active = true
      dress.t = 0
      for (const c of ['#fde047', '#f472b6', '#67e8f9', '#ffffff']) emitBurst({ x: player.x, z: player.z, y: 1.0, color: c, n: 5, spread: 1.4, size: 0.032 })
      sfx('plant')
    },
    unequip: (cat) => {
      const w = get().wallet
      const equipped = { ...w.equipped }
      delete equipped[cat]
      const wallet = { ...w, equipped }
      saveWallet(wallet)
      set({ wallet })
      get().applyOutfit()
    },
    /** works out the character's look from the base colours plus what is equipped */
    applyOutfit: () => {
      const { wallet, profile } = get()
      const eq = (c: Cat) => (wallet.equipped[c] ? ITEM_BY_ID[wallet.equipped[c]!] : undefined)
      const base = wallet.base ?? { shirt: profile.shirt, pants: profile.pants, hair: profile.hair }
      const shirt = eq('shirt')
      set({
        profile: {
          ...profile,
          shirt: shirt?.color ?? base.shirt,
          shirt2: shirt?.color2,
          shirtId: shirt?.id,
          pantsId: eq('pants')?.id,
          pattern: shirt?.style,
          pants: eq('pants')?.color ?? base.pants,
          hair: eq('hair')?.color ?? base.hair,
          shoes: wallet.equipped.shoes,
          hat: wallet.equipped.hat,
          glasses: wallet.equipped.glasses,
          back: wallet.equipped.back,
        },
      })
    },

    /** HOST: start waiting trucks, empty bins when the truck has loaded, and pay out deliveries */
    processJobs: () => {
      if (!bridge.isHost) return
      const s = get()
      if (!s.jobs.length) return
      const running = new Set(s.jobs.filter((j) => j.startedAt !== null).map((j) => j.kind))
      let changed = false
      const binFill = { ...s.binFill }
      const delivered = { ...s.delivered }
      const finished: TruckJob[] = []
      const jobs = s.jobs.map((j) => {
        let job = j
        if (job.startedAt === null && !running.has(job.kind)) {
          running.add(job.kind)
          job = { ...job, startedAt: s.elapsed }
          changed = true
        }
        if (job.startedAt === null) return job
        const t = jobTimes(job.kind, job.station)
        const el = s.elapsed - job.startedAt
        if (!job.cleared && el >= t.loaded) {
          binFill[job.slotId] = 0
          job = { ...job, cleared: true }
          changed = true
        }
        if (el >= t.end) finished.push(job)
        return job
      })
      if (!changed && !finished.length) return
      const left = jobs.filter((j) => !finished.some((f) => f.id === j.id))
      for (const f of finished) delivered[f.kind] += BIN_CAP
      set({ jobs: left, binFill, delivered })
      for (const f of finished) {
        const info = TRUCK_INFO[f.kind]
        const home = jobTimes(f.kind, f.station).route[0]
        get().reward({ points: 15, energy: f.kind === 'compost' ? 3 : 6, happiness: f.kind === 'compost' ? 4 : 1, x: home[0], z: home[1], label: `+15 ${info.emoji}` })
        const toast = { kind: 'good' as const, emoji: info.emoji, title: `The ${info.name.toLowerCase()} delivered ${BIN_CAP} items`, text: `Everything went to ${info.dest}.` }
        get().pushToast(toast)
        sendEvent({ kind: 'toast', toast })
      }
      bridge.worldDirty()
    },
    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }))
      bridge.worldDirty()
    },

    /** Host-only world simulation, once per second */
    tick: (dt) => {
      const s = get()
      if (!bridge.isHost || s.screen !== 'playing' || s.roundComplete) return
      if (s.paused && Object.keys(s.remotes).length === 0) return
      const elapsed = s.elapsed + dt
      const clock = !s.settings.dayNight ? s.clock : s.clock + dt
      const lightsOn = Object.values(s.lights).filter(Boolean).length
      const leaking = Object.values(s.leaks).filter(Boolean).length

      let energy = s.energy - (0.08 + 0.06 * lightsOn + 0.05 * leaking) * dt
      let happiness = s.happiness - (0.04 + 0.02 * s.trash.length) * dt
      energy += 0.015 * s.stats.trees * dt
      if (s.weather.wind > 0.5 && !isNight(clock)) energy += 0.04 * dt // wind turbines love wind

      // Weather: wind changes every so often; rain showers and storms
      const w = { ...s.weather }
      if (s.settings.weather) {
        if (Math.random() < dt / 35) w.windTarget = rand([0.1, 0.2, 0.3, 0.45, 0.6, 0.85])
        if (Math.random() < dt / 60) w.windDir += (Math.random() - 0.5) * 1.2
        w.wind += (w.windTarget - w.wind) * Math.min(1, dt * 0.25)
        w.raining = Math.max(0, w.raining - dt)
        if (w.raining === 0) w.storm = false
        if (w.raining === 0 && Math.random() < dt / 150) {
          // short, gentle showers only (no storms: they are heavy on weak computers)
          w.storm = false
          w.raining = 18
          w.windTarget = Math.max(w.windTarget, 0.45)
          get().pushToast({ kind: 'info', emoji: w.storm ? '⛈️' : '🌧️', title: w.storm ? 'A storm is coming!' : 'It’s raining!', text: 'Rain is watering the garden for free.' })
          sendEvent({ kind: 'toast', toast: { kind: 'info', emoji: w.storm ? '⛈️' : '🌧️', title: w.storm ? 'A storm is coming!' : 'It’s raining!', text: 'Rain is watering the garden for free.' } })
        }
      } else {
        w.raining = 0
        w.storm = false
        w.wind += (0.2 - w.wind) * 0.2
      }

      const plots = Object.fromEntries(
        Object.entries(s.plots).map(([k, v]) => [k, w.raining > 0 ? Math.max(0, v - 6 * dt) : Math.min(100, v + (0.35 + Math.random() * 0.4) * dt)]),
      )

      set({ elapsed, clock, energy: clamp(energy), happiness: clamp(happiness), plots, weather: w })

      bridge.worldDirty()
    },

    /* ---------------------------- the world ---------------------------- */

    spawnTrash: (x, z, inPond = false) => {
      const s = get()
      if (!bridge.isHost || s.trash.length >= 16) return
      if (!inPond) [x, z] = offPath(x, z)
      const type = pickTrashType(s.tasks)
      set({ trash: [...s.trash, { id: nid('trash'), typeId: type.id, x, z, inPond }] })
      bridge.worldDirty()
    },

    setNearby: (n) => {
      if (get().nearby?.key !== n?.key) set({ nearby: n })
    },
    setNearbyMate: (id) => {
      if (get().nearbyMate !== id) set({ nearbyMate: id })
    },

    /** Called when you press E */
    interact: () => {
      const s = get()
      if (s.screen !== 'playing' || s.paused || s.pending || act.kind) return
      if (player.vehicle) {
        // hop off whatever you are riding
        const kind = player.vehicle
        player.vehicle = null
        sfx('drop')
        get().dispatch({ kind: 'park', vkind: kind, x: player.x + Math.sin(player.heading) * 0.2, z: player.z + Math.cos(player.heading) * 0.2, rot: player.heading })
        get().pushToast({ kind: 'info', emoji: '🚶', title: `You parked the ${VEHICLES[kind].name}`, text: 'It stays right here for the next rider.' })
        return
      }
      const n = findInteraction(s, player.x, player.z)
      if (!n) {
        if (s.carrying) get().dropCarried()
        return
      }
      // turn to face it, play a gesture, and apply the result at the moment of the gesture
      const timing: Record<string, [number, number]> = {
        water: [1.1, 0.5],
        tap: [1.1, 0.55],
        plant: [1.1, 0.5],
        lights: [0.8, 0.4],
        look: [1.3, 0.5],
        dog: [1.0, 0.45],
        kick: [0.55, 0.45],
        turn: [1.4, 0.6],
        ride: [0.7, 0.45],
        talk: [1.0, 0.35],
        quest: [1.0, 0.35],
        bin: [0.8, 0.4],
        pickup: [0.8, 0.4],
      }
      if (n.kind === 'plant') {
        const dx = player.x - n.x
        const dz = player.z - n.z
        const d = Math.hypot(dx, dz)
        const safeDist = 1.15
        if (d < safeDist) {
          const angle = d > 0.05 ? Math.atan2(dx, dz) : -player.heading
          player.x = n.x + Math.sin(angle) * safeDist
          player.z = n.z + Math.cos(angle) * safeDist
        }
      }
      const [dur, fireFrac] = timing[n.kind] ?? [0.8, 0.4]
      act.kind = n.kind
      act.t = 0
      act.dur = dur
      act.fireAt = dur * fireFrac
      act.tx = n.x
      act.tz = n.z
      act.fired = false
      act.fire = () => {
        const fx = player.x + Math.sin(player.heading) * 0.5
        const fz = player.z + Math.cos(player.heading) * 0.5
        const at = { x: n.x, z: n.z }
        if (n.kind === 'water') emitBurst({ x: fx, z: fz, y: 0.9, to: [at.x, at.z], color: '#7dd3fc', n: 18, size: 0.07 })
        else if (n.kind === 'tap') emitBurst({ x: at.x, z: at.z, y: 0.9, color: '#7dd3fc', n: 14, spread: 1.2 })
        else if (n.kind === 'plant') emitBurst({ x: at.x, z: at.z, y: 0.3, color: '#8b5a2b', n: 12, spread: 1.4 })
        else if (n.kind === 'lights') emitBurst({ x: at.x, z: at.z, y: 1.2, color: '#fde047', n: 10 })
        else if (n.kind === 'bin') emitBurst({ x: at.x, z: at.z, y: 1.0, color: '#86efac', n: 10 })
        get().performInteraction(n)
      }
    },

    performInteraction: (n) => {
      const s = get()
      if (s.screen !== 'playing' || s.paused || s.pending) return
      switch (n.kind) {
        case 'pickup':
          return get().dispatch({ kind: 'pickup', id: n.targetId })
        case 'bin':
          if (s.carrying?.kind === 'trash') get().dispatch({ kind: 'sort', slotId: n.targetId, typeId: s.carrying.typeId, fromPond: s.carrying.fromPond })
          return
        case 'plant':
          return get().dispatch({ kind: 'plant', id: n.targetId })
        case 'water':
          return get().dispatch({ kind: 'water', id: n.targetId })
        case 'lights':
          return get().dispatch({ kind: 'lights', id: n.targetId })
        case 'tap':
          return get().dispatch({ kind: 'tap', id: n.targetId })
        case 'look':
          set({ quiz: Math.floor(Math.random() * QUIZ.length) })
          return get().dispatch({ kind: 'look' })
        case 'kick': {
          // a strong kick in the direction you are facing
          const sp = 11
          ball.vx = Math.sin(player.heading) * sp
          ball.vz = Math.cos(player.heading) * sp
          ball.vy = 3.2
          sfx('drop')
          return
        }
        case 'turn':
          return get().dispatch({ kind: 'turn', id: n.targetId })
        case 'ride':
          return get().dispatch({ kind: 'mount', id: n.targetId })
        case 'talk': {
          // talking is local – it doesn't change the shared world
          const stat = STATIC_NPCS.find((x) => x.id === n.targetId)
          const pool = s.happiness < 35 ? VILLAGER_LINES.sad : (stat && VILLAGER_LINES[stat.id]) || VILLAGER_LINES.default
          get().say(n.targetId, rand(pool))
          sfx('chat')
          if (!s.talkedTo.includes(n.targetId)) {
            set({ talkedTo: [...s.talkedTo, n.targetId] })
            get().dispatch({ kind: 'talked' })
          }
          return
        }
        case 'whistle':
          get().resetFootballMatch()
          return
        case 'adopt': {
          const COMPANIONS = [
            { id: 'pup', name: 'Buster', kind: 'dog' as const },
            { id: 'cat', name: 'Milo', kind: 'cat' as const },
            { id: 'duck', name: 'Pip', kind: 'duck' as const },
          ]
          const pet = COMPANIONS.find((p) => p.id === n.targetId)
          if (pet) get().adoptCompanion(pet.kind, pet.name)
          return
        }
        case 'pet-companion':
          get().petCompanion()
          return
        case 'dismiss-companion':
          get().dismissCompanion()
          return
        case 'quiz-bowl':
          get().startQuizBowl()
          return
      }
    },

    dropCarried: () => {
      const s = get()
      if (!s.carrying || s.pending) return
      let ox = player.x + Math.sin(player.heading) * 0.8
      let oz = player.z + Math.cos(player.heading) * 0.8
      if (collides(ox, oz, 0.2)) {
        ox = player.x
        oz = player.z
      }
      if (s.carrying.kind === 'trash') get().dispatch({ kind: 'drop', typeId: s.carrying.typeId, x: ox, z: oz })
    },

    /** Run an action: directly if this tab is the host, otherwise ask the host tab */
    dispatch: (a) => {
      if (bridge.isHost) {
        get().applyResult(get().performAction(a, me()))
        bridge.worldDirty()
      } else {
        set({ pending: true })
        bridge.send({ t: 'act', to: bridge.hostId, a })
        setTimeout(() => get().pending && set({ pending: false }), 1500)
      }
    },

    applyResult: (r) => {
      set({ pending: false })
      if (!r) return
      if ('carrying' in r) set({ carrying: r.carrying ?? null })
      if ('vehicle' in r) {
        player.vehicle = r.vehicle ?? null
        player.odo = 0
        player.vspeed = 0
      }
      if (r.stat) set((s) => ({ stats: Object.fromEntries(Object.entries(s.stats).map(([k, v]) => [k, v + ((r.stat as Record<string, number>)[k] ?? 0)])) as unknown as Stats }))
      if (r.toast) get().pushToast(r.toast)
      if (r.sfx) sfx(r.sfx)
      get().checkBadges()
    },

    /**
     * HOST ONLY: apply an action from any player (this tab or another tab)
     * to the shared world and return what that player should experience.
     */
    performAction: (a, actor) => {
      const s = get()
      const tips = s.settings.showTips
      const team = (emoji: string, title: string) => get().teamEvent(actor.id, { kind: 'team', emoji, title: `${actor.name} ${title}`, text: 'Great teamwork!' })

      switch (a.kind) {
        case 'pickup': {
          const item = s.trash.find((t) => t.id === a.id)
          if (!item) return { toast: { kind: 'info', emoji: '🙂', title: 'Someone already picked that up!' } }
          set({ trash: s.trash.filter((t) => t.id !== item.id) })
          const type = TRASH_BY_ID[item.typeId]
          return {
            carrying: { kind: 'trash', typeId: item.typeId, fromPond: !!item.inPond },
            sfx: 'pickup',
            toast: { kind: 'info', emoji: type.emoji, title: `You picked up ${withArticle(type.label.toLowerCase())}`, text: 'Walk to a bin station and choose the right bin.' },
          }
        }
        case 'sort': {
          const slot = BIN_SLOTS.find((b) => b.id === a.slotId)
          const type = TRASH_BY_ID[a.typeId]
          if (!slot || !type) return { carrying: null }
          const bin = BIN_DEFS[slot.kind]
          if (type.bin === slot.kind) {
            const fill = s.binFill[slot.id] ?? 0
            if (fill >= BIN_CAP) return { toast: { kind: 'info', emoji: '🚛', title: `This ${bin.label} bin is full!`, text: 'A truck is on its way to empty it. Try another bin station meanwhile.' } }
            const binFill = { ...s.binFill, [slot.id]: fill + 1 }
            let jobs = s.jobs
            if (fill + 1 >= BIN_CAP && !jobs.some((j) => j.slotId === slot.id)) {
              jobs = [...jobs, { id: nid('job'), kind: slot.kind, slotId: slot.id, station: slot.station, startedAt: null, cleared: false }]
              team(TRUCK_INFO[slot.kind].emoji, `filled a ${bin.label} bin. The ${TRUCK_INFO[slot.kind].name.toLowerCase()} is coming!`)
            }
            set({ binFill, jobs })
            get().reward({ points: a.fromPond ? 15 : 10, energy: 4, happiness: a.fromPond ? 3 : 1.5, x: slot.x, z: slot.z, label: `+${a.fromPond ? 15 : 10} ⭐` })
            get().progress(kindsForSort(type, a.fromPond))
            team(type.emoji, `sorted ${withArticle(type.label.toLowerCase())}!`)
            return {
              carrying: null,
              sfx: 'correct',
              stat: { sorted: 1, pondCleaned: a.fromPond ? 1 : 0 },
              toast: { kind: 'good', emoji: type.emoji, title: `Great! ${type.label} → ${bin.label}`, text: tips ? type.tip : undefined },
            }
          }
          const right = BIN_DEFS[type.bin]
          set({ energy: clamp(s.energy - 2), trash: [...s.trash, { id: nid('trash'), typeId: a.typeId, x: slot.x + 1.1, z: slot.z + 1.1 }] })
          get().addFloater({ x: slot.x, z: slot.z, text: 'Oops! 🤔', color: '#dc2626' }, true)
          return {
            carrying: null,
            sfx: 'wrong',
            stat: { mistakes: 1 },
            toast: { kind: 'bad', emoji: '💡', title: `Not quite! ${type.label} goes in ${right.emoji} ${right.label}.`, text: tips ? type.tip : undefined },
          }
        }
        case 'drop':
          set({ trash: [...s.trash, { id: nid('trash'), typeId: a.typeId, x: a.x, z: a.z }] })
          return { carrying: null, sfx: 'drop' }
        case 'plant': {
          const spot = s.saplings.find((p) => p.id === a.id)
          if (!spot || spot.planted) return null
          const dx = player.x - spot.x
          const dz = player.z - spot.z
          const d = Math.hypot(dx, dz)
          const safeDist = 1.15
          if (d < safeDist) {
            const angle = d > 0.05 ? Math.atan2(dx, dz) : -player.heading
            player.x = spot.x + Math.sin(angle) * safeDist
            player.z = spot.z + Math.cos(angle) * safeDist
          }
          set({ saplings: s.saplings.map((p) => (p.id === spot.id ? { ...p, planted: true } : p)) })
          get().reward({ points: 15, energy: 5, happiness: 3, x: spot.x, z: spot.z, label: '+15 🌳' })
          get().progress(['plant-tree'])
          team('🌳', 'planted a tree!')
          return { sfx: 'plant', stat: { trees: 1 }, toast: { kind: 'good', emoji: '🌳', title: 'You planted a tree!', text: tips ? 'Trees clean the air and give animals a home.' : undefined } }
        }
        case 'water': {
          if ((s.plots[a.id] ?? 0) < 60) return null
          const plot = GARDEN_PLOTS.find((p) => p.id === a.id)!
          set({ plots: { ...s.plots, [a.id]: 0 } })
          get().reward({ points: 8, happiness: 3, energy: 1, x: (plot.x0 + plot.x1) / 2, z: (plot.z0 + plot.z1) / 2, label: '+8 💧' })
          get().progress(['water-garden'])
          team('💧', 'watered the garden!')
          return { sfx: 'water', stat: { watered: 1 }, toast: { kind: 'good', emoji: '💧', title: 'Glug glug! The plants say thank you.', text: tips ? 'Watering in the morning or evening wastes less water.' : undefined } }
        }
        case 'lights': {
          if (!s.lights[a.id]) return null
          const h = HOUSES.find((x) => x.id === a.id)!
          set({ lights: { ...s.lights, [a.id]: false } })
          get().reward({ points: 8, energy: 6, x: h.door[0], z: h.door[1], label: '+6 ⚡' })
          get().progress(['lights-off'])
          team('💡', 'saved energy!')
          return { sfx: 'switch', stat: { lightsOff: 1 }, toast: { kind: 'good', emoji: '💡', title: 'Click! Lights off in the empty house.', text: tips ? 'Switching off lights in empty rooms saves energy.' : undefined } }
        }
        case 'tap': {
          if (!s.leaks[a.id]) return null
          const t = TAPS.find((x) => x.id === a.id)!
          set({ leaks: { ...s.leaks, [a.id]: false } })
          get().reward({ points: 8, energy: 3, happiness: 2, x: t.x, z: t.z, label: '+8 🚰' })
          get().progress(['fix-tap'])
          team('🔧', 'fixed a leaking tap!')
          return { sfx: 'wrench', stat: { tapsFixed: 1 }, toast: { kind: 'good', emoji: '🔧', title: 'Leak fixed!', text: tips ? 'A dripping tap can waste 20 litres of water a day!' : undefined } }
        }
        case 'look': {
          const last = lastLook[actor.id] ?? -99
          if (s.elapsed - last < 20) return { sfx: 'chat', toast: { kind: 'info', emoji: '💡', title: 'Take a moment to think about it…' } }
          lastLook[actor.id] = s.elapsed
          get().reward({ points: 10, happiness: 3, energy: 1, x: LEARNING_BOARD[0], z: LEARNING_BOARD[1], label: '+10 💡' })
          get().progress(['look'])
          return { sfx: 'discover', stat: { learned: 1 }, toast: { kind: 'good', emoji: '💡', title: 'Learning time!', text: 'Answer the question on the chalkboard to earn coins.' } }
        }
        case 'goal':
          team('⚽', 'scored a goal at school!')
          return { sfx: 'fanfare', toast: { kind: 'good', emoji: '⚽', title: 'GOAL! What a shot!', text: tips ? 'Playing outdoors keeps us healthy and happy.' : undefined } }
        case 'turn': {
          if (!s.heaps[a.id]) return null
          const h = HEAPS.find((x) => x.id === a.id)!
          set({ heaps: { ...s.heaps, [a.id]: false } })
          get().reward({ points: 8, happiness: 2, energy: 3, x: h.x, z: h.z, label: '+8 🪱' })
          get().progress(['turn-compost'])
          team('🪱', 'turned a compost heap!')
          return { sfx: 'plant', stat: { turned: 1 }, toast: { kind: 'good', emoji: '🪱', title: 'Turned the compost!', text: tips ? 'Turning compost gives worms air, so scraps become rich soil faster.' : undefined } }
        }
        case 'mount': {
          const v = s.vehicles.find((x) => x.id === a.id)
          if (!v) return { toast: { kind: 'info', emoji: '🙂', title: 'Someone just took it!', text: 'A new one will arrive soon.' } }
          const standTimers = v.home ? { ...s.standTimers, [v.home]: s.elapsed + RESPAWN_DELAY } : s.standTimers
          set({ vehicles: s.vehicles.filter((x) => x.id !== a.id), standTimers })
          const spec = VEHICLES[v.kind]
          return { vehicle: v.kind, sfx: 'pickup', toast: { kind: 'info', emoji: spec.emoji, title: `Riding the ${spec.name}!`, text: `${spec.blurb} Press E to park it. Shift goes faster.` } }
        }
        case 'park': {
          // keep at most six parked vehicles around; the oldest one is tidied away
          let list = [...s.vehicles, { id: nid('veh'), kind: a.vkind, x: a.x, z: a.z, rot: a.rot } as VehicleEntity]
          const parked = list.filter((v) => !v.home)
          if (parked.length > 6) list = list.filter((v) => v.id !== parked[0].id)
          set({ vehicles: list })
          return { vehicle: null }
        }
        case 'ride':
          get().reward({ points: 6, energy: 3, happiness: 1, x: actor.x, z: actor.z, label: '+6 🚲' })
          return { sfx: 'coin', stat: { rode: 1 } }
        case 'coin': {
          const c = s.coins.find((x) => x.id === a.id)
          if (!c) return null
          set({ coins: s.coins.filter((x) => x.id !== a.id) })
          get().reward({ points: 5, x: c.x, z: c.z, label: '+5 🪙' })
          get().progress(['collect-coins'])
          return { sfx: 'coin', stat: { coins: 1 } }
        }
        case 'next-round':
          if (s.roundComplete) get().nextRound()
          return null
        case 'kind-words':
          get().reward({ points: 5, happiness: 2, x: actor.x, z: actor.z, label: '+2 💚' })
          get().progress(['kind-words'])
          return null
        case 'chatted':
          get().progress(['chat'])
          return null
        case 'talked':
          return null
      }
      return null
    },

    /** Host: tell everyone else what a player did */
    teamEvent: (actorId, toast) => {
      if (actorId !== bridge.myId) get().pushToast(toast)
      for (const id of Object.keys(get().remotes)) if (id !== actorId) sendEvent({ kind: 'toast', toast }, id)
    },

    collectCoin: (id) => {
      if (get().pending) return
      get().dispatch({ kind: 'coin', id })
    },

    enterZone: (id) => {
      const s = get()
      if (s.zone === id) return
      set({ zone: id })
      if (!id) return
      if (!s.visitedZones.includes(id)) {
        const visited = [...s.visitedZones, id]
        const zone = ZONES.find((z) => z.id === id)!
        set({ visitedZones: visited, tasks: s.tasks.map((t) => (t.kind === 'explore' ? { ...t, progress: Math.max(t.progress, Math.min(t.target, visited.length)) } : t)) })
        if (s.visitedZones.length > 0) {
          set((st) => ({ points: st.points + 10 }))
          get().addFloater({ x: player.x, z: player.z, text: '+10 🧭', color: '#16a34a' })
          get().pushToast({ kind: 'info', emoji: zone.emoji, title: `You discovered ${zone.id === 'school' ? SCHOOL_NAME : zone.name}!`, text: `${visited.length}/${ZONES.length} zones explored` })
          sfx('discover')
        }
      }
      get().checkBadges()
    },

    /* ------------------------- multiplayer sync ------------------------- */

    snapshot: () => {
      const s = get()
      const npcs: [string, number, number][] = []
      for (const [id, n] of npcPositions) if (n.kind !== 'static') npcs.push([id, Math.round(n.x * 100) / 100, Math.round(n.z * 100) / 100])
      return {
        energy: s.energy,
        happiness: s.happiness,
        points: s.points,
        trash: s.trash,
        saplings: s.saplings,
        plots: s.plots,
        lights: s.lights,
        leaks: s.leaks,
        heaps: s.heaps,
        vehicles: s.vehicles,
        standTimers: s.standTimers,
        binFill: s.binFill,
        jobs: s.jobs,
        delivered: s.delivered,
        coins: s.coins,
        weather: s.weather,
        clock: s.clock,
        elapsed: s.elapsed,
        round: s.round,
        tasks: s.tasks,
        roundComplete: s.roundComplete,
        npcs,
        settings: s.settings,
      }
    },

    applySnapshot: (w) => {
      const s = get()
      const { npcs, ...rest } = w
      // keep my explore progress (it's personal)
      const tasks = rest.tasks.map((t) => (t.kind === 'explore' ? { ...t, progress: Math.max(t.progress, Math.min(t.target, s.visitedZones.length)) } : t))
      set({ ...rest, tasks })
      void npcs
    },

    onRemoteEvent: (e) => {
      switch (e.kind) {
        case 'result':
          return get().applyResult(e.r)
        case 'toast':
          get().pushToast(e.toast)
          if (e.toast.kind === 'team') sfx('team')
          return
        case 'floater':
          return get().addFloater(e.f)
        case 'say':
          return get().say(e.speaker, e.text)
        case 'lightning':
          window.dispatchEvent(new CustomEvent('eco-lightning'))
          setTimeout(() => sfx('thunder'), 400 + Math.random() * 900)
          get().caption('⚡ Thunder rumbles')
          return
        case 'sfx':
          sfx(e.name)
          if (e.caption) get().caption(e.caption)
      }
    },

    /* ------------------------------- chat ------------------------------- */

    openChat: (id) => {
      const s = get()
      if (!s.remotes[id]) return
      set({ chatWith: id })
      sfx('chat')
    },

    closeChat: () => set({ chatWith: null }),

    sendChat: (raw) => {
      const s = get()
      const to = s.chatWith
      if (!to || !raw.trim()) return
      const { clean, flagged } = filterMessage(raw.trim())
      const kind = !flagged && isKind(clean)
      const first = !s.chattedWith.includes(to)
      set({
        chats: { ...s.chats, [to]: [...(s.chats[to] ?? []), { id: nid('msg'), from: 'you', text: clean, flagged }] },
        chattedWith: first ? [...s.chattedWith, to] : s.chattedWith,
      })
      get().say('you', clean, true)
      sfx('chat')
      if (first) get().dispatch({ kind: 'chatted' })
      if (kind) {
        set((st) => ({ stats: { ...st.stats, kindWords: st.stats.kindWords + 1 } }))
        get().dispatch({ kind: 'kind-words' })
      }
      if (flagged) set((st) => ({ happiness: clamp(st.happiness - 3) }))
      get().checkBadges()

      if (s.remotes[to]) bridge.send({ t: 'chat', to, text: clean })
    },

    receiveChat: (from, raw) => {
      const s = get()
      const { clean } = filterMessage(raw)
      set({ chats: { ...s.chats, [from]: [...(s.chats[from] ?? []), { id: nid('msg'), from, text: clean }] } })
      sfx('chat')
      if (s.chatWith !== from) get().pushToast({ kind: 'info', emoji: '💬', title: `${s.remotes[from]?.name ?? 'A player'} says:`, text: clean })
    },

    say: (speaker, text, broadcast = false) => {
      const n = (get().bubbles[speaker]?.n ?? 0) + 1
      set((s) => ({ bubbles: { ...s.bubbles, [speaker]: { text, n } } }))
      if (broadcast) {
        // other tabs see my bubble above my head (speaker 'you' → my id)
        if (speaker === 'you') bridge.send({ t: 'say', text })
        else sendEvent({ kind: 'say', speaker, text })
      }
      setTimeout(() => {
        const b = get().bubbles[speaker]
        if (b?.n === n) {
          const next = { ...get().bubbles }
          delete next[speaker]
          set({ bubbles: next })
        }
      }, 4200)
    },

    /* ------------------------------- rounds ------------------------------- */

    nextRound: () => {
      const s = get()
      if (!bridge.isHost) return get().dispatch({ kind: 'next-round' })
      const round = s.round + 1
      const tasks = makeTasks(round)
      const needTrees = tasks.filter((t) => t.kind === 'plant-tree').reduce((a, t) => a + t.target, 0)
      const used = new Set(s.saplings.map((p) => `${p.x},${p.z}`))
      const fresh = SAPLING_SPOTS.filter(([x, z]) => !used.has(`${x},${z}`))
        .slice(0, Math.max(needTrees, 2))
        .map(([x, z]) => ({ id: nid('sapling'), x, z, planted: false }))
      set({ round, tasks, roundComplete: false, saplings: [...s.saplings, ...fresh] })
      if (tasks.some((t) => t.kind === 'pond-clean')) [0, 1, 2].forEach(() => get().spawnTrash(...randomPondSpot(), true))
      if (tasks.some((t) => t.kind === 'lights-off')) set((st) => ({ lights: { ...st.lights, [HOUSES[1].id]: true, [HOUSES[6].id]: true } }))
      if (tasks.some((t) => t.kind === 'turn-compost')) set((st) => ({ heaps: { ...st.heaps, [HEAPS[0].id]: true, [HEAPS[2].id]: true } }))
      if (tasks.some((t) => t.kind === 'fix-tap')) set((st) => ({ leaks: { ...st.leaks, [TAPS[0].id]: true, [TAPS[3].id]: true } }))
      const toast = { kind: 'info' as const, emoji: '🚀', title: `Challenge ${round + 1} unlocked!`, text: 'Check your new tasks.' }
      get().pushToast(toast)
      sendEvent({ kind: 'toast', toast })
      bridge.worldDirty()
    },

    /* ------------------------------ UI bits ------------------------------ */

    toggleBigMap: (open) => set((s) => ({ bigMap: open ?? !s.bigMap })),
    toggleBadges: (open) => set((s) => ({ badgesOpen: open ?? !s.badgesOpen })),

    pushToast: (t) => {
      const id = nid('toast')
      set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }))
      setTimeout(() => get().dismissToast(id), t.text ? 4500 : 3000)
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    addFloater: (f, broadcast = false) => {
      const id = nid('floater')
      set((s) => ({ floaters: [...s.floaters, { ...f, id }] }))
      setTimeout(() => set((s) => ({ floaters: s.floaters.filter((x) => x.id !== id) })), 1400)
      if (broadcast) sendEvent({ kind: 'floater', f })
    },

    caption: (text) => {
      const id = nid('cap')
      set((s) => ({ captions: [...s.captions.slice(-2), { id, text }] }))
      setTimeout(() => set((s) => ({ captions: s.captions.filter((c) => c.id !== id) })), 3500)
    },

    /* ------------------------------ helpers ------------------------------ */

    reward: ({ points = 0, energy = 0, happiness = 0, x, z, label }) => {
      set((s) => ({ points: s.points + points, energy: clamp(s.energy + energy), happiness: clamp(s.happiness + happiness) }))
      if (label && x !== undefined && z !== undefined) get().addFloater({ x, z, text: label, color: '#16a34a' }, true)
    },

    progress: (kinds, amount = 1) => {
      const s = get()
      if (!bridge.isHost) return
      const tasks = s.tasks.map((t) => (kinds.includes(t.kind) ? { ...t, progress: Math.min(t.target, t.progress + amount) } : t))
      const done = !s.roundComplete && tasks.every((t) => t.progress >= t.target)
      set({ tasks })
      if (done) {
        set({ roundComplete: true, chatWith: null })
        get().reward({ points: 50, happiness: 10 })
        sfx('fanfare')
        sendEvent({ kind: 'sfx', name: 'fanfare' })
      }
    },

    checkBadges: () => {
      const s = get()
      const earned = BADGES.filter((b) => !s.badges.includes(b.id) && BADGE_RULES[b.id]?.(s))
      if (!earned.length) return
      set({ badges: [...s.badges, ...earned.map((b) => b.id)] })
      earned.forEach((b) => {
        get().pushToast({ kind: 'badge', emoji: b.emoji, title: `Badge unlocked: ${b.name}!`, text: b.desc })
        sfx('badge')
      })
    },
  }
})

/** Positions of other real players for game logic (e.g. proximity chat) */
export const remoteIds = () => [...remotePlayers.keys()]

export { BIN_DEFS }
export type { BinKind }

/** Coins are earned by finishing tasks: each time one of the round's tasks completes you get paid once. */
useGame.subscribe((s, prev) => {
  if (s.screen !== 'playing') return
  if (s.tasks === prev.tasks && s.roundComplete === prev.roundComplete) return
  const paid = new Set(s.wallet.paid)
  const keys: string[] = []
  let earn = 0
  for (const t of s.tasks) {
    const key = `${s.round}:${t.id}`
    if (t.progress >= t.target && !paid.has(key)) {
      keys.push(key)
      earn += TASK_COINS + s.round * 3
    }
  }
  let why = 'Task complete!'
  if (s.roundComplete && !paid.has(`${s.round}:done`)) {
    keys.push(`${s.round}:done`)
    earn += ROUND_BONUS
    why = keys.length > 1 ? 'Challenge complete, with a bonus!' : 'Challenge complete bonus!'
  }
  if (!keys.length) return
  const wallet = { ...s.wallet, paid: [...s.wallet.paid, ...keys].slice(-300) }
  useGame.setState({ wallet })
  useGame.getState().addCoins(earn, why)
})

// keep the profile (which other players receive) up to date with the projects standing in the Maker Yard
let lastYard = ''
useGame.subscribe((s) => {
  const yard = s.wallet.projects.filter((p) => p.pad !== null).map((p) => ({ pad: p.pad as number, def: p.def, prog: p.prog }))
  const key = JSON.stringify(yard)
  if (key === lastYard) return
  lastYard = key
  useGame.setState({ profile: { ...s.profile, yard } })
})

initEarning(useGame as unknown as Parameters<typeof initEarning>[0])
