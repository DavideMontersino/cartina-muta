/**
 * Guards the Better Auth D1 schema against accidental drift. better-auth@1.6.23
 * reads/writes these exact table + column names (camelCase, its default field
 * mapping) — a rename or drop here silently breaks auth in production, so pin
 * the shape with a test.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../migrations/0001_better_auth.sql", import.meta.url),
  "utf8",
);

describe("Better Auth migration", () => {
  it("creates the four core auth tables", () => {
    for (const table of ["user", "session", "account", "verification"]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
    }
  });

  it("keeps better-auth's camelCase column names", () => {
    // A snake_case rename would break the adapter's reads/writes.
    for (const col of [
      "emailVerified",
      "expiresAt",
      "userId",
      "accountId",
      "providerId",
      "createdAt",
      "updatedAt",
    ]) {
      expect(sql).toContain(`"${col}"`);
    }
  });

  it("cascades sessions and accounts when a user is deleted", () => {
    const cascades = sql.match(/ON DELETE CASCADE/g) ?? [];
    expect(cascades.length).toBeGreaterThanOrEqual(2);
  });
});
