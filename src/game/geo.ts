import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import type { MapDefinition } from "../maps/types";

export const VIEW_W = 1000;
export const VIEW_H = 800;

/** viewBox centre — pan/zoom scales about this point (see usePanZoom). */
export const CENTER_X = VIEW_W / 2;
export const CENTER_Y = VIEW_H / 2;

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

/** The whole-map view: no pan, no zoom. */
export const IDENTITY_TRANSFORM: ViewTransform = { x: 0, y: 0, scale: 1 };

/**
 * The pan/zoom transform that lands viewBox point `(cx, cy)` on the viewport
 * centre at `scale`. Inverts the `<g>` transform used by usePanZoom
 * (`translate(x+CENTER, y+CENTER) scale(s) translate(-CENTER,-CENTER)`), whose
 * on-screen mapping is `p -> (p - CENTER) * s + CENTER + (x, y)`; solving for
 * the offset that puts `(cx, cy)` at `(CENTER_X, CENTER_Y)` gives the below.
 */
export function centerOn(cx: number, cy: number, scale: number): ViewTransform {
  return {
    scale,
    x: (CENTER_X - cx) * scale,
    y: (CENTER_Y - cy) * scale,
  };
}

export interface ProjectedFeature {
  /** SVG path `d` string. */
  d: string;
  /** Label anchor at the projected centroid. */
  cx: number;
  cy: number;
}

export interface ProjectedMap {
  features: ProjectedFeature[];
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

  return { features };
}
