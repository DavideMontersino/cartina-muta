import { useCallback } from "react";
import { Link, useSearch } from "wouter";
import { LeaderboardPanel } from "../components/LeaderboardPanel";
import type { Difficulty, GameMode } from "../game/engine";
import {
  decodeLeaderboardSearch,
  encodeLeaderboardSearch,
} from "../leaderboard/constants";
import { getProvince } from "../maps/registry";

interface LeaderboardPageProps {
  provinceId: string;
}

export function LeaderboardPage({ provinceId }: LeaderboardPageProps) {
  const province = getProvince(provinceId);
  // Reading the search via wouter keeps the board in sync if the URL changes.
  const search = useSearch();
  const { mode, difficulty } = decodeLeaderboardSearch(search);

  // Mirror the visible mode/difficulty into the URL (replace — no history spam)
  // so the link is shareable and reopens the exact board (GitHub #48).
  const handleSelectionChange = useCallback(
    (m: GameMode, d: Difficulty) => {
      const next = encodeLeaderboardSearch(m, d);
      const url = `/leaderboard/${provinceId}?${next}`;
      if (`${window.location.pathname}${window.location.search}` !== url) {
        window.history.replaceState(null, "", url);
      }
    },
    [provinceId],
  );

  if (!province) {
    return (
      <div className="inner-page">
        <div className="inner-page__bar">
          <Link href="/" className="btn btn--ghost">
            ← Home
          </Link>
        </div>
        <p className="inner-page__empty">Provincia non trovata.</p>
      </div>
    );
  }

  return (
    <div className="inner-page">
      <div className="inner-page__bar">
        <Link href={`/?p=${provinceId}`} className="btn btn--ghost">
          ← {province.name}
        </Link>
      </div>
      <div className="inner-page__body">
        <LeaderboardPanel
          provinceId={provinceId}
          provinceName={province.name}
          mode={mode ?? undefined}
          difficulty={difficulty}
          onSelectionChange={handleSelectionChange}
        />
      </div>
    </div>
  );
}
