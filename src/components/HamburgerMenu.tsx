import { useState } from "react";
import { useLocation } from "wouter";
import { AuthMenu } from "./AuthMenu";

interface HamburgerMenuProps {
  provinceId?: string;
}

export function HamburgerMenu({ provinceId }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const go = (href: string) => {
    navigate(href);
    setOpen(false);
  };

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
            disabled={!provinceId}
            onClick={() => go(`/leaderboard/${provinceId}`)}
          >
            🏆 Classifica
          </button>
          <button
            type="button"
            className="hamburger-popover__item"
            onClick={() => go("/credits")}
          >
            ℹ️ Crediti
          </button>
          <button
            type="button"
            className="hamburger-popover__item"
            onClick={() => go("/changelog")}
          >
            📋 Novità
          </button>
        </div>
      )}
    </div>
  );
}
