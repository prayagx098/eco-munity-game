import { useState } from 'react'
import { useGame } from '../../state/gameStore'
import { useAuth } from '../../state/auth'
import { takeOverRoom } from '../../net/net'

/** Shown when this account is already playing on another device: take the place (logging the others out) or log out here */
export function DuplicateLogin() {
  const blocked = useGame((s) => s.netStatus === 'duplicate')
  const logout = useAuth((a) => a.logout)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!blocked) return null
  return (
    <div className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-2xl p-5 text-center shadow-2xl">
        <div className="text-4xl">📱💻</div>
        <h2 className="mt-2 text-lg font-bold">This account is playing on another device</h2>
        <p className="mt-1.5 text-sm text-white/75">An account can only play on one device at a time. You can play here instead, and the other device will be logged out.</p>
        {failed && <p className="mt-2 text-xs font-semibold text-rose-300">Could not reach the server. Check your connection and try again.</p>}
        <div className="mt-4 flex flex-col gap-2">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setFailed(false)
              const ok = await takeOverRoom()
              setBusy(false)
              if (!ok) setFailed(true)
            }}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
          >
            {busy ? 'Switching…' : 'Log out of all other devices and play here'}
          </button>
          <button
            onClick={() => {
              void logout().finally(() => window.location.reload())
            }}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 active:scale-95"
          >
            Log out here
          </button>
        </div>
      </div>
    </div>
  )
}
