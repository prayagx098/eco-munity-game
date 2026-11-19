import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { GOODS, usedSlots, type Good } from '../../state/goods'
import { capacityOf } from '../../state/shop'
import { Icon } from '../UI/Icons'

const COUNTER_INFO = {
  2: { title: 'Counter 2 · Electronics & Parts', sub: 'Wires, boards, bulbs and sensors to build gadgets with', color: '#2563eb' },
  3: { title: 'Counter 3 · Books & Cool Stuff', sub: 'Books, science toys and other fun things', color: '#16a34a' },
} as const

export function Shell({ onClose, title, sub, children, wide }: { onClose: () => void; title: string; sub: string; children: React.ReactNode; wide?: boolean }) {
  const coins = useGame((s) => s.wallet.coins)
  return (
    <motion.div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-3 sm:p-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} onClick={(e) => e.stopPropagation()} className={`glass-light flex max-h-[72vh] w-full ${wide ? 'max-w-xl sm:max-w-2xl' : 'max-w-lg sm:max-w-xl'} flex-col overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl`} role="dialog" aria-label={title}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 sm:px-5 sm:py-3.5">
          <div className="min-w-0 pr-2">
            <div className="truncate text-sm sm:text-base font-bold text-slate-900">{title}</div>
            <div className="truncate text-[11px] text-slate-500">{sub}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs sm:text-sm font-bold text-amber-800">
              <Icon name="coin" size={14} />
              {coins}
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Close">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function BagMeter() {
  const w = useGame((s) => s.wallet)
  const used = usedSlots(w.inv)
  const cap = capacityOf(w.owned)
  const pct = Math.min(100, (used / cap) * 100)
  return (
    <div className="min-w-[10rem]">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
        <span>🎒 Backpack</span>
        <span>
          {used} / {cap}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : 'bg-sky-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function GoodCard({ g }: { g: Good }) {
  const coins = useGame((s) => s.wallet.coins)
  const have = useGame((s) => s.wallet.inv[g.id] ?? 0)
  const buy = useGame((s) => s.buyGood)
  const missing = g.price - coins
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300">
      <div className="flex items-start gap-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">{g.icon}</div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-slate-900">{g.name}</div>
          <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{g.blurb}</div>
          <div className="mt-1 text-[10px] font-medium text-slate-400">
            Takes {g.size} slot{g.size > 1 ? 's' : ''}
            {have > 0 ? ` · you have ${have}` : ''}
          </div>
        </div>
      </div>
      <button onClick={() => buy(g.id)} disabled={missing > 0} className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold ${missing > 0 ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-amber-400 text-slate-900 hover:bg-amber-300'}`}>
        <Icon name="coin" size={13} />
        {g.price}
        {missing > 0 && <span className="font-medium"> · need {missing} more</span>}
      </button>
    </div>
  )
}

/** Counters 2 and 3 */
export function GoodsModal() {
  const counter = useGame((s) => s.goodsCounter)
  const set = useGame((s) => s.setGoodsCounter)
  const info = counter ? COUNTER_INFO[counter] : null
  return (
    <AnimatePresence>
      {counter !== 0 && info && (
        <Shell onClose={() => set(0)} title={info.title} sub={info.sub}>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 px-6 py-2.5">
            <BagMeter />
            <div className="text-[11px] text-slate-500">Full bag? Buy a bigger backpack at counter 1.</div>
          </div>
          <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4 sm:grid-cols-3">
            {GOODS.filter((g) => g.counter === counter).map((g) => (
              <GoodCard key={g.id} g={g} />
            ))}
          </div>
        </Shell>
      )}
    </AnimatePresence>
  )
}

