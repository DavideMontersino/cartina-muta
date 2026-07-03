import { cuneoMap } from "./cuneo";
import type { MapDefinition } from "./types";

/**
 * All playable maps. To add a new area:
 *   1. Add its province to scripts/extract-map.ts and run `npm run extract-map`.
 *   2. Create src/maps/<id>/index.ts exporting a MapDefinition (see cuneo).
 *   3. Add it to this array.
 */
export const MAPS: MapDefinition[] = [cuneoMap];

export const getMap = (id: string): MapDefinition | undefined =>
  MAPS.find((m) => m.id === id);
