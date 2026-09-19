// @vitest-environment node
// SUITE-ENV-SPLIT: no DOM and no browser global, here or in anything this file imports — see the
// note in vitest.config.js.
// ============================================================
// File:        comebackDetector.plannedOnly.test.js
// Path:        client/src/modules/camera/comebackDetector.plannedOnly.test.js
// Project:     RaceArena — PLANNED-COMEBACK-ONLY-1
//
// WHAT THIS FILE OWNS: the owner's decision of 2026-09-19 — **a comeback is shown when one was
// PLANNED, not when one happens** — in the two halves it actually has.
//
//   PART ONE. The DRAWN WINNER is `sovereign-lead` (`heroCurveGenerator.js:648`) and must not reach
//     `_cast`. Nothing was added to `comebackDetector.js` to make that true: the match at `:110` is
//     an equality test and already admits exactly one string. So without this file the rename is
//     protected by nothing, and a later hand widening the match to
//     `['comebacker', 'sovereign-lead'].includes(h.role)` would put the shot back with every other
//     test in the tree still green.
//
//   PART TWO. With NO cast comebacker there is NO comeback shot. `best()` used to fall back to the
//     whole B1 pool; it now refuses (`comebackDetector.js:215`). That refusal is one line, and one
//     line is exactly what gets deleted by somebody tidying up an early return they think is dead.
//
// ★ WHY EACH PART HAS A POSITIVE CONTROL AND A DISCRIMINATING CASE. A detector that had stopped
// casting ANYBODY, or a `best()` that had stopped returning anybody, would satisfy every negative
// assertion here while being completely broken. The controls are what separate "the rule holds" from
// "nothing works", and the discriminating cases are what separate the rule from a weaker one that a
// single negative case would also pass.
// ============================================================
import { describe, it, expect } from 'vitest';
import { ComebackDetector } from './comebackDetector.js';

// The same gate shape comebackDetector.test.js and comebackDetector.pursuer.test.js use; reused
// rather than re-derived so the three files cannot drift into testing different detectors.
const GATES = {
  windowSec: 4,
  minPositionsGained: 2,
  minStartGap: 0.25,
  maxCurrentRankPct: 0.2,
  useBeats: false,
};

/** Ten racers, `t` descending by index order given. First in the array is P1. */
const field = (orderByIndex) =>
  orderByIndex.map((index, i) => ({ index, name: `r${index}`, t: 1 - i * 0.01 }));

/** A detector fed one plan, with no racing — the casting cases need nothing more. */
const withHeroes = (heroes, roster) => {
  const d = new ComebackDetector({ ...GATES });
  d.setRoster(new Set(roster), heroes == null ? null : { heroes });
  return d;
};

describe('PART ONE — the drawn winner is `sovereign-lead` and the camera does not cast him', () => {
  it('1 — POSITIVE CONTROL: a staged comebacker IS still cast', () => {
    // Without this, cases 2 and 3 would also pass on a detector that had stopped casting anybody.
    const d = withHeroes([{ index: 7, role: 'comebacker', finalRank: 3, beats: [] }], [7]);
    expect(d.isCast(7)).toBe(true);
    expect([...d._cast]).toEqual([7]);
  });

  it('2 — a `sovereign-lead` is NOT cast, and leaves the cast EMPTY rather than small', () => {
    // `finalRank: 1` is the drawn winner specifically — the racer `heroCurveGenerator.js:648`
    // emitted as `comebacker` until 2026-09-19 and who took 29 of 153 COMEBACK_ZOOM shots over 200
    // races. Empty, not small: PART TWO is what that emptiness then means.
    const d = withHeroes([{ index: 7, role: 'sovereign-lead', finalRank: 1, beats: [] }], [7]);
    expect(d.isCast(7)).toBe(false);
    expect(d._cast).toBeNull();
  });

  it('3 — with BOTH in one plan, only the comebacker is cast', () => {
    // The discriminating case. A widened match still passes case 1 and would pass a test that only
    // checked "the comebacker is in there"; it cannot pass this one.
    const d = withHeroes(
      [
        { index: 7, role: 'comebacker', finalRank: 3, beats: [] },
        { index: 9, role: 'sovereign-lead', finalRank: 1, beats: [] },
      ],
      [7, 9]
    );
    expect(d.isCast(7)).toBe(true);
    expect(d.isCast(9)).toBe(false);
    expect([...d._cast]).toEqual([7]);
  });
});

