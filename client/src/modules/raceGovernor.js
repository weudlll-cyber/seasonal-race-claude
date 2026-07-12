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
//
//              This module now hosts THREE flag-gated, default-OFF PULK-scoped mechanisms that share
//              the same governorMult channel + realism envelope (enable only ONE at a time):
//                • applyGovernor      — the classic reactive director above (the SHIPPED v4-OFF world);
//                • applyPulkFrontContest (M1) — a simple live-P1 brake + front-challenger boost;
//                • applyPulkLeadRotation — the successor core loop: until-P1 attacker slots (1–2) +
//                  a permanent outsider fresh-blood slot + a distance-based ex-leader brake + a
//                  min-hold (no sub-750ms flicker), with SIGNED lap-aware + DRAW-aware reachability.
//              PulkLeadRotation is DETERMINISTIC (selection by live rank + signed distance + index; no
//              Math.random) and hero-INCLUSIVE for the leader brake (heroes are never boosted).
// ============================================================

import { mulberry32 } from './racePlanner.js';
import { easeInOutCubic } from '../utils/mathUtils.js';
import { arcT, lenScaleFrom, signedArcLengths } from './raceLengths.js';

// arcT now lives in raceLengths.js (the one racer-length source). Re-exported here so existing
// importers (GovernorDiagHUD, sim-fairness, tests) keep the same import path, unchanged.
export { arcT };

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
 * (Definition moved to raceLengths.js; imported + re-exported above.)
 */

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
  // PulkRaceDirector mode (cfg.pulkOnly): the SAME group-contest mechanism, but active ONLY in the
  // live PULK phase — the lower bound is raised to pulkStart (PRE_PULK/TRANSITION excluded) so it does
  // not touch the chaos start. Default (pulkOnly falsy) = the classic PRE_PULK|PULK|TRANSITION window,
  // byte-identical. The phase-weight fade still zeroes it by pulkEnd (governorPhaseWeight), so under
  // the reopened PULK it contributes exactly 1.0 outside [pulkStart, pulkEnd).
  const activePhase =
    cfg && cfg.pulkOnly
      ? phase === 'PULK'
      : phase === 'PRE_PULK' || phase === 'PULK' || phase === 'TRANSITION';
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
  const lenScale = lenScaleFrom(pathLengthPx, meanBodyLen);

  // v4: a choreographed hero is steered by the trajectory controller, not the director. Exclude it
  // from the director's field (never a leader / challenger / faller) and pin its governorMult to
  // 1.0, so boost/brake never fight the authored curve. isHeroChoreographed is unset (falsy) when
  // v4 is off, so `live` and every governorMult below stay byte-identical to today.
  for (const r of racers) if (r.isHeroChoreographed && !r.finished) r.governorMult = 1.0;

  // Live rank order (rank 1 = leader). Degenerate field / geometry / missing state -> neutral.
  const live = racers
    .filter((r) => !r.finished && !r.isHeroChoreographed)
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
  // N1 — FORCED LEAD-ROTATION cap (PulkRaceDirector). No single racer may hold live P1 longer than
  // maxLeadHoldMs; once exceeded it is pushed into a fall-back slot (below), handing P1 to the next
  // live challenger. 0 = off (the classic path never sets it → inert, byte-identical).
  const maxLeadHoldMs = cfg.maxLeadHoldMs ?? 0;

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

  // N1 lead-hold timer: track when the CURRENT live P1 took the lead. Resets whenever P1 changes hands
  // (per-racer hold time = currentMs - p1HoldStartMs). Independent of lingerMs so N1 works standalone.
  if (maxLeadHoldMs > 0 && leaderIndex !== dirState.p1Holder) {
    dirState.p1Holder = leaderIndex;
    dirState.p1HoldStartMs = currentMs;
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
        // N1 — FORCED LEAD-ROTATION: if the live P1 has held the lead longer than maxLeadHoldMs, demote
        // IT (bypassing pickFromFront, which excludes the leader) so the lead rotates. Otherwise pick a
        // normal faller from the front group (ranks 2..fallbackFromPool, leader excluded). Same slot,
        // same brake, same release machinery — only the TRIGGER (leader over-hold) is new.
        const leaderOverHeld =
          maxLeadHoldMs > 0 && currentMs - (dirState.p1HoldStartMs ?? currentMs) > maxLeadHoldMs;
        const pick =
          leaderOverHeld && !isBusy(leaderIndex)
            ? leaderIndex
            : pickFromFront(live, seed, dirState.ev, fallbackFromPool, (idx) => isBusy(idx));
        dirState.ev++;
        if (pick >= 0) {
          sl.idx = pick;
          sl.untilMs = currentMs + dirUniform(seed, dirState.ev, boostDurMin, boostDurMax);
          dirState.ev++;
          activeFall.add(pick);
          // Reset the hold timer on a forced demotion so the freshly-demoted racer is not re-picked
          // before a new leader emerges.
          if (pick === leaderIndex) dirState.p1HoldStartMs = currentMs;
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

/**
 * M1 — PULK-window FRONT CONTEST (SWEEP-ONLY, flag-gated; default OFF → byte-identical).
 *
 * A trimmed sibling of applyGovernor: it stages the SAME two-sided force — brake the LIVE P1,
 * boost live front challengers toward it — but scoped HARD to the live PULK window
 * [pulkStartFrac, pulkEndFrac) and runnable UNDER v4 (where the full applyGovernor is gated off).
 * It reuses THIS module's realism envelope (the ±maxEffect clamp, the per-frame maxStep slew, the
 * naturalness ceiling-cap) and helpers (arcT / lenScaleFrom / clamp) — no new force, no new envelope.
 * No slot rotation, no fall-back, no phase-weight fade: the window is a HARD gate and the maxStep
 * slew alone smooths the on/off edges (governorMult eases in at pulkStart, back to 1.0 at pulkEnd).
 * Writes r.governorMult, which the shared t-update (raceStep.js) multiplies in — so the browser and
 * the sim inherit the mechanism identically (single source; no sim-only fork).
 *
 * HEROES: the leader brake applies to the live P1 whoever it is (hero or not) — keeping the front
 * reachable is the point of the mechanism (decision documented in the sweep report). Non-leader
 * heroes are NEVER boosted (they are curve-steered; a boost would fight the authored curve).
 *
 * @param {Array}  racers   live racer objects (.t, .index, .finished, .governorMult, .spreadFactor,
 *                          .isHeroChoreographed)
 * @param {number} finishT
 * @param {object} phaseCtx {progress, pulkStartFrac, pulkEndFrac, pathLengthPx, meanBodyLen, isOpen}
 * @param {object} cfg  {pulkContestEnabled, leaderBrake, challengerBoost, pullStrength, frontPool,
 *                       catchThreshold, maxEffect, maxStepPerFrame, ceilingCap}
 */
export function applyPulkFrontContest(racers, finishT, phaseCtx, cfg) {
  const on = !!(cfg && cfg.pulkContestEnabled);
  const maxStep = cfg?.maxStepPerFrame ?? 0.01;
  const maxEffect = cfg?.maxEffect ?? 0.12;
  const { progress, pulkStartFrac, pulkEndFrac, pathLengthPx, meanBodyLen, isOpen } =
    phaseCtx ?? {};
  // Slew one racer's governorMult toward a target (the shared realism slew-limit).
  const slewTo = (r, target) => {
    const prev = r.governorMult ?? 1.0;
    r.governorMult = prev + clamp(target - prev, -maxStep, maxStep);
  };
  const inWindow =
    on &&
    finishT > 0 &&
    progress != null &&
    progress >= (pulkStartFrac ?? Infinity) &&
    progress < (pulkEndFrac ?? -Infinity);
  if (!inWindow) {
    for (const r of racers) if (!r.finished) slewTo(r, 1.0);
    return;
  }
  const lenScale = lenScaleFrom(pathLengthPx, meanBodyLen);
  if (!(lenScale > 0)) {
    for (const r of racers) if (!r.finished) slewTo(r, 1.0);
    return;
  }
  const leaderBrake = cfg.leaderBrake ?? 0;
  const challengerBoost = cfg.challengerBoost ?? 0;
  const pullStrength = cfg.pullStrength ?? 0.06;
  const frontPool = cfg.frontPool ?? 8;
  const catchThreshold = cfg.catchThreshold ?? 2.0; // racer-lengths
  const ceilingCap = cfg.ceilingCap ?? 0;

  // Live rank order (rank 1 = leader). Heroes INCLUDED so the live P1 (the brake target) is correct.
  const live = racers
    .filter((r) => !r.finished)
    .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));
  const n = live.length;
  if (n === 0) {
    for (const r of racers) if (!r.finished) slewTo(r, 1.0);
    return;
  }
  const leaderT = live[0].t;
  const leaderIndex = live[0].index;
  const rankOf = new Map();
  for (let i = 0; i < n; i++) rankOf.set(live[i].index, i + 1);
  const brakeLoBound = 1 - Math.max(maxEffect, leaderBrake);
  const arcLen = (a, b) => arcT(a, b, isOpen) * lenScale;

  for (const r of racers) {
    if (r.finished) {
      r.governorMult = 1.0;
      continue;
    }
    let director = 0;
    let loBound = 1 - maxEffect;
    const rank = rankOf.get(r.index);
    if (r.index === leaderIndex) {
      director = -leaderBrake; // brake the live P1 (hero or not) — keep the front reachable
      loBound = brakeLoBound;
    } else if (
      !r.isHeroChoreographed &&
      rank !== undefined &&
      rank <= frontPool &&
      arcLen(leaderT, r.t) > catchThreshold
    ) {
      // Catch-up boost toward the leader, mean-reverting on the gap behind it (same form as the
      // director's catch-up term). Non-hero front challengers only.
      director = Math.min(challengerBoost, pullStrength * arcLen(leaderT, r.t));
    }
    let target = clamp(1 + director, loBound, 1 + maxEffect);
    if (ceilingCap > 0 && r.spreadFactor > 0) {
      target = Math.min(target, ceilingCap / r.spreadFactor);
    }
    slewTo(r, target);
  }
}

