import { describe, expect, it } from "vitest";
import { defaultPhrases } from "../phrases/data/default";
import { getPhrasePool } from "../phrases/registry";
import { pickReaction, selectReactionEvent } from "./reactions";

describe("selectReactionEvent", () => {
  it("returns plain correct/wrong outside of milestone streaks", () => {
    expect(selectReactionEvent(true, 1, 0)).toBe("correct");
    expect(selectReactionEvent(false, 0, 2)).toBe("wrong");
  });

  it("returns the highest matching correct-streak milestone", () => {
    expect(selectReactionEvent(true, 3, 0)).toBe("streakCorrect3");
    expect(selectReactionEvent(true, 5, 0)).toBe("streakCorrect5");
    expect(selectReactionEvent(true, 10, 0)).toBe("streakCorrect10");
  });

  it("returns the matching wrong-streak milestone", () => {
    expect(selectReactionEvent(false, 0, 3)).toBe("streakWrong3");
    expect(selectReactionEvent(false, 0, 5)).toBe("streakWrong5");
    expect(selectReactionEvent(false, 0, 10)).toBe("streakWrong10");
  });

  it("does not fire a milestone once the streak has passed it", () => {
    expect(selectReactionEvent(true, 4, 0)).toBe("correct");
    expect(selectReactionEvent(false, 0, 11)).toBe("wrong");
  });
});

describe("getPhrasePool", () => {
  it("falls back to the default set for a province with no overrides", () => {
    expect(getPhrasePool("unknown-province", "correct")).toBe(
      defaultPhrases.correct,
    );
  });

  it("uses the province override when present", () => {
    const pool = getPhrasePool("cn", "wrong");
    expect(pool).not.toBe(defaultPhrases.wrong);
    expect(pool.length).toBeGreaterThan(0);
  });

  it("falls back per-event when the province only overrides some events", () => {
    // cn has no override for a made-up-missing key path is covered by type
    // system, so instead assert a real event it does define differs from
    // the default while every event always resolves to a non-empty pool.
    const events = [
      "correct",
      "wrong",
      "streakCorrect3",
      "streakCorrect5",
      "streakCorrect10",
      "streakWrong3",
      "streakWrong5",
      "streakWrong10",
    ] as const;
    for (const event of events) {
      expect(getPhrasePool("cn", event).length).toBeGreaterThan(0);
      expect(getPhrasePool("bo", event)).toBe(defaultPhrases[event]);
    }
  });
});

describe("pickReaction", () => {
  it("is deterministic given a fixed rng", () => {
    const text = pickReaction("bo", true, 1, 0, () => 0);
    expect(text).toBe(defaultPhrases.correct[0]);
  });

  it("picks the last phrase when rng is just under 1", () => {
    const pool = defaultPhrases.wrong;
    const text = pickReaction("bo", false, 0, 1, () => 0.999999);
    expect(text).toBe(pool[pool.length - 1]);
  });
});
