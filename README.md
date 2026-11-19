# 🌍 Eco-munity: Explore, Team Up & Build a Green Town

A 3D isometric, LEGO/Roblox-style open-world game for primary and middle school students.
You create your own hero, walk around a big town, chat with other players nearby, and take on
eco and kindness activities that raise the town's **Eco-Energy** and **Community Happiness**.

## Run it

```bash
npm install        # run again after updating – new packages were added
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## 👥 Multiplayer (same computer, different tabs)

Open `http://localhost:5173` in two or more tabs (or windows) of the **same browser**, pick a different name
in each, and everyone appears in the same town:

- You see each other walking, carrying litter and pets, with name tags and speech bubbles.
- Walk up to another player and press **C** to chat (kind-word filter applies).
- The world is shared: litter, coins, garden, lights, taps, pets, weather, meters, tasks and buildings.
- Town meetings collect **every player's vote**. The dialog shows who has voted.
- The villagers and guide NPCs (Mrs. Rao, Farmer Joy, Ms. Ada, Ranger Sam) are shared by everyone.

How it works: tabs talk through the browser's `BroadcastChannel` (no server needed). One tab is the **host**
(the oldest playing tab, preferring a visible one). It simulates the world and sends snapshots twice a second;
other tabs send their actions to it. If the host tab closes, another tab takes over seamlessly.
See `src/net/net.ts`. To play across computers later, swap BroadcastChannel for a WebSocket server; the
message format stays the same.

Add `?debug` to the URL to get `window.eco` (game store), `window.ecoScene` (player and NPC positions)
and `window.ecoThree` (three.js state) in the browser console.

## Controls

| Key | Action |
| --- | --- |
| **W A S D** / arrow keys | Walk (relative to the screen) |
| **Shift** | Run |
| **E** / Space | Interact: pick up, put in bin, plant, water, fix, switch off, talk |
| **Q** | Put down what you're carrying |
| **C** / Enter | Chat with the player next to you |
| **V** | Switch camera: Overview → Behind you → First person |
| Drag mouse | Look around (behind-you / first-person views; there **W/S** walk and **A/D** turn) |
| **T** | Tasks popup |
| **M** | Full town map |
| **B** | Badges |
| Scroll / **+ −** | Zoom (camera follows you) |
| Esc | Close chat / map / panels |

On tablets an on-screen D-pad and action buttons appear, and you can pinch to zoom.

## The town (120 × 120 units, 15 zones)

🏙️ Town Plaza · 🏢 Eco-munity Center (town meetings) · ♻️ Recycling Center · 🦆 Duck Pond Park ·
🌲 Pine Forest · ☀️ Sunny Fields (solar farm plot) · 🥕 Community Garden · 🐔 Happy Farm ·
🏫 Green School (playground plot) · 🏘️ Maple Street · 🌊 Sparkle River (with bridges) · 🌳 Whispering Woods ·
🏖️ Sunset Beach (pier, lifeguard, sea) · 🔭 Lookout Point (telescope) · 🦋 Butterfly Meadow

## Activities

| Activity | How |
| --- | --- |
| 🗑️ Sort litter | Carry litter to one of 4 bin stations and stand at the right bin (🟡 compost, 🟢 recycle, 🔵 trash) |
| 🦆 Clean the pond | Fish floating litter out from the shore |
| 🌱 Plant trees | Use the dirt mounds marked "Plant here" |
| 💧 Water the garden | Plots get thirsty and droop; rain waters them for free |
| 💡 Save energy | Switch off lights left on in empty Maple Street houses |
| 🚰 Save water | Fix leaking taps around town |
| 🐾 Pet rescue | Mrs. Rao ❗ has lost a pet; follow the hint and the ❓ on the map |
| 🌾 Feed the animals | Feeders at the farm, pond and forest run empty; refill them when the 🌾 marker shows (shared, on the map, 1 new badge) |
| 🚲 Eco vehicles | Borrow a bike, scooter or solar cart from a purple stand (E). Ride (Shift = faster) to earn eco-miles; E again to hop off |
| 🪱 Compost heaps | Turn the steaming heaps at the Recycling Center, Garden and School |
| 🪁 Kite flying | Fly a kite at open spots (Lookout Point, meadow, beach, Maple Street) and learn about wind power |
| 🔭 Wildlife watching | Look through the telescope at Lookout Point (north of the Eco Center) for an eco fact and points |
| 🏖️ Beach | Chat with Lifeguard Lee, sort beach litter, feed the seagulls |
| 🪙 Coins & shop | Coins come from finishing tasks (and a bonus for each challenge). Spend them in the Eco Shop (**P**) on clothes, shoes, hats, glasses, capes and more |
| 💬 Talk | Villagers and guides share eco facts and feelings |
| ⚽ CYBERSQUARE school football | The school behind Maple Street has one gate in its north wall and a walkway around a big pitch. Walk into the ball to dribble it or press E to kick, and score between the posts. The ball can be taken out of the gate |
| 🐶 The town dog | Walk up and press E to make friends; then it follows you |

## Social features

- **Proximity chat:** walk up to another player (another tab) and press C. Messages show in a chat panel and
  as speech bubbles above heads.
- **Teamwork:** everything any player does fills the shared meters and tasks.
- **Kindness:** kind words ("thank you", "good job" …) earn points and happiness. Unkind words are masked.
- **Talk to neighbours:** villagers share eco facts and how they feel about the town.
- **Town meetings:** every player votes. If you're outvoted, the game reinforces respecting the group.

