import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CAP_PENDING_PER_EMAIL_SQL,
  CLAIM_DELETE_SQL,
  CLAIM_INSERT_SQL,
  DELETE_EXPIRED_PENDING_SQL,
  INSERT_PENDING_SCORE_SQL,
  MAX_PENDING_PER_EMAIL,
  normalizeEmail,
  PENDING_SCORE_TTL_MS,
} from "./pendingScore";

// Exercise the real SQL shared by /api/pending-scores and /api/claim against a
// SQLite DB built from the actual migrations, so a stored pending score really
// does transfer field-for-field into game_result and the guarantees
// (idempotency, TTL, case-insensitive claim) hold.

const MIGRATIONS = [
  "0001_better_auth",
  "0002_leaderboard",
  "0003_energy_mode",
  "0005_pending_score",
];

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const name of MIGRATIONS) {
    const sql = readFileSync(
      new URL(`../../migrations/${name}.sql`, import.meta.url),
      "utf8",
    );
    db.exec(sql);
  }
  return db;
}

function insertUser(db: DatabaseSync, id: string, name: string, email: string) {
  db.prepare(
    `INSERT INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt")
     VALUES (?1,?2,?3,1,'2026-01-01','2026-01-01')`,
  ).run(id, name, email);
}

let pid = 0;
function insertPending(
  db: DatabaseSync,
  email: string,
  createdAt: number,
  overrides: Partial<{ found: number; score: number }> = {},
) {
  const id = `pending-${++pid}`;
  db.prepare(INSERT_PENDING_SCORE_SQL).run(
    id,
    normalizeEmail(email),
    "cn",
    "energy",
    null,
    247,
    overrides.found ?? 70,
    0,
    0,
    637_000,
    overrides.score ?? 14_020,
    "[]",
    createdAt,
  );
  return id;
}

function claim(db: DatabaseSync, userId: string, email: string, now: number) {
  const inserted = db
    .prepare(CLAIM_INSERT_SQL)
    .run(userId, email, now - PENDING_SCORE_TTL_MS);
  db.prepare(CLAIM_DELETE_SQL).run(email);
  return Number(inserted.changes);
}

function gameResultCount(db: DatabaseSync): number {
  return Number(
    (db.prepare(`SELECT COUNT(*) c FROM "game_result"`).get() as { c: number })
      .c,
  );
}
function pendingCount(db: DatabaseSync): number {
  return Number(
    (
      db.prepare(`SELECT COUNT(*) c FROM "pending_score"`).get() as {
        c: number;
      }
    ).c,
  );
}

describe("pending score claim SQL", () => {
  let db: DatabaseSync;
  const now = 1_783_382_400_000;
  beforeEach(() => {
    db = makeDb();
    insertUser(db, "u1", "Michele", "michele@produzionelenta.it");
  });

  it("migrates a fresh pending score into game_result and clears it", () => {
    insertPending(db, "michele@produzionelenta.it", now);
    const claimed = claim(db, "u1", "michele@produzionelenta.it", now);

    expect(claimed).toBe(1);
    expect(pendingCount(db)).toBe(0);
    const row = db
      .prepare(
        `SELECT "userId","provinceId","modeKind","found","score","totalRegions" FROM "game_result"`,
      )
      .get() as Record<string, unknown>;
    expect(row).toMatchObject({
      userId: "u1",
      provinceId: "cn",
      modeKind: "energy",
      found: 70,
      score: 14_020,
      totalRegions: 247,
    });
  });

  it("is idempotent — a repeated claim creates no duplicate", () => {
    insertPending(db, "michele@produzionelenta.it", now);
    expect(claim(db, "u1", "michele@produzionelenta.it", now)).toBe(1);
    // Re-park an identical id would conflict; simulate a concurrent re-claim by
    // re-running against a re-inserted row of the same id.
    insertPending(db, "michele@produzionelenta.it", now); // pending-... new id
    // Manually force the same id as an already-claimed row to prove OR IGNORE.
    db.prepare(
      `UPDATE "pending_score" SET "id" = (SELECT "id" FROM "game_result" LIMIT 1)`,
    ).run();
    const claimed = claim(db, "u1", "michele@produzionelenta.it", now);
    expect(claimed).toBe(0);
    expect(gameResultCount(db)).toBe(1);
  });

  it("does not claim TTL-expired rows but still clears them", () => {
    insertPending(db, "michele@produzionelenta.it", now); // fresh
    insertPending(
      db,
      "michele@produzionelenta.it",
      now - PENDING_SCORE_TTL_MS - 1, // expired
    );
    const claimed = claim(db, "u1", "michele@produzionelenta.it", now);
    expect(claimed).toBe(1);
    expect(gameResultCount(db)).toBe(1);
    expect(pendingCount(db)).toBe(0); // both rows removed
  });

  it("claims case-insensitively across stored/user email casing", () => {
    insertUser(db, "u2", "Ada", "ada@example.com");
    // Parked lowercased (as the endpoint normalizes); user email differs in case.
    insertPending(db, "ADA@EXAMPLE.COM", now);
    const claimed = claim(db, "u2", "Ada@Example.com", now);
    expect(claimed).toBe(1);
  });

  it("only claims the signed-in user's own email", () => {
    insertPending(db, "someone-else@example.com", now);
    const claimed = claim(db, "u1", "michele@produzionelenta.it", now);
    expect(claimed).toBe(0);
    expect(pendingCount(db)).toBe(1); // the other email's row is untouched
  });
});

describe("pending score maintenance SQL", () => {
  const now = 1_783_382_400_000;

  it("sweeps TTL-expired rows globally", () => {
    const db = makeDb();
    insertPending(db, "a@example.com", now);
    insertPending(db, "b@example.com", now - PENDING_SCORE_TTL_MS - 1);
    db.prepare(DELETE_EXPIRED_PENDING_SQL).run(now - PENDING_SCORE_TTL_MS);
    expect(pendingCount(db)).toBe(1);
  });

  it("caps one email's rows to the newest MAX_PENDING_PER_EMAIL", () => {
    const db = makeDb();
    const email = "flood@example.com";
    for (let i = 0; i < MAX_PENDING_PER_EMAIL + 5; i++) {
      insertPending(db, email, now + i);
    }
    db.prepare(CAP_PENDING_PER_EMAIL_SQL).run(
      normalizeEmail(email),
      MAX_PENDING_PER_EMAIL,
    );
    expect(pendingCount(db)).toBe(MAX_PENDING_PER_EMAIL);
    // The newest row (largest createdAt) survives the cap.
    const newest = db
      .prepare(`SELECT MAX("createdAt") m FROM "pending_score"`)
      .get() as { m: number };
    expect(Number(newest.m)).toBe(now + MAX_PENDING_PER_EMAIL + 4);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Michele@Produzionelenta.IT ")).toBe(
      "michele@produzionelenta.it",
    );
  });
});
