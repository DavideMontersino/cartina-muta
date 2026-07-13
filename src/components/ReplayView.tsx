import { Check, Link2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchGame } from "../leaderboard/client";
import { gameReplayPath } from "../leaderboard/constants";
import { buildReplayFrames, type ReplayFrame } from "../leaderboard/replay";
import type { GameReplay } from "../leaderboard/types";
import { loadMap } from "../maps/registry";
import type { MapDefinition } from "../maps/types";
import { MapCanvas } from "./MapCanvas";

interface ReplayViewProps {
  gameId: string;
  onClose: () => void;
  /** Notified once the game loads (GitHub #48) — lets a page build a back link. */
  onLoaded?: (game: GameReplay) => void;
}

interface Loaded {
  game: GameReplay;
  map: MapDefinition;
  frames: ReplayFrame[];
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Loaded };

// One step every this-many ms while auto-playing. Fixed cadence, not the log's
// real timestamps — a real game can span minutes; the replay stays watchable.
const STEP_MS = 1100;

function outcomeLabel(frame: ReplayFrame, map: MapDefinition): string {
  const { action } = frame;
  if (action.type === "skip") return "Saltato";
  if (action.correct) return "Trovato ✓";
  const guessed =
    frame.flashIndex !== null ? map.features[frame.flashIndex]?.name : null;
  return guessed ? `Sbagliato: ${guessed} ✗` : "Sbagliato ✗";
}

// Full-screen replay of a recorded game (GitHub #25): steps the leaderboard
// row's action log through a re-used MapCanvas. Opened as an overlay from a
// clickable leaderboard row.
export function ReplayView({ gameId, onClose, onLoaded }: ReplayViewProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setStep(0);
    setPlaying(false);
    setCopied(false);
    fetchGame(gameId).then(async (res) => {
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: res.error });
        return;
      }
      try {
        const map = await loadMap(res.game.provinceId);
        if (cancelled) return;
        const istatToIndex = new Map(
          map.features.map((f, i) => [f.istat, i] as const),
        );
        const frames = buildReplayFrames(
          res.game.actionLog,
          istatToIndex,
          map.features.length,
        );
        setState({ status: "ready", data: { game: res.game, map, frames } });
        setPlaying(frames.length > 1);
        onLoaded?.(res.game);
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Impossibile caricare la mappa.",
          });
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [gameId, onLoaded]);

  const frames = state.status === "ready" ? state.data.frames : [];
  const lastStep = Math.max(0, frames.length - 1);

  // Auto-advance while playing; stop at the end.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= lastStep) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [playing, frames.length, lastStep]);

  const current = frames[Math.min(step, lastStep)] ?? null;

  const shareLink = async () => {
    const url = `${window.location.origin}${gameReplayPath(gameId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / denied) — surface the URL so the
      // player can copy it by hand rather than failing silently.
      window.prompt("Copia il link della partita:", url);
    }
  };

  const caption = useMemo(() => {
    if (state.status !== "ready" || !current) return null;
    const { map } = state.data;
    const target =
      current.targetIndex !== null
        ? map.features[current.targetIndex]?.name
        : "?";
    return { target, outcome: outcomeLabel(current, map) };
  }, [state, current]);

  return (
    <div className="replay" role="dialog" aria-modal="true">
      <div className="replay__bar">
        <div className="replay__meta">
          {state.status === "ready" && (
            <>
              <span className="replay__who">{state.data.game.name}</span>
              <span className="replay__where">{state.data.map.name}</span>
            </>
          )}
        </div>
        <div className="replay__bar-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={shareLink}
            disabled={state.status !== "ready"}
            title="Copia il link della partita"
          >
            {copied ? (
              <>
                <Check size={14} aria-hidden="true" /> Copiato
              </>
            ) : (
              <>
                <Link2 size={14} aria-hidden="true" /> Condividi
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onClose}
          >
            ✕ Chiudi
          </button>
        </div>
      </div>

      {state.status === "loading" && (
        <div className="replay__center">
          <div className="spinner" />
        </div>
      )}
      {state.status === "error" && (
        <div className="replay__center">
          <p className="leaderboard__error">{state.message}</p>
        </div>
      )}

      {state.status === "ready" && current && (
        <>
          <div className="replay__map">
            <MapCanvas
              map={state.data.map}
              status={current.status}
              flashIndex={current.flashIndex}
              revealIndex={current.revealIndex}
              interactive={false}
            />
            {caption && (
              <div className="replay__caption">
                <span className="replay__cue">Cercava</span>
                <span className="replay__target">{caption.target}</span>
                <span className="replay__outcome">{caption.outcome}</span>
              </div>
            )}
          </div>

          <div className="replay__controls">
            <div className="replay__buttons">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setPlaying(false);
                  setStep((s) => Math.max(0, s - 1));
                }}
                disabled={step <= 0}
              >
                ← Indietro
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  if (step >= lastStep) setStep(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? "⏸ Pausa" : step >= lastStep ? "↻ Rivedi" : "▶ Play"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setPlaying(false);
                  setStep((s) => Math.min(lastStep, s + 1));
                }}
                disabled={step >= lastStep}
              >
                Avanti →
              </button>
            </div>
            <input
              className="replay__scrub"
              type="range"
              min={0}
              max={lastStep}
              value={Math.min(step, lastStep)}
              onChange={(e) => {
                setPlaying(false);
                setStep(Number(e.target.value));
              }}
              aria-label="Avanzamento replay"
            />
            <span className="replay__counter">
              Azione {Math.min(step, lastStep) + 1} / {frames.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
