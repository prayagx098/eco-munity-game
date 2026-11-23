/**
 * Natural turning: the HEAD swings round first (up to a full half-turn), and the body only starts to follow once the
 * head has got there. As the body catches up, the head settles back to centre.
 */
export interface HeadTurn {
  /** how far the head is turned relative to the body (radians) */
  head: number
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** returns the body's new heading */
export function leadTurn(st: HeadTurn, heading: number, desired: number, dt: number, rate: number): number {
  const rel = wrap(desired - heading)
  st.head += (rel - st.head) * Math.min(1, dt * 16)
  // the body waits until the head has (nearly) arrived
  if (Math.abs(rel - st.head) < 0.3) heading += rel * Math.min(1, dt * rate)
  return heading
}
