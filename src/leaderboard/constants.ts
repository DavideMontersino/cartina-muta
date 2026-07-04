import type { GameMode } from "../game/engine";

/** Timer durations offered on the home screen and accepted by the leaderboard API. */
export const TIMER_DURATIONS = [60, 300, 600] as const;
export type TimerDuration = (typeof TIMER_DURATIONS)[number];

/** Compact mode encoding shared by the leaderboard query string and stored rows, e.g. "timer:60" / "complete" / "energy". */
export function encodeMode(mode: GameMode): string {
  if (mode.kind === "timer") return `timer:${mode.durationSeconds}`;
  return mode.kind;
}

export function decodeMode(raw: string): GameMode | null {
  if (raw === "complete") return { kind: "complete" };
  if (raw === "energy") return { kind: "energy" };
  const match = /^timer:(\d+)$/.exec(raw);
  if (!match) return null;
  const durationSeconds = Number(match[1]);
  if (!(TIMER_DURATIONS as readonly number[]).includes(durationSeconds))
    return null;
  return { kind: "timer", durationSeconds };
}
