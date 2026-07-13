import { Trophy } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import type { Difficulty, GameMode } from "../game/engine";
import { fetchLeaderboard } from "../leaderboard/client";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  encodeMode,
  TIMER_DURATIONS,
} from "../leaderboard/constants";
import { isReplayable } from "../leaderboard/replay";
import type { LeaderboardEntry } from "../leaderboard/types";
import { ReplayView } from "./ReplayView";

interface LeaderboardPanelProps {
  provinceId: string;
  provinceName: string;
  /** Pre-select a difficulty tab (e.g. the one being chosen in the wizard). */
  difficulty?: Difficulty;
  /** Pre-select a mode tab (e.g. from a shared leaderboard link — GitHub #48). */
  mode?: GameMode;
  /**
   * Called whenever the visible mode/difficulty selection changes, so a hosting
   * page can mirror it into the URL for a shareable link (GitHub #48). Omitted
   * where the board is embedded (result card) and shouldn't touch the URL.
   */
  onSelectionChange?: (mode: GameMode, difficulty: Difficulty) => void;
}

const MODE_TABS: { mode: GameMode; label: string }[] = [
  { mode: { kind: "energy" }, label: "Energia" },
  { mode: { kind: "complete" }, label: "Completa" },
  ...TIMER_DURATIONS.map((seconds) => ({
    mode: { kind: "timer" as const, durationSeconds: seconds },
    label: `${seconds / 60} min`,
  })),
];

/** Index of the tab matching a mode, or 0 (Energia) when absent/unknown. */
function modeTabIndex(mode: GameMode | undefined): number {
  if (!mode) return 0;
  const encoded = encodeMode(mode);
  const i = MODE_TABS.findIndex((t) => encodeMode(t.mode) === encoded);
  return i === -1 ? 0 : i;
}

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; entries: LeaderboardEntry[]; meUserId: string | null }
  | { status: "error"; message: string };

function formatClock(elapsedMs: number): string {
  const s = Math.max(0, Math.round(elapsedMs / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LeaderboardPanel({
  provinceId,
  provinceName,
  difficulty: initialDifficulty = "normal",
  mode: initialMode,
  onSelectionChange,
}: LeaderboardPanelProps) {
  const [modeIndex, setModeIndex] = useState(() => modeTabIndex(initialMode));
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // The game currently being replayed (GitHub #25), or null.
  const [replayId, setReplayId] = useState<string | null>(null);
  const isEnergy = MODE_TABS[modeIndex].mode.kind === "energy";

  // Follow the wizard's / shared link's selection when it changes upstream.
  useEffect(() => {
    setDifficulty(initialDifficulty);
  }, [initialDifficulty]);
  useEffect(() => {
    setModeIndex(modeTabIndex(initialMode));
  }, [initialMode]);

  // Mirror the live selection outward (e.g. into the URL) for shareable links.
  useEffect(() => {
    onSelectionChange?.(MODE_TABS[modeIndex].mode, difficulty);
  }, [modeIndex, difficulty, onSelectionChange]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchLeaderboard(provinceId, MODE_TABS[modeIndex].mode, difficulty).then(
      (res) => {
        if (cancelled) return;
        setState(
          res.ok
            ? { status: "loaded", entries: res.entries, meUserId: res.meUserId }
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
        <div className="leaderboard__empty">
          <Trophy className="leaderboard__empty-icon" aria-hidden="true" />
          <p>Nessun punteggio ancora.</p>
          <p className="leaderboard__empty-cta">Sii il primo!</p>
        </div>
      )}
      {state.status === "loaded" && state.entries.length > 0 && (
        <ol className="leaderboard__list">
          {state.entries.map((entry, i) => {
            const prev = state.entries[i - 1];
            // Server sends top 10 then a window around "me" (GitHub #28); a
            // rank jump means an omitted stretch — show an ellipsis divider.
            const gap = prev ? entry.rank - prev.rank > 1 : false;
            const replayable = isReplayable(entry.actionCount);
            const isMe =
              state.meUserId !== null && entry.userId === state.meUserId;

            const medal =
              entry.rank === 1
                ? "is-gold"
                : entry.rank === 2
                  ? "is-silver"
                  : entry.rank === 3
                    ? "is-bronze"
                    : "";

            const mistakesLabel =
              entry.mistakes === 0 ? null : `${entry.mistakes} err`;

            const cells = (
              <>
                <span className={`leaderboard__rank ${medal}`}>
                  {entry.rank}
                </span>
                <span className="leaderboard__name">
                  {entry.name}
                  <span className="leaderboard__sub">
                    {mistakesLabel && (
                      <span className="leaderboard__sub-mistakes">
                        {mistakesLabel}
                      </span>
                    )}
                    {formatDate(entry.createdAt)}
                  </span>
                </span>
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
              </>
            );

            const rowClass = `leaderboard__row ${isMe ? "is-me" : ""}`;

            return (
              <Fragment key={entry.userId}>
                {gap && (
                  <li className="leaderboard__gap" aria-hidden>
                    ⋯
                  </li>
                )}
                <li>
                  {replayable ? (
                    <button
                      type="button"
                      className={`${rowClass} leaderboard__row--clickable`}
                      onClick={() => setReplayId(entry.id)}
                      title="Rivedi la partita"
                    >
                      {cells}
                    </button>
                  ) : (
                    <div className={rowClass}>{cells}</div>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      )}

      {replayId && (
        <ReplayView gameId={replayId} onClose={() => setReplayId(null)} />
      )}
    </aside>
  );
}
