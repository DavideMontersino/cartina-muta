import { useState } from "react";
import type { GameConfig, GameMode } from "../game/engine";
import { MAPS } from "../maps/registry";
import type { MapDefinition } from "../maps/types";

interface HomeScreenProps {
  onStart: (config: GameConfig) => void;
}

const TIMER_OPTIONS = [
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
];

export function HomeScreen({ onStart }: HomeScreenProps) {
  const [map, setMap] = useState<MapDefinition>(MAPS[0]);

  const start = (mode: GameMode) => onStart({ map, mode });

  return (
    <div className="home">
      <div className="home__inner">
        <header className="home__head">
          <p className="home__eyebrow">Cartina Muta</p>
          <h1 className="home__title">{map.name}</h1>
          <p className="home__sub">
            {map.features.length} {map.unit.plural} da riconoscere sulla mappa.
          </p>
        </header>

        {MAPS.length > 1 && (
          <div className="map-picker">
            {MAPS.map((m) => (
              <button
                type="button"
                key={m.id}
                className={`chip ${m.id === map.id ? "chip--active" : ""}`}
                onClick={() => setMap(m)}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        <div className="modes">
          <section className="mode-card">
            <h2 className="mode-card__title">A tempo</h2>
            <p className="mode-card__desc">
              Quanti {map.unit.plural} riesci a trovare prima dello scadere?
            </p>
            <div className="mode-card__actions">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.seconds}
                  className="btn btn--primary"
                  onClick={() =>
                    start({ kind: "timer", durationSeconds: opt.seconds })
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
              Trova tutti i {map.unit.plural}. Nessun limite di tempo — conta la
              precisione.
            </p>
            <div className="mode-card__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => start({ kind: "complete" })}
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
    </div>
  );
}
