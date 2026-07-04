import type { PartialPhraseSet } from "../types";

/**
 * Cuneo / Piemonte flavour, built from local dialect words and expressions
 * (vitun, balengu, brau, sviciu, "oh ma basta", madoi, ommi ommi, bagna
 * cauda) rather than invented dialect grammar. Any event not listed here
 * falls back to the generic Italian set.
 */
export const cnPhrases: PartialPhraseSet = {
  correct: [
    "Brau, hai indovinato subito!",
    "Preciso come un vero cuneese: brau!",
    "Grande, manco un vitun ci arrivava così in fretta!",
    "Brau davvero, sei un fenomeno del bagna cauda!",
  ],
  wrong: [
    "Ma vaiu, sei un balengu o cosa?",
    "Vitun, quella non è manco vicina!",
    "Ommi ommi, che pasticcio.",
    "Sviciu! Guarda meglio la cartina.",
    "Madoi, ma dove hai guardato?",
  ],
  streakCorrect3: [
    "Tre di fila, brau davvero!",
    "Tris perfetto, altro che balengu!",
  ],
  streakCorrect5: [
    "Cinque su cinque, sei una macchina da bagna cauda!",
    "Cinquina di fila, brau brau!",
  ],
  streakCorrect10: [
    "Dieci di fila?! Complimenti, sei un vero fenomeno cuneese!",
  ],
  streakWrong3: ["Oh ma basta, tre sbagli di fila!", "Ommi ommi, e tre."],
  streakWrong5: [
    "Ommi ommi, cinque sbagli... la cartina ti odia oggi.",
    "Oh ma basta, cinque di fila: sei proprio un balengu oggi.",
  ],
  streakWrong10: [
    "Dieci sbagli di fila: sei ufficialmente un balengu patentato!",
  ],
};
