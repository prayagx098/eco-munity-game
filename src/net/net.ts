/**
 * Multiplayer between browser tabs (same browser, same computer).
 *
 * Every tab that opens the game joins a BroadcastChannel. Tabs announce
 * themselves with a heartbeat; one tab is elected "host" (the oldest tab that
 * is playing, preferring a visible one). The host simulates the shared world
 * (litter, NPCs, weather, meters, meetings) and broadcasts snapshots. The
 * other tabs send their actions to the host and render everyone.
 *
 * Swap BroadcastChannel for a WebSocket later to play across computers – the
 * message format stays the same.
 */
import { airborne, type VehicleKind } from '../state/world'
import { bridge, type Msg } from '../state/netBridge'
import { useGame, type Action, type Profile, type RemoteEvent, type WorldSnapshot } from '../state/gameStore'
import { act, ballNet, carNet, carState, companionPos, duckFeeds, emitBurst, hostNpcs, lastBellRing, player, remotePlayers } from '../state/sceneRegistry'
import { sfx } from '../audio/audio'
import { onVoiceSignal, useVoice, voicePeerLeft } from './voice'

interface Peer {
  id: string
  profile: Profile
  joinedAt: number
  visible: boolean
  synced: boolean
  playing: boolean
  lastSeen: number
}

const CHANNEL = 'eco-munity-v2'
const PEER_TIMEOUT = 6000

const peers = new Map<string, Peer>()
const joinedAt = Date.now()
let synced = false
let channel: BroadcastChannel | null = null
let ws: WebSocket | null = null
let wsConnected = false
let duplicate = false
let takeoverNext = false
let lastRawUrl = ''

/** identifies this browser tab (kept across reloads and reconnects), so a reconnect is never mistaken for a second device */
const TAB_ID = (() => {
  try {
    let id = sessionStorage.getItem('eco-munity-tab')
    if (!id) {
      id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
      sessionStorage.setItem('eco-munity-tab', id)
    }
    return id
  } catch {
    return Math.random().toString(36).slice(2, 12)
  }
})()

/** "Log out of all other devices and play here": ends the account's other logins, then reconnects taking the place */
export async function takeOverRoom(): Promise<boolean> {
  const base = getApiBase()
  const token = (() => {
    try {
      return localStorage.getItem('eco-munity-token')
    } catch {
      return null
    }
  })()
  try {
    if (base && token) {
      const r = await fetch(`${base}/api/me/logout-others`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) return false
    }
  } catch {
    return false
  }
  duplicate = false
  takeoverNext = true
  useGame.setState({ netStatus: 'waking' })
  if (lastRawUrl) initWebSocket(lastRawUrl)
  return true
}
let worldTimer: ReturnType<typeof setTimeout> | null = null

export const DEFAULT_RELAY_URL = 'wss://eco-munity-game.onrender.com'

export function getWsUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const queryWs = params.get('ws')
  if (queryWs) return queryWs

  const envWs = (import.meta as any).env?.VITE_WS_URL
  if (envWs) return envWs

  // When hosted on production (Netlify, Render, Vercel, etc.), auto-connect to our live persistent Render relay
  const host = window.location.host
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return DEFAULT_RELAY_URL
  }

  return null
}

/** HTTP address of the same server (used for the story-progress API stored in MongoDB) */
export function getApiBase(): string | null {
  if (typeof window === 'undefined') return null
  const envApi = (import.meta as any).env?.VITE_API_URL
  if (envApi) return String(envApi).replace(/\/$/, '')
  const ws = getWsUrl()
  if (ws) {
    const full = resolveWsUrl(ws)
    return full.replace('wss://', 'https://').replace('ws://', 'http://').split('?')[0].replace(/\/$/, '')
  }
  // local development: the relay/storage server listens on 8080
  return `http://${window.location.hostname || 'localhost'}:8080`
}

