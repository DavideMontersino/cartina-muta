/** Pragmatic email shape check — not RFC-perfect, just catches typos/empties. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export type NameValidation =
  | { ok: true; name: string }
  | { ok: false; error: string };

/** Validate a leaderboard display name on its own (used by the name prompt). */
export function validateName(raw: string): NameValidation {
  const name = raw.trim();
  if (name.length === 0) {
    return { ok: false, error: "Scegli un nome per la classifica." };
  }
  if (name.length > 40) {
    return { ok: false, error: "Il nome è troppo lungo (max 40 caratteri)." };
  }
  return { ok: true, name };
}

export interface SignInFields {
  name: string;
  email: string;
}

export type SignInValidation =
  | { ok: true; name: string; email: string }
  | { ok: false; error: string };

/**
 * Validate the leaderboard sign-in form. The name is what will appear on the
 * leaderboard, so it must be present; the email must look like an address.
 */
export function validateSignIn(fields: SignInFields): SignInValidation {
  const nameCheck = validateName(fields.name);
  if (!nameCheck.ok) return nameCheck;
  const email = fields.email.trim();
  if (!isValidEmail(email)) {
    return { ok: false, error: "Inserisci un indirizzo email valido." };
  }
  return { ok: true, name: nameCheck.name, email };
}
