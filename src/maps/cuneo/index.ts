import type { ComuniCollection, MapDefinition } from "../types";
import comuni from "./comuni.json";

const collection = comuni as ComuniCollection;

export const cuneoMap: MapDefinition = {
  id: "cuneo",
  name: "Provincia di Cuneo",
  unit: { singular: "comune", plural: "comuni" },
  features: collection.features.map((f) => ({
    name: f.properties.name,
    istat: f.properties.istat,
    geometry: f.geometry,
  })),
};
