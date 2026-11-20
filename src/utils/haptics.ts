/**
 * Safe mobile haptic vibration feedback.
 * Works on Android Chrome / Safari / Edge mobile devices that support navigator.vibrate.
 */
export function haptic(pattern: number | number[] = 15) {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(pattern)
  } catch {}
}
