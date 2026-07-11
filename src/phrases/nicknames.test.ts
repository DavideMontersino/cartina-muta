import { describe, expect, it } from "vitest";
import { nicknameFor } from "./nicknames";

describe("nicknameFor", () => {
  it("returns a phrase from the national pool for a country label", () => {
    expect(nicknameFor("Francia")).not.toBeNull();
    expect(nicknameFor("Svizzera")).not.toBeNull();
    expect(nicknameFor("Austria")).not.toBeNull();
  });

  it("returns a phrase from the national pool for a region label", () => {
    expect(nicknameFor("Liguria")).not.toBeNull();
  });

  it("returns a phrase for a province label with its own national pool entry", () => {
    expect(nicknameFor("Torino")).not.toBeNull();
    expect(nicknameFor("Cuneo")).not.toBeNull();
    expect(nicknameFor("Savona")).not.toBeNull();
  });

  it("falls back to the region pool for a province without its own pool entry", () => {
    // Vercelli is a Piedmontese province with no direct pool; falls back to PIEDMONT.
    expect(nicknameFor("Vercelli")).not.toBeNull();
  });

  it("returns null for sea labels with no pool", () => {
    expect(nicknameFor("Mar Ligure")).toBeNull();
    expect(nicknameFor("Mar Mediterraneo")).toBeNull();
  });

  it("returns null for an unknown label", () => {
    expect(nicknameFor("Totally Unknown")).toBeNull();
  });

  it("includes province-specific phrases when provinceId is given", () => {
    // cn has a pool for TORINO; the combined pool is non-empty.
    expect(nicknameFor("Torino", "cn")).not.toBeNull();
    // ge has a pool for LA_SPEZIA, which has no national pool — province only.
    expect(nicknameFor("La Spezia", "ge")).not.toBeNull();
  });

  it("falls back to region pool for La Spezia without a province context", () => {
    // LA_SPEZIA has no national pool, but it's in Liguria which does have one.
    expect(nicknameFor("La Spezia")).not.toBeNull();
  });
});
