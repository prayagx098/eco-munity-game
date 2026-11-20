/**
 * World layout: every position in the town lives here so the 3D scene,
 * collision, mini-map and game logic all agree.
 *
 * Coordinates are world units on the ground plane (x, z). The camera looks
 * from +x/+z, so on screen: up = (-x,-z), right = (+x,-z).
 */

export const WORLD_HALF = 80

export type XZ = [number, number]

export interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

export const rect = (cx: number, cz: number, w: number, d: number): Rect => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 })

/* ------------------------------------------------------------------ */
/* Landmarks                                                            */
/* ------------------------------------------------------------------ */

export const PLAYER_START: XZ = [2, 4]

export const ROAD_X = -24
export const RIVER = { z0: 30, z1: 36 }
/** Cross roads (east–west). Each meets the main road at a junction with traffic lights. */
export const ROADS_EW = [{ z: -47 }, { z: 48 }]
export const ROAD_W = 8
/** footpath each side of every road */
export const WALK_W = 2
/** distance from a road's centre line to the middle of each traffic lane */
export const LANE_OFF = ROAD_W / 4
export const JUNCTIONS = ROADS_EW.map((r) => ({ x: ROAD_X, z: r.z }))

/** Traffic-light phase for each axis, from the wall clock so every player sees the same colour */
export type Light = 'green' | 'yellow' | 'red'
export function lightState(axis: 'x' | 'z', now = Date.now() / 1000): Light {
  const t = now % 24
  if (axis === 'z') return t < 10 ? 'green' : t < 12 ? 'yellow' : 'red'
  return t < 12 ? 'red' : t < 22 ? 'green' : t < 24 ? 'yellow' : 'red'
}
export const BRIDGE = { x0: -2.4, x1: 2.4 }

/** The CYBERSQUARE school building, where the Eco-munity Center used to stand (north of the plaza) */
export const SCHOOL_BUILDING = rect(0, -20.5, 18, 7)

/**
 * The CYBERSQUARE Store: a big shop you can walk into. The door is on the west side; three counters stand
 * along the back (north) wall: 1 fashion & bags, 2 electronics & parts, 3 books & cool stuff.
 */
export const STORE: Rect = { x0: 6, x1: 22, z0: -41.5, z1: -31.5 }
export const STORE_DOOR = { z0: -38, z1: -35 }
export const STORE_COUNTERS = [
  { id: 1 as const, x: 10.5, name: 'Fashion & Bags', emoji: '👕', color: '#ec4899' },
  { id: 2 as const, x: 14, name: 'Electronics & Parts', emoji: '🔌', color: '#2563eb' },
  { id: 3 as const, x: 17.5, name: 'Books & Cool Stuff', emoji: '📚', color: '#16a34a' },
]
/** where you stand to use a counter (just in front of it) */
export const STORE_COUNTER_Z = -38.6
export const STORE_STAND: Rect[] = STORE_COUNTERS.map((c) => ({ x0: c.x - 1.3, x1: c.x + 1.3, z0: STORE_COUNTER_Z - 0.9, z1: STORE_COUNTER_Z + 0.9 }))
export const STORE_WALLS: Rect[] = [
  { x0: STORE.x0, x1: STORE.x1, z0: STORE.z0, z1: STORE.z0 + 0.4 },
  { x0: STORE.x0, x1: STORE.x1, z0: STORE.z1 - 0.4, z1: STORE.z1 },
  { x0: STORE.x1 - 0.4, x1: STORE.x1, z0: STORE.z0, z1: STORE.z1 },
  { x0: STORE.x0, x1: STORE.x0 + 0.4, z0: STORE.z0, z1: STORE_DOOR.z0 },
  { x0: STORE.x0, x1: STORE.x0 + 0.4, z0: STORE_DOOR.z1, z1: STORE.z1 },
  // counters
  ...STORE_COUNTERS.map((c) => ({ x0: c.x - 1.4, x1: c.x + 1.4, z0: STORE.z0 + 0.4, z1: STORE.z0 + 1.9 })),
  // display shelves in the middle of the shop
  { x0: 9, x1: 12, z0: -34.9, z1: -34.2 },
  { x0: 15, x1: 18, z0: -34.9, z1: -34.2 },
]

/** The Maker Yard (south of the store): five pads where students show the projects they built, and the e-waste bin */
export const MAKER_YARD: Rect = { x0: 6, x1: 22, z0: -31.4, z1: -27.4 }
export const MAKER_PADS: XZ[] = [[8.4, -29.4], [11.4, -29.4], [14.4, -29.4], [17.4, -29.4], [20.4, -29.4]]
export const EWASTE_BIN: XZ = [6.9, -27.9]
export const EWASTE_STAND: Rect = { x0: 5.9, x1: 7.9, z0: -27.1, z1: -25.9 }

export const SCHOOL_NAME = 'CYBERSQUARE'
/**
 * The school sits behind Maple Street: buildings on the west, south and east sides around a big football
 * pitch, a paved walkway all the way round the pitch, and one gate in the north wall.
 */
export const SCHOOL: Rect = { x0: -58, x1: -35, z0: -18, z1: 14 }
export const SCHOOL_W: Rect = { x0: -58, x1: -55, z0: -17.4, z1: 14 }
export const SCHOOL_E: Rect = { x0: -38, x1: -35, z0: -17.4, z1: 14 }
export const SCHOOL_S: Rect = { x0: -55, x1: -38, z0: 11, z1: 14 }
/** the room inside the buildings (pitch + walkway) */
export const SCHOOL_INNER: Rect = { x0: -55, x1: -38, z0: -17.4, z1: 11 }
export const SCHOOL_FIELD: Rect = { x0: -52.8, x1: -40.2, z0: -15.2, z1: 8.8 }
export const SCHOOL_GATE = { x: -41.5, z: -17.7, w: 3.2 }
/** north wall pieces either side of the gate */
export const SCHOOL_WALLS: Rect[] = [
  { x0: -55, x1: SCHOOL_GATE.x - SCHOOL_GATE.w / 2, z0: -18, z1: -17.4 },
  { x0: SCHOOL_GATE.x + SCHOOL_GATE.w / 2, x1: -38, z0: -18, z1: -17.4 },
]
/** the paved walkway ring around the pitch */
export const SCHOOL_WALKWAY: Rect[] = [
  { x0: -55, x1: -38, z0: -17.4, z1: -15.2 },
  { x0: -55, x1: -38, z0: 8.8, z1: 11 },
  { x0: -55, x1: -52.8, z0: -15.2, z1: 8.8 },
  { x0: -40.2, x1: -38, z0: -15.2, z1: 8.8 },
]
export const FOOTBALL_SPOT: XZ = [-46.5, -3.2]
/** Goal mouths at the north and south ends of the pitch */
export const GOALS = [
  { id: 'north', x0: -49.25, x1: -43.75 },
  { id: 'south', x0: -49.25, x1: -43.75 },
] as const
/**
 * The Eco Waste Hub: ONE building split into three bays, out west where there is plenty of room.
 * From west to east: compost bay, recycling bay, waste-to-energy bay. Each bay opens onto a shared paved yard on its south side.
 */
