/**
 * Browser-side helpers for talking to the `cartina-muta-rooms` Worker.
 *
 * In production the Pages site forwards `/api/room/*` and `/api/rooms` to the
 * Worker (same origin), so the defaults below "just work". For local dev
 * against `npm run rooms:dev`, point these at the Worker directly with
 * `VITE_ROOMS_HTTP_BASE=http://localhost:8799` and
 * `VITE_ROOMS_WS_BASE=ws://localhost:8799`.
 */

import type { MapDefinition } from "../maps/types";
import type { CreateRoomResponse, RosterEntry, RoundCount } from "./protocol";

/** The comuni roster the host uploads on start (server picks targets from it). */
export function rosterFromMap(map: MapDefinition): RosterEntry[] {
  return map.features.map((f) => ({
    istat: f.istat,
    name: f.name,
    population: f.population,
  }));
}

function sameOriginHttp(): string {
  return `${window.location.origin}/api`;
}

function sameOriginWs(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api`;
}

/**
 * A configured base, or `undefined` when unset **or blank**. This blank check
 * is load-bearing: CI wires `VITE_ROOMS_HTTP_BASE: ${{ vars.… }}`, and an unset
 * repo variable expands to an empty string (not "absent"), which `??` would
 * happily keep — collapsing `"" ?? sameOrigin()` to `""` and making the client
 * POST to a bare `/rooms` (405, since it's outside `_routes.json`'s `/api/*`).
 * Treating blank as unset lets the same-origin `/api` fallback engage.
 */
export function configuredBase(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function httpBase(): string {
  return (
    configuredBase(
      import.meta.env.VITE_ROOMS_HTTP_BASE as string | undefined,
    ) ?? sameOriginHttp()
  );
}

export function wsBase(): string {
  return (
    configuredBase(import.meta.env.VITE_ROOMS_WS_BASE as string | undefined) ??
    sameOriginWs()
  );
}

export function roomWsUrl(code: string): string {
  return `${wsBase()}/room/${code}/ws`;
}

/** Shareable deep link that drops a friend straight into the join flow. */
export function roomShareUrl(code: string): string {
  return `${window.location.origin}/room/${code}`;
}

/** A stable secret token per room, so a refresh reconnects as the same player. */
export function playerToken(code: string): string {
  const key = `cm.room.${code}.token`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

const NAME_KEY = "cm.name";
export function loadSavedName(): string {
  return localStorage.getItem(NAME_KEY) ?? "";
}
export function saveName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}

/** Create a room; resolves to its share code. */
export async function createRoom(
  provinceId: string,
  rounds: RoundCount,
): Promise<string> {
  const res = await fetch(`${httpBase()}/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provinceId, rounds }),
  });
  if (!res.ok) {
    throw new Error(`Impossibile creare la stanza (${res.status}).`);
  }
  const data = (await res.json()) as CreateRoomResponse;
  return data.code;
}
