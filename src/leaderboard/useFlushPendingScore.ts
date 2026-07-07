import { useEffect, useRef, useState } from "react";
import { useSession } from "../auth/client";
import { submitScore } from "./client";
import { clearPendingScore, loadPendingScore } from "./pendingScore";

/**
 * After the magic-link round-trip lands the player back on a fresh app load,
 * their signed-in session finally exists — so flush the score they finished
 * *before* signing in (stashed by the result-screen sign-in form). The
 * in-result submit path never got to send it because there was no named
 * session at the moment the game ended.
 *
 * Returns a short-lived flag so the UI can confirm the save; it auto-clears.
 */
export function useFlushPendingScore(): boolean {
  const { data: session, isPending } = useSession();
  const name = session?.user?.name;
  const flushedRef = useRef(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (isPending || !name || flushedRef.current) return;
    const pending = loadPendingScore();
    if (!pending) return;
    // Guard set synchronously so React StrictMode's double-invoked effect (dev)
    // can't fire a second POST for the same stash.
    flushedRef.current = true;
    submitScore(pending).then((res) => {
      if (res.ok) {
        clearPendingScore();
        setJustSaved(true);
        window.setTimeout(() => setJustSaved(false), 5000);
      } else {
        // Leave it stashed for a retry on the next app load.
        flushedRef.current = false;
      }
    });
  }, [isPending, name]);

  return justSaved;
}
