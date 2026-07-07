// SQL and policy for pending (unverified) scores — the server-side holding
// area that lets a signed-out player's finished game survive until they prove
// their email with a magic-link sign-in. Shared by the two endpoints
// (functions/api/pending-scores.ts, functions/api/claim.ts) and exercised
// directly in pendingScore.test.ts, so the stored/claimed shapes can't drift.
//
// See migrations/0005_pending_score.sql for the table these operate on.

/** How long an unclaimed pending score lives before it's swept. */
export const PENDING_SCORE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Most pending rows kept per email. Bounds both storage and how many scores a
 * single sign-in can claim, so a flood of submissions against someone else's
 * address can't balloon (the board only ever surfaces each user's best row
 * anyway). Newest rows win.
 */
export const MAX_PENDING_PER_EMAIL = 25;

/** Normalize an email the same way for storage and lookup (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const INSERT_PENDING_SCORE_SQL = `INSERT INTO "pending_score"
  ("id","email","provinceId","modeKind","modeDurationSeconds","totalRegions","found","missed","mistakes","elapsedMs","score","actionLog","createdAt")
 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`;

/** Sweep every pending row older than the TTL (param: cutoff = now − TTL). */
export const DELETE_EXPIRED_PENDING_SQL = `DELETE FROM "pending_score" WHERE "createdAt" < ?1`;

/** Trim one email's pending rows to the newest MAX_PENDING_PER_EMAIL (params: email, cap). */
export const CAP_PENDING_PER_EMAIL_SQL = `DELETE FROM "pending_score"
 WHERE "email" = ?1 AND "id" NOT IN (
   SELECT "id" FROM "pending_score" WHERE "email" = ?1 ORDER BY "createdAt" DESC LIMIT ?2
 )`;

// Migrate a verified user's still-fresh pending scores into game_result, then
// drop all their pending rows. game_result.id reuses pending_score.id and the
// insert is OR IGNORE, so a concurrent or repeated claim can't create
// duplicates. Email is compared case-insensitively in case Better Auth stored
// the user's address with different casing than we parked it under.
export const CLAIM_INSERT_SQL = `INSERT OR IGNORE INTO "game_result"
  ("id","userId","provinceId","modeKind","modeDurationSeconds","totalRegions","found","missed","mistakes","elapsedMs","score","actionLog","createdAt")
 SELECT ps."id", ?1, ps."provinceId", ps."modeKind", ps."modeDurationSeconds", ps."totalRegions", ps."found", ps."missed", ps."mistakes", ps."elapsedMs", ps."score", ps."actionLog", ps."createdAt"
 FROM "pending_score" ps
 WHERE lower(ps."email") = lower(?2) AND ps."createdAt" >= ?3`;

/** Params: userId, email, cutoff (= now − TTL). */
export const CLAIM_DELETE_SQL = `DELETE FROM "pending_score" WHERE lower("email") = lower(?1)`;
