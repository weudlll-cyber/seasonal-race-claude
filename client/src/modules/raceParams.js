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
// ★ THAT COUNT IS OF 2026-09-07 AND IS NOT THE COUNT TODAY. Re-run whole-tree and uncapped on
// 2026-09-10 (W-REF-ONE-HOME-1), the literal `285` in the cap role stood at ELEVEN live sites:
// eight callers had been converted to `deriveSpriteGeometry` and eleven had not, including
// `scripts/sim-fairness.mjs`, which DRIVES THE WORLD FINGERPRINT — so the project's primary
// detector for the race was structurally blind to the number below. All eleven now read
// `W_REF_MAX`; `scripts/w-ref-one-home.test.mjs` fails if a twelfth appears.
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
// RACE-PARAMS-2: the normal-speed derivation, from its own one home rather than re-typed.
import { normalSpeedFrom } from './durationModel.js';

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

// ── ★ THE SECOND STEP: THE ARGUMENT OBJECT ITSELF (RACE-PARAMS-2) ───────────────────────────────
//
// `deriveSpriteGeometry` above removed the sprite arithmetic from every caller and left the REST
// standing: `effectiveWidth`, the `isOpen`-stamped behaviour config, `normalSpeedPxPerSec`, and the
// twenty-field object `createRaceFromIdentity` takes. Three sites still assembled that by hand and
// two of them said so in their own comments —
//
//   · `client/src/screens/RaceScreen/index.jsx`   the product
//   · `scripts/camera-replay.mjs`                 "RaceScreen's own derivation, TRANSCRIBED"
//   · `scripts/parity/goldenRunner.mjs`           arm C, "the REAL browser core"
//
// A knowingly transcribed derivation is the shape this repository has paid for repeatedly: the
// copies agree until one of them is edited, and the thing that would notice is one of the copies.
//
// ── WHAT THIS OWNS, AND WHAT IT REFUSES TO ──────────────────────────────────────────────────────
//
// It owns the ASSEMBLY and nothing else: given a track, a world, a racer type and the race's own
// numbers, it returns exactly the object `createRaceFromIdentity` takes. It does NOT call it —
// a builder that also built would make the two impossible to test apart, and `camera-replay` needs
// the parts around the call as much as the call.
//
// It reads NO storage and NO configuration loader, for the same reason `deriveSpriteGeometry` does
// not: the product answers the override question from `localStorage`, `camera-replay` answers it
// from the marker it is replaying, and the golden runner has no override to answer. Each hands the
// answer in. That split is why `hasDisplaySizeOverride` is a parameter here rather than a lookup.
//
// ★ IT CHANGES NO NUMBER. Every line below is the arithmetic that stood at the three sites, moved
// rather than rewritten — which is what the four fingerprints are the check on, not the argument
// for.

/**
 * The complete argument object for `createRaceFromIdentity`, plus the one extra number the browser
 * needs for drawing (`displaySizeScale`).
 *
 * @param {object}  p
 * @param {object}  p.shape            an EditorShape for the track
 * @param {boolean} p.isOpenTrack      `shape.isOpen`, passed rather than re-read so a caller that
 *                                     has already decided cannot be overruled here
 * @param {number}  p.pathLengthPx     the track's own path length
 * @param {number}  p.trackWidthPx     the track's own width
 * @param {object}  p.world            `{baseSpeedConfig, raceBehaviorConfig, rowLayoutConfig,
 *                                     raceDynamicsConfig, autoScaleConfig}` — the flat config world
 * @param {object}  p.racerType        `{displaySize, bodyFillX, bodyFillY, speedMultiplier}`
 * @param {number}  p.nRacers
 * @param {number}  p.laps
 * @param {number}  p.requestedSeconds
 * @param {number}  p.racePlanSeed
 * @param {boolean} p.racePlanEnabledFlag
 * @param {boolean} [p.hasDisplaySizeOverride=false]  see the header — the caller answers it
 * @param {boolean} [p.constSpeedActive=false]        the diagnostic equaliser; off everywhere real
 * @returns {object} the `createRaceFromIdentity` params, with `displaySizeScale` alongside
 */
export function buildRaceCoreParams({
  shape,
  isOpenTrack,
  pathLengthPx,
  trackWidthPx,
  world,
  racerType,
  nRacers,
  laps,
  requestedSeconds,
  racePlanSeed,
  racePlanEnabledFlag,
  hasDisplaySizeOverride = false,
  constSpeedActive = false,
}) {
  // The behaviour config the engine reads is the world's, stamped with the track's openness. Every
  // one of the three sites did exactly this, and none of them could have done it differently:
  // `isOpen` is a property of the track, not of the config.
  const behaviorConfig = { ...world.raceBehaviorConfig, isOpen: isOpenTrack };
  // The width the start grid is packed across. `startSpreadRange` is a fraction of the track width.
  const effectiveWidth = trackWidthPx * behaviorConfig.startSpreadRange;

  const {
    physicalSpriteSize,
    displaySizeScale,
    drawnBodyWidthRefPx,
    bodyFillNarrow,
    bodyFillLong,
  } = deriveSpriteGeometry({
    displaySize: racerType.displaySize,
    bodyFillX: racerType.bodyFillX,
    bodyFillY: racerType.bodyFillY,
    nRacers,
    effectiveWidth,
    autoScaleConfig: world.autoScaleConfig,
    hasDisplaySizeOverride,
  });

  return {
    shape,
    isOpenTrack,
    pathLengthPx,
    trackWidthPx,
    speedMultiplier: racerType.speedMultiplier,
    baseSpeedConfig: world.baseSpeedConfig,
    behaviorConfig,
    rowConfig: world.rowLayoutConfig,
    dynamicsConfig: world.raceDynamicsConfig,
    normalSpeedPxPerSec: normalSpeedFrom(world.baseSpeedConfig),
    laps,
    requestedSeconds,
    nRacers,
    racePlanSeed,
    racePlanEnabledFlag,
    physicalSpriteSize,
    drawnBodyWidthRefPx,
    bodyFillNarrow,
    bodyFillLong,
    constSpeedActive,
    // NOT a `createRaceFromIdentity` field — it is the drawing scale, returned here because the
    // browser needs it one line later and computing it twice is how the two come apart.
    displaySizeScale,
  };
}