/**
 * DRAW-AWARE reachability (PulkLeadRotation review Q5): can a racer, at full boost, physically out-pace
 * the braked leader — i.e. can it ever close and take P1? Verified against the per-racer clamp below:
 * the resulting speed FACTOR is `spreadFactor × governorMult`, capped at `ceilingCap` (via
 * `min(target, ceilingCap/spreadFactor)`); at full boost `target = 1 + challengerBoost`, and the P1 is
 * braked by `leaderBrake`. So the candidate can close iff its best achievable factor exceeds the
 * leader's braked factor. `spreadFactor` is the current re-roll draw: a band-min draw far back cannot
 * reach a high-draw leader no matter the boost, so it must not be picked. PROXY: compares speed FACTORS
 * (spreadFactor × mult), not full effective speed (baseSpeed also carries rowEnvMult / start-row bonus)
 * — but in PULK areaBonusPulk=0 and the factor dominates, so this is the honest first-order test. The
 * separate max-REACH distance gate is the caller's; this is only the SPEED test.
 */
export function directorReachable(
  rSpreadFactor,
  leaderSpreadFactor,
  challengerBoost,
  ceilingCap,
  leaderBrake,
  maxEffect = Infinity
) {
  if (!(rSpreadFactor > 0) || !(leaderSpreadFactor > 0)) return false;
  // Use the SAME effective boost the force applies. The per-racer force clamps the boost at maxEffect
  // (`target = clamp(1 + w·boost, …, 1 + maxEffect)`), so the reachability estimate must clamp too
  // (review S2): with a raw challengerBoost > maxEffect, an unclamped rBest would ADMIT racers the
  // force can never push past P1 → the slot sits in a 12 s deadlock. maxEffect defaults to Infinity so
  // callers that pass boost ≤ maxEffect (the shipped/owner case) are byte-identical to before.
  const effBoost = Math.min(challengerBoost, maxEffect);
  const rBest =
    ceilingCap > 0
      ? Math.min(rSpreadFactor * (1 + effBoost), ceilingCap)
      : rSpreadFactor * (1 + effBoost);
  const leaderBraked = leaderSpreadFactor * (1 - leaderBrake);
  return rBest > leaderBraked;
}

