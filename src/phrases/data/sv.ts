import type { PartialPhraseSet } from "../types";

/**
 * Savona flavour: "stundaio" — a distinctively Savonese word for
 * scorbutico/burbero/cocciuto (grumpy, stubborn), documented in local
 * dialect writeups. Falls back to the generic Italian set for any event
 * not listed here.
 */
export const svPhrases: PartialPhraseSet = {
  correct: [
    "Bravo, altro che stundaio: oggi sei di umore ottimo!",
    "Preciso come un vero savonese doc!",
  ],
  wrong: [
    "Stundaio che non sei altro, guarda meglio!",
    "Sbagliato: manco un savonese cocciuto insisterebbe su quella scelta.",
  ],
  streakWrong3: ["Tre sbagli di fila: stai diventando proprio stundaio oggi."],
};
