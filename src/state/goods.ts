/** Things sold at the store's counter 2 (electronics & parts) and counter 3 (books & cool stuff) */
export interface Good {
  id: string
  counter: 2 | 3
  name: string
  icon: string
  price: number
  blurb: string
  /** how many carrying slots it takes */
  size: number
  /** can be wired into a gadget on the workbench */
  part?: 'power' | 'light' | 'brain' | 'sensor' | 'motor' | 'sound' | 'wire'
}

export const GOODS: Good[] = [
  // counter 2: mechanical goods
  { id: 'wire', counter: 2, name: 'Copper wire coil', icon: '🧵', price: 3, blurb: 'Joins parts so electricity can flow.', size: 1, part: 'wire' },
  { id: 'led', counter: 2, name: 'LED bulb', icon: '💡', price: 6, blurb: 'Glows using very little energy.', size: 1, part: 'light' },
  { id: 'battery', counter: 2, name: 'Battery pack', icon: '🔋', price: 10, blurb: 'Stores power for your gadgets.', size: 1, part: 'power' },
  { id: 'solar', counter: 2, name: 'Solar panel', icon: '☀️', price: 25, blurb: 'Turns sunshine into clean power.', size: 2, part: 'power' },
  { id: 'pcb', counter: 2, name: 'PCB board', icon: '🟩', price: 18, blurb: 'A printed circuit board to build on.', size: 1, part: 'brain' },
  { id: 'micro', counter: 2, name: 'Micro-controller', icon: '🧠', price: 35, blurb: 'The tiny brain you can write code for.', size: 1, part: 'brain' },
  { id: 'ldr', counter: 2, name: 'Light sensor', icon: '🌗', price: 12, blurb: 'Knows when it is dark or bright.', size: 1, part: 'sensor' },
  { id: 'pir', counter: 2, name: 'Motion sensor', icon: '📡', price: 14, blurb: 'Notices when someone walks by.', size: 1, part: 'sensor' },
  { id: 'motor', counter: 2, name: 'Mini motor', icon: '⚙️', price: 15, blurb: 'Spins! Turns panels, fans and wheels.', size: 1, part: 'motor' },
  { id: 'servo', counter: 2, name: 'Servo arm', icon: '🦾', price: 20, blurb: 'Moves to an exact angle.', size: 1, part: 'motor' },
  { id: 'buzzer', counter: 2, name: 'Buzzer', icon: '🔔', price: 8, blurb: 'Beeps when your code tells it to.', size: 1, part: 'sound' },
  { id: 'resistor', counter: 2, name: 'Resistor pack', icon: '🟫', price: 4, blurb: 'Limits the current so LEDs do not burn out.', size: 1 },
  { id: 'button', counter: 2, name: 'Push button', icon: '🔘', price: 5, blurb: 'Opens and closes a circuit when pressed.', size: 1 },
  { id: 'breadboard', counter: 2, name: 'Breadboard', icon: '🔲', price: 12, blurb: 'Build circuits with no soldering.', size: 2 },
  // counter 3: books and other cool stuff
  { id: 'book-code', counter: 3, name: 'Coding handbook', icon: '📘', price: 12, blurb: 'Loops, ifs and functions made easy.', size: 1 },
  { id: 'book-eco', counter: 3, name: 'Eco heroes book', icon: '📗', price: 10, blurb: 'Stories of people who saved the planet.', size: 1 },
  { id: 'book-space', counter: 3, name: 'Space atlas', icon: '📕', price: 14, blurb: 'Planets, stars and rockets.', size: 1 },
  { id: 'notebook', counter: 3, name: 'Sketch notebook', icon: '📓', price: 5, blurb: 'Draw your ideas before you build them.', size: 1 },
  { id: 'telescope', counter: 3, name: 'Pocket telescope', icon: '🔭', price: 40, blurb: 'See the moon up close.', size: 2 },
  { id: 'compass', counter: 3, name: 'Explorer compass', icon: '🧭', price: 8, blurb: 'Always points north.', size: 1 },
  { id: 'seeds', counter: 3, name: 'Seed packet', icon: '🌱', price: 4, blurb: 'Grow something green.', size: 1 },
  { id: 'robot', counter: 3, name: 'Toy robot', icon: '🤖', price: 30, blurb: 'Beep boop! A friend for your desk.', size: 2 },
  { id: 'puzzle', counter: 3, name: 'Puzzle cube', icon: '🧩', price: 9, blurb: 'Twist it until it clicks.', size: 1 },
  { id: 'trophy', counter: 3, name: 'Mini trophy', icon: '🏆', price: 45, blurb: 'Because you are a champion.', size: 2 },
  { id: 'stickers', counter: 3, name: 'Sticker pack', icon: '⭐', price: 3, blurb: 'Decorate everything.', size: 1 },
  { id: 'globe', counter: 3, name: 'Little globe', icon: '🌍', price: 22, blurb: 'The whole world in your hands.', size: 2 },
]
export const GOOD_BY_ID: Record<string, Good> = Object.fromEntries(GOODS.map((g) => [g.id, g]))

export const usedSlots = (inv: Record<string, number>) => Object.entries(inv).reduce((a, [id, n]) => a + (GOOD_BY_ID[id]?.size ?? 1) * n, 0)


/** pick owned goods that satisfy a project's needs (one entry per unit), or null if something is missing */
export function pickMaterials(needs: { ids: string[]; qty?: number }[], inv: Record<string, number>): string[] | null {
  const left = { ...inv }
  const out: string[] = []
  for (const n of needs) {
    for (let k = 0; k < (n.qty ?? 1); k++) {
      const id = n.ids.find((i) => (left[i] ?? 0) > 0)
      if (!id) return null
      left[id]--
      out.push(id)
    }
  }
  return out
}
