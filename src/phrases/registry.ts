import { alPhrases } from "./data/al";
import { atPhrases } from "./data/at";
import { biPhrases } from "./data/bi";
import { cnPhrases } from "./data/cn";
import { defaultPhrases } from "./data/default";
import { gePhrases } from "./data/ge";
import { imPhrases } from "./data/im";
import { noPhrases } from "./data/no";
import { spPhrases } from "./data/sp";
import { svPhrases } from "./data/sv";
import { toPhrases } from "./data/to";
import { vbPhrases } from "./data/vb";
import { vcPhrases } from "./data/vc";
import { municipalityFlavor } from "./municipalities";
import { regionOfProvince, regionPhrases } from "./regions";
import type { PartialPhraseSet, ReactionEvent } from "./types";

/** Province id (e.g. "cn") -> its dialect/local phrase overrides. */
const provincePhrases: Record<string, PartialPhraseSet> = {
  al: alPhrases,
  at: atPhrases,
  bi: biPhrases,
  cn: cnPhrases,
  ge: gePhrases,
  im: imPhrases,
  no: noPhrases,
  sp: spPhrases,
  sv: svPhrases,
  to: toPhrases,
  vb: vbPhrases,
  vc: vcPhrases,
};

/** Generic fallback lines for a give-up / reveal, when no comune override exists. */
const defaultFailPhrases = [
  "Ti sei arreso: eccolo qui.",
  "Peccato, era proprio questo.",
  "La prossima lo becchi.",
];

const nonEmpty = (pool: string[] | undefined): pool is string[] =>
  !!pool && pool.length > 0;

/**
 * Phrase pool for a given event, resolved through the override stack:
 * municipality (`istat`) → province → region → generic Italian set. The
 * municipality layer only customises plain `correct` (its `win` lines) and
 * plain `wrong` (its `miss` lines); streak milestones fall through to the
 * coarser layers.
 */
export function getPhrasePool(
  provinceId: string,
  event: ReactionEvent,
  istat?: string,
): string[] {
  if (istat) {
    const muni = municipalityFlavor[istat];
    if (event === "correct" && nonEmpty(muni?.win)) return muni.win;
    if (event === "wrong" && nonEmpty(muni?.miss)) return muni.miss;
  }
  const province = provincePhrases[provinceId]?.[event];
  if (nonEmpty(province)) return province;
  const region = regionOfProvince(provinceId);
  const regional = region ? regionPhrases[region]?.[event] : undefined;
  if (nonEmpty(regional)) return regional;
  return defaultPhrases[event];
}

/** Phrase pool for giving up / revealing a comune: its `fail` lines, else generic. */
export function getFailPool(istat?: string): string[] {
  const muni = istat ? municipalityFlavor[istat] : undefined;
  return nonEmpty(muni?.fail) ? muni.fail : defaultFailPhrases;
}

/** Trivia facts for a comune (empty when it has none). */
export function getFacts(istat?: string): string[] {
  return (istat && municipalityFlavor[istat]?.facts) || [];
}

/** Campanile photo URL for a comune, or undefined when unpopulated. */
export function getCampanile(istat?: string): string | undefined {
  return istat ? municipalityFlavor[istat]?.campanile : undefined;
}
