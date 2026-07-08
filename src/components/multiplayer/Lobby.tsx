import { useState } from "react";
import { getProvince } from "../../maps/registry";
import { roomShareUrl } from "../../multiplayer/client";
import {
  ROOM_ROUND_OPTIONS,
  type RoundCount,
} from "../../multiplayer/protocol";
import type { RoomConnection } from "../../multiplayer/useRoom";
import { ProvinceSearch } from "../ProvinceSearch";
import { QRCode } from "./QRCode";

interface LobbyScreenProps {
  conn: RoomConnection;
  code: string;
  /** True once the province map has preloaded (needed before the host starts). */
  mapReady: boolean;
  onStart: () => void;
  onExit: () => void;
}

export function LobbyScreen({
  conn,
  code,
  mapReady,
  onStart,
  onExit,
}: LobbyScreenProps) {
  const { lobby, status, setConfig } = conn;

  if (!lobby) {
    return (
      <div className="wizard mp">
        <div className="mp__center">
          <div className="spinner" />
          <p className="home__sub">Connessione alla stanza…</p>
        </div>
      </div>
    );
  }

  const isHost = lobby.you === lobby.hostId;
  const province = getProvince(lobby.provinceId);

  return (
    <div className="wizard mp">
      <div className="wizard__bar">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          ← Esci
        </button>
        {status !== "open" && (
          <span className="mp__status">Riconnessione…</span>
        )}
      </div>

      <div className="mp__lobby">
        <Share code={code} />

        <div className="mp__panel">
          <div className="mp__config">
            <div>
              <span className="mp__label">Provincia</span>
              {isHost && (
                <ProvinceSearch
                  onSelect={(id) => setConfig({ provinceId: id })}
                />
              )}
              <strong className="mp__config-val">
                {province ? province.name : lobby.provinceId}
              </strong>
            </div>
            {isHost ? (
              <label className="select mp__rounds">
                <span className="select__label">Round</span>
                <select
                  className="select__input"
                  value={lobby.rounds}
                  onChange={(e) =>
                    setConfig({ rounds: Number(e.target.value) as RoundCount })
                  }
                >
                  {ROOM_ROUND_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="mp__rounds">
                <span className="mp__label">Round</span>
                <strong className="mp__config-val">{lobby.rounds}</strong>
              </div>
            )}
          </div>

          <ul className="mp__players">
            {lobby.players.map((p) => (
              <li key={p.id} className="mp__player">
                <span
                  className={`mp__dot ${p.connected ? "mp__dot--on" : "mp__dot--off"}`}
                  aria-hidden
                />
                <span className="mp__player-name">{p.name}</span>
                {p.id === lobby.hostId && (
                  <span className="mp__badge">host</span>
                )}
                {p.id === lobby.you && <span className="mp__badge">tu</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="wizard__actions">
        {isHost ? (
          <button
            type="button"
            className="btn btn--primary btn--lg"
            disabled={status !== "open" || !mapReady}
            onClick={onStart}
          >
            {mapReady ? "Inizia la partita" : "Preparazione…"}
          </button>
        ) : (
          <p className="home__sub mp__waiting">
            In attesa che l'host avvii la partita…
          </p>
        )}
      </div>
    </div>
  );
}

function Share({ code }: { code: string }) {
  const url = roomShareUrl(code);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const copy = (what: "code" | "link", text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div className="mp__share">
      <div className="mp__qr">
        <QRCode value={url} size={168} />
      </div>
      <div className="mp__share-info">
        <span className="mp__label">Codice stanza</span>
        <button
          type="button"
          className="mp__code"
          onClick={() => copy("code", code)}
          title="Copia il codice"
        >
          {code}
        </button>
        <button
          type="button"
          className="btn btn--ghost mp__copy"
          onClick={() => copy("link", url)}
        >
          {copied === "link" ? "Link copiato ✓" : "Copia link"}
        </button>
        {copied === "code" && (
          <span className="mp__copied">Codice copiato ✓</span>
        )}
      </div>
    </div>
  );
}
