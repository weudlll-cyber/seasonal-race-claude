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
// WHAT IT IS NOT FOR: eligibility, holds, cooldowns, the finish sequence, the start window, the
// endgame or the comeback precedence. Those decide WHETHER a shot is offered, and every one of them
// stays in the director, which is the only caller. This module holds no state and touches no
// `this`: its one source of randomness is the `random` function the caller passes in, which is the
// director's own `_random()` — so the director's seeded stream is drawn in exactly the order it was
// drawn before the extraction, and the camera fingerprint cannot tell the two apart.
//
// WHY IT IS ITS OWN MODULE: DC2-ARC4-SOURCE.md §4.5 P1 named this the seam the code already
// implies — the comeback precedence returns ABOVE the arbitration rather than joining it, which is
// the shape of two concerns sharing one function. Lifting it is the first cut of that split.
// ============================================================

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
