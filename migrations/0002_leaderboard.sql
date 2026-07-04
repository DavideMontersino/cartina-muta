-- Leaderboard: one row per completed, submitted game.
--
-- Per-action history is stored as a single JSON array in `actionLog` rather
-- than a normalized one-row-per-action table: only signed-in, named users
-- submit (bounded write volume), a game's action count is small (a few
-- hundred at most) and well under D1's row-size limits, and there is no
-- cross-game action query requirement today, only single-game replay (read
-- one row, parse the JSON). If cross-game analytics become a real need
-- later, a normalized table can be introduced without touching this shape.

CREATE TABLE IF NOT EXISTS "game_result" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "provinceId" text NOT NULL,
  "modeKind" text NOT NULL CHECK ("modeKind" IN ('timer', 'complete')),
  "modeDurationSeconds" integer,
  "totalRegions" integer NOT NULL CHECK ("totalRegions" > 0),
  "found" integer NOT NULL CHECK ("found" >= 0),
  "missed" integer NOT NULL CHECK ("missed" >= 0),
  "mistakes" integer NOT NULL CHECK ("mistakes" >= 0),
  "elapsedMs" integer NOT NULL CHECK ("elapsedMs" >= 0),
  "actionLog" text NOT NULL CHECK (length("actionLog") <= 200000),
  "createdAt" integer NOT NULL,
  CHECK (
    ("modeKind" = 'timer' AND "modeDurationSeconds" IS NOT NULL)
    OR ("modeKind" = 'complete' AND "modeDurationSeconds" IS NULL)
  ),
  CHECK ("found" + "missed" <= "totalRegions")
);

-- Per-province leaderboard ranking: found DESC, elapsedMs ASC, mistakes ASC
-- (tie-breaker policy documented in src/leaderboard/rank.ts).
CREATE INDEX IF NOT EXISTS "game_result_board_idx"
  ON "game_result" ("provinceId", "modeKind", "modeDurationSeconds", "found" DESC, "elapsedMs" ASC, "mistakes" ASC);

CREATE INDEX IF NOT EXISTS "game_result_user_idx" ON "game_result" ("userId");
