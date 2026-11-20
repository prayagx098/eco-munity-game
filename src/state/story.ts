import { makeRoomForTrees } from './forest'
import { create } from 'zustand'
import { useGame, type Stats } from './gameStore'
import { api, guestPid, useAuth } from './auth'
import { HEAPS, HOUSES, POND, SAPLING_SPOTS, TAPS } from './world'

/**
 * THE GREEN HEART OF ECO-MUNITY
 *
 * Eco-munity's Green Heart – a crystal that keeps the whole town bright and healthy – has faded because
 * the town got careless. Seven Sparks of light were scattered. In each chapter you help a villager, learn
 * one big eco idea, and win a Spark back. Everything is measured from the real things you do in the game.
 */

export interface Line {
  who: string
  text: string
}

export interface Speaker {
  name: string
  emoji: string
  color: string
}

export const SPEAKERS: Record<string, Speaker> = {
  narrator: { name: 'Story', emoji: '📖', color: '#6366f1' },
  rao: { name: 'Mrs. Rao', emoji: '👩‍🏫', color: '#a855f7' },
  joy: { name: 'Farmer Joy', emoji: '👨‍🌾', color: '#16a34a' },
  ada: { name: 'Ms. Ada', emoji: '👩‍🔬', color: '#0ea5e9' },
  sam: { name: 'Ranger Sam', emoji: '🧢', color: '#65a30d' },
  lee: { name: 'Lifeguard Lee', emoji: '🛟', color: '#ef4444' },
  heart: { name: 'The Green Heart', emoji: '💚', color: '#22c55e' },
  pip: { name: 'Pip the Duckling', emoji: '🦆', color: '#f59e0b' },
}

export type Obj =
  | { id: string; kind: 'stat'; stat: keyof Stats; n: number; text: string; where?: string }
  | { id: string; kind: 'zone'; zone: string; text: string; where?: string }
  | { id: string; kind: 'delivered'; n: number; text: string; where?: string }

export interface Chapter {
  id: string
  title: string
  emoji: string
  spark: { name: string; emoji: string; color: string }
  intro: Line[]
  objectives: Obj[]
  outro: Line[]
  /** one big idea the child takes away */
  fact: string
  reward: number
}

export const PROLOGUE: Line[] = [
  { who: 'narrator', text: 'In the middle of Eco-munity glows the Green Heart – a crystal that keeps the town bright, clean and full of life.' },
  { who: 'narrator', text: 'But lately people have been careless. Litter piled up, taps dripped, lights burned all day... and the Heart began to fade.' },
  { who: 'narrator', text: 'Its seven Sparks of light flew away across the town. Without them, Eco-munity will lose its glow for good.' },
  { who: 'rao', text: 'Welcome, {name}! I am Mrs. Rao. Will you become our new Junior Eco Ranger and help us find the seven Sparks?' },
  { who: 'rao', text: 'You do not need magic. Every Spark returns when someone does something kind for our planet. Ready? Let us begin!' },
]

