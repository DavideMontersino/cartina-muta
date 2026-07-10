import { describe, expect, it } from "vitest";
import { nicknameFor } from "./nicknames";

describe("nicknameFor", () => {
  it("returns the direct nickname for a region label", () => {
    expect(nicknameFor("Liguria")).toBe("Terra dei tirchi");
  });

  it("returns a country nickname", () => {
    expect(nicknameFor("Francia")).toBe("I cugini boriosi");
  });

  it("falls back to the region nickname for a province in it", () => {
    // Imperia and Savona are Ligurian provinces with no nickname of their own.
    expect(nicknameFor("Imperia")).toBe("Terra dei tirchi");
    expect(nicknameFor("Savona")).toBe("Terra dei tirchi");
  });

  it("returns null when neither the label nor its region has a nickname", () => {
    expect(nicknameFor("Torino")).toBeNull();
    expect(nicknameFor("Mar Ligure")).toBeNull();
    expect(nicknameFor("Totally Unknown")).toBeNull();
  });
});
