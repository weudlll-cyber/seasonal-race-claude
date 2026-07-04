// ============================================================
// File:        raceGovernor.js
// Path:        client/src/modules/raceGovernor.js
// Project:     RaceArena
// Description: Pre-OUTCOME Field Governor (Stage B core). A single per-racer speed
//              multiplier r.governorMult carrying TWO internal components:
//                • COHESION — a PROGRESSIVE rubber-band restoring force on the gap to the
//                  field MEDIAN. Position-coupled and symmetric (brakes racers ahead of the
//                  median, lifts racers behind). SOFT near the median (shuffle free to move
//                  racers) and progressively STIFFER toward an Action-scaled bound expressed
//                  in mean-racer-LENGTHS (leader→median), reaching ~maxEffect at the bound
//                  with no flat spot below it — a rubber-band, not a wall. Two-sided closing
//                  keeps each racer within ±maxEffect while the median rises to meet a leader.
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
 * Map the single owner "Action" scalar (0..1) to the length-bound (in mean-racer-lengths)
 * and the shuffle amplitude. Higher Action → WIDER bound (more room) + MORE shuffle. The
 * cohesion softness k0 is FIXED (not mapped) so the field is never a dead train (low Action)
 * and never leaks (high Action) — the OLD backwards drama→k map (high drama lowered k) is
 * retired. The bound is hard-floored at lengthBoundFloor: a ~1-length field jams inside the
 * speed-brake zone (speedBrakeTMultiplier 1.5 > 1 length) → constant pre-OUTCOME braking, so
 * the safe floor is ~2 lengths (sweep may raise, never below the floor).
 *
 * @param {number} drama 0..1 (the Action slider)
 * @param {{lengthBoundMin:number, lengthBoundMax:number, lengthBoundFloor:number,
 *          aMin:number, aMax:number}} cfg
 * @returns {{lengthBound:number, A:number}}
 */
export function governorActionToParams(drama, cfg) {
  const d = clamp(drama ?? 0, 0, 1);
  const rawBound = cfg.lengthBoundMin + (cfg.lengthBoundMax - cfg.lengthBoundMin) * d;
  const lengthBound = Math.max(cfg.lengthBoundFloor ?? 0, rawBound);
  const A = cfg.aMin + (cfg.aMax - cfg.aMin) * d;
  return { lengthBound, A };
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
 *          oneLenT:number}} phaseCtx  oneLenT = mean(drawnBodyLengthPx)/pathLengthPx — the
 *          racer-length in t-fraction units the length bound is measured in.
 * @param {{enabled:boolean, drama:number, k0:number, lengthBoundMin:number,
 *          lengthBoundMax:number, lengthBoundFloor:number, aMin:number, aMax:number,
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

  const { progress, pulkEndFrac, corrStartFrac, seed, oneLenT } = phaseCtx;
  const w = governorPhaseWeight(progress, pulkEndFrac, corrStartFrac);
  const { lengthBound, A } = governorActionToParams(cfg.drama, cfg);
  const maxEffect = cfg.maxEffect ?? 0.12;
  const k0 = cfg.k0 ?? 0.03;
  const maxStep = cfg.maxStepPerFrame ?? 0.01;
  const f = cfg.frequency ?? 3;
  const twoPiF = 2 * Math.PI * f;
  // Length bound → t-fraction gap bound (leader→median). Guard a degenerate geometry.
  const gapBound = oneLenT > 0 ? lengthBound * oneLenT : 0;

  for (const r of racers) {
    if (r.finished) {
      r.governorMult = 1.0;
      continue;
    }
    const gap = (r.t - medianT) / finishT;
    // Cohesion: progressive rubber-band restoring force on the gap to the median, normalized
    // by the bound. Soft near center, stiff at the bound; symmetric (ahead → brake, behind →
    // lift). Subtract the signed force from 1.0. gapBound<=0 → no cohesion (geometry guard).
    const cohesion = gapBound > 0 ? -governorRestoringForce(gap / gapBound, k0, maxEffect) : 0;
    // Shuffle: bounded, zero-mean, rank-decoupled per-racer phase.
    const shuffle = A * Math.sin(twoPiF * progress + governorShufflePhase(r.index, seed));
    const target = clamp(1 + w * (cohesion + shuffle), 1 - maxEffect, 1 + maxEffect);
    // Rate-limit toward the target so the applied speed eases (never a sudden switch); the
    // per-frame change is hard-bounded by maxStep.
    const prev = r.governorMult ?? 1.0;
    r.governorMult = prev + clamp(target - prev, -maxStep, maxStep);
  }
}