export const ECO_HUB = rect(-56, -34.5, 24, 10)
/** z of the open front of the hub (the yard side) */
export const HUB_FACE_Z = ECO_HUB.z1
export const COMPOST_BAY = rect(-64, -34.5, 8, 10)
export const RECYCLING_CENTER = rect(-56, -34.5, 8, 10)
/** where trash from the blue bins is burned for energy */
export const WASTE_PLANT = rect(-48, -34.5, 8, 10)
/** the compost bay's pit (the compost truck feeds it) */
export const COMPOST_YARD: XZ = [-64, -34.5]
/** the paved yard in front of the hub */
export const HUB_YARD = { x0: -68, x1: -44, z0: HUB_FACE_Z, z1: -21.7 }
/** the Green Heart crystal on its pedestal in the plaza (the story's centrepiece) */
export const HEART_POS: XZ = [-2.6, -3.4]
export const BARN = rect(36, 14, 7, 6)
export const POND = { x: 20, z: -20, r: 6 }

/** a tidy wind farm in the Sunny Fields, in a row, instead of turbines dotted across the lawns */
export const WIND_TURBINES: XZ[] = [
  [34, -13],
  [39, -13],
  [44, -13],
]

export const HOUSE_ZS = [-40, -31, -22, -13, -4, 5, 14, 23]
export const HOUSE_X = -31
export const HOUSES = HOUSE_ZS.map((z, i) => ({ id: `house-${i}`, x: HOUSE_X, z, door: [HOUSE_X + 2, z + 1] as XZ }))

export const GARDEN_PLOTS = [
  { id: 'plot-0', crop: 'carrot', ...rect(15, 7.5, 4.6, 3.6) },
  { id: 'plot-1', crop: 'tomato', ...rect(21, 7.5, 4.6, 3.6) },
  { id: 'plot-2', crop: 'cabbage', ...rect(15, 13, 4.6, 3.6) },
  { id: 'plot-3', crop: 'sunflower', ...rect(21, 13, 4.6, 3.6) },
] as const

export const TAPS = [
  { id: 'tap-0', x: 7, z: -5, zone: 'Town Plaza' },
  { id: 'tap-1', x: 13, z: -9, zone: 'Duck Pond Park' },
  { id: 'tap-2', x: -1.8, z: 10.5, zone: 'Green School' },
  { id: 'tap-3', x: 18, z: 10.25, zone: 'Community Garden' },
  { id: 'tap-4', x: 30, z: 4, zone: 'Happy Farm' },
]

/** Compost heaps that need turning so the scraps rot into soil */
export const HEAPS = [
  { id: 'heap-0', x: -5.5, z: -26, zone: 'CYBERSQUARE' },
  { id: 'heap-1', x: 26.8, z: 12, zone: 'Community Garden' },
  { id: 'heap-2', x: -18, z: 24, zone: 'Community Park' },
] as const

export type VehicleKind = 'bike'
export const VEHICLES: Record<VehicleKind, { name: string; emoji: string; speed: number; run: number; radius: number; blurb: string }> = {
  bike: { name: 'Solar Cycle', emoji: '🚲', speed: 8.5, run: 12, radius: 0.5, blurb: 'Solar battery & pedal power makes zero pollution!' },
}
/** Free-to-borrow eco vehicles */
export const STANDS: { id: string; kind: VehicleKind; x: number; z: number; rot: number }[] = [
  { id: 'stand-0', kind: 'bike', x: 9.5, z: 4, rot: 0.6 },
  { id: 'stand-1', kind: 'bike', x: -14.5, z: -4.5, rot: 2.2 },
  { id: 'stand-2', kind: 'bike', x: 44, z: 3.6, rot: 1.2 },
  { id: 'stand-3', kind: 'bike', x: 50.5, z: -9, rot: 1.6 },
  { id: 'stand-5', kind: 'bike', x: 14, z: 26, rot: 1 },
]
/** A rentable vehicle standing somewhere in town (at a stand, or parked where somebody left it) */
export interface VehicleEntity {
  id: string
  kind: VehicleKind
  x: number
  z: number
  rot: number
  /** the stand it spawned at (undefined for vehicles somebody parked) */
  home?: string
}
export const initialVehicles = (): VehicleEntity[] => STANDS.map((s) => ({ id: s.id, kind: s.kind, x: s.x, z: s.z, rot: s.rot, home: s.id }))
/** seconds before a taken vehicle is replaced at its stand (and only while nobody is looking) */
export const RESPAWN_DELAY = 50
export const RESPAWN_HIDDEN_DIST = 30


/* ---- Expanded map: Sunset Beach (east), Learning Corner (north), Butterfly Meadow (south-east) ---- */
export const BEACH = { x0: 46, x1: WORLD_HALF, z0: -22, z1: 28 }
export const SEA = { x0: 55.5, x1: WORLD_HALF, z0: -22, z1: 28 }
export const PIER = { x0: 54, x1: 59.5, z0: -1.2, z1: 1.2 }
/**
 * The Learning Centre: a raised classroom deck set back from the road, reached by a paved forecourt, an entrance arch
 * and three steps. (Deck x -7..7, z -65.5..-56.5; forecourt in front of it down to the road.)
 */
export const LEARNING_CORNER = rect(0, -61, 14, 9)
export const LEARNING_BOARD: XZ = [0, -63.2]
export const LEARNING_FORECOURT: Rect = { x0: -7.5, x1: 7.5, z0: LEARNING_CORNER.z1, z1: -50.2 }
/** the arch over the entrance path */
export const LEARNING_ARCH_Z = -53
/** Areas where grass tufts should not grow */
export const NO_GRASS: Rect[] = [
  BEACH,
  LEARNING_CORNER,
  { x0: -1.5, x1: 1.5, z0: -WORLD_HALF, z1: -24 },
  { x0: ROAD_X - ROAD_W / 2 - WALK_W - 0.3, x1: ROAD_X + ROAD_W / 2 + WALK_W + 0.3, z0: -WORLD_HALF, z1: WORLD_HALF },
  SCHOOL_BUILDING,
  ...ROADS_EW.map((r) => ({ x0: -WORLD_HALF - 1, x1: WORLD_HALF + 1, z0: r.z - ROAD_W / 2 - WALK_W - 0.3, z1: r.z + ROAD_W / 2 + WALK_W + 0.3 })),
  SCHOOL,
  ECO_HUB,
  HUB_YARD,
  { x0: STORE.x0 - 1, x1: STORE.x1 + 1, z0: STORE.z0 - 1, z1: MAKER_YARD.z1 + 0.5 },
]

