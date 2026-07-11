import { useEffect, useState } from "react";
import type { Difficulty, GameMode } from "../game/engine";
import { fetchLeaderboard } from "../leaderboard/client";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  TIMER_DURATIONS,
} from "../leaderboard/constants";
import type { LeaderboardEntry } from "../leaderboard/types";

interface LeaderboardPanelProps {
  provinceId: string;
  provinceName: string;
  /** Pre-select a difficulty tab (e.g. the one being chosen in the wizard). */
  difficulty?: Difficulty;
}

const MODE_TABS: { mode: GameMode; label: string }[] = [
  { mode: { kind: "energy" }, label: "Energia" },
  { mode: { kind: "complete" }, label: "Completa" },
  ...TIMER_DURATIONS.map((seconds) => ({
    mode: { kind: "timer" as const, durationSeconds: seconds },
    label: `${seconds / 60} min`,
  })),
];

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; entries: LeaderboardEntry[] }
  | { status: "error"; message: string };

function formatClock(elapsedMs: number): string {
  const s = Math.max(0, Math.round(elapsedMs / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function LeaderboardPanel({
  provinceId,
  provinceName,
  difficulty: initialDifficulty = "normal",
}: LeaderboardPanelProps) {
  const [modeIndex, setModeIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const isEnergy = MODE_TABS[modeIndex].mode.kind === "energy";

  // Follow the wizard's difficulty selection when it changes upstream.
  useEffect(() => {
    setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchLeaderboard(provinceId, MODE_TABS[modeIndex].mode, difficulty).then(
      (res) => {
        if (cancelled) return;
        setState(
          res.ok
            ? { status: "loaded", entries: res.entries }
            : { status: "error", message: res.error },
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [provinceId, modeIndex, difficulty]);

  return (
    <aside className="leaderboard">
      <div className="leaderboard__head">
        <p className="leaderboard__title">Classifica · {provinceName}</p>
      </div>
      <div className="leaderboard__modes">
        {MODE_TABS.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            className={`leaderboard__mode-btn ${i === modeIndex ? "is-active" : ""}`}
            onClick={() => setModeIndex(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="leaderboard__modes leaderboard__difficulties">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            className={`leaderboard__mode-btn leaderboard__diff-btn ${d === difficulty ? "is-active" : ""}`}
            onClick={() => setDifficulty(d)}
          >
            {DIFFICULTY_LABELS[d]}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <p className="leaderboard__loading">Caricamento…</p>
      )}
      {state.status === "error" && (
        <p className="leaderboard__error">{state.message}</p>
      )}
      {state.status === "loaded" && state.entries.length === 0 && (
        <p className="leaderboard__empty">
          Nessun punteggio ancora. Sii il primo!
        </p>
      )}
      {state.status === "loaded" && state.entries.length > 0 && (
        <ol className="leaderboard__list">
          {state.entries.map((entry) => (
            <li key={entry.userId} className="leaderboard__row">
              <span className="leaderboard__rank">{entry.rank}</span>
              <span className="leaderboard__name">{entry.name}</span>
              {isEnergy ? (
                <span className="leaderboard__found">
                  {entry.score ?? 0} pt
                </span>
              ) : (
                <span className="leaderboard__found">
                  {entry.found}/{entry.totalRegions}
                </span>
              )}
              <span className="leaderboard__time">
                {isEnergy
                  ? `${entry.found}/${entry.totalRegions}`
                  : formatClock(entry.elapsedMs)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
