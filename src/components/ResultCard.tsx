import { Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import type { GameState } from "../game/engine";
import type { SubmitScoreResult } from "../leaderboard/client";
import {
  DIFFICULTY_LABELS,
  leaderboardPath,
  modeLabel,
} from "../leaderboard/constants";
import type { ScoreSubmissionPayload } from "../leaderboard/types";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { ShareGameButton } from "./ShareGameButton";
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
  // Set once the score saves (signed-in): unlocks the rank + shareable link.
  const [recap, setRecap] = useState<SubmitScoreResult | null>(null);
  const total = state.map.features.length;
  const isEnergy = state.mode.kind === "energy";
  const perfect = state.found === total && state.mistakes === 0;
  const timedOut =
    state.mode.kind === "timer" && state.timeLeft <= 0 && state.found < total;

  const title = isEnergy
    ? perfect
      ? "Provincia conquistata!"
      : "Game over"
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
        {recap && submission && (
          <div className="result-card__recap">
            <p className="result-card__rank">
              <Trophy size={16} aria-hidden="true" />
              <span>
                <strong>
                  {recap.rank}° su {recap.totalPlayers}
                </strong>{" "}
                in classifica · {modeLabel(submission.mode)} ·{" "}
                {DIFFICULTY_LABELS[submission.difficulty]}
              </span>
            </p>
            <div className="result-card__recap-actions">
              <ShareGameButton gameId={recap.id} />
              <Link
                href={leaderboardPath(
                  provinceId,
                  submission.mode,
                  submission.difficulty,
                )}
                className="btn btn--ghost btn--sm"
              >
                Vedi classifica →
              </Link>
            </div>
          </div>
        )}
        <SignInCard submission={submission} onSubmitted={setRecap} />
        <button
          type="button"
          className="btn btn--ghost result-card__board-toggle"
          onClick={() => setShowBoard((v) => !v)}
        >
          {showBoard ? "Nascondi classifica" : "Vedi classifica qui"}
        </button>
        {showBoard && (
          <div className="result-card__board">
            <LeaderboardPanel
              provinceId={provinceId}
              provinceName={provinceName}
              difficulty={submission?.difficulty}
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
