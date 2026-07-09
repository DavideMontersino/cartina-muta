import { describe, expect, it } from "vitest";
import { configuredBase } from "./client";

// Regression: CI passes `VITE_ROOMS_HTTP_BASE: ${{ vars.VITE_ROOMS_HTTP_BASE }}`,
// and an *unset* repo variable expands to an empty string. A plain `?? ` keeps
// that "", so the client would POST to a bare `/rooms` (405 — outside the
// `/api/*` Functions route) instead of falling back to same-origin `/api`.
describe("configuredBase", () => {
  it("treats unset and blank values as not configured", () => {
    expect(configuredBase(undefined)).toBeUndefined();
    expect(configuredBase("")).toBeUndefined();
    expect(configuredBase("   ")).toBeUndefined();
  });

  it("keeps a real base and trims surrounding whitespace", () => {
    expect(configuredBase("https://rooms.example.dev")).toBe(
      "https://rooms.example.dev",
    );
    expect(configuredBase("  https://rooms.example.dev  ")).toBe(
      "https://rooms.example.dev",
    );
  });
});
