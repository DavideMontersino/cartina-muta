import type { MapDefinition } from "../maps/types";
import { bearingDegrees, haversineKm } from "./distance";

export type GameMode =
  | { kind: "timer"; durationSeconds: number }
  | { kind: "complete" }
  | { kind: "energy" };

/**
 * Visibility preset chosen alongside the mode (GitHub #34). Orthogonal to
 * `GameMode` — it only affects what the player sees (relief + comune borders),
 * never the reducer's scoring/order logic — but it is recorded with every
 * result so leaderboards split three ways per mode.
 *   - easy: relief on + borders visible.
 *   - normal: relief off, borders visible.
 *   - hardcore: relief off, borders hidden until a comune is resolved
 *     (found/skipped/lost), flashing only momentarily on a tap.
 */
export type Difficulty = "easy" | "normal" | "hardcore";

export type RegionStatus = "pending" | "found" | "missed";

export interface GameConfig {
  map: MapDefinition;
  mode: GameMode;
  difficulty: Difficulty;
}

export interface Feedback {
  /** Increments on every guess so the UI can react to repeat guesses. */
  id: number;
  /** The clicked region, or null when a guess auto-resolves the round (3rd miss). */
  index: number | null;
  correct: boolean;
  /**
   * How far/which way the target is from the comune the player tapped — set on
   * an energy-mode miss. Derived from the two saved centroids ([lon, lat]), so
   * it never depends on the rendered map or any screen transform.
   */
  distanceKm?: number;
  bearingDeg?: number;
}

/** Itemized score components for the last correct energy-mode guess. */
export interface ScoreBreakdown {
  base: number;
  streakMultiplier: number;
  speedBonus: number;
  firstTryBonus: number;
  total: number;
}

export interface GameState {
  map: MapDefinition;
  mode: GameMode;
  /** Randomised (or weighted-sampled, for energy mode) presentation order; values are indices into map.features. */
  order: number[];
  /** Pointer into `order` for the current target. */
  cursor: number;
  status: RegionStatus[];
  found: number;
  missed: number;
  mistakes: number;
  /** Consecutive correct guesses right now (resets to 0 on a wrong guess). */
  correctStreak: number;
  /** Consecutive wrong guesses right now (resets to 0 on a correct guess). */
  wrongStreak: number;
  /** Seconds remaining in timer mode; unused (Infinity) in complete mode. */
  timeLeft: number;
  /** Whole seconds elapsed since start. */
  elapsed: number;
  phase: "playing" | "finished";
  feedback: Feedback | null;
  /** Energy 0-100 (energy mode); Infinity (never depletes) in other modes. */
  energy: number;
  /** Itemized score (energy mode); unused (0) in other modes. */
  score: number;
  /** Guesses made against the current target (energy mode only; 0 in other modes). */
  attempts: number;
  /** Breakdown of the last scored guess (energy mode only). */
  scoreBreakdown: ScoreBreakdown | null;
}

export type GameAction =
  | { type: "guess"; index: number; roundElapsedMs?: number }
  | { type: "skip" }
  | { type: "tick" }
  | { type: "finish" };

/** Tunable constants for the energy-run mode. Starting numbers per the design doc — playtest, don't defend. */
export const ENERGY_CONFIG = {
  start: 100,
  max: 100,
  drainPerSecond: 0.625,
  /** Drain rate grows this fraction per minute survived. */
  drainGrowthPerMinute: 0.1,
  // Halved from the original { 20, 10, 5 } (GitHub #34): correct guesses were
  // refilling energy too generously, so runs rarely ended on the drain. Energy
  // is a float internally, so the exact halves (incl. 2.5) are fine.
  refill: { bullseye: 10, near: 5, far: 2.5 },
  wrongAttemptCost: 8,
  maxAttempts: 3,
  /** Base score per attempt number (1st/2nd/3rd try). */
  attemptBase: [100, 60, 30],
  /**
   * Presentation-order weighting. A higher alphaStart front-loads big/famous
   * comuni (Cuneo, Alba, Saluzzo…) so a run opens on names people know; alpha
   * decays to 0 (uniform) by ~depth alphaStart/alphaDecay, so the long tail of
   * tiny comuni still shows up deeper in.
   */
  sampling: { alphaStart: 2, alphaDecay: 0.04 },
  streak: { doubleAt: 3, tripleAt: 6 },
  speedBonusThresholdMs: 3000,
  speedBonus: 50,
  firstTryBullseyeBonus: 50,
} as const;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Fisher–Yates shuffle. `rng` is injectable so tests are deterministic. */
export function shuffle(n: number, rng: () => number = Math.random): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface WeightedSamplingOptions {
  /** Population-weight exponent at the start of the run (depth 0). */
  alphaStart?: number;
  /** Per-step exponent decay — weighting flattens toward uniform as the run goes deeper. */
  alphaDecay?: number;
}

