// ============================================================
// File:        raceGovernor.js
// Path:        client/src/modules/raceGovernor.js
// Project:     RaceArena
// Description: Pre-OUTCOME contest-injector "director". A single per-racer speed multiplier
//              r.governorMult that stages a rank-BLIND, EVENT-DRIVEN two-way front contest
//              before OUTCOME:
//                • CATCH-UP — a varying number of challengers (≤ maxParallelBoosts), picked from
//                  the front pool, boosted toward the leader until they reach the front group
//                  (catchThreshold) or a random per-pick duration elapses;
//                • FALL-BACK — challengers actively braked OUT of the front group down past a
//                  configurable position, then released with a protection window;
//                • LEADER-CATCH — brake the instantaneous P1 + linger-brake the just-overtaken
//                  old leader so each pass settles.
//              All terms share ONE realism envelope: the phase-weight fade (→ EXACTLY 1.0 by
//              OUTCOME, structural), the ±maxEffect clamp, the per-frame slew-limit, and the
//              naturalness ceiling-cap. Position + seed only — NEVER the target-rank assignment.
//              The field median is NOT used (catch-up rides the gap to the LEADER; fall-back
//              rides the live rank sort), so computeMedianT was retired with the legacy pull.
//
//              Shared by the browser engine (RaceScreen/index.jsx) and the headless sim
//              (sim-fairness.mjs) so both drive the identical mechanism (single source).
//              Reuses easeInOutCubic. Deterministic + browser/sim parity: all randomness comes
//              from the seeded director stream keyed on a per-race event counter — no Math.random.
// ============================================================

import { mulberry32 } from './racePlanner.js';
import { easeInOutCubic } from '../utils/mathUtils.js';

// Director seed stream constant. A dedicated XOR, DISTINCT from every other per-race stream
// (target-rank shuffle uses mulberry32(seed), controller noise uses seed + 0x9e3779b9), so the
// director's picks are rank-BLIND: keyed on an index/event + (seed ^ this), never on the
// target-rank assignment. No Math.random on this path.
const DIRECTOR_SEED_XOR = 0x6b7f1e35;

// Hard naturalness leitplanke: the effective director ceiling may NEVER exceed +20% of the field
// mean, regardless of band width or configured boost-headroom. Enforced in computeDirectorCeiling.
export const NATURALNESS_CEILING = 1.2;

/**
 * Effective director naturalness ceiling (the value fed to applyGovernor as cfg.directorCeilingCap).
 *
 * Base ceiling = the natural band max (BASE_SPEED_MAX / BASE_SPEED_MEAN). boostHeadroom ADDS
 * fractional headroom ABOVE it (in speed-factor points, e.g. 0.05 = +5 pts), so a boosted
 * challenger may burst past the fastest natural racer — reviving the otherwise cap-eaten catch-up
 * boost. Additive (not multiplicative) so it scales correctly as the band width changes.
 *
 * Hard-clamped to NATURALNESS_CEILING (1.20) so no config/band can breach the ±20% leitplanke:
 * at a wide band the available headroom shrinks automatically (±14% band max ≈ 1.143 → clamp allows
 * ≈ +6 pts; ±8% band max ≈ 1.081 → allows ≈ +12 pts).
 *
 * boostHeadroom 0 → the plain band max (byte-identical to the pre-headroom cap for any band ≤ ±20%).
 *
 * @param {number} baseSpeedMax   BASE_SPEED_CONFIG.max
 * @param {number} baseSpeedMean  (min + max) / 2
 * @param {number} [boostHeadroom=0]  fractional points added above the band max
 * @returns {number} the numeric ceiling (0 is never returned here; caller passes 0 when cap OFF)
 */
export function computeDirectorCeiling(baseSpeedMax, baseSpeedMean, boostHeadroom = 0) {
  if (!(baseSpeedMean > 0)) return 0;
  const bandMax = baseSpeedMax / baseSpeedMean;
  return Math.min(bandMax + Math.max(0, boostHeadroom || 0), NATURALNESS_CEILING);
}

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

// Deterministic uniform in [lo, hi) from the director seed stream (no Math.random). Draws are
// keyed on a per-race event counter (dirState.ev) so browser and sim advance identically.
function dirUniform(seed, ev, lo, hi) {
  return lo + directorStreamKey(ev, seed) * (hi - lo);
}

