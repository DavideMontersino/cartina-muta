import type { PartialPhraseSet } from "../types";

/**
 * Alessandria flavour: the Borsalino hat factory, historically the
 * city's landmark industry (its workers were nicknamed "bursalén").
 * Falls back to the generic Italian set for any event not listed here.
 */
export const alPhrases: PartialPhraseSet = {
  correct: [
    "Preciso come un cappello Borsalino su misura!",
    "Bravo, altro che bursalén distratto!",
  ],
  wrong: [
    "Hai toppato più di un cappello Borsalino nella taglia sbagliata.",
    "Bursalén per un giorno: hai perso il filo.",
  ],
  streakWrong3: ["Tre sbagli di fila: neanche in fabbrica capita così spesso."],
};
