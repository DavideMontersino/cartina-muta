import type { GameMode } from "../game/engine";
import { rankEntries } from "./rank";
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
  createdAt: number;
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
): Promise<LeaderboardEntry[]> {
  const result = await db
    .prepare(
      `WITH best AS (
        SELECT gr.*,
          ROW_NUMBER() OVER (
            PARTITION BY gr."userId"
            ORDER BY gr."found" DESC, gr."elapsedMs" ASC, gr."mistakes" ASC
          ) AS rn
        FROM "game_result" gr
        WHERE gr."provinceId" = ?1 AND gr."modeKind" = ?2 AND gr."modeDurationSeconds" IS ?3
      )
      SELECT best."id" AS id, best."userId" AS userId, u."name" AS name,
             best."found" AS found, best."totalRegions" AS totalRegions,
             best."mistakes" AS mistakes, best."elapsedMs" AS elapsedMs,
             best."createdAt" AS createdAt
      FROM best JOIN "user" u ON u."id" = best."userId"
      WHERE best.rn = 1
      LIMIT ?4`,
    )
    .bind(provinceId, modeKind, modeDurationSeconds, BOARD_FETCH_CAP)
    .all<BoardRow>();

  return rankEntries(result.results ?? []);
}
