import type { GameMode } from "../game/engine";
import { encodeMode } from "./constants";
import type { LeaderboardEntry, ScoreSubmissionPayload } from "./types";

export interface SubmitScoreResult {
  id: string;
  createdAt: number;
  rank: number;
  totalPlayers: number;
}

export type SubmitScoreResponse =
  | { ok: true; value: SubmitScoreResult }
  | { ok: false; error: string };

/**
 * Submits a completed game's score. `/api/auth/*` (and therefore this
 * endpoint's session check) only exists under Pages Functions — on the plain
 * Vite dev server the request fails, surfaced as an error rather than a crash.
 */
export async function submitScore(
  payload: ScoreSubmissionPayload,
): Promise<SubmitScoreResponse> {
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        ok: false,
        error: body?.error || "Salvataggio non riuscito. Riprova.",
      };
    }
    return { ok: true, value: await res.json() };
  } catch {
    return {
      ok: false,
      error: "Servizio non raggiungibile. Riprova più tardi.",
    };
  }
}

export type FetchLeaderboardResponse =
  | { ok: true; entries: LeaderboardEntry[] }
  | { ok: false; error: string };

export async function fetchLeaderboard(
  provinceId: string,
  mode: GameMode,
  limit = 20,
): Promise<FetchLeaderboardResponse> {
  const params = new URLSearchParams({
    province: provinceId,
    mode: encodeMode(mode),
    limit: String(limit),
  });
  try {
    const res = await fetch(`/api/leaderboard?${params}`);
    if (!res.ok) {
      return { ok: false, error: "Impossibile caricare la classifica." };
    }
    const data = (await res.json()) as { entries: LeaderboardEntry[] };
    return { ok: true, entries: data.entries };
  } catch {
    return { ok: false, error: "Servizio non raggiungibile." };
  }
}