/**
 * PulkLeadRotation (SWEEP/opt-in, flag-gated; default OFF → not called → byte-identical). The successor
 * to the PulkRaceDirector core loop — it COMPLETES lead changes instead of herding the front:
 *   • ATTACKER slots (1–2): boost the current live P2 (and P3) UNTIL it becomes live P1 — success is
 *     "took the lead", not "caught up" and not a fixed duration. When it succeeds it leaves the P2 slot,
 *     so the slot boosts the NEW P2 — the queue advances for free (no snapshot/round roster).
 *   • OUTSIDER slot (permanent fresh blood): boost the DEEPEST still-REACHABLE racer OUTSIDE the front
 *     group until it takes the lead; then draw the next deepest. Never draws from the front group.
 *   • SETTLE-BRAKE SET (the owner's rule; replaces the old single ex-leader index): a racer that TAKES
 *     the lead is added to a brake MEMBERSHIP set. It runs UNBRAKED for its `minHoldMs` hold window
 *     (readable lead change), THEN its brake ENGAGES and STAYS on — THROUGH being overtaken and while
 *     it falls — until it is `dropDepthLengths` behind the CURRENT leader (signed, lap-aware), then it
 *     is released. There is NO separate leader-brake branch: the current P1 is just the newest member
 *     (braked after its own hold; 0-behind-itself → never released while leading). MANY members brake
 *     at once, each toward its own target → dethroned leaders fall back FULLY before re-contending. The
 *     hold applies ONLY at onset; a later overtake does not restart it. `dropDepthLengths` is the depth
 *     lever (small = tight top-group rotation; large = the rotation migrates through the field).
 *   • DEADLOCK TIMEOUT (safety net, never the normal path): a boost that cannot complete (traffic — the
 *     lateral rule brakes a blocked racer regardless of its mult) is released after `deadlockTimeoutMs`
 *     and the slot advances; the lateral physics is never weakened.
 * HEROES: the settle brake applies to the live P1 whoever it is (leader detection is HERO-INCLUSIVE, so
 * a hero leader CAN be a brake-set member); heroes are NEVER boosted (skipped in every pool) and
 * otherwise pinned toward 1.0.
 * DETERMINISM: selection is by live rank + signed distance + index (no Math.random); the only clock is
 * the passed `currentMs` (timers). ONE implementation, browser + sim. Every force is `w`-scaled (the
 * phase-weight fade → EXACTLY 0 at corrStart) so the ex-leader brake self-extinguishes at the fade.
 *
 * @param {Array}  racers   live racer objects (.t, .index, .finished, .governorMult, .spreadFactor,
 *                          .isHeroChoreographed)
 * @param {number} finishT
 * @param {object} phaseCtx {progress, pulkStartFrac, pulkEndFrac, corrStartFrac, pathLengthPx,
 *                          meanBodyLen, isOpen, currentMs, dirState}
 * @param {object} cfg  {enabled, attackerSlots, dropDepthLengths, outsiderMaxReachLengths,
 *                       deadlockTimeoutMs, minHoldMs, frontPool, leaderBrake, challengerBoost,
 *                       maxEffect, maxStepPerFrame, ceilingCap}  (no pullStrength — boost is flat)
 */