/**
 * Weighted sample-without-replacement order: at each step, the next index is
 * drawn from the remaining pool with probability proportional to
 * `population^alpha(depth)`, where alpha decays toward 0 (uniform) as depth
 * grows — early picks strongly favour big/famous comuni, deep picks approach
 * uniform. `rng` is injectable so tests are deterministic.
 */
export function weightedShuffle(
  populations: number[],
  rng: () => number = Math.random,
  { alphaStart = 1, alphaDecay = 0.02 }: WeightedSamplingOptions = {},
): number[] {
  const remaining = populations.map((p, i) => ({ i, p: Math.max(p, 1) }));
  const order: number[] = [];
  let depth = 0;
  while (remaining.length > 0) {
    const alpha = Math.max(0, alphaStart - alphaDecay * depth);
    const weights = remaining.map((r) => r.p ** alpha);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let pick = remaining.length - 1;
    for (let k = 0; k < weights.length; k++) {
      r -= weights[k];
      if (r <= 0) {
        pick = k;
        break;
      }
    }
    order.push(remaining[pick].i);
    remaining.splice(pick, 1);
    depth++;
  }
  return order;
}

export function createGame(
  config: GameConfig,
  rng: () => number = Math.random,
): GameState {
  const n = config.map.features.length;
  const isEnergy = config.mode.kind === "energy";
  return {
    map: config.map,
    mode: config.mode,
    order: isEnergy
      ? weightedShuffle(
          config.map.features.map((f) => f.population),
          rng,
          ENERGY_CONFIG.sampling,
        )
      : shuffle(n, rng),
    cursor: 0,
    status: Array<RegionStatus>(n).fill("pending"),
    found: 0,
    missed: 0,
    mistakes: 0,
    correctStreak: 0,
    wrongStreak: 0,
    timeLeft:
      config.mode.kind === "timer"
        ? config.mode.durationSeconds
        : Number.POSITIVE_INFINITY,
    elapsed: 0,
    phase: "playing",
    feedback: null,
    energy: isEnergy ? ENERGY_CONFIG.start : Number.POSITIVE_INFINITY,
    score: 0,
    attempts: 0,
    scoreBreakdown: null,
  };
}

/** The index (into map.features) the player must currently find, or null when done. */
export function currentTarget(state: GameState): number | null {
  if (state.phase !== "playing") return null;
  return state.order[state.cursor] ?? null;
}

/** Advance past any already-resolved regions to the next pending target. */
function advance(state: GameState): GameState {
  let cursor = state.cursor;
  while (
    cursor < state.order.length &&
    state.status[state.order[cursor]] !== "pending"
  ) {
    cursor++;
  }
  if (cursor >= state.order.length) {
    return { ...state, cursor, phase: "finished" };
  }
  return { ...state, cursor };
}

/**
 * Energy-mode resolution of a region tap. Correctness is decided by which comune
 * the player tapped (index === target) — no coordinate maths — so it is reliable
 * on every browser. A hit scores + refills energy; a miss costs energy and, after
 * `maxAttempts`, reveals the answer and moves on.
 */
