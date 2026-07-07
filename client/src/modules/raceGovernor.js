// ============================================================
// File:        raceGovernor.js
// Path:        client/src/modules/raceGovernor.js
// Project:     RaceArena
// Description: Pre-OUTCOME contest-injector "director". A single per-racer speed multiplier
//              r.governorMult that stages a rank-BLIND rotating front contest before OUTCOME.
//              Winning shape (shipped): a TWO-SIDED contest — brake the instantaneous leader
//              by leaderBrake and boost the featured challenger(s) toward it (up to
//              challengerBoost), with an optional smart front-pool pick, linger-brake, and a
//              naturalness ceiling-cap. When both two-sided strengths are 0 it falls back to
//              the legacy one-sided anchor pull (mean-reverting toward median + anchorOffset,
//              in TRUE RACER-LENGTHS = arc-px / mean body length, lap-count- + track-independent).
//              All shapes share ONE realism envelope: the phase-weight fade (→ EXACTLY 1.0 by
//              OUTCOME, structural), the ±maxEffect clamp, and the per-frame slew-limit.
//              Position + seed only — NEVER the target-rank assignment.
//
//              Shared by the browser engine (RaceScreen/index.jsx) and the headless sim
//              (sim-fairness.mjs) so both measure the identical mechanism (single source).
//              Owns computeMedianT (the sole shared field-median consumer) and reuses
//              easeInOutCubic. Deterministic + browser/sim parity: all inputs (t, median,
//              progress, seed, index) are deterministic and no Math.random is used.
// ============================================================

import { mulberry32 } from './racePlanner.js';
import { easeInOutCubic } from '../utils/mathUtils.js';

/**
 * Median of non-finished racers' RAW cumulative-t. Lives here because the director is now the
 * sole consumer of the shared per-step field median (the browser + sim precompute it once and
 * hand it to applyGovernor via sharedMedianT).
 *
 * CRITICAL: raw cumulative-t, NOT tPos / ((t % 1) + 1) % 1 — the director measures the
 * race-DISTANCE gap to the field, so a racer a full lap ahead must show a large positive gap.
 *
 * @param {Array<{t:number, finished:boolean}>} racers
 * @returns {number|null} median raw-t, or null if no non-finished racers
 */
export function computeMedianT(racers) {
  const ts = [];
  for (const r of racers) if (!r.finished) ts.push(r.t);
  if (ts.length === 0) return null;
  ts.sort((a, b) => a - b);
  const n = ts.length;
  // Mean of the two central order-statistics for even N, single middle for odd N.
  return n % 2 ? ts[(n - 1) / 2] : (ts[n / 2 - 1] + ts[n / 2]) / 2;
}

// Director (contest-injector) featured-cast stream constant. A dedicated XOR, DISTINCT from
// every other per-race stream (target-rank shuffle uses mulberry32(seed), controller noise
// uses seed + 0x9e3779b9), so the rotating featured cast is rank-BLIND: membership is keyed on
// racer index + (seed ^ this) and can never correlate with the target-rank assignment. No
// Math.random on this path.
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
 * Deterministic per-racer sort key in [0, 1) for the DIRECTOR featured-cast rotation. Keyed on
 * the racer index and (seed ^ DIRECTOR_SEED_XOR) via the shared mulberry32 helper (no new RNG,
 * no Math.random). Rank-BLIND: never derived from the target-rank assignment. Sorting the field
 * by this key yields a STABLE seed-shuffled order (fixed per race) that the round-robin marches
 * the spotlight through — so which racers are
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
 * SMART front-pool boost pick (PULK-action-3). Per dwell slot, choose ONE challenger to boost from
 * the racers currently within the front `frontPool` on-track positions EXCLUDING the leader — so the
 * boost only ever aims at a racer that can actually reach P1 within the window. The pick is by the
 * deterministic director seed stream (salted per slot → rotates unpredictably; NO Math.random), and
 * with `boostOnce` a racer boosted in a prior slot is removed from the eligible pool so the action
 * rotates through the field. Pool exhaustion falls back gracefully (relax once-per-race) and logs.
 * Mutates `dirState` (slot / featuredIdx / boosted set / poolFallback). Returns the featured index or -1.
 *
 * @param {Array}  racers    live racer objects (.t, .index, .finished)
 * @param {number} seed      race plan seed
 * @param {number} progress  leader-progress fraction
 * @param {number} dwell     spotlight dwell (progress fraction)
 * @param {number} cutoff    settling cutoff (progress)
 * @param {number} frontPool front-pool size N (rank by t; leader excluded → up to N-1 eligible)
 * @param {boolean} boostOnce remove already-boosted racers from the pool for the rest of the race
 * @param {object} dirState  per-race mutable state { slot, featuredIdx, boosted:Set, poolFallback }
 * @returns {number} featured racer index, or -1 when nothing is featured
 */
