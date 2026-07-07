-- Pending (unverified) leaderboard scores.
--
-- A signed-out player who finishes a game and signs in via magic link can't be
-- written straight to `game_result`: that table keys on a verified `userId`
-- that doesn't exist until they click the link. Recording immediately against
-- the raw email instead would let anyone plant a score under someone else's
-- address on the public board. So the score is parked here — keyed by email,
-- hidden from every leaderboard query — and only migrated into `game_result`
-- once the email is proven by a magic-link sign-in (the "claim", see
-- functions/api/claim.ts). Unclaimed rows are swept after a TTL
-- (PENDING_SCORE_TTL_MS in src/leaderboard/pendingScore.ts).
--
-- Columns and CHECKs mirror `game_result` (minus the user FK) so a claimed row
-- transfers field-for-field and always satisfies game_result's constraints.

CREATE TABLE IF NOT EXISTS "pending_score" (
  "id" text NOT NULL PRIMARY KEY,
  "email" text NOT NULL,
  "provinceId" text NOT NULL,
  "modeKind" text NOT NULL CHECK ("modeKind" IN ('timer', 'complete', 'energy')),
  "modeDurationSeconds" integer,
  "totalRegions" integer NOT NULL CHECK ("totalRegions" > 0),
  "found" integer NOT NULL CHECK ("found" >= 0),
  "missed" integer NOT NULL CHECK ("missed" >= 0),
  "mistakes" integer NOT NULL CHECK ("mistakes" >= 0),
  "elapsedMs" integer NOT NULL CHECK ("elapsedMs" >= 0),
  "score" integer CHECK ("score" IS NULL OR "score" >= 0),
  "actionLog" text NOT NULL CHECK (length("actionLog") <= 200000),
  "createdAt" integer NOT NULL,
  CHECK (
    ("modeKind" = 'timer' AND "modeDurationSeconds" IS NOT NULL)
    OR ("modeKind" IN ('complete', 'energy') AND "modeDurationSeconds" IS NULL)
  ),
  CHECK ("found" + "missed" <= "totalRegions")
);

-- Claim looks rows up by email; the TTL sweep and per-email cap scan by
-- (email, createdAt).
CREATE INDEX IF NOT EXISTS "pending_score_email_idx"
  ON "pending_score" ("email", "createdAt");
CREATE INDEX IF NOT EXISTS "pending_score_created_idx"
  ON "pending_score" ("createdAt");
