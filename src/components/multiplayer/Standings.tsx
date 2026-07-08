import type { Standing } from "../../multiplayer/protocol";
import type { RoomConnection } from "../../multiplayer/useRoom";
import { StandingsBoard } from "./StandingsBoard";

interface StandingsProps {
  conn: RoomConnection;
  previous: Standing[] | null;
}

/** The between-rounds interstitial: animated scores growing + ranks reshuffling. */
export function Standings({ conn, previous }: StandingsProps) {
  const inter = conn.interstitial;
  return (
    <div className="wizard mp">
      <header className="home__head">
        <h1 className="home__title">Classifica</h1>
        {inter && (
          <p className="home__sub">
            dopo {inter.round} di {inter.total} round
          </p>
        )}
      </header>
      <div className="mp__center mp__center--top">
        <StandingsBoard
          standings={conn.standings ?? []}
          previous={previous}
          you={conn.lobby?.you}
        />
      </div>
    </div>
  );
}
