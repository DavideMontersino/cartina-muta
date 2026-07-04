/**
 * Guards the leaderboard D1 schema against accidental drift, mirroring
 * src/auth/migration.test.ts for the Better Auth tables.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../migrations/0002_leaderboard.sql", import.meta.url),
  "utf8",
);

describe("leaderboard migration", () => {
  it("creates the game_result table", () => {
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "game_result"`);
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
      "actionLog",
      "createdAt",
    ]) {
      expect(sql).toContain(`"${col}"`);
    }
  });

  it("cascades deletion when the owning user is deleted", () => {
    expect(sql).toContain('REFERENCES "user" ("id") ON DELETE CASCADE');
  });

  it("indexes the ranking columns used by the leaderboard query", () => {
    expect(sql).toContain('"game_result_board_idx"');
    expect(sql).toMatch(/"provinceId".*"modeKind".*"modeDurationSeconds"/s);
  });
});
