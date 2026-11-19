/**
 * Kid-safe chat helpers.
 *  - filterMessage: masks unkind words (classroom safety)
 *  - isKind: detects kind words (rewarded by the game)
 */

const UNKIND = ['stupid', 'idiot', 'dumb', 'hate you', 'shut up', 'loser', 'ugly', 'fat', 'noob', 'trash player', 'kill', 'moron', 'useless', 'go away', 'nobody likes you']

const KIND = ['thank', 'thanks', 'please', 'sorry', 'good job', 'great job', 'well done', 'awesome', 'amazing', 'nice', 'you can do it', 'you rock', 'proud', 'kind', 'friend', 'love', 'cool', 'brilliant', 'helpful', 'teamwork', '💚', '⭐']

export function filterMessage(text: string): { clean: string; flagged: boolean } {
  let clean = text.slice(0, 140)
  let flagged = false
  for (const w of UNKIND) {
    const re = new RegExp(`\\b${w}\\b`, 'gi')
    if (re.test(clean)) {
      flagged = true
      clean = clean.replace(re, (m) => '★'.repeat(m.length))
    }
  }
  return { clean, flagged }
}

export const isKind = (text: string) => {
  const t = text.toLowerCase()
  return KIND.some((k) => t.includes(k))
}

