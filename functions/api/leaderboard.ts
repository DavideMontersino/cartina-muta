import type { AuthEnv } from "../../src/auth/env";
import { createAuth } from "../../src/auth/server";
import { fetchBoard } from "../../src/leaderboard/board";
import { decodeDifficulty, decodeMode } from "../../src/leaderboard/constants";
import { topAndWindow } from "../../src/leaderboard/window";
// Direct JSON import (not `../maps/registry`, which uses Vite-only
// `import.meta.glob` that esbuild — wrangler's Pages Functions bundler —
// cannot handle).
import provinces from "../../src/maps/provinces.json";

// GET /api/leaderboard?province=<id>&mode=<complete|timer:N>&difficulty=<easy|normal|hardcore>
//
// Returns the top 10 plus the five entries above and below the signed-in
// viewer's own rank (GitHub #28). The viewer's rank is best-per-user, matching
// the board's own dedup (see `topAndWindow` / `fetchBoard`). Signed-out callers
// just get the top 10. `meUserId` lets the client mark the viewer's row.
export const onRequestGet: PagesFunction<AuthEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const provinceId = url.searchParams.get("province");
  const modeParam = url.searchParams.get("mode");
  // Absent/unknown difficulty falls back to "normal" so older clients that
  // don't send the param still get a valid board (GitHub #34).
  const difficulty = decodeDifficulty(url.searchParams.get("difficulty"));

  if (!provinceId || !provinces.some((p) => p.id === provinceId)) {
    return Response.json({ error: "Unknown province." }, { status: 400 });
  }
  const mode = modeParam ? decodeMode(modeParam) : null;
  if (!mode) {
    return Response.json({ error: "Invalid mode." }, { status: 400 });
  }
  const modeDurationSeconds =
    mode.kind === "timer" ? mode.durationSeconds : null;

  // Who's asking — best-effort. No session (or the plain Vite dev server, which
  // has no `/api/auth/*`) just means no "me" row and a top-10-only board.
  let meUserId: string | null = null;
  try {
    const auth = createAuth(ctx.env, ctx.request);
    const session = await auth.api.getSession({ headers: ctx.request.headers });
    meUserId = session?.user?.id ?? null;
  } catch {
    meUserId = null;
  }

  const board = await fetchBoard(
    ctx.env.DB,
    provinceId,
    mode.kind,
    modeDurationSeconds,
    difficulty,
  );
  const { entries, meRank } = topAndWindow(board, meUserId);

  return Response.json({
    province: provinceId,
    mode: modeParam,
    difficulty,
    entries,
    meUserId,
    meRank,
    totalPlayers: board.length,
  });
};