export const CHAPTERS: Chapter[] = [
  {
    id: 'clean',
    title: 'A Messy Morning',
    emoji: '🧼',
    spark: { name: 'Clean Spark', emoji: '🧼', color: '#38bdf8' },
    intro: [
      { who: 'rao', text: 'Look around the plaza. Wrappers, bottles, peels... Our first Spark hides where the town is cleanest.' },
      { who: 'rao', text: 'Pick litter up and put it in the right bin: green for compost, blue for recycling, grey for rubbish. Sort 5 pieces!' },
    ],
    objectives: [{ id: 'sort', kind: 'stat', stat: 'sorted', n: 5, text: 'Sort 5 pieces of litter into the right bins', where: 'Town Plaza & paths' }],
    outro: [
      { who: 'heart', text: 'I feel a tiny glow... the Clean Spark has come home! Thank you, {name}.' },
      { who: 'rao', text: 'Remember: Reduce, Reuse, Recycle. The best litter is the litter we never make!' },
    ],
    fact: 'Sorting waste lets metal, paper and glass be made into new things instead of filling up landfills.',
    reward: 20,
  },
  {
    id: 'roots',
    title: 'Thirsty Roots',
    emoji: '🌱',
    spark: { name: 'Growth Spark', emoji: '🌱', color: '#4ade80' },
    intro: [
      { who: 'joy', text: 'Ah, there you are, {name}! The garden plants are drooping and my little tree saplings need a home.' },
      { who: 'joy', text: 'Water 2 thirsty plants in the Community Garden and plant 2 saplings in the Pine Forest. Trees make clean air!' },
    ],
    objectives: [
      { id: 'water', kind: 'stat', stat: 'watered', n: 2, text: 'Water 2 thirsty garden plants', where: 'Community Garden' },
      { id: 'trees', kind: 'stat', stat: 'trees', n: 2, text: 'Plant 2 tree saplings', where: 'Pine Forest (north-east)' },
    ],
    outro: [
      { who: 'joy', text: 'Look at them perk up! One tree can clean the air of a whole street.' },
      { who: 'heart', text: 'The Growth Spark is back! I can feel roots spreading under the town.' },
    ],
    fact: 'Trees take in carbon dioxide and give us fresh oxygen, shade and homes for animals.',
    reward: 25,
  },
  {
    id: 'power',
    title: 'Power Down',
    emoji: '⚡',
    spark: { name: 'Energy Spark', emoji: '⚡', color: '#facc15' },
    intro: [
      { who: 'ada', text: 'Psst, {name}! Over on Maple Street some houses left their lights on all day, and a tap has been dripping since Monday.' },
      { who: 'ada', text: 'Wasted energy and water cost money and harm nature. Switch off 2 wasted lights and fix 1 leaking tap!' },
    ],
    objectives: [
      { id: 'lights', kind: 'stat', stat: 'lightsOff', n: 2, text: 'Switch off 2 wasted lights', where: 'Maple Street houses' },
      { id: 'tap', kind: 'stat', stat: 'tapsFixed', n: 1, text: 'Fix 1 leaking tap', where: 'Around town' },
    ],
    outro: [
      { who: 'ada', text: 'A single dripping tap can waste hundreds of litres a month. You are a real water hero!' },
      { who: 'heart', text: 'Zzzap! The Energy Spark is glowing again!' },
    ],
    fact: 'Switching off unused lights and fixing leaks saves energy, water and money.',
    reward: 25,
  },
  {
    id: 'pond',
    title: 'Duck Pond Rescue',
    emoji: '🦆',
    spark: { name: 'Wildlife Spark', emoji: '🦆', color: '#fb923c' },
    intro: [
      { who: 'pip', text: 'Quack! The pond is full of rubbish and I cannot swim. Please help!' },
      { who: 'sam', text: 'Litter in water hurts ducks and fish. Fish 2 pieces of rubbish out of the Duck Pond and sort them properly.' },
    ],
    objectives: [{ id: 'pond', kind: 'stat', stat: 'pondCleaned', n: 2, text: 'Clean 2 pieces of rubbish out of the pond', where: 'Duck Pond Park' }],
    outro: [
      { who: 'pip', text: 'Splash! Quack quack! The water is sparkling again. Thank you, {name}!' },
      { who: 'heart', text: 'The Wildlife Spark returns, carried home by a happy duck.' },
    ],
    fact: 'Animals can swallow or get tangled in litter. Clean water means healthy wildlife.',
    reward: 30,
  },
  {
    id: 'wheels',
    title: 'Wheels of Change',
    emoji: '🚲',
    spark: { name: 'Air Spark', emoji: '💨', color: '#a78bfa' },
    intro: [
      { who: 'lee', text: 'Hey {name}! The sea breeze used to be so fresh... but cars and smoke made the air heavy.' },
      { who: 'lee', text: 'Hop on a Solar Cycle at a bike stand and ride all the way to Sunset Beach. Zero smoke, zero fuel!' },
    ],
    objectives: [
      { id: 'ride', kind: 'stat', stat: 'rode', n: 1, text: 'Ride a Solar Cycle', where: 'Any bike stand' },
      { id: 'beach', kind: 'zone', zone: 'beach', text: 'Arrive at Sunset Beach', where: 'East end of the main path' },
    ],
    outro: [
      { who: 'lee', text: 'Breathe that in! Walking, cycling and buses keep the air clean.' },
      { who: 'heart', text: 'The Air Spark rides in on the sea breeze. Four down... three to go!' },
    ],
    fact: 'Walking, cycling and public transport make far less pollution than cars.',
    reward: 30,
  },
  {
    id: 'hub',
    title: 'Where Does It Go?',
    emoji: '♻️',
    spark: { name: 'Recycle Spark', emoji: '♻️', color: '#34d399' },
    intro: [
      { who: 'ada', text: 'Ever wondered where the rubbish goes after the bin is full? A truck takes it to our Eco Waste Hub in the west.' },
      { who: 'ada', text: 'It has three bays: compost, recycling and waste-to-energy. Fill a bin with 6 items, watch the truck collect it, and visit the Hub!' },
    ],
    objectives: [
      { id: 'sort6', kind: 'stat', stat: 'sorted', n: 6, text: 'Sort 6 more items to fill a bin', where: 'Bin stations' },
      { id: 'delivered', kind: 'delivered', n: 6, text: 'Get a truck to deliver a full bin', where: 'Wait for the truck' },
      { id: 'hub', kind: 'zone', zone: 'ecohub', text: 'Visit the Eco Waste Hub', where: 'West, behind Maple Street' },
    ],
    outro: [
      { who: 'ada', text: 'See? Compost feeds the soil, recycling becomes new things, and leftovers make electricity. Nothing is wasted!' },
      { who: 'heart', text: 'The Recycle Spark spins home. Only one Spark is left, {name}!' },
    ],
    fact: 'Good sorting means compost for soil, new products from recycling and energy from what is left.',
    reward: 35,
  },
  {
    id: 'heart',
    title: 'Heart of the Town',
    emoji: '💚',
    spark: { name: 'Community Spark', emoji: '🤝', color: '#f472b6' },
    intro: [
      { who: 'rao', text: 'The last Spark is the hardest to find, {name}. It is not a thing... it is knowing and caring together.' },
      { who: 'rao', text: 'Read the notice board at the Learning Corner twice to learn two new eco facts, then come back to the Plaza and share them!' },
    ],
    objectives: [
      { id: 'learn', kind: 'stat', stat: 'learned', n: 2, text: 'Learn 2 new facts at the Learning Corner', where: 'North, past the school' },
      { id: 'plaza', kind: 'zone', zone: 'plaza', text: 'Return to the Town Plaza', where: 'Town centre' },
    ],
    outro: [
      { who: 'heart', text: 'Every Spark is home. I am glowing brighter than ever! You did not just clean a town, {name} – you inspired it.' },
      { who: 'rao', text: 'Everyone, come out! A festival for our Junior Eco Ranger! Eco-munity shines again, thanks to you!' },
      { who: 'narrator', text: '🎉 You restored all seven Sparks. Keep helping – the Heart stays bright only as long as we all care. 🎉' },
    ],
    fact: 'Small actions by many people together change the world. Share what you learn!',
    reward: 100,
  },
]

