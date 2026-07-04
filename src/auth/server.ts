import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { sendEmail } from "./email";
import type { AuthEnv } from "./env";

/**
 * Single source of truth for auth config (auditable secret/provider wiring).
 *
 * `createAuth` takes `env` and returns a fresh instance per request — Workers
 * have no long-lived process, so there are deliberately no module-level
 * singletons that capture env.
 *
 * D1 wiring: better-auth@1.6.23 detects a D1Database natively (it looks for
 * `batch`/`exec`/`prepare` on the object) and builds its own Kysely SQLite
 * dialect over it — so we pass `env.DB` straight through, no adapter needed.
 */
export function createAuth(env: AuthEnv) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: {
      enabled: true,
      // Start lenient: a player can sign in and play immediately. Revisit
      // before any abuse-sensitive surface.
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) =>
        sendEmail(env, {
          to: user.email,
          subject: "Reimposta la tua password di Cartina Muta",
          text: `Reimposta la password: ${url}`,
        }),
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) =>
        sendEmail(env, {
          to: user.email,
          subject: "Conferma la tua email per Cartina Muta",
          text: `Conferma la tua email: ${url}`,
        }),
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) =>
          sendEmail(env, {
            to: email,
            subject: "Il tuo link di accesso a Cartina Muta",
            text: `Tocca per accedere: ${url}`,
          }),
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh at most daily
    },
    advanced: {
      cookiePrefix: "cartina",
      // Cookies are HttpOnly + Secure + SameSite=Lax by Better Auth default.
    },
    databaseHooks: {
      user: {
        update: {
          // Leaderboard name is unchangeable once set (issue #3). Never
          // throw here — the magic-link plugin already only reads `name`
          // when creating a brand-new user (a returning user's sign-in
          // never touches their stored name), so this only guards a stray
          // second call to /update-user after NamePrompt's one-time set.
          // Silently keeping the existing name means a mismatched name
          // typed anywhere never breaks a legitimate request.
          before: async (data, ctx) => {
            if (typeof data.name !== "string" || !ctx) return;
            const userId = ctx.context.session?.user.id;
            if (!userId) return;
            const existing =
              await ctx.context.internalAdapter.findUserById(userId);
            if (existing?.name && data.name !== existing.name) {
              return { data: { name: existing.name } };
            }
          },
        },
      },
    },
  });
}
