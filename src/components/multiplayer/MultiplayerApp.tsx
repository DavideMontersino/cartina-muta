import { useEffect, useState } from "react";
import { useSession } from "../../auth/client";
import { getProvince, PROVINCES } from "../../maps/registry";
import { createRoom, loadSavedName, saveName } from "../../multiplayer/client";
import { isValidCode, normalizeCode } from "../../multiplayer/code";
import {
  ROOM_ROUND_OPTIONS,
  type RoundCount,
} from "../../multiplayer/protocol";
import { ProvinceSearch } from "../ProvinceSearch";
import { Lobby } from "./Lobby";

interface MultiplayerAppProps {
  onExit: () => void;
  /** Set when the app was opened via a /room/CODE deep link. */
  initialCode?: string | null;
}

type Step = "menu" | "create" | "join";

const DEFAULT_PROVINCE = getProvince("cn") ? "cn" : (PROVINCES[0]?.id ?? "");

export function MultiplayerApp({ onExit, initialCode }: MultiplayerAppProps) {
  const { data: session } = useSession();
  const [name, setName] = useState(loadSavedName);
  const [step, setStep] = useState<Step>(initialCode ? "join" : "menu");
  const [code, setCode] = useState<string | null>(initialCode ?? null);
  const [inLobby, setInLobby] = useState(false);

  // Prefill the display name from the signed-in account once it loads.
  useEffect(() => {
    const authName = session?.user?.name;
    if (authName) setName((n) => n || authName);
  }, [session?.user?.name]);

  const enterLobby = (roomCode: string) => {
    saveName(name);
    setCode(roomCode);
    setInLobby(true);
  };

  if (inLobby && code) {
    return (
      <Lobby
        code={code}
        name={name}
        onExit={() => {
          setInLobby(false);
          setCode(null);
          setStep("menu");
          onExit();
        }}
      />
    );
  }

  if (step === "create") {
    return (
      <CreateStep
        name={name}
        onName={setName}
        onBack={() => setStep("menu")}
        onCreated={enterLobby}
      />
    );
  }

  if (step === "join") {
    return (
      <JoinStep
        name={name}
        onName={setName}
        initialCode={initialCode ?? ""}
        onBack={() => setStep("menu")}
        onJoin={enterLobby}
      />
    );
  }

  return <MenuStep onExit={onExit} onPick={setStep} />;
}

function MenuStep({
  onExit,
  onPick,
}: {
  onExit: () => void;
  onPick: (s: Step) => void;
}) {
  return (
    <div className="wizard mp">
      <div className="wizard__bar">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          ← Indietro
        </button>
      </div>
      <header className="home__head">
        <h1 className="home__title">Gioca con gli amici</h1>
        <p className="home__sub">
          Stessa domanda per tutti, in tempo reale. Chi trova il comune con meno
          errori e più in fretta segna di più.
        </p>
      </header>
      <div className="mp__menu">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={() => onPick("create")}
        >
          Crea una sfida
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--lg"
          onClick={() => onPick("join")}
        >
          Entra con un codice
        </button>
      </div>
    </div>
  );
}

function NameField({
  name,
  onName,
}: {
  name: string;
  onName: (n: string) => void;
}) {
  return (
    <label className="mp__field">
      <span className="mp__label">Il tuo nome</span>
      <input
        type="text"
        className="signin__input"
        placeholder="Come ti chiami?"
        value={name}
        maxLength={20}
        onChange={(e) => onName(e.target.value)}
      />
    </label>
  );
}

function RoundsField({
  rounds,
  onRounds,
}: {
  rounds: RoundCount;
  onRounds: (r: RoundCount) => void;
}) {
  return (
    <label className="select mp__rounds">
      <span className="select__label">Round</span>
      <select
        className="select__input"
        value={rounds}
        onChange={(e) => onRounds(Number(e.target.value) as RoundCount)}
      >
        {ROOM_ROUND_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}

function CreateStep({
  name,
  onName,
  onBack,
  onCreated,
}: {
  name: string;
  onName: (n: string) => void;
  onBack: () => void;
  onCreated: (code: string) => void;
}) {
  const [provinceId, setProvinceId] = useState(DEFAULT_PROVINCE);
  const [rounds, setRounds] = useState<RoundCount>(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const province = getProvince(provinceId);
  const canCreate = name.trim().length > 0 && !!province && !busy;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      onCreated(await createRoom(provinceId, rounds));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto.");
      setBusy(false);
    }
  };

  return (
    <div className="wizard mp">
      <div className="wizard__bar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Indietro
        </button>
      </div>
      <header className="home__head">
        <h1 className="home__title">Crea una sfida</h1>
        <p className="home__sub">Scegli provincia e numero di round.</p>
      </header>

      <div className="mp__form">
        <div className="mp__field">
          <span className="mp__label">Provincia</span>
          <div className="mp__province">
            <strong>{province ? province.name : "—"}</strong>
            {province && (
              <span className="home__sub"> · {province.count} comuni</span>
            )}
          </div>
          <ProvinceSearch onSelect={setProvinceId} />
        </div>
        <RoundsField rounds={rounds} onRounds={setRounds} />
        <NameField name={name} onName={onName} />
        {error && (
          <p className="mp__error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="wizard__actions">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          disabled={!canCreate}
          onClick={create}
        >
          {busy ? "Creazione…" : "Crea la stanza"}
        </button>
      </div>
    </div>
  );
}

function JoinStep({
  name,
  onName,
  initialCode,
  onBack,
  onJoin,
}: {
  name: string;
  onName: (n: string) => void;
  initialCode: string;
  onBack: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState(normalizeCode(initialCode));
  const canJoin = name.trim().length > 0 && isValidCode(code);

  return (
    <div className="wizard mp">
      <div className="wizard__bar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Indietro
        </button>
      </div>
      <header className="home__head">
        <h1 className="home__title">Entra con un codice</h1>
        <p className="home__sub">Inserisci il codice che ti hanno condiviso.</p>
      </header>

      <div className="mp__form">
        <label className="mp__field">
          <span className="mp__label">Codice stanza</span>
          <input
            type="text"
            className="signin__input mp__code-input"
            placeholder="ABCD"
            value={code}
            inputMode="text"
            autoCapitalize="characters"
            maxLength={4}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
          />
        </label>
        <NameField name={name} onName={onName} />
      </div>

      <div className="wizard__actions">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          disabled={!canJoin}
          onClick={() => onJoin(code)}
        >
          Entra
        </button>
      </div>
    </div>
  );
}
