import { Mountain } from "lucide-react";
import { useTerrainPreference } from "./useTerrainPreference";

interface TerrainToggleProps {
  /** Controlled value. When omitted, falls back to the global preference. */
  value?: boolean;
  /** Controlled setter. When omitted, writes the global preference. */
  onChange?: (enabled: boolean) => void;
}

/**
 * On-map button to switch the raster terrain layer on and off. Sits in a
 * corner of the map wrap. Uncontrolled by default (choice remembered globally,
 * used by multiplayer); the single-player game passes value/onChange so relief
 * follows the chosen difficulty instead (GitHub #34).
 */
export function TerrainToggle({ value, onChange }: TerrainToggleProps = {}) {
  const [globalEnabled, setGlobalEnabled] = useTerrainPreference();
  const enabled = value ?? globalEnabled;
  const setEnabled = onChange ?? setGlobalEnabled;
  return (
    <button
      type="button"
      className={`terrain-toggle ${enabled ? "terrain-toggle--on" : ""}`}
      aria-pressed={enabled}
      title={enabled ? "Nascondi rilievo" : "Mostra rilievo"}
      onClick={() => setEnabled(!enabled)}
    >
      <Mountain size={15} aria-hidden="true" />
      <span className="terrain-toggle__label">Rilievo</span>
    </button>
  );
}
