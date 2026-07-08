/**
 * Pure round + scoring logic for a multiplayer game. No I/O — the Room Durable
 * Object drives this and owns the timers (alarms). Kept deterministic and
 * unit-tested, like `src/game/engine.ts` (whose `weightedShuffle` we reuse).
 */

import { weightedShuffle } from "../game/engine";
import type { RosterEntry, Target } from "./protocol";

/** Tunable knobs — playtest, don't defend (mirrors ENERGY_CONFIG). */
export const ROOM_CONFIG = {
  /** How long each round stays open before an automatic reveal. */
  roundWindowMs: 25_000,
  /** How long the reveal is shown before the next round. */
  revealMs: 4500,
  /** How long the animated standings interstitial is shown. */
  standingsMs: 6000,
  /** Show the standings interstitial after every Nth round (and at the end). */
  standingsEvery: 3,
  maxAttempts: 3,
  /** Points for a correct answer on the 1st / 2nd / 3rd attempt. */
  base: [500, 300, 150],
  /** Extra points for speed, decaying linearly from round start to the deadline. */
  speedBonusMax: 250,
  /** Presentation-order weighting: lean toward well-known (bigger) comuni. */
  sampling: { alphaStart: 1.1, alphaDecay: 0 },
} as const;

/**
 * Ordered list of targets for a game: a population-weighted sample (favouring
 * recognisable comuni) truncated to the requested round count. `rng` injectable
 * for deterministic tests.
 */
export function buildOrder(
  roster: RosterEntry[],
  rounds: number,
  rng: () => number = Math.random,
): Target[] {
  const order = weightedShuffle(
    roster.map((r) => Math.max(r.population, 1)),
    rng,
    ROOM_CONFIG.sampling,
  );
  return order
    .slice(0, Math.min(rounds, roster.length))
    .map((i) => ({ istat: roster[i].istat, name: roster[i].name }));
}

/**
 * Points for a resolved player: `attempt` is 1/2/3 for a correct guess on that
 * try, or null for wrong-on-all / timeout (→ 0). Correct guesses also earn a
 * speed bonus that decays to 0 across the round window.
 */
export function scoreRound(
  attempt: number | null,
  timeMs: number,
  windowMs: number = ROOM_CONFIG.roundWindowMs,
): number {
  if (attempt === null || attempt < 1) return 0;
  const tier = Math.min(attempt, ROOM_CONFIG.base.length);
  const base = ROOM_CONFIG.base[tier - 1];
  const frac = Math.max(0, Math.min(1, 1 - timeMs / windowMs));
  return base + Math.round(ROOM_CONFIG.speedBonusMax * frac);
}

export interface RoundPlayer {
  /** Total guesses used this round. */
  attempts: number;
  /** True once correct or out of attempts. */
  finished: boolean;
  correct: boolean;
  points: number;
  finishedAt: number | null;
}

export interface Round {
  index: number;
  target: Target;
  startedAt: number;
  endsAt: number;
  players: Record<string, RoundPlayer>;
}

export function startRound(
  target: Target,
  index: number,
  startedAt: number,
  windowMs: number = ROOM_CONFIG.roundWindowMs,
): Round {
  return {
    index,
    target,
    startedAt,
    endsAt: startedAt + windowMs,
    players: {},
  };
}

function seat(round: Round, id: string): RoundPlayer {
  return (
    round.players[id] ?? {
      attempts: 0,
      finished: false,
      correct: false,
      points: 0,
      finishedAt: null,
    }
  );
}

export interface GuessOutcome {
  round: Round;
  correct: boolean;
  attemptsLeft: number;
  /** True when the player had already finished — the guess is ignored. */
  ignored: boolean;
}

export function applyGuess(
  round: Round,
  id: string,
  istat: string,
  now: number,
): GuessOutcome {
  const cur = seat(round, id);
  if (cur.finished) {
    return { round, correct: false, attemptsLeft: 0, ignored: true };
  }
  const attempts = cur.attempts + 1;
  const correct = istat === round.target.istat;
  const player: RoundPlayer = correct
    ? {
        attempts,
        finished: true,
        correct: true,
        points: scoreRound(
          attempts,
          now - round.startedAt,
          round.endsAt - round.startedAt,
        ),
        finishedAt: now,
      }
    : {
        attempts,
        finished: attempts >= ROOM_CONFIG.maxAttempts,
        correct: false,
        points: 0,
        finishedAt: attempts >= ROOM_CONFIG.maxAttempts ? now : null,
      };
  const next: Round = {
    ...round,
    players: { ...round.players, [id]: player },
  };
  return {
    round: next,
    correct,
    attemptsLeft: player.finished ? 0 : ROOM_CONFIG.maxAttempts - attempts,
    ignored: false,
  };
}

/** True when every active (connected) player has finished — end the round early. */
export function isRoundOver(round: Round, activeIds: string[]): boolean {
  if (activeIds.length === 0) return false;
  return activeIds.every((id) => round.players[id]?.finished);
}

/** Timeout close: mark any unfinished active player as finished with 0 points. */
export function finalizeRound(
  round: Round,
  activeIds: string[],
  now: number,
): Round {
  const players = { ...round.players };
  for (const id of activeIds) {
    if (!players[id]?.finished) {
      players[id] = {
        attempts: players[id]?.attempts ?? 0,
        finished: true,
        correct: false,
        points: 0,
        finishedAt: now,
      };
    }
  }
  return { ...round, players };
}

export interface RoundResult {
  id: string;
  correct: boolean;
  attempts: number;
  points: number;
}

export function roundResults(round: Round): RoundResult[] {
  return Object.entries(round.players).map(([id, p]) => ({
    id,
    correct: p.correct,
    attempts: p.attempts,
    points: p.points,
  }));
}

/**
 * Whether to show the animated standings interstitial after `completedRounds`
 * rounds — every Nth round, but never after the last (the finale covers that).
 */
export function shouldShowStandings(
  completedRounds: number,
  totalRounds: number,
  every: number = ROOM_CONFIG.standingsEvery,
): boolean {
  return completedRounds < totalRounds && completedRounds % every === 0;
}

/** Player ids that have finished the current round (for live "answered" dots). */
export function finishedIds(round: Round): string[] {
  return Object.entries(round.players)
    .filter(([, p]) => p.finished)
    .map(([id]) => id);
}
