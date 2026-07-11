import { describe, expect, it } from "vitest";
import type { LeaderboardEntry } from "./types";
import { TOP_COUNT, topAndWindow, WINDOW_RADIUS } from "./window";

// Builds a ranked board of N users u1..uN, each rank i (1-based).
function board(n: number): LeaderboardEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    rank: i + 1,
    id: `g${i + 1}`,
    userId: `u${i + 1}`,
    name: `Player ${i + 1}`,
    found: n - i,
    totalRegions: n,
    mistakes: 0,
    elapsedMs: 1000 * (i + 1),
    createdAt: i + 1,
    actionCount: 10,
  }));
}

const ranks = (w: { entries: LeaderboardEntry[] }) =>
  w.entries.map((e) => e.rank);

describe("topAndWindow", () => {
  it("returns just the top 10 for a signed-out viewer", () => {
    const w = topAndWindow(board(30), null);
    expect(ranks(w)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(w.meRank).toBeNull();
  });

  it("returns top 10 plus the window around a mid-board viewer, deduped and sorted", () => {
    // Viewer u20 sits at rank 20 → window [15..25].
    const w = topAndWindow(board(30), "u20");
    expect(w.meRank).toBe(20);
    expect(ranks(w)).toEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10, // top 10
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25, // ±5 window
    ]);
  });

  it("merges overlapping blocks without duplicates when the viewer is near the top", () => {
    // Viewer u12 → window [7..17]; overlaps the top 10 at 7..10.
    const w = topAndWindow(board(30), "u12");
    expect(ranks(w)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    // No rank appears twice.
    expect(new Set(ranks(w)).size).toBe(ranks(w).length);
  });

  it("clamps the window at the bottom of the board", () => {
    // Viewer u29 on a 30-board → window [24..30] (can't go past 30).
    const w = topAndWindow(board(30), "u29");
    expect(ranks(w)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 24, 25, 26, 27, 28, 29, 30,
    ]);
  });

  it("returns the whole board when it is smaller than the top count", () => {
    const w = topAndWindow(board(4), "u3");
    expect(ranks(w)).toEqual([1, 2, 3, 4]);
    expect(w.meRank).toBe(3);
  });

  it("falls back to top 10 when the viewer is signed in but not on this board", () => {
    const w = topAndWindow(board(30), "u999");
    expect(ranks(w)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(w.meRank).toBeNull();
  });

  it("uses the documented radius and top count", () => {
    expect(TOP_COUNT).toBe(10);
    expect(WINDOW_RADIUS).toBe(5);
  });
});
