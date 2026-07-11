import type { Difficulty, GameMode } from "../game/engine";
import { compareEnergyEntries, rankEntries } from "./rank";
import type { LeaderboardEntry } from "./types";

const BOARD_FETCH_CAP = 1000;

interface BoardRow {
  id: string;
  userId: string;
  name: string;
  found: number;
  totalRegions: number;
  mistakes: number;
  elapsedMs: number;
  score: number | null;
  createdAt: number;
  /** Length of the best game's action log — drives replay clickability (GitHub #25). */
  actionCount: number;
}

/**
 * Best score per user for a (province, mode, duration) board, ranked by the
 * tie-breaker policy in `rank.ts`. Shared by both `/api/scores` (to compute
 * the submitter's live rank) and `/api/leaderboard` (to list the board), so
 * the two endpoints can never disagree on ranking.
 */
export async function fetchBoard(
  db: D1Database,
  provinceId: string,
  modeKind: GameMode["kind"],
  modeDurationSeconds: number | null,
  difficulty: Difficulty,
): Promise<LeaderboardEntry[]> {
  const isEnergy = modeKind === "energy";
  // Which single row counts as a user's "best" game (picked before board-wide
  // ranking) must match that mode's ranking policy, or a user's board rank
  // could come from a row that isn't actually their best by that policy.
  const bestOrderBy = isEnergy
    ? `gr."score" DESC, gr."found" DESC, gr."elapsedMs" ASC`
    : `gr."found" DESC, gr."elapsedMs" ASC, gr."mistakes" ASC`;

  const result = await db
    .prepare(
      `WITH best AS (
        SELECT gr.*,
          ROW_NUMBER() OVER (
            PARTITION BY gr."userId"
            ORDER BY ${bestOrderBy}
          ) AS rn
        FROM "game_result" gr
        WHERE gr."provinceId" = ?1 AND gr."modeKind" = ?2 AND gr."modeDurationSeconds" IS ?3
          AND gr."difficulty" = ?4
      )
      SELECT best."id" AS id, best."userId" AS userId, u."name" AS name,
             best."found" AS found, best."totalRegions" AS totalRegions,
             best."mistakes" AS mistakes, best."elapsedMs" AS elapsedMs,
             best."score" AS score, best."createdAt" AS createdAt,
             COALESCE(json_array_length(best."actionLog"), 0) AS actionCount
      FROM best JOIN "user" u ON u."id" = best."userId"
      WHERE best.rn = 1
      LIMIT ?5`,
    )
    .bind(
      provinceId,
      modeKind,
      modeDurationSeconds,
      difficulty,
      BOARD_FETCH_CAP,
    )
    .all<BoardRow>();

  return rankEntries(
    result.results ?? [],
    isEnergy ? compareEnergyEntries : undefined,
  );
}
