// ============================================================
// File:        raceGovernor.js
// Path:        client/src/modules/raceGovernor.js
// Project:     RaceArena
// Description: Pre-OUTCOME Field Governor (Stage B core). A single per-racer speed
//              multiplier r.governorMult carrying TWO internal components:
//                • TAIL-LIFT (Stage C) — a DEAD-ZONED restoring force on the arc-distance
//                  gap to the field MEDIAN, measured in TRUE RACER-LENGTHS (arc-px / mean body
//                  length), NOT finishT. ZERO force inside the bound (the whole middle of the
//                  field → re-roll variation runs free → natural groups/battles); only when a
//                  racer falls PAST the bound BEHIND the median does a progressive barrier lift
//                  it back toward the field. ONE-SIDED: a racer at or ahead of the median gets
//                  exactly zero at every distance — the governor never brakes the leader (the
//                  ahead-median brake was RETIRED in Stage C; the contested front is a later
//                  race-director layer). The length unit is lap-count- AND track-independent
//                  (one lap = one lap; a body is fixed px) — retiring the finishT divisor that
//                  UNDER-reported closed multi-lap gaps by ~maxLaps. Position-coupled (gap to
//                  median), ±maxEffect clamp. Front-pack bias + comeback are LATER stages;
//                  shuffle stays.
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

// Director (contest-injector) featured-cast stream constant. Its OWN dedicated XOR, DISTINCT
// from GOVERNOR_SEED_XOR and every other per-race stream above, so the rotating featured cast
// is rank-BLIND: membership is keyed on racer index + (seed ^ this) and can never correlate
// with the target-rank assignment. No Math.random on this path.
const DIRECTOR_SEED_XOR = 0x6b7f1e35;

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
 * Deterministic per-racer sort key in [0, 1) for the DIRECTOR featured-cast rotation. Keyed on
 * the racer index and (seed ^ DIRECTOR_SEED_XOR) via the shared mulberry32 helper (no new RNG,
 * no Math.random). Rank-BLIND: never derived from the target-rank assignment, and on a distinct
 * stream from the governor shuffle. Sorting the field by this key yields a STABLE seed-shuffled
 * order (fixed per race) that the round-robin marches the spotlight through — so which racers are
 * featured is unpredictable and uncorrelated with who is assigned to win.
 *
 * @param {number} index racer index (stable per race; uncorrelated with target rank)
 * @param {number} seed  race plan seed (0 in a live browser race → still deterministic per index)
 * @returns {number} sort key in [0, 1)
 */
export function directorStreamKey(index, seed) {
  const streamSeed = ((((seed >>> 0) ^ DIRECTOR_SEED_XOR) >>> 0) + (index >>> 0)) >>> 0;
  return mulberry32(streamSeed)();
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
 * and the shuffle amplitude. Higher Action → WIDER bound (a racer may fall more racer-lengths
 * BEHIND the median before the tail-lift engages) + MORE shuffle. The barrier softness k0 is
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
 * hard step). Magnitude grows with |x|; sign follows x. Generic (symmetric) barrier math —
 * Stage C feeds it only the LIFT (positive) direction, since the ahead-median brake is retired.
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
export function governorFadeStart(pulkEndFrac, corrStartFrac) {
  return corrStartFrac - Math.max(corrStartFrac - pulkEndFrac, MIN_FADE_SPAN);
}

export function governorPhaseWeight(progress, pulkEndFrac, corrStartFrac) {
  const fadeStart = governorFadeStart(pulkEndFrac, corrStartFrac);
  if (progress <= fadeStart) return 1.0;
  if (progress >= corrStartFrac) return 0.0;
  return 1 - easeInOutCubic((progress - fadeStart) / (corrStartFrac - fadeStart));
}

