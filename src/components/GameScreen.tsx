import { Flame } from "lucide-react";
import {
  type CSSProperties,
  Fragment,
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
import {
  pickCampanile,
  pickFact,
  pickFailReaction,
  pickReaction,
} from "../game/reactions";
import type {
  ActionLogEntry,
  ScoreSubmissionPayload,
} from "../leaderboard/types";
import { ConfirmExitDialog } from "./ConfirmExitDialog";
import { MapCanvas, type MapCanvasRef } from "./MapCanvas";
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

// Energy mode's trivia/campanile popup: long enough to actually read a fact
// and look at a photo. The energy drain is paused for its whole duration.
const ENERGY_FACT_POPUP_MS = 3200;

export function GameScreen({ config, onExit, onRestart }: GameScreenProps) {
  const isEnergy = config.mode.kind === "energy";
  // Difficulty (GitHub #34) drives what the map shows, not the reducer:
  //   - hardcore hides comune borders until each is resolved (relief off),
  //   - easy shows relief, normal + hardcore don't.
  // The difficulty fixes relief for the whole game — there's no in-game toggle,
  // so a mode can't be softened by turning relief on/off mid-play.
  const difficulty = config.difficulty;
  const hideBorders = difficulty === "hardcore";
  const terrain = difficulty === "easy";
  const [state, dispatch] = useReducer(reducer, config, (c) => createGame(c));
  const [isRevealing, setIsRevealing] = useState(false);
  const [isAnimatingMap, setIsAnimatingMap] = useState(false);
  const mapRef = useRef<MapCanvasRef>(null);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [wrongKey, setWrongKey] = useState(0);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [reaction, setReaction] = useState<{
    id: number;
    text: string;
    tone: "win" | "miss" | "fail";
    /** A trivia fact for the revealed comune (win/fail only). */
    fact?: string | null;
    /** Campanile photo URL for the revealed comune (win/fail only). */
    campanile?: string;
  } | null>(null);
  const [energyToast, setEnergyToast] = useState<{
    id: number;
    kind: "hit" | "miss";
    /** Local-language reaction shown on a miss (in place of distance/bearing). */
    reaction: string;
    /** A trivia fact for the just-hit comune (hit only, when it has one). */
    fact?: string | null;
    /** Campanile photo URL for the just-hit comune (hit only, when it has one). */
    campanile?: string;
  } | null>(null);
  // Energy mode's fact + campanile photo popup for the give-up/fail reveal
  // (skip or the 3rd-miss auto-reveal) — the win case's own fact/photo rides
  // along in the energyToast "rich" variant above instead.
  const [energyFact, setEnergyFact] = useState<{
    id: number;
    tone: "fail";
    fact?: string | null;
    campanile?: string;
  } | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const wrongTimer = useRef<number | undefined>(undefined);
  const revealTimer = useRef<number | undefined>(undefined);
  const reactionTimer = useRef<number | undefined>(undefined);
  const energyToastTimer = useRef<number | undefined>(undefined);
  // Resolving this early cancels the energyFact popup timer (dismiss on click).
  const energyFactResolveRef = useRef<(() => void) | null>(null);
  // The target a pending energy-mode guess was against — captured so the
  // "3rd miss" auto-reveal (which advances the round before this effect
  // sees it) still knows which region to flash, mirroring the skip flow.
  const pendingEnergyTargetRef = useRef<number | null>(null);
  // ISTAT of the comune the current round is asking for — captured at guess/skip
  // time so reactions resolve municipality-level flavour even after the reducer
  // has advanced the cursor (a correct guess moves on to the next target).
  const roundTargetIstatRef = useRef<string | null>(null);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: `target` is a re-run trigger (new round presented), not a value the effect reads.
  useEffect(() => {
    roundStartRef.current = performance.now();
  }, [target]);

  const submission = useMemo<ScoreSubmissionPayload | null>(() => {
    if (finalElapsedMs === null) return null;
    return {
      provinceId: config.map.id,
      mode: config.mode,
      difficulty,
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
    difficulty,
    isEnergy,
    state.found,
    state.missed,
    state.mistakes,
    state.score,
  ]);

  // Tick once per second while playing (drives the timer/energy drain and elapsed clock).
  // Paused while the exit confirmation is up, so deciding doesn't cost time/energy.
  useEffect(() => {
    if (!playing || confirmExit || isRevealing) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(id);
  }, [playing, confirmExit, isRevealing]);

  // On a wrong region-index guess (timer/complete modes): flash the region
  // red briefly on the map, and surface its name in a fixed overlay (lower
  // third of the screen, never on top of the region itself) for long enough
  // to actually read it. A correct guess clears any still-pending wrong-guess
  // overlay right away, so it can't linger into the next round.
  useEffect(() => {
    if (!state.feedback) return;
    if (state.feedback.correct) {
      setIsAnimatingMap(true);
      setTimeout(() => {
        mapRef.current?.resetZoom();
        setTimeout(() => setIsAnimatingMap(false), 650);
      }, 50);

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

  // Energy mode: after the round auto-resolves (3rd miss), briefly pulse the
  // region that was actually the target — the reducer has already advanced
  // to the next one, so this relies on the target captured before dispatch.
  useEffect(() => {
    if (!isEnergy || !state.feedback || state.feedback.correct) return;
    const missedTarget = pendingEnergyTargetRef.current;
    if (missedTarget === null || state.status[missedTarget] !== "missed")
      return;

    let active = true;
    const runAnimation = async () => {
      setIsRevealing(true);
      setIsAnimatingMap(true);
      await new Promise((r) => setTimeout(r, 50));
      if (!active) return;
      mapRef.current?.resetZoom();
      setRevealIndex(missedTarget);
      await new Promise((r) => setTimeout(r, 1200));
      if (!active) return;
      setRevealIndex(null);
      setIsAnimatingMap(false);
      const istat = config.map.features[missedTarget].istat;
      const fact = pickFact(istat);
      const campanile = pickCampanile(istat) ?? undefined;
      if (fact || campanile) {
        setEnergyFact({ id: performance.now(), tone: "fail", fact, campanile });
        await new Promise<void>((resolve) => {
          energyFactResolveRef.current = resolve;
          setTimeout(resolve, ENERGY_FACT_POPUP_MS);
        });
        energyFactResolveRef.current = null;
        if (!active) return;
        setEnergyFact(null);
      }
      setIsRevealing(false);
    };
    runAnimation();

    return () => {
      active = false;
      setIsRevealing(false);
      setIsAnimatingMap(false);
      setEnergyFact(null);
    };
  }, [isEnergy, state.feedback, state.status, config.map.features]);

  // On every guess: surface a funny local reaction (curse/praise), with
  // dialect flavour when the province has one and streak-aware milestones.
  // Energy mode shows its own structured score/distance toast instead.
  useEffect(() => {
    if (isEnergy || !state.feedback) return;
    const istat = roundTargetIstatRef.current ?? undefined;
    const correct = state.feedback.correct;
    const text = pickReaction(
      config.map.id,
      correct,
      state.correctStreak,
      state.wrongStreak,
      Math.random,
      istat,
    );
    // The comune is only revealed on a win here, so its fact/campanile ride
    // along only then — showing them on a miss would spoil the still-hidden
    // target. (Giving up via Salta shows them through its own fail toast.)
    setReaction({
      id: state.feedback.id,
      text,
      tone: correct ? "win" : "miss",
      fact: correct ? pickFact(istat) : undefined,
      campanile: correct ? (pickCampanile(istat) ?? undefined) : undefined,
    });
    window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => setReaction(null), 2600);
  }, [
    isEnergy,
    state.feedback,
    state.correctStreak,
    state.wrongStreak,
    config.map.id,
  ]);

  // Energy mode: itemized score toast on a hit, a local-language reaction on a
  // miss (same dialect phrase pool the classic modes use). A hit on a seeded
  // comune also carries its fact/photo — same "freeze the clock during an
  // overlay" rule the fail/skip reveal above follows, so there's time to read it.
  useEffect(() => {
    if (!isEnergy || !state.feedback) return;
    const correct = state.feedback.correct;
    const istat = roundTargetIstatRef.current ?? undefined;
    // On a hit the comune is revealed, so its fact/photo can ride along (only
    // for seeded comuni; otherwise these stay null/undefined and don't render).
    const fact = correct ? pickFact(istat) : undefined;
    const campanile = correct ? (pickCampanile(istat) ?? undefined) : undefined;
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
            Math.random,
            istat,
          ),
      fact,
      campanile,
    });
    window.clearTimeout(energyToastTimer.current);
    const rich = Boolean(fact || campanile);
    if (rich) setIsRevealing(true);
    // Linger longer when there's a fact/photo to actually read.
    energyToastTimer.current = window.setTimeout(
      () => {
        setEnergyToast(null);
        if (rich) setIsRevealing(false);
      },
      rich ? 3800 : 2200,
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
    if (target === null || isRevealing) return;
    // Keep in sync with the energy-mode auto-reveal effect below, which
    // otherwise re-fires on this dispatch's status change and can
    // overwrite this reveal with a stale target from an earlier miss.
    pendingEnergyTargetRef.current = target;
    const istat = config.map.features[target].istat;
    roundTargetIstatRef.current = istat;
    // Giving up reveals the answer, so its taunt/fact/campanile show now.
    // Energy mode has its own reveal UI, so this fail toast is classic-only.
    if (!isEnergy) {
      window.clearTimeout(reactionTimer.current);
      setReaction({
        id: performance.now(),
        text: pickFailReaction(istat),
        tone: "fail",
        fact: pickFact(istat),
        campanile: pickCampanile(istat) ?? undefined,
      });
      reactionTimer.current = window.setTimeout(() => setReaction(null), 2600);
    }
    logRef.current.push({
      tMs: Math.round(performance.now() - startRef.current),
      type: "skip",
      targetIstat: config.map.features[target].istat,
    });

    const runAnimation = async () => {
      setIsRevealing(true);
      setIsAnimatingMap(true);
      await new Promise((r) => setTimeout(r, 50));
      mapRef.current?.resetZoom();
      setRevealIndex(target);
      await new Promise((r) => setTimeout(r, 1200));
      setRevealIndex(null);
      setIsAnimatingMap(false);
      // Energy mode's own fact/campanile popup (classic already showed its
      // fail toast above) — holds the clock paused a bit longer to read it.
      if (isEnergy) {
        const fact = pickFact(istat);
        const campanile = pickCampanile(istat) ?? undefined;
        if (fact || campanile) {
          setEnergyFact({
            id: performance.now(),
            tone: "fail",
            fact,
            campanile,
          });
          await new Promise<void>((resolve) => {
            energyFactResolveRef.current = resolve;
            setTimeout(resolve, ENERGY_FACT_POPUP_MS);
          });
          energyFactResolveRef.current = null;
          setEnergyFact(null);
        }
      }
      setIsRevealing(false);
      dispatch({ type: "skip" });
    };

    runAnimation();
  }, [target, config.map.features, isRevealing, isEnergy]);

  const handlePick = useCallback(
    (index: number) => {
      if (target === null) return;
      // Energy mode's 3rd-miss auto-reveal advances the round before the reveal
      // effect runs, so capture the target now (mirrors the skip flow).
      if (isEnergy) pendingEnergyTargetRef.current = target;
      roundTargetIstatRef.current = config.map.features[target].istat;
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
            revealIndex={revealIndex}
            onPick={handlePick}
            panZoom
            interactive={playing && !isRevealing}
            isAnimating={isAnimatingMap}
            terrain={terrain}
            hideBorders={hideBorders}
          />
          {wrongIndex !== null && (
            <div key={wrongKey} className="wrong-name-toast">
              {config.map.features[wrongIndex].name}
            </div>
          )}
          {energyFact && (
            // biome-ignore lint/a11y/useKeyWithClickEvents: popup dismissal is a convenience shortcut, not the only interaction path
            // biome-ignore lint/a11y/noStaticElementInteractions: same as above
            <div
              key={energyFact.id}
              className={`reaction-toast reaction-toast--${energyFact.tone} energy-fact-toast`}
              onClick={() => {
                energyFactResolveRef.current?.();
                energyFactResolveRef.current = null;
              }}
            >
              {energyFact.campanile && (
                <img
                  className="reaction-toast__campanile"
                  src={energyFact.campanile}
                  alt="Campanile"
                />
              )}
              {energyFact.fact && (
                <span className="reaction-toast__fact">{energyFact.fact}</span>
              )}
            </div>
          )}
          {energyToast && (
            <div
              key={energyToast.id}
              className={`energy-toast ${energyToast.kind === "hit" ? "energy-toast--hit" : "energy-toast--miss"}${energyToast.campanile || energyToast.fact ? " energy-toast--rich" : ""}`}
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
                      {(
                        [
                          state.scoreBreakdown.streakMultiplier > 1
                            ? {
                                key: "streak",
                                node: (
                                  <span className="energy-toast__streak">
                                    <Flame size={14} aria-hidden="true" /> serie
                                    di {state.scoreBreakdown.correctStreak} ·
                                    punti ×
                                    {state.scoreBreakdown.streakMultiplier}
                                  </span>
                                ),
                              }
                            : null,
                          state.scoreBreakdown.firstTryBonus > 0
                            ? { key: "first-try", node: "primo colpo" }
                            : state.scoreBreakdown.speedBonus > 0
                              ? { key: "speed", node: "fulmineo" }
                              : null,
                        ] as const
                      )
                        .filter((item) => item !== null)
                        .map(({ key, node }, i) => (
                          <Fragment key={key}>
                            {i > 0 && " · "}
                            {node}
                          </Fragment>
                        ))}
                    </span>
                  )}
                  {energyToast.campanile && (
                    <img
                      className="reaction-toast__campanile"
                      src={energyToast.campanile}
                      alt="Campanile"
                    />
                  )}
                  {energyToast.fact && (
                    <span className="reaction-toast__fact">
                      {energyToast.fact}
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
          {playing && target !== null && !isRevealing && (
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

      {playing && target !== null && !isRevealing && (
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
          // biome-ignore lint/a11y/useKeyWithClickEvents: popup dismissal is a convenience shortcut, not the only interaction path
          // biome-ignore lint/a11y/noStaticElementInteractions: same as above
          <div
            key={reaction.id}
            className={`reaction-toast reaction-toast--${reaction.tone}${reaction.tone !== "miss" ? " reaction-toast--interactive" : ""}`}
            onClick={
              reaction.tone !== "miss"
                ? () => {
                    window.clearTimeout(reactionTimer.current);
                    setReaction(null);
                  }
                : undefined
            }
          >
            {reaction.campanile && (
              <img
                className="reaction-toast__campanile"
                src={reaction.campanile}
                alt="Campanile"
              />
            )}
            <span className="reaction-toast__text">{reaction.text}</span>
            {reaction.fact && (
              <span className="reaction-toast__fact">{reaction.fact}</span>
            )}
          </div>
        )}
        <MapCanvas
          ref={mapRef}
          map={config.map}
          status={state.status}
          flashIndex={flashIndex}
          revealIndex={revealIndex}
          onPick={handlePick}
          panZoom
          interactive={
            playing && (reaction === null || reaction.tone === "miss")
          }
          isAnimating={isAnimatingMap}
          terrain={terrain}
          hideBorders={hideBorders}
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
