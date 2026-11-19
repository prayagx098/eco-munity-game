/**
 * Lesson content: litter types, bins, tasks, social dilemmas,
 * villager lines, chat phrases and badges.
 * Teachers can edit this file to change the lesson without touching game logic.
 */
import type { BinKind } from './world'

export type { BinKind }
export type Material = 'plastic' | 'paper' | 'metal' | 'food' | 'garden' | 'mixed'
export type TrashShape = 'bottle' | 'can' | 'paper' | 'peel' | 'apple' | 'bag' | 'leaf' | 'box' | 'cup' | 'jug'

export interface TrashType {
  id: string
  label: string
  emoji: string
  bin: BinKind
  material: Material
  shape: TrashShape
  color: string
  tip: string
}

export const TRASH_TYPES: TrashType[] = [
  { id: 'bottle', label: 'Plastic bottle', emoji: '🧴', bin: 'recycle', material: 'plastic', shape: 'bottle', color: '#5ec8f2', tip: 'Plastic bottles can be recycled into new bottles, toys or even T-shirts!' },
  { id: 'jug', label: 'Plastic milk jug', emoji: '🥛', bin: 'recycle', material: 'plastic', shape: 'jug', color: '#f4f7fb', tip: 'Give plastic jugs a quick rinse, then recycle them.' },
  { id: 'can', label: 'Soda can', emoji: '🥫', bin: 'recycle', material: 'metal', shape: 'can', color: '#e8505b', tip: 'Aluminium cans can be recycled again and again, forever!' },
  { id: 'newspaper', label: 'Newspaper', emoji: '📰', bin: 'recycle', material: 'paper', shape: 'paper', color: '#e9e4d4', tip: 'Recycling paper saves trees, water and energy.' },
  { id: 'cardboard', label: 'Cardboard box', emoji: '📦', bin: 'recycle', material: 'paper', shape: 'box', color: '#c8935a', tip: 'Flatten boxes so more fit in the recycling bin.' },
  { id: 'banana', label: 'Banana peel', emoji: '🍌', bin: 'compost', material: 'food', shape: 'peel', color: '#f5d042', tip: 'Banana peels turn into rich soil that helps gardens grow.' },
  { id: 'apple', label: 'Apple core', emoji: '🍎', bin: 'compost', material: 'food', shape: 'apple', color: '#e23b3b', tip: 'Fruit scraps are perfect for compost. Worms love them!' },
  { id: 'leaves', label: 'Dry leaves', emoji: '🍂', bin: 'compost', material: 'garden', shape: 'leaf', color: '#d9822b', tip: 'Leaves keep compost healthy and fluffy.' },
  { id: 'wrapper', label: 'Snack wrapper', emoji: '🍬', bin: 'trash', material: 'mixed', shape: 'bag', color: '#a259ff', tip: 'Shiny wrappers are made of mixed layers, so they can’t be recycled.' },
  { id: 'tissue', label: 'Used tissue', emoji: '🤧', bin: 'trash', material: 'mixed', shape: 'paper', color: '#ffffff', tip: 'Used tissues are dirty, so they go in the general trash.' },
  { id: 'cup', label: 'Takeaway cup', emoji: '☕', bin: 'trash', material: 'mixed', shape: 'cup', color: '#f2efe9', tip: 'Most takeaway cups have a plastic lining. A reusable cup is even better!' },
]

export const TRASH_BY_ID: Record<string, TrashType> = Object.fromEntries(TRASH_TYPES.map((t) => [t.id, t]))

export interface BinDef {
  kind: BinKind
  label: string
  emoji: string
  color: string
  dark: string
  holds: string
}

export const BIN_DEFS: Record<BinKind, BinDef> = {
  compost: { kind: 'compost', label: 'Compost', emoji: '🌱', color: '#f7c531', dark: '#d9a514', holds: 'food & leaves' },
  recycle: { kind: 'recycle', label: 'Recycle', emoji: '♻️', color: '#27ae4f', dark: '#1d8a3d', holds: 'plastic, paper, cans' },
  trash: { kind: 'trash', label: 'Trash', emoji: '🗑️', color: '#1f6fd6', dark: '#1658ad', holds: 'everything else' },
}
export const BIN_LIST = Object.values(BIN_DEFS)

/* ------------------------------------------------------------------ */
/* Tasks                                                                */
/* ------------------------------------------------------------------ */

export type TaskKind =
  | 'sort-plastic'
  | 'sort-paper'
  | 'sort-metal'
  | 'compost'
  | 'trash-correct'
  | 'sort-any'
  | 'plant-tree'
  | 'water-garden'
  | 'lights-off'
  | 'fix-tap'
  | 'look'
  | 'turn-compost'
  | 'pond-clean'
  | 'chat'
  | 'collect-coins'
  | 'kind-words'
  | 'explore'

export interface TaskDef {
  id: string
  kind: TaskKind
  label: string
  emoji: string
  target: number
}

