/**
 * Pure room state + reducer for the multiplayer lobby. No I/O, no WebSocket,
 * no storage — the Room Durable Object owns those and drives this reducer, so
 * the game rules stay deterministic and unit-testable (mirrors
 * `src/game/engine.ts`). Player ids here are the *public* ids the DO assigns;
 * the secret per-player token never reaches this layer.
 */

import type { LobbyView, PlayerView, RoomPhase, RoundCount } from "./protocol";

export interface RoomPlayer {
  id: string;
  name: string;
  connected: boolean;
  score: number;
}

export interface RoomState {
  code: string;
  provinceId: string;
  rounds: RoundCount;
  hostId: string | null;
  phase: RoomPhase;
  /** Join order — stable, so the lobby list doesn't jump around. */
  players: RoomPlayer[];
}

export type RoomAction =
  | { type: "join"; id: string; name: string }
  | { type: "disconnect"; id: string }
  | { type: "leave"; id: string }
  | { type: "setConfig"; id: string; provinceId?: string; rounds?: RoundCount }
  | { type: "start"; id: string };

export function createRoomState(
  code: string,
  provinceId: string,
  rounds: RoundCount,
): RoomState {
  return {
    code,
    provinceId,
    rounds,
    hostId: null,
    phase: "lobby",
    players: [],
  };
}

/** First still-connected player that isn't `excludeId`, or null. */
function nextHost(players: RoomPlayer[], excludeId: string): string | null {
  return players.find((p) => p.id !== excludeId && p.connected)?.id ?? null;
}

export function reduceRoom(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "join": {
      const existing = state.players.find((p) => p.id === action.id);
      let players: RoomPlayer[];
      if (existing) {
        // Reconnect / rename — never duplicate a returning player.
        players = state.players.map((p) =>
          p.id === action.id
            ? { ...p, connected: true, name: action.name || p.name }
            : p,
        );
      } else {
        // New players may only appear during the lobby.
        if (state.phase !== "lobby") return state;
        players = [
          ...state.players,
          { id: action.id, name: action.name, connected: true, score: 0 },
        ];
      }
      // The first player to arrive (the creator) becomes host. Once set, a
      // reconnect never silently steals host back after a handoff.
      const hostId = state.hostId ?? action.id;
      return { ...state, players, hostId };
    }

    case "disconnect": {
      const players = state.players.map((p) =>
        p.id === action.id ? { ...p, connected: false } : p,
      );
      const hostId =
        state.hostId === action.id
          ? nextHost(players, action.id)
          : state.hostId;
      return { ...state, players, hostId };
    }

    case "leave": {
      const players = state.players.filter((p) => p.id !== action.id);
      const hostId =
        state.hostId === action.id
          ? nextHost(players, action.id)
          : state.hostId;
      return { ...state, players, hostId };
    }

    case "setConfig": {
      if (action.id !== state.hostId || state.phase !== "lobby") return state;
      return {
        ...state,
        provinceId: action.provinceId ?? state.provinceId,
        rounds: action.rounds ?? state.rounds,
      };
    }

    case "start": {
      if (action.id !== state.hostId || state.phase !== "lobby") return state;
      if (state.players.length === 0) return state;
      return { ...state, phase: "playing" };
    }

    default:
      return state;
  }
}

/** Project internal state into the per-recipient snapshot sent over the wire. */
export function toLobbyView(state: RoomState, you: string): LobbyView {
  const players: PlayerView[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
    score: p.score,
  }));
  return {
    code: state.code,
    provinceId: state.provinceId,
    rounds: state.rounds,
    hostId: state.hostId,
    phase: state.phase,
    players,
    you,
  };
}
