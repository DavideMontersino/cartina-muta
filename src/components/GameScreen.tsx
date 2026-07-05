import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  createGame,
  currentTarget,
  type GameConfig,
  reducer,
} from "../game/engine";
import { pickReaction } from "../game/reactions";
import type {
  ActionLogEntry,
  ScoreSubmissionPayload,
} from "../leaderboard/types";
import { MapCanvas } from "./MapCanvas";
import { ResultCard } from "./ResultCard";

interface GameScreenProps {
  config: GameConfig;
  onExit: () => void;
  onRestart: () => void;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function GameScreen({ config, onExit, onRestart }: GameScreenProps) {
  const isEnergy = config.mode.kind === "energy";
  const [state, dispatch] = useReducer(reducer, config, (c) => createGame(c));
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [wrongKey, setWrongKey] = useState(0);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [reaction, setReaction] = useState<{ id: number; text: string } | null>(
    null,
  );
  const [energyToast, setEnergyToast] = useState<{
    id: number;
    kind: "hit" | "miss";
    /** Local-language reaction shown on a miss (in place of distance/bearing). */
    reaction: string;
  } | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const wrongTimer = useRef<number | undefined>(undefined);
  const revealTimer = useRef<number | undefined>(undefined);
  const reactionTimer = useRef<number | undefined>(undefined);
  const energyToastTimer = useRef<number | undefined>(undefined);
  // The target a pending energy-mode guess was against — captured so the
  // "3rd miss" auto-reveal (which advances the round before this effect
  // sees it) still knows which region to flash, mirroring the skip flow.
  const pendingEnergyTargetRef = useRef<number | null>(null);
  // Precise time the current round's target was presented — energy mode's
  // speed bonus needs this, but the reducer only tracks rounded whole
  // seconds via "tick".
  const roundStartRef = useRef(performance.now());

  // Precise action log for leaderboard replay — kept out of the pure
  // reducer, which only tracks the rounded whole-second `elapsed`.
  const startRef = useRef(performance.now());
  const logRef = useRef<ActionLogEntry[]>([]);
  const [finalElapsedMs, setFinalElapsedMs] = useState<number | null>(null);

  const total = config.map.features.length;
  const target = currentTarget(state);
  const playing = state.phase === "playing";

  // Capture the precise elapsed time the instant the game finishes, not
  // whenever a submission eventually happens — otherwise time spent reading
  // the result screen would inflate the recorded score.
  useEffect(() => {
    if (state.phase === "finished" && finalElapsedMs === null) {
      setFinalElapsedMs(Math.round(performance.now() - startRef.current));
    }
  }, [state.phase, finalElapsedMs]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `target` is a re-run trigger (new round presented), not a value the effect reads.
  useEffect(() => {
    roundStartRef.current = performance.now();
  }, [target]);

  const submission = useMemo<ScoreSubmissionPayload | null>(() => {
    if (finalElapsedMs === null) return null;
    return {
      provinceId: config.map.id,
      mode: config.mode,
      found: state.found,
      missed: state.missed,
      mistakes: state.mistakes,
      elapsedMs: finalElapsedMs,
      score: isEnergy ? state.score : undefined,
      actionLog: logRef.current,
    };
  }, [
    finalElapsedMs,
    config.map.id,
    config.mode,
    isEnergy,
    state.found,
    state.missed,
    state.mistakes,
    state.score,
  ]);

  // Tick once per second while playing (drives the timer/energy drain and elapsed clock).
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  // On a wrong region-index guess (timer/complete modes): flash the region
  // red briefly and surface its name a little longer so the player can read
  // what they actually clicked.
  useEffect(() => {
    if (!state.feedback || state.feedback.correct) return;
    if (state.feedback.index === null) return;
    const { index, id } = state.feedback;
    setFlashIndex(index);
    setWrongIndex(index);
    setWrongKey(id);
    window.clearTimeout(flashTimer.current);
    window.clearTimeout(wrongTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashIndex(null), 550);
    wrongTimer.current = window.setTimeout(() => setWrongIndex(null), 1300);
  }, [state.feedback]);

  // Energy mode: after the round auto-resolves (3rd miss), briefly pulse the
  // region that was actually the target — the reducer has already advanced
  // to the next one, so this relies on the target captured before dispatch.
  useEffect(() => {
    if (!isEnergy || !state.feedback || state.feedback.correct) return;
    const missedTarget = pendingEnergyTargetRef.current;
    if (missedTarget === null || state.status[missedTarget] !== "missed")
      return;
    setRevealIndex(missedTarget);
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => setRevealIndex(null), 1100);
  }, [isEnergy, state.feedback, state.status]);

  // On every guess: surface a funny local reaction (curse/praise), with
  // dialect flavour when the province has one and streak-aware milestones.
  // Energy mode shows its own structured score/distance toast instead.
  useEffect(() => {
    if (isEnergy || !state.feedback) return;
    const text = pickReaction(
      config.map.id,
      state.feedback.correct,
      state.correctStreak,
      state.wrongStreak,
    );
    setReaction({ id: state.feedback.id, text });
    window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => setReaction(null), 2200);
  }, [
    isEnergy,
    state.feedback,
    state.correctStreak,
    state.wrongStreak,
    config.map.id,
  ]);

