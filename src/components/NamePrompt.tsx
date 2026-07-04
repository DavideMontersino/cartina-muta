import { type FormEvent, useState } from "react";
import { signOut, updateUser, useSession } from "../auth/client";
import { validateName } from "../auth/validation";

/**
 * Shown to a signed-in user who has no display name yet (first magic-link
 * sign-in without one). They must set a leaderboard name or sign out.
 */
export function NamePrompt() {
  const { refetch } = useSession();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateName(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await updateUser({ name: result.name });
      if (res.error) {
        setError(res.error.message || "Salvataggio non riuscito. Riprova.");
        return;
      }
      await refetch();
    } catch {
      setError("Servizio non raggiungibile. Riprova più tardi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="signin signin--prompt" onSubmit={handleSubmit}>
      <p className="signin__hint">Scegli un nome per la classifica</p>
      <input
        className="signin__input"
        type="text"
        placeholder="Nome"
        value={name}
        maxLength={40}
        autoComplete="nickname"
        // biome-ignore lint/a11y/noAutofocus: this is a required first-time gate; focusing the sole input is the expected UX.
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />
      {error && <p className="signin__error">{error}</p>}
      <div className="signin__row">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Salvo…" : "Salva"}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => signOut()}
        >
          Esci
        </button>
      </div>
    </form>
  );
}