export const TASK_ROUNDS: TaskDef[][] = [
  [
    { id: 'r1-plastic', kind: 'sort-plastic', label: 'Sort the plastic', emoji: '🧴', target: 3 },
    { id: 'r1-tree', kind: 'plant-tree', label: 'Plant a tree in the Pine Forest', emoji: '🌳', target: 2 },
    { id: 'r1-water', kind: 'water-garden', label: 'Water the garden', emoji: '💧', target: 2 },
    { id: 'r1-sort', kind: 'sort-any', label: 'Sort 4 items right', emoji: '♻️', target: 4 },
    { id: 'r1-look', kind: 'look', label: 'Learn a fact at the Learning Corner', emoji: '💡', target: 1 },
  ],
  [
    { id: 'r2-pond', kind: 'pond-clean', label: 'Clean the duck pond', emoji: '🦆', target: 3 },
    { id: 'r2-lights', kind: 'lights-off', label: 'Switch off wasted lights', emoji: '💡', target: 2 },
    { id: 'r2-tap', kind: 'fix-tap', label: 'Fix leaking taps', emoji: '🚰', target: 2 },
    { id: 'r2-compost', kind: 'compost', label: 'Compost food scraps', emoji: '🍎', target: 3 },
    { id: 'r2-explore', kind: 'explore', label: 'Explore town zones', emoji: '🧭', target: 7 },
  ],
  [
    { id: 'r3-sort', kind: 'sort-any', label: 'Sort anything right', emoji: '♻️', target: 6 },
    { id: 'r3-water', kind: 'water-garden', label: 'Water the garden', emoji: '💧', target: 3 },
    { id: 'r3-tree', kind: 'plant-tree', label: 'Plant trees in the Pine Forest', emoji: '🌳', target: 3 },
    { id: 'r3-tap', kind: 'fix-tap', label: 'Fix leaking taps', emoji: '🚰', target: 3 },
    { id: 'r3-look', kind: 'look', label: 'Learn new facts at the Learning Corner', emoji: '💡', target: 2 },
  ],
  [
    { id: 'r4-any', kind: 'sort-any', label: 'Sort anything right', emoji: '✨', target: 12 },
    { id: 'r4-tree', kind: 'plant-tree', label: 'Plant trees in the Pine Forest', emoji: '🌳', target: 3 },
    { id: 'r4-compost', kind: 'turn-compost', label: 'Turn the compost heaps', emoji: '🪱', target: 3 },
    { id: 'r4-lights', kind: 'lights-off', label: 'Switch off wasted lights', emoji: '💡', target: 3 },
    { id: 'r4-look', kind: 'look', label: 'Learn new facts at the Learning Corner', emoji: '💡', target: 2 },
    { id: 'r4-explore', kind: 'explore', label: 'Explore every zone', emoji: '🧭', target: 15 },
  ],
]

/** Avatar creator choices */
export const SHIRT_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f8fafc']
export const HAIR_COLORS = ['#7c3f12', '#111827', '#b45309', '#fde68a', '#dc2626', '#6b7280']
export const PANTS_COLORS = ['#1e3a8a', '#334155', '#78350f', '#065f46']

/* ------------------------------------------------------------------ */
/* Villagers you can talk to                                            */
/* ------------------------------------------------------------------ */

export const VILLAGER_LINES: Record<string, string[]> = {
  default: [
    'Did you know? One recycled can saves enough energy to run a TV for 3 hours! 📺',
    'I love walking to work. No car fumes! 🚶',
    'Turning off the tap while brushing your teeth saves lots of water 💧',
    'Our town feels so much nicer when everyone helps out 😊',
    'I always bring my own bag to the shop 🛍️',
    'Trees give us shade, fresh air and homes for birds 🐦',
  ],
  sad: ['I feel sad when I see litter everywhere 😞', 'The town looks a bit messy today… could you help? 🗑️', 'I wish more people cared about our park 😟'],
  'farmer-joy': [
    'Compost from the yellow bins feeds my veggies! 🥕',
    'Thirsty plants droop. Look for the 💧 in the Community Garden!',
    'My chickens love scraps, but plastic is dangerous for them 🐔',
  ],
  'ms-ada': [
    'Welcome to CYBERSQUARE! Here we learn the 3 Rs: Reduce, Reuse, Recycle ♻️',
    'Being kind is like a superpower. Try saying something nice to a friend today 💚',
    'Fun fact: Glass can be recycled forever without losing quality!',
  ],
  'lifeguard-lee': [
    'Plastic bags look like jellyfish to sea turtles 🐢 Please never leave them on the beach!',
    'Always take your rubbish home from the beach, or use the bins 🏖️',
    'Rivers carry litter to the sea. Every bin you use helps the ocean 🌊',
    'Sunscreen is important, and a reusable water bottle is even better ☀️',
  ],
  'ranger-sam': [
    'Litter in the pond can hurt ducks and fish. Can you fish some out? 🦆',
    'Plastic in rivers flows all the way to the ocean 🌊',
    'The Pine Forest is home to squirrels and owls. Let’s keep it clean! 🌲',
  ],
}

