// @vitest-environment node
// SUITE-ENV-SPLIT: no DOM and no browser global, here or in anything this file imports — see the
// note in vitest.config.js. Verified by running it in BOTH environments: same tests, same count.
// ============================================================
// File:        comebackDetector.test.js
// Path:        client/src/modules/camera/comebackDetector.test.js
// Project:     RaceArena — COMEBACK-CONNECT-1
//
// WHAT THIS FILE OWNS: that the race plan's authored beats reach the detector and decide WHEN a
// comeback may be offered — and that with the shipped default they change nothing at all.
//
// ★ WHY IT EXISTS AT ALL. `comebackDetector.js` had no test of its own before this piece; the
// detector was covered only indirectly, through the director. That is exactly the shape in which a
// dropped field goes unnoticed for a month: `setPlan` read `role` and threw `beats` away, and
// nothing anywhere could go red about it.
//
// WHAT BREAKS IF THESE ARE DELETED: the beats path becomes a no-op again and every test still
// passes — which is the sabotage this piece was asked to run, and it is the first case below that
// catches it.
// ============================================================

import { describe, it, expect } from 'vitest';
import { ComebackDetector } from './comebackDetector.js';

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

/**
 * Drive a racer from `startRank` to `endRank` over the window, so the rank-history gates below are
 * genuinely satisfied rather than stubbed. Returns the detector, ready for `best()`.
 */
function detectorWithGain({ useBeats = false, resolveProgress = null, index = 7 } = {}) {
  const d = new ComebackDetector({ ...GATES, useBeats });
  const roster = new Set([index]);
  const plan =
    resolveProgress == null
      ? null
      : {
          heroes: [
            {
              index,
              role: 'comebacker',
              finalRank: 3,
              beats: [
                { progress: 0.3, event: 'anchor' },
                { progress: 0.5, event: 'peak' },
                { progress: resolveProgress, event: 'resolve' },
              ],
            },
          ],
        };
  d.setRoster(roster, plan);

  // Start at P9 of 10 (normalised start gap 0.888 — well past minStartGap 0.25).
  const back = [0, 1, 2, 3, 4, 5, 6, 8, index, 9];
  d.recordRanks(field(back), 1000);
  // Now P5 of 10: gain 4 (>= minPositionsGained 2), current rank normalised 0.444 (>= 0.2).
  const forward = [0, 1, 2, 3, index, 4, 5, 6, 8, 9];
  d.recordRanks(field(forward), 2000);
  return { d, racers: field(forward), ts: 2000, index };
}

describe('the rank-history gates still decide WHETHER (unchanged behaviour)', () => {
  it('offers a racer who gained enough positions', () => {
    const { d, racers, ts, index } = detectorWithGain();
    expect(d.best(racers, ts)?.index).toBe(index);
  });

  it('offers nobody when the gain is too small', () => {
    const d = new ComebackDetector(GATES);
    d.setRoster(new Set([7]));
    d.recordRanks(field([0, 1, 2, 3, 4, 7, 5, 6, 8, 9]), 1000); // P6
    d.recordRanks(field([0, 1, 2, 3, 4, 7, 5, 6, 8, 9]), 2000); // still P6 — gain 0
    expect(d.best(field([0, 1, 2, 3, 4, 7, 5, 6, 8, 9]), 2000)).toBeNull();
  });
});

describe('★ the plan says WHEN, and only when it is switched on', () => {
  // ★ THE SABOTAGE CATCHER. Make `setPlan` drop the beats again, or make `best()` ignore them, and
  // this is the case that goes red: the racer is offered at a progress the plan said was too early.
  it('ON: a named comebacker is NOT offered before the plan’s resolve beat', () => {
    const { d, racers, ts } = detectorWithGain({ useBeats: true, resolveProgress: 0.8 });
    expect(d.best(racers, ts, 0.5)).toBeNull();
  });

  it('ON: the same racer IS offered once the race reaches the resolve beat', () => {
    const { d, racers, ts, index } = detectorWithGain({ useBeats: true, resolveProgress: 0.8 });
    expect(d.best(racers, ts, 0.8)?.index).toBe(index);
    expect(d.best(racers, ts, 0.95)?.index).toBe(index);
  });

  it('★ OFF (the shipped default): the same early moment still offers, so nothing moved', () => {
    const { d, racers, ts, index } = detectorWithGain({ useBeats: false, resolveProgress: 0.8 });
    expect(d.best(racers, ts, 0.5)?.index).toBe(index);
  });

  it('ON but the plan named no beat for this racer: untouched, never invented', () => {
    // The plan names the racer a comebacker and gives no beats at all.
    const d = new ComebackDetector({ ...GATES, useBeats: true });
    d.setRoster(new Set([7]), { heroes: [{ index: 7, role: 'comebacker', finalRank: 3 }] });
    d.recordRanks(field([0, 1, 2, 3, 4, 5, 6, 8, 7, 9]), 1000);
    const racers = field([0, 1, 2, 3, 7, 4, 5, 6, 8, 9]);
    d.recordRanks(racers, 2000);
    expect(d.best(racers, 2000, 0.1)?.index).toBe(7);
  });

  it('ON with no progress supplied: falls back to today’s behaviour rather than refusing all', () => {
    const { d, racers, ts, index } = detectorWithGain({ useBeats: true, resolveProgress: 0.8 });
    expect(d.best(racers, ts, null)?.index).toBe(index);
  });
});

describe('the resolve beat is retained on the path that already carried the role', () => {
  it('resolveFor returns the authored resolve beat, and null for a racer with none', () => {
    const { d, index } = detectorWithGain({ useBeats: true, resolveProgress: 0.62 });
    expect(d.resolveFor(index)).toBe(0.62);
    expect(d.resolveFor(999)).toBeNull();
  });

  it('a plan with no comebacker leaves both the cast and the peaks empty', () => {
    const d = new ComebackDetector(GATES);
    d.setRoster(new Set([1]), {
      heroes: [{ index: 1, role: 'sovereign-lead', beats: [{ progress: 0.5, event: 'peak' }] }],
    });
    expect(d.resolveFor(1)).toBeNull();
  });
});
