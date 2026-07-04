import type { D1Database } from "@cloudflare/workers-types";

/**
 * The environment auth needs, shared by the server config and the email module.
 * Provided per-request by the Pages Function (`ctx.env`).
 *
 * `RESEND_API_KEY` is optional so local dev/tests without a key fall back to the
 * console stub in `email.ts` (only when `EMAIL_DEV_STUB` is enabled).
 */
export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  RESEND_API_KEY?: string;
  /**
   * Dev/test only: when "1"/"true" AND no `RESEND_API_KEY`, email is logged to
   * the console instead of sent. Unset in production, so a missing key throws
   * rather than faking a successful send (see `email.ts`).
   */
  EMAIL_DEV_STUB?: string;
}