const FLOWER_BEDS_ALL: { x: number; z: number; w: number; d: number }[] = [
  { x: -4.8, z: -54.6, w: 3.4, d: 1.6 },
  { x: 4.8, z: -54.6, w: 3.4, d: 1.6 },
  { x: -14, z: 5.5, w: 4, d: 2.4 },
  { x: -9, z: 10, w: 4, d: 2.4 },
  { x: 6, z: 9.5, w: 3.4, d: 2.2 },
  { x: -16, z: 6, w: 3.4, d: 2.2 },
  { x: 6, z: -24, w: 3.4, d: 2.2 },
  { x: 26, z: 54, w: 4, d: 2.4 },
  { x: 33, z: 56, w: 3.6, d: 2.4 },
  { x: 41, z: 54, w: 4, d: 2.2 },
  { x: 48, z: 55, w: 3.4, d: 2.4 },
  { x: 20, z: 56, w: 3.4, d: 2.2 },
]

export const FLOWER_BEDS = FLOWER_BEDS_ALL.filter((f) => ROADS_EW.every((r) => Math.abs(f.z - r.z) > 3.4 + f.d / 2))

/** Bin stations – each has compost / recycle / trash side by side */
export const BIN_STATIONS = [
  // tucked against the edge of the paving so they never stand in the middle of a walkway
  { id: 'plaza', name: 'Plaza', x: -6, z: -5.3, axis: 'x' as 'x' | 'z' },
  { id: 'park', name: 'Park', x: 9.6, z: -15.35, axis: 'x' as 'x' | 'z' },
  { id: 'river', name: 'Riverside', x: 7.5, z: 28, axis: 'x' as 'x' | 'z' },
  { id: 'farm', name: 'Farm', x: 28, z: 10.4, axis: 'x' as 'x' | 'z' },
]

/* ------------------------------------------------------------------ */
/* Waste collection: bins fill up, a truck comes, and delivers to its yard */
/* ------------------------------------------------------------------ */

export const BIN_CAP = 6
export const TRUCK_SPEED = 4.6
export const LOAD_TIME = 13
export const UNLOAD_TIME = 8.5
/** the bin has been emptied this far into the loading sequence */
export const EMPTIED_AT = 0.66
/** where each truck backs up to its depot (rear toward the building / heap) */
export const TRUCK_PARK: Record<'recycle' | 'compost' | 'trash', { x: number; z: number; heading: number }> = {
  recycle: { x: -56, z: -25.4, heading: 0 },
  compost: { x: -64, z: -25.4, heading: 0 },
  trash: { x: -48, z: -25.4, heading: 0 },
}

/** Waypoints the trucks drive between (all of them lie on footpaths / service roads) */
export const TRUCK_NODES: XZ[] = [
  [-12, -26.5], // 0 junction at the end of the old recycling road
  [-12, 0], // 1
  [0, 0], // 2 plaza centre
  [12, 0], // 3
  [15.5, 0], // 4
  [15.5, -11], // 5
  [13.4, -13.4], // 6 park bins
  [-8, 0], // 7 plaza bins
  [0, 24], // 8
  [0, 26.5], // 9
  [5, 26.5], // 10 riverside bins
  [24, 0], // 11
  [34, 0], // 12
  [34, 9], // 13
  [30.5, 9], // 14 farm bins
  [38.6, 9], // 15 (spare)
  [-17.6, -26.5], // 16 east of the main road
  [-42, -26.5], // 17 service road west of Maple Street
  [-42, -22.5], // 18
  [-48, -22.5], // 19 yard lane in front of the waste-to-energy bay
  [-56, -22.5], // 20 ... recycling bay
  [-64, -22.5], // 21 ... compost bay
  [-48, -26.5], // 22 waste truck home (waste-to-energy bay)
  [-56, -26.5], // 23 recycling truck home
  [-64, -26.5], // 24 compost truck home
]
export const TRUCK_EDGES: [number, number][] = [
  [0, 1], [1, 7], [7, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 8], [8, 9], [9, 10], [4, 11], [11, 12], [12, 13], [13, 14], [0, 16], [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [19, 22], [20, 23], [21, 24],
]
export const TRUCK_HOME: Record<'recycle' | 'compost' | 'trash', number> = { recycle: 23, compost: 24, trash: 22 }
export const STATION_DOCK: Record<string, number> = { plaza: 7, park: 6, river: 10, farm: 14 }
export const TRUCK_INFO = {
  recycle: { name: 'Recycling truck', emoji: '♻️', color: '#16a34a', dest: 'the Eco Waste Hub recycling bay' },
  compost: { name: 'Compost truck', emoji: '🌱', color: '#b45309', dest: 'the Eco Waste Hub compost bay' },
  trash: { name: 'Waste truck', emoji: '🗑️', color: '#475569', dest: 'the Eco Waste Hub energy bay' },
} as const

/** shortest drive between two waypoints (Dijkstra over the truck network) */
export function truckRoute(from: number, to: number): XZ[] {
  const n = TRUCK_NODES.length
  const dist = Array(n).fill(Infinity)
  const prev: number[] = Array(n).fill(-1)
  const done = Array(n).fill(false)
  dist[from] = 0
  for (let it = 0; it < n; it++) {
    let u = -1
    for (let k = 0; k < n; k++) if (!done[k] && (u < 0 || dist[k] < dist[u])) u = k
    if (u < 0 || dist[u] === Infinity) break
    done[u] = true
    for (const [a, b] of TRUCK_EDGES) {
      const v = a === u ? b : b === u ? a : -1
      if (v < 0) continue
      const w = Math.hypot(TRUCK_NODES[u][0] - TRUCK_NODES[v][0], TRUCK_NODES[u][1] - TRUCK_NODES[v][1])
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        prev[v] = u
      }
    }
  }
  const path: number[] = []
  for (let c = to; c >= 0; c = prev[c]) path.unshift(c)
  return path.map((i) => TRUCK_NODES[i])
}

/** round the corners of a driving route so a truck turns through arcs instead of snapping */
export function smoothPath(pts: XZ[], radius = 1.8): XZ[] {
  if (pts.length < 3) return pts
  const out: XZ[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const l1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1])
    const l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const d = Math.min(radius, l1 / 2, l2 / 2)
    if (d < 0.05 || l1 < 0.01 || l2 < 0.01) {
      out.push(p1)
      continue
    }
    const a: XZ = [p1[0] + ((p0[0] - p1[0]) / l1) * d, p1[1] + ((p0[1] - p1[1]) / l1) * d]
    const b: XZ = [p1[0] + ((p2[0] - p1[0]) / l2) * d, p1[1] + ((p2[1] - p1[1]) / l2) * d]
    // keep straight pieces straight
    const cross = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0])
    if (Math.abs(cross) < 1e-6) {
      out.push(p1)
      continue
    }
    out.push(a)
    for (let t = 0.15; t < 0.99; t += 0.15) {
      const u = 1 - t
      out.push([u * u * a[0] + 2 * u * t * p1[0] + t * t * b[0], u * u * a[1] + 2 * u * t * p1[1] + t * t * b[1]])
    }
    out.push(b)
  }
  out.push(pts[pts.length - 1])
  return out
}