/** Quick questions at the Learning Corner's chalkboard: a right answer earns coins */
export interface QuizQ {
  q: string
  options: string[]
  answer: number
  fact: string
}
export const QUIZ: QuizQ[] = [
  { q: 'What does electricity need to flow through a circuit?', options: ['A complete loop', 'A broken wire', 'Only a battery'], answer: 0, fact: 'A circuit is a loop 🔌 Electricity only flows when the loop is complete.' },
  { q: 'What do computers do with code?', options: ['Guess what you mean', 'Do exactly what it says', 'Ignore mistakes'], answer: 1, fact: 'Code is a list of instructions 💻 Computers do exactly what you tell them, so test your rules!' },
  { q: 'Which uses less energy for the same light?', options: ['An old bulb', 'An LED', 'A candle'], answer: 1, fact: 'An LED uses about 85% less energy than an old bulb 💡' },
  { q: 'What do plants use to make their food?', options: ['Sunlight', 'Moonlight', 'Plastic'], answer: 0, fact: 'Plants make food from sunlight 🌱 This is called photosynthesis.' },
  { q: 'What does a solar panel turn into electricity?', options: ['Wind', 'Water', 'Sunlight'], answer: 2, fact: 'A solar panel turns sunlight into electricity ☀️ No smoke, no noise.' },
  { q: 'What is a bug in a program?', options: ['A mistake in the code', 'A tiny robot', 'A fast computer'], answer: 0, fact: 'Bugs are mistakes in code 🐞 Finding and fixing them is called debugging.' },
  { q: 'What makes a wind turbine produce more power?', options: ['Faster wind', 'More clouds', 'Less light'], answer: 0, fact: 'Wind turbines turn moving air into power 🌬️ Faster wind, more energy.' },
  { q: 'Where should an old battery or circuit board go?', options: ['The normal bin', 'The e-waste bin', 'The river'], answer: 1, fact: 'Electronics go in the e-waste bin 🔋 Their metals can be used again.' },
  { q: 'What does a resistor do in a circuit?', options: ['Limits the current', 'Makes sound', 'Stores sunlight'], answer: 0, fact: 'A resistor protects an LED from too much current 🟫' },
]

/* ------------------------------------------------------------------ */
/* Chat                                                                 */
/* ------------------------------------------------------------------ */

export const QUICK_PHRASES = ['👋 Hi!', 'Follow me! 🏃', 'Let’s sort trash! ♻️', 'Good job! ⭐', 'Thank you! 💚', 'Meet at the plaza 📍', 'Wait for me ✋']
export const CHAT_EMOJIS = ['😊', '😂', '👍', '💚', '🌳', '♻️', '🎉', '🙌']

/* ------------------------------------------------------------------ */
/* Badges                                                               */
/* ------------------------------------------------------------------ */

export interface BadgeDef {
  id: string
  name: string
  emoji: string
  desc: string
}

export const BADGES: BadgeDef[] = [
  { id: 'first-sort', name: 'First Sort', emoji: '🗑️', desc: 'Sort your first piece of litter' },
  { id: 'sorter', name: 'Super Sorter', emoji: '♻️', desc: 'Sort 15 items correctly' },
  { id: 'green-thumb', name: 'Green Thumb', emoji: '🌳', desc: 'Plant 3 trees' },
  { id: 'gardener', name: 'Gardener', emoji: '🥕', desc: 'Water the garden 5 times' },
  { id: 'power-saver', name: 'Power Saver', emoji: '💡', desc: 'Switch off 3 wasted lights' },
  { id: 'water-saver', name: 'Water Saver', emoji: '🚰', desc: 'Fix 3 leaking taps' },
  { id: 'pond-guardian', name: 'Pond Guardian', emoji: '🦆', desc: 'Fish 5 pieces of litter out of the pond' },
  { id: 'shopper', name: 'Fashion Star', emoji: '🛍️', desc: 'Buy 3 things in the shop' },
  { id: 'kind-heart', name: 'Kind Heart', emoji: '💚', desc: 'Say 3 kind things to other players' },
  { id: 'team-player', name: 'Team Player', emoji: '🤝', desc: 'Chat with another player' },
  { id: 'explorer', name: 'Explorer', emoji: '🧭', desc: 'Visit every zone in town' },
  { id: 'bright-mind', name: 'Bright Mind', emoji: '💡', desc: 'Learn from the chalkboard 3 times' },
  { id: 'compost-pro', name: 'Compost Pro', emoji: '🪱', desc: 'Turn the compost heaps 4 times' },
  { id: 'pet-friend', name: 'Animal Whisperer', emoji: '🐾', desc: 'Adopt and bond with an animal companion' },
  { id: 'striker', name: 'Classroom Striker', emoji: '⚽', desc: 'Score a goal in the school football match' },
  { id: 'quiz-master', name: 'Quiz Champion', emoji: '🏆', desc: 'Score 5 correct in the Eco Quiz Bowl' },
]

/** Stars are earned at these point totals. */
export const STAR_THRESHOLDS = [100, 300, 600, 1000]

/** Seconds for one full day/night cycle */
export const DAY_LENGTH = 240