export function smartFeaturedPick(
  racers,
  seed,
  progress,
  dwell,
  cutoff,
  frontPool,
  boostOnce,
  dirState
) {
  if (progress >= cutoff || dwell <= 0 || frontPool <= 0) return -1;
  const slot = Math.floor(progress / dwell);
  if (slot !== dirState.slot) {
    // Close the previous slot: its challenger has had its dwell → mark boosted (once-per-race).
    if (boostOnce && dirState.featuredIdx >= 0) dirState.boosted.add(dirState.featuredIdx);
    dirState.slot = slot;
    const live = racers
      .filter((r) => !r.finished)
      .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index)); // desc by t; leader = live[0]
    const pool = live.slice(1, frontPool); // ranks 2..frontPool (leader excluded)
    let eligible = boostOnce ? pool.filter((r) => !dirState.boosted.has(r.index)) : pool;
    if (eligible.length === 0) {
      // Graceful fallback: pool exhausted by once-per-race → relax it this slot and count it.
      dirState.poolFallback = (dirState.poolFallback || 0) + 1;
      eligible = pool.length ? pool : live.slice(1);
    }
    if (eligible.length === 0) {
      dirState.featuredIdx = -1;
      return -1;
    }
    // Deterministic pick via the director seed stream, salted per slot (NO Math.random).
    const saltedSeed = ((seed >>> 0) ^ ((slot * 0x9e3779b1) >>> 0)) >>> 0;
    let best = eligible[0],
      bestKey = directorStreamKey(best.index, saltedSeed);
    for (let i = 1; i < eligible.length; i++) {
      const k = directorStreamKey(eligible[i].index, saltedSeed);
      if (k < bestKey || (k === bestKey && eligible[i].index < best.index)) {
        best = eligible[i];
        bestKey = k;
      }
    }
    dirState.featuredIdx = best.index;
  }
  return dirState.featuredIdx;
}

