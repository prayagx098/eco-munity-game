/** Friendly helper robot shown in dialogs */
export function EcoBot({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      {/* antenna */}
      <line x1="60" y1="8" x2="60" y2="24" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="8" r="6" fill="#facc15" />
      {/* ears */}
      <rect x="6" y="40" width="14" height="30" rx="7" fill="#f97316" />
      <rect x="100" y="40" width="14" height="30" rx="7" fill="#f97316" />
      {/* head */}
      <rect x="16" y="22" width="88" height="68" rx="26" fill="#e2e8f0" stroke="#fff" strokeWidth="4" />
      <rect x="26" y="32" width="68" height="48" rx="18" fill="#1e293b" />
      {/* happy eyes */}
      <path d="M38 56 q8 -10 16 0" stroke="#5eead4" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M66 56 q8 -10 16 0" stroke="#5eead4" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M48 66 q12 10 24 0" stroke="#5eead4" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* body */}
      <rect x="34" y="94" width="52" height="40" rx="16" fill="#e2e8f0" stroke="#fff" strokeWidth="4" />
      <rect x="50" y="104" width="20" height="14" rx="5" fill="#f97316" />
      <circle cx="60" cy="111" r="3" fill="#fde68a" />
      {/* waving arm */}
      <path d="M86 108 q18 -6 20 -26" stroke="#e2e8f0" strokeWidth="10" fill="none" strokeLinecap="round" />
      <circle cx="106" cy="80" r="8" fill="#e2e8f0" stroke="#fff" strokeWidth="3" />
    </svg>
  )
}

/** Round LEGO-head avatar for players */
export function MinifigAvatar({ hair, shirt, bg, size = 56 }: { hair: string; shirt: string; bg: string; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="31" fill={bg} stroke="#fff" strokeWidth="2" />
      <clipPath id={`clip-${bg.replace('#', '')}`}>
        <circle cx="32" cy="32" r="30" />
      </clipPath>
      <g clipPath={`url(#clip-${bg.replace('#', '')})`}>
        <rect x="12" y="50" width="40" height="20" rx="6" fill={shirt} />
        <rect x="27" y="44" width="10" height="8" fill="#f5c020" />
        <rect x="16" y="16" width="32" height="32" rx="10" fill="#ffd23f" />
        <rect x="14" y="10" width="36" height="12" rx="6" fill={hair} />
        <rect x="14" y="14" width="8" height="16" rx="4" fill={hair} />
        <circle cx="26" cy="31" r="2.4" fill="#111" />
        <circle cx="38" cy="31" r="2.4" fill="#111" />
        <path d="M25 38 q7 6 14 0" stroke="#111" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}
