-- Adds the "energy" game mode to the leaderboard. SQLite can't alter an
-- existing CHECK constraint in place, so this recreates game_result rather
-- than ALTER TABLE-ing it — acceptable here (per the project owner) since the
-- leaderboard is young and low-traffic; existing rows are dropped.
--
-- Energy mode has no fixed duration (like "complete") but tracks a "score" in
-- addition to found/missed/mistakes/elapsedMs — the run's itemized point
-- total, used as the leaderboard's primary ranking key (see rank.ts).
-- score is NULL for timer/complete rows, where it's meaningless.

DROP TABLE IF EXISTS "game_result";

CREATE TABLE "game_result" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
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

-- Per-province leaderboard ranking:
--   - timer/complete: found DESC, elapsedMs ASC, mistakes ASC (rank.ts compareEntries).
--   - energy: score DESC, found DESC, elapsedMs ASC (rank.ts compareEnergyEntries).
CREATE INDEX IF NOT EXISTS "game_result_board_idx"
  ON "game_result" ("provinceId", "modeKind", "modeDurationSeconds", "found" DESC, "elapsedMs" ASC, "mistakes" ASC);

CREATE INDEX IF NOT EXISTS "game_result_energy_board_idx"
  ON "game_result" ("provinceId", "modeKind", "score" DESC, "found" DESC, "elapsedMs" ASC);

CREATE INDEX IF NOT EXISTS "game_result_user_idx" ON "game_result" ("userId");
