import type { PartialPhraseSet } from "../types";

/**
 * Vercelli flavour: Europe's rice capital, its "mare a quadretti"
 * (checkerboard sea) of flooded paddies, and the panissa risotto. Falls
 * back to the generic Italian set for any event not listed here.
 */
export const vcPhrases: PartialPhraseSet = {
  correct: [
    "Bravo, chicco di riso perfetto nel mare a quadretti!",
    "Precisione da capitale europea del riso!",
  ],
  wrong: [
    "Ti sei perso nel mare a quadretti delle risaie.",
    "Chicco sbagliato, altro che panissa vercellese.",
  ],
  streakWrong3: [
    "Tre sbagli di fila: neanche i monaci cistercensi ci mettevano così tanto a bonificare.",
  ],
};