export type Stage = 'new' | 'intro' | 'active' | 'outro' | 'finished'

interface Dialog {
  lines: Line[]
  i: number
  /** what happens when it is finished */
  then: 'prologue' | 'intro' | 'outro' | 'none'
}

interface StoryState {
  chapter: number
  stage: Stage
  /** stats snapshot taken when the chapter started, so progress counts only what you do next */
  base: Stats | null
  baseDelivered: number
  /** zones reached since the chapter started */
  seen: string[]
  /** the zone you were standing in when the chapter started (it only counts after you leave and come back) */
  startZone: string | null
  completed: string[]
  dialog: Dialog | null
  bookOpen: boolean
  /** progress has been read from the database (or we gave up waiting) */
  ready: boolean
  saved: 'loading' | 'saving' | 'saved' | 'offline' | 'error'
  setBook: (o?: boolean) => void
  advance: () => void
  skip: () => void
  restart: () => void
}

/**
 * Story progress lives in MongoDB (see server.js / store.js): inside the logged-in player's account, or under a
 * random guest id when playing as a guest. It is never kept in the browser's storage.
 */
const DEFAULTS = { chapter: 0, stage: 'new' as Stage, base: null, baseDelivered: 0, seen: [] as string[], startZone: null, completed: [] as string[], dialog: null, bookOpen: false }

