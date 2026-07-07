import type { ScoreSubmissionPayload } from "./types";

// A completed game's score is held only in React memory until it's POSTed to
// /api/scores. A signed-out player who finishes a game and *then* signs in via
// magic link loses that score: clicking the emailed link reloads the app on a
// fresh page, discarding the in-memory submission before it can be sent. To
// bridge that redirect we stash the submission in localStorage when the player
// starts the magic-link flow, and flush it once they land back signed in.

const KEY = "campanilismi:pendingScore";
// Don't resurrect a score the player abandoned long ago: a stash is only
// flushed if the magic-link round-trip completes within this window.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredPendingScore {
  savedAt: number;
  payload: ScoreSubmissionPayload;
}

/** The subset of the Web Storage API we use — injectable so this is testable. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    // Missing on the server / in the node test env; access can also throw in
    // sandboxed iframes or Safari private mode.
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Stash a completed game's score so it survives the magic-link redirect. */
export function savePendingScore(
  payload: ScoreSubmissionPayload,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  const record: StoredPendingScore = { savedAt: Date.now(), payload };
  try {
    storage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Quota exceeded / storage disabled — not worth crashing the sign-in over.
  }
}

/**
 * Return a stashed score if one is present and still fresh, else null. Corrupt
 * or expired records are treated as absent and cleared so they can't linger.
 */
export function loadPendingScore(
  storage: StorageLike | null = defaultStorage(),
  now: number = Date.now(),
): ScoreSubmissionPayload | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as StoredPendingScore;
    if (
      !record ||
      typeof record.savedAt !== "number" ||
      !record.payload ||
      typeof record.payload !== "object"
    ) {
      clearPendingScore(storage);
      return null;
    }
    if (now - record.savedAt > MAX_AGE_MS) {
      clearPendingScore(storage);
      return null;
    }
    return record.payload;
  } catch {
    clearPendingScore(storage);
    return null;
  }
}

export function clearPendingScore(
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    // ignore
  }
}