// Pick the eligible racer with the smallest director-stream key (rank-blind, seed-salted) from the
// front `pool` live positions (leader excluded, i.e. ranks 2..pool). `excluded(idx)` filters out
// racers that must not be picked (already busy / boosted / protected / the wrong direction).
// Returns the racer index, or -1 when nothing is eligible.
function pickFromFront(live, seed, ev, pool, excluded) {
  const n = live.length;
  const salt = ((seed >>> 0) ^ ((ev * 0x9e3779b1) >>> 0)) >>> 0;
  let best = -1;
  let bestKey = Infinity;
  const limit = Math.min(pool, n);
  for (let i = 1; i < limit; i++) {
    const idx = live[i].index;
    if (excluded(idx)) continue;
    const k = directorStreamKey(idx, salt);
    if (k < bestKey) {
      bestKey = k;
      best = idx;
    }
  }
  return best;
}

/**
 * Apply the pre-OUTCOME contest-injector "director" for one physics step, mutating
 * r.governorMult per active racer. Caller multiplies r.governorMult into the t-advance.
 *
 * The director stages a rank-BLIND, EVENT-DRIVEN two-way front contest (gated by
 * cfg.directorEnabled):
 *   - CATCH-UP: up to directorMaxParallelBoosts challengers, picked from the front
 *     directorFrontPool positions, each boosted toward the leader (gain = pullStrength, cap =
 *     challengerBoost). A boost holds until the challenger reaches the front group (within
 *     directorCatchThreshold racer-lengths of the leader) OR its RANDOM per-pick duration
 *     [boostDurationMin, boostDurationMax] elapses - whichever first. Slots idle a random gap
 *     between boosts, so the number in flight VARIES over time. boostOncePerRace retires a
 *     challenger after its turn (graceful fallback on pool exhaustion).
 *   - FALL-BACK: up to directorFallbackMaxCount racers, picked from the front
 *     directorFallbackFromPool positions, actively braked until they drop past
 *     directorFallbackUntilPosition, then released with a directorFallbackProtectMs protection
 *     window (not re-eligible as a catch-up target). Opens gaps others close.
 *   - LEADER-CATCH: brake the instantaneous P1; on a pass, linger-brake the just-overtaken old
 *     leader for directorLingerBrake s so the pass settles (unchanged).
 * A racer is never a catch-up and a fall-back target at once. All terms share ONE realism
 * envelope: the phase-weight fade (to EXACTLY 0 at corrStart), the +/-maxEffect clamp, the
 * per-frame slew-limit, and the naturalness ceiling-cap. Position + seed only - NEVER targetRank.
 *
 * STRUCTURAL OUTCOME-off: when the phase is not PRE_PULK/PULK/TRANSITION (or the director is off,
 * or finishT<=0, or no live field / degenerate geometry), every governorMult is pinned to 1.0.
 *
 * @param {Array}  racers   live racer objects (.t, .index, .finished, .governorMult, .spreadFactor)
 * @param {number} finishT
 * @param {string} phase    getPhase() result: 'PRE_PULK'|'PULK'|'TRANSITION'|'OUTCOME'|'FINAL'
 * @param {object} phaseCtx {progress, pulkEndFrac, corrStartFrac, seed, pathLengthPx, meanBodyLen,
 *          isOpen, currentMs, dirState}. currentMs = ms clock (browser physicsTs / sim raceTs);
 *          dirState = per-race mutable director state (slots + linger + protection + event counter).
 * @param {object} cfg  director knobs (see defaults.js governorDirector*).
 */
