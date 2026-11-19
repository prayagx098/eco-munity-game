import { useView, VIEW_LABELS } from '../../state/viewMode'

/** Switches between Overview and Behind you (also the V key) */
export function ViewButton() {
  const mode = useView((s) => s.mode)
  const cycle = useView((s) => s.cycle)
  const v = VIEW_LABELS[mode]
  return (
    <button onClick={cycle} className="glass-btn" aria-label={`Camera view: ${v.name}. Press to change (V)`} title={`${v.name} (V)`}>
      <span className="text-base">{v.emoji}</span>
    </button>
  )
}
