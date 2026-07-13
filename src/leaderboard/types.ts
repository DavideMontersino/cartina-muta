import type { Difficulty, GameMode } from "../game/engine";

/** One recorded player action, timestamped relative to game start (ms). */
export interface ActionLogEntry {
  tMs: number;
  type: "guess" | "skip";
  /** ISTAT code of the region the player was asked to find. */
  targetIstat: string;
  /** Only present for "guess": the region the player actually clicked. */
  guessIstat?: string;
  correct?: boolean;
}

/** Client → server payload for a completed game. `totalRegions` is server-derived, never client-sent. */
export interface ScoreSubmissionPayload {
  provinceId: string;
  mode: GameMode;
  /** Visibility preset the run was played at — splits the board (GitHub #34). */
  difficulty: Difficulty;
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
  /** game_result row id of this user's *best* game — the row a replay loads (GitHub #25). */
  id: string;
  userId: string;
  name: string;
  found: number;
  totalRegions: number;
  mistakes: number;
  elapsedMs: number;
  /** Itemized point total — energy mode only. */
  score?: number | null;
  createdAt: number;
  /**
   * Number of recorded actions in this game's log (GitHub #25). A real replay
   * only exists when the log is long enough — legacy/manual rows carry `[]`
   * (count 0) and stay non-clickable. See `isReplayable`.
   */
  actionCount: number;
}

/** Server → client payload for a single game's full replay (GET /api/games/:id, GitHub #25). */
export interface GameReplay {
  id: string;
  provinceId: string;
  name: string;
  /** Mode the game was played in — needed to link back to its board (GitHub #48). */
  mode: GameMode;
  difficulty: Difficulty;
  found: number;
  totalRegions: number;
  elapsedMs: number;
  createdAt: number;
  /** This game's player's rank on its (province, mode, difficulty) board (GitHub #48). */
  rank: number;
  /** Number of ranked players on that board (GitHub #48). */
  totalPlayers: number;
  actionLog: ActionLogEntry[];
}
