/**
 * Wire protocol shared by the `cartina-muta-rooms` Worker (the Room Durable
 * Object) and the React client. Keep this file free of any DOM/Worker-only
 * imports so both bundles can pull it in.
 */

/** Round-count choices the host picks at room creation. */
export const ROOM_ROUND_OPTIONS = [5, 10, 15] as const;
export type RoundCount = (typeof ROOM_ROUND_OPTIONS)[number];

export function isRoundCount(n: unknown): n is RoundCount {
  return (ROOM_ROUND_OPTIONS as readonly number[]).includes(n as number);
}

/** Room lifecycle. Phase 1 only exercises `lobby`; later phases add the rest. */
export type RoomPhase =
  | "lobby"
  | "playing"
  | "reveal"
  | "standings"
  | "finished";

/** A player as seen by everyone in the room (no secrets — never the token). */
export interface PlayerView {
  id: string;
  name: string;
  connected: boolean;
  score: number;
}

/** The lobby snapshot the server broadcasts on every change. */
export interface LobbyView {
  code: string;
  provinceId: string;
  rounds: RoundCount;
  hostId: string | null;
  phase: RoomPhase;
  players: PlayerView[];
  /** The recipient's own player id — filled per-connection by the DO. */
  you: string;
}

/** One comune the server can ask about (host uploads this roster on start). */
export interface RosterEntry {
  istat: string;
  name: string;
  population: number;
}

/** A round's answer, server-side: which comune to find. */
export interface Target {
  istat: string;
  name: string;
}

/** Per-player outcome of a resolved round. */
export interface RoundResult {
  id: string;
  correct: boolean;
  attempts: number;
  points: number;
}

/** A row in the running standings. */
export interface Standing {
  id: string;
  name: string;
  score: number;
}

/** Client → server messages (JSON over the WebSocket). */
export type ClientMessage =
  | { t: "hello"; token: string; name: string }
  | { t: "setConfig"; provinceId?: string; rounds?: RoundCount }
  | { t: "start"; roster: RosterEntry[] }
  | { t: "guess"; istat: string }
  | { t: "leave" };

export type ServerErrorCode =
  | "room_not_found"
  | "not_host"
  | "name_required"
  | "bad_message";

/** Server → client messages. */
export type ServerMessage =
  | { t: "lobby"; state: LobbyView }
  | { t: "error"; code: ServerErrorCode; message: string }
  | {
      t: "round";
      round: number;
      total: number;
      name: string;
      endsAt: number;
      /** Guesses this recipient has left this round (full on a fresh round). */
      attemptsLeft: number;
    }
  | { t: "guessAck"; correct: boolean; attemptsLeft: number }
  | { t: "progress"; finished: string[] }
  | {
      t: "reveal";
      round: number;
      total: number;
      targetIstat: string;
      results: RoundResult[];
      standings: Standing[];
    }
  | { t: "over"; standings: Standing[] };

/** Response body of `POST /rooms`. */
export interface CreateRoomResponse {
  code: string;
}
