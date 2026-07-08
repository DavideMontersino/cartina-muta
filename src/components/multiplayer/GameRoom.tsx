import { useEffect, useMemo, useRef, useState } from "react";
import type { RegionStatus } from "../../game/engine";
import type { MapDefinition } from "../../maps/types";
import { ROOM_CONFIG } from "../../multiplayer/game";
import type { RoomConnection } from "../../multiplayer/useRoom";
import { MapCanvas } from "../MapCanvas";

interface GameRoomProps {
  conn: RoomConnection;
  map: MapDefinition;
  onExit: () => void;
}

export function GameRoom({ conn, map, onExit }: GameRoomProps) {
  const { round, reveal, phase, attemptsLeft, finished, lastGuess, lobby } =
    conn;

  const istatToIndex = useMemo(() => {
    const m = new Map<string, number>();
    map.features.forEach((f, i) => {
      m.set(f.istat, i);
    });
    return m;
  }, [map]);

  // 250ms clock for the round countdown.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [myFoundIndex, setMyFoundIndex] = useState<number | null>(null);
  const lastGuessAt = useRef(0);

  // Reset local map feedback at the start of each round.
  const roundNo = round?.round ?? 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: roundNo is the trigger — clear feedback whenever the round changes.
  useEffect(() => {
    setPickedIndex(null);
    setFlashIndex(null);
    setMyFoundIndex(null);
  }, [roundNo]);

  // React to my own guess ack: green my pick if right, flash red if wrong.
  useEffect(() => {
    if (!lastGuess || lastGuess.at === lastGuessAt.current) return;
    lastGuessAt.current = lastGuess.at;
    if (lastGuess.correct) {
      setMyFoundIndex(pickedIndex);
      setFlashIndex(null);
      return;
    }
    setFlashIndex(pickedIndex);
    const t = setTimeout(() => setFlashIndex(null), 700);
    return () => clearTimeout(t);
  }, [lastGuess, pickedIndex]);

  const isReveal = phase === "reveal" && reveal !== null;
  const targetIndex = isReveal
    ? (istatToIndex.get(reveal.targetIstat) ?? null)
    : null;
  const interactive = phase === "playing" && attemptsLeft > 0;

  const status: RegionStatus[] = useMemo(() => {
    const s = Array<RegionStatus>(map.features.length).fill("pending");
    if (isReveal && targetIndex !== null) s[targetIndex] = "found";
    else if (myFoundIndex !== null) s[myFoundIndex] = "found";
    return s;
  }, [map.features.length, isReveal, targetIndex, myFoundIndex]);

  const onPick = (index: number) => {
    if (!interactive) return;
    setPickedIndex(index);
    conn.guess(map.features[index].istat);
  };

  const remainingMs = round ? Math.max(0, round.endsAt - nowMs) : 0;
  const remainingS = Math.ceil(remainingMs / 1000);
  const barPct = Math.max(
    0,
    Math.min(100, (remainingMs / ROOM_CONFIG.roundWindowMs) * 100),
  );

  const players = lobby?.players ?? [];
  const myResult = isReveal
    ? reveal.results.find((r) => r.id === lobby?.you)
    : undefined;

  return (
    <div className="game mp-game">
      <div className="hud mp-game__hud">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onExit}
        >
          ← Esci
        </button>
        <span className="mp-game__round">
          Round {round?.round ?? "—"}/{round?.total ?? "—"}
        </span>
        <span
          className={`mp-game__timer ${remainingS <= 5 ? "mp-game__timer--low" : ""}`}
        >
          {isReveal ? "✓" : `${remainingS}s`}
        </span>
      </div>

      {!isReveal && (
        <div className="mp-game__bar">
          <div className="mp-game__bar-fill" style={{ width: `${barPct}%` }} />
        </div>
      )}

      <div className="mp-game__prompt">
        {isReveal ? (
          <>
            <span className="mp-game__prompt-label">Era</span>
            <strong className="mp-game__target">
              {targetIndex !== null ? map.features[targetIndex].name : "—"}
            </strong>
            <span
              className={`mp-game__verdict ${myResult?.correct ? "is-correct" : "is-wrong"}`}
            >
              {myResult?.correct ? `Giusto! +${myResult.points}` : "Sbagliato"}
            </span>
          </>
        ) : (
          <>
            <span className="mp-game__prompt-label">Trova</span>
            <strong className="mp-game__target">{round?.name ?? "…"}</strong>
            <span className="mp-game__attempts" title="tentativi rimasti">
              {Array.from({ length: ROOM_CONFIG.maxAttempts }).map((_, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length attempt pips
                  key={i}
                  className={`mp-game__pip ${i < attemptsLeft ? "mp-game__pip--on" : ""}`}
                />
              ))}
            </span>
          </>
        )}
      </div>

      <div className="mp-game__map">
        <MapCanvas
          map={map}
          status={status}
          flashIndex={flashIndex}
          revealIndex={targetIndex}
          onPick={onPick}
          interactive={interactive}
          panZoom
        />
        {!interactive && !isReveal && (
          <div className="mp-game__lock">In attesa degli altri…</div>
        )}
      </div>

      {isReveal ? (
        <ol className="mp-game__standings">
          {reveal.standings.slice(0, 5).map((s, i) => (
            <li key={s.id} className="mp-game__standing">
              <span className="mp-game__rank">{i + 1}</span>
              <span className="mp-game__sname">{s.name}</span>
              <span className="mp-game__sscore">{s.score}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mp-game__progress">
          {players.map((p) => (
            <span key={p.id} className="mp-game__pdot-wrap" title={p.name}>
              <span
                className={`mp-game__pdot ${finished.includes(p.id) ? "mp-game__pdot--done" : ""}`}
              />
              <span className="mp-game__pname">{p.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
