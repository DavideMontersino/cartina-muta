import { type ReactElement, useEffect, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { MultiplayerApp } from "./components/multiplayer/MultiplayerApp";
import { useNoScrollGuard } from "./dev/useNoScrollGuard";
import type { Difficulty, GameConfig, GameMode } from "./game/engine";
import { useClaimPendingScores } from "./leaderboard/useClaimPendingScores";
import { getProvince, loadMap } from "./maps/registry";
import { normalizeCode } from "./multiplayer/code";
import { ChangelogPage } from "./pages/ChangelogPage";
import { CreditsPage } from "./pages/CreditsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";

interface Selection {
  provinceId: string;
  mode: GameMode;
  difficulty: Difficulty;
}

function MultiplayerRoute({ code }: { code: string | null }) {
  const [, navigate] = useLocation();
  return <MultiplayerApp initialCode={code} onExit={() => navigate("/")} />;
}

function GameFlow() {
  const [, navigate] = useLocation();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    setConfig(null);
    setError(null);
    loadMap(selection.provinceId)
      .then((map) => {
        if (!cancelled)
          setConfig({
            map,
            mode: selection.mode,
            difficulty: selection.difficulty,
          });
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
        onStart={(provinceId, mode, difficulty) =>
          setSelection({ provinceId, mode, difficulty })
        }
        onMultiplayer={() => navigate("/room")}
      />
    );
  }

  return screen;
}

export function App() {
  // Dev-only: warn loudly if any screen spills off the (non-scrolling) viewport.
  useNoScrollGuard();

  // Claim a score parked before a magic-link sign-in once the player lands back
  // signed in — and confirm it with a brief banner.
  const scoreSaved = useClaimPendingScores();

  return (
    <>
      <Switch>
        <Route path="/room/:code">
          {(params) => <MultiplayerRoute code={normalizeCode(params.code)} />}
        </Route>
        <Route path="/room">
          <MultiplayerRoute code={null} />
        </Route>
        <Route path="/leaderboard/:provinceId">
          {(params) => <LeaderboardPage provinceId={params.provinceId} />}
        </Route>
        <Route path="/credits">
          <CreditsPage />
        </Route>
        <Route path="/changelog">
          <ChangelogPage />
        </Route>
        <Route>
          <GameFlow />
        </Route>
      </Switch>
      {scoreSaved && (
        <div className="score-saved-banner" role="status">
          Punteggio salvato in classifica ✓
        </div>
      )}
    </>
  );
}
