// ============================================================
// File:        raceParams.js
// Path:        client/src/modules/raceParams.js
// Project:     RaceArena
// Created:     2026-09-07
// Description: ONE-HOME-RACE-PARAMS-1 — the sprite geometry every `createRaceFromIdentity`
//              caller has to derive before it can call.
//
// ── WHAT THIS OWNS ──────────────────────────────────────────────────────────────────────────────
//
// The step between "a racer type and a track" and "the four sprite-geometry numbers
// `createRaceFromIdentity` takes": `physicalSpriteSize`, `drawnBodyWidthRefPx`, `bodyFillNarrow`
// and `bodyFillLong`. That is all. It does not build a race, read a config, touch storage or know
// what a track is — every input is passed in.
//
// ── WHY IT EXISTS, MEASURED RATHER THAN ASSUMED ─────────────────────────────────────────────────
//
// REPEAT-RECOMPUTE-6 recorded that this derivation had been mirrored TWICE. **That is not what the
// tree holds.** Searching for the derivation's own signature — a `computeRacerLayout(...).spriteSize`
// beside a `computeBodyNarrowRef(Math.min(285, effW), ...)` — finds it at FOURTEEN sites, one in
// `client/` and thirteen under `scripts/`. A recompute that had to agree with all fourteen is the
// drift the recompute piece stopped for, and it was a bigger number than anybody had written down.
//
// ── ★ THE TWO GUARDS ARE THE PART THAT WAS NOT MIRRORED, AND THEY ARE WHY THIS IS A FUNCTION ────
//
// `RaceScreen/index.jsx` and `camera-replay.mjs` derive only when auto-scale is ENABLED and the
// racer type carries no `displaySize` override; otherwise the sprite is its declared size and the
// scale is 1. Every other site derives UNCONDITIONALLY. Those two forms agree today only because
// `DEFAULT_AUTO_SCALE_CONFIG.enabled` is `true` (`autoSpriteScale.js:19`) and the harnesses set no
// override — an agreement by coincidence of defaults, not by construction.
//
// This function carries the GUARDED form, because that is what the product does. A caller that
// wants today's unconditional behaviour gets it by passing an enabled config and no override,
// which is what every harness already does.
//
// ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────────────────────────
//
//   · It does not READ configuration. `autoScaleConfig` is a parameter, so a harness can pin its
//     own copy — `scripts/golden/goldenRace.mjs` depends on exactly that, and a module that reached
//     for `DEFAULT_AUTO_SCALE_CONFIG` itself would silently break the golden fixture's isolation.
//   · It does not decide `effectiveWidth`. That is `trackWidthPx * behaviorConfig.startSpreadRange`
//     at every site; it stays with the caller because the caller is what knows the track.
//   · It does not call `createRaceFromIdentity`, and must not learn to. The point is one derivation
//     with many callers, not a second way to build a race.
// ============================================================

import { computeRacerLayout, computeBodyNarrowRef } from './rowLayout.js';

/**
 * The absolute ceiling on the body-narrow reference width, in world px.
 *
 * 285 matches a wide open track (300 × 0.95). Capping at the real effective width keeps a visible
 * body from exceeding its physical avoidance slot on a narrow closed track — Garden Path at N=40
 * overflowed by ~2.4 px a side before the cap existed.
 *
 * ★ THIS IS THE ONE HOME OF THE NUMBER. `rowLayout.test.js` used to declare its own
 * `W_REF_MAX = 285` with the comment "must match the constant in RaceScreen/index.jsx"; a constant
 * that has to be kept in step by a comment is the shape this module exists to remove.
 */
export const W_REF_MAX = 285;

/**
 * Derive the sprite geometry `createRaceFromIdentity` needs.
 *
 * @param {object}  a
 * @param {number}  a.displaySize             the racer type's declared display size
 * @param {number}  a.bodyFillX               the type's body fill on X
 * @param {number}  a.bodyFillY               the type's body fill on Y
 * @param {number}  a.nRacers                 field size
 * @param {number}  a.effectiveWidth          trackWidthPx × behaviorConfig.startSpreadRange
 * @param {object}  a.autoScaleConfig         the auto-scale config THIS caller is running with
 * @param {boolean} [a.hasDisplaySizeOverride=false]  the owner pinned `displaySize` for this type
 * @returns {{physicalSpriteSize:number, displaySizeScale:number, drawnBodyWidthRefPx:number,
 *            bodyFillNarrow:number, bodyFillLong:number}}
 */
export function deriveSpriteGeometry({
  displaySize,
  bodyFillX,
  bodyFillY,
  nRacers,
  effectiveWidth,
  autoScaleConfig,
  hasDisplaySizeOverride = false,
}) {
  // The narrow/long split, with the same non-finite and non-positive fallback every site carried.
  // A body fill of 0 or NaN would otherwise divide the reference to infinity.
  const narrowRaw = Math.min(bodyFillX, bodyFillY);
  const longRaw = Math.max(bodyFillX, bodyFillY);
  const bodyFillNarrow = Number.isFinite(narrowRaw) && narrowRaw > 0 ? narrowRaw : 1.0;
  const bodyFillLong = Number.isFinite(longRaw) && longRaw > 0 ? longRaw : 1.0;

  // PHYSICS, not drawing: `physicalSpriteSize` feeds rowGapPx and rowCount, so this branch decides
  // where every racer starts. It is the reason this module is treated as engine-adjacent.
  let physicalSpriteSize = displaySize;
  // Drawing and camera: the body-narrow scale from the capped reference width.
  let displaySizeScale = 1;

  if (autoScaleConfig?.enabled && !hasDisplaySizeOverride) {
    physicalSpriteSize = computeRacerLayout(
      effectiveWidth,
      nRacers,
      displaySize,
      autoScaleConfig
    ).spriteSize;

    const bodyRef = computeBodyNarrowRef(
      Math.min(W_REF_MAX, effectiveWidth),
      nRacers,
      displaySize,
      bodyFillNarrow,
      autoScaleConfig
    );
    displaySizeScale = bodyRef.bodyNarrow / displaySize;
  }

  return {
    physicalSpriteSize,
    displaySizeScale,
    // Body-narrow world px. The camera sets zoom so this is its body-size reference for
    // OVERVIEW-FRAMING-1's sprite floor. Written as the product rather than as `bodyRef.bodyNarrow`
    // because that is the form every call site used, and the two are the same number.
    drawnBodyWidthRefPx: displaySize * displaySizeScale,
    bodyFillNarrow,
    bodyFillLong,
  };
}
