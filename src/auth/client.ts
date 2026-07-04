import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. `baseURL` defaults to same-origin, which is what we want
 * — the catch-all Pages Function lives at `/api/auth/*` on the same origin.
 * The `magicLinkClient` plugin adds `signIn.magicLink({ email })`.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
