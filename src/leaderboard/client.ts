import type { Difficulty, GameMode } from "../game/engine";
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

export type SubmitPendingResponse = { ok: true } | { ok: false; error: string };

/**
 * Parks a signed-out player's finished game against their email (POST
 * /api/pending-scores). It stays hidden from the leaderboard until a
 * magic-link sign-in claims it — see submitScore for the signed-in path and
 * claimPendingScores for the claim.
 */
export async function submitPendingScore(
  email: string,
  payload: ScoreSubmissionPayload,
): Promise<SubmitPendingResponse> {
  try {
    const res = await fetch("/api/pending-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...payload }),
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
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Servizio non raggiungibile. Riprova più tardi.",
    };
  }
}

/**
 * Claims any pending scores parked under the signed-in user's email (POST
 * /api/claim), returning how many were newly recorded. Best-effort: a failure
 * just leaves them parked for the next attempt, so it resolves to 0.
 */
export async function claimPendingScores(): Promise<number> {
  try {
    const res = await fetch("/api/claim", { method: "POST" });
    if (!res.ok) return 0;
    const data = (await res.json()) as { claimed?: number };
    return data.claimed ?? 0;
  } catch {
    return 0;
  }
}

export type FetchLeaderboardResponse =
  | { ok: true; entries: LeaderboardEntry[] }
  | { ok: false; error: string };

export async function fetchLeaderboard(
  provinceId: string,
  mode: GameMode,
  difficulty: Difficulty,
  limit = 20,
): Promise<FetchLeaderboardResponse> {
  const params = new URLSearchParams({
    province: provinceId,
    mode: encodeMode(mode),
    difficulty,
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
