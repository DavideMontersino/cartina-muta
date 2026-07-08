import type { RoomConnection } from "../../multiplayer/useRoom";

interface ResultsProps {
  conn: RoomConnection;
  onExit: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** Basic final standings. Phase 3 (#22) animates the score/rank reshuffle. */
export function Results({ conn, onExit }: ResultsProps) {
  const standings = conn.standings ?? [];
  const you = conn.lobby?.you;

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

      <ol className="mp-results">
        {standings.map((s, i) => (
          <li
            key={s.id}
            className={`mp-results__row ${s.id === you ? "mp-results__row--you" : ""}`}
          >
            <span className="mp-results__rank">{MEDALS[i] ?? i + 1}</span>
            <span className="mp-results__name">{s.name}</span>
            <span className="mp-results__score">{s.score}</span>
          </li>
        ))}
      </ol>

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
