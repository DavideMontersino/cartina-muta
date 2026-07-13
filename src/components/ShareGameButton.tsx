import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { gameReplayPath } from "../leaderboard/constants";

interface ShareGameButtonProps {
  gameId: string;
  className?: string;
}

// Copies a game's canonical /game/:id link to the clipboard (GitHub #48), with a
// brief "Copiato" confirmation. Falls back to a prompt when the clipboard is
// unavailable (insecure context / denied) rather than failing silently.
export function ShareGameButton({
  gameId,
  className = "btn btn--ghost btn--sm",
}: ShareGameButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${gameReplayPath(gameId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia il link della partita:", url);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={share}
      title="Copia il link della partita"
    >
      {copied ? (
        <>
          <Check size={14} aria-hidden="true" /> Copiato
        </>
      ) : (
        <>
          <Link2 size={14} aria-hidden="true" /> Condividi
        </>
      )}
    </button>
  );
}
