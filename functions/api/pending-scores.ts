import type { AuthEnv } from "../../src/auth/env";
import { isValidEmail } from "../../src/auth/validation";
import {
  CAP_PENDING_PER_EMAIL_SQL,
  DELETE_EXPIRED_PENDING_SQL,
  INSERT_PENDING_SCORE_SQL,
  MAX_PENDING_PER_EMAIL,
  normalizeEmail,
  PENDING_SCORE_TTL_MS,
} from "../../src/leaderboard/pendingScore";
import { validateScoreSubmission } from "../../src/leaderboard/validation";

// POST /api/pending-scores — parks a signed-out player's finished game against
// their email. It stays hidden from every leaderboard until a magic-link
// sign-in proves the email and claims it (see functions/api/claim.ts). No
// session required: the whole point is that the player isn't signed in yet.
export const onRequestPost: PagesFunction<AuthEnv> = async (ctx) => {
  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email =
    typeof (body as { email?: unknown })?.email === "string"
      ? normalizeEmail((body as { email: string }).email)
      : "";
  if (!isValidEmail(email)) {
    return Response.json({ error: "Invalid email." }, { status: 400 });
  }

  // The score fields live alongside `email` in the same body; validation
  // ignores the extra key and re-derives totalRegions from the province.
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

  const now = Date.now();
  const id = crypto.randomUUID();
  const modeDurationSeconds =
    mode.kind === "timer" ? mode.durationSeconds : null;

  // Insert, then keep the table tidy in the same batch: sweep TTL-expired rows
  // globally and cap this email's rows to the newest MAX_PENDING_PER_EMAIL.
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(INSERT_PENDING_SCORE_SQL).bind(
      id,
      email,
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
      now,
    ),
    ctx.env.DB.prepare(DELETE_EXPIRED_PENDING_SQL).bind(
      now - PENDING_SCORE_TTL_MS,
    ),
    ctx.env.DB.prepare(CAP_PENDING_PER_EMAIL_SQL).bind(
      email,
      MAX_PENDING_PER_EMAIL,
    ),
  ]);

  return Response.json({ ok: true }, { status: 201 });
};