export function applyGovernor(racers, finishT, phase, phaseCtx, cfg) {
  const activePhase = phase === 'PRE_PULK' || phase === 'PULK' || phase === 'TRANSITION';
  const directorOn = !!(cfg && cfg.directorEnabled);

  // Structural OUTCOME/FINAL-off or director-off -> pin exactly 1.0.
  if (!activePhase || !directorOn || finishT <= 0) {
    for (const r of racers) if (!r.finished) r.governorMult = 1.0;
    return;
  }

  const { progress, pulkEndFrac, corrStartFrac, seed, pathLengthPx, meanBodyLen, isOpen } =
    phaseCtx;
  const currentMs = phaseCtx.currentMs ?? 0;
  const dirState = phaseCtx.dirState;
  const w = governorPhaseWeight(progress, pulkEndFrac, corrStartFrac);
  const maxEffect = cfg.maxEffect ?? 0.12; // +/-realism clamp (the realism envelope)
  const maxStep = cfg.maxStepPerFrame ?? 0.01; // per-frame slew limit
  // Racer-length unit: arc-distance x one-lap px / mean body length (lap-count- & track-independent).
  const lenScale = meanBodyLen > 0 ? pathLengthPx / meanBodyLen : 0;

  // Live rank order (rank 1 = leader). Degenerate field / geometry / missing state -> neutral.
  const live = racers
    .filter((r) => !r.finished)
    .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));
  const n = live.length;
  if (n === 0 || lenScale <= 0 || !dirState) {
    for (const r of racers) if (!r.finished) r.governorMult = 1.0;
    return;
  }
  const leaderT = live[0].t;
  const leaderIndex = live[0].index;
  const rankOf = new Map();
  const racerOf = new Map();
  for (let i = 0; i < n; i++) {
    rankOf.set(live[i].index, i + 1);
    racerOf.set(live[i].index, live[i]);
  }

  // knobs
  const leaderBrake = cfg.directorLeaderBrake ?? 0; // also the fall-back brake magnitude
  const challengerBoost = cfg.directorChallengerBoost ?? 0;
  const pullStrength = cfg.directorPullStrength ?? 0.06;
  const ceilingCap = cfg.directorCeilingCap ?? 0;
  const frontPool = cfg.directorFrontPool ?? 8;
  const boostOnce = !!cfg.directorBoostOncePerRace;
  const lingerMs = (cfg.directorLingerBrake ?? 0) * 1000;
  const settling = cfg.directorSettling ?? 0.05;
  const maxParallel = Math.max(0, Math.round(cfg.directorMaxParallelBoosts ?? 3));
  const boostDurMin = Math.max(0, cfg.directorBoostDurationMin ?? 1500);
  const boostDurMax = Math.max(boostDurMin, cfg.directorBoostDurationMax ?? 4000);
  const catchThreshold = cfg.directorCatchThreshold ?? 2.0; // racer-lengths
  const fallbackOn = !!cfg.directorFallbackEnabled;
  const fallbackFromPool = cfg.directorFallbackFromPool ?? 5;
  const fallbackMaxCount = Math.max(0, Math.round(cfg.directorFallbackMaxCount ?? 2));
  const fallbackUntilPos = cfg.directorFallbackUntilPosition ?? 12;
  const fallbackProtectMs = cfg.directorFallbackProtectMs ?? 2500;

  // Settling: stop STARTING new catch-up/fall-back events this far (progress) before the fade,
  // so the field is already relaxing by corrStart. In-flight events keep fading via w.
  const noNewPicks = progress >= governorFadeStart(pulkEndFrac, corrStartFrac) - settling;

  // lazy dirState init (parity: both browser + sim build the same shape)
  if (!dirState.boostSlots) dirState.boostSlots = [];
  if (!dirState.fallSlots) dirState.fallSlots = [];
  if (!dirState.boosted) dirState.boosted = new Set();
  if (!dirState.protectedUntil) dirState.protectedUntil = new Map();
  if (dirState.ev === undefined) dirState.ev = 0;
  if (dirState.prevLeader === undefined) dirState.prevLeader = -1;
  while (dirState.boostSlots.length < maxParallel)
    dirState.boostSlots.push({ idx: -1, untilMs: 0, idleUntilMs: 0 });
  while (dirState.fallSlots.length < fallbackMaxCount)
    dirState.fallSlots.push({ idx: -1, untilMs: 0 });

  const arcLen = (a, b) => arcT(a, b, isOpen) * lenScale;

  // leader-catch linger state (unchanged): on a P1 change X->Y, Y runs FREE (grace) and X keeps
  // the brake for lingerMs so the pass settles.
  if (lingerMs > 0 && leaderIndex !== dirState.prevLeader) {
    if (dirState.prevLeader >= 0) {
      dirState.lingerTarget = dirState.prevLeader;
      dirState.lingerUntilMs = currentMs + lingerMs;
    }
    dirState.leaderSinceMs = currentMs;
    dirState.prevLeader = leaderIndex;
  }

  const activeBoost = new Set(); // idx currently boosting (catch-up)
  const activeFall = new Set(); // idx currently braked (fall-back)
  // "busy" = already held by any slot; recomputed cheaply from the slot arrays.
  const isBusy = (idx) => {
    for (const sl of dirState.boostSlots) if (sl.idx === idx) return true;
    for (const sl of dirState.fallSlots) if (sl.idx === idx) return true;
    return false;
  };

  // FALL-BACK slots (processed first so their targets are excluded from catch-up picks)
  if (fallbackOn && fallbackMaxCount > 0) {
    for (const sl of dirState.fallSlots) {
      if (sl.idx >= 0) {
        const rank = rankOf.get(sl.idx);
        const gone = rank === undefined; // racer finished / left the field
        // Release once the racer has dropped PAST the target position (bounded drop = natural stop),
        // or on the safety timeout, or if it left the field.
        if (gone || rank > fallbackUntilPos || currentMs >= sl.untilMs) {
          if (!gone) dirState.protectedUntil.set(sl.idx, currentMs + fallbackProtectMs);
          sl.idx = -1;
        } else {
          activeFall.add(sl.idx);
        }
      }
      if (sl.idx < 0 && !noNewPicks) {
        // Pick a faller from the front group (ranks 2..fallbackFromPool, leader excluded).
        const pick = pickFromFront(live, seed, dirState.ev, fallbackFromPool, (idx) => isBusy(idx));
        dirState.ev++;
        if (pick >= 0) {
          sl.idx = pick;
          sl.untilMs = currentMs + dirUniform(seed, dirState.ev, boostDurMin, boostDurMax);
          dirState.ev++;
          activeFall.add(pick);
        }
      }
    }
  }

  // CATCH-UP slots
  for (const sl of dirState.boostSlots) {
    if (sl.idx >= 0) {
      const r = racerOf.get(sl.idx);
      const gone = r === undefined;
      const caught = !gone && arcLen(leaderT, r.t) <= catchThreshold; // reached the front group
      const expired = currentMs >= sl.untilMs;
      if (gone || caught || expired) {
        if (boostOnce && sl.idx >= 0) dirState.boosted.add(sl.idx);
        sl.idx = -1;
        // Random idle gap before this slot boosts again -> variable simultaneous count.
        sl.idleUntilMs = currentMs + dirUniform(seed, dirState.ev, boostDurMin, boostDurMax);
        dirState.ev++;
      } else {
        activeBoost.add(sl.idx);
      }
    }
    if (sl.idx < 0 && !noNewPicks && currentMs >= sl.idleUntilMs) {
      // Pick a challenger that actually needs to catch up (behind the catch threshold), from the
      // front pool, not busy, not retired (boostOnce), not a protected faller.
      const pick = pickFromFront(live, seed, dirState.ev, frontPool, (idx) => {
        if (isBusy(idx)) return true;
        if (boostOnce && dirState.boosted.has(idx)) return true;
        if ((dirState.protectedUntil.get(idx) ?? 0) > currentMs) return true;
        const r = racerOf.get(idx);
        if (r && arcLen(leaderT, r.t) <= catchThreshold) return true; // already at the front
        return false;
      });
      dirState.ev++;
      if (pick >= 0) {
        sl.idx = pick;
        sl.untilMs = currentMs + dirUniform(seed, dirState.ev, boostDurMin, boostDurMax);
        dirState.ev++;
        activeBoost.add(pick);
      } else {
        dirState.poolFallback = (dirState.poolFallback || 0) + 1; // pool exhausted (graceful)
      }
    }
  }

  // per-racer term
  const brakeLoBound = 1 - Math.max(maxEffect, leaderBrake);
  for (const r of racers) {
    if (r.finished) {
      r.governorMult = 1.0;
      continue;
    }
    let director = 0;
    let loBound = 1 - maxEffect;
    const idx = r.index;
    const isLingerTarget = idx === dirState.lingerTarget && currentMs < dirState.lingerUntilMs;

    if (idx === leaderIndex) {
      // Brake the instantaneous P1 - but a NEW leader gets grace until it has held P1 beyond the
      // linger window (linger on); with linger off the leader is braked every frame.
      if (lingerMs <= 0 || currentMs - dirState.leaderSinceMs >= lingerMs) {
        director = -leaderBrake;
        loBound = brakeLoBound;
      }
    } else if (isLingerTarget) {
      director = -leaderBrake; // just-overtaken old leader keeps the brake so the pass settles
      loBound = brakeLoBound;
    } else if (activeFall.has(idx)) {
      director = -leaderBrake; // fall-back: brake to push out of the front group
      loBound = brakeLoBound;
    } else if (activeBoost.has(idx)) {
      // Catch-up: boost toward the leader, mean-reverting on the gap BEHIND the leader.
      director = Math.min(challengerBoost, pullStrength * arcLen(leaderT, r.t));
    }

    let target = clamp(1 + w * director, loBound, 1 + maxEffect);
    // Naturalness ceiling-cap: bound the RESULTING speed factor spreadFactor x governorMult at the
    // natural band max. min() only lowers, so a brake (target < 1) is never raised.
    if (ceilingCap > 0 && r.spreadFactor > 0) {
      target = Math.min(target, ceilingCap / r.spreadFactor);
    }
    const prev = r.governorMult ?? 1.0;
    r.governorMult = prev + clamp(target - prev, -maxStep, maxStep);
  }
}
