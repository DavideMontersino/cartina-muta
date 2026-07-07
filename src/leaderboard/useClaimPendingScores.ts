import { useEffect, useRef, useState } from "react";
import { useSession } from "../auth/client";
import { claimPendingScores } from "./client";

/**
 * After a magic-link sign-in lands the player back in the app, their session
 * finally proves the email a score was parked under — so claim it. This covers
 * the cross-device case too: the claim runs on whichever device opened the
 * link, the moment its session exists. Returns a short-lived flag (auto-clears)
 * so the UI can confirm the save.
 */
export function useClaimPendingScores(): boolean {
  const { data: session, isPending } = useSession();
  const name = session?.user?.name;
  const claimedRef = useRef(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (isPending || !name || claimedRef.current) return;
    // Guard set synchronously so React StrictMode's double-invoked effect (dev)
    // can't fire a second claim; the endpoint is idempotent regardless.
    claimedRef.current = true;
    claimPendingScores()
      .then((claimed) => {
        if (claimed > 0) {
          setJustSaved(true);
          window.setTimeout(() => setJustSaved(false), 5000);
        }
      })
      .catch(() => {
        // Leave it for a retry on the next app load.
        claimedRef.current = false;
      });
  }, [isPending, name]);

  return justSaved;
}
