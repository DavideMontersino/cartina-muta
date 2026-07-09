import { describe, expect, it } from "vitest";
import { ROOM_WS, ROOMS } from "./index";

// The frontend defaults to same-origin `/api` (src/multiplayer/client.ts) and
// the Pages Functions forward those requests to this Worker unchanged, so its
// router must accept the `/api/`-prefixed paths as well as the bare ones.
// Without the optional prefix, same-origin `POST /api/rooms` never reaches
// createRoom and Pages' static server answers 405 — the multiplayer bug.
describe("rooms Worker routing", () => {
  it("matches /rooms with and without the /api proxy prefix", () => {
    expect(ROOMS.test("/rooms")).toBe(true);
    expect(ROOMS.test("/api/rooms")).toBe(true);
    expect(ROOMS.test("/roomsX")).toBe(false);
    expect(ROOMS.test("/api/room")).toBe(false);
  });

  it("matches the room WS path with and without the /api proxy prefix", () => {
    expect(ROOM_WS.test("/room/ABCD/ws")).toBe(true);
    expect(ROOM_WS.test("/api/room/ABCD/ws")).toBe(true);
    expect(ROOM_WS.exec("/api/room/abc123/ws")?.[1]).toBe("abc123");
    expect(ROOM_WS.test("/room/ABCD")).toBe(false);
    expect(ROOM_WS.test("/room/AB-CD/ws")).toBe(false);
  });
});