export const routeLength = (r: XZ[]) => r.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0), 0)

/** timeline of one collection run (seconds after it starts) */
export function jobTimes(kind: 'recycle' | 'compost' | 'trash', station: string) {
  const route = smoothPath(truckRoute(TRUCK_HOME[kind], STATION_DOCK[station]))
  const len = routeLength(route)
  const out = len / TRUCK_SPEED
  return { route, out, loaded: out + LOAD_TIME * EMPTIED_AT, back: out + LOAD_TIME + out, end: out + LOAD_TIME + out + UNLOAD_TIME }
}

export type BinKind = 'compost' | 'recycle' | 'trash'
const BIN_ORDER: BinKind[] = ['compost', 'recycle', 'trash']

/** distance between neighbouring bins in a station (they stand almost side by side) */
export const BIN_GAP = 1.4

/** Every individual bin in the world (3 per station, lined up along the screen's x-axis) */
export const BIN_SLOTS = BIN_STATIONS.flatMap((st) =>
  BIN_ORDER.map((kind, i) => ({
    id: `${st.id}-${kind}`,
    station: st.id,
    kind,
    x: st.x + (st.axis === 'x' ? (i - 1) * BIN_GAP : 0),
    z: st.z + (st.axis === 'z' ? (i - 1) * BIN_GAP : 0),
  })),
)

/** Benches [x, z, rotationY] */
/** Direction posts: each board points from the post toward its destination */
export interface PostTarget {
  label: string
  x: number
  z: number
  color: string
}
export interface Signpost {
  x: number
  z: number
  targets: PostTarget[]
}
const T = {
  pond: { label: '🦆 Duck Pond Park', x: 20, z: -20, color: '#0284c7' },
  garden: { label: '🥕 Community Garden', x: 18, z: 10, color: '#65a30d' },
  farm: { label: '🐔 Happy Farm', x: 36, z: 14, color: '#b91c1c' },
  beach: { label: '🏖️ Sunset Beach', x: 52, z: 0, color: '#0ea5e9' },
  plaza: { label: '🏙️ Town Plaza', x: 0, z: 0, color: '#7c3aed' },
  school: { label: '🏫 CYBERSQUARE school', x: 0, z: -17, color: '#1e3a8a' },
  sports: { label: '⚽ Sports Ground', x: -46, z: -3, color: '#15803d' },
  maple: { label: '🏘️ Maple Street', x: -31, z: -25, color: '#c2410c' },
  recycle: { label: '♻️ Eco Waste Hub', x: -56, z: -33, color: '#047857' },
  learning: { label: '📚 Learning Corner', x: 0, z: -54, color: '#4338ca' },
  forest: { label: '🌲 Pine Forest', x: 38, z: -35, color: '#166534' },
  woods: { label: '🌳 Whispering Woods', x: 0, z: 42, color: '#15803d' },
  meadow: { label: '🦋 Butterfly Meadow', x: 40, z: 53, color: '#be185d' },
  river: { label: '🌊 Sparkle River', x: 0, z: 33, color: '#0369a1' },
}
export const SIGNPOSTS: Signpost[] = [
  { x: 4, z: 7.5, targets: [T.pond, T.garden, T.farm, T.school, T.beach] },
  { x: 14.5, z: 3, targets: [T.pond, T.garden, T.farm, T.beach, T.plaza] },
  { x: -15, z: -2.5, targets: [T.recycle, T.plaza, T.sports, T.maple] },
  { x: -19, z: 3.8, targets: [T.sports, T.maple, T.plaza] },
  { x: -35.5, z: -21, targets: [T.sports, T.plaza, T.maple] },
  { x: 4.5, z: -19, targets: [T.learning, T.school, T.plaza] },
  { x: -17.5, z: -42, targets: [T.learning, T.recycle, T.forest, T.plaza] },
  { x: -17.5, z: 53, targets: [T.meadow, T.river, T.plaza] },
  { x: -3.5, z: 24, targets: [T.woods, T.river, T.plaza, T.school] },
]

export const BENCHES: [number, number, number][] = [
  [-5.6, -52.2, Math.PI / 2],
  [5.6, -52.2, -Math.PI / 2],
  [-10, 18, 0],
  [-8, 23, Math.PI],
  [5.5, -4.8, 0],
  [31, -20, -Math.PI / 2],
  [20, -9.6, 0],
  [-8.5, 5, Math.PI / 2],
  [4, 27.5, Math.PI],
]

const TREES_ALL: [number, number, number][] = [
  // around plaza & school
  [-9.5, -9, 1], [9.5, -12, 1], [-7, -18, 0.9], [8, -18, 1.1],
  // park
  [12, -24, 1], [28, -24, 0.9], [27, -17, 1.1], [14, -30, 1], [24, -29, 1], [10, -20, 0.8],
  // forest NE
  [32, -36, 1.2], [36, -30, 1], [40, -40, 1.1], [42, -33, 0.9], [30, -42, 1], [38, -43, 1.2], [44, -26, 1],
  // garden / farm
  [25, 4.5, 0.9], [42, 6, 1], [43, 20, 1.1], [24, 22, 0.9],
  // school
  // recycling / west
  [-5, -30, 1], [5, -36, 1],
  // across the river: whispering woods
  [-38, 41, 1], [-28, 43, 1.1], [-20, 40, 0.9], [-9, 43, 1.2], [3, 44, 1], [11, 43, 0.9], [20, 41, 1.1], [30, 43, 1], [40, 40, 1.2],
  // new edges: west of the road, north & south borders
  [-52, -40, 1.1], [-55, -22, 1], [-52, 24, 1.1], [-56, -52, 1], [-40, -54, 1.2], [-32, -57, 1], [-14, -58, 0.9], [14, -57, 1], [26, -52, 1.1], [38, -56, 1.2], [50, -50, 1], [56, -36, 1.1],
  [-30, 56, 1], [-18, 56, 1.1], [-6, 53, 1], [6, 56, 1.2], [-44, 54, 1], [-54, 42, 1.1], [-56, 56, 1], [58, 42, 1], [54, 58, 1.1],
  // the old school grounds are now a little park
  [-12, 12, 1], [-6, 20, 0.9], [-16, 24, 1], [-4, 26, 1], [-14, 17, 0.9],
  // east edge
  [44, -6, 1], [44, 30, 0.9],
]

