import { Component, type ReactNode } from 'react'

/**
 * If anything in the 3D view throws (e.g. a rare DOM race when a floating
 * label unmounts), rebuild the canvas instead of showing a blank screen.
 * All game state lives in the store, so nothing is lost.
 */
export class SceneBoundary extends Component<{ children: ReactNode }, { n: number; failed: boolean }> {
  state = { n: 0, failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[eco-munity] 3D view recovered from an error:', error)
    setTimeout(() => this.setState((s) => ({ n: s.n + 1, failed: false })), 50)
  }
  render() {
    if (this.state.failed) return null
    return <div key={this.state.n} className="absolute inset-0">{this.props.children}</div>
  }
}
