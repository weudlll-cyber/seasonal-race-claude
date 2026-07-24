// ============================================================
// File:        raceIdentity.js
// Path:        client/src/modules/parity/raceIdentity.js
// Project:     RaceArena
// Created:     2026-07-24
// Description: The RACE IDENTITY and RACE OUTCOME hashes used by the golden equality
//              test (fix-plan step 6). One module, imported by BOTH the browser-core
//              runner and the sim path — never re-implemented on either side, for the
//              same reason raceConfigWorld.js is never re-implemented.
//
// RACE IDENTITY — everything that determines a race, and nothing that does not:
//   { seed, nRacers, isOpen, laps | requestedSeconds, racePlanEnabled,
//     worldHash, trackGeometryHash, rosterHash }
// Two runs with the same identity MUST produce the same outcome. That is the parity
// promise, and the golden test is its enforcement.
//
// RACE OUTCOME — the finished race, hashed:
//   finishing order (racerIndex -> finalRank, finishTimeMs)
//   + per-racer t at fixed physicsTs checkpoints (the diag emitter's convention)
// Checkpoints are what turn "the winner matched" into "the whole race matched": two
// races can end in the same order having taken visibly different routes there.
//
// This module changes NO race behaviour — it only hashes. It is imported by tests and
// diagnostics only; nothing on the shipped race path reads it.
// ============================================================

import { canonicalJson, hashWorld } from '../raceConfigWorld.js';

/** Checkpoint cadence, in physics ms — the diag emitter's convention (micro-divergence.mjs). */
export const CHECKPOINT_INTERVAL_MS = 5000;

/** t values are compared at this precision; below it the two engines are the same float. */
export const T_PRECISION = 6;

/**
 * Content hash of a track's GEOMETRY — the shape the race is run on, nothing else.
 * Deliberately excludes id/name/colour/lights and every presentation field: two tracks with
 * identical geometry must produce identical races, and a rename must not invalidate a soak.
 *
 * @param {object} track  a seed/geometry record
 * @returns {string} 8 hex chars
 */
export function hashTrackGeometry(track) {
  const round = (n) => (Number.isFinite(n) ? Number(n.toFixed(6)) : null);
  const pts = (arr) => (Array.isArray(arr) ? arr.map((p) => [round(p?.x), round(p?.y)]) : null);
  return hashWorld({
    closed: !!track?.closed,
    pathLengthPx: round(track?.pathLengthPx),
    width: round(track?.width),
    worldWidth: round(track?.worldWidth),
    worldHeight: round(track?.worldHeight),
    centerPoints: pts(track?.centerPoints),
    innerPoints: pts(track?.innerPoints),
    outerPoints: pts(track?.outerPoints),
  }).full;
}

/**
 * Content hash of the ROSTER — who is racing, in grid order.
 * The physics only ever reads the racer COUNT and each racer's index, so the hash pins the
 * ordered identity list. Names are included because the browser's roster is name-ordered and
 * a reordered roster is a different race.
 *
 * @param {Array<{name?: string}|string>} racers
 * @returns {string} 8 hex chars
 */
export function hashRoster(racers) {
  const names = (racers ?? []).map((r, i) => (typeof r === 'string' ? r : (r?.name ?? `#${i}`)));
  return hashWorld({ n: names.length, names }).full;
}

/**
 * Build a RACE IDENTITY. Exactly one of `laps` / `requestedSeconds` is meaningful, per topology —
 * the canonical operator inputs. Everything derived (finishT, realizedDurationSec, raceBaseSpeed)
 * is deliberately ABSENT: it is the model's job to derive those identically from this identity,
 * and baking them in would let a derivation divergence hide inside the identity itself.
 *
 * @param {object} p
 * @returns {object} the canonical identity object
 */
export function makeRaceIdentity({
  seed,
  nRacers,
  isOpen,
  laps = null,
  requestedSeconds = null,
  racePlanEnabled,
  worldHash,
  trackGeometryHash,
  rosterHash,
  speedMultiplier,
}) {
  return {
    seed,
    nRacers,
    isOpen: !!isOpen,
    laps: isOpen ? null : laps,
    requestedSeconds: isOpen ? requestedSeconds : null,
    racePlanEnabled: !!racePlanEnabled,
    speedMultiplier,
    worldHash,
    trackGeometryHash,
    rosterHash,
  };
}

/** Stable short hash of an identity — used to label soak rows and mismatch reports. */
export function hashIdentity(identity) {
  return hashWorld(identity).full;
}

/**
 * Build a RACE OUTCOME from a finished race.
 *
 * @param {object} p
 * @param {Array<{racerIndex:number, finalRank:number, finishTime:number|null}>} p.results
 * @param {Map<number, number[]>} p.checkpoints  physicsTs -> t per racerIndex
 * @returns {object} the canonical outcome object
 */
export function makeRaceOutcome({ results, checkpoints }) {
  const order = [...(results ?? [])]
    .sort((a, b) => a.finalRank - b.finalRank)
    .map((r) => [
      r.racerIndex,
      r.finalRank,
      // finishTime is seconds in the sim path; null for a DNF. Fixed precision so the hash
      // cannot be moved by a trailing float digit that no observer could ever see.
      r.finishTime == null ? null : Number(r.finishTime.toFixed(T_PRECISION)),
    ]);
  const cps = [...(checkpoints ?? new Map()).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, arr]) => [ts, arr.map((t) => (t == null ? null : Number(t.toFixed(T_PRECISION))))]);
  return { order, checkpoints: cps };
}

/** Stable hash of an outcome — the value the golden test compares. */
export function hashOutcome(outcome) {
  return hashWorld(outcome).full;
}

/**
 * First point at which two outcomes differ, for mismatch reports. Returns null when equal.
 * Reports the earliest DIVERGING CHECKPOINT (with the worst per-racer delta) if one exists,
 * otherwise the first finishing-order difference — so a report names where the race split,
 * not merely that it did.
 *
 * @param {object} a
 * @param {object} b
 * @returns {null | {kind: string, at: number|null, detail: string}}
 */
export function firstDivergence(a, b) {
  const aCps = a?.checkpoints ?? [];
  const bCps = b?.checkpoints ?? [];
  const n = Math.min(aCps.length, bCps.length);
  for (let i = 0; i < n; i++) {
    const [ts, av] = aCps[i];
    const [, bv] = bCps[i];
    let worst = 0;
    let worstIdx = -1;
    for (let r = 0; r < Math.max(av.length, bv.length); r++) {
      const d = Math.abs((av[r] ?? 0) - (bv[r] ?? 0));
      if (d > worst) {
        worst = d;
        worstIdx = r;
      }
    }
    if (worst > 0) {
      return {
        kind: 'checkpoint',
        at: ts,
        detail: `physicsTs=${ts} max|Δt|=${worst.toExponential(3)} at racerIndex=${worstIdx}`,
      };
    }
  }
  if (aCps.length !== bCps.length) {
    return {
      kind: 'checkpoint-count',
      at: null,
      detail: `checkpoint counts differ: ${aCps.length} vs ${bCps.length} (one race ran longer)`,
    };
  }
  const aOrd = a?.order ?? [];
  const bOrd = b?.order ?? [];
  for (let i = 0; i < Math.max(aOrd.length, bOrd.length); i++) {
    if (canonicalJson(aOrd[i]) !== canonicalJson(bOrd[i])) {
      return {
        kind: 'finish-order',
        at: i,
        detail: `rank ${i + 1}: ${canonicalJson(aOrd[i])} vs ${canonicalJson(bOrd[i])}`,
      };
    }
  }
  return null;
}