export function applyPulkLeadRotation(racers, finishT, phaseCtx, cfg) {
  const on = !!(cfg && cfg.enabled);
  const maxStep = cfg?.maxStepPerFrame ?? 0.01;
  const maxEffect = cfg?.maxEffect ?? 0.12;
  const { progress, pulkStartFrac, pulkEndFrac, corrStartFrac, pathLengthPx, meanBodyLen } =
    phaseCtx ?? {};
  const currentMs = phaseCtx?.currentMs ?? 0;
  const dirState = phaseCtx?.dirState;
  const slewTo = (r, target) => {
    const prev = r.governorMult ?? 1.0;
    r.governorMult = prev + clamp(target - prev, -maxStep, maxStep);
  };
  const inWindow =
    on &&
    finishT > 0 &&
    progress != null &&
    progress >= (pulkStartFrac ?? Infinity) &&
    progress < (pulkEndFrac ?? -Infinity);
  const lenScale = lenScaleFrom(pathLengthPx, meanBodyLen);
  if (!inWindow || !dirState || !(lenScale > 0)) {
    for (const r of racers) if (!r.finished) slewTo(r, 1.0);
    return;
  }
  // Phase-weight fade (EXACTLY 0 at corrStart; corrStart == pulkEnd under the reopened PULK). Every
  // force term below is w-scaled, so the ex-leader brake cannot outlive the phase (review Q6).
  const w = governorPhaseWeight(progress, pulkEndFrac, corrStartFrac);

  const attackerSlots = Math.max(1, Math.min(2, Math.round(cfg.attackerSlots ?? 2)));
  const dropDepthLengths = cfg.dropDepthLengths ?? 2;
  const outsiderMaxReach = cfg.outsiderMaxReachLengths ?? 15;
  const deadlockMs = cfg.deadlockTimeoutMs ?? 12000;
  const minHoldMs = cfg.minHoldMs ?? 750;
  const frontPool = Math.max(2, Math.round(cfg.frontPool ?? 8));
  const leaderBrake = cfg.leaderBrake ?? 0;
  const challengerBoost = cfg.challengerBoost ?? 0;
  const ceilingCap = cfg.ceilingCap ?? 0;
  // NB: no pullStrength here — a chosen booster targets the FLAT full challengerBoost (not scaled by
  // distance-behind, which starved the boost exactly as the chaser closed on P1). Smoothing is the
  // slew (maxStepPerFrame) alone. pullStrength lives on only in applyGovernor / applyPulkFrontContest.

  // Live rank order (rank 1 = leader), HERO-INCLUSIVE so the leader brake finds the true P1 even if a
  // hero leads. Heroes are excluded only from the BOOST pools.
  const live = racers
    .filter((r) => !r.finished)
    .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));
  const n = live.length;
  if (n < 2) {
    for (const r of racers) if (!r.finished) slewTo(r, 1.0);
    return;
  }
  const leader = live[0];
  const leaderIdx = leader.index;
  const racerOf = new Map();
  for (let i = 0; i < n; i++) racerOf.set(live[i].index, live[i]);
  const isHero = (r) => !!r.isHeroChoreographed;
  const behindLenOf = (r) =>
    Math.max(0, signedArcLengths(leader.t, r.t, pathLengthPx, meanBodyLen));
  const reachable = (r) =>
    directorReachable(
      r.spreadFactor,
      leader.spreadFactor,
      challengerBoost,
      ceilingCap,
      leaderBrake,
      maxEffect // S2: admission test uses the same maxEffect-clamped boost as the applied force
    );

  // Lazy per-race state (created identically in browser + sim → parity).
  if (!dirState.leadRot)
    dirState.leadRot = {
      p1Holder: -1,
      brakeSet: new Map(), // idx → { engagedAfterMs } — the settle-brake MEMBERSHIP set (many at once)
      attackers: [],
      outsider: { idx: -1, startMs: 0 },
      cooldownUntil: new Map(),
    };
  const st = dirState.leadRot;
  while (st.attackers.length < attackerSlots) st.attackers.push({ idx: -1, startMs: 0 });
  const inCooldown = (idx) => (st.cooldownUntil.get(idx) ?? 0) > currentMs;

  // P1-change detection → ADD the new leader to the brake SET (pending; braked only AFTER its hold).
  // No separate leader-brake branch: the current leader is simply the newest set member.
  if (leaderIdx !== st.p1Holder) {
    st.brakeSet.set(leaderIdx, { engagedAfterMs: currentMs + minHoldMs });
    st.p1Holder = leaderIdx;
  }
  // Brake-SET lifecycle (the owner's settle rule): a member is BRAKED once its hold window has elapsed
  // and STAYS braked — through being overtaken and while it falls back — until it is at least
  // dropDepthLengths behind the CURRENT live leader (signed, lap-aware — NEVER arcT, so a lapped racer
  // can't wrap-read as "already behind" and release early). MANY members brake at once, each toward its
  // OWN target; the current leader is a member (braked after its own hold → 0 behind itself → never
  // released while leading). A member that leaves the field is dropped. The hold applies ONLY at onset.
  const braked = new Set();
  for (const [idx, entry] of st.brakeSet) {
    const m = racerOf.get(idx);
    if (!m) {
      st.brakeSet.delete(idx); // gone from the live field
      continue;
    }
    if (behindLenOf(m) >= dropDepthLengths) {
      st.brakeSet.delete(idx); // reached its drop-depth target → released
      continue;
    }
    // Safety net (S3): a DETHRONED member braked longer than the deadlock timeout without reaching its
    // drop-depth target is force-released (it may re-enter later on a normal lead change). NEVER the
    // normal path — normal release stays distance-based. The CURRENT leader is exempt: it is meant to
    // stay braked while it leads (0 behind itself → never distance-released), that is the mechanism
    // doing its job, not a stall. Reuses the boost-slot deadlockMs (pinned; no new owner-facing knob).
    if (
      idx !== leaderIdx &&
      currentMs >= entry.engagedAfterMs &&
      currentMs - entry.engagedAfterMs > deadlockMs
    ) {
      st.brakeSet.delete(idx);
      continue;
    }
    if (currentMs >= entry.engagedAfterMs) braked.add(idx); // hold elapsed → braked this frame
  }
  // Selection: which racers receive a boost this frame. Runs EVERY frame — the new leader's grace is
  // NOT a global boost-suppression (that starved the chasers); it is ONLY that leader's own brake being
  // deferred by its brakeSet engagedAfterMs (above). Chasers keep closing while the new leader runs free.
  const boosting = new Set();
  // Shared boost-eligibility test (S1: factored to ONE helper so the attacker window and the outsider
  // pick can never drift apart). A candidate must be a non-hero, NOT a settling brake-SET member (the
  // ping-pong lock), NOT cooled by a prior deadlock, and DRAW-REACHABLE — it can physically out-pace
  // the braked leader (using the same maxEffect-clamped boost the force applies, review S2).
  const boostEligible = (r) =>
    !isHero(r) && !st.brakeSet.has(r.index) && !inCooldown(r.index) && reachable(r);

  // ATTACKERS — the front group is the first (frontPool − 1) NON-HERO racers behind the leader; HEROES
  // do NOT consume a window slot (S1: a hero-clogged front no longer starves the attacker slots — the
  // scan reaches the real chasers behind the heroes instead of stopping at raw rank frontPool). The
  // window is still BOUNDED (≤ frontPool − 1 non-heroes, so ≤ 4 heroes can push it only a few ranks
  // deeper), and every admitted attacker is still reachability-gated: we trade "no attacker" for a
  // REAL attacker, never a hopeless one parked in a 12 s deadlock. `frontWindow` doubles as the
  // front-group boundary for the outsider below, so the two selections stay provably DISJOINT (an
  // attacker is always in frontWindow; the outsider always skips frontWindow → never the same racer).
  const frontWindow = new Set();
  const elig = [];
  for (let i = 1; i < n && frontWindow.size < frontPool - 1; i++) {
    const r = live[i];
    if (isHero(r)) continue; // heroes don't consume the window
    frontWindow.add(r.index);
    if (boostEligible(r)) elig.push(r);
  }
  for (let s = 0; s < attackerSlots; s++) {
    const sl = st.attackers[s];
    const target = elig[s] ? elig[s].index : -1;
    if (target !== sl.idx) {
      sl.idx = target;
      sl.startMs = currentMs;
    }
    if (sl.idx >= 0) {
      if (currentMs - sl.startMs > deadlockMs) {
        st.cooldownUntil.set(sl.idx, currentMs + deadlockMs); // stuck (traffic) → cool + advance
        sl.idx = -1;
      } else boosting.add(sl.idx);
    }
  }
  // OUTSIDER — the DEEPEST still-reachable racer OUTSIDE the front group (not in `frontWindow`, so it
  // can never collide with an attacker in the same frame), within the max-reach distance gate. Same
  // boost-eligibility rule as the attackers (the one helper).
  const osl = st.outsider;
  let best = -1;
  let bestBehind = -1;
  for (let i = 1; i < n; i++) {
    const r = live[i];
    if (frontWindow.has(r.index) || !boostEligible(r)) continue;
    const behind = behindLenOf(r);
    if (behind > outsiderMaxReach) continue;
    if (behind > bestBehind) {
      bestBehind = behind;
      best = r.index;
    }
  }
  if (best !== osl.idx) {
    osl.idx = best;
    osl.startMs = currentMs;
  }
  if (osl.idx >= 0) {
    if (currentMs - osl.startMs > deadlockMs) {
      st.cooldownUntil.set(osl.idx, currentMs + deadlockMs);
      osl.idx = -1;
    } else boosting.add(osl.idx);
  }

  // Per-racer force (w-scaled, same realism envelope as applyGovernor).
  const brakeLoBound = 1 - Math.max(maxEffect, leaderBrake);
  for (const r of racers) {
    if (r.finished) {
      r.governorMult = 1.0;
      continue;
    }
    let director = 0;
    let loBound = 1 - maxEffect;
    if (braked.has(r.index)) {
      // Brake-SET member past its hold — the live P1 (hero or not) AND every dethroned leader still
      // falling to its drop-depth target. One branch, many racers; heroes are brakeable here.
      director = -leaderBrake;
      loBound = brakeLoBound;
    } else if (isHero(r)) {
      director = 0; // heroes are never boosted; pinned toward 1.0
    } else if (boosting.has(r.index)) {
      director = challengerBoost; // FLAT full boost (slew ramps it smoothly; not distance-scaled)
    }
    let target = clamp(1 + w * director, loBound, 1 + maxEffect);
    if (ceilingCap > 0 && r.spreadFactor > 0)
      target = Math.min(target, ceilingCap / r.spreadFactor);
    slewTo(r, target);
  }
}
