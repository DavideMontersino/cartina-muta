/**
 * React hook that owns the live WebSocket connection to a room and the full
 * game state derived from the server's messages (lobby → rounds → reveal →
 * over). Reconnects with backoff and re-sends `hello`, so a refresh resumes the
 * same player (identity comes from the persisted token). The server is
 * authoritative; this hook only mirrors what it broadcasts.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { playerToken, roomWsUrl } from "./client";
import type {
  ClientMessage,
  LobbyView,
  RosterEntry,
  RoundCount,
  RoundResult,
  ServerMessage,
  Standing,
} from "./protocol";

export type RoomStatus = "connecting" | "open" | "closed";
export type Phase = "lobby" | "playing" | "reveal" | "standings" | "over";

export interface RoundInfo {
  round: number;
  total: number;
  name: string;
  endsAt: number;
}

export interface RevealInfo {
  round: number;
  total: number;
  targetIstat: string;
  results: RoundResult[];
  standings: Standing[];
}

interface NetState {
  lobby: LobbyView | null;
  phase: Phase;
  round: RoundInfo | null;
  attemptsLeft: number;
  finished: string[];
  /** Bumped on every guess ack so the map can flash feedback. */
  lastGuess: { correct: boolean; at: number } | null;
  reveal: RevealInfo | null;
  standings: Standing[] | null;
  /** Round context for the standings interstitial (round of total). */
  interstitial: { round: number; total: number } | null;
  error: string | null;
}

const initialNet: NetState = {
  lobby: null,
  phase: "lobby",
  round: null,
  attemptsLeft: 0,
  finished: [],
  lastGuess: null,
  reveal: null,
  standings: null,
  interstitial: null,
  error: null,
};

function apply(state: NetState, msg: ServerMessage): NetState {
  switch (msg.t) {
    case "lobby":
      return {
        ...state,
        lobby: msg.state,
        // A mid-game lobby update (someone (dis)connected) must not reset the
        // round; only an actual lobby phase pulls us back to the lobby screen.
        phase: msg.state.phase === "lobby" ? "lobby" : state.phase,
        error: null,
      };
    case "round":
      return {
        ...state,
        phase: "playing",
        round: {
          round: msg.round,
          total: msg.total,
          name: msg.name,
          endsAt: msg.endsAt,
        },
        attemptsLeft: msg.attemptsLeft,
        finished: [],
        lastGuess: null,
        reveal: null,
      };
    case "guessAck":
      return {
        ...state,
        attemptsLeft: msg.attemptsLeft,
        lastGuess: { correct: msg.correct, at: Date.now() },
      };
    case "progress":
      return { ...state, finished: msg.finished };
    case "reveal":
      return {
        ...state,
        phase: "reveal",
        reveal: {
          round: msg.round,
          total: msg.total,
          targetIstat: msg.targetIstat,
          results: msg.results,
          standings: msg.standings,
        },
        standings: msg.standings,
      };
    case "standings":
      return {
        ...state,
        phase: "standings",
        standings: msg.standings,
        interstitial: { round: msg.round, total: msg.total },
      };
    case "over":
      return { ...state, phase: "over", standings: msg.standings };
    case "error":
      return { ...state, error: msg.message };
    default:
      return state;
  }
}

export interface RoomConnection extends NetState {
  status: RoomStatus;
  setConfig: (patch: { provinceId?: string; rounds?: RoundCount }) => void;
  start: (roster: RosterEntry[]) => void;
  guess: (istat: string) => void;
  leave: () => void;
}

const MAX_BACKOFF_MS = 8000;

export function useRoom(code: string | null, name: string): RoomConnection {
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [net, dispatch] = useReducer(apply, initialNet);

  const wsRef = useRef<WebSocket | null>(null);
  const closedByUs = useRef(false);
  const attempt = useRef(0);
  const nameRef = useRef(name);
  nameRef.current = name;

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    if (!code || !name.trim()) return;
    closedByUs.current = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(roomWsUrl(code));
      wsRef.current = ws;

      ws.onopen = () => {
        attempt.current = 0;
        setStatus("open");
        ws.send(
          JSON.stringify({
            t: "hello",
            token: playerToken(code),
            name: nameRef.current.trim(),
          } satisfies ClientMessage),
        );
      };

      ws.onmessage = (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data) as ServerMessage;
        } catch {
          return;
        }
        if (msg.t === "error" && msg.code === "room_not_found") {
          closedByUs.current = true; // no point retrying a missing room
        }
        dispatch(msg);
      };

      ws.onclose = () => {
        if (closedByUs.current) {
          setStatus("closed");
          return;
        }
        const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt.current++);
        setStatus("connecting");
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByUs.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [code, name]);

  const setConfig = useCallback(
    (patch: { provinceId?: string; rounds?: RoundCount }) =>
      send({ t: "setConfig", ...patch }),
    [send],
  );
  const start = useCallback(
    (roster: RosterEntry[]) => send({ t: "start", roster }),
    [send],
  );
  const guess = useCallback(
    (istat: string) => send({ t: "guess", istat }),
    [send],
  );
  const leave = useCallback(() => {
    closedByUs.current = true;
    send({ t: "leave" });
    wsRef.current?.close();
  }, [send]);

  return { status, ...net, setConfig, start, guess, leave };
}
