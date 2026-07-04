import { describe, expect, it } from "vitest";
import { isValidEmail, validateSignIn } from "./validation";

describe("isValidEmail", () => {
  it("accepts plausible addresses", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("  player@example.com  ")).toBe(true);
  });
  it("rejects malformed ones", () => {
    for (const bad of ["", "nope", "a@b", "a b@c.com", "@x.com", "x@.com"]) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});

describe("validateSignIn", () => {
  it("trims and returns cleaned fields when valid", () => {
    const r = validateSignIn({ name: "  Ada  ", email: " ada@x.com " });
    expect(r).toEqual({ ok: true, name: "Ada", email: "ada@x.com" });
  });
  it("requires a name (it is the leaderboard label)", () => {
    const r = validateSignIn({ name: "   ", email: "ada@x.com" });
    expect(r.ok).toBe(false);
  });
  it("rejects an overlong name", () => {
    const r = validateSignIn({ name: "x".repeat(41), email: "ada@x.com" });
    expect(r.ok).toBe(false);
  });
  it("rejects a bad email", () => {
    const r = validateSignIn({ name: "Ada", email: "nope" });
    expect(r.ok).toBe(false);
  });
});
