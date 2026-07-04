import { type FormEvent, useState } from "react";
import { signIn, useSession } from "../auth/client";
import { validateSignIn } from "../auth/validation";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Leaderboard sign-in shown after a completed game. Passwordless: the player
 * picks a display name (their leaderboard label) and email, and we send a magic
 * link. If already signed in, we just show who they are.
 *
 * Note: /api/auth/* only exists under Pages Functions (production or
 * `wrangler pages dev`) — on the plain Vite dev server the request fails, which
 * we surface as an error rather than crashing.
 */
export function SignInCard() {
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  if (isPending) return null;

  if (session?.user) {
    return (
      <div className="signin signin--done">
        <p className="signin__hint">
          Sei nella classifica come{" "}
          <strong>{session.user.name || session.user.email}</strong>.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateSignIn({ name, email });
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await signIn.magicLink({
        email: result.email,
        name: result.name,
        callbackURL: window.location.origin,
      });
      if (res.error) {
        setStatus("error");
        setMessage(res.error.message || "Invio non riuscito. Riprova.");
        return;
      }
      setStatus("sent");
      setMessage(result.email);
    } catch {
      setStatus("error");
      setMessage("Servizio non raggiungibile. Riprova più tardi.");
    }
  }

  if (status === "sent") {
    return (
      <div className="signin signin--done">
        <p className="signin__hint">
          Controlla la tua email <strong>{message}</strong> e tocca il link per
          entrare in classifica.
        </p>
      </div>
    );
  }

  return (
    <form className="signin" onSubmit={handleSubmit}>
      <p className="signin__hint">Salva il tuo nome per la classifica</p>
      <input
        className="signin__input"
        type="text"
        placeholder="Nome (in classifica)"
        value={name}
        maxLength={40}
        autoComplete="nickname"
        onChange={(e) => setName(e.target.value)}
      />
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
