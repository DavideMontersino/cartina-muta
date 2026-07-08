import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  generateCode,
  isValidCode,
  normalizeCode,
} from "./code";

describe("generateCode", () => {
  it("produces a code of the expected length from the alphabet", () => {
    const code = generateCode();
    expect(code).toHaveLength(CODE_LENGTH);
    expect(code.split("").every((c) => CODE_ALPHABET.includes(c))).toBe(true);
  });

  it("is deterministic with an injected rng", () => {
    const rng = () => 0; // always the first alphabet symbol
    expect(generateCode(rng)).toBe(CODE_ALPHABET[0].repeat(CODE_LENGTH));
  });

  it("never emits the excluded confusable characters", () => {
    let rng = 0;
    const seq = [0.1, 0.5, 0.9, 0.3, 0.7];
    const code = generateCode(() => seq[rng++ % seq.length]);
    expect(/[OIL01]/.test(code)).toBe(false);
  });
});

describe("normalizeCode", () => {
  it("uppercases and strips spaces / punctuation", () => {
    expect(normalizeCode("a b-c d")).toBe("ABCD");
  });

  it("drops characters outside the alphabet", () => {
    expect(normalizeCode("ab!o1cd")).toBe("ABCD"); // O and 1 are excluded
  });
});

describe("isValidCode", () => {
  it("accepts a freshly generated code", () => {
    expect(isValidCode(generateCode(() => 0.42))).toBe(true);
  });

  it("rejects wrong length or bad characters", () => {
    expect(isValidCode("ABC")).toBe(false);
    expect(isValidCode("ABCDE")).toBe(false);
    expect(isValidCode("ABO1")).toBe(false);
  });
});
