import { describe, expect, it } from "vitest";
import type { MapDefinition } from "../maps/types";
import {
  createGame,
  currentTarget,
  ENERGY_CONFIG,
  type GameConfig,
  reducer,
  shuffle,
  weightedShuffle,
} from "./engine";

/** A `size x size` square centred at `(lon, lat) x 10` degrees apart, so tests can pick points reliably inside/outside/far from each region. */
const squareAt = (lon: number, lat: number, size = 4) => ({
  type: "Polygon" as const,
  coordinates: [
    [
      [lon - size / 2, lat - size / 2],
      [lon - size / 2, lat + size / 2],
      [lon + size / 2, lat + size / 2],
      [lon + size / 2, lat - size / 2],
      [lon - size / 2, lat - size / 2],
    ],
  ],
});

const fakeMap = (n: number, populations?: number[]): MapDefinition => ({
  id: "test",
  name: "Test",
  unit: { singular: "regione", plural: "regioni" },
  features: Array.from({ length: n }, (_, i) => ({
    name: `R${i}`,
    istat: String(i),
    geometry: { type: "Polygon", coordinates: [] },
    population: populations?.[i] ?? 1,
    centroid: [i * 10, 0] as [number, number],
  })),
});

/** Same as `fakeMap`, but with real (non-degenerate) square geometry so point-in-polygon checks work. */
const fakeGeoMap = (n: number): MapDefinition => ({
  id: "test",
  name: "Test",
  unit: { singular: "comune", plural: "comuni" },
  features: Array.from({ length: n }, (_, i) => ({
    name: `R${i}`,
    istat: String(i),
    geometry: squareAt(i * 10, 0),
    population: 1,
    centroid: [i * 10, 0] as [number, number],
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

describe("weightedShuffle", () => {
  it("returns a permutation of 0..n-1 regardless of population skew", () => {
    const out = weightedShuffle([1, 4, 100, 2, 1000], () => 0.37);
    expect([...out].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("picks proportionally to population^alpha at each step", () => {
    // With a constant mid-range rng, the heavier of the remaining items wins
    // each draw (worked by hand): depth 0 (alpha=1, weights [1,4,100],
    // total=105) lands in the population-100 bucket; depth 1 (alpha=0.98,
    // weights [1, 4^0.98], total≈4.86) lands in the population-4 bucket.
    const out = weightedShuffle([1, 4, 100], () => 0.5);
    expect(out).toEqual([2, 1, 0]);
  });

  it("is uniform (order-independent of population) when all populations are equal", () => {
    const out = weightedShuffle([1, 1, 1, 1], () => 0);
    expect(out).toEqual([0, 1, 2, 3]);
  });
});

// Deterministic RNG for weightedShuffle so energy-mode order is the identity
// permutation (see weightedShuffle's "uniform populations" case above).
const noWeightRng = () => 0;

const startEnergy = (n: number): GameConfig => ({
  map: fakeGeoMap(n),
  mode: { kind: "energy" },
});

describe("reducer — energy mode", () => {
  it("starts at full energy with zero score", () => {
    const s = createGame(startEnergy(3), noWeightRng);
    expect(s.energy).toBe(ENERGY_CONFIG.start);
    expect(s.score).toBe(0);
    expect(s.attempts).toBe(0);
  });

  it("awards full first-try score and refill for tapping the correct comune", () => {
    let s = createGame(startEnergy(3), noWeightRng);
    const target = currentTarget(s) as number;
    s = reducer(s, { type: "guess", index: target, roundElapsedMs: 500 });

    expect(s.status[target]).toBe("found");
    expect(s.scoreBreakdown).toEqual({
      base: ENERGY_CONFIG.attemptBase[0],
      streakMultiplier: 1,
      speedBonus: ENERGY_CONFIG.speedBonus,
      firstTryBonus: ENERGY_CONFIG.firstTryBullseyeBonus,
      total:
        ENERGY_CONFIG.attemptBase[0] +
        ENERGY_CONFIG.speedBonus +
        ENERGY_CONFIG.firstTryBullseyeBonus,
    });
    expect(s.score).toBe(s.scoreBreakdown?.total);
    expect(s.energy).toBe(ENERGY_CONFIG.start); // already at max, refill clamps
  });

  it("does not award the speed bonus past the threshold", () => {
    let s = createGame(startEnergy(3), noWeightRng);
    const target = currentTarget(s) as number;
    s = reducer(s, {
      type: "guess",
      index: target,
      roundElapsedMs: ENERGY_CONFIG.speedBonusThresholdMs,
    });
    expect(s.scoreBreakdown?.speedBonus).toBe(0);
  });

  it("charges energy on a wrong comune tap, flags the clicked region, without advancing", () => {
    let s = createGame(startEnergy(3), noWeightRng);
    const target = currentTarget(s) as number;
    const wrong = (target + 1) % 3;

    s = reducer(s, { type: "guess", index: wrong, roundElapsedMs: 1000 });

    expect(currentTarget(s)).toBe(target);
    expect(s.attempts).toBe(1);
    expect(s.energy).toBe(ENERGY_CONFIG.start - ENERGY_CONFIG.wrongAttemptCost);
    expect(s.feedback?.correct).toBe(false);
    // The wrongly-tapped comune is reported so the UI can flash it red.
    expect(s.feedback?.index).toBe(wrong);
    // Distance/direction come from the two saved centroids (fake map centroids
    // sit at [i*10, 0], so the wrong comune is a real distance east/west away).
    expect(s.feedback?.distanceKm).toBeGreaterThan(0);
    expect(s.feedback?.bearingDeg).toBeGreaterThanOrEqual(0);
  });

  it("reveals and advances after the 3rd miss, without a full skip penalty", () => {
    let s = createGame(startEnergy(3), noWeightRng);
    const target = currentTarget(s) as number;
    const wrong = (target + 1) % 3;
    const wrongGuess = () =>
      (s = reducer(s, { type: "guess", index: wrong, roundElapsedMs: 1000 }));

    wrongGuess();
    wrongGuess();
    expect(currentTarget(s)).toBe(target);
    wrongGuess();

    expect(s.status[target]).toBe("missed");
    expect(s.missed).toBe(1);
    expect(s.attempts).toBe(0); // reset for the next target
    expect(currentTarget(s)).not.toBe(target);
    expect(s.energy).toBe(
      ENERGY_CONFIG.start - 3 * ENERGY_CONFIG.wrongAttemptCost,
    );
  });

  it("applies the streak multiplier once the correct-streak reaches the double/triple thresholds", () => {
    let s = createGame(startEnergy(10), noWeightRng);
    for (let i = 0; i < ENERGY_CONFIG.streak.doubleAt; i++) {
      const target = currentTarget(s) as number;
      s = reducer(s, {
        type: "guess",
        index: target,
        roundElapsedMs: 1000, // past the speed-bonus threshold to isolate the multiplier
      });
    }
    expect(s.correctStreak).toBe(ENERGY_CONFIG.streak.doubleAt);
    expect(s.scoreBreakdown?.streakMultiplier).toBe(2);
  });

  it("ends the run when a wrong tap drains energy to zero", () => {
    let s = createGame(startEnergy(3), noWeightRng);
    s = { ...s, energy: ENERGY_CONFIG.wrongAttemptCost };
    const target = currentTarget(s) as number;
    const wrong = (target + 1) % 3;

    s = reducer(s, { type: "guess", index: wrong, roundElapsedMs: 1000 });

    expect(s.energy).toBe(0);
    expect(s.phase).toBe("finished");
  });

  it("skip reveals the target and advances without costing energy", () => {
    let s = createGame(startEnergy(3), noWeightRng);
    const target = currentTarget(s) as number;
    s = reducer(s, { type: "skip" });

    expect(s.status[target]).toBe("missed");
    expect(s.energy).toBe(ENERGY_CONFIG.start);
    expect(s.attempts).toBe(0);
    expect(currentTarget(s)).not.toBe(target);
  });

  it("drains energy on tick, at an increasing rate, and ends the run at zero", () => {
    let s = createGame(startEnergy(3), noWeightRng);
    s = reducer(s, { type: "tick" });
    expect(s.energy).toBeCloseTo(
      ENERGY_CONFIG.start - ENERGY_CONFIG.drainPerSecond,
      6,
    );

    s = { ...s, elapsed: 60 };
    const before = s.energy;
    s = reducer(s, { type: "tick" });
    const fasterDrain = before - s.energy;
    expect(fasterDrain).toBeCloseTo(
      ENERGY_CONFIG.drainPerSecond * (1 + ENERGY_CONFIG.drainGrowthPerMinute),
      6,
    );

    s = { ...s, energy: 0.5 };
    s = reducer(s, { type: "tick" });
    expect(s.energy).toBe(0);
    expect(s.phase).toBe("finished");
  });
});
