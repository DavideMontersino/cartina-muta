import { describe, expect, it } from "vitest";
import type { MapDefinition } from "../maps/types";
import {
  createGame,
  currentTarget,
  type GameConfig,
  reducer,
  shuffle,
} from "./engine";

const fakeMap = (n: number): MapDefinition => ({
  id: "test",
  name: "Test",
  unit: { singular: "regione", plural: "regioni" },
  features: Array.from({ length: n }, (_, i) => ({
    name: `R${i}`,
    istat: String(i),
    geometry: { type: "Polygon", coordinates: [] },
  })),
});

// Deterministic RNG so `order` is the identity permutation (no swaps).
const noShuffleRng = () => 0.999999;

const startComplete = (n: number): GameConfig => ({
  map: fakeMap(n),
  mode: { kind: "complete" },
});

describe("shuffle", () => {
  it("returns a permutation of 0..n-1", () => {
    const out = shuffle(20, () => 0.42);
    expect([...out].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i),
    );
  });
});

describe("reducer — complete mode", () => {
  it("marks a correct guess as found and advances the target", () => {
    let s = createGame(startComplete(3), noShuffleRng);
    const first = currentTarget(s);
    expect(first).toBe(0);

    s = reducer(s, { type: "guess", index: first as number });
    expect(s.found).toBe(1);
    expect(s.status[0]).toBe("found");
    expect(currentTarget(s)).toBe(1);
    expect(s.mistakes).toBe(0);
  });

  it("counts a wrong guess as a mistake without advancing", () => {
    let s = createGame(startComplete(3), noShuffleRng);
    const target = currentTarget(s) as number;
    const wrong = target === 2 ? 1 : 2;

    s = reducer(s, { type: "guess", index: wrong });
    expect(s.mistakes).toBe(1);
    expect(s.found).toBe(0);
    expect(currentTarget(s)).toBe(target);
    expect(s.feedback?.correct).toBe(false);
  });

  it("assigns a strictly increasing feedback id to consecutive wrong guesses", () => {
    // The UI keys the "wrong guess" label on feedback.id to force it to
    // remount (and its fade animation to restart) on every wrong guess,
    // even repeated ones in quick succession. That only works if this id
    // keeps changing.
    let s = createGame(startComplete(3), noShuffleRng);
    const target = currentTarget(s) as number;
    const wrong = target === 2 ? 1 : 2;

    s = reducer(s, { type: "guess", index: wrong });
    const firstId = s.feedback?.id;
    s = reducer(s, { type: "guess", index: wrong });
    const secondId = s.feedback?.id;

    expect(firstId).toBeDefined();
    expect(secondId).toBeDefined();
    expect(secondId).not.toBe(firstId);
  });

  it("tracks a correct-guess streak and resets it on a wrong guess", () => {
    let s = createGame(startComplete(3), noShuffleRng);
    s = reducer(s, { type: "guess", index: currentTarget(s) as number });
    expect(s.correctStreak).toBe(1);
    expect(s.wrongStreak).toBe(0);
    s = reducer(s, { type: "guess", index: currentTarget(s) as number });
    expect(s.correctStreak).toBe(2);

    const target = currentTarget(s) as number;
    const wrong = target === 2 ? 1 : 2;
    s = reducer(s, { type: "guess", index: wrong });
    expect(s.correctStreak).toBe(0);
    expect(s.wrongStreak).toBe(1);
  });

  it("tracks a wrong-guess streak and resets it on a correct guess", () => {
    let s = createGame(startComplete(3), noShuffleRng);
    const target = currentTarget(s) as number;
    const wrong = target === 2 ? 1 : 2;

    s = reducer(s, { type: "guess", index: wrong });
    expect(s.wrongStreak).toBe(1);
    s = reducer(s, { type: "guess", index: wrong });
    expect(s.wrongStreak).toBe(2);

    s = reducer(s, { type: "guess", index: target });
    expect(s.wrongStreak).toBe(0);
    expect(s.correctStreak).toBe(1);
  });

  it("skip marks the target missed and advances", () => {
    let s = createGame(startComplete(3), noShuffleRng);
    const target = currentTarget(s) as number;
    s = reducer(s, { type: "skip" });
    expect(s.status[target]).toBe("missed");
    expect(s.missed).toBe(1);
    expect(currentTarget(s)).not.toBe(target);
  });

  it("finishes once every region is resolved (found or missed)", () => {
    let s = createGame(startComplete(3), noShuffleRng);
    for (let i = 0; i < 3; i++) {
      const t = currentTarget(s);
      if (t === null) break;
      s = reducer(s, { type: "guess", index: t });
    }
    expect(s.phase).toBe("finished");
    expect(s.found).toBe(3);
    expect(currentTarget(s)).toBeNull();
  });

  it("ignores actions after the game is finished", () => {
    let s = createGame(startComplete(1), noShuffleRng);
    s = reducer(s, { type: "guess", index: currentTarget(s) as number });
    expect(s.phase).toBe("finished");
    const after = reducer(s, { type: "guess", index: 0 });
    expect(after).toBe(s);
  });
});

describe("reducer — timer mode", () => {
  it("finishes when the clock runs out", () => {
    let s = createGame(
      { map: fakeMap(5), mode: { kind: "timer", durationSeconds: 2 } },
      noShuffleRng,
    );
    s = reducer(s, { type: "tick" });
    expect(s.phase).toBe("playing");
    expect(s.timeLeft).toBe(1);
    s = reducer(s, { type: "tick" });
    expect(s.phase).toBe("finished");
    expect(s.timeLeft).toBe(0);
  });

  it("tracks elapsed seconds", () => {
    let s = createGame(
      { map: fakeMap(5), mode: { kind: "timer", durationSeconds: 60 } },
      noShuffleRng,
    );
    s = reducer(s, { type: "tick" });
    s = reducer(s, { type: "tick" });
    expect(s.elapsed).toBe(2);
  });
});
