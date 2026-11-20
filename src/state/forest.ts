import type { SaplingSpot } from './gameStore'

/**
 * The Pine Forest has a FIXED number of plots (SAPLING_SPOTS). Trees live a cycle instead of piling up:
 *   plant → sprout → young → fully grown → harvest seeds (coins) → the plot is empty again.
 * So the forest can never overflow, planting never runs out, and the lifetime total keeps counting up
 * in each player's "My Trees" record.
 */

/** seconds of game time for a planted sapling to become a full tree */
export const GROW_SECS = 150

/** 0..1 how grown a plot's tree is (trees saved before growth existed count as fully grown) */
export function growth(sp: Pick<SaplingSpot, 'planted' | 'plantedAt'>, elapsed: number): number {
  if (!sp.planted) return 0
  if (sp.plantedAt === undefined || sp.plantedAt >= 1e9) return 1
  return Math.max(0, Math.min(1, (elapsed - sp.plantedAt) / GROW_SECS))
}

export const isGrown = (sp: SaplingSpot, elapsed: number) => sp.planted && growth(sp, elapsed) >= 1

/** the stage name shown in the gallery */
export function stageOf(g: number): { name: string; emoji: string } {
  if (g < 0.12) return { name: 'Sprout', emoji: '🌱' }
  if (g < 0.5) return { name: 'Seedling', emoji: '🌿' }
  if (g < 1) return { name: 'Young tree', emoji: '🌲' }
  return { name: 'Full-grown', emoji: '🌳' }
}

/**
 * Make sure at least `need` plots are empty by retiring the OLDEST fully grown trees first
 * (their seeds go to the Forest Reserve). Young trees are never removed.
 */
export function makeRoomForTrees(saplings: SaplingSpot[], elapsed: number, need: number): SaplingSpot[] {
  let free = saplings.filter((p) => !p.planted).length
  if (free >= need) return saplings
  const grown = saplings
    .filter((p) => isGrown(p, elapsed))
    .sort((a, b) => (a.plantedAt ?? -1e12) - (b.plantedAt ?? -1e12))
  const retire = new Set<string>()
  for (const t of grown) {
    if (free >= need) break
    retire.add(t.id)
    free++
  }
  if (!retire.size) return saplings
  return saplings.map((p) => (retire.has(p.id) ? { ...p, planted: false, plantedAt: undefined, by: undefined } : p))
}

/** rank titles by how many trees a player has planted over time */
export const TREE_RANKS: { at: number; name: string; emoji: string }[] = [
  { at: 1, name: 'Seedling Friend', emoji: '🌱' },
  { at: 5, name: 'Gardener', emoji: '🌿' },
  { at: 15, name: 'Forester', emoji: '🌲' },
  { at: 40, name: 'Forest Guardian', emoji: '🦉' },
  { at: 100, name: 'Legend of the Forest', emoji: '🏅' },
]
