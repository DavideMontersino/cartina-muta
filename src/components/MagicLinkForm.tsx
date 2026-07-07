import { type FormEvent, useState } from "react";
import { signIn } from "../auth/client";
import { isValidEmail, validateSignIn } from "../auth/validation";
import { savePendingScore } from "../leaderboard/pendingScore";
import type { ScoreSubmissionPayload } from "../leaderboard/types";

type Status = "idle" | "sending" | "sent" | "error";

interface MagicLinkFormProps {
  hint: string;
  /** Show the leaderboard-name field (result screen). Login popover omits it. */
  showName?: boolean;
  /**
   * A just-finished game's score to record. Stashed when the sign-in email is
   * sent so it survives the magic-link redirect and is submitted on return —
   * without this the score would be lost (see leaderboard/pendingScore.ts).
   */
  pendingSubmission?: ScoreSubmissionPayload | null;
}

/**
 * Passwordless sign-in / sign-up form: sends a magic link to the given email.
 * Optionally collects a display name (used only when a brand-new user is
 * created). Shared by the result-screen card and the top-right login popover.
 *
 * /api/auth/* only exists under Pages Functions (production or
 * `wrangler pages dev`); on the plain Vite dev server the request fails, which
 * we surface as an error rather than crashing.
 */
export function MagicLinkForm({
  hint,
  showName = false,
  pendingSubmission = null,
}: MagicLinkFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let cleanName: string | undefined;
    let cleanEmail: string;
    if (showName) {
      const result = validateSignIn({ name, email });
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      cleanName = result.name;
      cleanEmail = result.email;
    } else {
      if (!isValidEmail(email)) {
        setStatus("error");
        setMessage("Inserisci un indirizzo email valido.");
        return;
      }
      cleanEmail = email.trim();
    }

    setStatus("sending");
    setMessage("");
    try {
      const res = await signIn.magicLink({
        email: cleanEmail,
        ...(cleanName ? { name: cleanName } : {}),
        callbackURL: window.location.origin,
      });
      if (res.error) {
        setStatus("error");
        setMessage(res.error.message || "Invio non riuscito. Riprova.");
        return;
      }
      // Stash the finished game's score so it survives the magic-link redirect
      // (a fresh app load) and gets submitted once the player lands signed in.
      if (pendingSubmission) savePendingScore(pendingSubmission);
      setStatus("sent");
      setMessage(cleanEmail);
    } catch {
      setStatus("error");
      setMessage("Servizio non raggiungibile. Riprova più tardi.");
    }
  }

  if (status === "sent") {
    return (
      <p className="signin__hint signin__hint--center">
        Controlla la tua email <strong>{message}</strong> e tocca il link per{" "}
        {pendingSubmission
          ? "salvare il punteggio in classifica."
          : "continuare."}
      </p>
    );
  }

  return (
    <form className="signin" onSubmit={handleSubmit}>
      <p className="signin__hint">{hint}</p>
      {showName && (
        <input
          className="signin__input"
          type="text"
          placeholder="Nome (in classifica)"
          value={name}
          maxLength={40}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <input
        className="signin__input"
        type="email"
        placeholder="Email"
        value={email}
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      {status === "error" && <p className="signin__error">{message}</p>}
      <button
        type="submit"
        className="btn btn--primary"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Invio…" : "Invia link di accesso"}
      </button>
    </form>
  );
}
