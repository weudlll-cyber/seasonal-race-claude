// ============================================================
// File:        labelFormHold.js
// Path:        client/src/screens/RaceScreen/labelFormHold.js
// Project:     RaceArena — LABEL-OCCLUSION-1, narrowed by -2
//
// WHETHER EACH LABEL HAS EARNED ITS NAME — and nothing else. This module used to decide the form
// outright; LABEL-OCCLUSION-2 took half of that away from it, and the half that is left is the half
// that needs a clock.
//
// ── WHAT THIS MODULE GOVERNS, AND WHAT IT NO LONGER DOES ───────────────────────────────────────
//   IT GOVERNS PROMOTION.   A name is EARNED by `holdMs` of continuously clear geometry. That is a
//                           question about time, so it needs memory and a clock, and it lives here.
//   IT DOES NOT GOVERN THE  A name is GIVEN UP the instant it stops being clear. `nameTagLayout`
//   WITHDRAWAL.             refuses to DRAW a name that is not clear in the frame being drawn,
//                           whatever this module says. That is a question about the current frame
//                           only, so it needs neither memory nor a clock and belongs there.
//
// WHY THE SPLIT, and it is the reason LABEL-OCCLUSION-2 exists. A hold that governed BOTH directions
// kept a name over a racer for up to a full window after that racer arrived underneath — measured at
// 592 and 1006 drawn overlaps per race on searound and river-run. That is the exact defect the
// feature was built to remove, so the symmetric form could not be the shipped one. Earn slowly, yield
// instantly.
//
// A CONSEQUENCE WORTH STATING: this module's `wide` set is now an entitlement, not a picture. A label
// can be entitled to its name and be drawn with its number in the same frame. Anything reading it as
// "what is on screen" is reading the wrong set — `computeTagLayout` returns that as `wide`.
//
// ── WHY THIS IS NOT IN nameTagLayout.js ─────────────────────────────────────────────────────────
// That module's contract is "pure: no canvas, no state, no clock", and it is worth more than the
// convenience of putting everything in one file. A hold window is a clock and a memory, both.
//
// ── THE SUBTLE PART, and the feature turns on it ───────────────────────────────────────────────
// The name's box is tested EVERY frame, including while the number is being shown. Judging only what
// is currently DRAWN would trap a label on the number for the rest of the race: the number is narrow,
// so it is almost always clear, and a label that only asks "is what I am showing still fine?" never
// discovers that its name would fit again. `clear` arrives fresh from the layout each frame; all this
// module does is refuse to act on it until it has been true continuously.
//
// ── EVERY LABEL STARTS ON THE NUMBER ────────────────────────────────────────────────────────────
// It is the form the owner's design assumes, and starting on the safe one means the ceremony's
// assignment is still true at the gun. A label that leaves the screen and comes back starts on the
// number again for the same reason — its old tenure describes a frame that is no longer on screen.
// (The measurement counts that as churn rather than as a form switch, which is the same convention
// LABEL-DEGRADE-1 used: a label that vanishes and returns in the other form has not flickered.)
//
// ── `demoteHoldMs` IS STILL HERE, AND IS NOT THE SHIPPED BEHAVIOUR ─────────────────────────────
// It defaults to `holdMs` and it decides how long an entitlement survives a spell of covered
// geometry — NOT how long a name stays on screen, which the layout now settles alone. It is kept
// because the two arms it makes measurable are how LABEL-OCCLUSION-1 priced this decision, and the
// same arms are what LABEL-OCCLUSION-2 measured to prove the withdrawal costs what it costs.
//
// Pure: the clock comes in as `nowMs`, so a test can step time without waiting for it.
// ============================================================

/**
 * How long the opposite condition must hold before a label changes form, in ms.
 *
 * ONE HOME, AND NOT A CONFIG KEY. A Dev Screen slider would be the natural way to settle it, but a
 * key in `storage/defaults.js` sits inside the engine-reach hull and would drag the world fingerprint
 * into a block that cannot move the race.
 *
 * 400 MS WAS THE STARTING NUMBER AND THE MEASUREMENT SETTLED IT AT 2000. The owner named 400 as
 * provisional; at 400 the labels switch form 9.9–11.7 times per label per race, against the
 * 1.24–3.89 that LABEL-DEGRADE-1's rule produced — three times too busy to read. The window buys
 * calm at a price in names, and the curve is not linear (searound / river-run, n=100, one race each):
 *
 *     window    switches per label per race    share of labels showing a name
 *      400 ms          11.71 / 9.89                    28.1 % / 20.7 %
 *     1000 ms           5.77 / 5.37                    24.2 % / 17.0 %
 *     2000 ms           2.84 / 2.20                    20.7 % / 12.5 %
 *     4000 ms           1.03 / 0.63                     9.9 % /  6.9 %
 *
 * 2000 ms is the longest window that is still inside the old band on BOTH tracks while keeping most
 * of the names 400 ms bought — 4000 ms is calmer still and throws away two thirds of them. The full
 * table, including the demote-immediately arm, is in reports/night/LABEL-OCCLUSION-1.md.
 */
export const LABEL_FORM_HOLD_MS = 2000;

/** A fresh hold state. A Map of racer.index -> { wide, since }, owned by the caller across frames. */
export function createLabelFormHold() {
  return new Map();
}

/**
 * Advance the hold by one frame and return the set of labels that should show the NAME.
 *
 * @param {Map} state      from `createLabelFormHold`, mutated in place — one per race, not per frame
 * @param {object} p
 * @param {Set<number>} p.shown   racer indices carrying a label this frame
 * @param {Set<number>} p.clear   racer indices whose NAME box is clear this frame (the criterion)
 * @param {number} p.nowMs        the frame's timestamp
 * @param {number} p.holdMs       how long the opposite condition must hold before a switch
 * @param {number} [p.demoteHoldMs=holdMs]  the same, for losing the entitlement specifically
 * @returns {Set<number>} racer indices ENTITLED to their name — not the ones drawn with it, which is
 *   `computeTagLayout`'s `wide`. A label can be entitled and still be drawn as a number this frame.
 */
export function advanceLabelForms(state, { shown, clear, nowMs, holdMs, demoteHoldMs }) {
  const wide = new Set();
  if (!(state instanceof Map) || !shown) return wide;
  const promoteMs = Number.isFinite(holdMs) && holdMs > 0 ? holdMs : 0;
  const demoteMs = Number.isFinite(demoteHoldMs) && demoteHoldMs >= 0 ? demoteHoldMs : promoteMs;
  const now = Number.isFinite(nowMs) ? nowMs : 0;

  // A label that is no longer on screen forgets its form. Keeping it would mean a racer that left
  // the frame and returned re-appeared mid-name, which is the one moment a viewer is most likely to
  // be looking at it.
  for (const index of state.keys()) if (!shown.has(index)) state.delete(index);

  for (const index of shown) {
    let entry = state.get(index);
    if (!entry) {
      entry = { wide: false, since: null }; // EVERY LABEL STARTS ON THE NUMBER
      state.set(index, entry);
    }
    const want = clear ? clear.has(index) : false;
    if (want === entry.wide) {
      entry.since = null; // the current form is the right one; any pending switch is abandoned
    } else {
      if (entry.since == null) entry.since = now;
      const window = want ? promoteMs : demoteMs;
      if (now - entry.since >= window) {
        entry.wide = want;
        entry.since = null;
      }
    }
    if (entry.wide) wide.add(index);
  }
  return wide;
}
