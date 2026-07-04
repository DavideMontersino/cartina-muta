import { useState } from "react";
import { signOut, useSession } from "../auth/client";
import { MagicLinkForm } from "./MagicLinkForm";
import { NamePrompt } from "./NamePrompt";

/**
 * Top-right auth control:
 * - signed out → "Accedi / Registrati" button that opens a magic-link popover
 * - signed in without a name → a required name prompt (set one or sign out)
 * - signed in with a name → the name + a sign-out button
 */
export function AuthMenu() {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);

  if (isPending) return null;
  const user = session?.user;

  if (user && !user.name) {
    return (
      <div className="auth-menu">
        <div className="auth-popover">
          <NamePrompt />
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-menu">
        <span className="auth-menu__name">{user.name}</span>
        <button
          type="button"
          className="auth-menu__btn"
          onClick={() => signOut()}
        >
          Esci
        </button>
      </div>
    );
  }

  return (
    <div className="auth-menu">
      <button
        type="button"
        className="auth-menu__btn"
        onClick={() => setOpen((v) => !v)}
      >
        Accedi / Registrati
      </button>
      {open && (
        <div className="auth-popover">
          <MagicLinkForm hint="Accedi o registrati: ti inviamo un link via email." />
        </div>
      )}
    </div>
  );
}
