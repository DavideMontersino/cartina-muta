/**
 * cartina-muta-rooms — the multiplayer backend Worker.
 *
 * Cloudflare Pages cannot host a Durable Object class (its Wrangler config
 * doesn't support DO migrations), so the room state lives here in a sibling
 * Worker and the Pages frontend binds to it via `script_name` (see the repo's
 * root wrangler.toml, wired in Phase 1). One `Room` DO instance == one room.
 *
 * Phase 0 scope: prove a hibernating WebSocket room works end-to-end. The DO
 * just echoes/fan-outs whatever any socket sends to every connected socket.
 * Phases 1+ replace the message handling with real lobby/round logic.
 */

export interface Env {
  ROOMS: DurableObjectNamespace;
}

/** One room. Addressed by `idFromName(code)`, so a room code maps to an instance. */
export class Room implements DurableObject {
  private readonly state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      // Plain GET → a tiny health probe (also handy for smoke tests).
      return Response.json({
        ok: true,
        sockets: this.state.getWebSockets().length,
      });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    // Hibernation API: the runtime can evict the DO from memory between
    // messages while keeping the socket open, so idle rooms cost nothing.
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): void {
    const text = typeof message === "string" ? message : "(binary)";
    const payload = JSON.stringify({ type: "echo", text, at: Date.now() });
    // Fan-out to every connected socket (including the sender) — this is the
    // real-time broadcast primitive every later phase builds on.
    for (const socket of this.state.getWebSockets()) {
      socket.send(payload);
    }
  }

  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    ws.close(code, reason);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // /room/:code/ws → route to the DO instance for that code.
    const match = /^\/room\/([A-Za-z0-9]+)\/ws$/.exec(url.pathname);
    if (!match) return new Response("Not found", { status: 404 });

    const code = match[1].toUpperCase();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