/** Trees never stand on the cross roads or main road */
export const TREES: [number, number, number][] = TREES_ALL.filter(
  ([x, z]) =>
    Math.abs(x - ROAD_X) > 7.5 &&
    ROADS_EW.every((r) => Math.abs(z - r.z) > 7.5) &&
    !(x > 9.5 && x < 30.5 && z > -30.5 && z < -10) &&
    !(x > SCHOOL_BUILDING.x0 - 1.5 && x < SCHOOL_BUILDING.x1 + 1.5 && z > SCHOOL_BUILDING.z0 - 1.5 && z < SCHOOL_BUILDING.z1 + 1.5) &&
    !(x > -10 && x < 10 && z < -49 && z > -70) &&
    !(x > 30 && x < 47 && z > -16 && z < -10) &&
    !(x > ECO_HUB.x0 - 3 && x < ECO_HUB.x1 + 3 && z > ECO_HUB.z0 - 3 && z < HUB_YARD.z1 + 3) &&
    !(x > STORE.x0 - 2.5 && x < STORE.x1 + 2.5 && z > STORE.z0 - 2.5 && z < MAKER_YARD.z1 + 2.5),
)

/** The wider map has a green margin of trees around the old town (kept clear of roads, the river and the sea) */
function marginTrees(): [number, number, number][] {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const out: [number, number, number][] = []
  for (let i = 0; i < 420 && out.length < 90; i++) {
    const x = (rnd() * 2 - 1) * (WORLD_HALF - 2.5)
    const z = (rnd() * 2 - 1) * (WORLD_HALF - 2.5)
    if (Math.abs(x) < 61 && Math.abs(z) < 61) continue // the old town area is already planted
    if (Math.abs(x - ROAD_X) < 8) continue
    if (ROADS_EW.some((r) => Math.abs(z - r.z) < 7.5)) continue
    if (z > RIVER.z0 - 2.5 && z < RIVER.z1 + 2.5) continue
    if (x > 53 && z > -25 && z < 31) continue // beach and sea
    if (Math.abs(x) < 12 && z < -49) continue // the Learning Centre and its forecourt
    if (x > 30 && x < 47 && z > -16 && z < -10) continue // the wind farm
    if (x > ECO_HUB.x0 - 4 && x < ECO_HUB.x1 + 4 && z > ECO_HUB.z0 - 4 && z < HUB_YARD.z1 + 4) continue // the Eco Waste Hub
    out.push([x, z, 0.9 + rnd() * 0.5])
  }
  return out
}
TREES.push(...marginTrees())

/** Trees are planted only in the Pine Forest, so they never take up room in the town or on roads */
export const SAPLING_SPOTS: XZ[] = [
  [34, -55], [38, -36], [44, -36], [50, -32], [46, -38], [52, -34], [48, -28],
  [56, -40], [58, -54], [40, -56], [32, -54], [54, -56], [60, -30], [44, -58],
]

export const COIN_SPOTS: XZ[] = [
  [-3, -4], [8, 3], [-14, -2], [-19, 10], [-12, -20], [-14, -36], [3, -28], [18, -10],
  [28, -20], [34, -26], [42, -38], [38, -6], [24, 1], [31, 18], [40, 24], [17, 18],
  [-8, 18], [0, 22], [-46.5, -20], [-30, 0], [-30, 18], [-30, -26], [5, 40], [-20, 42],
  [24, 39], [38, 41], [-36, 40], [12, -36],
  [50, -10], [52, 12], [49, 24], [51, -18], [-8, -52], [8, -57], [30, 52], [44, 52], [-48, -10], [-52, 20],
]

/* ------------------------------------------------------------------ */
/* Static NPCs                                                         */
/* ------------------------------------------------------------------ */

export const STATIC_NPCS = [
  { id: 'mrs-rao', name: 'Mrs. Rao', x: 4, z: -3.6, shirt: '#a855f7', pants: '#334155', hair: '#d6d3d1', longHair: true, rot: Math.PI },
  { id: 'farmer-joy', name: 'Farmer Joy', x: 31, z: 6, shirt: '#16a34a', pants: '#1e3a8a', hair: '#92400e', longHair: false, rot: Math.PI / 2 },
  { id: 'ms-ada', name: 'Ms. Ada', x: -46.5, z: -11.5, shirt: '#0ea5e9', pants: '#475569', hair: '#1c1917', longHair: true, rot: Math.PI / 2 },
  { id: 'lifeguard-lee', name: 'Lifeguard Lee', x: 50, z: 3.5, shirt: '#ef4444', pants: '#facc15', hair: '#f59e0b', longHair: false, rot: -Math.PI / 2 },
  { id: 'ranger-sam', name: 'Ranger Sam', x: 16.5, z: -11.5, shirt: '#65a30d', pants: '#3f6212', hair: '#78350f', longHair: false, rot: 0 },
]

/* ------------------------------------------------------------------ */
/* Zones                                                                */
/* ------------------------------------------------------------------ */

export interface Zone extends Rect {
  id: string
  name: string
  emoji: string
}

/** First match wins, so put small zones before big ones */
export const ZONES: Zone[] = [
  { id: 'store', name: 'CYBERSQUARE Store', emoji: '🛍️', x0: STORE.x0 - 1, x1: STORE.x1 + 1, z0: STORE.z0 - 1, z1: MAKER_YARD.z1 + 0.5 },
  { id: 'beach', name: 'Sunset Beach', emoji: '🏖️', ...BEACH },
  { id: 'learning', name: 'Learning Corner', emoji: '📚', x0: -20, x1: 28, z0: -WORLD_HALF, z1: -43 },
  { id: 'meadow', name: 'Butterfly Meadow', emoji: '🦋', x0: 14, x1: WORLD_HALF, z0: 46, z1: WORLD_HALF },
  { id: 'plaza', name: 'Town Plaza', emoji: '🏙️', x0: -10, x1: 10, z0: -7, z1: 7 },
  { id: 'park', name: 'Duck Pond Park', emoji: '🦆', x0: 10, x1: 30, z0: -32, z1: -6 },
  { id: 'forest', name: 'Pine Forest', emoji: '🌲', x0: 28, x1: WORLD_HALF, z0: -WORLD_HALF, z1: -24 },
  { id: 'solar', name: 'Sunny Fields', emoji: '☀️', x0: 30, x1: WORLD_HALF, z0: -22, z1: -3 },
  { id: 'garden', name: 'Community Garden', emoji: '🥕', x0: 11, x1: 26, z0: 3, z1: 18 },
  { id: 'farm', name: 'Happy Farm', emoji: '🐔', x0: 26, x1: 45, z0: 3, z1: 29 },
  { id: 'school', name: 'CYBERSQUARE', emoji: '🏫', x0: -10, x1: 10, z0: -27, z1: -7 },
  { id: 'ecohub', name: 'Eco Waste Hub', emoji: '♻️', x0: -70, x1: -41, z0: -42, z1: -20 },
  { id: 'sports', name: 'Sports Ground', emoji: '⚽', x0: -WORLD_HALF, x1: -34, z0: -21, z1: 15 },
  { id: 'street', name: 'Maple Street', emoji: '🏘️', x0: -WORLD_HALF, x1: -20, z0: -WORLD_HALF, z1: 29 },
  { id: 'river', name: 'Sparkle River', emoji: '🌊', x0: -WORLD_HALF, x1: WORLD_HALF, z0: 28, z1: 38 },
  { id: 'woods', name: 'Whispering Woods', emoji: '🌳', x0: -WORLD_HALF, x1: WORLD_HALF, z0: 38, z1: WORLD_HALF },
]

