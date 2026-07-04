import type { GameState } from "../game/engine";
import { SignInCard } from "./SignInCard";

interface ResultCardProps {
  state: GameState;
  onRestart: () => void;
  onExit: () => void;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function ResultCard({ state, onExit }: ResultCardProps) {
  const total = state.map.features.length;
  const perfect = state.found === total && state.mistakes === 0;
  const timedOut =
    state.mode.kind === "timer" && state.timeLeft <= 0 && state.found < total;

  const title = perfect
    ? "Perfetto!"
    : timedOut
      ? "Tempo scaduto"
      : "Completato";

  return (
    <div className="overlay">
      <div className="result-card">
        <h2 className="result-card__title">{title}</h2>
        <div className="result-card__grid">
          <div className="result-stat">
            <span className="result-stat__value">
              {state.found}
              <span className="result-stat__of">/{total}</span>
            </span>
            <span className="result-stat__label">indovinati</span>
          </div>
          <div className="result-stat">
            <span className="result-stat__value">{state.mistakes}</span>
            <span className="result-stat__label">errori</span>
          </div>
          <div className="result-stat">
            <span className="result-stat__value">
              {formatClock(state.elapsed)}
            </span>
            <span className="result-stat__label">tempo</span>
          </div>
        </div>
        <SignInCard />
        <button
          type="button"
          className="btn btn--ghost result-card__again"
          onClick={onExit}
        >
          Gioca ancora
        </button>
      </div>
    </div>
  );
}