  // Energy mode: itemized score toast on a hit, a local-language reaction on a
  // miss (same dialect phrase pool the classic modes use).
  useEffect(() => {
    if (!isEnergy || !state.feedback) return;
    const correct = state.feedback.correct;
    setEnergyToast({
      id: state.feedback.id,
      kind: correct ? "hit" : "miss",
      reaction: correct
        ? ""
        : pickReaction(
            config.map.id,
            false,
            state.correctStreak,
            state.wrongStreak,
          ),
    });
    window.clearTimeout(energyToastTimer.current);
    energyToastTimer.current = window.setTimeout(
      () => setEnergyToast(null),
      2200,
    );
  }, [
    isEnergy,
    state.feedback,
    state.correctStreak,
    state.wrongStreak,
    config.map.id,
  ]);

  useEffect(
    () => () => {
      window.clearTimeout(flashTimer.current);
      window.clearTimeout(wrongTimer.current);
      window.clearTimeout(revealTimer.current);
      window.clearTimeout(reactionTimer.current);
      window.clearTimeout(energyToastTimer.current);
    },
    [],
  );

  const handleSkip = useCallback(() => {
    if (target === null) return;
    // Keep in sync with the energy-mode auto-reveal effect below, which
    // otherwise re-fires on this dispatch's status change and can
    // overwrite this reveal with a stale target from an earlier miss.
    pendingEnergyTargetRef.current = target;
    logRef.current.push({
      tMs: Math.round(performance.now() - startRef.current),
      type: "skip",
      targetIstat: config.map.features[target].istat,
    });
    setRevealIndex(target);
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => setRevealIndex(null), 1100);
    dispatch({ type: "skip" });
  }, [target, config.map.features]);

  const handlePick = useCallback(
    (index: number) => {
      if (target === null) return;
      // Energy mode's 3rd-miss auto-reveal advances the round before the reveal
      // effect runs, so capture the target now (mirrors the skip flow).
      if (isEnergy) pendingEnergyTargetRef.current = target;
      logRef.current.push({
        tMs: Math.round(performance.now() - startRef.current),
        type: "guess",
        targetIstat: config.map.features[target].istat,
        guessIstat: config.map.features[index].istat,
        correct: index === target,
      });
      dispatch({
        type: "guess",
        index,
        roundElapsedMs: isEnergy
          ? Math.round(performance.now() - roundStartRef.current)
          : undefined,
      });
    },
    [target, config.map.features, isEnergy],
  );

  const resolved = state.found + state.missed;

  if (isEnergy) {
    return (
      <div className="game game--energy">
        <div className="map-wrap map-wrap--full">
          <MapCanvas
            map={config.map}
            status={state.status}
            flashIndex={flashIndex}
            wrongIndex={wrongIndex}
            wrongKey={wrongKey}
            revealIndex={revealIndex}
            onPick={handlePick}
            panZoom
            interactive={playing}
          />
          {energyToast && (
            <div
              key={energyToast.id}
              className={`energy-toast ${energyToast.kind === "hit" ? "energy-toast--hit" : "energy-toast--miss"}`}
            >
              {energyToast.kind === "hit" && state.scoreBreakdown ? (
                <>
                  <span className="energy-toast__total">
                    +{state.scoreBreakdown.total}
                  </span>
                  {(state.scoreBreakdown.streakMultiplier > 1 ||
                    state.scoreBreakdown.firstTryBonus > 0 ||
                    state.scoreBreakdown.speedBonus > 0) && (
                    <span className="energy-toast__detail">
                      {[
                        state.scoreBreakdown.streakMultiplier > 1
                          ? `× ${state.scoreBreakdown.streakMultiplier} streak`
                          : null,
                        state.scoreBreakdown.firstTryBonus > 0
                          ? "primo colpo"
                          : state.scoreBreakdown.speedBonus > 0
                            ? "fulmineo"
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </>
              ) : (
                <span className="energy-toast__miss">
                  {energyToast.reaction}
                </span>
              )}
            </div>
          )}
        </div>

        <header className="hud hud--overlay">
          <button
            type="button"
            className="btn btn--ghost hud__menu"
            onClick={onExit}
          >
            ← Menu
          </button>
          <div
            className={`energy-bar ${state.energy <= 25 ? "energy-bar--low" : ""}`}
            aria-hidden
          >
            <div
              className="energy-bar__fill"
              style={{ "--energy": `${state.energy}%` } as CSSProperties}
            />
          </div>
          <div className="hud__stats">
            <div className="stat">
              <span className="stat__value">{state.score}</span>
              <span className="stat__label">punti</span>
            </div>
          </div>
          {playing && target !== null && (
            <div className="prompt prompt--overlay">
              <span className="prompt__cue">Trova</span>
              <h2 className="prompt__name">
                {config.map.features[target].name}
              </h2>
              <button
                type="button"
                className="btn btn--skip"
                onClick={handleSkip}
              >
                Salta / mostra
              </button>
            </div>
          )}
        </header>

        {!playing && (
          <ResultCard
            state={state}
            submission={submission}
            onRestart={onRestart}
            onExit={onExit}
          />
        )}
      </div>
    );
  }

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
        {reaction && (
          <div
            key={reaction.id}
            className={`reaction-toast ${state.feedback?.correct ? "reaction-toast--correct" : "reaction-toast--wrong"}`}
          >
            {reaction.text}
          </div>
        )}
        <MapCanvas
          map={config.map}
          status={state.status}
          flashIndex={flashIndex}
          wrongIndex={wrongIndex}
          wrongKey={wrongKey}
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
        <ResultCard
          state={state}
          submission={submission}
          onRestart={onExit}
          onExit={onExit}
        />
      )}
    </div>
  );
}
