// ============================================================
// File:        raceGovernor.js
// Path:        client/src/modules/raceGovernor.js
// Project:     RaceArena
// Description: Pre-OUTCOME Field Governor (Stage B core). A single per-racer speed
//              multiplier r.governorMult carrying TWO internal components:
//                • EDGE-LIMITER (Stage 1) — a DEAD-ZONED restoring force on the arc-distance
//                  gap to the field MEDIAN, measured in TRUE RACER-LENGTHS (arc-px / mean body
//                  length), NOT finishT. ZERO force inside the bound (the whole middle of the
//                  field → re-roll variation runs free → natural groups/battles); only PAST the
//                  bound does a symmetric progressive barrier engage (brake a leader too far
//                  ahead, lift a tail too far behind). Median-referenced: bounding leader→median
//                  ≤ N lengths gives leader→2nd ≤ N for free (2nd sits between). The length unit
//                  is lap-count- AND track-independent (one lap = one lap; a body is fixed px) —
//                  retiring the finishT divisor that UNDER-reported closed multi-lap gaps by
//                  ~maxLaps. Position-coupled, ±maxEffect clamp. Front-pack bias + comeback are
//                  LATER stages (2a/2b); shuffle stays.
//                • SHUFFLE — bounded, zero-mean oscillation with a per-racer phase from a
//                  DEDICATED seeded stream (rank-DECOUPLED: derived from racer index +
//                  seed, never from the target-rank assignment). No Math.random.
//              Combined in one outer-clamped multiplier (realism ±maxEffect), phase-gated
//              and faded to EXACTLY 1.0 by OUTCOME (structural, independent of the fade
//              math), and rate-limited per step so speed changes are smooth.
//
//              Shared by the browser engine (RaceScreen/index.jsx) and the headless sim
//              (sim-fairness.mjs) so both measure the identical mechanism (single source,
//              like raceRubberBand.js). Reuses computeMedianT (imported — no re-impl) and
//              easeInOutCubic. Deterministic + browser/sim parity: all inputs (t, median,
//              progress, seed, index) are deterministic and no Math.random is used.
//
//              Stage B ships DEFAULT OFF and runs ALONGSIDE surge + rubber-band; nothing
//              is replaced. Deactivating surge/RB is a separate later stage.
// ============================================================

import { computeMedianT } from './raceRubberBand.js';
import { mulberry32 } from './racePlanner.js';
import { easeInOutCubic } from '../utils/mathUtils.js';

// Governor shuffle-phase seed constant. MUST differ from the other per-race streams so the
// shuffle phase cannot correlate with the target-rank assignment: target-rank shuffle uses
// mulberry32(seed), surge uses (seed ^ 0x5bf03635), controller noise uses (seed + 0x9e3779b9).
const GOVERNOR_SEED_XOR = 0x27d4eb2f;

// Minimum fade span (progress fraction) for the TRANSITION ease-out. If the LIVE
// (corrStartFrac − pulkEndFrac) span is smaller (owner shortened the OUTCOME onset), the
// fade widens BACKWARD into PULK so w still reaches exactly 0 at corrStart — no
// discontinuity, and no wall-clock needed (purely progress-based → deterministic + parity).
const MIN_FADE_SPAN = 0.05;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Deterministic per-racer shuffle phase in [0, 2π). Rank-DECOUPLED: derived from the racer
 * index and (seed ^ GOVERNOR_SEED_XOR) — never from the target-rank assignment — via the
 * shared mulberry32 helper (A3: no new RNG). STABLE per racer for the whole race (a single
 * draw keyed on index+seed), so it drives a coherent oscillation rather than per-frame noise.
 * No Math.random → reproducible and browser/sim parity-safe (even at seed 0, a live browser
 * race gets a fixed per-index phase, which is fine — it is uncorrelated with target rank).
 *
 * @param {number} index racer index (stable per race; uncorrelated with target rank)
 * @param {number} seed  race plan seed (0 in a live browser race → still deterministic per index)
 * @returns {number} phase offset in [0, 2π)
 */
export function governorShufflePhase(index, seed) {
  const streamSeed = ((((seed >>> 0) ^ GOVERNOR_SEED_XOR) >>> 0) + (index >>> 0)) >>> 0;
  return mulberry32(streamSeed)() * 2 * Math.PI;
}

