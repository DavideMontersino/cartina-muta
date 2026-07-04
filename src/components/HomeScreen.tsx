import { useEffect, useState } from "react";
import type { GameMode } from "../game/engine";
import { TIMER_DURATIONS } from "../leaderboard/constants";
import { getProvince, PROVINCES } from "../maps/registry";
import type { OverviewCollection } from "../maps/types";
import { AuthMenu } from "./AuthMenu";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { ProvincePicker } from "./ProvincePicker";
import { ProvinceSearch } from "./ProvinceSearch";

interface HomeScreenProps {
  onStart: (provinceId: string, mode: GameMode) => void;
}

const TIMER_OPTIONS = TIMER_DURATIONS.map((seconds) => ({
  label: `${seconds / 60} min`,
  seconds,
}));

const DEFAULT_ID = getProvince("cn") ? "cn" : (PROVINCES[0]?.id ?? "");

const randomId = (exclude: string) => {
  const pool = PROVINCES.filter((p) => p.id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? exclude;
};

export function HomeScreen({ onStart }: HomeScreenProps) {
  const [selectedId, setSelectedId] = useState(DEFAULT_ID);
  const [overview, setOverview] = useState<OverviewCollection | null>(null);

  // Lazy-load the national picker map so it stays out of the main JS bundle.
  useEffect(() => {
    let cancelled = false;
    import("../maps/overview.json").then((mod) => {
      if (!cancelled) setOverview(mod.default as OverviewCollection);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = getProvince(selectedId);

  return (
    <div className="home">
      <AuthMenu />
      <div className="home__layout">
        <div className="home__inner">
          <header className="home__head">
            <p className="home__eyebrow">Campanilismi</p>
            <h1 className="home__title">
              {selected
                ? `Provincia di ${selected.name}`
                : "Scegli una provincia"}
            </h1>
            <p className="home__sub">
              {selected
                ? `${selected.count} comuni da riconoscere · ${selected.region}`
                : `${PROVINCES.length} province italiane`}
            </p>
          </header>

          <div className="picker-controls">
            <ProvinceSearch onSelect={setSelectedId} />
            <button
              type="button"
              className="btn btn--ghost picker-controls__random"
              onClick={() => setSelectedId((id) => randomId(id))}
            >
              🎲 Provincia a caso
            </button>
          </div>

          <div className="picker-wrap">
            {overview ? (
              <ProvincePicker
                overview={overview}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ) : (
              <div className="picker picker--loading" aria-hidden>
                <div className="spinner" />
              </div>
            )}
          </div>

          <div className="modes">
            <section className="mode-card">
              <h2 className="mode-card__title">A tempo</h2>
              <p className="mode-card__desc">
                Quanti comuni riesci a trovare prima dello scadere?
              </p>
              <div className="mode-card__actions">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.seconds}
                    className="btn btn--primary"
                    disabled={!selected}
                    onClick={() =>
                      onStart(selectedId, {
                        kind: "timer",
                        durationSeconds: opt.seconds,
                      })
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mode-card">
              <h2 className="mode-card__title">Completa tutti</h2>
              <p className="mode-card__desc">
                Trova tutti i comuni. Nessun limite di tempo — conta la
                precisione.
              </p>
              <div className="mode-card__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!selected}
                  onClick={() => onStart(selectedId, { kind: "complete" })}
                >
                  Inizia
                </button>
              </div>
            </section>
          </div>

          <footer className="home__foot">
            Un gioco di geografia · dati ISTAT / openpolis
          </footer>
        </div>

        {selected && (
          <LeaderboardPanel
            provinceId={selectedId}
            provinceName={selected.name}
          />
        )}
      </div>
    </div>
  );
}
