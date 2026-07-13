import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { ReplayView } from "../components/ReplayView";
import type { GameReplay } from "../leaderboard/types";

interface GamePageProps {
  gameId: string;
}

// Standalone, shareable replay page (GitHub #48): a `/game/:id` deep link opens
// the recorded game full-screen. Closing returns to that game's province
// leaderboard once it's known, otherwise home — so a freshly-opened shared link
// (no history to go back to) still lands somewhere sensible.
export function GamePage({ gameId }: GamePageProps) {
  const [, navigate] = useLocation();
  const [provinceId, setProvinceId] = useState<string | null>(null);

  const handleLoaded = useCallback((game: GameReplay) => {
    setProvinceId(game.provinceId);
  }, []);

  const close = () => navigate(provinceId ? `/leaderboard/${provinceId}` : "/");

  return <ReplayView gameId={gameId} onClose={close} onLoaded={handleLoaded} />;
}