function energyGuess(
  state: GameState,
  action: { index: number; roundElapsedMs?: number },
  target: number,
  correct: boolean,
  nextFeedbackId: number,
): GameState {
  if (correct) {
    const attemptNumber = state.attempts + 1;
    const tier = clamp(attemptNumber, 1, ENERGY_CONFIG.attemptBase.length);
    const base = ENERGY_CONFIG.attemptBase[tier - 1];
    const correctStreak = state.correctStreak + 1;
    const streakMultiplier =
      correctStreak >= ENERGY_CONFIG.streak.tripleAt
        ? 3
        : correctStreak >= ENERGY_CONFIG.streak.doubleAt
          ? 2
          : 1;
    const speedBonus =
      (action.roundElapsedMs ?? Number.POSITIVE_INFINITY) <
      ENERGY_CONFIG.speedBonusThresholdMs
        ? ENERGY_CONFIG.speedBonus
        : 0;
    const firstTryBonus =
      attemptNumber === 1 ? ENERGY_CONFIG.firstTryBullseyeBonus : 0;
    const total = base * streakMultiplier + speedBonus + firstTryBonus;
    const refill =
      attemptNumber === 1
        ? ENERGY_CONFIG.refill.bullseye
        : attemptNumber === 2
          ? ENERGY_CONFIG.refill.near
          : ENERGY_CONFIG.refill.far;

    const status = state.status.slice();
    status[target] = "found";
    return advance({
      ...state,
      status,
      found: state.found + 1,
      score: state.score + total,
      energy: clamp(state.energy + refill, 0, ENERGY_CONFIG.max),
      correctStreak,
      wrongStreak: 0,
      attempts: 0,
      scoreBreakdown: {
        base,
        streakMultiplier,
        speedBonus,
        firstTryBonus,
        total,
      },
      feedback: { id: nextFeedbackId, index: action.index, correct: true },
    });
  }

  const energy = clamp(
    state.energy - ENERGY_CONFIG.wrongAttemptCost,
    0,
    ENERGY_CONFIG.max,
  );
  // Distance/direction from the comune the player tapped to the target — pure
  // geography off the saved centroids, no rendered-map coordinates involved.
  const from = state.map.features[action.index].centroid;
  const to = state.map.features[target].centroid;
  const feedback: Feedback = {
    id: nextFeedbackId,
    index: action.index,
    correct: false,
    distanceKm: haversineKm(from, to),
    bearingDeg: bearingDegrees(from, to),
  };

  if (energy <= 0) {
    return {
      ...state,
      energy,
      wrongStreak: state.wrongStreak + 1,
      correctStreak: 0,
      feedback,
      phase: "finished",
    };
  }

  const attempts = state.attempts + 1;
  if (attempts >= ENERGY_CONFIG.maxAttempts) {
    const status = state.status.slice();
    status[target] = "missed";
    return advance({
      ...state,
      status,
      missed: state.missed + 1,
      energy,
      attempts: 0,
      wrongStreak: state.wrongStreak + 1,
      correctStreak: 0,
      feedback,
    });
  }

  return {
    ...state,
    energy,
    attempts,
    wrongStreak: state.wrongStreak + 1,
    correctStreak: 0,
    feedback,
  };
}

export function reducer(state: GameState, action: GameAction): GameState {
  if (state.phase !== "playing") return state;

  switch (action.type) {
    case "guess": {
      const target = currentTarget(state);
      if (target === null) return state;
      const nextFeedbackId = (state.feedback?.id ?? 0) + 1;
      const correct = action.index === target;

      if (state.mode.kind === "energy") {
        return energyGuess(state, action, target, correct, nextFeedbackId);
      }

      if (correct) {
        const status = state.status.slice();
        status[target] = "found";
        return advance({
          ...state,
          status,
          found: state.found + 1,
          correctStreak: state.correctStreak + 1,
          wrongStreak: 0,
          feedback: { id: nextFeedbackId, index: action.index, correct: true },
        });
      }
      return {
        ...state,
        mistakes: state.mistakes + 1,
        correctStreak: 0,
        wrongStreak: state.wrongStreak + 1,
        feedback: { id: nextFeedbackId, index: action.index, correct: false },
      };
    }

    case "skip": {
      const target = currentTarget(state);
      if (target === null) return state;
      const status = state.status.slice();
      status[target] = "missed";
      if (state.mode.kind === "energy") {
        // Skipping/revealing just moves on — no extra energy penalty.
        return advance({
          ...state,
          status,
          missed: state.missed + 1,
          attempts: 0,
        });
      }
      return advance({ ...state, status, missed: state.missed + 1 });
    }

    case "tick": {
      const elapsed = state.elapsed + 1;
      if (state.mode.kind === "timer") {
        const timeLeft = state.timeLeft - 1;
        if (timeLeft <= 0) {
          return { ...state, timeLeft: 0, elapsed, phase: "finished" };
        }
        return { ...state, timeLeft, elapsed };
      }
      if (state.mode.kind === "energy") {
        const minutesElapsed = Math.floor(elapsed / 60);
        const drainRate =
          ENERGY_CONFIG.drainPerSecond *
          (1 + ENERGY_CONFIG.drainGrowthPerMinute * minutesElapsed);
        const energy = Math.max(0, state.energy - drainRate);
        if (energy <= 0) {
          return { ...state, energy: 0, elapsed, phase: "finished" };
        }
        return { ...state, energy, elapsed };
      }
      return { ...state, elapsed };
    }

    case "finish":
      return { ...state, phase: "finished" };

    default:
      return state;
  }
}