/**
 * DIRECTOR contest-injector — the currently FEATURED cast (a Set of racer indices) for this step,
 * or null when nothing is featured (director off, degenerate field, or inside the settling window).
 * Rank-BLIND, seed-shuffled round-robin: the live field is ordered ONCE by directorStreamKey (a
 * stable per-race permutation), and the spotlight marches a window of `castSize` consecutive racers
 * through that order, advancing one cast every `dwell` of leader-progress. Over a full pass every
 * racer is featured once, in shuffled order; a short window features only some — which is intended
 * (the assigned winner is sometimes not featured in the first half).
 *
 * SETTLING: no cast is featured at/after `cutoff` (progress), so new spotlights stop a settling
 * window before the fade begins and the field is already relaxing toward its natural re-roll
 * distribution by corridorStart. Purely progress- + seed-based → deterministic, browser/sim parity.
 *
 * @param {Array}  racers    live racer objects (.index, .finished)
 * @param {number} seed      race plan seed
 * @param {number} progress  leader-progress fraction [0,1]
 * @param {number} castSize  featured cast size (≥1)
 * @param {number} dwell     spotlight dwell as a progress fraction (>0): how long a cast holds
 * @param {number} cutoff    settling cutoff (progress): no new cast at/after this point
 * @returns {Set<number>|null} featured racer indices, or null when nothing is featured
 */
export function directorFeaturedSet(racers, seed, progress, castSize, dwell, cutoff) {
  if (progress >= cutoff || castSize <= 0 || dwell <= 0) return null;
  const live = [];
  for (const r of racers) if (!r.finished) live.push(r.index);
  const n = live.length;
  if (n === 0) return null;
  const cast = Math.min(castSize, n);
  // Stable seed-shuffled order (rank-blind): sort live indices by the director stream key.
  const order = live
    .map((idx) => ({ idx, key: directorStreamKey(idx, seed) }))
    .sort((a, b) => (a.key !== b.key ? a.key - b.key : a.idx - b.idx));
  const slot = Math.floor(progress / dwell);
  const start = (((slot * cast) % n) + n) % n; // window start in the shuffled order (wraps)
  const featured = new Set();
  for (let j = 0; j < cast; j++) featured.add(order[(start + j) % n].idx);
  return featured;
}

/**
 * Apply the field governor for one physics step, mutating r.governorMult per active racer.
 * Caller multiplies r.governorMult into the t-advance (alongside rubberBandMult / pulkSurgeMult).
 *
 * Carries THREE independent, separately-gated pre-OUTCOME terms, summed into one governorMult:
 *   • TAIL-LIFT cohesion + SHUFFLE — gated by cfg.enabled (the governor master).
 *   • DIRECTOR contest-injector pull — gated by cfg.directorEnabled (its own master, so the
 *     spotlight can be eye-tested ALONE with the tail-lift off). Featured racers get a
 *     mean-reverting pull toward a front anchor (median + offset); non-featured get zero.
 * All three share the SAME phase-weight fade (→ exactly 0 at corrStart), ±maxEffect clamp, and
 * per-frame slew-limit — no new fade math.
 *
 * STRUCTURAL OUTCOME-off: when the phase is not PRE_PULK/PULK/TRANSITION (or BOTH masters are
 * off, or finishT<=0, or no live median), every governorMult is pinned to EXACTLY 1.0 — so
 * "1.0 in OUTCOME for every phase configuration" holds independent of the fade math.
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
 *          frequency:number, maxEffect:number, maxStepPerFrame:number,
 *          directorEnabled:boolean, directorCastSize:number, directorDwell:number,
 *          directorAnchorOffset:number, directorPullStrength:number,
 *          directorSettling:number, directorLeaderBrake:number,
 *          directorChallengerBoost:number}} cfg
 *   directorLeaderBrake / directorChallengerBoost (Action-1): both 0 (default) → legacy one-sided
 *   anchor pull; either > 0 → TWO-SIDED contest (brake instantaneous leader − leaderBrake, boost
 *   featured challengers toward it + up to challengerBoost). Rank-blind (position + seed only).
 * @param {number} [sharedMedianT] field median for this step, precomputed once and shared with
 *   the rubber-band (A5 — avoids a second sort/step). Omit → computed internally.
 */
