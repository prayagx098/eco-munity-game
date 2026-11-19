import { useMemo, useRef, useState } from 'react'
import { useGame } from '../../state/gameStore'
import { GOOD_BY_ID, pickMaterials } from '../../state/goods'
import { ACT_LABEL, COND_LABEL, PROJECTS, PROJECT_BY_ID, linkKey, runTests, type Act, type Cond, type Program, type ProjectDef, type Rule } from '../../state/projects'

const PW = 128
const rows = (p: { l?: string[]; r?: string[] }) => Math.max(p.l?.length ?? 0, p.r?.length ?? 0, 1)
const ph = (p: { l?: string[]; r?: string[] }) => 34 + rows(p) * 24
const term = (p: ProjectDef['parts'][number], side: 'l' | 'r', i: number) => ({ x: p.x + (side === 'r' ? PW : 0), y: p.y + 40 + i * 24 })

/** Drag from one terminal to another to lay a wire. Every wire has a ✕ to remove it. */
function Board({ def, links, setLinks, tried }: { def: ProjectDef; links: string[]; setLinks: (l: string[]) => void; tried: boolean }) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ from: string; x: number; y: number } | null>(null)
  const pos = useMemo(() => {
    const m: Record<string, { x: number; y: number; side: 'l' | 'r' }> = {}
    for (const p of def.parts) {
      p.l?.forEach((t, i) => (m[`${p.id}.${t}`] = { ...term(p, 'l', i), side: 'l' }))
      p.r?.forEach((t, i) => (m[`${p.id}.${t}`] = { ...term(p, 'r', i), side: 'r' }))
    }
    return m
  }, [def])
  const need = new Set(def.links.map(([a, b]) => linkKey(a, b)))
  const toSvg = (e: React.PointerEvent) => {
    const el = svg.current!
    const pt = el.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const q = pt.matrixTransform(el.getScreenCTM()!.inverse())
    return { x: q.x, y: q.y }
  }
  const nearest = (x: number, y: number, not: string) => {
    let best: string | null = null
    let bd = 22
    for (const [id, p] of Object.entries(pos)) {
      if (id.split('.')[0] === not.split('.')[0]) continue
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bd) {
        bd = d
        best = id
      }
    }
    return best
  }
  const curve = (a: { x: number; y: number; side: 'l' | 'r' }, bx: number, by: number, bside: 'l' | 'r' | null) => {
    const bend = 40
    return `M${a.x},${a.y} C${a.x + (a.side === 'r' ? bend : -bend)},${a.y} ${bx + (bside === null ? 0 : bside === 'r' ? bend : -bend)},${by} ${bx},${by}`
  }
  const hover = drag ? nearest(drag.x, drag.y, drag.from) : null
  return (
    <svg
      ref={svg}
      viewBox="0 0 560 250"
      className="w-full touch-none rounded-2xl bg-slate-900 select-none"
      style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      onPointerMove={(e) => drag && setDrag({ ...drag, ...toSvg(e) })}
      onPointerUp={(e) => {
        if (!drag) return
        const t = nearest(toSvg(e).x, toSvg(e).y, drag.from)
        if (t) {
          const k = linkKey(drag.from, t)
          if (!links.includes(k)) setLinks([...links, k])
        }
        setDrag(null)
      }}
      onPointerLeave={() => setDrag(null)}
    >
      {links.map((k) => {
        const [a, b] = k.split('~')
        const pa = pos[a]
        const pb = pos[b]
        if (!pa || !pb) return null
        const bad = tried && !need.has(k)
        const mx = (pa.x + pb.x) / 2
        const my = (pa.y + pb.y) / 2
        return (
          <g key={k}>
            <path d={curve(pa, pb.x, pb.y, pb.side)} stroke={bad ? '#f43f5e' : '#fbbf24'} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <g onClick={() => setLinks(links.filter((x) => x !== k))} className="cursor-pointer">
              <circle cx={mx} cy={my} r="9" fill="#0f172a" stroke={bad ? '#f43f5e' : '#fbbf24'} strokeWidth="2" />
              <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#fca5a5" fontWeight="700">
                ✕
              </text>
            </g>
          </g>
        )
      })}
      {drag && pos[drag.from] && <path d={curve(pos[drag.from], drag.x, drag.y, null)} stroke="#fde68a" strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" fill="none" />}
      {def.parts.map((p) => (
        <g key={p.id}>
          <rect x={p.x} y={p.y} width={PW} height={ph(p)} rx="12" fill="#1e293b" stroke="#475569" />
          <text x={p.x + PW / 2} y={p.y + 17} textAnchor="middle" fontSize="12" fill="#e2e8f0" fontWeight="600">
            {p.icon} {p.name}
          </text>
          {(['l', 'r'] as const).map((side) =>
            (p[side] ?? []).map((t, i) => {
              const id = `${p.id}.${t}`
              const q = term(p, side, i)
              const on = drag?.from === id || hover === id
              return (
                <g
                  key={id}
                  className="cursor-crosshair"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    setDrag({ from: id, ...toSvg(e) })
                  }}
                >
                  <circle cx={q.x} cy={q.y} r="13" fill="transparent" />
                  <circle cx={q.x} cy={q.y} r={on ? 8 : 6} fill={on ? '#fbbf24' : '#0f172a'} stroke={on ? '#fde68a' : '#94a3b8'} strokeWidth="2" />
                  <text x={q.x + (side === 'l' ? 12 : -12)} y={q.y + 4} textAnchor={side === 'l' ? 'start' : 'end'} fontSize="11" fill="#cbd5e1" pointerEvents="none">
                    {t}
                  </text>
                </g>
              )
            }),
          )}
        </g>
      ))}
    </svg>
  )
}