/**
 * Track-arc distance between two cumulative-t values, as a lap fraction (× pathLengthPx →
 * px). CLOSED: the within-lap min-arc (tPos wrap) — the sim's verified honest-gap form
 * (sim-fairness.mjs) — so racers on different laps still measure their VISIBLE on-track arc.
 * OPEN: raw |a − b| (t is a monotonic path-fraction, no wrap). Unsigned magnitude.
 *
 * @param {number} a cumulative-t
 * @param {number} b cumulative-t
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
 * Map the single owner "Action" scalar (0..1) to the dead-zone bound (in TRUE RACER-LENGTHS)
 * and the shuffle amplitude. Higher Action → WIDER bound (leader may sit more racer-lengths
 * ahead of the median before the edge engages) + MORE shuffle. The barrier softness k0 is
 * FIXED (not mapped by Action). The length bound is floored (lenFloor) so it can't vanish.
 *
 * @param {number} drama 0..1 (the Action slider)
 * @param {{lenMin:number, lenMax:number, lenFloor:number, aMin:number, aMax:number}} cfg
 * @returns {{lengths:number, A:number}}
 */
export function governorActionToParams(drama, cfg) {
  const d = clamp(drama ?? 0, 0, 1);
  const lengths = Math.max(cfg.lenFloor ?? 1, cfg.lenMin + (cfg.lenMax - cfg.lenMin) * d);
  const A = cfg.aMin + (cfg.aMax - cfg.aMin) * d;
  return { lengths, A };
}

/**
 * Progressive rubber-band restoring force for a gap normalized by the bound, x = gap/gapBound.
 * Rational barrier: ≈ k0·x near the center (soft — shuffle dominates, racers move freely),
 * diverging as |x| → 1 and clamped at maxEffect (stiff at the bound, no flat spot below it, no
 * hard step). Symmetric in sign, so it brakes a leader (x>0) and lifts a straggler (x<0) with
 * equal, opposite magnitude. Returned as a SIGNED force to SUBTRACT from 1.0 (positive = brake).
 *
 * @param {number} x        gap / gapBound  (clamped internally to ±0.999 to keep the barrier finite)
 * @param {number} k0       softness (slope near center)
 * @param {number} maxEffect outer force cap (the realism envelope)
 * @returns {number} signed force in [−maxEffect, +maxEffect]
 */
export function governorRestoringForce(x, k0, maxEffect) {
  const xc = clamp(x, -0.999, 0.999);
  const a = Math.abs(xc);
  return Math.sign(xc) * Math.min(maxEffect, k0 * (a / (1 - a)));
}

/**
 * Phase weight w(progress): 1.0 in PRE_PULK/PULK before the fade window, easeInOutCubic
 * down to EXACTLY 0 at corrStartFrac, 0 in OUTCOME. The fade window ENDS at corrStartFrac
 * and spans max(corrStartFrac − pulkEndFrac, MIN_FADE_SPAN); when the owner shrinks the real
 * TRANSITION the window widens backward into PULK, so w always reaches 0 at corrStart with no
 * jump — purely progress-based (no wall-clock). Reads the LIVE fractions (no hardcoded 0.5/0.55).
 *
 * @param {number} progress      leader-progress fraction [0,1]
 * @param {number} pulkEndFrac   live PULK-end fraction
 * @param {number} corrStartFrac live OUTCOME-start (corridorStart) fraction
 * @returns {number} weight in [0,1]
 */
export function governorPhaseWeight(progress, pulkEndFrac, corrStartFrac) {
  const fadeSpan = Math.max(corrStartFrac - pulkEndFrac, MIN_FADE_SPAN);
  const fadeStart = corrStartFrac - fadeSpan;
  if (progress <= fadeStart) return 1.0;
  if (progress >= corrStartFrac) return 0.0;
  return 1 - easeInOutCubic((progress - fadeStart) / fadeSpan);
}

