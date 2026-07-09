import { useTerrainPreference } from "./useTerrainPreference";

/**
 * On-map button to switch the raster terrain layer on and off. Sits in a
 * corner of the map wrap in every game mode; the choice is remembered globally.
 */
export function TerrainToggle() {
  const [enabled, setEnabled] = useTerrainPreference();
  return (
    <button
      type="button"
      className={`terrain-toggle ${enabled ? "terrain-toggle--on" : ""}`}
      aria-pressed={enabled}
      title={enabled ? "Nascondi rilievo" : "Mostra rilievo"}
      onClick={() => setEnabled(!enabled)}
    >
      <span aria-hidden="true">⛰️</span>
      <span className="terrain-toggle__label">Rilievo</span>
    </button>
  );
}
