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

/** A province/region override — only the events it customises; the rest fall back. */
export type PartialPhraseSet = Partial<PhraseSet>;

/**
 * Per-municipality flavour, the most specific layer of the override stack.
 * Everything here is optional and falls back to the province → region →
 * generic layers when absent (see `src/phrases/registry.ts`).
 */
export interface MunicipalityFlavor {
  /** Celebratory lines shown when the player nails this comune (maps to `correct`). */
  win?: string[];
  /** Mocking lines shown when the player clicks the wrong comune (maps to `wrong`). */
  miss?: string[];
  /** Lines shown when the player gives up / the answer is revealed (skip or last miss). */
  fail?: string[];
  /** Trivia shown on the reveal/win popup — one is picked at random. */
  facts?: string[];
  /**
   * Campanile photo for this comune (an imported asset URL). Shown on the
   * win/fail popup only when populated; absent → no photo.
   */
  campanile?: string;
}
