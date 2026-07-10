import {
  getCampanile,
  getFacts,
  getFailPool,
  getPhrasePool,
} from "../phrases/registry";
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

const pick = <T>(pool: T[], rng: () => number): T =>
  pool[Math.floor(rng() * pool.length)];

/**
 * Picks a reaction phrase for a guess. When `istat` (the current target comune)
 * is given, its municipality-level win/miss lines take precedence over the
 * province/region/generic pools. `rng` is injectable for tests.
 */
export function pickReaction(
  provinceId: string,
  correct: boolean,
  correctStreak: number,
  wrongStreak: number,
  rng: () => number = Math.random,
  istat?: string,
): string {
  const event = selectReactionEvent(correct, correctStreak, wrongStreak);
  return pick(getPhrasePool(provinceId, event, istat), rng);
}

/** Picks a give-up / reveal line for a comune (its `fail` lines, else generic). */
export function pickFailReaction(
  istat?: string,
  rng: () => number = Math.random,
): string {
  return pick(getFailPool(istat), rng);
}

/** Picks one trivia fact for a comune, or null when it has none. */
export function pickFact(
  istat?: string,
  rng: () => number = Math.random,
): string | null {
  const facts = getFacts(istat);
  return facts.length > 0 ? pick(facts, rng) : null;
}

/** Picks one campanile/landmark photo for a comune, or null when it has none. */
export function pickCampanile(
  istat?: string,
  rng: () => number = Math.random,
): string | null {
  const photos = getCampanile(istat);
  return photos.length > 0 ? pick(photos, rng) : null;
}
