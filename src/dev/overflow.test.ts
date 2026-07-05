import { describe, expect, it } from "vitest";
import { describeOverflow, hasOverflow, measureOverflow } from "./overflow";

describe("measureOverflow", () => {
  it("reports no overflow when content fits the viewport", () => {
    expect(measureOverflow(800, 600, 800, 600)).toEqual({ x: 0, y: 0 });
  });

  it("reports no overflow when content is smaller than the viewport", () => {
    expect(measureOverflow(400, 300, 800, 600)).toEqual({ x: 0, y: 0 });
  });

  it("measures vertical spill past the bottom edge", () => {
    // The classic bug: mode selector pushed below the fold on a phone.
    expect(measureOverflow(390, 900, 390, 844)).toEqual({ x: 0, y: 56 });
  });

  it("measures horizontal spill past the right edge", () => {
    expect(measureOverflow(1000, 600, 800, 600)).toEqual({ x: 200, y: 0 });
  });

  it("measures spill on both axes", () => {
    expect(measureOverflow(1000, 900, 800, 600)).toEqual({ x: 200, y: 300 });
  });
});

describe("hasOverflow", () => {
  it("is false when nothing spills", () => {
    expect(hasOverflow({ x: 0, y: 0 })).toBe(false);
  });

  it("tolerates sub-pixel rounding by default", () => {
    expect(hasOverflow({ x: 1, y: 1 })).toBe(false);
  });

  it("flags real vertical overflow", () => {
    expect(hasOverflow({ x: 0, y: 56 })).toBe(true);
  });

  it("flags real horizontal overflow", () => {
    expect(hasOverflow({ x: 200, y: 0 })).toBe(true);
  });

  it("honours a custom tolerance", () => {
    expect(hasOverflow({ x: 0, y: 8 }, 10)).toBe(false);
    expect(hasOverflow({ x: 0, y: 12 }, 10)).toBe(true);
  });
});

describe("describeOverflow", () => {
  it("summarises a single axis", () => {
    expect(describeOverflow({ x: 0, y: 56 })).toBe("56px vertical");
    expect(describeOverflow({ x: 20, y: 0 })).toBe("20px horizontal");
  });

  it("summarises both axes", () => {
    expect(describeOverflow({ x: 20, y: 56 })).toBe(
      "20px horizontal, 56px vertical",
    );
  });

  it("is empty when nothing spills", () => {
    expect(describeOverflow({ x: 0, y: 0 })).toBe("");
  });
});
