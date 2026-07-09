// Same-origin proxy → the multiplayer rooms Worker (WebSocket upgrade).
//
// The client connects to `wss://<origin>/api/room/<CODE>/ws` when no
// `VITE_ROOMS_WS_BASE` is baked in (see src/multiplayer/client.ts). This
// forwards the upgrade to the sibling `cartina-muta-rooms` Worker via the
// `ROOMS` service binding, which resolves the room code to its Durable Object.
// The request is passed through unchanged — the Worker's router matches the
// `/api/`-prefixed path (`/^\/(?:api\/)?room\/([A-Za-z0-9]+)\/ws$/`) and
// service bindings forward the WebSocket (101) response transparently.

interface RoomsEnv {
  ROOMS: Fetcher;
}

export const onRequest: PagesFunction<RoomsEnv> = (ctx) =>
  ctx.env.ROOMS.fetch(ctx.request);
