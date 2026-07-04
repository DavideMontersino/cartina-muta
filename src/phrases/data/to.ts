import type { PartialPhraseSet } from "../types";

/**
 * Torino flavour: "va bin" (typical Piedmontese "that's fine/OK"), "neh"
 * (confirmatory tag, like "right?"), "cicles" (chewing gum, Torino-only
 * usage), "bòja fàuss" (classic Turinese exclamation), plus the bicerin
 * and gianduiotto as local icons. Falls back to the generic Italian set
 * for any event not listed here.
 */
export const toPhrases: PartialPhraseSet = {
  correct: [
    "Va bin, l'hai beccato!",
    "Gianduiotto puro, che precisione!",
    "Sveglio come un bicerin appena servito: brau!",
    "Neh, bel colpo!",
  ],
  wrong: [
    "Bòja fàuss, hai sbagliato di brutto!",
    "Neh, mica quello lì!",
    "Cicles al posto del cervello, oggi?",
    "Va bin, va bin... ma no, hai toppato.",
  ],
  streakCorrect3: ["Tris da Mole Antonelliana: altissimo livello!"],
  streakWrong3: ["Bòja fàuss, tre sbagli di fila!"],
};
