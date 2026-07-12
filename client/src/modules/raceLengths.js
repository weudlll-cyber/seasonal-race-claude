// ============================================================
// raceLengths.js — the ONE source for the racer-LENGTH unit.
//
// "Racer lengths" = how many racer bodies fit in a gap on the track. It is what the owner has
// reasoned in for the whole project and what the DIRECTOR-DIAG HUD shows on screen: a spatial,
// speed-independent, lap- and track-independent measure ("6 lengths clear", "field = 34 lengths").
//
// The conversion is: arc distance (in lap-fraction units) × (one-lap px / mean racer body px).
// It was re-derived in three places that must never drift apart — GovernorDiagHUD.jsx (the readout
// the owner reads), raceGovernor.js (the director's catch-threshold), and the fairness sim
// (sim-fairness.mjs). They now all import from here. A re-implemented conversion is the next lie.
// ============================================================

/**
 * Track-arc distance between two positions, in LAP-FRACTION units. Lap-count independent
 * (positions are read mod 1 on closed tracks); open tracks use the raw absolute difference.
 * @param {number} a  track position (lap-fraction; may exceed 1 for multi-lap `t`)
 * @param {number} b  track position
 * @param {boolean} isOpen open-track flag
 * @returns {number} arc distance in lap-fraction units
 */
export function arcT(a, b, isOpen) {
  if (isOpen) return Math.abs(a - b);
  const pa = ((a % 1) + 1) % 1;
  const pb = ((b % 1) + 1) % 1;
  const d = Math.abs(pa - pb);
  return Math.min(d, 1 - d);
}

/**
 * SIGNED, lap-aware arc distance from `aheadT` back to `behindT`, in LAP-FRACTION units. Unlike arcT
 * (unsigned, wrapped to <= half a lap), this uses the CUMULATIVE track position `t` — which increases
 * monotonically and is NEVER taken mod 1 (the t-update in raceStep.js only ADDS, clamping at finishT),
 * so it stays SIGNED and never wraps: a racer a full lap down reads as ~1.0 (a lap behind), not ~0.
 * Positive = `behindT` is behind `aheadT`; negative = ahead. Use this for "how far behind the leader" /
 * reachability / drop-depth — NEVER arcT, which makes a lapped backmarker read as close (PulkLeadRotation
 * review Q4). Direction on top of this should still come from the live RANK order, not the sign alone.
 * @param {number} aheadT   cumulative track position of the reference (e.g. the leader)
 * @param {number} behindT  cumulative track position of the other racer
 * @returns {number} signed arc distance in lap-fraction units (positive = behind aheadT)
 */
export function signedArcT(aheadT, behindT) {
  return aheadT - behindT;
}

/**
 * signedArcT × lenScale → SIGNED racer-lengths that `behindT` is behind `aheadT` (positive = behind).
 * The lap-aware, non-wrapping companion to arcLengths, for the lead-rotation distance tests.
 */
export function signedArcLengths(aheadT, behindT, pathLengthPx, meanBodyLen) {
  return signedArcT(aheadT, behindT) * lenScaleFrom(pathLengthPx, meanBodyLen);
}

/**
 * Arc-fraction → racer-lengths scale = pathLengthPx / meanBodyLen. Returns 0 when meanBodyLen is
 * non-positive (degenerate geometry), so callers guard on `> 0` exactly as the inline code did.
 * @param {number} pathLengthPx one-lap path length in px
 * @param {number} meanBodyLen  mean racer body length in px
 * @returns {number} lengths per lap-fraction (0 if degenerate)
 */
export function lenScaleFrom(pathLengthPx, meanBodyLen) {
  return meanBodyLen > 0 ? pathLengthPx / meanBodyLen : 0;
}

/**
 * Arc distance between two track positions, expressed in RACER BODY LENGTHS.
 * arcLengths = arcT(a,b,isOpen) × lenScaleFrom(pathLengthPx, meanBodyLen).
 */
export function arcLengths(a, b, isOpen, pathLengthPx, meanBodyLen) {
  return arcT(a, b, isOpen) * lenScaleFrom(pathLengthPx, meanBodyLen);
}

/**
 * Mean drawn body length (px) over the field — the denominator of the racer-length unit.
 * POPULATION: every racer with a positive `drawnBodyLengthPx` (identical on browser + sim). Bodies
 * are fixed per racer, so this is computed once per race.
 * @param {Array<{drawnBodyLengthPx:number}>} racers
 * @returns {number} mean body length in px (0 when no racer has a positive body length)
 */
export function meanDrawnBodyLen(racers) {
  let sum = 0;
  let n = 0;
  for (const r of racers) {
    if (r.drawnBodyLengthPx > 0) {
      sum += r.drawnBodyLengthPx;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}
