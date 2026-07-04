import type { PartialPhraseSet } from "../types";

/**
 * Imperia flavour: Taggiasca olive oil (the province's signature crop),
 * Sanremo's "città dei fiori" identity, the sardenaira (a local focaccia
 * with tomato, anchovies and olives), and the terraced "fasce" hillsides.
 * Falls back to the generic Italian set for any event not listed here.
 */
export const imPhrases: PartialPhraseSet = {
  correct: [
    "Bravo, oliva Taggiasca al punto giusto!",
    "Preciso come i fiori di Sanremo in fila per il Festival!",
  ],
  wrong: [
    "Ti sei perso tra le fasce come un turista senza mappa.",
    "Sbagliato: quella sardenaira non ha manco l'oliva giusta.",
  ],
  streakWrong3: [
    "Tre sbagli di fila: neanche l'olio nuovo di Olioliva ci mette così tanto a scolare.",
  ],
};
