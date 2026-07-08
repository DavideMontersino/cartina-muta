import { useEffect, useRef, useState } from "react";
import type { Standing } from "../../multiplayer/protocol";

/** Row height + gap in px — must match `.board__row` height + `.board` gap. */
const ROW = 52;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Animate a number from `from` to `to` once `active` flips true. */
function CountUp({
  from,
  to,
  active,
  ms = 800,
}: {
  from: number;
  to: number;
  active: boolean;
  ms?: number;
}) {
  const [value, setValue] = useState(active ? from : to);
  const raf = useRef(0);
  useEffect(() => {
    if (!active) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - (1 - k) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [from, to, active, ms]);
  return <>{value}</>;
}

interface StandingsBoardProps {
  standings: Standing[];
  /** The prior snapshot, so bars grow and ranks slide from where they were. */
  previous?: Standing[] | null;
  you?: string;
  /** Medal emoji for the top three (final results only). */
  medals?: boolean;
}

export function StandingsBoard({
  standings,
  previous,
  you,
  medals = false,
}: StandingsBoardProps) {
  const reduced = usePrefersReducedMotion();

  const prevRank = new Map<string, number>();
  const prevScore = new Map<string, number>();
  (previous ?? []).forEach((s, i) => {
    prevRank.set(s.id, i);
    prevScore.set(s.id, s.score);
  });
  const maxScore = Math.max(1, ...standings.map((s) => s.score));

  // Start "not entered" so we can render at the old positions/scores first,
  // then flip to entered on the next frame to trigger the transitions.
  const [entered, setEntered] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setEntered(true);
      return;
    }
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true)),
    );
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  return (
    <ol className="board">
      {standings.map((s, i) => {
        const fromRank = prevRank.get(s.id) ?? i;
        const fromScore = prevScore.get(s.id) ?? 0;
        const dy = entered ? 0 : (fromRank - i) * ROW;
        const barPct = ((entered ? s.score : fromScore) / maxScore) * 100;
        const medal = medals ? ["🥇", "🥈", "🥉"][i] : undefined;
        return (
          <li
            key={s.id}
            className={`board__row ${s.id === you ? "board__row--you" : ""}`}
            style={{
              transform: `translateY(${dy}px)`,
              transition: reduced
                ? undefined
                : "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            <span className="board__rank">{medal ?? i + 1}</span>
            <span className="board__name">{s.name}</span>
            <span className="board__bar-wrap">
              <span
                className="board__bar"
                style={{
                  width: `${barPct}%`,
                  transition: reduced ? undefined : "width 0.8s ease",
                }}
              />
            </span>
            <span className="board__score">
              <CountUp from={fromScore} to={s.score} active={!reduced} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
