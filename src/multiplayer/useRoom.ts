/**
 * React hook that maintains a live WebSocket connection to a room and exposes
 * the latest lobby snapshot plus the actions a player can take. Reconnects with
 * backoff on an unexpected drop and re-sends `hello`, so a refresh or a flaky
 * network resumes the same player (identity comes from the persisted token).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { playerToken, roomWsUrl } from "./client";
import type {
  ClientMessage,
  LobbyView,
  RoundCount,
  ServerMessage,
} from "./protocol";

export type RoomStatus = "connecting" | "open" | "closed";

export interface RoomConnection {
  status: RoomStatus;
  lobby: LobbyView | null;
  error: string | null;
  setConfig: (patch: { provinceId?: string; rounds?: RoundCount }) => void;
  start: () => void;
  leave: () => void;
}

const MAX_BACKOFF_MS = 8000;

export function useRoom(code: string | null, name: string): RoomConnection {
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const closedByUs = useRef(false);
  const attempt = useRef(0);
  // Keep the latest name without forcing a reconnect when it changes.
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
        setError(null);
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
        if (msg.t === "lobby") {
          setLobby(msg.state);
          setError(null);
        } else if (msg.t === "error") {
          setError(msg.message);
          // A missing room won't fix itself — stop retrying.
          if (msg.code === "room_not_found") closedByUs.current = true;
        }
      };

      ws.onclose = () => {
        if (closedByUs.current) {
          setStatus("closed");
          return;
        }
        // Exponential backoff reconnect.
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
  const start = useCallback(() => send({ t: "start" }), [send]);
  const leave = useCallback(() => {
    closedByUs.current = true;
    send({ t: "leave" });
    wsRef.current?.close();
  }, [send]);

  return { status, lobby, error, setConfig, start, leave };
}
