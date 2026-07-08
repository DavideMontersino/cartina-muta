/**
 * cartina-muta-rooms — the multiplayer backend Worker.
 *
 * Cloudflare Pages cannot host a Durable Object class (its Wrangler config
 * doesn't support DO migrations), so room state lives here in a sibling Worker
 * and the Pages frontend binds to it via `script_name`. One `Room` DO instance
 * == one room, addressed by `idFromName(code)`.
 *
 * Routes (an optional `/api` prefix lets the Pages Function forward same-origin):
 *   POST  /rooms            → create a room, returns { code }
 *   GET   /room/:code/ws    → WebSocket upgrade into that room
 */

import { generateCode } from "../../../src/multiplayer/code";
import {
  type ClientMessage,
  isRoundCount,
  type ServerErrorCode,
  type ServerMessage,
} from "../../../src/multiplayer/protocol";
import {
  createRoomState,
  type RoomState,
  reduceRoom,
  toLobbyView,
} from "../../../src/multiplayer/room";

export interface Env {
  ROOMS: DurableObjectNamespace;
}

/** Everything the DO persists, so it survives hibernation eviction. */
interface Persisted {
  room: RoomState;
  /** Secret per-player token → public player id. Never leaves the DO. */
  tokens: Record<string, string>;
}

interface Attachment {
  playerId: string;
}

const jsonHeaders = { "content-type": "application/json" };

/** One room. */
export class Room implements DurableObject {
  private readonly state: DurableObjectState;
  private cache: Persisted | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async data(): Promise<Persisted | null> {
    if (this.cache) return this.cache;
    this.cache = (await this.state.storage.get<Persisted>("data")) ?? null;
    return this.cache;
  }

  private async save(data: Persisted): Promise<void> {
    this.cache = data;
    await this.state.storage.put("data", data);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Internal: create/initialise the room (only ever called by POST /rooms).
    if (url.pathname === "/__init" && request.method === "POST") {
      if (await this.data()) {
        return new Response("exists", { status: 409 });
      }
      const { code, provinceId, rounds } = (await request.json()) as {
        code: string;
        provinceId: string;
        rounds: number;
      };
      if (!isRoundCount(rounds)) {
        return new Response("bad rounds", { status: 400 });
      }
      await this.save({
        room: createRoomState(code, provinceId, rounds),
        tokens: {},
      });
      return Response.json({ code });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      const data = await this.data();
      return Response.json({
        ok: true,
        exists: data !== null,
        sockets: this.state.getWebSockets().length,
      });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    // Hibernation API: the runtime can evict the DO from memory between
    // messages while keeping the socket open, so idle rooms cost nothing.
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    raw: string | ArrayBuffer,
  ): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : "") as ClientMessage;
    } catch {
      return this.sendError(ws, "bad_message", "Malformed message.");
    }

    const data = await this.data();
    if (!data) {
      return this.sendError(ws, "room_not_found", "This room does not exist.");
    }

    if (msg.t === "hello") {
      const name = msg.name?.trim();
      if (!name) {
        return this.sendError(ws, "name_required", "Choose a display name.");
      }
      let playerId = data.tokens[msg.token];
      if (!playerId) {
        playerId = crypto.randomUUID().slice(0, 8);
        data.tokens[msg.token] = playerId;
      }
      ws.serializeAttachment({ playerId } satisfies Attachment);
      data.room = reduceRoom(data.room, { type: "join", id: playerId, name });
      await this.save(data);
      return this.broadcast(data.room);
    }

    // Every other message requires an established (post-hello) player.
    const att = ws.deserializeAttachment() as Attachment | null;
    const playerId = att?.playerId;
    if (!playerId) {
      return this.sendError(ws, "bad_message", "Send hello first.");
    }

    switch (msg.t) {
      case "setConfig": {
        data.room = reduceRoom(data.room, {
          type: "setConfig",
          id: playerId,
          provinceId: msg.provinceId,
          rounds: msg.rounds,
        });
        await this.save(data);
        return this.broadcast(data.room);
      }
      case "start": {
        const before = data.room.phase;
        data.room = reduceRoom(data.room, { type: "start", id: playerId });
        if (data.room.phase === before && before === "lobby") {
          return this.sendError(ws, "not_host", "Only the host can start.");
        }
        await this.save(data);
        return this.broadcast(data.room);
      }
      case "leave": {
        data.room = reduceRoom(data.room, { type: "leave", id: playerId });
        await this.save(data);
        this.broadcast(data.room);
        ws.close(1000, "left");
        return;
      }
      default:
        return this.sendError(ws, "bad_message", "Unknown message.");
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    const playerId = att?.playerId;
    if (!playerId) return;

    // Only mark the player offline if this was their last open socket (a player
    // may have the room open in two tabs).
    const stillOpen = this.state
      .getWebSockets()
      .some(
        (other) =>
          other !== ws &&
          (other.deserializeAttachment() as Attachment | null)?.playerId ===
            playerId,
      );
    if (stillOpen) return;

    const data = await this.data();
    if (!data) return;
    data.room = reduceRoom(data.room, { type: "disconnect", id: playerId });
    await this.save(data);
    this.broadcast(data.room);
  }

  private broadcast(room: RoomState): void {
    for (const socket of this.state.getWebSockets()) {
      const att = socket.deserializeAttachment() as Attachment | null;
      if (!att?.playerId) continue;
      this.send(socket, { t: "lobby", state: toLobbyView(room, att.playerId) });
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    ws.send(JSON.stringify(message));
  }

  private sendError(
    ws: WebSocket,
    code: ServerErrorCode,
    message: string,
  ): void {
    this.send(ws, { t: "error", code, message });
  }
}

const ROOM_WS = /^\/(?:api\/)?room\/([A-Za-z0-9]+)\/ws$/;
const ROOMS = /^\/(?:api\/)?rooms$/;
const CREATE_ATTEMPTS = 5;

// The room API carries no cookies or user data, so it's safe to allow any
// origin. In production the Pages site forwards same-origin and this is moot;
// it's here so direct/cross-origin access (and local dev) works too.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (ROOMS.test(url.pathname)) {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
      }
      if (request.method === "POST") {
        return createRoom(request, env);
      }
    }

    const wsMatch = ROOM_WS.exec(url.pathname);
    if (wsMatch) {
      const code = wsMatch[1].toUpperCase();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      return stub.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function createRoom(request: Request, env: Env): Promise<Response> {
  let body: { provinceId?: unknown; rounds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const provinceId = String(body.provinceId ?? "");
  const rounds = Number(body.rounds);
  if (!/^[a-z]{1,3}$/.test(provinceId) || !isRoundCount(rounds)) {
    return new Response("bad config", { status: 400, headers: CORS });
  }

  // Generate a code and claim it; re-roll on the rare collision.
  for (let i = 0; i < CREATE_ATTEMPTS; i++) {
    const code = generateCode();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    const res = await stub.fetch("https://do/__init", {
      method: "POST",
      body: JSON.stringify({ code, provinceId, rounds }),
    });
    if (res.ok) {
      return new Response(JSON.stringify({ code }), {
        status: 201,
        headers: { ...jsonHeaders, ...CORS },
      });
    }
    if (res.status !== 409) {
      return new Response("init failed", { status: 502, headers: CORS });
    }
  }
  return new Response("no free code", { status: 503, headers: CORS });
}
