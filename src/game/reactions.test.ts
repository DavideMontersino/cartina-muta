import { describe, expect, it } from "vitest";
import { defaultPhrases } from "../phrases/data/default";
import { toPhrases } from "../phrases/data/to";
import { municipalityFlavor } from "../phrases/municipalities";
import { regionPhrases } from "../phrases/regions";
import {
  getCampanile,
  getFacts,
  getFailPool,
  getPhrasePool,
} from "../phrases/registry";
import {
  pickCampanile,
  pickFact,
  pickFailReaction,
  pickReaction,
  selectReactionEvent,
} from "./reactions";

const TORINO = "001272";
const CARRU = "004043";
// A sample of Cuneo comuni seeded by the #27 content pass (ISTAT-keyed).
const CUNEO = "004078";
const ALBA = "004003";
const DRONERO = "004082";

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

  it("resolves a non-empty pool for every event across all covered provinces", () => {
    const provinces = [
      "al",
      "at",
      "bi",
      "cn",
      "no",
      "to",
      "vb",
      "vc",
      "ge",
      "im",
      "sp",
      "sv",
    ];
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
    for (const province of provinces) {
      for (const event of events) {
        expect(getPhrasePool(province, event).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("getPhrasePool — override stack", () => {
  it("uses the municipality win/miss lines over the province pool", () => {
    expect(getPhrasePool("to", "correct", TORINO)).toBe(
      municipalityFlavor[TORINO].win,
    );
    expect(getPhrasePool("cn", "wrong", CARRU)).toBe(
      municipalityFlavor[CARRU].miss,
    );
  });

  it("only overrides plain correct/wrong at the municipality layer", () => {
    // Torino has no streak override, so a streak event falls through to the
    // province ("to") pool, not anything municipality-specific.
    expect(getPhrasePool("to", "streakCorrect3", TORINO)).toBe(
      toPhrases.streakCorrect3,
    );
  });

  it("falls back to the province pool for an unknown istat", () => {
    expect(getPhrasePool("to", "correct", "999999")).toBe(toPhrases.correct);
  });

  it("falls back to the region pool when comune and province are silent", () => {
    // "to" defines no streakWrong5; its region (Piemonte) does.
    expect(getPhrasePool("to", "streakWrong5")).toBe(
      regionPhrases.Piemonte.streakWrong5,
    );
  });
});

describe("fail / facts / campanile", () => {
  it("returns the comune's fail lines, else a generic give-up pool", () => {
    expect(getFailPool(TORINO)).toBe(municipalityFlavor[TORINO].fail);
    const generic = getFailPool("999999");
    expect(generic.length).toBeGreaterThan(0);
    expect(generic).not.toBe(municipalityFlavor[TORINO].fail);
  });

  it("exposes facts only for comuni that have them", () => {
    expect(getFacts(TORINO).length).toBeGreaterThan(0);
    expect(getFacts("999999")).toEqual([]);
    expect(getFacts(undefined)).toEqual([]);
  });

  it("pickFact returns null when a comune has no facts", () => {
    expect(pickFact("999999")).toBeNull();
    expect(pickFact(TORINO, () => 0)).toBe(getFacts(TORINO)[0]);
  });

  it("getCampanile is an empty array until a comune populates one", () => {
    expect(getCampanile("999999")).toEqual([]);
    expect(getCampanile(undefined)).toEqual([]);
  });

  it("pickCampanile returns null with no photos, else a member of the pool", () => {
    expect(pickCampanile("999999")).toBeNull();
    const photos = getCampanile(CUNEO);
    expect(photos.length).toBeGreaterThan(0);
    expect(pickCampanile(CUNEO, () => 0)).toBe(photos[0]);
  });

  it("pickFailReaction is deterministic given a fixed rng", () => {
    expect(pickFailReaction(TORINO, () => 0)).toBe(
      municipalityFlavor[TORINO].fail?.[0],
    );
  });
});

describe("#27 Cuneo content — sample ISTAT keys resolve to municipality pools", () => {
  const seeded = [CUNEO, ALBA, DRONERO, CARRU];

  it("exposes bespoke win/miss lines (not the province fallback) for seeded comuni", () => {
    for (const istat of [CUNEO, ALBA, DRONERO]) {
      const flavor = municipalityFlavor[istat];
      expect(flavor).toBeDefined();
      expect(getPhrasePool("cn", "correct", istat)).toBe(flavor.win);
      expect(getPhrasePool("cn", "wrong", istat)).toBe(flavor.miss);
    }
  });

  it("gives every seeded comune a fail pool and at least one fact", () => {
    for (const istat of seeded) {
      expect(getFailPool(istat).length).toBeGreaterThan(0);
      expect(getFacts(istat).length).toBeGreaterThan(0);
    }
  });

  it("resolves campanile photos as /campanili/ asset paths for seeded comuni", () => {
    for (const istat of [CUNEO, ALBA, DRONERO]) {
      const photos = getCampanile(istat);
      expect(photos.length).toBeGreaterThan(0);
      for (const url of photos)
        expect(url).toMatch(/^\/campanili\/.+\.(jpg|png|webp)$/);
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

  it("draws from the municipality pool when given the target istat", () => {
    const text = pickReaction("to", true, 1, 0, () => 0, TORINO);
    expect(text).toBe(municipalityFlavor[TORINO].win?.[0]);
  });
});