export const zoneAt = (x: number, z: number) => ZONES.find((zn) => x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1) ?? null

/* ------------------------------------------------------------------ */
/* Paths (for drawing) and the NPC navigation graph                    */
/* ------------------------------------------------------------------ */

export const PATHS: Rect[] = [
  { x0: -9, x1: 9, z0: -6, z1: 6 }, // plaza square
  { x0: -2, x1: 2, z0: -17, z1: -6 }, // to the school entrance
  { x0: -20.5, x1: -9, z0: -1.5, z1: 1.5 }, // west
  { x0: 9, x1: 55, z0: -1.5, z1: 1.5 }, // east (to the beach)
  { x0: -1.5, x1: 1.5, z0: LEARNING_CORNER.z1, z1: -24.5 }, // north to the Learning Centre
  { x0: -1.5, x1: 1.5, z0: 6, z1: 45.5 }, // south (over the bridge)
  // service roads for the waste trucks
  { x0: -20.5, x1: -11.2, z0: -27.3, z1: -25.7 },
  { x0: -42.8, x1: -27.8, z0: -27.3, z1: -25.7 }, // service road to the Eco Waste Hub
  { x0: -42.8, x1: -41.2, z0: -27.3, z1: -21.7 },
  { x0: -44, x1: -41.2, z0: -23.3, z1: -21.7 },
  HUB_YARD,
  { x0: 30, x1: 33.5, z0: 8.4, z1: 9.6 },
  { x0: 14.5, x1: 16.5, z0: -12, z1: -1.5 }, // to park
  { x0: 9, x1: 16.5, z0: -16, z1: -12 }, // park plaza
  // a walkway all the way round the duck pond
  { x0: 11.4, x1: 28.6, z0: -28.6, z1: -27 },
  { x0: 11.4, x1: 28.6, z0: -13, z1: -11.4 },
  { x0: 11.4, x1: 13, z0: -27, z1: -13 },
  { x0: 27, x1: 28.6, z0: -27, z1: -13 },
  { x0: -13, x1: -11, z0: -27, z1: -1.5 }, // to recycling center
  { x0: 33, x1: 35, z0: 1.5, z1: 11 }, // to barn
  // a short front path from every house door out to the pavement
  ...HOUSES.map((h) => ({ x0: h.door[0] - 0.4, x1: -27.7, z0: h.door[1] - 0.6, z1: h.door[1] + 0.6 })),
  // footpath from the crossing, between the houses and behind them to the school gate
  { x0: -34.8, x1: -27.8, z0: -1, z1: 2 },
  { x0: -34.85, x1: -33.15, z0: -19.9, z1: 2 },
  { x0: -43.5, x1: -33.15, z0: -19.9, z1: -18.2 },
  { x0: 1.5, x1: STORE.x0 - 0.2, z0: -37.6, z1: -35.4 }, // to the store door
  { x0: 1.5, x1: MAKER_YARD.x1, z0: MAKER_YARD.z0, z1: MAKER_YARD.z1 }, // the maker yard
  ...SCHOOL_WALKWAY,
  { x0: SCHOOL_GATE.x - SCHOOL_GATE.w / 2, x1: SCHOOL_GATE.x + SCHOOL_GATE.w / 2, z0: -18, z1: -17.4 }, // gate
  { x0: 3, x1: 10, z0: 24.5, z1: 28.5 }, // riverside deck
  { x0: 26, x1: 31, z0: 7, z1: 11 }, // farm bins
  LEARNING_FORECOURT, // paved forecourt
  { x0: LEARNING_CORNER.x0 - 0.5, x1: LEARNING_CORNER.x1 + 0.5, z0: LEARNING_CORNER.z0 - 0.5, z1: LEARNING_CORNER.z1 + 0.5 }, // learning corner deck
]

export const NAV_NODES: XZ[] = [
  [0, 0], [-6, 1], [6, 1], [0, -8], [0, 6], [0, 14], [-2, 14], [0, 26], [0, 41], [12, 0],
  [15.5, 0], [15.5, -11], [12, -14], [24, 0], [34, 0], [34, 9], [-12, 0], [-12, -14], [-12, -25], [-19, 0],
  [-27.2, 0], [-27.2, -20], [-27.2, 20], [6, 26.5], [-12, 41], [12, 41],
  [-33.9, 0.5], [-33.9, -19.1], [-41.5, -19.1], [-41.5, -16.3], [-39.1, -16.3], [-39.1, 0],
]

export const NAV_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [4, 5], [5, 6], [5, 7], [7, 8], [2, 9], [9, 10],
  [10, 11], [11, 12], [10, 13], [13, 14], [14, 15], [1, 16], [16, 17], [17, 18], [16, 19], [19, 20],
  [20, 21], [20, 22], [7, 23], [8, 24], [8, 25], [20, 26], [26, 27], [27, 28], [28, 29], [29, 30], [30, 31],
]

export const NAV_NEIGHBOURS: number[][] = NAV_NODES.map((_, i) =>
  NAV_EDGES.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a)),
)

/** Places litter likes to appear */
export const LITTER_SPOTS: XZ[] = [
  ...NAV_NODES,
  [-10, 30], [12, 28.5], [22, 29], [-18, 29], [30, 29], [-30, 29], // riverbank
  [8, 38], [-6, 38.5],
  [50, -12], [52, 10], [49, 22], [53, -4], [-4, -50], [6, -46],
]

/* ------------------------------------------------------------------ */
/* Collision                                                            */
/* ------------------------------------------------------------------ */

export interface Circle {
  x: number
  z: number
  r: number
}

/** Dynamic obstacles added during gameplay (e.g. newly planted trees) */
export const dynamicCircles = new Map<string, Circle>()

export function setDynamicObstacle(id: string, circle: Circle | null) {
  if (circle) dynamicCircles.set(id, circle)
  else dynamicCircles.delete(id)
}

const pad = (r: Rect, p = 0.1): Rect => ({ x0: r.x0 - p, x1: r.x1 + p, z0: r.z0 - p, z1: r.z1 + p })

