export interface RankableEntry {
  id: string;
  found: number;
  elapsedMs: number;
  mistakes: number;
  createdAt: number;
  /** Itemized point total — energy mode only; null/absent for timer/complete. */
  score?: number | null;
}

/**
 * Tie-breaker policy (GitHub issue #3):
 *
 * 1. found DESC       — more municipalities correctly identified wins.
 * 2. elapsedMs ASC    — real elapsed time in milliseconds, NOT the rounded
 *    whole-second value shown in the HUD/result card. The issue itself
 *    points out that "58 seconds" is meaningfully different from a rounded
 *    "1 minute" — ties on `found` are broken by genuine speed.
 * 3. mistakes ASC     — breaks the rare remaining tie (found AND elapsedMs
 *    both equal) by fewer incorrect guesses.
 * 4. createdAt ASC    — final fully-deterministic tiebreak so ordering is
 *    always total, never ambiguous.
 *
 * Leaderboards are scoped per (province, mode, duration) — a 60s timer run,
 * a 600s timer run, and an untimed "complete" run are not compared against
 * each other.
 */
export function compareEntries(a: RankableEntry, b: RankableEntry): number {
  if (a.found !== b.found) return b.found - a.found;
  if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs - b.elapsedMs;
  if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes;
  return a.createdAt - b.createdAt;
}

/**
 * Energy mode's ranking policy (GitHub issue #8): score is the trophy, so it
 * ranks first; found ("how deep did you get") breaks a score tie, then
 * elapsedMs ASC, then createdAt ASC.
 */
export function compareEnergyEntries(
  a: RankableEntry,
  b: RankableEntry,
): number {
  const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
  if (scoreDiff !== 0) return scoreDiff;
  if (a.found !== b.found) return b.found - a.found;
  if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs - b.elapsedMs;
  return a.createdAt - b.createdAt;
}

/** Sorts entries by the given tie-breaker policy (default: compareEntries) and assigns 1-based ranks. */
export function rankEntries<T extends RankableEntry>(
  entries: T[],
  compare: (a: RankableEntry, b: RankableEntry) => number = compareEntries,
): (T & { rank: number })[] {
  return entries
    .slice()
    .sort(compare)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}
