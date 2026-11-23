import { create } from 'zustand'
import { bridge } from '../state/netBridge'
import { player, remotePlayers } from '../state/sceneRegistry'

/**
 * Proximity voice chat. Audio goes straight from player to player (WebRTC) – there is no voice server.
 * The game's relay is only used to pass the little connection messages ("rtc").
 *
 *  - Join voice to hear and speak. Hold the mic button (or G) to talk, or switch on open mic.
 *  - You only hear players within HEAR_RANGE, getting quieter with distance.
 *  - Only players who also joined voice are connected, so nobody is listened to without opting in.
 */

/** you only hear players this close (world units, roughly 9 steps); full volume within FULL_RANGE, fading to silence at HEAR_RANGE */
export const HEAR_RANGE = 9
const FULL_RANGE = 2
const DROP_RANGE = HEAR_RANGE + 2
const ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
// optional relay for strict school networks: set VITE_TURN_URL / VITE_TURN_USER / VITE_TURN_PASS at build time
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
if (env.VITE_TURN_URL) ICE.push({ urls: env.VITE_TURN_URL.split(','), username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS })

interface VoiceState {
  /** I joined voice chat (microphone allowed) */
  enabled: boolean
  /** I am transmitting right now (push-to-talk held, or open mic on) */
  talking: boolean
  openMic: boolean
  /** a player I am currently connected to who is speaking */
  speaking: Record<string, boolean>
  muted: Record<string, boolean>
  /** how many players I can hear right now */
  connected: number
  /** the players I am connected to (for the mute list) */
  nearby: string[]
  error: string | null
  busy: boolean
  join: () => Promise<void>
  leave: () => void
  setOpenMic: (on: boolean) => void
  setPtt: (down: boolean) => void
  toggleMute: (id: string) => void
}

interface Link {
  pc: RTCPeerConnection
  audio: HTMLAudioElement
  analyser?: AnalyserNode
  buf?: Uint8Array<ArrayBuffer>
  pending: RTCIceCandidateInit[]
  hasRemote: boolean
}

const links = new Map<string, Link>()
let stream: MediaStream | null = null
let track: MediaStreamTrack | null = null
let ctx: AudioContext | null = null
let timer: ReturnType<typeof setInterval> | null = null
let ptt = false

export const useVoice = create<VoiceState>()((set, get) => ({
  enabled: false,
  talking: false,
  openMic: false,
  speaking: {},
  muted: {},
  connected: 0,
  nearby: [],
  error: null,
  busy: false,

  join: async () => {
    if (get().enabled || get().busy) return
    set({ busy: true, error: null })
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use a microphone here.')
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
      track = stream.getAudioTracks()[0] ?? null
      if (track) track.enabled = false // silent until you talk
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      void ctx.resume()
      set({ enabled: true, busy: false })
      for (const l of links.values()) attachTrack(l)
      if (!timer) timer = setInterval(tick, 150)
    } catch (e) {
      const name = (e as { name?: string }).name
      set({
        busy: false,
        error: name === 'NotAllowedError' ? 'Microphone is blocked. Allow it in your browser settings, then try again.' : name === 'NotFoundError' ? 'No microphone found.' : (e as Error).message || 'Could not start voice chat.',
      })
    }
  },

  leave: () => {
    for (const id of [...links.keys()]) closeLink(id)
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    track = null
    if (timer) clearInterval(timer)
    timer = null
    void ctx?.close()
    ctx = null
    ptt = false
    set({ enabled: false, talking: false, openMic: false, speaking: {}, connected: 0, nearby: [] })
  },

  setOpenMic: (on) => {
    set({ openMic: on })
    applyTalking()
  },

  setPtt: (down) => {
    ptt = down
    applyTalking()
  },

  toggleMute: (id) => set((s) => ({ muted: { ...s.muted, [id]: !s.muted[id] } })),
}))

function applyTalking() {
  const s = useVoice.getState()
  const on = s.enabled && (ptt || s.openMic)
  if (track) track.enabled = on
  if (s.talking !== on) useVoice.setState({ talking: on })
}

function send(to: string, k: 'offer' | 'answer' | 'ice', d: unknown) {
  bridge.send({ t: 'rtc', to, k, d })
}

function attachTrack(l: Link) {
  if (!track) return
  const tr = l.pc.getTransceivers().find((t) => t.receiver.track.kind === 'audio')
  void (tr?.sender ?? l.pc.getSenders()[0])?.replaceTrack(track)
}

/** for testing: how many audio bytes each link has sent and received */
export async function voiceStats() {
  const out: Record<string, { sent: number; received: number; state: string }> = {}
  for (const [id, l] of links) {
    let sent = 0
    let received = 0
    for (const r of (await l.pc.getStats()).values()) {
      if (r.type === 'outbound-rtp' && r.kind === 'audio') sent += r.bytesSent ?? 0
      if (r.type === 'inbound-rtp' && r.kind === 'audio') received += r.bytesReceived ?? 0
    }
    out[id] = { sent, received, state: l.pc.connectionState }
  }
  return out
}