export const OBSTACLE_RECTS: Rect[] = [
  pad(SCHOOL_BUILDING, 0.4),
  pad(ECO_HUB, 0.3),
  pad(SCHOOL_W, 0.2),
  pad(SCHOOL_E, 0.2),
  pad(SCHOOL_S, 0.2),
  ...SCHOOL_WALLS.map((w) => pad(w, 0.1)),
  pad(BARN, 0.3),
  ...HOUSES.map((h) => rect(h.x, h.z, 3.4, 5)),
  ...GARDEN_PLOTS.map((p) => pad(p, 0.15)),
  ...FLOWER_BEDS.map((f) => rect(f.x, f.z, f.w, f.d)),
  // river (except bridges)
  { x0: -WORLD_HALF, x1: -26.6, z0: RIVER.z0, z1: RIVER.z1 },
  { x0: -21.4, x1: BRIDGE.x0, z0: RIVER.z0, z1: RIVER.z1 },
  { x0: BRIDGE.x1, x1: WORLD_HALF, z0: RIVER.z0, z1: RIVER.z1 },
  // the sea (except the pier)
  { x0: SEA.x0, x1: SEA.x1 + 5, z0: SEA.z0, z1: PIER.z0 },
  { x0: SEA.x0, x1: SEA.x1 + 5, z0: PIER.z1, z1: SEA.z1 },
  // low wall between road and town (gaps for the west path and the north road)
  { x0: -20.8, x1: -20.2, z0: -WORLD_HALF, z1: -49.6 },
  { x0: -20.8, x1: -20.2, z0: -44.4, z1: -27.8 },
  { x0: -20.8, x1: -20.2, z0: -25.2, z1: -2 },
  { x0: -20.8, x1: -20.2, z0: 2, z1: 28 },
]

/** Street lamps (also drawn by Town.tsx) */
export const LAMPS: XZ[] = [
  [-9.9, -6.9], [9.9, -6.9], [-9.9, 6.9], [9.9, 6.9], [13.4, -6], [2.5, 18], [2.5, 21.5], [25, -2.7], [-10.3, -10],
  [-3.4, -51.4], [3.4, -51.4], [-3.4, -57.2], [3.4, -57.2],
]

const thin = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0, x1, z0, z1 })
/** Props you should not be able to walk through: farm fence, learning-corner rails, road barriers */
const PROP_RECTS: Rect[] = [
  thin(28, 38, 16.1, 16.3),
  thin(28, 38, 24.4, 24.6),
  thin(27.9, 28.1, 16.2, 24.5),
  // learning centre deck rails (open at the front where the steps are)
  thin(LEARNING_CORNER.x0, -1.7, LEARNING_CORNER.z1 - 0.1, LEARNING_CORNER.z1 + 0.1),
  thin(1.7, LEARNING_CORNER.x1, LEARNING_CORNER.z1 - 0.1, LEARNING_CORNER.z1 + 0.1),
  thin(LEARNING_CORNER.x0, LEARNING_CORNER.x1, LEARNING_CORNER.z0 - 0.1, LEARNING_CORNER.z0 + 0.1),
  thin(LEARNING_CORNER.x0 - 0.1, LEARNING_CORNER.x0 + 0.1, LEARNING_CORNER.z0, LEARNING_CORNER.z1),
  thin(LEARNING_CORNER.x1 - 0.1, LEARNING_CORNER.x1 + 0.1, LEARNING_CORNER.z0, LEARNING_CORNER.z1),
  // hedges along the road edge of the forecourt (the entrance path stays open)
  thin(LEARNING_FORECOURT.x0, -2.4, -50.7, -50.3),
  thin(2.4, LEARNING_FORECOURT.x1, -50.7, -50.3),
  thin(LEARNING_FORECOURT.x0 - 0.2, LEARNING_FORECOURT.x0 + 0.2, LEARNING_CORNER.z1, -50.3),
  thin(LEARNING_FORECOURT.x1 - 0.2, LEARNING_FORECOURT.x1 + 0.2, LEARNING_CORNER.z1, -50.3),
  // "road closed" barriers
  thin(ROAD_X - ROAD_W / 2, ROAD_X + ROAD_W / 2, -WORLD_HALF + 1.3, -WORLD_HALF + 1.5),
  thin(ROAD_X - ROAD_W / 2, ROAD_X + ROAD_W / 2, WORLD_HALF - 1.5, WORLD_HALF - 1.3),
  // the cross roads also end in barriers
  ...ROADS_EW.flatMap((r) => [thin(-WORLD_HALF + 1.3, -WORLD_HALF + 1.5, r.z - ROAD_W / 2, r.z + ROAD_W / 2), thin(WORLD_HALF - 1.5, WORLD_HALF - 1.3, r.z - ROAD_W / 2, r.z + ROAD_W / 2)]),
]
OBSTACLE_RECTS.push(...PROP_RECTS)
/** Height of the player's feet above the ground (set by Player while jumping) so low obstacles can be hopped over */
export const airborne = { h: 0 }
/** Obstacle heights for things low enough to jump over (everything else is too tall) */
const LOW_HEIGHT = new Map<object, number>()
for (const r of PROP_RECTS) LOW_HEIGHT.set(r, 0.55)
const lowCircle = <T extends object>(c: T, h: number): T => (LOW_HEIGHT.set(c, h), c)
OBSTACLE_RECTS.push(...STORE_WALLS)

export const OBSTACLE_CIRCLES: Circle[] = [
  ...LAMPS.map(([x, z]) => ({ x, z, r: 0.3 })),
  ...BENCHES.flatMap(([x, z, r]) => [
    lowCircle({ x: x + Math.cos(r) * 0.7, z: z - Math.sin(r) * 0.7, r: 0.5 }, 0.5),
    lowCircle({ x: x - Math.cos(r) * 0.7, z: z + Math.sin(r) * 0.7, r: 0.5 }, 0.5),
  ]),
  ...SIGNPOSTS.map((sp) => ({ x: sp.x, z: sp.z, r: 0.35 })),
  ...TAPS.map((t) => lowCircle({ x: t.x, z: t.z, r: 0.3 }, 0.5)),
  ...HEAPS.map((h) => ({ x: h.x, z: h.z, r: 1.2 })),
  { x: 40.7, z: 13, r: 1.2 }, // silo
  { x: 51.5, z: -6, r: 1.1 }, // lifeguard tower
  ...([[50, -14], [52, 9], [49.5, 20], [53, -2.5]] as XZ[]).map(([x, z]) => ({ x, z, r: 0.3 })), // umbrellas
  { x: 52.5, z: 17, r: 0.9 }, // sandcastle
  { x: LEARNING_BOARD[0], z: LEARNING_BOARD[1], r: 0.5 },
  { x: HEART_POS[0], z: HEART_POS[1], r: 0.9 },
  // entrance arch pillars
  ...[-2.1, 2.1].map((x) => ({ x, z: LEARNING_ARCH_Z, r: 0.45 })),
  { x: POND.x, z: POND.z, r: POND.r + 0.8 },
  { x: EWASTE_BIN[0], z: EWASTE_BIN[1], r: 0.5 },
  ...TREES.map(([x, z, s]) => ({ x, z, r: 0.9 * s })),
  ...WIND_TURBINES.map(([x, z]) => ({ x, z, r: 1 })),
  ...BIN_SLOTS.map((b) => ({ x: b.x, z: b.z, r: 0.42 })),
]

