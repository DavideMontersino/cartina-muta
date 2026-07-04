import type { AuthEnv } from "../../../src/auth/env";
import { createAuth } from "../../../src/auth/server";

// Catch-all: every /api/auth/* request is handled by Better Auth. A fresh
// instance is built per request from the request's env (Workers have no
// long-lived process), then given the raw Request — Better Auth reads/writes
// the session cookie and talks to D1 itself.
export const onRequest: PagesFunction<AuthEnv> = (ctx) =>
  createAuth(ctx.env, ctx.request).handler(ctx.request);
