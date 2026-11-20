import { useGame } from '../../state/gameStore'
import { useAuth } from '../../state/auth'

/** Shown when this account is already playing in the same room on another tab or device */
export function DuplicateLogin() {
  const blocked = useGame((s) => s.netStatus === 'duplicate')
  const logout = useAuth((a) => a.logout)
  if (!blocked) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-2xl p-5 text-center shadow-2xl">
        <div className="text-4xl">🔒</div>
        <h2 className="mt-2 text-lg font-bold">You're already in this room</h2>
        <p className="mt-1.5 text-sm text-white/75">
          This account is playing on another tab or device. Each player can only be in a room once. Close the other one, then try again.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button onClick={() => window.location.reload()} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white active:scale-95">
            Try again
          </button>
          <button
            onClick={() => {
              void logout().finally(() => window.location.reload())
            }}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 active:scale-95"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