function resolveWsUrl(raw: string): string {
  if (raw.startsWith('ws://') || raw.startsWith('wss://')) return raw
  if (raw.startsWith('http://')) return 'ws://' + raw.slice(7)
  if (raw.startsWith('https://')) return 'wss://' + raw.slice(8)
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${raw}`
}

let wakingToastShown = false
let keepAliveTimer: ReturnType<typeof setInterval> | null = null

function probeHttpWakeup(rawUrl: string) {
  try {
    const fullUrl = resolveWsUrl(rawUrl)
    const httpUrl = fullUrl.replace('wss://', 'https://').replace('ws://', 'http://').split('?')[0] + '/api/health'
    fetch(httpUrl, { mode: 'no-cors' }).catch(() => {})
  } catch {}
}

function startKeepAlive(rawUrl: string) {
  if (keepAliveTimer) return
  // Ping Render every 4 minutes while connected so it never goes to sleep during gameplay
  keepAliveTimer = setInterval(() => {
    probeHttpWakeup(rawUrl)
  }, 4 * 60 * 1000)
}

function initWebSocket(rawUrl: string) {
  lastRawUrl = rawUrl
  try {
    const fullUrl = resolveWsUrl(rawUrl)
    const urlObj = new URL(fullUrl)
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room') || 'default'
    if (!urlObj.searchParams.has('room')) {
      urlObj.searchParams.set('room', room)
    }

    // 1. Immediately fire HTTP probe to wake up sleeping Render container
    probeHttpWakeup(rawUrl)
    startKeepAlive(rawUrl)

    const wsUrl = urlObj.toString()
    console.log(`[Eco-munity] Connecting to multiplayer relay: ${wsUrl}`)
    useGame.setState({ netStatus: 'waking' })

    // If server takes longer than 6s to wake up (Render cold start), notify player
    const wakeTimer = setTimeout(() => {
      if (!wsConnected && !wakingToastShown && playing()) {
        wakingToastShown = true
        useGame.getState().pushToast({
          kind: 'info',
          emoji: '⏳',
          title: 'Waking Up Live Server...',
          text: 'Render cloud server spins up from sleep in ~30s. Synchronizing shortly!',
        })
      }
    }, 6000)

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      clearTimeout(wakeTimer)
      // first message: who am I (a logged-in account can only be in a room once)
      try {
        ws?.send(JSON.stringify({ t: 'auth', token: localStorage.getItem('eco-munity-token'), tab: TAB_ID, takeover: takeoverNext }))
        takeoverNext = false
      } catch {
        // ignore
      }
      console.log('✅ [Eco-munity] Connected to multiplayer relay server!')
      wsConnected = true
      useGame.setState({ netStatus: 'connected' })
      announce('hello')
      announce('hb')

      if (playing()) {
        useGame.getState().pushToast({
          kind: 'team',
          emoji: '🟢',
          title: 'Live Server Connected!',
          text: 'Multiplayer and cloud room data saving are now active.',
        })
      }
    }

    ws.onmessage = (ev) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : JSON.parse(new TextDecoder().decode(ev.data))
        if (data.t === 'kicked') {
          // this account was signed in on another device: this one is logged out
          duplicate = true
          window.dispatchEvent(new CustomEvent('eco-kicked'))
          return
        }
        if (data.t === 'duplicate') {
          duplicate = true
          useGame.setState({ netStatus: 'duplicate' })
          return
        }
        handle(data)
      } catch (err) {
        console.error('Failed to parse incoming WS message', err)
      }
    }

    ws.onclose = (ev) => {
      wsConnected = false
      if (ev.code === 4001 || ev.code === 4002 || duplicate) {
        // this account is already in the room somewhere else: do not reconnect
        duplicate = true
        useGame.setState({ netStatus: 'duplicate' })
        return
      }
      useGame.setState({ netStatus: 'waking' })
      setTimeout(() => {
        if (getWsUrl()) initWebSocket(rawUrl)
      }, 3500)
    }

    ws.onerror = (err) => {
      console.warn('[Eco-munity] Multiplayer relay error:', err)
      wsConnected = false
      if (!duplicate) useGame.setState({ netStatus: 'waking' })
    }
  } catch (err) {
    console.error('Invalid WebSocket URL:', err)
  }
}

const post = (m: Msg) => {
  const payload = { ...m, from: bridge.myId }
  if (wsConnected && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
  } else if (channel) {
    channel.postMessage(payload)
  }
}

const playing = () => useGame.getState().screen === 'playing'

function announce(t: 'hello' | 'hb') {
  post({ t, profile: useGame.getState().profile, joinedAt, visible: document.visibilityState === 'visible', synced, playing: playing() })
}

function sendWorld() {
  if (!bridge.isHost || !playing()) return
  if (peers.size === 0 && !wsConnected) return
  post({ t: 'world', s: useGame.getState().snapshot() })
}

/** Pick the host: oldest synced, playing tab – visible tabs first */
function elect() {
  const cands: { id: string; joinedAt: number; visible: boolean }[] = []
  if (synced && playing()) cands.push({ id: bridge.myId, joinedAt, visible: document.visibilityState === 'visible' })
  for (const p of peers.values()) if (p.synced && p.playing) cands.push(p)
  cands.sort((a, b) => Number(b.visible) - Number(a.visible) || a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))
  const hostId = cands[0]?.id ?? bridge.myId
  if (hostId === bridge.hostId) return
  const was = bridge.isHost
  bridge.hostId = hostId
  bridge.isHost = hostId === bridge.myId
  useGame.setState({ isHost: bridge.isHost })
  if (bridge.isHost && !was) {
    hostNpcs.clear() // my NPCs carry on from where the old host left them
    sendWorld()
  }
}

/** Keep the store's list of other players in sync with live peers */
function syncRemotes() {
  const remotes: Record<string, Profile> = {}
  for (const p of peers.values()) if (p.playing) remotes[p.id] = p.profile
  const cur = useGame.getState().remotes
  if (JSON.stringify(cur) !== JSON.stringify(remotes)) {
    const joined = Object.keys(remotes).filter((id) => !cur[id])
    const left = Object.keys(cur).filter((id) => !remotes[id])
    useGame.setState({ remotes })
    if (playing()) {
      const s = useGame.getState()
      joined.forEach((id) => s.pushToast({ kind: 'team', emoji: '🎉', title: `${remotes[id].name} joined the town!`, text: 'Walk up to them and press C to chat.' }))
      left.forEach((id) => s.pushToast({ kind: 'info', emoji: '👋', title: `${cur[id].name} left the town` }))
    }
    for (const id of left) remotePlayers.delete(id)
  }
}

function upsertPeer(m: Record<string, unknown>) {
  peers.set(m.from as string, {
    id: m.from as string,
    profile: m.profile as Profile,
    joinedAt: m.joinedAt as number,
    visible: !!m.visible,
    synced: !!m.synced,
    playing: !!m.playing,
    lastSeen: Date.now(),
  })
}

function handle(m: Record<string, unknown>) {
  const from = m.from as string
  if (!from || from === bridge.myId) return
  const s = useGame.getState()
  switch (m.t) {
    case 'hello':
      upsertPeer(m)
      announce('hb')
      if (bridge.isHost && playing()) post({ t: 'world', s: s.snapshot() })
      break
    case 'hb':
      upsertPeer(m)
      break
    case 'bye':
      peers.delete(from)
      remotePlayers.delete(from)
      voicePeerLeft(from)
      break
    case 'pos': {
      const prev = remotePlayers.get(from)
      remotePlayers.set(from, {
        x: m.x as number,
        z: m.z as number,
        heading: m.h as number,
        moving: !!m.m,
        running: !!m.r,
        carry: (m.c as string) ?? null,
        vehicle: (m.v as VehicleKind | null) ?? null,
        jump: (m.j as number) ?? 0,
        act: m.a ? { kind: String(m.a), p: Number(m.ap) || 0 } : null,
        voice: !!m.vc,
        pet: m.pk ? { kind: m.pk as 'dog' | 'cat' | 'duck', name: String(m.pn ?? ''), x: Number(m.px), z: Number(m.pz), h: Number(m.ph) || 0, moving: !!m.pm, waiting: !!m.pw } : null,
        seen: Date.now(),
      })
      if (!prev) syncRemotes()
      return
    }
    case 'world': {
      if (from !== 'server') {
        if (bridge.isHost && synced) return
        if (from !== bridge.hostId && synced) return
      }
      const w = m.s as WorldSnapshot
      if (w) {
        s.applySnapshot(w)
        if (w.npcs) {
          for (const [id, x, z] of w.npcs) hostNpcs.set(id, { x, z })
        }
      }
      if (!synced) {
        synced = true
        announce('hb')
      }
      return
    }
    case 'reset': {
      s.reset()
      s.pushToast({ kind: 'info', emoji: '🔄', title: 'World Reset', text: 'The room state was reset by the server.' })
      return
    }
    case 'act': {
      if (!bridge.isHost || m.to !== bridge.myId) return
      const peer = peers.get(from)
      const pos = remotePlayers.get(from)
      const r = s.performAction(m.a as Action, { id: from, name: peer?.profile.name ?? 'Player', x: pos?.x ?? 0, z: pos?.z ?? 0 })
      // the town's eco score is a TEAM total: count what this player just did on the host too
      if (r?.stat) {
        const add = r.stat as Record<string, number>
        useGame.setState((st) => ({ stats: Object.fromEntries(Object.entries(st.stats).map(([k, v]) => [k, v + (add[k] ?? 0)])) as unknown as typeof st.stats }))
      }
      post({ t: 'ev', to: from, e: { kind: 'result', r: r ?? {} } satisfies RemoteEvent })
      bridge.worldDirty()
      return
    }
    case 'rtc':
      // voice connection set-up, only for me
      if (m.to === bridge.myId) void onVoiceSignal(from, String(m.k), m.d)
      return
    case 'fx': {
      // a little effect from a nearby player (petting, bell, feeding): only bother if it is close to me
      const x = Number(m.x)
      const z = Number(m.z)
      if (!Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x - player.x, z - player.z) > 45) return
      if (m.k === 'pet') {
        emitBurst({ x, z, y: 0.9, color: '#f472b6', n: 8, spread: 0.8, size: 0.07 })
        s.addFloater({ x, z, text: '💖', color: '#ec4899' })
        sfx('chat')
      } else if (m.k === 'bell') {
        lastBellRing.time = Date.now()
        lastBellRing.x = x
        lastBellRing.z = z
        sfx('bike-bell')
      } else if (m.k === 'feed') {
        duckFeeds.push({ id: Date.now() + Math.random(), x, z, time: Date.now() })
        if (duckFeeds.length > 8) duckFeeds.shift()
        sfx('splash')
      }
      return
    }
    case 'cars':
      // the host's traffic: every other player's cars follow it
      if (from === bridge.hostId && !bridge.isHost && Array.isArray(m.c)) {
        const at = performance.now()
        for (const [id, p, v] of m.c as [string, number, number][]) carNet.set(id, { p, v, at })
      }
      return
    case 'ball':
      // the host's football position: everyone else glides the ball towards it
      if (from === bridge.hostId && !bridge.isHost) Object.assign(ballNet, { x: m.x, z: m.z, y: m.y, vx: m.vx, vz: m.vz, vy: m.vy, at: performance.now() })
      return
    case 'ev':
      if (from !== bridge.hostId) return
      if (m.to === 'all' || m.to === bridge.myId) s.onRemoteEvent(m.e as RemoteEvent)
      return
    case 'chat':
      if (m.to === bridge.myId) s.receiveChat(from, String(m.text ?? ''))
      return
    case 'say':
      s.say(from, String(m.text ?? ''))
      return
  }
  elect()
  syncRemotes()
}

export function startNet() {
  const wsTarget = getWsUrl()
  if (wsTarget && !ws) {
    initWebSocket(wsTarget)
  }

  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = (ev) => {
      if (!wsConnected) handle(ev.data)
    }
  }

  bridge.send = (m) => {
    if (m.t === 'ev' && !bridge.isHost) return
    post(m)
  }
  bridge.worldDirty = () => {
    if (!bridge.isHost || worldTimer) return
    worldTimer = setTimeout(() => {
      worldTimer = null
      sendWorld()
    }, 120)
  }

  announce('hello')
  // nobody answered with a world? then this tab starts the world
  setTimeout(() => {
    if (!synced) {
      synced = true
      elect()
      announce('hb')
    }
  }, 1200)

  setInterval(() => {
    const now = Date.now()
    for (const [id, p] of peers) if (now - p.lastSeen > PEER_TIMEOUT) {
      peers.delete(id)
      remotePlayers.delete(id)
    }
    announce('hb')
    elect()
    syncRemotes()
  }, 1000)

  setInterval(sendWorld, 500)

  // the host reports where every car is, 8 times a second
  setInterval(() => {
    if (!bridge.isHost || !playing() || (peers.size === 0 && !wsConnected) || carState.size === 0) return
    post({ t: 'cars', c: [...carState].map(([id, s]) => [id, Math.round(s.p * 100) / 100, Math.round(s.v * 100) / 100]) })
  }, 125)

  // my position, 10× a second
  setInterval(() => {
    if (!playing() || peers.size === 0) return
    const c = useGame.getState().carrying
    const comp = useGame.getState().companion
    post({
      t: 'pos',
      x: Math.round(player.x * 100) / 100,
      z: Math.round(player.z * 100) / 100,
      h: Math.round(player.heading * 100) / 100,
      m: player.moving ? 1 : 0,
      r: player.running ? 1 : 0,
      c: c ? (c.typeId) : null,
      v: player.vehicle,
      j: Math.round(airborne.h * 100) / 100,
      // the gesture I'm playing, so others see me water / plant / kick too
      vc: useVoice.getState().enabled ? 1 : undefined,
      a: act.kind || undefined,
      ap: act.kind ? Math.round(Math.min(1, act.t / Math.max(0.1, act.dur)) * 100) / 100 : undefined,
      // my companion pet follows me on everyone's screen
      ...(comp ? { pk: comp.kind, pn: comp.name, px: Math.round(companionPos.x * 100) / 100, pz: Math.round(companionPos.z * 100) / 100, ph: Math.round(companionPos.heading * 100) / 100, pm: companionPos.moving ? 1 : 0, pw: companionPos.waiting ? 1 : 0 } : {}),
    })
  }, 100)

  // re-announce when the profile/screen changes (e.g. pressing "Let's go")
  useGame.subscribe((st, prev) => {
    if (st.screen !== prev.screen || st.profile !== prev.profile) {
      announce('hb')
      elect()
    }
  })
  document.addEventListener('visibilitychange', () => {
    announce('hb')
    elect()
  })
  window.addEventListener('pagehide', () => post({ t: 'bye' }))
}

/** Number of other players online (for the HUD) */
export const peerCount = () => [...peers.values()].filter((p) => p.playing).length