/**
 * Apply the field governor for one physics step, mutating r.governorMult per active racer.
 * Caller multiplies r.governorMult into the t-advance (alongside rubberBandMult / pulkSurgeMult).
 *
 * STRUCTURAL OUTCOME-off: when the phase is not PRE_PULK/PULK/TRANSITION (or the governor is
 * disabled, or finishT<=0, or no live median), every governorMult is pinned to EXACTLY 1.0 —
 * so "1.0 in OUTCOME for every phase configuration" holds independent of the fade math.
 *
 * @param {Array}  racers   live racer objects (.t, .index, .finished, .governorMult)
 * @param {number} finishT
 * @param {string} phase    getPhase() result: 'PRE_PULK'|'PULK'|'TRANSITION'|'OUTCOME'|'FINAL'
 * @param {{progress:number, pulkEndFrac:number, corrStartFrac:number, seed:number,
 *          pathLengthPx:number, meanBodyLen:number, isOpen:boolean}} phaseCtx  pathLengthPx =
 *          one lap in px; meanBodyLen = mean drawnBodyLengthPx (racer-length unit); isOpen
 *          selects the arc wrap. The bound is measured in racer-lengths via these — no finishT.
 * @param {{enabled:boolean, drama:number, k0:number, lenMin:number, lenMax:number,
 *          lenFloor:number, rampWidth:number, aMin:number, aMax:number,
 *          frequency:number, maxEffect:number, maxStepPerFrame:number}} cfg
 * @param {number} [sharedMedianT] field median for this step, precomputed once and shared with
 *   the rubber-band (A5 — avoids a second sort/step). Omit → computed internally.
 */
export function applyGovernor(racers, finishT, phase, phaseCtx, cfg, sharedMedianT) {
  const activePhase = phase === 'PRE_PULK' || phase === 'PULK' || phase === 'TRANSITION';
  const medianT =
    activePhase && cfg && cfg.enabled && finishT > 0
      ? sharedMedianT !== undefined
        ? sharedMedianT
        : computeMedianT(racers)
      : null;

  // Structural OUTCOME/FINAL-off, disabled, or no median → pin exactly 1.0.
  if (!activePhase || !cfg || !cfg.enabled || finishT <= 0 || medianT === null) {
    for (const r of racers) {
      if (!r.finished) r.governorMult = 1.0;
    }
    return;
  }

  const { progress, pulkEndFrac, corrStartFrac, seed, pathLengthPx, meanBodyLen, isOpen } =
    phaseCtx;
  const w = governorPhaseWeight(progress, pulkEndFrac, corrStartFrac);
  const { lengths: boundLengths, A } = governorActionToParams(cfg.drama, cfg);
  const maxEffect = cfg.maxEffect ?? 0.12;
  const k0 = cfg.k0 ?? 0.03;
  const maxStep = cfg.maxStepPerFrame ?? 0.01;
  const rampWidth = cfg.rampWidth > 0 ? cfg.rampWidth : 0.5;
  const f = cfg.frequency ?? 3;
  const twoPiF = 2 * Math.PI * f;
  // gap in TRUE RACER-LENGTHS: arc-distance to the median × one-lap px / mean body length.
  // Lap-count- and track-independent (retires the finishT divisor that under-reported closed
  // multi-lap gaps). Guard a degenerate geometry (no px/body → no cohesion).
  const lenScale = meanBodyLen > 0 ? pathLengthPx / meanBodyLen : 0;

  for (const r of racers) {
    if (r.finished) {
      r.governorMult = 1.0;
      continue;
    }
    // Signed arc-length gap to the median (sign = ahead/behind by cumulative t; magnitude =
    // visible on-track arc in racer-lengths). Field is sub-lap pre-OUTCOME so sign is exact.
    const gapLengths = Math.sign(r.t - medianT) * arcT(r.t, medianT, isOpen) * lenScale;
    const x = boundLengths > 0 ? gapLengths / boundLengths : 0;
    const ax = Math.abs(x);
    // DEAD ZONE: zero force inside the bound (|x| ≤ 1) — the whole middle of the field runs
    // free (re-roll + shuffle move racers, governorMult stays EXACTLY 1.0 there). Only PAST
    // the bound does the symmetric progressive barrier engage on the excess (brake ahead,
    // lift behind). Median-referenced, so a leader+2nd group both beyond the bound both brake.
    const cohesion =
      ax <= 1 ? 0 : -governorRestoringForce((Math.sign(x) * (ax - 1)) / rampWidth, k0, maxEffect);
    // Shuffle: bounded, zero-mean, rank-decoupled per-racer phase (Stage-1 keeps this as-is).
    const shuffle = A * Math.sin(twoPiF * progress + governorShufflePhase(r.index, seed));
    const target = clamp(1 + w * (cohesion + shuffle), 1 - maxEffect, 1 + maxEffect);
    // Rate-limit toward the target so the applied speed eases (never a sudden switch); the
    // per-frame change is hard-bounded by maxStep.
    const prev = r.governorMult ?? 1.0;
    r.governorMult = prev + clamp(target - prev, -maxStep, maxStep);
  }
}
