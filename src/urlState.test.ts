import { describe, expect, it, vi } from "vitest";
import { parseUrlState } from "./urlState";

vi.mock("./maps/registry", () => ({
  getProvince: (id: string) =>
    ["mi", "cn", "rm", "to"].includes(id) ? { id, name: "Test" } : undefined,
}));

describe("parseUrlState", () => {
  it("returns nulls when no params present", () => {
    expect(parseUrlState("")).toEqual({ provinceId: null, mode: null });
  });

  it("returns provinceId for a known province", () => {
    expect(parseUrlState("?p=mi")).toEqual({ provinceId: "mi", mode: null });
  });

  it("returns null for an unknown province", () => {
    expect(parseUrlState("?p=xyz")).toEqual({ provinceId: null, mode: null });
  });

  it("parses energy mode alongside province", () => {
    const state = parseUrlState("?p=cn&m=energy");
    expect(state.provinceId).toBe("cn");
    expect(state.mode).toEqual({ kind: "energy" });
  });

  it("parses complete mode", () => {
    expect(parseUrlState("?p=rm&m=complete").mode).toEqual({
      kind: "complete",
    });
  });

  it("parses timer mode with duration", () => {
    expect(parseUrlState("?p=to&m=timer:60").mode).toEqual({
      kind: "timer",
      durationSeconds: 60,
    });
  });

  it("returns null mode for an unrecognised mode string", () => {
    expect(parseUrlState("?p=mi&m=bogus").mode).toBeNull();
  });

  it("returns null mode for a timer with unsupported duration", () => {
    expect(parseUrlState("?p=mi&m=timer:99").mode).toBeNull();
  });

  it("returns null provinceId even when mode is valid", () => {
    const state = parseUrlState("?m=energy");
    expect(state.provinceId).toBeNull();
    expect(state.mode).toEqual({ kind: "energy" });
  });
});
