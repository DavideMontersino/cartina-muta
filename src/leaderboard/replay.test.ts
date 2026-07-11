import { describe, expect, it } from "vitest";
import {
  buildReplayFrames,
  isReplayable,
  MIN_REPLAYABLE_ACTIONS,
} from "./replay";
import type { ActionLogEntry } from "./types";

// Map istat -> index for a tiny 4-comune fixture.
const index = new Map([
  ["A", 0],
  ["B", 1],
  ["C", 2],
  ["D", 3],
]);
const TOTAL = 4;

describe("isReplayable", () => {
  it("rejects empty and too-short logs (legacy/manual rows)", () => {
    expect(isReplayable(0)).toBe(false);
    expect(isReplayable(MIN_REPLAYABLE_ACTIONS - 1)).toBe(false);
  });

  it("accepts logs at or above the threshold", () => {
    expect(isReplayable(MIN_REPLAYABLE_ACTIONS)).toBe(true);
    expect(isReplayable(42)).toBe(true);
  });
});

describe("buildReplayFrames", () => {
  it("marks a correct guess as found and reveals it", () => {
    const log: ActionLogEntry[] = [
      {
        tMs: 100,
        type: "guess",
        targetIstat: "A",
        guessIstat: "A",
        correct: true,
      },
    ];
    const [frame] = buildReplayFrames(log, index, TOTAL);
    expect(frame.status).toEqual(["found", "pending", "pending", "pending"]);
    expect(frame.targetIndex).toBe(0);
    expect(frame.revealIndex).toBe(0);
    expect(frame.flashIndex).toBeNull();
  });

  it("leaves the target pending on a wrong guess, flashing the tapped region and revealing the answer", () => {
    const log: ActionLogEntry[] = [
      {
        tMs: 200,
        type: "guess",
        targetIstat: "B",
        guessIstat: "C",
        correct: false,
      },
    ];
    const [frame] = buildReplayFrames(log, index, TOTAL);
    expect(frame.status).toEqual(["pending", "pending", "pending", "pending"]);
    expect(frame.targetIndex).toBe(1);
    expect(frame.flashIndex).toBe(2); // tapped C
    expect(frame.revealIndex).toBe(1); // answer was B
  });

  it("marks a skip as missed and reveals it", () => {
    const log: ActionLogEntry[] = [
      { tMs: 300, type: "skip", targetIstat: "D" },
    ];
    const [frame] = buildReplayFrames(log, index, TOTAL);
    expect(frame.status).toEqual(["pending", "pending", "pending", "missed"]);
    expect(frame.revealIndex).toBe(3);
    expect(frame.flashIndex).toBeNull();
  });

  it("accumulates status across frames and preserves per-frame snapshots", () => {
    const log: ActionLogEntry[] = [
      {
        tMs: 1,
        type: "guess",
        targetIstat: "A",
        guessIstat: "A",
        correct: true,
      },
      {
        tMs: 2,
        type: "guess",
        targetIstat: "B",
        guessIstat: "C",
        correct: false,
      },
      {
        tMs: 3,
        type: "guess",
        targetIstat: "B",
        guessIstat: "B",
        correct: true,
      },
      { tMs: 4, type: "skip", targetIstat: "C" },
    ];
    const frames = buildReplayFrames(log, index, TOTAL);
    expect(frames).toHaveLength(4);
    // Frame 0 snapshot is not mutated by later frames.
    expect(frames[0].status).toEqual([
      "found",
      "pending",
      "pending",
      "pending",
    ]);
    // After the wrong guess B is still pending.
    expect(frames[1].status[1]).toBe("pending");
    // Then B is found.
    expect(frames[2].status).toEqual(["found", "found", "pending", "pending"]);
    // Then C is skipped/missed; D never resolved.
    expect(frames[3].status).toEqual(["found", "found", "missed", "pending"]);
  });

  it("degrades gracefully when an istat is not on the map", () => {
    const log: ActionLogEntry[] = [
      {
        tMs: 1,
        type: "guess",
        targetIstat: "Z",
        guessIstat: "Y",
        correct: false,
      },
      { tMs: 2, type: "skip", targetIstat: "Q" },
    ];
    const frames = buildReplayFrames(log, index, TOTAL);
    expect(frames[0].targetIndex).toBeNull();
    expect(frames[0].flashIndex).toBeNull();
    expect(frames[0].revealIndex).toBeNull();
    expect(frames[0].status).toEqual([
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
    expect(frames[1].revealIndex).toBeNull();
    // No region wrongly flipped to missed.
    expect(frames[1].status).toEqual([
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
  });
});
