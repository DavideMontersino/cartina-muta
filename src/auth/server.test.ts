/**
 * Guards the set of origins auth trusts. The custom domain lives here (issue
 * #31: campanilismi.davidemontersino.com), so a dropped or mistyped origin
 * would silently break magic-link sign-in / callbacks from that domain.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { describe, expect, it } from "vitest";
import type { AuthEnv } from "./env";
import { createAuth, STATIC_TRUSTED_ORIGINS } from "./server";

// Better Auth detects a D1Database by the presence of prepare/batch/exec; it
// doesn't run any query at construction, so a method-shaped stub is enough to
// build the instance and inspect its resolved options.
const stubDb = {
  prepare: () => stubDb,
  batch: async () => [],
  exec: async () => ({}),
} as unknown as D1Database;

const env: AuthEnv = {
  DB: stubDb,
  BETTER_AUTH_SECRET: "test-secret-at-least-32-chars-long!!",
  BETTER_AUTH_URL: "http://localhost:5173",
  EMAIL_DEV_STUB: "1",
};

describe("auth trusted origins", () => {
  it("trusts the campanilismi custom domain", () => {
    expect(STATIC_TRUSTED_ORIGINS).toContain(
      "https://campanilismi.davidemontersino.com",
    );
  });

  it("keeps the pages.dev deploy origin", () => {
    expect(STATIC_TRUSTED_ORIGINS).toContain("https://cartina-muta.pages.dev");
  });

  it("wires the static origins into the auth instance", () => {
    const auth = createAuth(
      env,
      new Request("https://campanilismi.davidemontersino.com/api/auth/x"),
    );
    const trusted = auth.options.trustedOrigins as string[];
    for (const origin of STATIC_TRUSTED_ORIGINS) {
      expect(trusted).toContain(origin);
    }
    // The per-request origin is trusted too.
    expect(trusted).toContain("https://campanilismi.davidemontersino.com");
  });
});