## 🔊 Sound

All sound is synthesised in the browser (Web Audio API), so no audio files are needed. It's tuned to be calm
for classrooms: soft, rounded tones with no buzzers or harsh hiss.
- **Effects:** soft marimba-like notes for picking up, sorting, coins, planting, watering, switching off
  lights, fixing taps, badges and the meeting bell, plus distant thunder in storms.
- **Nature:** a low wind only on windy days, gentle rain, quiet water near the river and pond, rare soft birds.
- **Music:** a slow chord-based tune with a little echo that gets even calmer at night.
- Footstep sounds are off by default (Settings → Sound).

Audio starts after your first click or key press (a browser rule). Volumes are in Settings → Sound.

## 🌦️ Weather & environment

Wind changes over time. Trees, grass, flowers, the school flag, chimney smoke and wind turbines all react to it,
and leaves blow across the screen when it's windy. Rain showers and **storms** bring slanted 3D rain,
splashes, puddles on the paths, darker skies, fog, lightning and thunder. The river and pond ripple, cloud
shadows drift over the land, birds fly over by day, fireflies come out at night, and a lantern glow follows you
in the dark.

## 🖥️ Graphics quality & compatibility

On first load the game checks the device (graphics chip, WebGL 2, CPU cores, memory, screen, touch, data-saver)
and picks **Low / Medium / High** automatically. In Auto mode it also watches the frame rate and lowers the
quality if the game runs slowly. You can override it in **Settings → Look**, which also shows what was detected.

| | Low | Medium | High |
| --- | --- | --- | --- |
| Shadows | – | ✓ | ✓ sharper |
| Swaying grass | – | ✓ | ✓ denser |
| Rain drops / splashes / puddles | light / – / – | ✓ | ✓ heavy |
| Cloud shadows, smoke, birds | – | ✓ | ✓ |
| Night glow (bloom) | – | – | ✓ |
| Resolution | 1× | up to 1.5× | up to 2× |

**Supported:** Chrome / Edge 90+, Firefox 100+, Safari 15.4+ (macOS & iPad), Chromebooks.
WebGL is required (WebGL 2 recommended). Tab multiplayer needs `BroadcastChannel`, which all these support.
Text size uses CSS `zoom` (Firefox 126+).

## ♿ Accessibility (Settings → Access)

- **Colour-blind helpers:** letters (C / R / T) and shapes on the bins
- **High contrast** HUD
- **Reduce motion:** fewer animations, softer lightning flash (follows the OS setting by default)
- **Sound captions** for the bell, thunder and other key sounds
- **Text & button size:** Normal / Large / Extra
- **Always run** (Shift to walk)
- Keyboard-only play, visible focus outlines, and touch controls on tablets

## Other features

- Avatar creator (name, shirt, hair, pants)
- Day and night cycle (4-minute day): street lamps and windows glow, fireflies come out at night
- Random rain showers
- 18 badges, 4 rotating challenge rounds, star rating
- Zone discovery banners, a radar mini-map and a full map
- Animals: ducks swimming, jumping fish, chickens, a cow, rabbits, squirrels, butterflies
- Teacher settings: pause, meeting frequency, ring the bell, skip to night, day/night on/off, restart

## Folder structure

```
src/
├── App.tsx
├── net/net.ts            # 👥 Tab-to-tab multiplayer (host election, sync)
├── audio/audio.ts        # 🔊 Synthesised SFX, ambience and music
├── state/
│   ├── settings.ts       # Device detection, quality presets, audio & accessibility settings
│   ├── netBridge.ts      # Tiny bridge between the store and the network layer
│   ├── world.ts          # 🗺️ Map layout: zones, buildings, paths, nav graph, collision
│   ├── gameData.ts       # ✏️ Lesson content: litter, tasks, dilemmas, badges, villager lines
│   ├── gameStore.ts      # Zustand store: meters, activities, chat, meetings, badges, rounds
│   ├── chatBot.ts        # Kid-safe chat filter + kind-word detection
│   └── sceneRegistry.ts  # Per-frame data outside React (player, keys, NPC positions, zoom)
├── hooks/
│   ├── useGameLoop.ts    # Host-tab timers: litter, coins, lights, leaks
│   ├── useKeyboard.ts    # Keyboard controls
│   └── useAudio.ts       # Unlocks audio, feeds ambience
└── components/
    ├── 3DCanvas/         # GameCanvas (follow camera, day/night, quality), Player, RemotePlayers, NPCs,
    │                     # Town, Ground, Nature (grass, water, sway), Weather (rain, leaves, clouds,
    │                     # birds, smoke), Bins, TrashItems, Collectibles, Animals, Buildables, Effects
    ├── HUD/              # StatsBar, MiniMap + BigMap, TaskList, CoopPlayers, ChatPanel,
    │                     # Prompts (E/C prompts, meeting notice, zone banner, clock), Toasts,
    │                     # HelpCard, TouchControls
    ├── Modals/           # Welcome (avatar creator), Dilemma, RoundComplete, Badges, Settings
    └── UI/Avatars.tsx
```

## Playing across computers later

The tab multiplayer uses the same messages a network game would. Replace the `BroadcastChannel` in
`src/net/net.ts` with a WebSocket connection to a small relay server, and players on different computers will
share one town.



## Testing purpose

# for infinte money
eco.setState({ wallet: { ...eco.getState().wallet, coins: 999999 } })
