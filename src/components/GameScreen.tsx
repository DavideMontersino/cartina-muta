import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  createGame,
  currentTarget,
  type GameConfig,
  reducer,
} from "../game/engine";
import { MapCanvas } from "./MapCanvas";
import { ResultCard } from "./ResultCard";

interface GameScreenProps {
  config: GameConfig;
  onExit: () => void;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function GameScreen({ config, onExit }: GameScreenProps) {
  const [state, dispatch] = useReducer(reducer, config, (c) => createGame(c));
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const wrongTimer = useRef<number | undefined>(undefined);
  const revealTimer = useRef<number | undefined>(undefined);

  const total = config.map.features.length;
  const target = currentTarget(state);
  const playing = state.phase === "playing";

  // Tick once per second while playing (drives the timer and elapsed clock).
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  // On a wrong guess: flash the region red briefly and surface its name a
  // little longer so the player can read what they actually clicked.
  useEffect(() => {
    if (!state.feedback || state.feedback.correct) return;
    const { index } = state.feedback;
    setFlashIndex(index);
    setWrongIndex(index);
    window.clearTimeout(flashTimer.current);
    window.clearTimeout(wrongTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashIndex(null), 550);
    wrongTimer.current = window.setTimeout(() => setWrongIndex(null), 1300);
  }, [state.feedback]);

  useEffect(
    () => () => {
      window.clearTimeout(flashTimer.current);
      window.clearTimeout(wrongTimer.current);
      window.clearTimeout(revealTimer.current);
    },
    [],
  );

  const handleSkip = useCallback(() => {
    if (target === null) return;
    setRevealIndex(target);
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => setRevealIndex(null), 1100);
    dispatch({ type: "skip" });
  }, [target]);

  const handlePick = useCallback(
    (index: number) => dispatch({ type: "guess", index }),
    [],
  );

  const resolved = state.found + state.missed;

  return (
    <div className="game">
      <header className="hud">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          ← Menu
        </button>
        <div className="hud__stats">
          <div className="stat">
            <span className="stat__value">{state.found}</span>
            <span className="stat__label">
              / {total} {config.map.unit.plural}
            </span>
          </div>
          {config.mode.kind === "timer" ? (
            <div
              className={`stat stat--clock ${state.timeLeft <= 10 ? "stat--urgent" : ""}`}
            >
              <span className="stat__value">{formatClock(state.timeLeft)}</span>
              <span className="stat__label">rimasto</span>
            </div>
          ) : (
            <div className="stat stat--clock">
              <span className="stat__value">{formatClock(state.elapsed)}</span>
              <span className="stat__label">trascorso</span>
            </div>
          )}
        </div>
      </header>

      {playing && target !== null && (
        <div className="prompt">
          <span className="prompt__cue">Trova</span>
          <h2 className="prompt__name">{config.map.features[target].name}</h2>
          <button type="button" className="btn btn--skip" onClick={handleSkip}>
            Salta / mostra
          </button>
        </div>
      )}

      <div className="map-wrap">
        <MapCanvas
          map={config.map}
          status={state.status}
          flashIndex={flashIndex}
          wrongIndex={wrongIndex}
          revealIndex={revealIndex}
          onPick={handlePick}
          interactive={playing}
        />
        <div className="progress-bar" aria-hidden>
          <div
            className="progress-bar__fill"
            style={{ width: `${(resolved / total) * 100}%` }}
          />
        </div>
      </div>

      {!playing && (
        <ResultCard state={state} onRestart={onExit} onExit={onExit} />
      )}
    </div>
  );
}
