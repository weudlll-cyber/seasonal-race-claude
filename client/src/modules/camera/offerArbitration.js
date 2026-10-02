// ============================================================
// File:        offerArbitration.js
// Path:        client/src/modules/camera/offerArbitration.js
// Project:     RaceArena — P1-CAMERADIRECTOR-SPLIT-1
//
// WHAT THIS IS FOR: the camera's OFFER ARBITRATION — given the shots that are currently offered,
// which one is drawn, and is the drawn one taken. It is the "weights choose" half of the rule
// "holds gate, weights choose" (see `acceptsOffer` below), lifted out of CameraDirector.js so the
// arbitration can be read, and tested, without a constructed director.
//
// It also carries OVERVIEW's offer schedule (bottom of the file): OVERVIEW is the one shot a clock
// offers rather than the track, and the clock is re-set only as a consequence of the draw.
//
// WHAT IT IS NOT FOR: detecting battles, lead changes or comebacks, the holds, the finish
// sequence, the start window, the endgame or the comeback precedence. Those decide WHETHER a shot
// is offered, and every one of them stays in the director, which is the only caller. This module holds no state and touches no
// `this`: its one source of randomness is the `random` function the caller passes in, which is the
// director's own `_random()` — so the director's seeded stream is drawn in exactly the order it was
// drawn before the extraction, and the camera fingerprint cannot tell the two apart.
//
// WHY IT IS ITS OWN MODULE: DC2-ARC4-SOURCE.md §4.5 P1 named this the seam the code already
// implies — the comeback precedence returns ABOVE the arbitration rather than joining it, which is
// the shape of two concerns sharing one function. Lifting it is the first cut of that split.
// ============================================================

import { CAM_STATE } from './camState.js';

/**
 * CAMERA-WEIGHTS-1: THE WEIGHT'S MEANING, stated so the owner can predict what a value buys.
 *
 *   A weight is HOW OFTEN YOU TAKE THIS SHOT WHEN IT IS OFFERED.
 *     0    — never. The state does not appear.
 *     0.7  — when this shot is available, take it about 7 times in 10; otherwise stay on the leader.
 *     1+   — always take it when available, and outrank a lower weight when two shots compete.
 *
 * WHY AN ABSOLUTE PROPENSITY AND NOT A RELATIVE SHARE. A relative share ("battle 70% of the
 * cuts") promises something the camera cannot deliver: eligibility is not under its control, so if
 * a battle never becomes eligible no weight can give it 70% of anything. A propensity only ever
 * promises what the gates already allow, which is why it is predictable.
 *
 * WHY THIS WAS NEEDED. Measured before the change: 73.2% of selections had NO eligible candidate
 * and 16.7% had exactly ONE — and a single candidate was returned outright, without its weight
 * ever being read. So the weights decided 10.0% of selections and ELIGIBILITY decided the other
 * 90%. That is why the dial appeared dead: `overviewWeight` 0.3 -> 10, a 33x increase, moved
 * OVERVIEW's share of the race by 1.8 percentage points.
 *
 * HOW IT COMPOSES WITH THE HOLDS, because both are real and neither may silently win. The holds
 * and cooldowns still decide WHETHER a shot is offered — they are what stops the picture flicking
 * between states, and the weight cannot override them. The weight decides whether an OFFERED shot
 * is taken. A declined offer falls through to LEADER, and the next frame may offer again; the
 * state's own minStateHold then governs how long the accepted shot lasts. Holds gate, weights
 * choose — in that order, deliberately.
 *
 * @param {number} weight
 * @param {() => number} random  the caller's random stream, uniform in [0, 1)
 * @returns {boolean}
 */
export function acceptsOffer(weight, random) {
  if (!(weight > 0)) return false; // 0 means never, and it is checked here as well as at the gate
  if (weight >= 1) return true;
  return random() < weight;
}

