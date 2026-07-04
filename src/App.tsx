import { useEffect, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import type { GameConfig, GameMode } from "./game/engine";
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

  if (config) {
    return (
      <GameScreen
        key={runKey}
        config={config}
        onExit={exit}
        onRestart={() => setRunKey((k) => k + 1)}
      />
    );
  }

  if (selection) {
    const name = getProvince(selection.provinceId)?.name ?? "";
    return <LoadingScreen name={name} error={error} onBack={exit} />;
  }

  return (
    <HomeScreen
      onStart={(provinceId, mode) => setSelection({ provinceId, mode })}
    />
  );
}
