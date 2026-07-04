import { cnPhrases } from "./data/cn";
import { defaultPhrases } from "./data/default";
import type { PartialPhraseSet, ReactionEvent } from "./types";

/** Province id (e.g. "cn") -> its dialect/local phrase overrides. */
const provincePhrases: Record<string, PartialPhraseSet> = {
  cn: cnPhrases,
};

/**
 * Phrase pool for a given province and event. Falls back to the generic
 * Italian set whenever the province has no override for that event.
 */
export function getPhrasePool(
  provinceId: string,
  event: ReactionEvent,
): string[] {
  const pool = provincePhrases[provinceId]?.[event];
  return pool && pool.length > 0 ? pool : defaultPhrases[event];
}