/**
 * TWO racers with climbs that genuinely satisfy every rank-history gate, driven rather than stubbed.
 * Both are in the B1 roster; which of them is CAST is the only thing that varies between the cases
 * below, which is what makes the comparison an argument about the cast and not about the gates.
 *
 *   racer 7 — P9 of 10 at the window start, P5 now: gain 4 against `minPositionsGained` 2, start gap
 *             0.889 against `minStartGap` 0.25, current rank 0.444 against `maxCurrentRankPct` 0.2.
 *   racer 8 — P10 to P3: ★ gain 7, a BIGGER gain than racer 7's, start gap 1.0, current rank 0.222.
 *
 * ★ RACER 8 WINS THE `bestGain` CONTEST OUTRIGHT whenever he is a candidate, which is what makes
 * case 5 a measurement of the refusal rather than a coincidence: before 2026-09-19 it returned HIM.
 */
function racedWith(plan) {
  const d = new ComebackDetector({ ...GATES });
  d.setRoster(new Set([7, 8]), plan);
  d.recordRanks(field([0, 1, 2, 3, 4, 5, 6, 9, 7, 8]), 1000); // 7 is P9, 8 is P10
  const now = field([0, 1, 8, 9, 7, 2, 3, 4, 5, 6]); // 8 is P3, 7 is P5
  d.recordRanks(now, 2000);
  return { d, racers: now, ts: 2000 };
}

describe('PART TWO — with nothing cast there is no comeback shot', () => {
  it('★ 4 — POSITIVE CONTROL: the same climb, CAST, IS offered', () => {
    // This is the case that proves the fixture reaches `best()`'s gates at all. Without it, case 5
    // would be green on a fixture that never qualified — the failure this repository has already
    // paid for once: a guard that passes because it found nothing to check.
    const { d, racers, ts } = racedWith({
      heroes: [{ index: 7, role: 'comebacker', finalRank: 3, beats: [] }],
    });
    expect(d.best(racers, ts)?.index).toBe(7);
  });

  it('★ 5 — THE SAME CLIMB WITH NO PLAN AT ALL IS NOT OFFERED', () => {
    // Before 2026-09-19 this returned racer 8 — `best()` fell back to the whole B1 pool and the
    // camera claimed a comeback nobody had authored. 14 of 153 shots over 200 races were chosen
    // this way (PLANNED-COMEBACK-ONLY-1 §3).
    const { d, racers, ts } = racedWith(null);
    expect(d.best(racers, ts)).toBeNull();
  });

  it('★ 6 — and a plan that cast NO comebacker is the same as no plan', () => {
    // The race the owner's decision is actually about: the plan arrived, it named heroes, and none
    // of them is a comebacker. An implementation that tested `_cast == null` but not `_cast.size`
    // would pass case 5 and fail here — `setPlan` stores null for an empty set today, so this case
    // is the one that keeps that true.
    const { d, racers, ts } = racedWith({
      heroes: [
        { index: 7, role: 'sovereign-lead', finalRank: 1, beats: [] },
        { index: 8, role: 'pursuer', finalRank: 4, beats: [] },
      ],
    });
    expect(d.best(racers, ts)).toBeNull();
  });

  it('★ 7 — a cast racer does not drag an UNCAST one onto the screen with him', () => {
    // The discriminating case for PART TWO. Racer 8 climbed FURTHER than racer 7 — gain 7 against
    // gain 4 — and wins the `bestGain` contest outright if the pool is ever widened back to a union
    // of cast and B1. The subject must be the racer the story named.
    const { d, racers, ts } = racedWith({
      heroes: [{ index: 7, role: 'comebacker', finalRank: 3, beats: [] }],
    });
    expect(d.best(racers, ts)?.index).toBe(7);
    expect(d.best(racers, ts)?.index).not.toBe(8);
  });
});