export function applyGovernor(racers, finishT, phase, phaseCtx, cfg, sharedMedianT) {
  const activePhase = phase === 'PRE_PULK' || phase === 'PULK' || phase === 'TRANSITION';
  const tailLiftOn = !!(cfg && cfg.enabled);
  const directorOn = !!(cfg && cfg.directorEnabled);
  const anyOn = tailLiftOn || directorOn;
  const medianT =
    activePhase && anyOn && finishT > 0
      ? sharedMedianT !== undefined
        ? sharedMedianT
        : computeMedianT(racers)
      : null;

  // Structural OUTCOME/FINAL-off, both masters off, or no median → pin exactly 1.0.
  if (!activePhase || !anyOn || finishT <= 0 || medianT === null) {
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

  // ── DIRECTOR (contest-injector) — featured cast for this step (rank-blind, seed-shuffled) ──
  // Computed ONCE per call (not per racer). Null when the director is off, geometry degenerate,
  // or we are inside the settling window (no new spotlight before the fade). The featured pull
  // is mean-reverting toward a front anchor = median + anchorOffset (racer-lengths), so the cast
  // CLUSTERS in the front band and the re-roll decides the instantaneous P1 → visible lead
  // changes. anchorOffset/pullStrength/cast/dwell/settling are all knobs (defaults.js).
  const anchorOffset = cfg.directorAnchorOffset ?? 2.0;
  const pullStrength = cfg.directorPullStrength ?? 0.06;
  const settling = cfg.directorSettling ?? 0.05;
  const directorCutoff = governorFadeStart(pulkEndFrac, corrStartFrac) - settling;
  const featured =
    directorOn && lenScale > 0
      ? directorFeaturedSet(
          racers,
          seed,
          progress,
          cfg.directorCastSize ?? 3,
          cfg.directorDwell ?? 0.08,
          directorCutoff
        )
      : null;

  // ── TWO-SIDED CONTEST (Action-1) — brake the instantaneous leader + boost the featured
  // challengers TOWARD the leader (not a fixed median anchor). Active when either strength > 0;
  // both 0 (default) → the legacy one-sided anchor pull below runs, byte-identical. The one-sided
  // ±12% pull could not force overtakes against the permanent ±15% spread; braking P1 AND boosting
  // a chaser gives a ~27% relative closing rate. Position-coupled (P1 = current leader by t) +
  // seed-driven rotation (the featured cast) — NEVER targetRank. Brake side may reach −leaderBrake
  // (≤ 0.15, naturalness-safe: only slows); boost side stays capped at +maxEffect (≤ ~0.12).
  const leaderBrake = directorOn ? (cfg.directorLeaderBrake ?? 0) : 0;
  const challengerBoost = directorOn ? (cfg.directorChallengerBoost ?? 0) : 0;
  const twoSided = leaderBrake > 0 || challengerBoost > 0;
  // Ceiling-capped boost (naturalness): when > 0, a boosted racer's RESULTING speed factor
  // (spreadFactor × governorMult) is clamped to this natural ceiling (≈ base-band max ≈ 1.081), so the
  // challenger boost can never push a racer faster than the fastest natural re-roll draw. Caps only the
  // upside; the leader brake is unaffected. Default 0 → off → byte-identical (additive boost as before).
  const directorCeilingCap = directorOn ? (cfg.directorCeilingCap ?? 0) : 0;
  // Instantaneous leader (max cumulative-t among live racers) — the front-tip to brake.
  let leaderT = -Infinity;
  let leaderIndex = -1;
  if (twoSided) {
    for (const r of racers) {
      if (!r.finished && r.t > leaderT) {
        leaderT = r.t;
        leaderIndex = r.index;
      }
    }
  }
  const twoSidedLoBound = 1 - Math.max(maxEffect, leaderBrake);

  for (const r of racers) {
    if (r.finished) {
      r.governorMult = 1.0;
      continue;
    }
    // Signed arc-length gap to the median (sign = ahead/behind by cumulative t; magnitude =
    // visible on-track arc in racer-lengths). Field is sub-lap pre-OUTCOME so sign is exact.
    // Shared by the tail-lift (gap to median) and the director (gap to the front anchor).
    const gapLengths = Math.sign(r.t - medianT) * arcT(r.t, medianT, isOpen) * lenScale;

    // ── TAIL-LIFT + SHUFFLE (governor master: cfg.enabled) ──
    // TAIL-LIFT ONLY: the cohesion force acts solely on racers BEHIND the median (x < 0).
    // A racer that falls more than the bound behind (x < −1) gets a progressive lift back
    // toward the field on the excess; inside the bound it runs free (DEAD ZONE → the whole
    // middle of the field moves on re-roll + shuffle, governorMult stays EXACTLY 1.0). Racers
    // AT or AHEAD of the median (x ≥ 0) get EXACTLY ZERO at every distance — the governor
    // never brakes the leader (the ahead-median brake was retired; front contest is the
    // director layer below). Same racer-length unit, ±maxEffect clamp and slew-limit as before.
    let cohesion = 0;
    let shuffle = 0;
    if (tailLiftOn) {
      const x = boundLengths > 0 ? gapLengths / boundLengths : 0;
      const behindExcess = x < -1 ? -x - 1 : 0; // how far past the bound behind the median (bound-widths)
      cohesion =
        behindExcess > 0 ? governorRestoringForce(behindExcess / rampWidth, k0, maxEffect) : 0;
      // Shuffle: bounded, zero-mean, rank-decoupled per-racer phase.
      shuffle = A * Math.sin(twoPiF * progress + governorShufflePhase(r.index, seed));
    }

    // ── DIRECTOR contest-injector (director master: cfg.directorEnabled) ──
    let director = 0;
    let loBound = 1 - maxEffect;
    if (twoSided) {
      // TWO-SIDED CONTEST: brake the instantaneous leader; boost featured challengers toward it.
      if (r.index === leaderIndex) {
        // Brake the front-tip (down to −leaderBrake). Naturalness-safe: braking only slows.
        director = -leaderBrake;
        loBound = twoSidedLoBound;
      } else if (featured && featured.has(r.index)) {
        // Boost a featured challenger toward the leader — mean-reverting on the gap BEHIND the
        // leader (racer-lengths, ≥ 0), gain = pullStrength, capped at challengerBoost (≤ maxEffect).
        // The median-gap brake keeps the field tight, so the featured cast is near the front → the
        // boost contests P1. Whoever overtakes becomes the new (braked) leader → the lead rotates.
        const gapBehindLeader = arcT(leaderT, r.t, isOpen) * lenScale;
        director = Math.min(challengerBoost, pullStrength * gapBehindLeader);
      }
    } else if (featured && featured.has(r.index)) {
      // LEGACY one-sided anchor pull (both two-sided strengths 0): mean-reverting toward the front
      // anchor = median + anchorOffset. Non-featured racers get exactly zero. Byte-identical to Stage A1.
      const anchorGap = gapLengths - anchorOffset;
      director = clamp(-pullStrength * anchorGap, -maxEffect, maxEffect);
    }

    // Boost side always capped at +maxEffect; brake side may reach −leaderBrake in two-sided mode.
    let target = clamp(1 + w * (cohesion + shuffle + director), loBound, 1 + maxEffect);
    // Ceiling-capped boost: cap the RESULTING speed factor spreadFactor × governorMult at the natural
    // ceiling. min() only lowers, so the leader brake (target < 1) is never raised; for spreadFactor ≤
    // ceiling the cap is ≥ 1.0, so only a boosted challenger nearing the ceiling is limited. Off when 0.
    if (directorCeilingCap > 0 && r.spreadFactor > 0) {
      target = Math.min(target, directorCeilingCap / r.spreadFactor);
    }
    // Rate-limit toward the target so the applied speed eases (never a sudden switch); the
    // per-frame change is hard-bounded by maxStep.
    const prev = r.governorMult ?? 1.0;
    r.governorMult = prev + clamp(target - prev, -maxStep, maxStep);
  }
}
