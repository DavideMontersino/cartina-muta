import type { PartialPhraseSet } from "../types";

/**
 * La Spezia flavour: the Golfo dei Poeti (Byron and the Shelleys wintered
 * there), the nearby Cinque Terre, and the mesciua chickpea-and-bean soup.
 * Falls back to the generic Italian set for any event not listed here.
 */
export const spPhrases: PartialPhraseSet = {
  correct: [
    "Bravo, preciso come un poeta ispirato dal Golfo!",
    "Chicco di ceci perfetto, come nella miglior mesciua!",
  ],
  wrong: [
    "Ti sei perso come Shelley in una tempesta nel Golfo dei Poeti.",
    "Sbagliato: quella non è manco nelle Cinque Terre.",
  ],
  streakWrong3: [
    "Tre sbagli di fila: la mesciua si è raffreddata ad aspettare.",
  ],
};
