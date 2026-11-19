import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { GOOD_BY_ID } from '../../state/goods'
import { ACT_LABEL, COND_LABEL, PROJECT_BY_ID } from '../../state/projects'
import { ITEM_BY_ID } from '../../state/shop'
import { Icon } from '../UI/Icons'
import { BagMeter, Shell } from './StoreModals'
import { Workbench } from './Workbench'

type Tab = 'bag' | 'bench' | 'shelf'

function Shelf() {
  const projects = useGame((s) => s.wallet.projects)
  const place = useGame((s) => s.placeProject)
  const take = useGame((s) => s.takeProject)
  const dump = useGame((s) => s.dumpProject)
  const [sure, setSure] = useState<string | null>(null)
  const onPads = projects.filter((p) => p.pad !== null).length
  if (!projects.length) return <div className="m-4 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-400">No projects yet. Open the Workbench and build your first one!</div>
  return (
    <div className="space-y-3 p-4">
      <div className="text-xs text-slate-500">
        Your finished projects live here. Walk to the <b>Maker Yard</b> (just south of the store) to put one on a pad and watch it run. {onPads}/5 pads in use.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((p) => {
          const d = PROJECT_BY_ID[p.def]
          const code = d.fixed ?? p.prog
          return (
            <div key={p.id} className={`rounded-2xl border p-3.5 ${p.pad !== null ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{d.icon}</div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-slate-900">{d.name}</div>
                  <div className="text-[11px] font-medium text-slate-500">{p.pad !== null ? `Running on pad ${p.pad + 1} in the Maker Yard` : 'On your shelf'}</div>
                </div>
              </div>
              <div className="mt-2 space-y-0.5 rounded-lg bg-slate-900/90 p-2 font-mono text-[11px] text-slate-200">
                {code.rules.map((r, i) => (
                  <div key={i}>
                    <span className="text-violet-300">{i === 0 ? 'if' : 'else if'}</span> {COND_LABEL[r.when]}
                    {r.and !== 'none' && <span className="text-amber-300"> and {COND_LABEL[r.and]}</span>} <span className="text-sky-300">→</span> {ACT_LABEL[r.then]}
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex gap-2">
                {p.pad === null ? (
                  <button onClick={() => place(p.id)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
                    📍 Place in Maker Yard
                  </button>
                ) : (
                  <button onClick={() => take(p.id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                    ↩ Take back to shelf
                  </button>
                )}
                <button onClick={() => (sure === p.id ? (dump(p.id), setSure(null)) : setSure(p.id))} className={`ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold ${sure === p.id ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500'}`}>
                  {sure === p.id ? 'Really dump it?' : '🗑 Dump'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function InventoryModal() {
  const open = useGame((s) => s.invOpen)
  const setInv = useGame((s) => s.setInv)
  const w = useGame((s) => s.wallet)
  const [tab, setTab] = useState<Tab>('bag')
  const items = Object.entries(w.inv).filter(([, n]) => n > 0)
  const packs = w.owned.filter((id) => ITEM_BY_ID[id]?.cap)
  return (
    <AnimatePresence>
      {open && (
        <Shell onClose={() => setInv(false)} title="Backpack, Workbench & Projects" sub="Gather parts · build projects · show them in the Maker Yard" wide>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-2.5">
            <div className="flex gap-1">
              {(
                [
                  ['bag', '🎒 Materials'],
                  ['bench', '🛠️ Workbench'],
                  ['shelf', `📁 My projects${w.projects.length ? ` (${w.projects.length})` : ''}`],
                ] as const
              ).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${tab === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {label}
                </button>
              ))}
            </div>
            <BagMeter />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'bag' && (
              <div className="space-y-3 p-4">
                <div className="text-xs text-slate-500">
                  {packs.length ? `Backpacks you own: ${packs.map((b) => ITEM_BY_ID[b].name).join(', ')}.` : 'You only have your hands: 6 slots. Buy a backpack at counter 1 in the store.'} Spare parts you will not use can go in the <b>e-waste bin</b> at the Maker Yard.
                </div>
                {items.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-400">Nothing here yet. Walk to the store, north-east of the plaza, and visit the counters.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {items.map(([id, n]) => {
                      const g = GOOD_BY_ID[id]
                      return (
                        <div key={id} className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="text-2xl">{g?.icon}</div>
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="truncate text-sm font-semibold text-slate-900">{g?.name}</div>
                            <div className="text-[11px] text-slate-500">
                              × {n} · {(g?.size ?? 1) * n} slot{(g?.size ?? 1) * n > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {tab === 'bench' && <Workbench goShelf={() => setTab('shelf')} />}
            {tab === 'shelf' && <Shelf />}
          </div>
        </Shell>
      )}
    </AnimatePresence>
  )
}

/** The e-waste bin at the Maker Yard: get rid of parts you will not use, or old projects */
export function BinModal() {
  const open = useGame((s) => s.binOpen)
  const setBin = useGame((s) => s.setBin)
  const w = useGame((s) => s.wallet)
  const dumpGood = useGame((s) => s.dumpGood)
  const dumpProject = useGame((s) => s.dumpProject)
  const items = Object.entries(w.inv).filter(([, n]) => n > 0)
  const shelf = w.projects.filter((p) => p.pad === null)
  return (
    <AnimatePresence>
      {open && (
        <Shell onClose={() => setBin(false)} title="♻️ E-waste bin" sub="Electronics must never go in the normal bin: the metals inside can be recycled">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div>
              <div className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Spare parts</div>
              {items.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">Your backpack has no parts.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {items.map(([id, n]) => (
                    <button key={id} onClick={() => dumpGood(id)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-sm hover:border-rose-300 hover:bg-rose-50">
                      <span className="text-xl">{GOOD_BY_ID[id]?.icon}</span>
                      <span className="flex-1 leading-tight">
                        <span className="block font-semibold text-slate-800">{GOOD_BY_ID[id]?.name}</span>
                        <span className="text-[11px] text-slate-400">× {n} · tap to recycle one</span>
                      </span>
                      <Icon name="x" size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Old projects on your shelf</div>
              {shelf.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">No projects waiting on the shelf.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {shelf.map((p) => (
                    <button key={p.id} onClick={() => dumpProject(p.id)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-sm hover:border-rose-300 hover:bg-rose-50">
                      <span className="text-xl">{PROJECT_BY_ID[p.def].icon}</span>
                      <span className="flex-1 font-semibold text-slate-800">{PROJECT_BY_ID[p.def].name}</span>
                      <Icon name="x" size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Shell>
      )}
    </AnimatePresence>
  )
}
