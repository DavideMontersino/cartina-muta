import type { PartialPhraseSet } from "../types";

/**
 * Genova flavour, built from independently verified Genoese (zeneise)
 * vocabulary: "belin" — the quintessential Genoese exclamation, documented
 * by Treccani, whose meaning shifts with its position in the sentence but
 * whose base sense is close to "wow"/"damn" — plus "gondon" (a sly rascal,
 * used almost affectionately), "nescio" (dimwit), "çiöto" (smutty), the
 * "la Superba" nickname Petrarch gave the city in 1358, and the running
 * joke about Genoese parsimony ("braccino corto"). No invented dialect
 * grammar. Any event not listed here falls back to the generic Italian set.
 */
export const gePhrases: PartialPhraseSet = {
  correct: [
    "Belin, che precisione!",
    "Bravo, hai lo sguardo di un vero navigatore della Superba!",
    "Nemmeno un gondon furbo sarebbe stato più rapido!",
    "Precisione da mandillo ben steso: perfetto!",
  ],
  wrong: [
    "Belin, hai toppato di brutto!",
    "Nescio, quella non è manco vicina!",
    "Çiöto, guarda meglio la cartina!",
    "Braccino corto anche con gli occhi, oggi?",
    "Manco la nebbia sul porto confonde così tanto.",
  ],
  streakCorrect3: ["Tris da vera Superba: tre di fila!"],
  streakCorrect5: ["Cinque su cinque: sei il doge dei comuni liguri!"],
  streakCorrect10: [
    "Dieci di fila: altro che chiacchiere, qui c'è sostanza da Repubblica Marinara!",
  ],
  streakWrong3: ["Belin, tre sbagli di fila!"],
  streakWrong5: ["Belin che pasticcio: cinque sbagli di fila."],
  streakWrong10: [
    "Dieci sbagli di fila: manco un genovese tirchio ne sprecherebbe così tanti.",
  ],
};
