/** Maker projects: students gather parts, wire the circuit themselves, write the code, pass the tests, then build. */
export type Cond = 'any' | 'dark' | 'bright' | 'near' | 'still' | 'timer'
export type Act = 'on' | 'off' | 'blink' | 'turn' | 'beep' | 'spin'
export interface Rule {
  when: Cond
  and: Cond | 'none'
  then: Act
}
export interface Program {
  rules: Rule[]
  every: number
}
export interface Scenario {
  dark: boolean
  near: boolean
  timer: boolean
}

export const COND_LABEL: Record<Cond, string> = { any: 'always', dark: 'it is dark', bright: 'it is bright', near: 'someone is close', still: 'nobody is close', timer: 'the timer ticks' }
export const ACT_LABEL: Record<Act, string> = { on: 'turn the light ON', off: 'switch everything OFF', blink: 'BLINK', turn: 'TURN toward the sun', beep: 'BEEP the buzzer', spin: 'SPIN the fan' }

const holds = (c: Cond | 'none', s: Scenario) => (c === 'none' || c === 'any' ? true : c === 'dark' ? s.dark : c === 'bright' ? !s.dark : c === 'near' ? s.near : c === 'still' ? !s.near : s.timer)
/** the first rule whose conditions hold wins; if none does, everything stays off */
export function evalRules(p: Program, s: Scenario): Act {
  for (const r of p.rules) if (holds(r.when, s) && holds(r.and, s)) return r.then
  return 'off'
}

export interface CircuitPart {
  id: string
  name: string
  icon: string
  x: number
  y: number
  /** terminals on the left and right edge */
  l?: string[]
  r?: string[]
}
export interface Need {
  ids: string[]
  label: string
  qty?: number
}
export interface Test {
  say: string
  s: Scenario
  expect: Act
}
export interface ProjectDef {
  id: string
  name: string
  icon: string
  level: 1 | 2 | 3
  /** what it looks like in the Maker Yard */
  body: 'lamp' | 'tracker' | 'alarm' | 'fan'
  goal: string
  concept: string
  hints: string[]
  needs: Need[]
  parts: CircuitPart[]
  /** pairs of "part.terminal" that must be joined */
  links: [string, string][]
  /** what you may use in your code (none = wiring only) */
  acts?: Act[]
  conds?: Cond[]
  tests?: Test[]
  fixed?: Program
  fact: string
}

const P = (rules: Rule[], every = 2): Program => ({ rules, every })
const T = (dark: boolean, near: boolean, timer = true): Scenario => ({ dark, near, timer })

