import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../state/gameStore'
import { CATS, ITEMS, ITEM_BY_ID, type Cat } from '../../state/shop'
import { Icon } from '../UI/Icons'

/** A simple preview of how your hero looks right now */
function Preview() {
  const p = useGame((s) => s.profile)
  const shoe = p.shoes ? ITEM_BY_ID[p.shoes] : undefined
  const hat = p.hat ? ITEM_BY_ID[p.hat] : undefined
  const glasses = p.glasses ? ITEM_BY_ID[p.glasses] : undefined
  const back = p.back ? ITEM_BY_ID[p.back] : undefined
  const stripe = p.pattern && p.shirt2
  return (
    <div className="relative">
      {back && <div className="absolute top-8 sm:top-11 -left-2 text-2xl sm:text-3xl opacity-90">{back.icon}</div>}
      <svg viewBox="0 0 100 160" className="h-32 w-20 sm:h-44 sm:w-28 drop-shadow-[0_8px_10px_rgba(15,23,42,0.16)]">
        <rect x="28" y="12" width="44" height="14" rx="6" fill={p.hair} />
        <rect x="30" y="18" width="40" height="38" rx="12" fill="#ffd23f" />
        <rect x="28" y="16" width="10" height="20" rx="4" fill={p.hair} />
        <circle cx="42" cy="36" r="3" fill="#111" />
        <circle cx="58" cy="36" r="3" fill="#111" />
        <path d="M42 45 q8 7 16 0" stroke="#111" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <rect x="43" y="56" width="14" height="6" fill="#f5c020" />
        <path d="M30 62 h40 l6 38 h-52 z" fill={p.shirt} />
        {stripe && p.pattern === 'stripes' && [70, 80, 90].map((y) => <rect key={y} x="30" y={y} width="40" height="4" fill={p.shirt2} />)}
        {stripe && p.pattern === 'band' && <rect x="31" y="76" width="38" height="10" fill={p.shirt2} />}
        {stripe && p.pattern === 'twotone' && <path d="M26 84 h48 l2 16 h-52 z" fill={p.shirt2} />}
        <rect x="14" y="64" width="14" height="34" rx="6" fill={p.shirt} transform="rotate(10 21 64)" />
        <rect x="72" y="64" width="14" height="34" rx="6" fill={p.shirt} transform="rotate(-10 79 64)" />
        <circle cx="18" cy="100" r="6" fill="#ffd23f" />
        <circle cx="82" cy="100" r="6" fill="#ffd23f" />
        <rect x="24" y="100" width="52" height="8" fill={p.pants} />
        <rect x="25" y="108" width="23" height="34" rx="3" fill={p.pants} />
        <rect x="52" y="108" width="23" height="34" rx="3" fill={p.pants} />
        <rect x="22" y={shoe?.style === 'boots' ? 132 : 142} width="27" height={shoe?.style === 'boots' ? 18 : 8} rx="4" fill={shoe?.color ?? '#273244'} />
        <rect x="51" y={shoe?.style === 'boots' ? 132 : 142} width="27" height={shoe?.style === 'boots' ? 18 : 8} rx="4" fill={shoe?.color ?? '#273244'} />
      </svg>
      {hat && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl">{hat.icon}</div>}
      {glasses && <div className="absolute top-[2.2rem] sm:top-[2.8rem] left-1/2 -translate-x-1/2 text-lg sm:text-xl">{glasses.icon}</div>}
    </div>
  )
}

function Card({ id }: { id: string }) {
  const item = ITEM_BY_ID[id]
  const wallet = useGame((s) => s.wallet)
  const buy = useGame((s) => s.buyItem)
  const equip = useGame((s) => s.equipItem)
  const unequip = useGame((s) => s.unequip)
  const owned = wallet.owned.includes(id)
  const worn = wallet.equipped[item.cat] === id
  const missing = item.price - wallet.coins
  return (
    <div className={`flex flex-col gap-2 rounded-2xl border p-3 transition ${worn ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: item.color ? `${item.color}22` : '#f1f5f9' }}>
          {item.icon}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
          {item.cap && <div className="mt-0.5 text-[10px] font-semibold text-sky-600">🎒 carries +{item.cap} things</div>}
          {(item.fabric || item.fx) && (
            <div className="mt-0.5 text-[10px] font-medium text-slate-500 capitalize">
              {item.fabric && item.fabric !== 'cotton' ? item.fabric : ''}
              {item.fx === 'sparkle' ? ' · ✨ sparkles' : item.fx === 'steps' ? ' · 💫 lights up' : ''}
            </div>
          )}
          {item.color && (
            <div className="mt-1 flex gap-1">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: item.color }} />
              {item.color2 && <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: item.color2 }} />}
            </div>
          )}
        </div>
      </div>
      {worn ? (
        <button onClick={() => unequip(item.cat)} className="rounded-lg bg-emerald-500 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
          Wearing ✓ · tap to take off
        </button>
      ) : owned ? (
        <button onClick={() => equip(id)} className="rounded-lg bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
          Wear it
        </button>
      ) : (
        <button onClick={() => buy(id)} disabled={missing > 0} className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold ${missing > 0 ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-amber-400 text-slate-900 hover:bg-amber-300'}`}>
          <Icon name="coin" size={13} />
          {item.price}
          {missing > 0 && <span className="font-medium"> · need {missing} more</span>}
        </button>
      )}
    </div>
  )
}

/** The shop: spend the coins you earn from finishing tasks on clothes, shoes, hats and more */
export function ShopModal() {
  const open = useGame((s) => s.shopOpen)
  const setShop = useGame((s) => s.setShop)
  const coins = useGame((s) => s.wallet.coins)
  const owned = useGame((s) => s.wallet.owned.length)
  const [cat, setCat] = useState<Cat>('shirt')
  const list = ITEMS.filter((i) => i.cat === cat)
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-3 sm:p-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShop(false)}>
          <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-light flex max-h-[72vh] w-full max-w-xl sm:max-w-2xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl" role="dialog" aria-label="Shop">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 sm:px-5 sm:py-3.5">
              <div className="min-w-0 pr-2">
                <div className="truncate text-sm sm:text-base font-bold text-slate-900">Counter 1 · Fashion &amp; Bags</div>
                <div className="truncate text-[11px] text-slate-500">CYBERSQUARE Store · {owned} items owned</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs sm:text-sm font-bold text-amber-800">
                  <Icon name="coin" size={14} />
                  {coins}
                </div>
                <button onClick={() => setShop(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Close">
                  <Icon name="x" size={15} />
                </button>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 md:grid-cols-[10rem_1fr]">
              <div className="flex flex-col items-center justify-center gap-2 bg-slate-50 px-3 py-3 sm:px-4 sm:py-4 border-b md:border-b-0 md:border-r border-slate-100">
                <Preview />
                <div className="text-center text-[10px] text-slate-400">Live preview</div>
              </div>
              <div className="flex min-h-0 flex-col">
                <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
                  {CATS.map((c) => (
                    <button key={c.id} onClick={() => setCat(c.id)} className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${cat === c.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <span className="text-sm">{c.icon}</span>
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-2.5 sm:grid-cols-3 sm:gap-2.5 sm:p-3.5">
                  {list.map((i) => (
                    <Card key={i.id} id={i.id} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
