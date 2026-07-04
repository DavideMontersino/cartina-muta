import type { PartialPhraseSet } from "../types";

/**
 * Asti flavour: the Palio di Asti (Italy's oldest recorded Palio, run
 * since 1275 "per dileggio" against rival Alba) and its "inchioda" — a
 * salted anchovy handed to the last-place rider — plus the Moscato/Asti
 * Spumante wine tradition. Falls back to the generic Italian set for any
 * event not listed here.
 */
export const atPhrases: PartialPhraseSet = {
  correct: [
    "Bravo, hai vinto il Palio al primo colpo!",
    "Dolce come un Moscato d'Asti, questa vittoria!",
    "Prima posizione, altro che inchioda!",
  ],
  wrong: [
    "Ahi, ti becchi l'inchioda come l'ultimo del Palio!",
    "Hai sbagliato peggio di un cavallo scosso in Piazza Alfieri.",
    "Manco lo spumante più economico brinda a questo colpo.",
  ],
  streakWrong3: ["Tre inchiode di fila: sei ultimo al Palio anche stavolta."],
};
