import type { PartialPhraseSet } from "../types";

/**
 * Verbano-Cusio-Ossola flavour: the Walser alpine communities of the
 * upper Ossola valleys and Lake Maggiore. Falls back to the generic
 * Italian set for any event not listed here.
 */
export const vbPhrases: PartialPhraseSet = {
  correct: [
    "Bravo, preciso come un walser che conosce ogni sentiero!",
    "Dritto al bersaglio, altro che perdersi in Val Formazza!",
  ],
  wrong: [
    "Ti sei perso più di un turista sul Lago Maggiore senza mappa.",
    "Manco i walser andrebbero a cercarlo lì.",
  ],
  streakWrong3: ["Tre sbagli di fila: ti serve una guida alpina."],
};
