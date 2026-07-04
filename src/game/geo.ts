import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import type { MapDefinition } from "../maps/types";

export const VIEW_W = 1000;
export const VIEW_H = 800;

export interface ProjectedFeature {
  /** SVG path `d` string. */
  d: string;
  /** Label anchor at the projected centroid. */
  cx: number;
  cy: number;
}

export interface ProjectedMap {
  features: ProjectedFeature[];
  /** Converts a point in the fixed viewBox coordinate space to [lon, lat], or null if outside the projection's invertible range. */
  invert: (point: [number, number]) => [number, number] | null;
}

/**
 * Project a map's features into a fixed viewBox once. The SVG then scales
 * responsively via CSS while keeping a stable internal coordinate system.
 */
export function projectMap(map: MapDefinition, padding = 24): ProjectedMap {
  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: map.features.map(
      (f): Feature => ({
        type: "Feature",
        properties: null,
        geometry: f.geometry,
      }),
    ),
  };

  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [VIEW_W - padding, VIEW_H - padding],
    ],
    collection,
  );
  const path = geoPath(projection);

  const features = map.features.map((f) => {
    const feature: Feature = {
      type: "Feature",
      properties: null,
      geometry: f.geometry,
    };
    const [cx, cy] = path.centroid(feature);
    return { d: path(feature) ?? "", cx, cy };
  });

  return {
    features,
    invert: (point) => projection.invert?.(point) ?? null,
  };
}
