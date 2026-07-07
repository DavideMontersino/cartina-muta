import { type FormEvent, useState } from "react";
import { signIn } from "../auth/client";
import { isValidEmail, validateSignIn } from "../auth/validation";
import { submitPendingScore } from "../leaderboard/client";
import type { ScoreSubmissionPayload } from "../leaderboard/types";

type Status = "idle" | "sending" | "sent" | "error";

interface MagicLinkFormProps {
  hint: string;
  /** Show the leaderboard-name field (result screen). Login popover omits it. */
  showName?: boolean;
  /**
   * A just-finished game's score to record. Parked server-side against the
   * entered email before the magic link is sent, then revealed on the
   * leaderboard once the player opens that link (see leaderboard/pendingScore.ts
   * and functions/api/claim.ts).
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
      // Park the score first, so a successful "sent" state always means the
      // score is safely queued to appear once the link is opened. If parking
      // fails, stop here rather than sending a link that would save nothing.
      if (pendingSubmission) {
        const parked = await submitPendingScore(cleanEmail, pendingSubmission);
        if (!parked.ok) {
          setStatus("error");
          setMessage(parked.error);
          return;
        }
      }
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
      setStatus("sent");
      setMessage(cleanEmail);
    } catch {
      setStatus("error");
      setMessage("Servizio non raggiungibile. Riprova più tardi.");
    }
  }

  if (status === "sent") {
    return (
      <div className="signin signin--done">
        {pendingSubmission ? (
          <p className="signin__hint signin__hint--center">
            Ti abbiamo inviato un'email a <strong>{message}</strong>.{" "}
            <strong>
              Apri quel link entro un'ora per far comparire il punteggio in
              classifica.
            </strong>{" "}
            Finché non lo apri, il punteggio resta in attesa e non è visibile.
          </p>
        ) : (
          <p className="signin__hint signin__hint--center">
            Controlla la tua email <strong>{message}</strong> e tocca il link
            per continuare.
          </p>
        )}
      </div>
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