/**
 * Apply the pre-OUTCOME contest-injector "director" for one physics step, mutating
 * r.governorMult per active racer. Caller multiplies r.governorMult into the t-advance.
 *
 * The director is a rank-BLIND rotating spotlight gated by cfg.directorEnabled. Its winning
 * shape (used by the shipped config) is the TWO-SIDED contest: brake the instantaneous leader
 * by leaderBrake and boost the featured challenger(s) toward it (up to challengerBoost), with
 * an optional smart front-pool pick + linger-brake + naturalness ceiling-cap. When both
 * two-sided strengths are 0 it falls back to the legacy one-sided anchor pull (mean-reverting
 * toward a front anchor = median + anchorOffset). All shapes share the SAME realism envelope:
 * the phase-weight fade (→ exactly 0 at corrStart), the ±maxEffect clamp, and the per-frame
 * slew-limit. Position + seed only — NEVER targetRank.
 *
 * STRUCTURAL OUTCOME-off: when the phase is not PRE_PULK/PULK/TRANSITION (or the director is
 * off, or finishT<=0, or no live median), every governorMult is pinned to EXACTLY 1.0 — so
 * "1.0 in OUTCOME for every phase configuration" holds independent of the fade math.
 *
 * @param {Array}  racers   live racer objects (.t, .index, .finished, .governorMult)
 * @param {number} finishT
 * @param {string} phase    getPhase() result: 'PRE_PULK'|'PULK'|'TRANSITION'|'OUTCOME'|'FINAL'
 * @param {{progress:number, pulkEndFrac:number, corrStartFrac:number, seed:number,
 *          pathLengthPx:number, meanBodyLen:number, isOpen:boolean, currentMs:number,
 *          dirState:object}} phaseCtx  pathLengthPx = one lap in px; meanBodyLen = mean
 *          drawnBodyLengthPx (racer-length unit); isOpen selects the arc wrap.
 * @param {{maxEffect:number, maxStepPerFrame:number, directorEnabled:boolean,
 *          directorCastSize:number, directorDwell:number, directorAnchorOffset:number,
 *          directorPullStrength:number, directorSettling:number, directorLeaderBrake:number,
 *          directorChallengerBoost:number, directorFrontPool:number,
 *          directorBoostOncePerRace:boolean, directorLingerBrake:number,
 *          directorCeilingCap:number}} cfg
 *   directorLeaderBrake / directorChallengerBoost: both 0 → legacy one-sided anchor pull; either
 *   > 0 → TWO-SIDED contest. Brake side may reach −leaderBrake; boost side capped at +maxEffect.
 * @param {number} [sharedMedianT] field median for this step, precomputed once by the caller
 *   (avoids a second sort/step). Omit → computed internally.
 */
