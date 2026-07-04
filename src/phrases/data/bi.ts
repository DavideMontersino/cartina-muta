import type { PartialPhraseSet } from "../types";

/**
 * Biella flavour: the city's centuries-old wool/textile industry (UNESCO
 * Creative City for Crafts and Folk Art since 2019) and the Santuario di
 * Oropa's rare eleven-syllable echo. Falls back to the generic Italian
 * set for any event not listed here.
 */
export const biPhrases: PartialPhraseSet = {
  correct: [
    "Filato perfetto, neanche un telaio biellese è così preciso!",
    "Bravo, altro che lana grezza: qui c'è del pettinato fine!",
  ],
  wrong: [
    "Hai toppato: nemmeno l'eco di Oropa ti aiuta stavolta.",
    "Nodo nel filo: hai sbagliato comune.",
  ],
  streakWrong3: ["Tre sbagli di fila: il telaio si è inceppato."],
};
