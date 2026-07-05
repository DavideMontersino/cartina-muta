import { useState } from "react";
import { AuthMenu } from "./AuthMenu";
import { CreditsPanel } from "./CreditsPanel";
import { LeaderboardPanel } from "./LeaderboardPanel";

interface HamburgerMenuProps {
  provinceId?: string;
  provinceName?: string;
}

type ModalKind = "leaderboard" | "credits";

/**
 * Single entry point for account access, the leaderboard, and credits —
 * replaces the old bare "Accedi / Registrati" button everywhere it appeared.
 */
export function HamburgerMenu({
  provinceId,
  provinceName,
}: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind | null>(null);

  return (
    <div className="hamburger-menu">
      <button
        type="button"
        className="hamburger-menu__btn"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
      {open && (
        <div className="hamburger-popover">
          <AuthMenu />
          <button
            type="button"
            className="hamburger-popover__item"
            disabled={!provinceId || !provinceName}
            onClick={() => {
              setModal("leaderboard");
              setOpen(false);
            }}
          >
            🏆 Classifica
          </button>
          <button
            type="button"
            className="hamburger-popover__item"
            onClick={() => {
              setModal("credits");
              setOpen(false);
            }}
          >
            ℹ️ Crediti
          </button>
        </div>
      )}
      {modal === "leaderboard" && provinceId && provinceName && (
        <div className="overlay">
          <div className="hamburger-modal">
            <button
              type="button"
              className="hamburger-modal__close"
              aria-label="Chiudi"
              onClick={() => setModal(null)}
            >
              ✕
            </button>
            <LeaderboardPanel
              provinceId={provinceId}
              provinceName={provinceName}
            />
          </div>
        </div>
      )}
      {modal === "credits" && (
        <div className="overlay">
          <div className="hamburger-modal">
            <button
              type="button"
              className="hamburger-modal__close"
              aria-label="Chiudi"
              onClick={() => setModal(null)}
            >
              ✕
            </button>
            <CreditsPanel />
          </div>
        </div>
      )}
    </div>
  );
}
