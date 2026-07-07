import { describe, expect, it } from "vitest";
import {
  clearPendingScore,
  loadPendingScore,
  type StorageLike,
  savePendingScore,
} from "./pendingScore";
import type { ScoreSubmissionPayload } from "./types";

/** In-memory stand-in for localStorage (the test env has no DOM). */
function fakeStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

const payload: ScoreSubmissionPayload = {
  provinceId: "cn",
  mode: { kind: "energy" },
  found: 70,
  missed: 0,
  mistakes: 0,
  elapsedMs: 637_000,
  score: 14_020,
  actionLog: [],
};

describe("pendingScore", () => {
  it("round-trips a stashed submission", () => {
    const storage = fakeStorage();
    savePendingScore(payload, storage);
    expect(loadPendingScore(storage)).toEqual(payload);
  });

  it("returns null when nothing is stashed", () => {
    expect(loadPendingScore(fakeStorage())).toBeNull();
  });

  it("clears a stashed submission", () => {
    const storage = fakeStorage();
    savePendingScore(payload, storage);
    clearPendingScore(storage);
    expect(loadPendingScore(storage)).toBeNull();
  });

  it("treats an expired stash as absent and clears it", () => {
    const storage = fakeStorage();
    savePendingScore(payload, storage);
    // 25h later — past the 24h freshness window.
    const later = Date.now() + 25 * 60 * 60 * 1000;
    expect(loadPendingScore(storage, later)).toBeNull();
    // A subsequent load (even in-window) sees nothing: the stale record was purged.
    expect(loadPendingScore(storage)).toBeNull();
  });

  it("treats a corrupt stash as absent and clears it", () => {
    const storage = fakeStorage({ "campanilismi:pendingScore": "{not json" });
    expect(loadPendingScore(storage)).toBeNull();
    expect(loadPendingScore(storage)).toBeNull();
  });

  it("treats a structurally-invalid stash as absent", () => {
    const storage = fakeStorage({
      "campanilismi:pendingScore": JSON.stringify({ nope: true }),
    });
    expect(loadPendingScore(storage)).toBeNull();
  });

  it("no-ops safely when storage is unavailable", () => {
    expect(() => savePendingScore(payload, null)).not.toThrow();
    expect(loadPendingScore(null)).toBeNull();
    expect(() => clearPendingScore(null)).not.toThrow();
  });
});
