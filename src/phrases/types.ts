/** Reaction moments the player can trigger while guessing. */
export type ReactionEvent =
  | "correct"
  | "wrong"
  | "streakCorrect3"
  | "streakCorrect5"
  | "streakCorrect10"
  | "streakWrong3"
  | "streakWrong5"
  | "streakWrong10";

/** A full set of phrase pools, one non-empty array per event. */
export type PhraseSet = Record<ReactionEvent, string[]>;

/** A province override — only the events it customises; the rest fall back. */
export type PartialPhraseSet = Partial<PhraseSet>;
