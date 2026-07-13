import type { Difficulty, GameMode } from "../game/engine";

/** Timer durations offered on the home screen and accepted by the leaderboard API. */
export const TIMER_DURATIONS = [60, 300, 600] as const;
export type TimerDuration = (typeof TIMER_DURATIONS)[number];

/**
 * Difficulty presets (GitHub #34), in display order. Every board splits three
 * ways along this axis, so it's part of the leaderboard query and stored rows.
 * "normal" is the default — the pre-difficulty behaviour and the backfill value
 * for rows recorded before the feature existed.
 */
export const DIFFICULTIES = ["easy", "normal", "hardcore"] as const;

/** Italian labels for the difficulty tabs / wizard cards. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Facile",
  normal: "Normale",
  hardcore: "Hardcore",
};

export function isDifficulty(raw: unknown): raw is Difficulty {
  return (
    typeof raw === "string" && (DIFFICULTIES as readonly string[]).includes(raw)
  );
}

/** Parse a difficulty query-string value, falling back to "normal" when absent. */
export function decodeDifficulty(raw: string | null | undefined): Difficulty {
  return isDifficulty(raw) ? raw : "normal";
}

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

/**
 * Serialize the board's mode + difficulty selection into the leaderboard URL's
 * query string (`?m=timer:60&d=easy`), so a shared link reopens the exact board
 * the sharer was looking at rather than the default tab (GitHub #48).
 */
export function encodeLeaderboardSearch(
  mode: GameMode,
  difficulty: Difficulty,
): string {
  const params = new URLSearchParams();
  params.set("m", encodeMode(mode));
  params.set("d", difficulty);
  return params.toString();
}

/** Parse the leaderboard URL's `?m` / `?d` params back into a selection (GitHub #48). */
export function decodeLeaderboardSearch(search: string): {
  mode: GameMode | null;
  difficulty: Difficulty;
} {
  const params = new URLSearchParams(search);
  const m = params.get("m");
  return {
    mode: m ? decodeMode(m) : null,
    difficulty: decodeDifficulty(params.get("d")),
  };
}

/** Canonical, shareable path for a single game's replay (GitHub #48). */
export function gameReplayPath(gameId: string): string {
  return `/game/${encodeURIComponent(gameId)}`;
}

/** Path to the leaderboard for a specific mode + difficulty (GitHub #48). */
export function leaderboardPath(
  provinceId: string,
  mode: GameMode,
  difficulty: Difficulty,
): string {
  return `/leaderboard/${provinceId}?${encodeLeaderboardSearch(mode, difficulty)}`;
}

/** Short human label for a mode tab / recap line, e.g. "Energia" / "1 min". */
export function modeLabel(mode: GameMode): string {
  if (mode.kind === "energy") return "Energia";
  if (mode.kind === "complete") return "Completa";
  return `${mode.durationSeconds / 60} min`;
}
