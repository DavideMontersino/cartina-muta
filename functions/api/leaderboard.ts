import type { AuthEnv } from "../../src/auth/env";
import { fetchBoard } from "../../src/leaderboard/board";
import { decodeDifficulty, decodeMode } from "../../src/leaderboard/constants";
// Direct JSON import (not `../maps/registry`, which uses Vite-only
// `import.meta.glob` that esbuild — wrangler's Pages Functions bundler —
// cannot handle).
import provinces from "../../src/maps/provinces.json";

// GET /api/leaderboard?province=<id>&mode=<complete|timer:N>&difficulty=<easy|normal|hardcore>&limit=<n>
export const onRequestGet: PagesFunction<AuthEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const provinceId = url.searchParams.get("province");
  const modeParam = url.searchParams.get("mode");
  const limitParam = url.searchParams.get("limit");
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
  const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 50);
  const modeDurationSeconds =
    mode.kind === "timer" ? mode.durationSeconds : null;

  const board = await fetchBoard(
    ctx.env.DB,
    provinceId,
    mode.kind,
    modeDurationSeconds,
    difficulty,
  );

  return Response.json({
    province: provinceId,
    mode: modeParam,
    difficulty,
    entries: board.slice(0, limit),
  });
};
