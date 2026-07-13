import type { AuthEnv } from "../../../src/auth/env";
import type { GameMode } from "../../../src/game/engine";
import { fetchBoard } from "../../../src/leaderboard/board";
import { decodeDifficulty } from "../../../src/leaderboard/constants";
import type {
  ActionLogEntry,
  GameReplay,
} from "../../../src/leaderboard/types";

interface GameRow {
  id: string;
  provinceId: string;
  userId: string;
  name: string;
  modeKind: string;
  modeDurationSeconds: number | null;
  difficulty: string | null;
  found: number;
  totalRegions: number;
  elapsedMs: number;
  createdAt: number;
  actionLog: string;
}

// GET /api/games/:id — one game's full recorded history for replay (GitHub #25).
// Public, like /api/leaderboard: anyone looking at the board can replay a row.
export const onRequestGet: PagesFunction<AuthEnv, "id"> = async (ctx) => {
  const id = ctx.params.id;
  if (typeof id !== "string" || id.length === 0) {
    return Response.json({ error: "Missing game id." }, { status: 400 });
  }

  const row = await ctx.env.DB.prepare(
    `SELECT gr."id" AS id, gr."provinceId" AS provinceId, gr."userId" AS userId,
            u."name" AS name, gr."modeKind" AS modeKind,
            gr."modeDurationSeconds" AS modeDurationSeconds,
            gr."difficulty" AS difficulty, gr."found" AS found,
            gr."totalRegions" AS totalRegions, gr."elapsedMs" AS elapsedMs,
            gr."createdAt" AS createdAt, gr."actionLog" AS actionLog
       FROM "game_result" gr JOIN "user" u ON u."id" = gr."userId"
      WHERE gr."id" = ?1`,
  )
    .bind(id)
    .first<GameRow>();

  if (!row) {
    return Response.json({ error: "Partita non trovata." }, { status: 404 });
  }

  let actionLog: ActionLogEntry[] = [];
  try {
    const parsed = JSON.parse(row.actionLog);
    if (Array.isArray(parsed)) actionLog = parsed as ActionLogEntry[];
  } catch {
    // Corrupt log → empty replay rather than a 500; the row still exists.
  }

  const difficulty = decodeDifficulty(row.difficulty);
  const mode: GameMode =
    row.modeKind === "timer" && row.modeDurationSeconds != null
      ? { kind: "timer", durationSeconds: row.modeDurationSeconds }
      : row.modeKind === "energy"
        ? { kind: "energy" }
        : { kind: "complete" };

  // The game's standing on its own (province, mode, difficulty) board — computed
  // the same way score submission does, so the recap can state a ranking and
  // link back to the right leaderboard (GitHub #48).
  const board = await fetchBoard(
    ctx.env.DB,
    row.provinceId,
    mode.kind,
    row.modeDurationSeconds,
    difficulty,
  );
  const mine = board.find((entry) => entry.userId === row.userId);

  const game: GameReplay = {
    id: row.id,
    provinceId: row.provinceId,
    name: row.name,
    mode,
    difficulty,
    found: row.found,
    totalRegions: row.totalRegions,
    elapsedMs: row.elapsedMs,
    createdAt: row.createdAt,
    rank: mine?.rank ?? board.length,
    totalPlayers: board.length,
    actionLog,
  };

  return Response.json(game);
};
