import type { AuthEnv } from "../../src/auth/env";
import { createAuth } from "../../src/auth/server";
import { fetchBoard } from "../../src/leaderboard/board";
import { validateScoreSubmission } from "../../src/leaderboard/validation";

// POST /api/scores — records a completed game and returns the submitter's
// live rank on that (province, mode, duration) board. Requires a signed-in
// session with a name already set (see NamePrompt.tsx / SignInCard.tsx).
export const onRequestPost: PagesFunction<AuthEnv> = async (ctx) => {
  const auth = createAuth(ctx.env, ctx.request);
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session?.user?.name) {
    return Response.json(
      { error: "Sign in and choose a name to appear on the leaderboard." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateScoreSubmission(body);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const {
    provinceId,
    mode,
    found,
    missed,
    mistakes,
    elapsedMs,
    score,
    actionLog,
    totalRegions,
  } = validation.value;

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const modeDurationSeconds =
    mode.kind === "timer" ? mode.durationSeconds : null;

  await ctx.env.DB.prepare(
    `INSERT INTO "game_result"
      ("id","userId","provinceId","modeKind","modeDurationSeconds","totalRegions","found","missed","mistakes","elapsedMs","score","actionLog","createdAt")
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`,
  )
    .bind(
      id,
      session.user.id,
      provinceId,
      mode.kind,
      modeDurationSeconds,
      totalRegions,
      found,
      missed,
      mistakes,
      elapsedMs,
      score ?? null,
      JSON.stringify(actionLog),
      createdAt,
    )
    .run();

  const board = await fetchBoard(
    ctx.env.DB,
    provinceId,
    mode.kind,
    modeDurationSeconds,
  );
  // Match by user, not by this row's id: the board only ever surfaces each
  // user's best score, so this submission's rank is the user's best rank
  // even when this particular submission wasn't itself an improvement.
  const mine = board.find((entry) => entry.userId === session.user.id);

  return Response.json(
    {
      id,
      createdAt,
      rank: mine?.rank ?? board.length,
      totalPlayers: board.length,
    },
    { status: 201 },
  );
};
