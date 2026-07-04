import type { MultiPolygon, Polygon } from "geojson";

/** One municipality (comune) with its border geometry. */
export interface MapFeature {
  name: string;
  /** ISTAT municipality code — stable id, safe for dedup/analytics. */
  istat: string;
  geometry: Polygon | MultiPolygon;
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
    properties: { name: string; istat: string };
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
