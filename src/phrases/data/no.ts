import type { PartialPhraseSet } from "../types";

/**
 * Novara flavour: paniscia, the province's signature risotto with
 * borlotti beans and salam d'la duja. Falls back to the generic Italian
 * set for any event not listed here.
 */
export const noPhrases: PartialPhraseSet = {
  correct: [
    "Bravo, chicco perfetto come il riso novarese!",
    "Precisione da paniscia: tutti gli ingredienti al posto giusto!",
  ],
  wrong: [
    "Hai sbagliato la ricetta: quella non è la paniscia giusta.",
    "Chicco fuori posto, riprova.",
  ],
  streakWrong3: ["Tre sbagli di fila: la paniscia si è scotta."],
};
