/**
 * A dependency-free bridge between the game store and the multiplayer layer
 * (src/net/net.ts). The store calls these; net.ts fills them in.
 * With a single tab open, this tab is the host and nothing is sent anywhere.
 */

export interface Msg {
  t: string
  [k: string]: unknown
}

export const bridge = {
  /** this tab's player id */
  myId: `t-${Math.random().toString(36).slice(2, 8)}`,
  /** true when this tab simulates the shared world */
  isHost: true,
  /** id of the host tab */
  hostId: '',
  /** send a message to the other tabs (no-op until net.ts connects) */
  send: (_msg: Msg) => {},
  /** ask the host to push a world snapshot soon */
  worldDirty: () => {},
}
bridge.hostId = bridge.myId
