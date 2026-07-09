import { useSyncExternalStore } from "react";

/**
 * Global on/off preference for the raster terrain layer, shared across every
 * game mode (energy, classic, multiplayer) and persisted so it sticks between
 * sessions. Backed by localStorage with a tiny pub/sub so all mounted map
 * canvases and toggles stay in sync within the tab.
 */

const STORAGE_KEY = "campanilismi:terrain";
const listeners = new Set<() => void>();

let current = read();

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTerrainEnabled(enabled: boolean): void {
  current = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Private mode / storage disabled — keep the in-memory value only.
  }
  for (const listener of listeners) listener();
}

export function useTerrainPreference(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(
    subscribe,
    () => current,
    () => false,
  );
  return [enabled, setTerrainEnabled];
}
