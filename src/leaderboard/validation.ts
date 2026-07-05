// Imports the province index JSON directly rather than via
// `../maps/registry`, whose per-province geometry loaders use Vite-only
// `import.meta.glob`. This module is shared with `functions/api/*`, which
// Cloudflare Pages bundles independently with esbuild — Vite-only syntax
// there would break the Functions build.
import provinces from "../maps/provinces.json";
import { TIMER_DURATIONS } from "./constants";
import type { ActionLogEntry, ScoreSubmissionPayload } from "./types";

const MAX_ACTION_LOG_ENTRIES = 5000;
const MAX_MISTAKES = 100_000;
const TIMER_GRACE_MS = 3_000;
const COMPLETE_CEILING_MS = 6 * 60 * 60 * 1000; // 6h, generous garbage filter only
const ENERGY_CEILING_MS = 6 * 60 * 60 * 1000; // same generous garbage filter — no fixed duration

export type ValidatedSubmission = ScoreSubmissionPayload & {
  totalRegions: number;
};

export type SubmissionValidation =
  | { ok: true; value: ValidatedSubmission }
  | { ok: false; error: string };

/**
 * Server-side sanity bounds for a submitted score — NOT anti-cheat. A
 * scripted client can still lie about found/timings; this only rejects
 * garbage/malformed payloads and derives `totalRegions` from the known
 * province so the client can't claim a bigger map than it played.
 */
export function validateScoreSubmission(raw: unknown): SubmissionValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid payload." };
  }
  const body = raw as Record<string, unknown>;

  if (typeof body.provinceId !== "string") {
    return { ok: false, error: "Missing provinceId." };
  }
  const province = provinces.find((p) => p.id === body.provinceId);
  if (!province) {
    return { ok: false, error: "Unknown province." };
  }

  const modeResult = validateMode(body.mode);
  if (!modeResult.ok) return modeResult;
  const mode = modeResult.value;

  const { found, missed, mistakes, elapsedMs } = body;
  if (
    !isNonNegativeInt(found) ||
    !isNonNegativeInt(missed) ||
    !isNonNegativeInt(mistakes) ||
    !isNonNegativeInt(elapsedMs)
  ) {
    return { ok: false, error: "Invalid score fields." };
  }
  if (found + missed > province.count) {
    return {
      ok: false,
      error: "found + missed exceeds the province's municipalities.",
    };
  }
  if (mistakes > MAX_MISTAKES) {
    return { ok: false, error: "mistakes out of range." };
  }

  let score: number | undefined;
  if (mode.kind === "energy") {
    if (!isNonNegativeInt(body.score)) {
      return { ok: false, error: "Invalid score." };
    }
    score = body.score;
  }

  const ceiling =
    mode.kind === "timer"
      ? mode.durationSeconds * 1000 + TIMER_GRACE_MS
      : mode.kind === "energy"
        ? ENERGY_CEILING_MS
        : COMPLETE_CEILING_MS;
  if (elapsedMs > ceiling) {
    return { ok: false, error: "elapsedMs exceeds the mode's bound." };
  }

  const actionLogResult = validateActionLog(body.actionLog, elapsedMs);
  if (!actionLogResult.ok) return actionLogResult;

  return {
    ok: true,
    value: {
      provinceId: body.provinceId,
      mode,
      found,
      missed,
      mistakes,
      elapsedMs,
      score,
      actionLog: actionLogResult.value,
      totalRegions: province.count,
    },
  };
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function validateMode(
  raw: unknown,
):
  | { ok: true; value: ScoreSubmissionPayload["mode"] }
  | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Missing mode." };
  }
  const mode = raw as Record<string, unknown>;
  if (mode.kind === "complete") {
    return { ok: true, value: { kind: "complete" } };
  }
  if (mode.kind === "energy") {
    return { ok: true, value: { kind: "energy" } };
  }
  if (
    mode.kind === "timer" &&
    typeof mode.durationSeconds === "number" &&
    (TIMER_DURATIONS as readonly number[]).includes(mode.durationSeconds)
  ) {
    return {
      ok: true,
      value: { kind: "timer", durationSeconds: mode.durationSeconds },
    };
  }
  return { ok: false, error: "Invalid mode." };
}

function validateActionLog(
  raw: unknown,
  elapsedMs: number,
): { ok: true; value: ActionLogEntry[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "actionLog must be an array." };
  }
  if (raw.length > MAX_ACTION_LOG_ENTRIES) {
    return { ok: false, error: "actionLog is too long." };
  }

  const entries: ActionLogEntry[] = [];
  let lastT = 0;
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "Invalid actionLog entry." };
    }
    const e = item as Record<string, unknown>;
    if (
      typeof e.tMs !== "number" ||
      !Number.isFinite(e.tMs) ||
      e.tMs < lastT ||
      e.tMs > elapsedMs + TIMER_GRACE_MS
    ) {
      return { ok: false, error: "Invalid actionLog timestamp." };
    }
    if (typeof e.targetIstat !== "string" || e.targetIstat.length === 0) {
      return { ok: false, error: "Invalid actionLog target." };
    }
    if (e.type === "skip") {
      entries.push({ tMs: e.tMs, type: "skip", targetIstat: e.targetIstat });
    } else if (
      e.type === "guess" &&
      typeof e.guessIstat === "string" &&
      typeof e.correct === "boolean"
    ) {
      entries.push({
        tMs: e.tMs,
        type: "guess",
        targetIstat: e.targetIstat,
        guessIstat: e.guessIstat,
        correct: e.correct,
      });
    } else {
      return { ok: false, error: "Invalid actionLog action." };
    }
    lastT = e.tMs;
  }
  return { ok: true, value: entries };
}
