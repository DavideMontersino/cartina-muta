import { useState } from "react";
import type { GameState } from "../game/engine";
import type { ScoreSubmissionPayload } from "../leaderboard/types";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { SignInCard } from "./SignInCard";

interface ResultCardProps {
  state: GameState;
  submission: ScoreSubmissionPayload | null;
  provinceId: string;
  provinceName: string;
  onRestart: () => void;
  onExit: () => void;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function ResultCard({
  state,
  submission,
  provinceId,
  provinceName,
  onRestart,
  onExit,
}: ResultCardProps) {
  const [showBoard, setShowBoard] = useState(false);
  const total = state.map.features.length;
  const isEnergy = state.mode.kind === "energy";
  const perfect = state.found === total && state.mistakes === 0;
  const timedOut =
    state.mode.kind === "timer" && state.timeLeft <= 0 && state.found < total;

  const title = isEnergy
    ? perfect
      ? "Provincia conquistata!"
      : "Energia esaurita"
    : perfect
      ? "Perfetto!"
      : timedOut
        ? "Tempo scaduto"
        : "Completato";

  return (
    <div className="overlay">
      <div className="result-card">
        <h2 className="result-card__title">{title}</h2>
        <div className="result-card__grid">
          {isEnergy ? (
            <div className="result-stat">
              <span className="result-stat__value">{state.score}</span>
              <span className="result-stat__label">punti</span>
            </div>
          ) : (
            <div className="result-stat">
              <span className="result-stat__value">{state.mistakes}</span>
              <span className="result-stat__label">errori</span>
            </div>
          )}
          <div className="result-stat">
            <span className="result-stat__value">
              {state.found}
              <span className="result-stat__of">/{total}</span>
            </span>
            <span className="result-stat__label">
              {isEnergy ? "profondità" : "indovinati"}
            </span>
          </div>
          <div className="result-stat">
            <span className="result-stat__value">
              {formatClock(state.elapsed)}
            </span>
            <span className="result-stat__label">tempo</span>
          </div>
        </div>
        <SignInCard submission={submission} />
        <button
          type="button"
          className="btn btn--ghost result-card__board-toggle"
          onClick={() => setShowBoard((v) => !v)}
        >
          {showBoard ? "Nascondi classifica" : "Vedi classifica"}
        </button>
        {showBoard && (
          <div className="result-card__board">
            <LeaderboardPanel
              provinceId={provinceId}
              provinceName={provinceName}
            />
          </div>
        )}
        <div className="result-card__actions">
          <button
            type="button"
            className="btn result-card__again"
            onClick={onRestart}
          >
            Gioca ancora
          </button>
          <button
            type="button"
            className="btn btn--ghost result-card__home"
            onClick={onExit}
          >
            Home page
          </button>
        </div>
      </div>
    </div>
  );
}
