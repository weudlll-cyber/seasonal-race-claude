// ============================================================
// escape-episodes.test.mjs — leader escape-episode state machine.
//
// Run: node --test scripts/sim/observers/escape-episodes.test.mjs
//
// The tracker is a pure state machine, so every boundary is pinned exactly: the episode opens strictly
// ABOVE G (not at it), closes at or below G, survives to the line as UNRESOLVED, and the structural
// "no dice left" classification is asserted both ways. These are the definitions the late-escaper
// verdict rests on, so a drift here must fail loudly rather than quietly re-label a cause.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEscapeEpisodeTracker, summarizeEpisodes } from './escape-episodes.mjs';

const G = 0.75;
const WIN = 54000; // window end in ms

test('no episode while the gap stays at or below G', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(0.5, 0.1, 1000, 3, 2000, 0);
  t.observe(G, 0.2, 2000, 3, 2000, 0); // exactly G is NOT an escape
  t.finish(0.3, 3000, 0);
  assert.equal(t.result().episodes.length, 0);
});

test('an episode opens above G and closes when the gap returns to G', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.0, 0.30, 10000, 3, 12000, 0); // open
  t.observe(2.5, 0.40, 14000, 3, 12000, 0); // deepen
  t.observe(0.7, 0.50, 18000, 3, 20000, 1); // close (a tilt landed → corrected)
  const eps = t.result().episodes;
  assert.equal(eps.length, 1);
  assert.equal(eps[0].resolved, true);
  assert.equal(eps[0].corrected, true);
  assert.equal(eps[0].downTiltsDuring, 1);
  assert.equal(eps[0].peakGapLen, 2.5);
  assert.equal(eps[0].durationMs, 8000);
  assert.equal(eps[0].startP, 0.3);
  assert.equal(eps[0].endP, 0.5);
});

test('an episode still open at the line is UNRESOLVED — ran free', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.5, 0.80, 48000, 7, Infinity, 0);
  t.observe(4.0, 0.95, 57000, 7, Infinity, 0);
  t.finish(1.0, 60000, 0);
  const e = t.result().episodes[0];
  assert.equal(e.resolved, false);
  assert.equal(e.corrected, false);
  assert.equal(e.peakGapLen, 4.0);
});

test('OUT-OF-ROLLS: no scheduled roll remains inside the window at episode start', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  // next roll is AFTER the window end → structurally uncorrectable
  t.observe(1.2, 0.85, 50000, 7, 56000, 0);
  t.finish(1.0, 60000, 0);
  const e = t.result().episodes[0];
  assert.equal(e.hadCorrectableRollAhead, false);
});

test('a roll inside the window counts as correctable, even late', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.2, 0.80, 45000, 7, 53000, 0); // 53000 <= 54000 → still correctable
  t.finish(1.0, 60000, 0);
  assert.equal(t.result().episodes[0].hadCorrectableRollAhead, true);
});

test('startedAfterWindowEnd flags escapes beginning past the last correctable instant', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.2, 0.93, 55000, 7, Infinity, 0);
  t.finish(1.0, 60000, 0);
  assert.equal(t.result().episodes[0].startedAfterWindowEnd, true);
});

test('a null next-roll time is treated as no roll ahead, not as roll-at-zero', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.2, 0.5, 20000, 7, null, 0);
  t.finish(1.0, 60000, 0);
  assert.equal(t.result().episodes[0].hadCorrectableRollAhead, false);
});

test('separate escapes produce separate episodes', () => {
  const t = makeEscapeEpisodeTracker({ G, windowEndMs: WIN });
  t.observe(1.0, 0.2, 5000, 1, 6000, 0);
  t.observe(0.2, 0.3, 9000, 1, 12000, 1);  // close #1 corrected
  t.observe(1.4, 0.7, 40000, 2, Infinity, 1);
  t.finish(1.0, 60000, 1);                  // close #2 unresolved, uncorrected
  const eps = t.result().episodes;
  assert.equal(eps.length, 2);
  assert.equal(eps[0].corrected, true);
  assert.equal(eps[1].corrected, false);
  assert.equal(eps[1].resolved, false);
});

test('summarizeEpisodes splits corrected / out-of-rolls / other', () => {
  const recs = [{
    episodes: [
      { startP: 0.3, endP: 0.4, durationMs: 1000, peakGapLen: 2, resolved: true, corrected: true, downTiltsDuring: 1, hadCorrectableRollAhead: true, startedAfterWindowEnd: false },
      { startP: 0.9, endP: 1.0, durationMs: 5000, peakGapLen: 5, resolved: false, corrected: false, downTiltsDuring: 0, hadCorrectableRollAhead: false, startedAfterWindowEnd: true },
      { startP: 0.5, endP: 0.6, durationMs: 2000, peakGapLen: 3, resolved: true, corrected: false, downTiltsDuring: 0, hadCorrectableRollAhead: true, startedAfterWindowEnd: false },
    ],
  }];
  const s = summarizeEpisodes(recs);
  assert.equal(s.nEpisodes, 3);
  assert.equal(s.correctedRate, 1 / 3);
  assert.equal(s.outOfRollsRate, 1 / 3);
  assert.equal(s.uncorrectedOtherRate, 1 / 3);
  assert.equal(s.outOfRollsShareOfUncorrected, 0.5);
  assert.equal(s.unresolvedRate, 1 / 3);
  // uncorrected episodes start later than corrected ones in this fixture
  assert.ok(s.uncorrectedStartPMed > s.correctedStartPMed);
});

test('summarizeEpisodes is safe on an empty set', () => {
  const s = summarizeEpisodes([]);
  assert.equal(s.nEpisodes, 0);
  assert.equal(s.correctedRate, null);
  assert.equal(s.durationMsMed, null);
});
