import type { MapDefinition } from "../maps/types";

export type GameMode =
  | { kind: "timer"; durationSeconds: number }
  | { kind: "complete" };

export type RegionStatus = "pending" | "found" | "missed";

export interface GameConfig {
  map: MapDefinition;
  mode: GameMode;
}

export interface Feedback {
  /** Increments on every guess so the UI can react to repeat guesses. */
  id: number;
  index: number;
  correct: boolean;
}

export interface GameState {
  map: MapDefinition;
  mode: GameMode;
  /** Randomised presentation order; values are indices into map.features. */
  order: number[];
  /** Pointer into `order` for the current target. */
  cursor: number;
  status: RegionStatus[];
  found: number;
  missed: number;
  mistakes: number;
  /** Seconds remaining in timer mode; unused (Infinity) in complete mode. */
  timeLeft: number;
  /** Whole seconds elapsed since start. */
  elapsed: number;
  phase: "playing" | "finished";
  feedback: Feedback | null;
}

export type GameAction =
  | { type: "guess"; index: number }
  | { type: "skip" }
  | { type: "tick" }
  | { type: "finish" };

/** Fisher–Yates shuffle. `rng` is injectable so tests are deterministic. */
export function shuffle(n: number, rng: () => number = Math.random): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createGame(
  config: GameConfig,
  rng: () => number = Math.random,
): GameState {
  const n = config.map.features.length;
  return {
    map: config.map,
    mode: config.mode,
    order: shuffle(n, rng),
    cursor: 0,
    status: Array<RegionStatus>(n).fill("pending"),
    found: 0,
    missed: 0,
    mistakes: 0,
    timeLeft:
      config.mode.kind === "timer"
        ? config.mode.durationSeconds
        : Number.POSITIVE_INFINITY,
    elapsed: 0,
    phase: "playing",
    feedback: null,
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

export function reducer(state: GameState, action: GameAction): GameState {
  if (state.phase !== "playing") return state;

  switch (action.type) {
    case "guess": {
      const target = currentTarget(state);
      if (target === null) return state;
      const nextFeedbackId = (state.feedback?.id ?? 0) + 1;

      if (action.index === target) {
        const status = state.status.slice();
        status[target] = "found";
        return advance({
          ...state,
          status,
          found: state.found + 1,
          feedback: { id: nextFeedbackId, index: action.index, correct: true },
        });
      }
      return {
        ...state,
        mistakes: state.mistakes + 1,
        feedback: { id: nextFeedbackId, index: action.index, correct: false },
      };
    }

    case "skip": {
      const target = currentTarget(state);
      if (target === null) return state;
      const status = state.status.slice();
      status[target] = "missed";
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
      return { ...state, elapsed };
    }

    case "finish":
      return { ...state, phase: "finished" };

    default:
      return state;
  }
}
