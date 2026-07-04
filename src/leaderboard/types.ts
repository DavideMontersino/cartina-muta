import type { GameMode } from "../game/engine";

/** One recorded player action, timestamped relative to game start (ms). */
export interface ActionLogEntry {
  tMs: number;
  type: "guess" | "guessPoint" | "skip";
  /** ISTAT code of the region the player was asked to find. */
  targetIstat: string;
  /** Only present for "guess": the region the player actually clicked. */
  guessIstat?: string;
  /** Only present for "guessPoint" (energy mode's free-form clicks): [lon, lat]. */
  point?: [number, number];
  correct?: boolean;
}

/** Client → server payload for a completed game. `totalRegions` is server-derived, never client-sent. */
export interface ScoreSubmissionPayload {
  provinceId: string;
  mode: GameMode;
  found: number;
  missed: number;
  mistakes: number;
  elapsedMs: number;
  /** Itemized point total — energy mode only. */
  score?: number;
  actionLog: ActionLogEntry[];
}

/** Server → client leaderboard row. */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  found: number;
  totalRegions: number;
  mistakes: number;
  elapsedMs: number;
  /** Itemized point total — energy mode only. */
  score?: number | null;
  createdAt: number;
}
