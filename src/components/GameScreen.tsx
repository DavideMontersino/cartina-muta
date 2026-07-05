import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { compassArrow } from "../game/distance";
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
import { ConfirmExitDialog } from "./ConfirmExitDialog";
import { HamburgerMenu } from "./HamburgerMenu";
import { MapCanvas, type MapCanvasHandle } from "./MapCanvas";
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
  // True while the map is flying to a missed/skipped answer and back — the
  // clock pauses and the next prompt stays hidden until the map settles.
  const [revealing, setRevealing] = useState(false);
  const mapRef = useRef<MapCanvasHandle | null>(null);
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
  const reactionTimer = useRef<number | undefined>(undefined);
  const energyToastTimer = useRef<number | undefined>(undefined);
  // Previous status array, so a status effect can spot the region that just
  // flipped to found/missed and drive the matching viewport animation.
  const prevStatusRef = useRef(state.status);
  // Precise time the current round's target was presented — energy mode's
  // speed bonus needs this, but the reducer only tracks rounded whole
  // seconds via "tick".
  const roundStartRef = useRef(performance.now());

  // Precise action log for leaderboard replay — kept out of the pure
  // reducer, which only tracks the rounded whole-second `elapsed`.
  const startRef = useRef(performance.now());
  const logRef = useRef<ActionLogEntry[]>([]);
  const [finalElapsedMs, setFinalElapsedMs] = useState<number | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const total = config.map.features.length;
  const target = currentTarget(state);
  const playing = state.phase === "playing";

  // Interrupting an active game always asks for confirmation; once it's
  // already finished there's nothing left to interrupt.
  const requestExit = useCallback(() => {
    if (playing) setConfirmExit(true);
    else onExit();
  }, [playing, onExit]);

  // Capture the precise elapsed time the instant the game finishes, not
  // whenever a submission eventually happens — otherwise time spent reading
  // the result screen would inflate the recorded score.
  useEffect(() => {
    if (state.phase === "finished" && finalElapsedMs === null) {
      setFinalElapsedMs(Math.round(performance.now() - startRef.current));
    }
  }, [state.phase, finalElapsedMs]);

  // Start the round's speed-bonus clock when the prompt actually becomes
  // visible — not while the reveal animation is still hiding it — so the
  // fly-to-answer time never eats into the player's reaction window.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `target` is a re-run trigger (new round presented), not a value the effect reads.
  useEffect(() => {
    if (!revealing) roundStartRef.current = performance.now();
  }, [target, revealing]);

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
  // Paused while the exit confirmation is up, so deciding doesn't cost time/energy,
  // and while a reveal animation plays, so the answer fly-out is time/energy-free.
  useEffect(() => {
    if (!playing || confirmExit || revealing) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(id);
  }, [playing, confirmExit, revealing]);

  // On a wrong region-index guess (timer/complete modes): flash the region
  // red briefly on the map, and surface its name in a fixed overlay (lower
  // third of the screen, never on top of the region itself) for long enough
  // to actually read it. A correct guess clears any still-pending wrong-guess
  // overlay right away, so it can't linger into the next round.
  useEffect(() => {
    if (!state.feedback) return;
    if (state.feedback.correct) {
      window.clearTimeout(flashTimer.current);
      window.clearTimeout(wrongTimer.current);
      setFlashIndex(null);
      setWrongIndex(null);
      return;
    }
    if (state.feedback.index === null) return;
    const { index, id } = state.feedback;
    setFlashIndex(index);
    setWrongIndex(index);
    setWrongKey(id);
    window.clearTimeout(flashTimer.current);
    window.clearTimeout(wrongTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashIndex(null), 550);
    wrongTimer.current = window.setTimeout(() => setWrongIndex(null), 2400);
  }, [state.feedback]);

  // On every round transition, animate the viewport. When a region is missed
  // (a skip, or the last energy-mode failure) fly onto it and flash it so the
  // player sees where it was — even if it was off-screen — then fly back to
  // the whole province. When one is found, just ease back to the whole
  // province. Detected off the status array so skip and 3rd-miss share a path.
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = state.status;
    if (prev === state.status) return;
    for (let i = 0; i < state.status.length; i++) {
      if (prev[i] === state.status[i]) continue;
      if (state.status[i] === "missed") {
        setRevealing(true);
        const finish = () => setRevealing(false);
        if (mapRef.current) mapRef.current.reveal(i, finish);
        else finish();
      } else if (state.status[i] === "found") {
        mapRef.current?.resetView();
      }
      return;
    }
  }, [state.status]);

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
      window.clearTimeout(reactionTimer.current);
      window.clearTimeout(energyToastTimer.current);
    },
    [],
  );

  const handleSkip = useCallback(() => {
    if (target === null) return;
    logRef.current.push({
      tMs: Math.round(performance.now() - startRef.current),
      type: "skip",
      targetIstat: config.map.features[target].istat,
    });
    // The reveal fly-to is driven by the status effect once `skip` marks the
    // target `missed`.
    dispatch({ type: "skip" });
  }, [target, config.map.features]);

  const handlePick = useCallback(
    (index: number) => {
      if (target === null) return;
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
            ref={mapRef}
            map={config.map}
            status={state.status}
            flashIndex={flashIndex}
            onPick={handlePick}
            panZoom
            interactive={playing && !revealing}
          />
          {wrongIndex !== null && (
            <div key={wrongKey} className="wrong-name-toast">
              {config.map.features[wrongIndex].name}
            </div>
          )}
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
                <>
                  <span className="energy-toast__miss">
                    {energyToast.reaction}
                  </span>
                  {state.feedback?.distanceKm !== undefined &&
                    state.feedback.bearingDeg !== undefined && (
                      <span className="energy-toast__hint">
                        {Math.round(state.feedback.distanceKm)} km{" "}
                        {compassArrow(state.feedback.bearingDeg)}
                      </span>
                    )}
                </>
              )}
            </div>
          )}
        </div>

        <header className="hud hud--overlay">
          <button
            type="button"
            className="btn btn--ghost hud__menu"
            onClick={requestExit}
          >
            ← Menu
          </button>
          <HamburgerMenu
            provinceId={config.map.id}
            provinceName={config.map.name}
          />
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
          {playing && target !== null && !revealing && (
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
            provinceId={config.map.id}
            provinceName={config.map.name}
            onRestart={onRestart}
            onExit={onExit}
          />
        )}

        {confirmExit && (
          <ConfirmExitDialog
            onConfirm={onExit}
            onCancel={() => setConfirmExit(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="game">
      <header className="hud">
        <div className="hud__left">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={requestExit}
          >
            ← Menu
          </button>
          <HamburgerMenu
            provinceId={config.map.id}
            provinceName={config.map.name}
          />
        </div>
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
        // Kept mounted (with a stable-height placeholder) during a reveal so
        // the map doesn't reflow while the answer flies out and back.
        <div className="prompt">
          {revealing ? (
            <span className="prompt__name prompt__name--revealing" aria-hidden>
              …
            </span>
          ) : (
            <>
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
            </>
          )}
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
          ref={mapRef}
          map={config.map}
          status={state.status}
          flashIndex={flashIndex}
          onPick={handlePick}
          panZoom
          interactive={playing && !revealing}
        />
        {wrongIndex !== null && (
          <div key={wrongKey} className="wrong-name-toast">
            {config.map.features[wrongIndex].name}
          </div>
        )}
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
          provinceId={config.map.id}
          provinceName={config.map.name}
          onRestart={onExit}
          onExit={onExit}
        />
      )}

      {confirmExit && (
        <ConfirmExitDialog
          onConfirm={onExit}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </div>
  );
}