/**
 * Draw one candidate from the offered pool, proportionally to its weight.
 *
 * @param {Array<{weight:number}>} candidates  in the order the caller pushed them; the order is
 *   part of the draw (the cumulative walk below), so it is never re-sorted here
 * @param {() => number} random  the caller's random stream, uniform in [0, 1)
 * @returns {object|null} the drawn candidate, or null when nothing positive is on offer
 */
export function weightedRandomPick(candidates, random) {
  // Defense in depth (BATTLE-WEIGHT-ZERO-1): a weight of 0 means "never", so the selector must never
  // surface a non-positive-weight candidate even if a caller mis-pushes one. Drop weight <= 0 BEFORE
  // summing; an empty or zero-sum pool returns null (no pick) rather than an arbitrary candidate — the
  // old code returned candidates[0] for a length-1 pool (ignoring its weight) and the first candidate for
  // a zero-sum pool (r = Math.random()*0 = 0 → r -= w → r <= 0 on the first element).
  const pool = candidates.filter((c) => c.weight > 0);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  const total = pool.reduce((sum, c) => sum + c.weight, 0);
  if (!(total > 0)) return null;
  let r = random() * total;
  for (const c of pool) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return pool[pool.length - 1];
}

// ── THE POOL AND THE ARBITRATION ──────────────────────────────────────────────────────────────
//
// What `_pickNextState` does once the finish sequence, the start window and the endgame have all
// declined to own the frame, and once the comeback precedence has declined to force a shot. Those
// four return ABOVE this — that ordering is the seam (DC2-ARC4-SOURCE.md §4.5 P1) — and the
// director decides each shot's eligibility before calling here. What remains is pure: lay the
// offered shots out in the pool's fixed order, draw one, and take or decline it.

/**
 * The offered shots, as the candidate pool, in the pool's fixed order: BATTLE, LEAD_CHANGE,
 * COMEBACK, OVERVIEW. The order is part of the draw (`weightedRandomPick` walks it cumulatively),
 * which is why it is fixed here and not left to the caller.
 *
 * Each argument is null when that shot is NOT offered. Every one of the director's offer tests
 * carries `weight > 0` (BATTLE-WEIGHT-ZERO-1): a 0.00 slider means "never", consistently for every
 * event — and the selector filters weight <= 0 again as defense in depth.
 *
 * @param {object} offers
 * @param {{weight:number, closenessT:number}|null} offers.battle
 * @param {{weight:number, from:string|null, to:string|null}|null} offers.leadChange  the previous and
 *   current leader's names, for the reason text
 * @param {{weight:number, racer:object, minPositionsGained:number}|null} offers.comeback
 * @param {{weight:number}|null} offers.overview
 * @returns {Array<{state:string, weight:number, reason:string, data?:object}>}
 */
export function offerPool({ battle, leadChange, comeback, overview }) {
  const candidates = [];
  if (battle) {
    candidates.push({
      state: CAM_STATE.BATTLE_ZOOM,
      weight: battle.weight,
      reason: `battle: pulk (arc<=${battle.closenessT})`,
    });
  }
  if (leadChange) {
    candidates.push({
      state: CAM_STATE.LEAD_CHANGE,
      weight: leadChange.weight,
      reason: `lead-change: ${leadChange.from ?? '?'} → ${leadChange.to ?? '?'}`,
    });
  }
  if (comeback) {
    const r = comeback.racer;
    candidates.push({
      state: CAM_STATE.COMEBACK_ZOOM,
      weight: comeback.weight,
      reason: `comeback: ${r.name ?? r.index} gained ≥${comeback.minPositionsGained} positions`,
      data: { comebackRacer: r },
    });
  }
  if (overview) {
    candidates.push({
      state: CAM_STATE.OVERVIEW,
      weight: overview.weight,
      reason: 'overview: scheduled',
    });
  }
  return candidates;
}

