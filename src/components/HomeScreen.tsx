import { useEffect, useState } from "react";
import type { GameMode } from "../game/engine";
import { TIMER_DURATIONS } from "../leaderboard/constants";
import { getProvince, PROVINCES } from "../maps/registry";
import type { OverviewCollection, ProvinceMeta } from "../maps/types";
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

// A two-step wizard keeps each screen inside the (non-scrolling) viewport:
// pick a province, then pick a game mode. See CLAUDE.md — no page scroll.
type Step = "province" | "mode";

export function HomeScreen({ onStart }: HomeScreenProps) {
  const [selectedId, setSelectedId] = useState(DEFAULT_ID);
  const [overview, setOverview] = useState<OverviewCollection | null>(null);
  const [step, setStep] = useState<Step>("province");

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

  if (step === "mode" && selected) {
    return (
      <ModeStep
        province={selected}
        onBack={() => setStep("province")}
        onStart={(mode) => onStart(selectedId, mode)}
      />
    );
  }

  return (
    <ProvinceStep
      selected={selected}
      overview={overview}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onRandom={() => setSelectedId((id) => randomId(id))}
      onNext={() => setStep("mode")}
    />
  );
}

interface ProvinceStepProps {
  selected: ProvinceMeta | undefined;
  overview: OverviewCollection | null;
  selectedId: string;
  onSelect: (id: string) => void;
  onRandom: () => void;
  onNext: () => void;
}

function ProvinceStep({
  selected,
  overview,
  selectedId,
  onSelect,
  onRandom,
  onNext,
}: ProvinceStepProps) {
  return (
    <div className="wizard">
      <div className="wizard__bar">
        <p className="wizard__brand">Campanilismi</p>
        <AuthMenu />
      </div>
      <header className="home__head">
        <h1 className="home__title">
          {selected ? `Provincia di ${selected.name}` : "Scegli una provincia"}
        </h1>
        <p className="home__sub">
          {selected
            ? `${selected.count} comuni · ${selected.region}`
            : `${PROVINCES.length} province italiane`}
        </p>
      </header>

      <div className="picker-controls">
        <ProvinceSearch onSelect={onSelect} />
        <button
          type="button"
          className="btn btn--ghost picker-controls__random"
          onClick={onRandom}
        >
          🎲 A caso
        </button>
      </div>

      <div className="picker-wrap picker-wrap--grow">
        {overview ? (
          <ProvincePicker
            overview={overview}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ) : (
          <div className="picker picker--loading" aria-hidden>
            <div className="spinner" />
          </div>
        )}
      </div>

      <div className="wizard__actions">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          disabled={!selected}
          onClick={onNext}
        >
          Continua →
        </button>
      </div>
    </div>
  );
}

interface ModeStepProps {
  province: ProvinceMeta;
  onBack: () => void;
  onStart: (mode: GameMode) => void;
}

function ModeStep({ province, onBack, onStart }: ModeStepProps) {
  return (
    <div className="wizard">
      <div className="wizard__bar">
        <button
          type="button"
          className="btn btn--ghost mode-step__back"
          onClick={onBack}
        >
          ← Cambia provincia
        </button>
        <AuthMenu />
      </div>
      <header className="mode-step__head">
        <div className="mode-step__heading">
          <h1 className="home__title mode-step__title">{province.name}</h1>
          <p className="home__sub mode-step__sub">
            {province.count} comuni · {province.region}
          </p>
        </div>
      </header>

      <div className="mode-step__body">
        <div className="modes mode-step__modes">
          <section className="mode-card mode-card--featured">
            <p className="mode-card__eyebrow">Nuovo</p>
            <h2 className="mode-card__title">Corsa a energia</h2>
            <p className="mode-card__desc">
              Un comune via l'altro, facile-poi-difficile, finché la tua energia
              regge. Risposte giuste la ricaricano, errori e salti la consumano
              — quanto a fondo riesci ad arrivare?
            </p>
            <div className="mode-card__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onStart({ kind: "energy" })}
              >
                Inizia
              </button>
            </div>
          </section>

          <div className="modes__classic">
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
                    onClick={() =>
                      onStart({
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
                  onClick={() => onStart({ kind: "complete" })}
                >
                  Inizia
                </button>
              </div>
            </section>
          </div>
        </div>

        <LeaderboardPanel
          provinceId={province.id}
          provinceName={province.name}
        />
      </div>

      <footer className="home__foot">
        Un gioco di geografia · dati ISTAT / openpolis
      </footer>
    </div>
  );
}
