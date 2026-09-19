// @vitest-environment node
// SUITE-ENV-SPLIT: no DOM and no browser global, here or in anything this file imports — see the
// note in vitest.config.js.
// ============================================================
// File:        comebackDetector.pursuer.test.js
// Path:        client/src/modules/camera/comebackDetector.pursuer.test.js
// Project:     RaceArena — PURSUER-RENAME-1
//
// WHAT THIS FILE OWNS: that the camera's cast admits the STAGED comebacker and refuses the unstaged
// `pursuer` — the whole behavioural content of the 2026-09-18 rename.
//
// ★ WHY IT EXISTS. `heroCurveGenerator.js:722` casts the unstaged front-group racer as `pursuer`
// instead of `comebacker` so that `comebackDetector.setPlan` stops putting him in `_cast` and the
// director stops forcing a comeback shot on him. Nothing in `comebackDetector.js` was ADDED to make
// that true — the match at `:110` is an equality test and already admits exactly one string — so
// without this file the rename is protected by nothing at all, and a later hand widening the match
// to `['comebacker', 'pursuer'].includes(h.role)` would put the shot back with every existing test
// still green.
//
// ★ THE THREE CASES SEPARATE THE TWO FAILURES, which is the point of having three rather than one:
//   · widen the match to admit `pursuer`  → cases 2 and 3 go red, case 1 stays green;
//   · break the match so it admits nobody → case 1 goes red, cases 2 and 3 stay green.
// One case alone cannot tell those apart, and a guard that cannot tell them apart does not say which
// thing broke.
// ============================================================
import { describe, it, expect } from 'vitest';
import { ComebackDetector } from './comebackDetector.js';

// The same gate shape comebackDetector.test.js uses; reused rather than re-derived so the two files
// cannot drift into testing different detectors.
const GATES = {
  windowSec: 4,
  minPositionsGained: 2,
  minStartGap: 0.25,
  maxCurrentRankPct: 0.2,
  useBeats: false,
};

/** A detector fed one plan, with no racing — `setRoster` is all these cases need. */
const withHeroes = (heroes, roster) => {
  const d = new ComebackDetector({ ...GATES });
  d.setRoster(new Set(roster), { heroes });
  return d;
};

describe('the camera cast admits a comebacker and refuses a pursuer', () => {
  it('1 — POSITIVE CONTROL: a staged comebacker IS cast', () => {
    // Without this the other two cases would also pass on a detector that had stopped casting
    // anybody, and the file would be reporting success for the wrong reason.
    const d = withHeroes([{ index: 7, role: 'comebacker', finalRank: 3, beats: [] }], [7]);
    expect(d.isCast(7)).toBe(true);
    expect(d._cast).not.toBeNull();
    expect([...d._cast]).toEqual([7]);
  });

  it('2 — a pursuer is NOT cast, and leaves the cast EMPTY rather than small', () => {
    // ★ WHAT AN EMPTY CAST MEANS CHANGED ON 2026-09-19, AND THIS CASE GOT STRONGER FOR IT. It used
    // to hand `best()` the wider `_b1` pool (the old fall-back), so the shot was merely chosen the
    // way it is in a race that cast nobody. Now `best()` REFUSES on an empty cast
    // (`comebackDetector.js:215`), so "leaves the cast empty" is the whole distance between a
    // comeback shot and none at all — which is why this asserts emptiness and not "one racer fewer".
    // `comebackDetector.plannedOnly.test.js` owns the refusal itself.
    const d = withHeroes([{ index: 7, role: 'pursuer', finalRank: 3, beats: [] }], [7]);
    expect(d.isCast(7)).toBe(false);
    expect(d._cast).toBeNull();
  });

  it('3 — with BOTH in one plan, only the comebacker is cast', () => {
    // The discriminating case. A widened match still passes case 1 and would pass a test that only
    // checked "the comebacker is in there"; it cannot pass this one.
    const d = withHeroes(
      [
        { index: 7, role: 'comebacker', finalRank: 3, beats: [] },
        { index: 9, role: 'pursuer', finalRank: 4, beats: [] },
      ],
      [7, 9]
    );
    expect(d.isCast(7)).toBe(true);
    expect(d.isCast(9)).toBe(false);
    expect([...d._cast]).toEqual([7]);
  });

  it('4 — the resolve beat of a pursuer is not retained either', () => {
    // `setPlan` fills `_resolveByIndex` inside the same branch as `_cast`, so a pursuer must leave
    // no beat behind for `best()` to weigh.
    const d = withHeroes(
      [{ index: 9, role: 'pursuer', finalRank: 4, beats: [{ progress: 0.78, event: 'resolve' }] }],
      [9]
    );
    expect(d.resolveFor(9)).toBeNull();
  });
});
