// Same-origin proxy → the multiplayer rooms Worker.
//
// The frontend defaults to same-origin `/api` (see src/multiplayer/client.ts),
// so `POST /api/rooms` lands here. Cloudflare Pages can't host the Room
// Durable Object, so it lives in the sibling `cartina-muta-rooms` Worker,
// bound as the `ROOMS` service binding (see the root wrangler.toml). We forward
// the request through unchanged — the Worker's router already accepts the
// optional `/api/` prefix (`/^\/(?:api\/)?rooms$/`) and owns method handling +
// CORS, so a catch-all `onRequest` is all we need here.
//
// Without this proxy, `POST /api/rooms` falls through to Pages' static asset
// server, which only serves GET/HEAD and answers 405 — the bug this fixes.

interface RoomsEnv {
  ROOMS: Fetcher;
}

export const onRequest: PagesFunction<RoomsEnv> = (ctx) =>
  ctx.env.ROOMS.fetch(ctx.request);