export const useStory = create<StoryState>()((set, get) => ({
  ...DEFAULTS,
  ready: false,
  saved: 'loading',
  setBook: (o) => set((s) => ({ bookOpen: o ?? !s.bookOpen })),
  advance: () => {
    const d = get().dialog
    if (!d) return
    if (d.i + 1 < d.lines.length) set({ dialog: { ...d, i: d.i + 1 } })
    else finishDialog(d.then)
  },
  skip: () => {
    const d = get().dialog
    if (d) finishDialog(d.then)
  },
  restart: () => set({ ...DEFAULTS }),
}))

const persisted = (s: StoryState) => ({ chapter: s.chapter, stage: s.stage, base: s.base, baseDelivered: s.baseDelivered, seen: s.seen, startZone: s.startZone, completed: s.completed })

let remoteOk = false // we have read this player's record, so it is safe to write it
let gen = 0 // changes whenever the player logs in/out, so old requests are ignored
let saveTimer: ReturnType<typeof setTimeout> | null = null

const loggedIn = () => useAuth.getState().status === 'in'
const saveRequest = () => (loggedIn() ? { path: '/api/me/story', method: 'PUT' } : { path: `/api/story?pid=${encodeURIComponent(guestPid)}`, method: 'PUT' })

async function saveNow(keepalive = false) {
  if (!remoteOk) return
  const { path, method } = saveRequest()
  try {
    const r = await api(path, { method, keepalive, body: JSON.stringify({ state: persisted(useStory.getState()) }) })
    useStory.setState({ saved: r.ok ? 'saved' : 'error' })
  } catch {
    useStory.setState({ saved: 'error' })
  }
}

useStory.subscribe((s, p) => {
  if (!remoteOk || JSON.stringify(persisted(s)) === JSON.stringify(persisted(p))) return
  useStory.setState({ saved: 'saving' })
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveNow(), 700)
})
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => void saveNow(true))

/** Read this player's progress from MongoDB. The Render server may be asleep, so keep trying for a while. */
async function loadRemote(myGen: number) {
  const started = Date.now()
  let givenUp = false
  while (!remoteOk && myGen === gen) {
    try {
      const account = loggedIn()
      const r = await api(account ? '/api/me' : `/api/story?pid=${encodeURIComponent(guestPid)}`, {}, 8000)
      if (!r.ok) throw new Error(String(r.status))
      const j = await r.json()
      if (myGen !== gen) return
      const state = (account ? j.story : j.state) as Partial<StoryState> | null
      remoteOk = true
      if (state && typeof state.stage === 'string') useStory.setState({ ...persisted({ ...DEFAULTS, ...state } as StoryState), ready: true, saved: 'saved' })
      else useStory.setState({ ready: true, saved: 'saved' })
      if (!state) void saveNow()
      return
    } catch {
      // after 20 seconds start anyway (progress is then not saved) but keep trying in the background
      if (!givenUp && Date.now() - started > 20000) {
        givenUp = true
        useStory.setState({ ready: true, saved: 'offline' })
      }
      await new Promise((res) => setTimeout(res, 4000))
    }
  }
}

