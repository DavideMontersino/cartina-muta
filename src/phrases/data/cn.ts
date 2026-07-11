import type { PartialPhraseSet } from "../types";

/**
 * Cuneo / Piemonte flavour. Vocabulary is a mix of the words the issue
 * author supplied directly (vitun, brau) and terms independently verified
 * via web research (balengo/balengu = foolish/odd; sviciu = clever, quick;
 * madoi + òmmi òmmi = exclamations of surprise/dismay; "oh basta là" =
 * resigned exasperation, quoted by Umberto Eco; blagor = braggart; tüpin,
 * gadan, badòla = mild insults; crin catòlic = hypocrite), plus local
 * culture (bagna cauda, agnolotti del plin, the "Provincia Granda"
 * nickname, the Buco di Viso alpine tunnel). No invented dialect grammar.
 * Any event not listed here falls back to the generic Italian set.
 */
export const cnPhrases: PartialPhraseSet = {
  correct: [
    "Brau, hai indovinato subito!",
    "Preciso come un vero cuneese: brau!",
    "Sviciu, l'hai beccata al volo!",
    "Grande, manco un vitun ci arrivava così in fretta!",
    "Brau davvero, sei un fenomeno da bagna cauda!",
    "Precisione da Provincia Granda: dritto al comune giusto!",
  ],
  wrong: [
    "Sei un balengu o cosa?",
    "Ma ti incali a dare queste risposte?",
    "Òmmi òmmi, che pasticcio.",
    "Sviciu... ma mica tanto, oggi!",
    "Madoi, ma dove hai guardato?",
    "Fai il gradasso ma la cartina ti frega.",
    "Gadan, mettici più impegno!",
    "Tüpin vuoto, altro che comune giusto!",
    "Crin catòlic, parli bene ma clicchi male!",
    "Pelacurdin!"
  ],
  streakCorrect3: [
    "Tre di fila, brau davvero!",
    "Sviciu a raffica: tris perfetto!",
    "Tris che neanche un piemontese doc fa meglio.",
  ],
  streakCorrect5: [
    "Cinque su cinque, sei una macchina da bagna cauda!",
    "Cinquina di fila, brau brau!",
    "Cinque comuni della Granda, uno via l'altro: grande!",
  ],
  streakCorrect10: [
    "Dieci di fila?! Complimenti, sei un vero fenomeno cuneese!",
    "Dieci su dieci: la Granda non ha più segreti per te.",
  ],
  streakWrong3: [
    "Oh basta là, tre sbagli di fila!",
    "Òmmi òmmi, e tre.",
    "Tre balenguate di fila, dai.",
  ],
  streakWrong5: [
    "Òmmi òmmi, cinque sbagli... la cartina ti odia oggi.",
    "Oh basta là, cinque di fila: sei proprio un balengu oggi.",
    "Cinque tüpin vuoti di fila, complimenti.",
  ],
  streakWrong10: [
    "Dieci sbagli di fila: sei ufficialmente un balengu patentato!",
    "Dieci su dieci sbagliati: neanche il Buco di Viso è così difficile da trovare.",
  ],
};
