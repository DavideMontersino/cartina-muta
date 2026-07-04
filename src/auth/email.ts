import type { AuthEnv } from "./env";

/**
 * Outbound `from` address. Not a secret — hardcoded so it's auditable. It MUST
 * be on a Resend-verified domain (DKIM/SPF configured) or delivery fails.
 * Reuses the owner's verified `updates.davidemontersino.com` domain.
 */
export const EMAIL_FROM = "Campanilismi <noreply@updates.davidemontersino.com>";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send a transactional email via Resend (plain HTTPS fetch — no SMTP, no SDK,
 * works at the Cloudflare edge). This is the one isolated sender behind Better
 * Auth's send hooks, so swapping providers later is a one-file change.
 *
 * When `RESEND_API_KEY` is absent it falls back to a console stub — but ONLY if
 * `EMAIL_DEV_STUB` is explicitly enabled (local dev / tests). In production the
 * stub is off, so a missing key throws instead of silently pretending the mail
 * went out: a "check your email" the user never receives is worse than an
 * honest error.
 */
export async function sendEmail(
  env: AuthEnv,
  msg: EmailMessage,
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    const stubEnabled =
      env.EMAIL_DEV_STUB === "1" || env.EMAIL_DEV_STUB === "true";
    if (stubEnabled) {
      // Local/dev/test only: log instead of sending so magic/verification
      // links are visible in the console.
      console.log(`[email:stub] → ${msg.to} | ${msg.subject}\n${msg.text}`);
      return;
    }
    // Production (no key, no stub): fail loudly. Better Auth's send hook turns
    // this into an error the user sees, rather than a false success.
    throw new Error(
      "Email is not configured: RESEND_API_KEY is missing and EMAIL_DEV_STUB " +
        "is not enabled. Refusing to silently drop mail.",
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
  });

  if (!res.ok) {
    // Surface the failure to Better Auth's hook so the caller sees a 500 rather
    // than a silently-dropped email. The body never contains our API key.
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}
