import { useEffect, useRef, useState } from "react";
import { loadMap } from "../../maps/registry";
import type { MapDefinition } from "../../maps/types";
import { rosterFromMap } from "../../multiplayer/client";
import type { Standing } from "../../multiplayer/protocol";
import { useRoom } from "../../multiplayer/useRoom";
import { GameRoom } from "./GameRoom";
import { LobbyScreen } from "./Lobby";
import { Results } from "./Results";
import { Standings } from "./Standings";

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

  // The standings shown at the *previous* interstitial/finale, so the next one
  // animates scores growing and ranks reshuffling from it. Read at render (holds
  // the prior snapshot); advanced in an effect only on standings/over phases —
  // not on every per-round reveal — so the growth spans the 3 rounds between.
  const lastShown = useRef<Standing[] | null>(null);
  const previous = lastShown.current;
  useEffect(() => {
    if (conn.phase === "standings" || conn.phase === "over") {
      lastShown.current = conn.standings;
    }
  }, [conn.phase, conn.standings]);

  if (conn.phase === "over") {
    return <Results conn={conn} previous={previous} onExit={onExit} />;
  }

  if (conn.phase === "standings") {
    return <Standings conn={conn} previous={previous} />;
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
