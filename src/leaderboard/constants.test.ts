import { describe, expect, it } from "vitest";
import type { Difficulty, GameMode } from "../game/engine";
import {
  decodeLeaderboardSearch,
  encodeLeaderboardSearch,
  gameReplayPath,
  leaderboardPath,
  modeLabel,
} from "./constants";

const MODES: GameMode[] = [
  { kind: "energy" },
  { kind: "complete" },
  { kind: "timer", durationSeconds: 60 },
  { kind: "timer", durationSeconds: 300 },
  { kind: "timer", durationSeconds: 600 },
];
const DIFFS: Difficulty[] = ["easy", "normal", "hardcore"];

describe("leaderboard search encoding (GitHub #48)", () => {
  it("round-trips every mode + difficulty combination", () => {
    for (const mode of MODES) {
      for (const difficulty of DIFFS) {
        const search = encodeLeaderboardSearch(mode, difficulty);
        const decoded = decodeLeaderboardSearch(search);
        expect(decoded.mode).toEqual(mode);
        expect(decoded.difficulty).toBe(difficulty);
      }
    }
  });

  it("produces a shareable query string, not the bare province path", () => {
    expect(
      encodeLeaderboardSearch({ kind: "timer", durationSeconds: 60 }, "easy"),
    ).toBe("m=timer%3A60&d=easy");
  });

  it("falls back to normal difficulty and no mode on an empty/garbage search", () => {
    expect(decodeLeaderboardSearch("")).toEqual({
      mode: null,
      difficulty: "normal",
    });
    expect(decodeLeaderboardSearch("m=nonsense&d=bogus")).toEqual({
      mode: null,
      difficulty: "normal",
    });
  });
});

describe("game replay path (GitHub #48)", () => {
  it("builds a distinct, encoded /game/:id path", () => {
    expect(gameReplayPath("abc123")).toBe("/game/abc123");
    expect(gameReplayPath("a/b c")).toBe("/game/a%2Fb%20c");
  });
});

describe("leaderboard path + mode label (GitHub #48)", () => {
  it("links a recap to the exact board it belongs to", () => {
    expect(
      leaderboardPath(
        "cn",
        { kind: "timer", durationSeconds: 300 },
        "hardcore",
      ),
    ).toBe("/leaderboard/cn?m=timer%3A300&d=hardcore");
    const decoded = decodeLeaderboardSearch(
      leaderboardPath("cn", { kind: "energy" }, "easy").split("?")[1],
    );
    expect(decoded).toEqual({ mode: { kind: "energy" }, difficulty: "easy" });
  });

  it("labels every mode", () => {
    expect(modeLabel({ kind: "energy" })).toBe("Energia");
    expect(modeLabel({ kind: "complete" })).toBe("Completa");
    expect(modeLabel({ kind: "timer", durationSeconds: 60 })).toBe("1 min");
    expect(modeLabel({ kind: "timer", durationSeconds: 600 })).toBe("10 min");
  });
});
