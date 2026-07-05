import { describe, expect, it } from "vitest";
import { validateScoreSubmission } from "./validation";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    provinceId: "cn",
    mode: { kind: "timer", durationSeconds: 60 },
    found: 40,
    missed: 5,
    mistakes: 3,
    elapsedMs: 58234,
    actionLog: [
      {
        tMs: 812,
        type: "guess",
        targetIstat: "004078",
        guessIstat: "004078",
        correct: true,
      },
      {
        tMs: 1500,
        type: "guess",
        targetIstat: "004050",
        guessIstat: "004022",
        correct: false,
      },
      { tMs: 4200, type: "skip", targetIstat: "004050" },
    ],
    ...overrides,
  };
}

describe("validateScoreSubmission", () => {
  it("accepts a well-formed timer submission and derives totalRegions", () => {
    const result = validateScoreSubmission(basePayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalRegions).toBe(247);
      expect(result.value.actionLog).toHaveLength(3);
    }
  });

  it("accepts a well-formed complete-mode submission", () => {
    const result = validateScoreSubmission(
      basePayload({ mode: { kind: "complete" }, elapsedMs: 300_000 }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown province", () => {
    expect(validateScoreSubmission(basePayload({ provinceId: "zz" })).ok).toBe(
      false,
    );
  });

  it("rejects found + missed exceeding the province's municipality count", () => {
    expect(
      validateScoreSubmission(basePayload({ found: 200, missed: 100 })).ok,
    ).toBe(false);
  });

  it("rejects a timer duration outside the allowed set", () => {
    expect(
      validateScoreSubmission(
        basePayload({ mode: { kind: "timer", durationSeconds: 45 } }),
      ).ok,
    ).toBe(false);
  });

  it("rejects elapsedMs exceeding the timer duration plus grace", () => {
    expect(
      validateScoreSubmission(basePayload({ elapsedMs: 120_000 })).ok,
    ).toBe(false);
  });

  it("rejects a malformed actionLog entry", () => {
    expect(
      validateScoreSubmission(basePayload({ actionLog: [{ type: "guess" }] }))
        .ok,
    ).toBe(false);
  });

  it("rejects an actionLog with a timestamp after elapsedMs", () => {
    expect(
      validateScoreSubmission(
        basePayload({
          actionLog: [{ tMs: 999_999, type: "skip", targetIstat: "004050" }],
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(validateScoreSubmission(null).ok).toBe(false);
    expect(validateScoreSubmission("nope").ok).toBe(false);
  });
});

describe("validateScoreSubmission — energy mode", () => {
  function energyPayload(overrides: Record<string, unknown> = {}) {
    return basePayload({
      mode: { kind: "energy" },
      score: 1250,
      elapsedMs: 90_000,
      actionLog: [
        {
          tMs: 812,
          type: "guess",
          targetIstat: "004078",
          guessIstat: "004078",
          correct: true,
        },
        {
          tMs: 1500,
          type: "guess",
          targetIstat: "004050",
          guessIstat: "004078",
          correct: false,
        },
        { tMs: 4200, type: "skip", targetIstat: "004050" },
      ],
      ...overrides,
    });
  }

  it("accepts a well-formed energy submission with a score and guess entries", () => {
    const result = validateScoreSubmission(energyPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.score).toBe(1250);
    }
  });

  it("rejects an energy submission missing a score", () => {
    const payload = energyPayload();
    delete (payload as Record<string, unknown>).score;
    expect(validateScoreSubmission(payload).ok).toBe(false);
  });

  it("rejects a negative or non-integer score", () => {
    expect(validateScoreSubmission(energyPayload({ score: -1 })).ok).toBe(
      false,
    );
    expect(validateScoreSubmission(energyPayload({ score: 1.5 })).ok).toBe(
      false,
    );
  });

  it("rejects a guess entry missing its guessIstat", () => {
    expect(
      validateScoreSubmission(
        energyPayload({
          actionLog: [
            {
              tMs: 100,
              type: "guess",
              targetIstat: "004078",
              correct: true,
            },
          ],
        }),
      ).ok,
    ).toBe(false);
  });
});
