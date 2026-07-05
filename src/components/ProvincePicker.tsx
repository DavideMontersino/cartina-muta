import { geoIdentity, geoPath } from "d3-geo";
import type { Feature, Geometry, Position } from "geojson";
import { useCallback, useMemo } from "react";
import type { OverviewCollection } from "../maps/types";
import { usePanZoom } from "./usePanZoom";

const W = 620;
const H = 720;
/**
 * The dissolved province boundaries come from a topology merge whose ring
 * winding isn't consistent for d3's *spherical* geometry (a few provinces would
 * fill the whole globe). We sidestep that by rendering with a *planar*
 * projection: pre-scale longitude by cos(lat0) for a correct equirectangular
 * aspect, then fit with geoIdentity, which uses even-odd fill and ignores
 * winding entirely.
 */
const LAT0 = 42; // ~central Italy
const LON_SCALE = Math.cos((LAT0 * Math.PI) / 180);

const projectPosition = ([lon, lat]: Position): Position => [
  lon * LON_SCALE,
  lat,
];

function planarGeometry(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        ring.map(projectPosition),
      ),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => ring.map(projectPosition)),
      ),
    };
  }
  return geometry;
}

interface ProvincePickerProps {
  overview: OverviewCollection;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Clickable national map: one dissolved shape per province. */
export function ProvincePicker({
  overview,
  selectedId,
  onSelect,
}: ProvincePickerProps) {
  const shapes = useMemo(() => {
    const features: Feature[] = overview.features.map((f) => ({
      type: "Feature",
      properties: { id: f.properties.id, name: f.properties.name },
      geometry: planarGeometry(f.geometry),
    }));
    const projection = geoIdentity()
      .reflectY(true)
      .fitExtent(
        [
          [8, 8],
          [W - 8, H - 8],
        ],
        { type: "FeatureCollection", features },
      );
    const path = geoPath(projection);
    return features.map((f) => ({
      id: (f.properties as { id: string }).id,
      name: (f.properties as { name: string }).name,
      d: path(f) ?? "",
    }));
  }, [overview]);

  const handleTap = useCallback(
    (index: number) => {
      const shape = shapes[index];
      if (shape) onSelect(shape.id);
    },
    [shapes, onSelect],
  );

  const { svgRef, transformAttr, style, handlers } = usePanZoom({
    enabled: true,
    centerX: W / 2,
    centerY: H / 2,
    onTap: handleTap,
  });

  return (
    <svg
      ref={svgRef}
      className="picker"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Mappa delle province italiane"
      preserveAspectRatio="xMidYMid meet"
      style={style}
      {...handlers}
    >
      <title>Mappa delle province italiane</title>
      <g transform={transformAttr}>
        {shapes.map((s, i) => (
          <path
            key={s.id}
            data-index={i}
            d={s.d}
            className={`picker__prov ${s.id === selectedId ? "picker__prov--active" : ""}`}
          >
            <title>{s.name}</title>
          </path>
        ))}
      </g>
    </svg>
  );
}
