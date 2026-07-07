import type { AuthEnv } from "../../src/auth/env";
import { createAuth } from "../../src/auth/server";
import {
  CLAIM_DELETE_SQL,
  CLAIM_INSERT_SQL,
  PENDING_SCORE_TTL_MS,
} from "../../src/leaderboard/pendingScore";

// POST /api/claim — called once the player lands back signed in. Migrates any
// still-fresh pending scores parked under their (now-verified) email into
// game_result, then clears their pending rows. Idempotent: game_result reuses
// each pending row's id with INSERT OR IGNORE, so repeat/concurrent calls
// can't duplicate. Returns how many rows were newly claimed so the client can
// confirm the save.
export const onRequestPost: PagesFunction<AuthEnv> = async (ctx) => {
  const auth = createAuth(ctx.env, ctx.request);
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session?.user?.name) {
    return Response.json(
      { error: "Sign in and choose a name to appear on the leaderboard." },
      { status: 401 },
    );
  }

  const { id: userId, email } = session.user;
  const cutoff = Date.now() - PENDING_SCORE_TTL_MS;

  const [inserted] = await ctx.env.DB.batch([
    ctx.env.DB.prepare(CLAIM_INSERT_SQL).bind(userId, email, cutoff),
    ctx.env.DB.prepare(CLAIM_DELETE_SQL).bind(email),
  ]);

  return Response.json(
    { claimed: inserted?.meta?.changes ?? 0 },
    { status: 200 },
  );
};