const sel = 'rounded-md bg-slate-700 px-1.5 py-1 text-[12px] text-slate-100'

function CodeEditor({ def, prog, setProg }: { def: ProjectDef; prog: Program; setProg: (p: Program) => void }) {
  const conds = def.conds ?? []
  const acts = def.acts ?? []
  const set = (i: number, r: Partial<Rule>) => setProg({ ...prog, rules: prog.rules.map((x, k) => (k === i ? { ...x, ...r } : x)) })
  return (
    <div className="space-y-2 rounded-2xl bg-slate-900 p-3 font-mono text-[13px] text-slate-100">
      {prog.rules.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-800/70 p-2">
          <span className="w-12 text-violet-300">{i === 0 ? 'if' : 'else if'}</span>
          <select className={sel} value={r.when} onChange={(e) => set(i, { when: e.target.value as Cond })}>
            {conds.map((c) => (
              <option key={c} value={c}>
                {COND_LABEL[c]}
              </option>
            ))}
          </select>
          <span className="text-amber-300">and</span>
          <select className={sel} value={r.and} onChange={(e) => set(i, { and: e.target.value as Cond | 'none' })}>
            <option value="none">(nothing else)</option>
            {conds.map((c) => (
              <option key={c} value={c}>
                {COND_LABEL[c]}
              </option>
            ))}
          </select>
          <span className="text-sky-300">then</span>
          <select className={sel} value={r.then} onChange={(e) => set(i, { then: e.target.value as Act })}>
            {acts.map((a) => (
              <option key={a} value={a}>
                {ACT_LABEL[a]}
              </option>
            ))}
          </select>
          {prog.rules.length > 1 && (
            <button onClick={() => setProg({ ...prog, rules: prog.rules.filter((_, k) => k !== i) })} className="ml-auto rounded px-1.5 text-slate-400 hover:text-rose-400">
              ✕
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-3 text-[12px]">
        {prog.rules.length < 4 && (
          <button onClick={() => setProg({ ...prog, rules: [...prog.rules, { when: conds[0], and: 'none', then: acts[0] }] })} className="rounded-md bg-slate-700 px-2 py-1 hover:bg-slate-600">
            + add rule
          </button>
        )}
        <span className="text-slate-400">else → everything OFF</span>
        {conds.includes('timer') && (
          <label className="ml-auto flex items-center gap-1.5 text-amber-300">
            timer every
            <input type="range" min={1} max={5} value={prog.every} onChange={(e) => setProg({ ...prog, every: +e.target.value })} />
            {prog.every}s
          </label>
        )}
      </div>
    </div>
  )
}

const STEPS = ['Guide & parts', 'Wire it', 'Code it', 'Build']

function Builder({ def, onBack, goShelf }: { def: ProjectDef; onBack: () => void; goShelf: () => void }) {
  const inv = useGame((s) => s.wallet.inv)
  const build = useGame((s) => s.buildProject)
  const [step, setStep] = useState(0)
  const [links, setLinks] = useState<string[]>([])
  const [tried, setTried] = useState(false)
  const [hints, setHints] = useState(0)
  const [prog, setProg] = useState<Program>(def.fixed ?? { rules: [{ when: 'any', and: 'none', then: def.acts?.includes('off') ? 'off' : (def.acts?.[0] ?? 'on') }], every: 2 })
  const [ran, setRan] = useState(false)
  const [done, setDone] = useState(false)
  const have = (ids: string[]) => ids.reduce((a, i) => a + (inv[i] ?? 0), 0)
  const mats = pickMaterials(def.needs, inv)
  const need = def.links.map(([a, b]) => linkKey(a, b))
  const missing = need.filter((k) => !links.includes(k))
  const extra = links.filter((k) => !need.includes(k))
  const wiredOk = missing.length === 0 && extra.length === 0
  const results = def.tests ? runTests(def, prog) : []
  const codeOk = !def.tests || results.every((r) => r.ok)
  const nice = (k: string) => {
    const [a, b] = k.split('~')
    const fmt = (t: string) => {
      const [pid, term] = t.split('.')
      return `${def.parts.find((p) => p.id === pid)?.name} ${term}`
    }
    return `${fmt(a)} ↔ ${fmt(b)}`
  }
  if (done)
    return (
      <div className="space-y-4 p-8 text-center">
        <div className="text-6xl">{def.icon}</div>
        <div className="text-xl font-semibold text-slate-900">You built the {def.name}!</div>
        <p className="mx-auto max-w-md text-sm text-slate-600">{def.fact}</p>
        <p className="text-xs text-slate-400">It is on your project shelf. Walk to the Maker Yard (south of the store) and place it on a pad to watch it work.</p>
        <button onClick={goShelf} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Go to My projects
        </button>
      </div>
    )
  const hasCode = !!def.tests
  const steps = hasCode ? STEPS : STEPS.filter((s) => s !== 'Code it')
  const cur = steps[step]
  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200">
          ← All projects
        </button>
        <div className="text-sm font-semibold text-slate-900">
          {def.icon} {def.name}
        </div>
        <div className="ml-auto flex gap-1">
          {steps.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className={`rounded-full px-3 py-1 text-xs font-semibold ${i === step ? 'bg-slate-900 text-white' : i < step ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {i + 1} · {s}
            </button>
          ))}
        </div>
      </div>

      {cur === 'Guide & parts' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-900">
              <div className="mb-1 text-xs font-bold tracking-wide uppercase">Mission</div>
              {def.goal}
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <div className="mb-1 text-xs font-bold tracking-wide uppercase">Good to know</div>
              {def.concept}
            </div>
            <div className="text-xs text-slate-500">You will wire the circuit{hasCode ? ', write the code and pass the tests' : ''} yourself. Stuck? Ask for a hint in the step.</div>
          </div>
          <div>
            <div className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Materials</div>
            <ul className="space-y-1.5 text-sm">
              {def.needs.map((n) => {
                const ok = have(n.ids) >= (n.qty ?? 1)
                return (
                  <li key={n.label} className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                    <span>
                      {ok ? '✓' : '✗'} {n.label}
                      {n.qty ? ` × ${n.qty}` : ''}
                    </span>
                    <span className="text-xs">{n.ids.map((i) => `${GOOD_BY_ID[i]?.icon} ${inv[i] ?? 0}`).join('  ')}</span>
                  </li>
                )
              })}
            </ul>
            {!mats && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Missing something? Buy it at counter 2 (Electronics &amp; Parts) in the store. The parts are used up when you build.</div>}
            <button onClick={() => setStep(1)} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Start wiring →
            </button>
          </div>
        </div>
      )}

      {cur === 'Wire it' && (
        <div className="space-y-3">
          <div className="text-sm text-slate-600">Drag from one dot to another to lay a wire. Press the ✕ on a wire to remove it, or use Undo. Complete the loop so current can flow.</div>
          <Board def={def} links={links} setLinks={(l) => { setLinks(l); setTried(false) }} tried={tried} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { setLinks(links.slice(0, -1)); setTried(false) }} disabled={!links.length} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40">
              ↶ Undo
            </button>
            <button onClick={() => { setLinks([]); setTried(false) }} disabled={!links.length} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40">
              Clear all
            </button>
            <button onClick={() => setTried(true)} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300">
              ⚡ Test circuit
            </button>
            <button onClick={() => setHints(Math.min(def.hints.length, hints + 1))} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
              💡 Hint ({hints}/{def.hints.length})
            </button>
            {tried && wiredOk && (
              <button onClick={() => setStep(step + 1)} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                Next →
              </button>
            )}
          </div>
          {hints > 0 && (
            <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {def.hints.slice(0, hints).map((h) => (
                <li key={h}>💡 {h}</li>
              ))}
            </ul>
          )}
          {tried && (
            <div className={`rounded-xl p-3 text-sm ${wiredOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
              {wiredOk ? '✅ The circuit is complete! Current flows round the whole loop.' : `The circuit is not working yet. ${missing.length ? `${missing.length} connection${missing.length > 1 ? 's are' : ' is'} missing. ` : ''}${extra.length ? `${extra.length} wire${extra.length > 1 ? 's do' : ' does'} not belong (shown in red). ` : ''}`}
              {!wiredOk && missing.length > 0 && hints >= def.hints.length && <div className="mt-1 text-xs text-slate-500">Try this one: {nice(missing[0])}</div>}
            </div>
          )}
        </div>
      )}

      {cur === 'Code it' && (
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sm text-sky-900">
              <b>Mission:</b> {def.goal}
            </div>
            <CodeEditor def={def} prog={prog} setProg={(p) => { setProg(p); setRan(false) }} />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setRan(true)} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300">
                ▶ Run tests
              </button>
              <button onClick={() => setHints(Math.min(def.hints.length, hints + 1))} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                💡 Hint ({hints}/{def.hints.length})
              </button>
              {ran && codeOk && (
                <button onClick={() => setStep(step + 1)} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                  Next →
                </button>
              )}
            </div>
            {hints > 0 && (
              <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                {def.hints.slice(0, hints).map((h) => (
                  <li key={h}>💡 {h}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold tracking-wide text-slate-500 uppercase">Tests: what must happen</div>
            {results.map((r) => (
              <div key={r.test.say} className={`rounded-xl border p-2.5 text-sm ${!ran ? 'border-slate-200 bg-white' : r.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                <div className="font-medium text-slate-800">
                  {ran ? (r.ok ? '✅' : '❌') : '▫️'} {r.test.say}
                </div>
                <div className="text-xs text-slate-500">
                  should: {ACT_LABEL[r.test.expect]}
                  {ran && !r.ok && <span className="text-rose-500"> · yours: {ACT_LABEL[r.got]}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cur === 'Build' && (
        <div className="space-y-3 text-sm">
          <ul className="space-y-1.5">
            <li className={mats ? 'text-emerald-600' : 'text-rose-500'}>{mats ? '✓' : '✗'} All materials in your backpack</li>
            <li className={wiredOk ? 'text-emerald-600' : 'text-rose-500'}>{wiredOk ? '✓' : '✗'} Circuit wired correctly (go to “Wire it” and press Test)</li>
            {hasCode && <li className={codeOk ? 'text-emerald-600' : 'text-rose-500'}>{codeOk ? '✓' : '✗'} Code passes every test</li>}
          </ul>
          <div className="text-xs text-slate-500">Building uses up the materials. Your project goes on your shelf, and you decide when to show it in the Maker Yard.</div>
          <button
            disabled={!mats || !wiredOk || !codeOk}
            onClick={() => build(def.id, prog) && setDone(true)}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${mats && wiredOk && codeOk ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}
          >
            🔧 Build it!
          </button>
        </div>
      )}
    </div>
  )
}

const LEVEL = ['', 'Beginner', 'Maker', 'Engineer']

export function Workbench({ goShelf }: { goShelf: () => void }) {
  const [id, setId] = useState<string | null>(null)
  const inv = useGame((s) => s.wallet.inv)
  const built = useGame((s) => s.wallet.projects)
  if (id) return <Builder key={id} def={PROJECT_BY_ID[id]} onBack={() => setId(null)} goShelf={goShelf} />
  return (
    <div className="space-y-3 p-4">
      <div className="text-sm text-slate-600">Choose a project. You gather the parts, wire the circuit and write the code yourself, and the tests tell you when it works.</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((p) => {
          const ready = !!pickMaterials(p.needs, inv)
          const count = built.filter((b) => b.def === p.id).length
          return (
            <button key={p.id} onClick={() => setId(p.id)} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-slate-400">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-2xl">{p.icon}</div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                  <div className="text-[11px] font-medium text-slate-400">
                    {'★'.repeat(p.level)}
                    {'☆'.repeat(3 - p.level)} {LEVEL[p.level]}
                    {p.tests ? ' · wiring + code' : ' · wiring'}
                  </div>
                </div>
              </div>
              <div className="text-xs leading-snug text-slate-500">{p.goal}</div>
              <div className={`text-[11px] font-semibold ${ready ? 'text-emerald-600' : 'text-slate-400'}`}>
                {ready ? '✓ You have all the parts' : 'Parts needed from counter 2'}
                {count > 0 ? ` · built ${count}×` : ''}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
