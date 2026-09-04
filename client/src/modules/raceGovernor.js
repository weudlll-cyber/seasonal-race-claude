// ============================================================
// File:        raceGovernor.js
// Path:        client/src/modules/raceGovernor.js
// Project:     RaceArena
// Description: The PULK-phase contest director. A single per-racer speed multiplier r.governorMult,
//              applied inside the live PULK window [pulkStart, pulkEnd), that COMPLETES lead changes:
//                • applyPulkLeadRotation — until-P1 attacker slots (1–2) + a permanent outsider
//                  fresh-blood slot + a distance-based ex-leader brake + a min-hold (no sub-750ms
//                  flicker), with SIGNED lap-aware distance + DRAW-aware reachability.
//              Shared realism envelope: the phase-weight fade (governorPhaseWeight → EXACTLY 0 at
//              corrStart, structural), the ±maxEffect clamp, the per-frame slew-limit, and the
//              naturalness ceiling-cap (computeDirectorCeiling / NATURALNESS_CEILING). Position +
//              seed only — NEVER the target-rank assignment.
//
//              Shared by the browser engine (RaceScreen/index.jsx) and the headless sim
//              (sim-fairness.mjs) so both drive the identical mechanism (single source). Reuses
//              easeInOutCubic. DETERMINISTIC (selection by live rank + signed distance + index; no
//              Math.random) and hero-INCLUSIVE for the leader brake (heroes are never boosted).
// ============================================================

import { easeInOutCubic } from '../utils/mathUtils.js';
import { arcT, lenScaleFrom, signedArcLengths } from './raceLengths.js';

// arcT now lives in raceLengths.js (the one racer-length source). Re-exported here so existing
// importers (GovernorDiagHUD, sim-fairness, tests) keep the same import path, unchanged.
export { arcT };

// Hard naturalness leitplanke: the effective director ceiling may NEVER exceed +20% of the field
// mean, regardless of band width or configured boost-headroom. Enforced in computeDirectorCeiling.
export const NATURALNESS_CEILING = 1.2;

/**
 * Effective director naturalness ceiling (the cfg.ceilingCap value applyPulkLeadRotation clamps to).
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
function governorFadeStart(pulkEndFrac, corrStartFrac) {
  return corrStartFrac - Math.max(corrStartFrac - pulkEndFrac, MIN_FADE_SPAN);
}

export function governorPhaseWeight(progress, pulkEndFrac, corrStartFrac) {
  const fadeStart = governorFadeStart(pulkEndFrac, corrStartFrac);
  if (progress <= fadeStart) return 1.0;
  if (progress >= corrStartFrac) return 0.0;
  return 1 - easeInOutCubic((progress - fadeStart) / (corrStartFrac - fadeStart));
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
 * PulkLeadRotation (SWEEP/opt-in, flag-gated; default OFF → not called → byte-identical). It COMPLETES
 * lead changes instead of herding the front:
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
  // NB: no distance-scaling here — a chosen booster targets the FLAT full challengerBoost (scaling by
  // distance-behind starved the boost exactly as the chaser closed on P1). Smoothing is the slew
  // (maxStepPerFrame) alone.

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

  // Per-racer force (w-scaled; ±maxEffect clamp + per-frame slew realism envelope).
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
