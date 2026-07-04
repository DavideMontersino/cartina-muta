import type { PhraseSet } from "../types";

/** Generic Italian reactions, used for any province without its own set. */
export const defaultPhrases: PhraseSet = {
  correct: [
    "Esatto!",
    "Perfetto, hai indovinato!",
    "Bravissimo!",
    "Giusto, si prosegue!",
    "Ottimo colpo d'occhio!",
  ],
  wrong: [
    "Sbagliato, riprova!",
    "No, non è questo.",
    "Quasi... ma no.",
    "Occhio alla cartina!",
    "Peccato, era un altro.",
  ],
  streakCorrect3: [
    "Tre indovinate di fila, si scalda il motore!",
    "Tris perfetto, continua così!",
    "Tre su tre, stai carburando!",
  ],
  streakCorrect5: [
    "Cinque di fila: stai andando alla grande!",
    "Cinquina perfetta, sei in forma!",
    "Cinque su cinque, che precisione!",
  ],
  streakCorrect10: [
    "Dieci di fila, sei inarrestabile!",
    "Doppia cifra di fila: campione assoluto!",
    "Dieci su dieci, la cartina non ha più segreti per te!",
  ],
  streakWrong3: [
    "Tre sbagli di fila, respira e riprova.",
    "Tre passi falsi consecutivi: rallenta un attimo.",
    "Tris di errori, la cartina ti sta mettendo alla prova.",
  ],
  streakWrong5: [
    "Cinque sbagli di fila... la cartina è ostica oggi.",
    "Cinque su cinque sbagliati, che serata difficile.",
    "Cinquina di errori: forse serve una pausa caffè.",
  ],
  streakWrong10: [
    "Dieci sbagli di fila: forse è ora di una pausa.",
    "Doppia cifra di errori, la cartina vince questo round.",
    "Dieci su dieci sbagliati... capita ai migliori.",
  ],
};
