/**
 * Fullscreen and orientation utilities for auto-fullscreen and landscape orientation.
 */

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  )
}

export async function requestFullscreenSafe(elem: HTMLElement = document.documentElement): Promise<boolean> {
  if (typeof document === 'undefined') return false
  if (isFullscreen()) return true

  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen()
      return true
    } else if ((elem as any).webkitRequestFullscreen) {
      await (elem as any).webkitRequestFullscreen()
      return true
    } else if ((elem as any).msRequestFullscreen) {
      await (elem as any).msRequestFullscreen()
      return true
    }
  } catch {
    // Browsers reject if user gesture policy is not met
    return false
  }
  return false
}

export async function exitFullscreenSafe(): Promise<boolean> {
  if (typeof document === 'undefined') return false
  if (!isFullscreen()) return true

  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
      return true
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen()
      return true
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen()
      return true
    }
  } catch {
    return false
  }
  return false
}

export async function toggleFullscreen(): Promise<boolean> {
  if (isFullscreen()) {
    return exitFullscreenSafe()
  } else {
    return requestFullscreenSafe()
  }
}

export async function lockLandscapeSafe(): Promise<boolean> {
  try {
    if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
      await (screen.orientation as any).lock('landscape')
      return true
    }
  } catch {
    // Mobile browsers may ignore if not in fullscreen or unsupported (e.g. iOS Safari)
  }
  return false
}

export async function enterGameFullscreen(): Promise<boolean> {
  const success = await requestFullscreenSafe()
  await lockLandscapeSafe()
  return success
}

/**
 * Triggers fullscreen & landscape automatically on the first user interaction (click, tap, keypress).
 * Web browsers require a user gesture before entering fullscreen mode.
 */
export function setupAutoFullscreen() {
  if (typeof window === 'undefined') return

  const onFirstInteraction = async () => {
    await requestFullscreenSafe()
    await lockLandscapeSafe()
    window.removeEventListener('pointerdown', onFirstInteraction)
    window.removeEventListener('keydown', onFirstInteraction)
    window.removeEventListener('touchstart', onFirstInteraction)
  }

  window.addEventListener('pointerdown', onFirstInteraction, { passive: true })
  window.addEventListener('keydown', onFirstInteraction, { passive: true })
  window.addEventListener('touchstart', onFirstInteraction, { passive: true })
}
