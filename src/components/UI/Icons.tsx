/** Small stroke icons (Lucide-style) used by the HUD */
const PATHS: Record<string, string[]> = {
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  bolt: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  smile: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M8 14s1.5 2 4 2 4-2 4-2', 'M9 9h.01', 'M15 9h.01'],
  star: ['m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  tasks: ['M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'm9 14 2 2 4-4'],
  award: ['M12 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12z', 'M15.477 12.89 17 22l-5-3-5 3 1.523-9.11'],
  camera: ['m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5', 'M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  map: ['M3 7 9 4l6 3 6-3v13l-6 3-6-3-6 3z', 'M9 4v13', 'M15 7v13'],
  help: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  settings: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  school: ['m4 6 8-4 8 4', 'M18 10v10', 'M6 10v10', 'M2 20h20', 'M10 20v-5h4v5'],
  play: ['M6 3l14 9-14 9V3z'],
  bag: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  coin: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 7v10', 'M9.5 9.5C9.5 8.4 10.6 8 12 8s2.5.5 2.5 1.6c0 2.4-5 1.4-5 3.8 0 1.1 1.1 1.6 2.5 1.6s2.5-.5 2.5-1.6'],
  fullscreen: ['M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3'],
  minimize: ['M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3'],
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18, className = '', fill = false }: { name: IconName; size?: number; className?: string; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
