// ============================================================
// File:        raceGovernor.js
// Path:        client/src/modules/raceGovernor.js
// Project:     RaceArena
// Description: Pre-OUTCOME Field Governor (Stage B core). A single per-racer speed
//              multiplier r.governorMult carrying TWO internal components:
//                • COHESION — mean-reverting to the field MEDIAN. Position-coupled and
//                  symmetric (brakes racers ahead of the median, lifts racers behind).
//                  Generalizes the existing symmetric seed computePulkBiasedTarget
//                  (racePlanner.js) from 3 pulk racers at re-roll events to ALL active
//                  racers every step, expressed as a speed multiplier.
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
 * Map the single owner "drama" scalar (0..1) to the internal (k, A) endpoints. More drama →
 * LESS cohesion (k down) + MORE shuffle (A up). Endpoints are floored/capped by config so at
 * max drama the equilibrium spread (~gapRef·A/k) stays below the breakaway gap and at min
 * drama A stays > 0 (no dead train). Realism is enforced by the outer clamp, not here.
 *
 * @param {number} drama 0..1
 * @param {{kMin:number,kMax:number,aMin:number,aMax:number}} cfg
 * @returns {{k:number, A:number}}
 */
export function governorDramaToKA(drama, cfg) {
  const d = clamp(drama ?? 0, 0, 1);
  const k = cfg.kMax - (cfg.kMax - cfg.kMin) * d;
  const A = cfg.aMin + (cfg.aMax - cfg.aMin) * d;
  return { k, A };
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
 * @param {{progress:number, pulkEndFrac:number, corrStartFrac:number, seed:number}} phaseCtx
 * @param {{enabled:boolean, drama:number, kMin:number, kMax:number, aMin:number, aMax:number,
 *          frequency:number, gapRef:number, maxEffect:number, maxStepPerFrame:number}} cfg
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

  const { progress, pulkEndFrac, corrStartFrac, seed } = phaseCtx;
  const w = governorPhaseWeight(progress, pulkEndFrac, corrStartFrac);
  const { k, A } = governorDramaToKA(cfg.drama, cfg);
  const gapRef = cfg.gapRef > 0 ? cfg.gapRef : 0.03;
  const maxEffect = cfg.maxEffect ?? 0.12;
  const maxStep = cfg.maxStepPerFrame ?? 0.01;
  const f = cfg.frequency ?? 3;
  const twoPiF = 2 * Math.PI * f;

  for (const r of racers) {
    if (r.finished) {
      r.governorMult = 1.0;
      continue;
    }
    const gap = (r.t - medianT) / finishT;
    // Cohesion: mean-reverting, symmetric, position-coupled (ahead → brake, behind → lift).
    const cohesion = -k * clamp(gap / gapRef, -1, 1);
    // Shuffle: bounded, zero-mean, rank-decoupled per-racer phase.
    const shuffle = A * Math.sin(twoPiF * progress + governorShufflePhase(r.index, seed));
    const target = clamp(1 + w * (cohesion + shuffle), 1 - maxEffect, 1 + maxEffect);
    // Rate-limit toward the target so the applied speed eases (never a sudden switch); the
    // per-frame change is hard-bounded by maxStep.
    const prev = r.governorMult ?? 1.0;
    r.governorMult = prev + clamp(target - prev, -maxStep, maxStep);
  }
}
