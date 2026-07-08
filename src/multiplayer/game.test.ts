import { describe, expect, it } from "vitest";
import {
  applyGuess,
  buildOrder,
  finalizeRound,
  finishedIds,
  isRoundOver,
  ROOM_CONFIG,
  type Round,
  roundResults,
  scoreRound,
  startRound,
} from "./game";
import type { RosterEntry } from "./protocol";

const roster: RosterEntry[] = [
  { istat: "1", name: "Big", population: 100000 },
  { istat: "2", name: "Mid", population: 10000 },
  { istat: "3", name: "Small", population: 1000 },
  { istat: "4", name: "Tiny", population: 100 },
];

describe("buildOrder", () => {
  it("returns exactly `rounds` targets (capped at roster size)", () => {
    expect(buildOrder(roster, 3, () => 0)).toHaveLength(3);
    expect(buildOrder(roster, 99, () => 0)).toHaveLength(4);
  });

  it("is deterministic with an injected rng and yields valid istats", () => {
    const order = buildOrder(roster, 4, () => 0.0);
    const istats = order.map((t) => t.istat).sort();
    expect(istats).toEqual(["1", "2", "3", "4"]);
  });
});

describe("scoreRound", () => {
  it("awards the attempt tier plus a full speed bonus at t=0", () => {
    expect(scoreRound(1, 0, 25000)).toBe(ROOM_CONFIG.base[0] + 250);
    expect(scoreRound(2, 0, 25000)).toBe(ROOM_CONFIG.base[1] + 250);
    expect(scoreRound(3, 0, 25000)).toBe(ROOM_CONFIG.base[2] + 250);
  });

  it("gives no speed bonus at the deadline, and base only", () => {
    expect(scoreRound(1, 25000, 25000)).toBe(ROOM_CONFIG.base[0]);
  });

  it("decays the speed bonus linearly", () => {
    expect(scoreRound(1, 12500, 25000)).toBe(ROOM_CONFIG.base[0] + 125);
  });

  it("scores wrong / timeout (null) as zero", () => {
    expect(scoreRound(null, 0, 25000)).toBe(0);
  });
});

const target = { istat: "1", name: "Big" };
const round = (): Round => startRound(target, 0, 1000, 25000);

describe("applyGuess", () => {
  it("scores a correct first-try guess and finishes the player", () => {
    const {
      round: r,
      correct,
      attemptsLeft,
    } = applyGuess(round(), "p1", "1", 1000);
    expect(correct).toBe(true);
    expect(attemptsLeft).toBe(0);
    expect(r.players.p1).toMatchObject({ finished: true, correct: true });
    expect(r.players.p1.points).toBe(ROOM_CONFIG.base[0] + 250);
  });

  it("counts wrong guesses and keeps the player in until 3 misses", () => {
    let r = round();
    let out = applyGuess(r, "p1", "9", 1000);
    expect(out.correct).toBe(false);
    expect(out.attemptsLeft).toBe(2);
    r = out.round;
    out = applyGuess(r, "p1", "8", 1000);
    expect(out.attemptsLeft).toBe(1);
    r = out.round;
    out = applyGuess(r, "p1", "7", 1000);
    expect(out.attemptsLeft).toBe(0);
    expect(out.round.players.p1).toMatchObject({
      finished: true,
      correct: false,
      points: 0,
      attempts: 3,
    });
  });

  it("can score a correct guess on the 2nd attempt", () => {
    let r = round();
    r = applyGuess(r, "p1", "9", 1000).round;
    const out = applyGuess(r, "p1", "1", 1000);
    expect(out.correct).toBe(true);
    expect(out.round.players.p1.points).toBe(ROOM_CONFIG.base[1] + 250);
  });

  it("ignores guesses after the player has finished", () => {
    let r = round();
    r = applyGuess(r, "p1", "1", 1000).round; // correct → finished
    const out = applyGuess(r, "p1", "9", 1000);
    expect(out.ignored).toBe(true);
    expect(out.round.players.p1.correct).toBe(true);
  });
});

describe("isRoundOver", () => {
  it("is true only when all active players have finished", () => {
    let r = round();
    r = applyGuess(r, "p1", "1", 1000).round;
    expect(isRoundOver(r, ["p1", "p2"])).toBe(false);
    r = applyGuess(r, "p2", "1", 1000).round;
    expect(isRoundOver(r, ["p1", "p2"])).toBe(true);
  });

  it("is false for an empty active set (nobody connected)", () => {
    expect(isRoundOver(round(), [])).toBe(false);
  });

  it("ignores a disconnected player who never answered", () => {
    let r = round();
    r = applyGuess(r, "p1", "1", 1000).round;
    // p2 disconnected → not in active set → round is over
    expect(isRoundOver(r, ["p1"])).toBe(true);
  });
});

describe("finalizeRound", () => {
  it("marks unfinished active players as finished with zero points", () => {
    let r = round();
    r = applyGuess(r, "p1", "1", 1000).round;
    r = finalizeRound(r, ["p1", "p2"], 9000);
    expect(r.players.p2).toMatchObject({ finished: true, points: 0 });
    expect(r.players.p1.correct).toBe(true);
    expect(finishedIds(r).sort()).toEqual(["p1", "p2"]);
  });
});

describe("roundResults", () => {
  it("summarises each player's outcome", () => {
    let r = round();
    r = applyGuess(r, "p1", "1", 1000).round;
    r = applyGuess(r, "p2", "9", 1000).round;
    const results = roundResults(r).sort((a, b) => a.id.localeCompare(b.id));
    expect(results[0]).toMatchObject({ id: "p1", correct: true });
    expect(results[1]).toMatchObject({ id: "p2", correct: false, attempts: 1 });
  });
});
