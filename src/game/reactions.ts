import { getPhrasePool } from "../phrases/registry";
import type { ReactionEvent } from "../phrases/types";

const STREAK_MILESTONES = [10, 5, 3] as const;

/** Which reaction event a guess triggers, given the streaks right after it. */
export function selectReactionEvent(
  correct: boolean,
  correctStreak: number,
  wrongStreak: number,
): ReactionEvent {
  if (correct) {
    for (const n of STREAK_MILESTONES) {
      if (correctStreak === n) return `streakCorrect${n}` as ReactionEvent;
    }
    return "correct";
  }
  for (const n of STREAK_MILESTONES) {
    if (wrongStreak === n) return `streakWrong${n}` as ReactionEvent;
  }
  return "wrong";
}

/** Picks a reaction phrase for a guess. `rng` is injectable for tests. */
export function pickReaction(
  provinceId: string,
  correct: boolean,
  correctStreak: number,
  wrongStreak: number,
  rng: () => number = Math.random,
): string {
  const event = selectReactionEvent(correct, correctStreak, wrongStreak);
  const pool = getPhrasePool(provinceId, event);
  return pool[Math.floor(rng() * pool.length)];
}
