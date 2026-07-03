import { useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import type { GameConfig } from "./game/engine";

export function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);

  return config ? (
    <GameScreen config={config} onExit={() => setConfig(null)} />
  ) : (
    <HomeScreen onStart={setConfig} />
  );
}
