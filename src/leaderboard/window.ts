import type { LeaderboardEntry } from "./types";

/** Always-shown leaders (GitHub #28: "plus the top 10"). */
export const TOP_COUNT = 10;
/** How many ranks above and below the viewer to include (GitHub #28: "five above and below"). */
export const WINDOW_RADIUS = 5;

export interface BoardWindow {
  /** Top 10 ∪ the [rank-5, rank+5] window around the viewer, deduped, ascending by rank. */
  entries: LeaderboardEntry[];
  /** The viewer's rank on this board, or null when signed-out / not yet on it. */
  meRank: number | null;
}

/**
 * The board slice to send a client (GitHub #28): the top 10 plus a window of
 * five entries above and below the viewer's own row. Ranks are contiguous
 * within each block; a gap between the top 10 and the window is left for the
 * client to render as an ellipsis.
 *
 * "Your current ranking" is read as the viewer's *best-per-user* rank — the
 * same dedup model the board itself uses (`fetchBoard` already collapses each
 * user to their single best game), so the window is anchored to the exact row
 * the viewer sees for themselves, never a worse duplicate.
 *
 * `ranked` must be the full board in rank order with unique 1-based ranks
 * (as produced by `rankEntries`).
 */
export function topAndWindow(
  ranked: readonly LeaderboardEntry[],
  meUserId: string | null,
): BoardWindow {
  const meIndex =
    meUserId !== null ? ranked.findIndex((e) => e.userId === meUserId) : -1;
  const meRank = meIndex >= 0 ? ranked[meIndex].rank : null;

  // Keyed by rank (unique per board) so the two blocks dedupe on overlap.
  const picked = new Map<number, LeaderboardEntry>();

  for (const entry of ranked.slice(0, TOP_COUNT)) {
    picked.set(entry.rank, entry);
  }

  if (meIndex >= 0) {
    const start = Math.max(0, meIndex - WINDOW_RADIUS);
    const end = Math.min(ranked.length, meIndex + WINDOW_RADIUS + 1);
    for (const entry of ranked.slice(start, end)) {
      picked.set(entry.rank, entry);
    }
  }

  const entries = [...picked.values()].sort((a, b) => a.rank - b.rank);
  return { entries, meRank };
}