/**
 * Draw from the pool and decide the offer. Returns the director's decision for the frame, plus
 * `taken` — the candidate that was drawn AND accepted, or null — so the caller can run the
 * consequence of a taken shot (OVERVIEW re-sets its schedule) and strip it from the decision.
 *
 * `pick` and `accept` are the director's own `_weightedRandomPick` and `_acceptsOffer`, passed in
 * rather than called here directly so that they draw the director's seeded stream and remain the
 * methods tests can observe. `accept` is called only when something was drawn — the same order of
 * draws as before the extraction.
 *
 * @param {Array} candidates  from `offerPool`
 * @param {(c:Array) => object|null} pick
 * @param {(weight:number) => boolean} accept
 * @returns {{nextState:string, reason:string, data:object, taken:object|null}}
 */
export function arbitrateOffers(candidates, pick, accept) {
  const drawn = pick(candidates);
  // THE OFFER. Eligibility and the cooldowns have decided that this shot MAY be taken; the weight
  // decides whether it IS. Declining falls through to the leader default below, which is the
  // honest neutral — not a second pick, which would make a low weight boost whatever came next.
  if (drawn && !accept(drawn.weight)) {
    return {
      nextState: CAM_STATE.LEADER_ZOOM,
      reason: `leader: ${drawn.state} offered and declined (weight ${drawn.weight})`,
      data: {},
      taken: null,
    };
  }
  if (drawn) {
    return { nextState: drawn.state, reason: drawn.reason, data: drawn.data ?? {}, taken: drawn };
  }
  return {
    nextState: CAM_STATE.LEADER_ZOOM,
    reason: 'leader: default (no active candidates)',
    data: {},
    taken: null,
  };
}

// ── THE OVERVIEW'S OFFER SCHEDULE ────────────────────────────────────────────────────────────
//
// OVERVIEW is the one shot whose offer is SCHEDULED rather than detected: nothing on the track
// makes it eligible, a clock does. These two functions are that clock — when OVERVIEW may be
// offered, and, when an offered OVERVIEW is taken, when it may be offered next. They sit beside
// the arbitration because the second one runs only as a consequence of the draw. Like the rest of
// this module they hold no state; the director stores the result in `_overviewScheduleNext`.

/**
 * May OVERVIEW be offered this frame?
 *
 * @param {number} ts  the director's frame timestamp, ms
 * @param {object|null} raceState  needs `raceElapsed`
 * @param {{startDelaySec:number, lastExitTs:number, cooldownMs:number, scheduleNext:number|null}} s
 *   the director's overview start delay (SECONDS), its last OVERVIEW exit, its cooldown, and the
 *   race-elapsed instant the schedule last set (null = not yet scheduled)
 * @returns {boolean}
 */
export function overviewEligible(ts, raceState, s) {
  if (!raceState) return false;
  if (raceState.raceElapsed < s.startDelaySec * 1000) return false;
  if (ts - s.lastExitTs < s.cooldownMs) return false;
  if (s.scheduleNext !== null && raceState.raceElapsed < s.scheduleNext) return false;
  return true;
}

/**
 * The race-elapsed instant at which OVERVIEW may next be offered, after one has been taken.
 *
 * Spreads `targetCount` overviews over the race's estimated length (from the leader's progress so
 * far), with a ±20% jitter so they do not land on a metronome. Without an estimate — the leader has
 * barely moved, or there is no finish — the cooldown is the interval.
 *
 * @param {object|null} raceState  reads `finishT`, `raceElapsed`
 * @param {object|null} leader  reads `t`
 * @param {number} targetCount  overviews per race
 * @param {number} cooldownMs  the fallback interval
 * @param {() => number} random  the caller's random stream; drawn exactly once
 * @returns {number}
 */
export function nextOverviewAt(raceState, leader, targetCount, cooldownMs, random) {
  const leaderT = leader?.t ?? 0;
  const finishT = raceState?.finishT ?? 0;
  const elapsed = raceState?.raceElapsed ?? 0;
  const estimate =
    leaderT > 0.001 && finishT > 0 && elapsed > 0 ? (finishT / leaderT) * elapsed : null;
  const interval = estimate != null ? estimate / Math.max(1, targetCount) : cooldownMs;
  const jitter = 0.8 + random() * 0.4;
  return elapsed + interval * jitter;
}