export function applyGovernor(racers, finishT, phase, phaseCtx, cfg, sharedMedianT) {
  const activePhase = phase === 'PRE_PULK' || phase === 'PULK' || phase === 'TRANSITION';
  const directorOn = !!(cfg && cfg.directorEnabled);
  const medianT =
    activePhase && directorOn && finishT > 0
      ? sharedMedianT !== undefined
        ? sharedMedianT
        : computeMedianT(racers)
      : null;

  // Structural OUTCOME/FINAL-off, director off, or no median → pin exactly 1.0.
  if (!activePhase || !directorOn || finishT <= 0 || medianT === null) {
    for (const r of racers) {
      if (!r.finished) r.governorMult = 1.0;
    }
    return;
  }

  const { progress, pulkEndFrac, corrStartFrac, seed, pathLengthPx, meanBodyLen, isOpen } =
    phaseCtx;
  const w = governorPhaseWeight(progress, pulkEndFrac, corrStartFrac);
  const maxEffect = cfg.maxEffect ?? 0.12; // ±realism clamp (the realism envelope)
  const maxStep = cfg.maxStepPerFrame ?? 0.01; // per-frame slew limit
  // gap in TRUE RACER-LENGTHS: arc-distance × one-lap px / mean body length. Lap-count- and
  // track-independent (retires the finishT divisor that under-reported closed multi-lap gaps).
  // Guard a degenerate geometry (no px/body → no director pull). Feeds the front-anchor gap.
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
  const dwell = cfg.directorDwell ?? 0.08;
  // `featured` (legacy Set or smart single index) is resolved AFTER leaderIndex below, since the smart
  // front-pool needs the current leader excluded.

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

  // ── SMART front-pool boost + linger-brake (PULK-action-3) ──
  // Gated on directorFrontPool>0 + a per-race dirState; 0 / no-state → legacy whole-field featured set
  // + instant leader brake (byte-identical). currentMs is the ms clock (sim raceTs / browser physicsTs)
  // driving the linger window and the new-leader hold-grace.
  const frontPool = directorOn ? (cfg.directorFrontPool ?? 0) : 0;
  const boostOnce = directorOn ? !!cfg.directorBoostOncePerRace : false;
  const lingerMs = directorOn ? (cfg.directorLingerBrake ?? 0) * 1000 : 0;
  const currentMs = phaseCtx.currentMs ?? 0;
  const dirState = phaseCtx.dirState;
  const smartMode = frontPool > 0 && !!dirState;
  const featIdx =
    smartMode && lenScale > 0
      ? smartFeaturedPick(
          racers,
          seed,
          progress,
          dwell,
          directorCutoff,
          frontPool,
          boostOnce,
          dirState
        )
      : -1;
  const featuredSet =
    !smartMode && directorOn && lenScale > 0
      ? directorFeaturedSet(
          racers,
          seed,
          progress,
          cfg.directorCastSize ?? 3,
          dwell,
          directorCutoff
        )
      : null;
  const isFeatured = (idx) =>
    smartMode ? idx === featIdx : featuredSet !== null && featuredSet.has(idx);
  // Linger-brake state: on a P1 change X→Y, Y runs FREE (grace) and X keeps −leaderBrake for lingerMs so
  // the pass settles; normal brake resumes on Y only after it has held P1 beyond the linger window.
  if (smartMode && lingerMs > 0 && twoSided && leaderIndex !== dirState.prevLeader) {
    if (dirState.prevLeader >= 0) {
      dirState.lingerTarget = dirState.prevLeader;
      dirState.lingerUntilMs = currentMs + lingerMs;
    }
    dirState.leaderSinceMs = currentMs;
    dirState.prevLeader = leaderIndex;
  }

  for (const r of racers) {
    if (r.finished) {
      r.governorMult = 1.0;
      continue;
    }
    // Signed arc-length gap to the median (sign = ahead/behind by cumulative t; magnitude =
    // visible on-track arc in racer-lengths). Field is sub-lap pre-OUTCOME so sign is exact.
    // Used by the legacy one-sided anchor pull (gap to the front anchor = median + offset).
    const gapLengths = Math.sign(r.t - medianT) * arcT(r.t, medianT, isOpen) * lenScale;

    // ── DIRECTOR contest-injector (director master: cfg.directorEnabled) ──
    let director = 0;
    let loBound = 1 - maxEffect;
    if (twoSided) {
      // TWO-SIDED CONTEST: brake the leader; boost a featured challenger toward it.
      const boostThis = () => {
        // Boost the featured challenger toward the leader — mean-reverting on the gap BEHIND the leader
        // (racer-lengths, ≥ 0), gain = pullStrength, capped at challengerBoost. Ceiling-cap keeps it natural.
        const gapBehindLeader = arcT(leaderT, r.t, isOpen) * lenScale;
        return Math.min(challengerBoost, pullStrength * gapBehindLeader);
      };
      if (smartMode && lingerMs > 0) {
        // LINGER-BRAKE mode: the new leader gets grace (no brake) until it holds P1 beyond the linger
        // window; the just-overtaken old leader keeps −leaderBrake for that window so the pass settles.
        if (r.index === leaderIndex) {
          if (currentMs - dirState.leaderSinceMs >= lingerMs) {
            director = -leaderBrake;
            loBound = twoSidedLoBound;
          }
        } else if (r.index === dirState.lingerTarget && currentMs < dirState.lingerUntilMs) {
          director = -leaderBrake;
          loBound = twoSidedLoBound;
        } else if (isFeatured(r.index)) {
          director = boostThis();
        }
      } else {
        // Instant two-sided brake (linger off): brake the instantaneous leader every frame.
        if (r.index === leaderIndex) {
          director = -leaderBrake;
          loBound = twoSidedLoBound;
        } else if (isFeatured(r.index)) {
          director = boostThis();
        }
      }
    } else if (isFeatured(r.index)) {
      // LEGACY one-sided anchor pull (both two-sided strengths 0): mean-reverting toward the front
      // anchor = median + anchorOffset. Non-featured racers get exactly zero. Byte-identical to Stage A1.
      const anchorGap = gapLengths - anchorOffset;
      director = clamp(-pullStrength * anchorGap, -maxEffect, maxEffect);
    }

    // Boost side always capped at +maxEffect; brake side may reach −leaderBrake in two-sided mode.
    let target = clamp(1 + w * director, loBound, 1 + maxEffect);
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