/** (re)start loading whenever someone logs in, plays as a guest, or logs out */
let lastKey = ''
function syncWithAuth() {
  const a = useAuth.getState()
  const key = a.status === 'in' ? `in:${a.user?.id}` : a.status === 'guest' ? 'guest' : 'none'
  if (key === lastKey) return
  lastKey = key
  gen++
  remoteOk = false
  if (saveTimer) clearTimeout(saveTimer)
  useStory.setState({ ...DEFAULTS, ready: false, saved: 'loading' })
  if (key !== 'none') void loadRemote(gen)
}
if (typeof window !== 'undefined') {
  useAuth.subscribe(syncWithAuth)
  syncWithAuth()
}

const fill = (lines: Line[]): Line[] => {
  const name = useGame.getState().profile.name || 'friend'
  return lines.map((l) => ({ ...l, text: l.text.replaceAll('{name}', name) }))
}

const totalDelivered = (d: { recycle: number; compost: number; trash: number }) => d.recycle + d.compost + d.trash

export interface ObjProgress {
  obj: Obj
  have: number
  need: number
  done: boolean
}

/** how far each objective of the current chapter has come */
export function progressOf(ch: Chapter, st = useStory.getState(), g = useGame.getState()): ObjProgress[] {
  return ch.objectives.map((obj) => {
    if (obj.kind === 'stat') {
      const b = st.base?.[obj.stat] ?? g.stats[obj.stat]
      const have = Math.max(0, Math.min(obj.n, g.stats[obj.stat] - b))
      return { obj, have, need: obj.n, done: have >= obj.n }
    }
    if (obj.kind === 'delivered') {
      const have = Math.max(0, Math.min(obj.n, totalDelivered(g.delivered) - st.baseDelivered))
      return { obj, have, need: obj.n, done: have >= obj.n }
    }
    const done = st.seen.includes(obj.zone)
    return { obj, have: done ? 1 : 0, need: 1, done }
  })
}

