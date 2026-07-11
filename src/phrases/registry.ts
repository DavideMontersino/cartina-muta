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
 * Phrase pool for a given event, built additively:
 * - Municipality `win`/`miss` lines override for that specific comune only.
 * - Province, region, and national phrases are all combined into one pool so
 *   any layer can be chosen at random — province flavour doesn't displace the
 *   generic Italian set, it expands it.
 */
export function getPhrasePool(
  provinceId: string,
  event: ReactionEvent,
  istat?: string,
): string[] {
  // Municipality is specific enough to stand alone for correct/wrong events.
  if (istat) {
    const muni = municipalityFlavor[istat];
    if (event === "correct" && nonEmpty(muni?.win)) return muni.win;
    if (event === "wrong" && nonEmpty(muni?.miss)) return muni.miss;
  }

  // Additive: national + region + province, all in one pool.
  const pool: string[] = [...defaultPhrases[event]];
  const region = regionOfProvince(provinceId);
  const regional = region ? regionPhrases[region]?.[event] : undefined;
  if (nonEmpty(regional)) pool.push(...regional);
  const province = provincePhrases[provinceId]?.[event];
  if (nonEmpty(province)) pool.push(...province);
  return pool;
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

/** Campanile/landmark photo URLs for a comune (empty when it has none). */
export function getCampanile(istat?: string): string[] {
  return (istat && municipalityFlavor[istat]?.campanile) || [];
}
