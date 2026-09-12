// @vitest-environment node
// ============================================================
// File:        raceOverrun.test.js
// Path:        client/src/modules/raceOverrun.test.js
// Project:     RaceArena — HISTORY-MISSING-2
//
// WHAT THIS PINS: `raceOverrunMs` — the ONE definition of "this race has run longer than the rest of
// the project believes possible". It existed as a literal inside the headless runner and nowhere
// else, which is exactly why the BROWSER had no notion of an overrun at all.
//
// ★ WHY IT MATTERS, stated so a later reader does not mistake this for a tidy-up. `RaceScreen` ends
// a race at one place only — `finishedCount >= nRacers` — and that is where the results payload, and
// with it the history entry, is written. There is no ceiling there and no DNF ranking. So a race
// whose last racer never arrives never ends, never reaches the result screen, and is never recorded;
// before this it did that silently. The headless runner has both a cap and a DNF ranking; the
// harness refuses at its own 200 s ceiling. The browser had neither.
//
// WHAT IT DELIBERATELY DOES NOT PIN:
//   · That the banner appears. Triggering it needs a race that runs past TEN MINUTES, which no
//     browser test in this suite can afford; the gap is stated in HISTORY-MISSING-2 rather than
//     covered by a test that does not really exercise it.
//   · That a race ENDS on overrun. It does not — nothing about the race changes. Whether the browser
//     should cap and rank DNFs the way the headless runner does is a change to what a race IS and is
//     not made here.
//   · That a FINISHED race is recorded. That is a browser question and `e2e/race-save.spec.js`
//     already answers it end to end, on the production arm.
// ============================================================

import { describe, it, expect } from 'vitest';
import { raceOverrunMs } from './raceCore.js';

describe('HISTORY-MISSING-2 — the one definition of an overrun race', () => {
  it('is three times the realized duration when that is the larger', () => {
    // 400 s of race → 1200 s, because 1200 > the 600 s floor
    expect(raceOverrunMs(400)).toBe(1_200_000);
  });

  it('never falls below ten minutes, however short the race', () => {
    expect(raceOverrunMs(60)).toBe(600_000);
    expect(raceOverrunMs(1)).toBe(600_000);
    expect(raceOverrunMs(0)).toBe(600_000);
  });

  it('treats a missing duration as zero rather than throwing', () => {
    // The screen reads it off race meta; a diagnostic must never be the thing that ends a race.
    expect(raceOverrunMs(undefined)).toBe(600_000);
    expect(raceOverrunMs(null)).toBe(600_000);
  });

  it('★ is well above a normal race and well below what the owner actually sat through', () => {
    // His Ice Track race recorded elapsedSec 1590 — it really ran twenty-six minutes. A 60 s race
    // overruns at 600 s, so that race was past this line by a factor of more than two and nothing
    // said a word.
    expect(raceOverrunMs(60)).toBeLessThan(1590 * 1000);
    expect(raceOverrunMs(60)).toBeGreaterThan(90 * 1000);
  });
});
