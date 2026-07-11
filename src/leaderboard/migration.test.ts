/**
 * Guards the leaderboard D1 schema against accidental drift, mirroring
 * src/auth/migration.test.ts for the Better Auth tables. Reads
 * 0003_energy_mode.sql (not 0002) since 0003 drops and recreates
 * game_result — it's the current authoritative definition of the table.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../migrations/0003_energy_mode.sql", import.meta.url),
  "utf8",
);

const difficultySql = readFileSync(
  new URL("../../migrations/0006_difficulty.sql", import.meta.url),
  "utf8",
);

describe("leaderboard migration", () => {
  it("creates the game_result table", () => {
    expect(sql).toContain(`CREATE TABLE "game_result"`);
  });

  it("has the columns the app reads/writes", () => {
    for (const col of [
      "userId",
      "provinceId",
      "modeKind",
      "modeDurationSeconds",
      "totalRegions",
      "found",
      "missed",
      "mistakes",
      "elapsedMs",
      "score",
      "actionLog",
      "createdAt",
    ]) {
      expect(sql).toContain(`"${col}"`);
    }
  });

  it("cascades deletion when the owning user is deleted", () => {
    expect(sql).toContain('REFERENCES "user" ("id") ON DELETE CASCADE');
  });

  it("allows the energy mode kind", () => {
    expect(sql).toMatch(/"modeKind" IN \('timer', 'complete', 'energy'\)/);
  });

  it("indexes the ranking columns used by the leaderboard query", () => {
    expect(sql).toContain('"game_result_board_idx"');
    expect(sql).toMatch(/"provinceId".*"modeKind".*"modeDurationSeconds"/s);
    expect(sql).toContain('"game_result_energy_board_idx"');
  });
});

describe("difficulty migration (0006)", () => {
  it("adds a difficulty column to both score tables", () => {
    expect(difficultySql).toMatch(
      /ALTER TABLE "game_result"\s+ADD COLUMN "difficulty"/,
    );
    expect(difficultySql).toMatch(
      /ALTER TABLE "pending_score"\s+ADD COLUMN "difficulty"/,
    );
  });

  it("defaults existing rows to 'normal' and constrains the values", () => {
    expect(difficultySql).toContain(`NOT NULL DEFAULT 'normal'`);
    expect(difficultySql).toMatch(
      /"difficulty" IN \('easy', 'normal', 'hardcore'\)/,
    );
  });

  it("extends the board indexes with difficulty", () => {
    expect(difficultySql).toContain('"game_result_board_diff_idx"');
    expect(difficultySql).toContain('"game_result_energy_board_diff_idx"');
  });
});
