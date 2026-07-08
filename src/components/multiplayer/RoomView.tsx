import { useEffect, useState } from "react";
import { loadMap } from "../../maps/registry";
import type { MapDefinition } from "../../maps/types";
import { rosterFromMap } from "../../multiplayer/client";
import { useRoom } from "../../multiplayer/useRoom";
import { GameRoom } from "./GameRoom";
import { LobbyScreen } from "./Lobby";
import { Results } from "./Results";

interface RoomViewProps {
  code: string;
  name: string;
  onExit: () => void;
}

/**
 * Owns the single room connection and routes between lobby, live game, and
 * results. The province map is preloaded as soon as it's known, so the host can
 * start instantly (it supplies the comuni roster) and the game renders with no
 * extra wait.
 */
export function RoomView({ code, name, onExit }: RoomViewProps) {
  const conn = useRoom(code, name);
  const provinceId = conn.lobby?.provinceId ?? null;
  const [map, setMap] = useState<MapDefinition | null>(null);

  useEffect(() => {
    if (!provinceId) return;
    let cancelled = false;
    loadMap(provinceId).then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, [provinceId]);

  const mapReady = map !== null && map.id === provinceId;

  if (conn.phase === "over") {
    return <Results conn={conn} onExit={onExit} />;
  }

  if (conn.phase === "playing" || conn.phase === "reveal") {
    if (!mapReady) {
      return (
        <div className="wizard mp">
          <div className="mp__center">
            <div className="spinner" />
            <p className="home__sub">Caricamento mappa…</p>
          </div>
        </div>
      );
    }
    return <GameRoom conn={conn} map={map} onExit={onExit} />;
  }

  return (
    <LobbyScreen
      conn={conn}
      code={code}
      mapReady={mapReady}
      onStart={() => map && conn.start(rosterFromMap(map))}
      onExit={onExit}
    />
  );
}
