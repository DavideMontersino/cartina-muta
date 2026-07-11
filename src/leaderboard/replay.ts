import type { RegionStatus } from "../game/engine";
import type { ActionLogEntry } from "./types";

/**
 * Minimum recorded actions for a game to be worth replaying (GitHub #25).
 * Legacy/manual rows carry an empty log (`[]`, count 0) and a single action is
 * "too short" to step through — both stay non-clickable on the board.
 */
export const MIN_REPLAYABLE_ACTIONS = 2;

/** Whether a leaderboard row has a real, stepable replay behind it (GitHub #25). */
export function isReplayable(actionCount: number): boolean {
  return actionCount >= MIN_REPLAYABLE_ACTIONS;
}

/** One replayable step: the map state after this action, plus what to highlight. */
export interface ReplayFrame {
  action: ActionLogEntry;
  /** Region status per feature index, cumulative up to and including this action. */
  status: RegionStatus[];
  /** The comune the round asked for (index into the map's features), or null if unknown. */
  targetIndex: number | null;
  /** Region to pulse red — the wrong region the player clicked, or null. */
  flashIndex: number | null;
  /** Region to briefly reveal — the answer on a skip or a wrong guess, or null. */
  revealIndex: number | null;
}

/**
 * Reconstructs the map state after each logged action, so a replay can step
 * through a recorded game reusing `MapCanvas` (GitHub #25). The log is pure
 * history — everything a player never resolved simply stays "pending", exactly
 * as it looked when the game ended.
 *
 * - correct guess → the target becomes "found" (and is revealed);
 * - wrong guess   → status is unchanged; the clicked region flashes and the
 *   real answer is revealed so the viewer learns where it was;
 * - skip          → the target becomes "missed" and is revealed.
 *
 * Unknown ISTAT codes (e.g. a log from a since-changed map) degrade to no
 * highlight rather than throwing.
 */
export function buildReplayFrames(
  log: readonly ActionLogEntry[],
  istatToIndex: ReadonlyMap<string, number>,
  total: number,
): ReplayFrame[] {
  const status: RegionStatus[] = Array.from({ length: total }, () => "pending");
  const frames: ReplayFrame[] = [];

  for (const action of log) {
    const targetIndex = istatToIndex.get(action.targetIstat) ?? null;
    let flashIndex: number | null = null;
    let revealIndex: number | null = null;

    if (action.type === "skip") {
      if (targetIndex !== null) status[targetIndex] = "missed";
      revealIndex = targetIndex;
    } else if (action.correct && targetIndex !== null) {
      status[targetIndex] = "found";
      revealIndex = targetIndex;
    } else {
      // Wrong guess: flash where they tapped, reveal where it really was.
      const guessIndex =
        action.guessIstat != null
          ? (istatToIndex.get(action.guessIstat) ?? null)
          : null;
      flashIndex = guessIndex;
      revealIndex = targetIndex;
    }

    frames.push({
      action,
      status: status.slice(),
      targetIndex,
      flashIndex,
      revealIndex,
    });
  }

  return frames;
}
