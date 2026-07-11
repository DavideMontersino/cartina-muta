import { useEffect, useState } from "react";
import type { Difficulty, GameMode } from "../game/engine";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  TIMER_DURATIONS,
} from "../leaderboard/constants";
import { getProvince, PROVINCES } from "../maps/registry";
import type { OverviewCollection, ProvinceMeta } from "../maps/types";
import { HamburgerMenu } from "./HamburgerMenu";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { ProvincePicker } from "./ProvincePicker";
import { ProvinceSearch } from "./ProvinceSearch";

interface HomeScreenProps {
  onStart: (provinceId: string, mode: GameMode, difficulty: Difficulty) => void;
  onMultiplayer: () => void;
}

const TIMER_OPTIONS = TIMER_DURATIONS.map((seconds) => ({
  label: `${seconds / 60} min`,
  seconds,
}));

/** One-line description of each difficulty for the chooser cards (GitHub #34). */
const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: "Rilievo e confini dei comuni sempre visibili. Per iniziare in scioltezza.",
  normal: "Confini visibili, ma niente rilievo a darti una mano.",
  hardcore:
    "Nessun confine: appare solo un istante quando tocchi, poi sparisce. E niente rilievo.",
};

function modeLabel(mode: GameMode): string {
  if (mode.kind === "energy") return "Corsa a energia";
  if (mode.kind === "complete") return "Completa tutti";
  return `A tempo · ${mode.durationSeconds / 60} min`;
}

const DEFAULT_ID = getProvince("cn") ? "cn" : (PROVINCES[0]?.id ?? "");

const randomId = (exclude: string) => {
  const pool = PROVINCES.filter((p) => p.id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? exclude;
};

// A wizard keeps each screen inside the (non-scrolling) viewport: pick a
// province, then a game mode, then a difficulty. See CLAUDE.md — no page scroll.
type Step = "province" | "mode" | "difficulty";

export function HomeScreen({ onStart, onMultiplayer }: HomeScreenProps) {
  const [selectedId, setSelectedId] = useState(DEFAULT_ID);
  const [overview, setOverview] = useState<OverviewCollection | null>(null);
  const [step, setStep] = useState<Step>("province");
  // The mode picked on the mode step, carried into the difficulty step.
  const [chosenMode, setChosenMode] = useState<GameMode | null>(null);

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

  if (step === "difficulty" && selected && chosenMode) {
    return (
      <DifficultyStep
        province={selected}
        mode={chosenMode}
        onBack={() => setStep("mode")}
        onStart={(difficulty) => onStart(selectedId, chosenMode, difficulty)}
      />
    );
  }

  if (step === "mode" && selected) {
    return (
      <ModeStep
        province={selected}
        onBack={() => setStep("province")}
        onPickMode={(mode) => {
          setChosenMode(mode);
          setStep("difficulty");
        }}
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
      onMultiplayer={onMultiplayer}
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
  onMultiplayer: () => void;
}

function ProvinceStep({
  selected,
  overview,
  selectedId,
  onSelect,
  onRandom,
  onNext,
  onMultiplayer,
}: ProvinceStepProps) {
  return (
    <div className="wizard">
      <div className="wizard__bar">
        <p className="wizard__brand">Campanilismi</p>
        <div className="wizard__bar-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onMultiplayer}
          >
            👥 Amici
          </button>
          <HamburgerMenu
            provinceId={selected?.id}
            provinceName={selected?.name}
          />
        </div>
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
  onPickMode: (mode: GameMode) => void;
}

function ModeStep({ province, onBack, onPickMode }: ModeStepProps) {
  const [timerSeconds, setTimerSeconds] = useState<number>(
    TIMER_OPTIONS[0].seconds,
  );
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
        <HamburgerMenu provinceId={province.id} provinceName={province.name} />
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
              regge. Risposte giuste la ricaricano, gli errori la consumano —
              puoi sempre saltare senza penalità. Quanto a fondo riesci ad
              arrivare?
            </p>
            <div className="mode-card__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onPickMode({ kind: "energy" })}
              >
                Continua →
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
                <label className="select">
                  <span className="select__label">Durata</span>
                  <select
                    className="select__input"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Number(e.target.value))}
                  >
                    {TIMER_OPTIONS.map((opt) => (
                      <option key={opt.seconds} value={opt.seconds}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() =>
                    onPickMode({ kind: "timer", durationSeconds: timerSeconds })
                  }
                >
                  Continua →
                </button>
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
                  onClick={() => onPickMode({ kind: "complete" })}
                >
                  Continua →
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

interface DifficultyStepProps {
  province: ProvinceMeta;
  mode: GameMode;
  onBack: () => void;
  onStart: (difficulty: Difficulty) => void;
}

// Second level of the mode choice (GitHub #34): pick how much the map helps
// you. A focused chooser (no leaderboard) so the three cards always fit the
// non-scrolling viewport on a phone.
function DifficultyStep({
  province,
  mode,
  onBack,
  onStart,
}: DifficultyStepProps) {
  return (
    <div className="wizard">
      <div className="wizard__bar">
        <button
          type="button"
          className="btn btn--ghost mode-step__back"
          onClick={onBack}
        >
          ← Cambia modalità
        </button>
        <HamburgerMenu provinceId={province.id} provinceName={province.name} />
      </div>
      <header className="mode-step__head">
        <div className="mode-step__heading">
          <h1 className="home__title mode-step__title">{province.name}</h1>
          <p className="home__sub mode-step__sub">{modeLabel(mode)}</p>
        </div>
      </header>

      <div className="mode-step__body">
        <div className="modes mode-step__modes difficulty-cards">
          {DIFFICULTIES.map((difficulty) => (
            <section
              key={difficulty}
              className={`mode-card difficulty-card difficulty-card--${difficulty}`}
            >
              <h2 className="mode-card__title">
                {DIFFICULTY_LABELS[difficulty]}
              </h2>
              <p className="mode-card__desc">{DIFFICULTY_DESC[difficulty]}</p>
              <div className="mode-card__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => onStart(difficulty)}
                >
                  Inizia
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
