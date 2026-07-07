import { type ReactElement, useEffect, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { useNoScrollGuard } from "./dev/useNoScrollGuard";
import type { GameConfig, GameMode } from "./game/engine";
import { useClaimPendingScores } from "./leaderboard/useClaimPendingScores";
import { getProvince, loadMap } from "./maps/registry";

interface Selection {
  provinceId: string;
  mode: GameMode;
}

export function App() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped to remount GameScreen for a fresh run of the same province+mode.
  const [runKey, setRunKey] = useState(0);

  // Dev-only: warn loudly if any screen spills off the (non-scrolling) viewport.
  useNoScrollGuard();

  // Claim a score parked before a magic-link sign-in (see the hook) once the
  // player lands back signed in — and confirm it with a brief banner.
  const scoreSaved = useClaimPendingScores();

  // When a province is chosen, lazily load its border geometry, then play.
  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    setConfig(null);
    setError(null);
    loadMap(selection.provinceId)
      .then((map) => {
        if (!cancelled) setConfig({ map, mode: selection.mode });
      })
      .catch(() => {
        if (!cancelled) setError("Impossibile caricare la mappa. Riprova.");
      });
    return () => {
      cancelled = true;
    };
  }, [selection]);

  const exit = () => {
    setSelection(null);
    setConfig(null);
    setError(null);
  };

  let screen: ReactElement;
  if (config) {
    screen = (
      <GameScreen
        key={runKey}
        config={config}
        onExit={exit}
        onRestart={() => setRunKey((k) => k + 1)}
      />
    );
  } else if (selection) {
    const name = getProvince(selection.provinceId)?.name ?? "";
    screen = <LoadingScreen name={name} error={error} onBack={exit} />;
  } else {
    screen = (
      <HomeScreen
        onStart={(provinceId, mode) => setSelection({ provinceId, mode })}
      />
    );
  }

  return (
    <>
      {screen}
      {scoreSaved && (
        <div className="score-saved-banner" role="status">
          Punteggio salvato in classifica ✓
        </div>
      )}
    </>
  );
}
