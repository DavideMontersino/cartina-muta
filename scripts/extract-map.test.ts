import { merge } from "topojson-client";
import { topology } from "topojson-server";
import { describe, expect, it } from "vitest";
import {
  computeOverviewFeatures,
  type Geometry,
  type Ring,
  type SourceCollection,
} from "./extract-map";

/** True if any two non-adjacent edges of the ring cross (a self-intersecting/bowtie ring). */
function isSimpleRing(ring: Ring): boolean {
  const ccw = (a: Ring[number], b: Ring[number], c: Ring[number]) =>
    (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  const segmentsCross = (
    p1: Ring[number],
    p2: Ring[number],
    p3: Ring[number],
    p4: Ring[number],
  ) =>
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);

  const n = ring.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      if (i === 0 && j === n - 2) continue; // adjacent at the closing vertex
      if (segmentsCross(ring[i], ring[i + 1], ring[j], ring[j + 1]))
        return false;
    }
  }
  return true;
}

function isSimpleGeometry(geom: Geometry): boolean {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polys.every((poly) => poly.every(isSimpleRing));
}

/**
 * A single municipality whose border zigzags every ~180m (teeth 0.0005°
 * apart) with a ~550m amplitude (0.005°) — the same kind of high-frequency
 * wiggle real ISTAT municipality borders have. Small relative to the merged
 * national overview, but large relative to the old naive rounding grid
 * (~1.1km), so a naive per-vertex round corrupts it into a self-intersecting
 * ring (see the "old (pre-fix) approach" case below).
 */
function zigzagRing(
  teeth: number,
  toothHeight: number,
  toothWidth: number,
): Ring {
  const ring: Ring = [[0, 0]];
  let y = 0;
  for (let i = 0; i < teeth; i++) {
    y += toothHeight;
    ring.push([i % 2 === 0 ? toothWidth : 0, y]);
  }
  ring.push([toothWidth + 0.05, y]);
  ring.push([toothWidth + 0.05, 0]);
  ring.push([0, 0]);
  return ring;
}

function makeFixture(): SourceCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "Comune Test",
          prov_name: "Provincia Test",
          prov_acr: "ZZ",
          reg_name: "Regione Test",
          com_istat_code: "000001",
        },
        geometry: {
          type: "Polygon",
          coordinates: [zigzagRing(300, 0.0005, 0.005)],
        },
      },
    ],
  };
}

describe("computeOverviewFeatures", () => {
  it("never emits a self-intersecting ring for a finely zigzagged border", () => {
    const src = makeFixture();
    const features = computeOverviewFeatures(src, (acr) => acr.toLowerCase());

    expect(features).toHaveLength(1);
    expect(isSimpleGeometry(features[0].geometry)).toBe(true);
  });

  it("regression: the pre-fix approach (coarse quantization + naive rounding) did self-intersect on this fixture", async () => {
    // Reproduces the pre-fix buildOverview pipeline: quantize at 2000 cells,
    // merge, then round each vertex independently to 2 decimals — no
    // topology-aware simplification. Confirms the fixture above is a real
    // regression case, not a fixture that happens to pass either way.
    const src = makeFixture();
    const inputFeatures = src.features.map((f) => ({
      type: "Feature" as const,
      properties: {
        pid: f.properties.prov_acr.toLowerCase(),
        name: f.properties.prov_name,
      },
      geometry: f.geometry,
    }));
    const topo = topology(
      // biome-ignore lint/suspicious/noExplicitAny: topojson types don't cover raw FeatureCollection input.
      { munis: { type: "FeatureCollection", features: inputFeatures } as any },
      2000,
      // biome-ignore lint/suspicious/noExplicitAny: topojson types are loose here.
    ) as any;
    const geometry = merge(topo, topo.objects.munis.geometries) as Geometry;

    const roundTo = (n: number, places: number) => Number(n.toFixed(places));
    const roundRing = (ring: Ring): Ring => {
      const out: Ring = [];
      for (const [lng, lat] of ring) {
        const p: [number, number] = [roundTo(lng, 2), roundTo(lat, 2)];
        const prev = out[out.length - 1];
        if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
      }
      return out;
    };
    const polys =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;
    const rounded: Geometry =
      geometry.type === "Polygon"
        ? { type: "Polygon", coordinates: polys[0].map(roundRing) }
        : {
            type: "MultiPolygon",
            coordinates: polys.map((poly) => poly.map(roundRing)),
          };

    expect(isSimpleGeometry(rounded)).toBe(false);
  });
});
