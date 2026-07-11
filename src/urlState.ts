import type { GameMode } from "./game/engine";
import { decodeMode, encodeMode } from "./leaderboard/constants";
import { getProvince } from "./maps/registry";

export interface UrlState {
  provinceId: string | null;
  mode: GameMode | null;
}

/** Read permalink params (?p, ?m) from the given search string (defaults to current URL). */
export function parseUrlState(search = window.location.search): UrlState {
  const params = new URLSearchParams(search);
  const p = params.get("p");
  const m = params.get("m");
  return {
    provinceId: p && getProvince(p) ? p : null,
    mode: m ? (decodeMode(m) ?? null) : null,
  };
}

/** Update the URL to reflect current wizard state (replaceState — no history entry). */
export function updateUrlState(provinceId: string, mode?: GameMode): void {
  const params = new URLSearchParams();
  params.set("p", provinceId);
  if (mode) params.set("m", encodeMode(mode));
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params.toString()}`,
  );
}