/** Make sure the world has what the chapter asks for (it may have been used up earlier) */
function prepare(ch: Chapter) {
  const g = useGame.getState()
  const need = (id: string) => ch.objectives.some((o) => o.id === id)
  if (need('sort') || need('sort6')) {
    const want = need('sort6') ? 7 : 6
    for (let i = g.trash.filter((t) => !t.inPond).length; i < want; i++) g.spawnTrash((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8)
  }
  if (need('water')) useGame.setState((s) => ({ plots: { ...s.plots, 'plot-0': 85, 'plot-1': 80, 'plot-2': Math.max(s.plots['plot-2'] ?? 0, 70) } }))
  if (need('trees')) {
    useGame.setState((s) => {
      const open = s.saplings.filter((p) => !p.planted).length
      if (open >= 2) return {}
      const extra = SAPLING_SPOTS.filter(([x, z]) => !s.saplings.some((p) => Math.hypot(p.x - x, p.z - z) < 1.5))
        .slice(0, 2 - open)
        .map(([x, z], i) => ({ id: `story-sapling-${Date.now()}-${i}`, x, z, planted: false }))
      return { saplings: makeRoomForTrees([...s.saplings, ...extra], s.elapsed, 2) }
    })
  }
  if (need('lights')) useGame.setState((s) => ({ lights: { ...s.lights, [HOUSES[1].id]: true, [HOUSES[5].id]: true } }))
  if (need('tap')) useGame.setState((s) => ({ leaks: { ...s.leaks, [TAPS[0].id]: true } }))
  if (need('pond')) {
    const inPond = g.trash.filter((t) => t.inPond).length
    for (let i = inPond; i < 2; i++) g.spawnTrash(POND.x + (Math.random() - 0.5) * 6, POND.z + (Math.random() - 0.5) * 6, true)
  }
  if (need('hub')) useGame.setState((s) => ({ heaps: { ...s.heaps, [HEAPS[0].id]: true } }))
}

function finishDialog(then: Dialog['then']) {
  const st = useStory.getState()
  const g = useGame.getState()
  const ch = CHAPTERS[st.chapter]
  if (then === 'prologue') {
    useStory.setState({ dialog: null, stage: 'intro' })
    return
  }
  if (then === 'intro') {
    prepare(ch)
    useStory.setState({ dialog: null, stage: 'active', base: { ...useGame.getState().stats }, baseDelivered: totalDelivered(useGame.getState().delivered), seen: [], startZone: g.zone })
    g.pushToast({ kind: 'info', emoji: ch.emoji, title: `Chapter ${st.chapter + 1}: ${ch.title}`, text: 'Open the Story book (📖) any time to see your goals.' })
    return
  }
  if (then === 'outro') {
    g.addCoins(ch.reward, `${ch.spark.name} restored!`)
    g.pushToast({ kind: 'badge', emoji: ch.spark.emoji, title: `${ch.spark.name} restored!`, text: ch.fact })
    const completed = [...st.completed, ch.id]
    if (st.chapter + 1 >= CHAPTERS.length) useStory.setState({ dialog: null, stage: 'finished', completed, bookOpen: true })
    else useStory.setState({ dialog: null, chapter: st.chapter + 1, stage: 'intro', base: null, seen: [], completed })
    return
  }
  useStory.setState({ dialog: null })
}

/** a modal, shop or chat is open: wait before showing a cutscene */
const busy = () => {
  const s = useGame.getState()
  return s.screen !== 'playing' || s.paused || s.roundComplete || !!s.chatWith || s.shopOpen || s.goodsCounter !== 0 || s.invOpen || s.binOpen || s.quiz !== null || s.bigMap || s.badgesOpen || !!s.carrying
}

/** called whenever the game changes: tracks zones, completes chapters and opens cutscenes */
function tick() {
  const g = useGame.getState()
  if (g.screen !== 'playing') return
  const st = useStory.getState()
  if (!st.ready) return
  if (st.stage === 'active') {
    const ch = CHAPTERS[st.chapter]
    // zones only count once you have been somewhere other than where you started
    if (st.startZone !== null && g.zone !== st.startZone) useStory.setState({ startZone: null })
    else if (g.zone && g.zone !== st.startZone && !st.seen.includes(g.zone)) useStory.setState({ seen: [...st.seen, g.zone] })
    // the world may have been reset: never let progress go negative
    if (st.base) {
      const fixed = { ...st.base }
      let changed = false
      for (const k of Object.keys(fixed) as (keyof Stats)[]) if (g.stats[k] < fixed[k]) ((fixed[k] = g.stats[k]), (changed = true))
      if (changed) useStory.setState({ base: fixed })
    }
    if (progressOf(ch).every((p) => p.done)) useStory.setState({ stage: 'outro' })
  }
  const now = useStory.getState()
  if (now.dialog || busy()) return
  if (now.stage === 'new') useStory.setState({ dialog: { lines: fill(PROLOGUE), i: 0, then: 'prologue' } })
  else if (now.stage === 'intro') useStory.setState({ dialog: { lines: fill(CHAPTERS[now.chapter].intro), i: 0, then: 'intro' } })
  else if (now.stage === 'outro') useStory.setState({ dialog: { lines: fill(CHAPTERS[now.chapter].outro), i: 0, then: 'outro' } })
}

useGame.subscribe(tick)
useStory.subscribe((s, p) => {
  if (s.stage !== p.stage || s.dialog !== p.dialog || s.ready !== p.ready) tick()
})

/** how many Sparks are back (0..7) */
export const sparksOf = (completed: string[]) => completed.length
