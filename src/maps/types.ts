import type {
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
} from "geojson";

/** One municipality (comune) with its border geometry. */
export interface MapFeature {
  name: string;
  /** ISTAT municipality code — stable id, safe for dedup/analytics. */
  istat: string;
  geometry: Polygon | MultiPolygon;
  /** Resident population (ISTAT). Falls back to 1 (uniform weight) when unknown. */
  population: number;
  /** Geographic centroid [lon, lat], used for distance-based scoring. */
  centroid: [number, number];
}

/** A playable map: a set of regions to identify by clicking. */
export interface MapDefinition {
  id: string;
  /** Shown as the game title, e.g. "Provincia di Cuneo". */
  name: string;
  /** What a single region is called, e.g. "comune" / "comuni". */
  unit: { singular: string; plural: string };
  features: MapFeature[];
}

/** Shape of the extracted comuni.json files produced by scripts/extract-map.ts. */
export interface ComuniCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      name: string;
      istat: string;
      /** Absent in data extracted before population join support; loadMap() falls back to 1. */
      population?: number;
      /** Absent in data extracted before centroid support; loadMap() computes it from the geometry. */
      centroid?: [number, number];
    };
    geometry: Polygon | MultiPolygon;
  }>;
}

/** Lightweight per-province entry from provinces.json (always loaded). */
export interface ProvinceMeta {
  /** Lowercased 2-letter ISTAT acronym, e.g. "cn". */
  id: string;
  /** Province name, e.g. "Cuneo". */
  name: string;
  /** Region name, e.g. "Piemonte". */
  region: string;
  /** Number of municipalities in the province. */
  count: number;
}

/** Shape of overview.json — dissolved province boundaries for the picker map. */
export interface OverviewCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { id: string; name: string };
    geometry: Polygon | MultiPolygon;
  }>;
}

/* ── Optional terrain layers (baked by scripts/extract-{relief,water,context}) */

/**
 * One hypsometric elevation band, baked as vector contours (scripts/extract-
 * relief.ts). `level` is the band index (0 = lowest); `min`/`max` are its
 * elevation bounds in metres (`max` null for the top band). Rendered stacked
 * low→high and tinted by level in CSS, so the palette is retunable without a
 * re-bake.
 */
export interface ReliefBand {
  type: "Feature";
  properties: { level: number; min: number; max: number | null };
  geometry: Polygon | MultiPolygon;
}
export interface ReliefCollection {
  type: "FeatureCollection";
  features: ReliefBand[];
}

/** A river/lake feature from OpenStreetMap (see scripts/extract-water.ts). */
export type WaterKind = "river" | "stream" | "canal" | "lake" | "reservoir";
export interface WaterFeature {
  type: "Feature";
  properties: { kind: WaterKind; name?: string };
  geometry: LineString | MultiLineString | Polygon | MultiPolygon;
}
export interface WaterCollection {
  type: "FeatureCollection";
  features: WaterFeature[];
}

/**
 * Context around the played province: neighbouring provinces (dissolved, no
 * comuni borders), adjacent foreign countries, and outside-only labels
 * (neighbour / country / sea names). Baked by scripts/extract-context.ts.
 */
export type ContextKind = "province" | "country" | "sea";
export interface ContextShape {
  type: "Feature";
  properties: { kind: ContextKind; name: string };
  geometry: Polygon | MultiPolygon;
}
export interface ContextLabel {
  /** Label text, e.g. "Torino", "Francia", "Mar Ligure". */
  name: string;
  kind: "province" | "country" | "sea";
  /** WGS84 anchor `[lon, lat]`, guaranteed outside the target province. */
  at: [number, number];
}
export interface ContextCollection {
  type: "FeatureCollection";
  features: ContextShape[];
  labels: ContextLabel[];
}
