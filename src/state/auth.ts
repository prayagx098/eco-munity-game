import { create } from 'zustand'
import { getApiBase } from '../net/net'
import { useGame } from './gameStore'
import { loadWallet, saveWallet, type Wallet } from './shop'
import { useMeta, type MetaData } from './meta'

/**
 * Accounts. A child picks a nickname + password (no email, no real name). The server (MongoDB) keeps that
 * player's saved game: look, coins, items, projects, badges and story. Guests can still play; their progress
 * is then only kept for this browser's guest id and can be turned into an account later.
 */

export interface AccountUser {
  id: string
  username: string
}
type Status = 'checking' | 'out' | 'in' | 'guest'

interface AuthState {
  status: Status
  user: AccountUser | null
  token: string | null
  error: string | null
  busy: boolean
  register: (username: string, password: string) => Promise<boolean>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  playAsGuest: () => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<string | null>
  deleteAccount: (password: string) => Promise<string | null>
  clearError: () => void
}

const TOKEN_KEY = 'eco-munity-token'
const PID_KEY = 'eco-munity-pid'

/** random id for a guest so the server can keep their story; the only thing besides the login token kept in the browser */
export const guestPid = (() => {
  try {
    let id = localStorage.getItem(PID_KEY)
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '')
      localStorage.setItem(PID_KEY, id)
    }
    return id
  } catch {
    return `session${Math.random().toString(36).slice(2, 12)}`
  }
})()

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
const writeToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/** fetch against the game server, adding the login token */
export async function api(path: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const base = getApiBase()
  if (!base) throw new Error('no server')
  const token = useAuth.getState().token
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
    })
  } finally {
    clearTimeout(t)
  }
}

let applying = false

/** put the saved game from the server into the running game */
function applyData(data: { profile?: { name: string; shirt: string; hair: string; pants: string }; wallet?: Wallet; badges?: string[]; meta?: Partial<MetaData> } | undefined) {
  if (!data) return
  applying = true
  try {
    useMeta.getState().hydrate(data.meta ?? null)
    const patch: Record<string, unknown> = {}
    if (data.wallet) {
      saveWallet(data.wallet) // loadWallet() below then fills in today's daily limits etc.
      patch.wallet = loadWallet()
    }
    if (data.profile) patch.profile = data.profile
    if (Array.isArray(data.badges)) patch.badges = data.badges
    useGame.setState(patch)
    useGame.getState().applyOutfit?.()
  } finally {
    applying = false
  }
}

const NETWORK_MSG = 'Cannot reach the server. If it was asleep, wait a few seconds and try again.'

async function authCall(path: 'register' | 'login', body: Record<string, unknown>): Promise<boolean> {
  useAuth.setState({ busy: true, error: null })
  try {
    const r = await api(`/api/auth/${path}`, { method: 'POST', body: JSON.stringify(body) }, 45000)
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      useAuth.setState({ busy: false, error: j.error ?? 'Something went wrong.' })
      return false
    }
    writeToken(j.token)
    useAuth.setState({ token: j.token, user: j.user, status: 'in', busy: false, error: null })
    applyData(j.data)
    return true
  } catch {
    useAuth.setState({ busy: false, error: NETWORK_MSG })
    return false
  }
}

export const useAuth = create<AuthState>()((set) => ({
  status: readToken() ? 'checking' : 'out',
  user: null,
  token: readToken(),
  error: null,
  busy: false,
  register: (username, password) => {
    const g = useGame.getState()
    return authCall('register', { username, password, guestPid, guestData: { profile: g.profile, wallet: g.wallet, badges: g.badges, meta: useMeta.getState().exportData() } })
  },
  login: (username, password) => authCall('login', { username, password }),
  logout: async () => {
    flushData()
    applying = true // resetting the screen must not be saved over the account
    useMeta.getState().hydrate(null)
    applying = false
    try {
      await api('/api/auth/logout', { method: 'POST' }, 5000)
    } catch {
      /* the token simply expires */
    }
    writeToken(null)
    set({ status: 'out', user: null, token: null })
    window.location.reload() // start from a clean, logged-out game
  },
  playAsGuest: () => set({ status: 'guest', user: null, token: null, error: null }),
  changePassword: async (oldPassword, newPassword) => {
    try {
      const r = await api('/api/me/password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) })
      return r.ok ? null : ((await r.json().catch(() => ({}))).error ?? 'Could not change the password.')
    } catch {
      return NETWORK_MSG
    }
  },
  deleteAccount: async (password) => {
    try {
      const r = await api('/api/me', { method: 'DELETE', body: JSON.stringify({ password }) })
      if (!r.ok) return (await r.json().catch(() => ({}))).error ?? 'Could not delete the account.'
      writeToken(null)
      set({ status: 'out', user: null, token: null })
      return null
    } catch {
      return NETWORK_MSG
    }
  },
  clearError: () => set({ error: null }),
}))

/** on page load: a saved token is checked with the server (it may be waking up, so retry for a while) */
async function restore() {
  const started = Date.now()
  while (useAuth.getState().status === 'checking') {
    try {
      const r = await api('/api/me', {}, 12000)
      if (r.status === 401) {
        writeToken(null)
        useAuth.setState({ status: 'out', token: null, user: null })
        return
      }
      if (!r.ok) throw new Error(String(r.status))
      const j = await r.json()
      useAuth.setState({ status: 'in', user: j.user })
      applyData(j.data)
      return
    } catch {
      if (Date.now() - started > 45000) {
        useAuth.setState({ status: 'out', error: NETWORK_MSG })
        return
      }
      await new Promise((res) => setTimeout(res, 3000))
    }
  }
}
if (typeof window !== 'undefined' && useAuth.getState().status === 'checking') void restore()

/* ---- saving the player's data (coins, items, projects, look, badges) to the account ---- */
let timer: ReturnType<typeof setTimeout> | null = null
function flushData(keepalive = false) {
  if (timer) clearTimeout(timer)
  timer = null
  const a = useAuth.getState()
  if (a.status !== 'in') return
  const g = useGame.getState()
  void api('/api/me/data', { method: 'PUT', keepalive, body: JSON.stringify({ data: { profile: g.profile, wallet: g.wallet, badges: g.badges, meta: useMeta.getState().exportData() } }) }).catch(() => {})
}
useGame.subscribe((s, p) => {
  if (applying || useAuth.getState().status !== 'in') return
  if (s.wallet === p.wallet && s.profile === p.profile && s.badges === p.badges) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => flushData(), 1500)
})
useMeta.subscribe((s, p) => {
  if (applying || useAuth.getState().status !== 'in') return
  if (s.missions === p.missions && s.streak === p.streak && s.week === p.week && s.forest === p.forest && s.home === p.home) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => flushData(), 1500)
})
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => flushData(true))