/** True if a circle of radius r at (x,z) hits anything solid. If fromX,fromZ are given, stepping away from overlapping obstacles is allowed */
export function collides(x: number, z: number, r = 0.4, fromX?: number, fromZ?: number): boolean {
  if (Math.abs(x) > WORLD_HALF - r || Math.abs(z) > WORLD_HALF - r) return true
  for (const o of OBSTACLE_RECTS) {
    if (airborne.h > (LOW_HEIGHT.get(o) ?? Infinity)) continue
    const cx = Math.max(o.x0, Math.min(x, o.x1))
    const cz = Math.max(o.z0, Math.min(z, o.z1))
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true
  }
  for (const c of OBSTACLE_CIRCLES) if (airborne.h <= (LOW_HEIGHT.get(c) ?? Infinity) && (x - c.x) ** 2 + (z - c.z) ** 2 < (r + c.r) ** 2) return true
  for (const c of dynamicCircles.values()) {
    const d2 = (x - c.x) ** 2 + (z - c.z) ** 2
    const r2 = (r + c.r) ** 2
    if (d2 < r2) {
      if (fromX !== undefined && fromZ !== undefined) {
        const origD2 = (fromX - c.x) ** 2 + (fromZ - c.z) ** 2
        // If stepping away from the center of this obstacle, allow it!
        if (d2 >= origD2) continue
      }
      return true
    }
  }
  return false
}

/** Is this spot on a walkway, a road or a bin pad? (litter never lies there) */
function onWalkway(x: number, z: number, m = 0.7) {
  if (PATHS.some((r) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m)) return true
  if (Math.abs(x - ROAD_X) < ROAD_W / 2 + 1.5) return true
  if (ROADS_EW.some((r) => Math.abs(z - r.z) < ROAD_W / 2 + 1.5)) return true
  return BIN_STATIONS.some((b) => Math.abs(x - b.x) < 2.4 && Math.abs(z - b.z) < 1.6)
}

/** Nudge a spot off the walkways so litter lies on the grass beside them, never blocking the way */
export function offPath(x: number, z: number): [number, number] {
  if (!onWalkway(x, z) && !collides(x, z, 0.3)) return [x, z]
  for (let d = 0.6; d <= 9; d += 0.6) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      const px = x + Math.cos(a) * d
      const pz = z + Math.sin(a) * d
      if (!onWalkway(px, pz) && !collides(px, pz, 0.3)) return [px, pz]
    }
  }
  return [x, z]
}

/** Distance from a point to a rectangle (0 if inside) */
export const distToRect = (x: number, z: number, r: Rect) => {
  const dx = Math.max(r.x0 - x, 0, x - r.x1)
  const dz = Math.max(r.z0 - z, 0, z - r.z1)
  return Math.hypot(dx, dz)
}

/* ------------------------------------------------------------------ */
/* Walkable heights: bridges, pier and decks raise whoever stands on them */
/* ------------------------------------------------------------------ */

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const smooth = (t: number) => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

/** Extra height (above the normal ground) of the walkable surface at (x, z) */
export function groundY(x: number, z: number): number {
  let h = 0
  const ramp = 1.5
  // wooden footbridge (deck top 0.37)
  if (x >= BRIDGE.x0 - 0.2 && x <= BRIDGE.x1 + 0.2) {
    const k = Math.min(smooth((z - (RIVER.z0 - 1 - ramp)) / ramp), smooth((RIVER.z1 + 1 + ramp - z) / ramp))
    h = Math.max(h, 0.31 * k)
  }
  // road bridge (deck top 0.25)
  if (Math.abs(x - ROAD_X) <= ROAD_W / 2 + 0.1) {
    const k = Math.min(smooth((z - (RIVER.z0 - 0.8 - 1.2)) / 1.2), smooth((RIVER.z1 + 0.8 + 1.2 - z) / 1.2))
    h = Math.max(h, 0.19 * k)
  }
  // beach pier (top 0.38)
  if (z >= PIER.z0 - 0.2 && z <= PIER.z1 + 0.2) h = Math.max(h, 0.32 * smooth((x - (PIER.x0 - 1.2)) / 1.2))
  // learning corner deck (top 0.4)
  h = Math.max(h, 0.34 * (1 - smooth(distToRect(x, z, LEARNING_CORNER) / 0.9)))
  // sand sits a little higher than grass
  if (x >= BEACH.x0 && x <= BEACH.x1 && z >= BEACH.z0 && z <= BEACH.z1) h = Math.max(h, 0.03)
  return h
}

/**
 * Where a truck should stand to lift a bin: somewhere fully on the paving close to the bin, pointing along a path,
 * with the bin within the crane's reach on the truck's right-hand side. Returns the hook position in truck units too.
 */
export function findTruckPark(b: { x: number; z: number }, from: { x: number; z: number }, arrive?: number) {
  const S = 0.85
  const inPath = (x: number, z: number) => PATHS.some((r) => x >= r.x0 - 0.3 && x <= r.x1 + 0.3 && z >= r.z0 - 0.3 && z <= r.z1 + 0.3)
  let best: { x: number; z: number; heading: number; lx: number; lz: number; score: number } | null = null
  const headings = arrive === undefined ? [0, Math.PI / 2, Math.PI, -Math.PI / 2] : [arrive]
  for (const heading of headings) {
    const c = Math.cos(heading)
    const s = Math.sin(heading)
    for (let dx = -12; dx <= 12; dx += 0.5) {
      for (let dz = -12; dz <= 12; dz += 0.5) {
        const x = b.x + dx
        const z = b.z + dz
        // the truck's footprint (3.6 long, 1.4 wide) must be on paving
        let ok = true
        for (const [l, w] of [[-1.8, -0.7], [-1.8, 0.7], [1.8, -0.7], [1.8, 0.7], [0, 0]] as [number, number][]) {
          if (!inPath(x + s * l + c * w, z + c * l - s * w)) {
            ok = false
            break
          }
        }
        if (!ok) continue
        if (arrive !== undefined) {
          // drive straight on from where we stopped: forward only, hardly any sideways shift
          const fx = x - from.x
          const fz = z - from.z
          const fwd = fx * s + fz * c
          const lat = fx * c - fz * s
          if (fwd < -7 || fwd > 12 || Math.abs(lat) > 1.2) continue
        }
        const ox = b.x - x
        const oz = b.z - z
        const lx = (ox * c - oz * s) / S
        const lz = (ox * s + oz * c) / S
        if (arrive === undefined ? lx < 2.0 || lx > 4.3 || lz < -1.7 || lz > 1.2 : Math.abs(lx) < 1.9 || Math.abs(lx) > 4.6 || lz < -1.7 || lz > 1.2) continue
        const score = Math.hypot(x - from.x, z - from.z) + Math.abs(lx - 2.85) * 0.6 + Math.abs(lz + 0.4) * 0.6
        if (!best || score < best.score) best = { x, z, heading, lx, lz, score }
      }
    }
  }
  return best
}
