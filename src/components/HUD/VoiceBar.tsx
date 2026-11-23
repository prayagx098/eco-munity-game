import { useGame } from '../../state/gameStore'
import { useVoice } from '../../net/voice'

/** Voice chat controls: hold to talk (or G), open mic, who you can hear, and mute buttons */
export function VoiceBar() {
  const enabled = useVoice((v) => v.enabled)
  const talking = useVoice((v) => v.talking)
  const openMic = useVoice((v) => v.openMic)
  const nearby = useVoice((v) => v.nearby)
  const speaking = useVoice((v) => v.speaking)
  const muted = useVoice((v) => v.muted)
  const error = useVoice((v) => v.error)
  const remotes = useGame((s) => s.remotes)
  if (!enabled && !error) return null
  const v = useVoice.getState()
  return (
    <div className="pointer-events-auto absolute bottom-28 left-3 z-30 w-56 select-none rounded-2xl bg-slate-900/70 p-2 text-white shadow-xl backdrop-blur-md sm:bottom-24">
      {error && (
        <div className="mb-1.5 rounded-lg bg-rose-500/25 p-1.5 text-[11px] font-semibold text-rose-100">
          {error} <button onClick={() => useVoice.setState({ error: null })} className="ml-1 underline">OK</button>
        </div>
      )}
      {enabled && (
        <>
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
            <span>🎙️ Voice chat</span>
            <button onClick={v.leave} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80 active:scale-95">Leave</button>
          </div>
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              v.setPtt(true)
            }}
            onPointerUp={() => v.setPtt(false)}
            onPointerCancel={() => v.setPtt(false)}
            onLostPointerCapture={() => v.setPtt(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={`w-full touch-none rounded-xl py-2.5 text-sm font-extrabold transition active:scale-[0.98] ${talking ? 'bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.7)]' : 'bg-white/15 hover:bg-white/20'}`}
          >
            {talking ? '🎤 Talking…' : '🎤 Hold to talk (G)'}
          </button>
          <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-white/85">
            <input type="checkbox" checked={openMic} onChange={(e) => v.setOpenMic(e.target.checked)} className="accent-emerald-400" />
            Open mic (always on)
          </label>
          <div className="mt-1.5 border-t border-white/10 pt-1.5">
            {nearby.length === 0 ? (
              <div className="text-[10px] font-medium text-white/60">No one close enough to hear. Walk up to a player who joined voice chat (you hear people within about 9 steps).</div>
            ) : (
              nearby.map((id) => (
                <div key={id} className="flex items-center justify-between py-0.5 text-[11px] font-semibold">
                  <span className="truncate">{speaking[id] ? '🔊' : '🔈'} {remotes[id]?.name ?? 'Player'}</span>
                  <button onClick={() => v.toggleMute(id)} className={`rounded-full px-2 py-0.5 text-[10px] ${muted[id] ? 'bg-rose-500/80' : 'bg-white/10'}`}>
                    {muted[id] ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