function makeLink(id: string, caller: boolean): Link {
  const pc = new RTCPeerConnection({ iceServers: ICE })
  const audio = new Audio()
  audio.autoplay = true
  const link: Link = { pc, audio, pending: [], hasRemote: false }
  // the caller creates the audio line; the answerer must use the line that comes in with the offer
  // (adding its own here would leave my microphone on a line nobody listens to)
  if (caller) pc.addTransceiver('audio', { direction: 'sendrecv' })
  pc.onicecandidate = (e) => {
    if (e.candidate) send(id, 'ice', e.candidate.toJSON())
  }
  pc.ontrack = (e) => {
    const rs = e.streams[0] ?? new MediaStream([e.track])
    audio.srcObject = rs
    void audio.play().catch(() => {})
    if (ctx) {
      try {
        const an = ctx.createAnalyser()
        an.fftSize = 256
        ctx.createMediaStreamSource(rs).connect(an)
        link.analyser = an
        link.buf = new Uint8Array(an.frequencyBinCount)
      } catch {
        /* no speaking indicator */
      }
    }
  }
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') closeLink(id)
  }
  links.set(id, link)
  attachTrack(link)
  return link
}

function closeLink(id: string) {
  const l = links.get(id)
  if (!l) return
  links.delete(id)
  try {
    l.pc.onicecandidate = null
    l.pc.ontrack = null
    l.pc.close()
  } catch {
    /* already closed */
  }
  l.audio.srcObject = null
  const s = useVoice.getState()
  if (s.speaking[id]) useVoice.setState({ speaking: { ...s.speaking, [id]: false } })
}

/** the smaller id makes the call, so two players never call each other at once */
const iCall = (id: string) => bridge.myId < id

async function call(id: string) {
  const l = makeLink(id, true)
  try {
    const offer = await l.pc.createOffer()
    await l.pc.setLocalDescription(offer)
    send(id, 'offer', l.pc.localDescription?.toJSON())
  } catch {
    closeLink(id)
  }
}

/** a connection message from another player (called by net.ts) */
export async function onVoiceSignal(from: string, k: string, d: unknown) {
  const s = useVoice.getState()
  if (!s.enabled) return
  try {
    if (k === 'offer') {
      closeLink(from)
      const l = makeLink(from, false)
      await l.pc.setRemoteDescription(d as RTCSessionDescriptionInit)
      l.hasRemote = true
      // send my voice back on the same audio line the offer created
      const tr = l.pc.getTransceivers().find((t) => t.receiver.track.kind === 'audio')
      if (tr) tr.direction = 'sendrecv'
      attachTrack(l)
      for (const c of l.pending.splice(0)) await l.pc.addIceCandidate(c).catch(() => {})
      const answer = await l.pc.createAnswer()
      await l.pc.setLocalDescription(answer)
      send(from, 'answer', l.pc.localDescription?.toJSON())
    } else if (k === 'answer') {
      const l = links.get(from)
      if (!l || l.pc.signalingState !== 'have-local-offer') return
      await l.pc.setRemoteDescription(d as RTCSessionDescriptionInit)
      l.hasRemote = true
      for (const c of l.pending.splice(0)) await l.pc.addIceCandidate(c).catch(() => {})
    } else if (k === 'ice') {
      const l = links.get(from)
      if (!l) return
      if (l.hasRemote) await l.pc.addIceCandidate(d as RTCIceCandidateInit).catch(() => {})
      else l.pending.push(d as RTCIceCandidateInit)
    }
  } catch {
    closeLink(from)
  }
}

/** a player left the room */
export function voicePeerLeft(id: string) {
  closeLink(id)
}

/** every 0.15 s: connect to nearby players who joined voice, drop the ones who walked away, set volumes */
function tick() {
  const s = useVoice.getState()
  if (!s.enabled) return
  let connected = 0
  const near: string[] = []
  const speaking: Record<string, boolean> = {}
  for (const [id, r] of remotePlayers) {
    const d = Math.hypot(r.x - player.x, r.z - player.z)
    const l = links.get(id)
    if (!l) {
      if (r.voice && d < HEAR_RANGE && iCall(id)) void call(id)
      continue
    }
    if (!r.voice || d > DROP_RANGE) {
      closeLink(id)
      continue
    }
    // closer = louder; each nearby player is heard at their own volume, and anyone beyond the range is silent
    const fall = d <= FULL_RANGE ? 1 : d >= HEAR_RANGE ? 0 : Math.pow((HEAR_RANGE - d) / (HEAR_RANGE - FULL_RANGE), 1.4)
    l.audio.volume = s.muted[id] ? 0 : Math.max(0, Math.min(1, fall))
    if (l.pc.connectionState === 'connected') {
      connected++
      near.push(id)
    }
    if (l.analyser && l.buf && !s.muted[id]) {
      l.analyser.getByteFrequencyData(l.buf)
      let sum = 0
      for (let i = 0; i < l.buf.length; i++) sum += l.buf[i]
      speaking[id] = sum / l.buf.length > 14 && d < HEAR_RANGE && l.audio.volume > 0.05
    }
  }
  for (const id of [...links.keys()]) if (!remotePlayers.has(id)) closeLink(id)
  const same = Object.keys(speaking).length === Object.keys(s.speaking).length && Object.keys(speaking).every((k) => speaking[k] === s.speaking[k])
  const sameNear = near.length === s.nearby.length && near.every((n, i) => n === s.nearby[i])
  if (!same || connected !== s.connected || !sameNear) useVoice.setState({ speaking, connected, nearby: near })
}

/** hold G to talk */
if (typeof window !== 'undefined') {
  const typing = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyG' && !e.repeat && !typing(e) && useVoice.getState().enabled) useVoice.getState().setPtt(true)
  })
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyG') useVoice.getState().setPtt(false)
  })
  window.addEventListener('blur', () => useVoice.getState().setPtt(false))
}
