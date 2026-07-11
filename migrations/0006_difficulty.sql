-- Difficulty (GitHub #34): every leaderboard now splits three ways — easy /
-- normal / hardcore — alongside the existing (province, mode, duration) key.
--
-- Unlike 0003 (which recreated game_result), this adds the column in place so
-- the real scores already on the board — including the manual entry from
-- 0004 — survive. SQLite allows ADD COLUMN with a NOT NULL DEFAULT (backfills
-- every existing row) and a CHECK that references only the new column. Rows
-- recorded before difficulty existed were played with borders visible and no
-- forced relief, i.e. the "normal" preset — so "normal" is the backfill.
--
-- pending_score mirrors game_result field-for-field (a claim copies each row
-- straight across, see src/leaderboard/pendingScore.ts), so it gets the same
-- column and default.

ALTER TABLE "game_result"
  ADD COLUMN "difficulty" text NOT NULL DEFAULT 'normal'
  CHECK ("difficulty" IN ('easy', 'normal', 'hardcore'));

ALTER TABLE "pending_score"
  ADD COLUMN "difficulty" text NOT NULL DEFAULT 'normal'
  CHECK ("difficulty" IN ('easy', 'normal', 'hardcore'));

-- Ranking now filters on difficulty too; extend the board indexes to lead with
-- it so each (province, mode, duration, difficulty) board stays a single seek.
CREATE INDEX IF NOT EXISTS "game_result_board_diff_idx"
  ON "game_result" ("provinceId", "modeKind", "modeDurationSeconds", "difficulty", "found" DESC, "elapsedMs" ASC, "mistakes" ASC);

CREATE INDEX IF NOT EXISTS "game_result_energy_board_diff_idx"
  ON "game_result" ("provinceId", "modeKind", "difficulty", "score" DESC, "found" DESC, "elapsedMs" ASC);