export const PROJECTS: ProjectDef[] = [
  {
    id: 'first-circuit',
    name: 'First Circuit',
    icon: '🔦',
    level: 1,
    body: 'lamp',
    goal: 'Make an LED glow with a battery. Electricity needs a complete loop to flow.',
    concept: 'A circuit is a loop: current leaves the battery’s + side, goes through the parts, and returns to the − side. A resistor keeps the LED from getting too much current.',
    hints: ['Start at the battery + and follow the path the current takes.', 'The LED only works one way round: its + terminal faces the battery +.', 'The loop must end at the battery −.'],
    needs: [{ ids: ['led'], label: 'LED bulb' }, { ids: ['battery'], label: 'Battery pack' }, { ids: ['resistor'], label: 'Resistor' }, { ids: ['wire'], label: 'Copper wire' }],
    parts: [
      { id: 'bat', name: 'Battery', icon: '🔋', x: 20, y: 90, r: ['+', '−'] },
      { id: 'res', name: 'Resistor', icon: '🟫', x: 230, y: 20, l: ['a'], r: ['b'] },
      { id: 'led', name: 'LED', icon: '💡', x: 420, y: 100, l: ['+', '−'] },
    ],
    links: [['bat.+', 'res.a'], ['res.b', 'led.+'], ['led.−', 'bat.−']],
    fixed: P([{ when: 'any', and: 'none', then: 'on' }]),
    fact: 'The first practical light bulb lasted about 13 hours. A modern LED can shine for over 20 years, using about 85% less energy.',
  },
  {
    id: 'switch-lamp',
    name: 'Switch Lamp',
    icon: '🔘',
    level: 1,
    body: 'lamp',
    goal: 'Add a push-button so the lamp only shines when the circuit is closed.',
    concept: 'A switch opens or closes a gap in the loop. Press = loop closed = current flows. In the yard, a person standing close acts as the press.',
    hints: ['The button goes in the same loop, in line with the other parts.', 'Put the resistor between the button and the LED.', 'Every part has two ends: one end in, one end out.'],
    needs: [{ ids: ['led'], label: 'LED bulb' }, { ids: ['battery'], label: 'Battery pack' }, { ids: ['resistor'], label: 'Resistor' }, { ids: ['button'], label: 'Push button' }, { ids: ['wire'], label: 'Copper wire' }],
    parts: [
      { id: 'bat', name: 'Battery', icon: '🔋', x: 10, y: 100, r: ['+', '−'] },
      { id: 'btn', name: 'Button', icon: '🔘', x: 170, y: 10, l: ['a'], r: ['b'] },
      { id: 'res', name: 'Resistor', icon: '🟫', x: 340, y: 10, l: ['a'], r: ['b'] },
      { id: 'led', name: 'LED', icon: '💡', x: 380, y: 130, l: ['+', '−'] },
    ],
    links: [['bat.+', 'btn.a'], ['btn.b', 'res.a'], ['res.b', 'led.+'], ['led.−', 'bat.−']],
    fixed: P([{ when: 'near', and: 'none', then: 'on' }]),
    fact: 'Every light switch in your house works the same way: it just opens or closes a gap in the wire.',
  },
  {
    id: 'eco-fan',
    name: 'Solar Eco Fan',
    icon: '🌀',
    level: 1,
    body: 'fan',
    goal: 'Power a motor straight from a solar panel, with no battery at all.',
    concept: 'A solar panel makes electricity from light. Wire it to a motor and the fan spins faster the brighter it is, with zero pollution.',
    hints: ['Two parts, two wires.', 'Each part has a + and a − side: match them up.'],
    needs: [{ ids: ['solar'], label: 'Solar panel' }, { ids: ['motor', 'servo'], label: 'Motor' }, { ids: ['wire'], label: 'Copper wire' }],
    parts: [
      { id: 'sol', name: 'Solar panel', icon: '☀️', x: 40, y: 90, r: ['+', '−'] },
      { id: 'mot', name: 'Motor', icon: '⚙️', x: 360, y: 90, l: ['+', '−'] },
    ],
    links: [['sol.+', 'mot.+'], ['sol.−', 'mot.−']],
    fixed: P([{ when: 'bright', and: 'none', then: 'spin' }]),
    fact: 'In one hour the sunlight hitting Earth carries more energy than all of humanity uses in a whole year.',
  },
  {
    id: 'smart-lamp',
    name: 'Smart Street Lamp',
    icon: '💡',
    level: 2,
    body: 'lamp',
    goal: 'A lamp that switches itself on when it gets dark and off in the daytime.',
    concept: 'A sensor feeds a number to the micro-controller. Your code decides what the output pin does. This is how real street lights save energy.',
    hints: ['The sensor’s signal wire goes to the controller’s IN pin.', 'The controller’s OUT pin drives the LED.', 'In code: think about what the lamp should do in the day, too.'],
    needs: [{ ids: ['led'], label: 'LED bulb' }, { ids: ['battery', 'solar'], label: 'Battery or solar panel' }, { ids: ['micro', 'pcb'], label: 'Micro-controller or PCB' }, { ids: ['ldr'], label: 'Light sensor' }, { ids: ['wire'], label: 'Copper wire' }],
    parts: [
      { id: 'bat', name: 'Power', icon: '🔋', x: 10, y: 20, r: ['+', '−'] },
      { id: 'ldr', name: 'Light sensor', icon: '🌗', x: 10, y: 150, r: ['out'] },
      { id: 'mcu', name: 'Micro-controller', icon: '🧠', x: 210, y: 60, l: ['V+', 'GND', 'IN'], r: ['OUT'] },
      { id: 'led', name: 'LED', icon: '💡', x: 400, y: 110, l: ['+', '−'] },
    ],
    links: [['bat.+', 'mcu.V+'], ['bat.−', 'mcu.GND'], ['ldr.out', 'mcu.IN'], ['mcu.OUT', 'led.+'], ['led.−', 'bat.−']],
    acts: ['on', 'off', 'blink'],
    conds: ['dark', 'bright', 'any'],
    tests: [
      { say: 'Night, nobody around', s: T(true, false), expect: 'on' },
      { say: 'Daytime', s: T(false, false), expect: 'off' },
      { say: 'Night, someone walking by', s: T(true, true), expect: 'on' },
    ],
    fact: 'Smart street lights that dim or switch off when nobody is near can cut a city’s lighting bill by more than half.',
  },
  {
    id: 'motion-light',
    name: 'Motion Night Light',
    icon: '🕵️',
    level: 2,
    body: 'lamp',
    goal: 'Light up only when it is dark AND someone is close. Save energy the rest of the time.',
    concept: 'Rules can combine two conditions with AND. The first rule that matches wins, so order matters.',
    hints: ['Use the “and” box to add a second condition.', 'What should happen in daylight even if someone is near?', 'Your lamp must switch OFF when nobody is close.'],
    needs: [{ ids: ['led'], label: 'LED bulb' }, { ids: ['battery', 'solar'], label: 'Battery or solar panel' }, { ids: ['micro', 'pcb'], label: 'Micro-controller or PCB' }, { ids: ['pir'], label: 'Motion sensor' }, { ids: ['wire'], label: 'Copper wire' }],
    parts: [
      { id: 'bat', name: 'Power', icon: '🔋', x: 10, y: 20, r: ['+', '−'] },
      { id: 'pir', name: 'Motion sensor', icon: '📡', x: 10, y: 150, r: ['out'] },
      { id: 'mcu', name: 'Micro-controller', icon: '🧠', x: 210, y: 60, l: ['V+', 'GND', 'IN'], r: ['OUT'] },
      { id: 'led', name: 'LED', icon: '💡', x: 400, y: 110, l: ['+', '−'] },
    ],
    links: [['bat.+', 'mcu.V+'], ['bat.−', 'mcu.GND'], ['pir.out', 'mcu.IN'], ['mcu.OUT', 'led.+'], ['led.−', 'bat.−']],
    acts: ['on', 'off', 'blink'],
    conds: ['dark', 'bright', 'near', 'still', 'any'],
    tests: [
      { say: 'Night, someone walks by', s: T(true, true), expect: 'on' },
      { say: 'Night, nobody around', s: T(true, false), expect: 'off' },
      { say: 'Daytime, someone walks by', s: T(false, true), expect: 'off' },
    ],
    fact: 'Motion lights use a PIR sensor that detects the heat from moving bodies, not light.',
  },
  {
    id: 'solar-tracker',
    name: 'Solar Tracker',
    icon: '🔆',
    level: 2,
    body: 'tracker',
    goal: 'Turn a solar panel to follow the sun during the day, and rest at night.',
    concept: 'A panel that faces the sun makes up to 40% more power. A motor, a light sensor and a few lines of code can do the aiming.',
    hints: ['The motor is an output: it hangs off the controller’s OUT pin.', 'Powered by one supply, shared with the controller.', 'At night there is nothing to follow: what should the motor do?'],
    needs: [{ ids: ['motor', 'servo'], label: 'Motor or servo' }, { ids: ['battery', 'solar'], label: 'Battery or solar panel' }, { ids: ['micro', 'pcb'], label: 'Micro-controller or PCB' }, { ids: ['ldr'], label: 'Light sensor' }, { ids: ['wire'], label: 'Copper wire' }],
    parts: [
      { id: 'bat', name: 'Power', icon: '🔋', x: 10, y: 20, r: ['+', '−'] },
      { id: 'ldr', name: 'Light sensor', icon: '🌗', x: 10, y: 150, r: ['out'] },
      { id: 'mcu', name: 'Micro-controller', icon: '🧠', x: 210, y: 60, l: ['V+', 'GND', 'IN'], r: ['OUT'] },
      { id: 'mot', name: 'Motor', icon: '⚙️', x: 400, y: 110, l: ['+', '−'] },
    ],
    links: [['bat.+', 'mcu.V+'], ['bat.−', 'mcu.GND'], ['ldr.out', 'mcu.IN'], ['mcu.OUT', 'mot.+'], ['mot.−', 'bat.−']],
    acts: ['turn', 'off'],
    conds: ['dark', 'bright', 'any'],
    tests: [
      { say: 'Sunny day', s: T(false, false), expect: 'turn' },
      { say: 'Night', s: T(true, false), expect: 'off' },
    ],
    fact: 'Big solar farms use trackers like this one: a moving panel can collect up to 40% more energy than a fixed one.',
  },
  {
    id: 'door-alarm',
    name: 'Door Alarm',
    icon: '🚨',
    level: 3,
    body: 'alarm',
    goal: 'Beep when someone comes close in the daytime, but flash silently at night so the neighbours can sleep.',
    concept: 'Real programs have several rules and handle different situations. Test every case you can think of.',
    hints: ['You need three rules: day + close, night + close, and a final “nobody close” rule.', 'Rule order matters: the first one that matches decides.', 'Silent = blink without the buzzer.'],
    needs: [{ ids: ['buzzer'], label: 'Buzzer' }, { ids: ['battery', 'solar'], label: 'Battery or solar panel' }, { ids: ['micro', 'pcb'], label: 'Micro-controller or PCB' }, { ids: ['pir'], label: 'Motion sensor' }, { ids: ['wire'], label: 'Copper wire' }],
    parts: [
      { id: 'bat', name: 'Power', icon: '🔋', x: 10, y: 20, r: ['+', '−'] },
      { id: 'pir', name: 'Motion sensor', icon: '📡', x: 10, y: 150, r: ['out'] },
      { id: 'mcu', name: 'Micro-controller', icon: '🧠', x: 210, y: 60, l: ['V+', 'GND', 'IN'], r: ['OUT'] },
      { id: 'buz', name: 'Buzzer', icon: '🔔', x: 400, y: 110, l: ['+', '−'] },
    ],
    links: [['bat.+', 'mcu.V+'], ['bat.−', 'mcu.GND'], ['pir.out', 'mcu.IN'], ['mcu.OUT', 'buz.+'], ['buz.−', 'bat.−']],
    acts: ['beep', 'blink', 'off'],
    conds: ['dark', 'bright', 'near', 'still', 'any'],
    tests: [
      { say: 'Day, someone comes close', s: T(false, true), expect: 'beep' },
      { say: 'Night, someone comes close', s: T(true, true), expect: 'blink' },
      { say: 'Nobody around', s: T(false, false), expect: 'off' },
      { say: 'Night, nobody around', s: T(true, false), expect: 'off' },
    ],
    fact: 'Burglar alarms use the same idea: sensors, a controller and rules for different situations.',
  },
  {
    id: 'party-lights',
    name: 'Party Lights',
    icon: '🎉',
    level: 3,
    body: 'lamp',
    goal: 'Blink on the timer, but only after dark. Stay off in the daytime to save power.',
    concept: 'The timer ticks every few seconds. Combine it with another condition to decide when blinking is allowed.',
    hints: ['Two LEDs share one OUT pin and the same ground.', 'Use “the timer ticks” together with “it is dark”.', 'What should the lights do when the timer is not ticking?'],
    needs: [{ ids: ['led'], label: 'LED bulb', qty: 2 }, { ids: ['battery', 'solar'], label: 'Battery or solar panel' }, { ids: ['micro', 'pcb'], label: 'Micro-controller or PCB' }, { ids: ['wire'], label: 'Copper wire' }],
    parts: [
      { id: 'bat', name: 'Power', icon: '🔋', x: 10, y: 80, r: ['+', '−'] },
      { id: 'mcu', name: 'Micro-controller', icon: '🧠', x: 210, y: 60, l: ['V+', 'GND'], r: ['OUT'] },
      { id: 'l1', name: 'LED 1', icon: '💡', x: 400, y: 10, l: ['+', '−'] },
      { id: 'l2', name: 'LED 2', icon: '💡', x: 400, y: 150, l: ['+', '−'] },
    ],
    links: [['bat.+', 'mcu.V+'], ['bat.−', 'mcu.GND'], ['mcu.OUT', 'l1.+'], ['mcu.OUT', 'l2.+'], ['l1.−', 'bat.−'], ['l2.−', 'bat.−']],
    acts: ['blink', 'on', 'off'],
    conds: ['dark', 'bright', 'timer', 'any'],
    tests: [
      { say: 'Night, timer ticking', s: T(true, false, true), expect: 'blink' },
      { say: 'Night, timer quiet', s: T(true, false, false), expect: 'off' },
      { say: 'Daytime, timer ticking', s: T(false, false, true), expect: 'off' },
    ],
    fact: 'LED strips in theatres and concerts are run by controllers that follow timed programs just like this.',
  },
]
export const PROJECT_BY_ID: Record<string, ProjectDef> = Object.fromEntries(PROJECTS.map((p) => [p.id, p]))

export const linkKey = (a: string, b: string) => [a, b].sort().join('~')

/** run every test against a program */
export function runTests(def: ProjectDef, prog: Program) {
  return (def.tests ?? []).map((t) => ({ test: t, got: evalRules(prog, t.s), ok: evalRules(prog, t.s) === t.expect }))
}

export interface Built {
  id: string
  def: string
  /** the pad number it stands on in the Maker Yard (null = in the projects shelf) */
  pad: number | null
  prog: Program
}
