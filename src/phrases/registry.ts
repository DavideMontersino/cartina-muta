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
