import { PROVINCES } from "../maps/registry";
import type { PartialPhraseSet } from "./types";

/** Province id (e.g. "cn") -> region name (e.g. "Piemonte"). */
const regionByProvinceId: Record<string, string> = Object.fromEntries(
  PROVINCES.map((p) => [p.id, p.region]),
);

/** Region name (e.g. "Torino"'s "Piemonte") of a province, or undefined. */
export const regionOfProvince = (provinceId: string): string | undefined =>
  regionByProvinceId[provinceId];

/**
 * Region-level phrase overrides, keyed by region name. The middle layer of the
 * fallback stack: used when a comune and its province both leave an event
 * uncustomised, before dropping to the generic Italian set.
 */
export const regionPhrases: Record<string, PartialPhraseSet> = {
  Piemonte: {
    streakWrong5: [
      "Cinque sbagli di fila: la Regione Piemonte non ti assume di sicuro.",
    ],
  },
};
