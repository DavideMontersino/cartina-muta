import { describe, expect, it } from "vitest";
import { rankEntries } from "./rank";

describe("rankEntries", () => {
  it("ranks by found descending first", () => {
    const ranked = rankEntries([
      { id: "a", found: 10, elapsedMs: 1000, mistakes: 0, createdAt: 1 },
      { id: "b", found: 20, elapsedMs: 5000, mistakes: 5, createdAt: 1 },
    ]);
    expect(ranked.map((e) => e.id)).toEqual(["b", "a"]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("breaks a found tie by elapsedMs ascending", () => {
    const ranked = rankEntries([
      { id: "slow", found: 10, elapsedMs: 5000, mistakes: 0, createdAt: 1 },
      { id: "fast", found: 10, elapsedMs: 4999, mistakes: 0, createdAt: 1 },
    ]);
    expect(ranked.map((e) => e.id)).toEqual(["fast", "slow"]);
  });

  it("breaks a found+elapsedMs tie by mistakes ascending", () => {
    const ranked = rankEntries([
      { id: "sloppy", found: 10, elapsedMs: 5000, mistakes: 3, createdAt: 1 },
      { id: "clean", found: 10, elapsedMs: 5000, mistakes: 1, createdAt: 1 },
    ]);
    expect(ranked.map((e) => e.id)).toEqual(["clean", "sloppy"]);
  });

  it("breaks a full tie by createdAt ascending (earlier submission wins)", () => {
    const ranked = rankEntries([
      { id: "later", found: 10, elapsedMs: 5000, mistakes: 1, createdAt: 2000 },
      {
        id: "earlier",
        found: 10,
        elapsedMs: 5000,
        mistakes: 1,
        createdAt: 1000,
      },
    ]);
    expect(ranked.map((e) => e.id)).toEqual(["earlier", "later"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { id: "a", found: 1, elapsedMs: 1, mistakes: 0, createdAt: 1 },
      { id: "b", found: 2, elapsedMs: 1, mistakes: 0, createdAt: 1 },
    ];
    const copy = [...input];
    rankEntries(input);
    expect(input).toEqual(copy);
  });
});
