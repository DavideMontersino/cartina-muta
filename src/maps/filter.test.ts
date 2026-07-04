import { describe, expect, it } from "vitest";
import { filterProvinces, normalize } from "./filter";
import type { ProvinceMeta } from "./types";

const provinces: ProvinceMeta[] = [
  { id: "cn", name: "Cuneo", region: "Piemonte", count: 247 },
  { id: "to", name: "Torino", region: "Piemonte", count: 312 },
  { id: "fc", name: "Forlì-Cesena", region: "Emilia-Romagna", count: 30 },
  { id: "mi", name: "Milano", region: "Lombardia", count: 133 },
  { id: "ca", name: "Cagliari", region: "Sardegna", count: 17 },
];

describe("normalize", () => {
  it("lowercases and strips accents", () => {
    expect(normalize("Forlì")).toBe("forli");
    expect(normalize("  MILANO ")).toBe("milano");
  });
});

describe("filterProvinces", () => {
  it("returns the first N provinces for an empty query", () => {
    expect(filterProvinces(provinces, "", 3)).toHaveLength(3);
    expect(filterProvinces(provinces, "   ")).toHaveLength(provinces.length);
  });

  it("matches accent-insensitively", () => {
    const r = filterProvinces(provinces, "forli");
    expect(r.map((p) => p.id)).toEqual(["fc"]);
  });

  it("includes substring matches when nothing has that prefix", () => {
    const r = filterProvinces(provinces, "no");
    // No province starts with "no"; Milano and Torino both contain it.
    expect(r.map((p) => p.id).sort()).toEqual(["mi", "to"]);
  });

  it("prefers name prefix over region match", () => {
    const r = filterProvinces(provinces, "ca");
    // "Cagliari" starts with "ca" -> rank 0; nothing else should outrank it.
    expect(r[0].id).toBe("ca");
  });

  it("matches by 2-letter id", () => {
    const r = filterProvinces(provinces, "mi");
    expect(r[0].id).toBe("mi");
  });

  it("matches by region name", () => {
    const r = filterProvinces(provinces, "lombardia");
    expect(r.map((p) => p.id)).toEqual(["mi"]);
  });

  it("respects the limit", () => {
    const r = filterProvinces(provinces, "a", 2);
    expect(r.length).toBeLessThanOrEqual(2);
  });
});
