import { describe, expect, it } from "vitest";
import {
  createRoomState,
  type RoomState,
  reduceRoom,
  toLobbyView,
} from "./room";

const base = (): RoomState => createRoomState("ABCD", "cn", 10);

describe("createRoomState", () => {
  it("starts in the lobby with no players and no host", () => {
    const s = base();
    expect(s.phase).toBe("lobby");
    expect(s.players).toEqual([]);
    expect(s.hostId).toBeNull();
  });
});

describe("join", () => {
  it("adds a new player and makes the first joiner the host", () => {
    const s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    expect(s.players).toHaveLength(1);
    expect(s.players[0]).toMatchObject({
      id: "p1",
      name: "Ada",
      connected: true,
      score: 0,
    });
    expect(s.hostId).toBe("p1");
  });

  it("keeps the original host when a second player joins", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    expect(s.players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(s.hostId).toBe("p1");
  });

  it("treats a repeat join as a reconnect (no duplicate, marks connected)", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "disconnect", id: "p1" });
    expect(s.players[0].connected).toBe(false);
    s = reduceRoom(s, { type: "join", id: "p1", name: "Ada" });
    expect(s.players).toHaveLength(1);
    expect(s.players[0].connected).toBe(true);
  });

  it("updates the display name on reconnect", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p1", name: "Ada L." });
    expect(s.players[0].name).toBe("Ada L.");
  });

  it("rejects brand-new players once the game has started", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "start", id: "p1" });
    const after = reduceRoom(s, { type: "join", id: "p2", name: "Latecomer" });
    expect(after.players.map((p) => p.id)).toEqual(["p1"]);
  });

  it("still lets an existing player reconnect after the game started", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    s = reduceRoom(s, { type: "start", id: "p1" });
    s = reduceRoom(s, { type: "disconnect", id: "p2" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    expect(s.players.find((p) => p.id === "p2")?.connected).toBe(true);
  });
});

describe("disconnect / leave host handoff", () => {
  it("promotes the next connected player when the host disconnects", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    s = reduceRoom(s, { type: "disconnect", id: "p1" });
    expect(s.hostId).toBe("p2");
    expect(s.players.find((p) => p.id === "p1")?.connected).toBe(false);
  });

  it("leaves host null when the last player disconnects", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "disconnect", id: "p1" });
    expect(s.hostId).toBeNull();
  });

  it("does not hand off when a non-host disconnects", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    s = reduceRoom(s, { type: "disconnect", id: "p2" });
    expect(s.hostId).toBe("p1");
  });

  it("removes a player entirely on leave and hands off host", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    s = reduceRoom(s, { type: "leave", id: "p1" });
    expect(s.players.map((p) => p.id)).toEqual(["p2"]);
    expect(s.hostId).toBe("p2");
  });

  it("does not reclaim host for the original creator on reconnect after handoff", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    s = reduceRoom(s, { type: "disconnect", id: "p1" });
    expect(s.hostId).toBe("p2");
    s = reduceRoom(s, { type: "join", id: "p1", name: "Ada" });
    expect(s.hostId).toBe("p2");
  });
});

describe("setConfig", () => {
  it("lets the host change province and rounds in the lobby", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, {
      type: "setConfig",
      id: "p1",
      provinceId: "to",
      rounds: 15,
    });
    expect(s.provinceId).toBe("to");
    expect(s.rounds).toBe(15);
  });

  it("ignores config changes from a non-host", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    s = reduceRoom(s, { type: "setConfig", id: "p2", rounds: 5 });
    expect(s.rounds).toBe(10);
  });

  it("ignores config changes once started", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "start", id: "p1" });
    s = reduceRoom(s, { type: "setConfig", id: "p1", rounds: 5 });
    expect(s.rounds).toBe(10);
  });
});

describe("start", () => {
  it("lets the host start with at least one player", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "start", id: "p1" });
    expect(s.phase).toBe("playing");
  });

  it("refuses to start from a non-host", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    s = reduceRoom(s, { type: "start", id: "p2" });
    expect(s.phase).toBe("lobby");
  });

  it("refuses to start an empty room", () => {
    const s = reduceRoom(base(), { type: "start", id: "p1" });
    expect(s.phase).toBe("lobby");
  });
});

describe("toLobbyView", () => {
  it("projects public fields and stamps the recipient's own id", () => {
    let s = reduceRoom(base(), { type: "join", id: "p1", name: "Ada" });
    s = reduceRoom(s, { type: "join", id: "p2", name: "Bob" });
    const view = toLobbyView(s, "p2");
    expect(view.you).toBe("p2");
    expect(view.code).toBe("ABCD");
    expect(view.players).toEqual([
      { id: "p1", name: "Ada", connected: true, score: 0 },
      { id: "p2", name: "Bob", connected: true, score: 0 },
    ]);
  });
});
