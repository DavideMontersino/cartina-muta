import type { Standing } from "../../multiplayer/protocol";
import type { RoomConnection } from "../../multiplayer/useRoom";
import { StandingsBoard } from "./StandingsBoard";

interface ResultsProps {
  conn: RoomConnection;
  previous: Standing[] | null;
  onExit: () => void;
}

export function Results({ conn, previous, onExit }: ResultsProps) {
  return (
    <div className="wizard mp">
      <div className="wizard__bar">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          ← Esci
        </button>
      </div>
      <header className="home__head">
        <h1 className="home__title">Risultati</h1>
      </header>

      <div className="mp__center mp__center--top">
        <StandingsBoard
          standings={conn.standings ?? []}
          previous={previous}
          you={conn.lobby?.you}
          medals
        />
      </div>

      <div className="wizard__actions">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={onExit}
        >
          Torna alla home
        </button>
      </div>
    </div>
  );
}
