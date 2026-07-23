// ============================================================
// release-contest.test.mjs — late-lead-change & post-release band-drift unit tests.
//
// Run: node --test scripts/sim/observers/release-contest.test.mjs
//
// Both metrics steer an owner decision about how early to release the field, so each definition is
// exercised both ways: the case that counts and the near-miss that must not. The band-drift metric
// in particular must NOT absorb "never reached the band" — that confusion is the whole reason it
// exists next to endpoint band-reach.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  zoneIdxOf,
  makeLateContestTracker,
  makeReleaseRankTracker,
  bandExitAfterRelease,
  p1SwapAfter090,
} from './release-contest.mjs';

// ── zoneIdxOf ────────────────────────────────────────────────────────────────
test('zoneIdxOf maps ranks onto bands at the edges', () => {
  assert.equal(zoneIdxOf(1), 0);
  assert.equal(zoneIdxOf(5), 0); // B1 upper edge
  assert.equal(zoneIdxOf(6), 1); // first B2
  assert.equal(zoneIdxOf(15), 1); // B2 upper edge
  assert.equal(zoneIdxOf(16), 2);
  assert.equal(zoneIdxOf(41), 4); // beyond the last edge
});

// ── makeLateContestTracker ───────────────────────────────────────────────────
// Helper: a field as [index, t, finished?] triples.
const field = (...rows) => rows.map(([index, t, finished = false]) => ({ index, t, finished }));

test('lead changes before the window are ignored', () => {
  const t = makeLateContestTracker(0.9);
  t.observe(field([1, 0.9], [2, 0.8]), 0.5);
  t.observe(field([2, 0.9], [1, 0.8]), 0.7);
  t.observe(field([3, 0.95], [1, 0.8]), 0.89);
  assert.equal(t.result().leadChangeCount, 0);
});

test('the first in-window observation seeds the identity and is not a change', () => {
  const t = makeLateContestTracker(0.9);
  t.observe(field([7, 0.9], [2, 0.8]), 0.91);
  assert.equal(t.result().leadChangeCount, 0);
  assert.equal(t.result().leaderIdxAtEnd, 7);
});

test('each real overtake counts once', () => {
  const t = makeLateContestTracker(0.9);
  t.observe(field([1, 0.90], [2, 0.89]), 0.9);
  t.observe(field([1, 0.92], [2, 0.91]), 0.92); // same leader, no change
  t.observe(field([2, 0.94], [1, 0.93]), 0.94); // change 1
  t.observe(field([2, 0.96], [1, 0.95]), 0.96);
  t.observe(field([1, 0.98], [2, 0.97]), 0.98); // change 2 (lead taken back)
  assert.equal(t.result().leadChangeCount, 2);
  assert.equal(t.result().leaderIdxAtEnd, 1);
  // Only TWO racers ever led, even though the lead changed twice — the Set does not double-count
  // racer 1 regaining it.
  assert.equal(t.result().distinctLeaders, 2);
});

test('distinctLeaders obeys the phantom rule: inheriting the front by FINISHING does not count', () => {
  // This is the regression that matters. As each leader finishes, the next racer inherits the front
  // of the LIVE ordering. Counting those would saturate distinctLeaders at field size (a 20-racer
  // field reported 20 before this rule was applied), making the metric meaningless.
  const t = makeLateContestTracker(0.9);
  t.observe(field([1, 0.95], [2, 0.94], [3, 0.93]), 0.95);      // leader 1 seeds
  t.observe(field([1, 1.00, true], [2, 0.97], [3, 0.96]), 0.97); // 1 FINISHED → 2 inherits: phantom
  t.observe(field([1, 1.00, true], [2, 1.00, true], [3, 0.99]), 0.99); // 2 finished → 3 inherits
  assert.equal(t.result().leadChangeCount, 0);
  assert.equal(t.result().distinctLeaders, 1); // only racer 1 ever actually LED
});

test('distinctLeaders counts a genuine third leader', () => {
  const t = makeLateContestTracker(0.9);
  t.observe(field([1, 0.90], [2, 0.89], [3, 0.88]), 0.90); // 1 seeds
  t.observe(field([2, 0.93], [1, 0.92], [3, 0.91]), 0.93); // 2 takes it (real)
  t.observe(field([3, 0.96], [2, 0.95], [1, 0.94]), 0.96); // 3 takes it (real)
  assert.equal(t.result().leadChangeCount, 2);
  assert.equal(t.result().distinctLeaders, 3);
});

test('the leader FINISHING is not a lead change — the regression that made this metric useless', () => {
  // A 40-racer field finishing one by one would otherwise report ~39 "lead changes" per race,
  // swamping the handful of real passes this metric exists to count.
  const t = makeLateContestTracker(0.9);
  t.observe(field([1, 0.95], [2, 0.94], [3, 0.93]), 0.95);
  t.observe(field([1, 1.0, true], [2, 0.97], [3, 0.96]), 0.97); // 1 finished → 2 inherits the front
  t.observe(field([1, 1.0, true], [2, 1.0, true], [3, 0.99]), 0.99); // 2 finishes → 3 inherits
  assert.equal(t.result().leadChangeCount, 0);
});

test('a real pass still counts when other racers have already finished', () => {
  const t = makeLateContestTracker(0.9);
  t.observe(field([1, 1.0, true], [2, 0.95], [3, 0.94]), 0.95); // 2 leads the live field
  t.observe(field([1, 1.0, true], [3, 0.97], [2, 0.96]), 0.97); // 3 passes 2 on track
  assert.equal(t.result().leadChangeCount, 1);
});

test('frames with no live racer are skipped, not counted as a change', () => {
  const t = makeLateContestTracker(0.9);
  t.observe(field([4, 0.95], [5, 0.94]), 0.91);
  t.observe(field([4, 1.0, true], [5, 1.0, true]), 0.99); // whole field finished
  assert.equal(t.result().leadChangeCount, 0);
  assert.equal(t.result().leaderIdxAtEnd, 4);
});

test('a race that never reaches the window reports zero, not null', () => {
  const t = makeLateContestTracker(0.9);
  t.observe(field([1, 0.4]), 0.4);
  assert.equal(t.result().leadChangeCount, 0);
  assert.equal(t.result().leaderIdxAtEnd, null);
});

test('empty / missing racers is safe', () => {
  const t = makeLateContestTracker(0.9);
  t.observe([], 0.95);
  t.observe(undefined, 0.95);
  assert.equal(t.result().leadChangeCount, 0);
});

// ── makeReleaseRankTracker ───────────────────────────────────────────────────
test('release ranks are captured once, at the first frame at/after the release point', () => {
  const t = makeReleaseRankTracker(0.94);
  t.observe([{ index: 1, t: 0.5 }, { index: 2, t: 0.6 }], 0.9); // before → ignored
  assert.equal(t.result(), null);
  t.observe([{ index: 1, t: 0.9 }, { index: 2, t: 0.8 }], 0.94); // captured here
  assert.deepEqual(t.result(), { 1: 1, 2: 2 });
  t.observe([{ index: 1, t: 0.1 }, { index: 2, t: 0.99 }], 0.98); // later frames must not overwrite
  assert.deepEqual(t.result(), { 1: 1, 2: 2 });
});

test('ranks are ordered by t descending, ties broken by index', () => {
  const t = makeReleaseRankTracker(0.9);
  t.observe([{ index: 9, t: 0.5 }, { index: 3, t: 0.5 }, { index: 5, t: 0.7 }], 0.9);
  assert.deepEqual(t.result(), { 5: 1, 3: 2, 9: 3 });
});

test('a race that never reaches the release point yields null', () => {
  const t = makeReleaseRankTracker(0.94);
  t.observe([{ index: 1, t: 0.5 }], 0.93);
  assert.equal(t.result(), null);
});

// ── bandExitAfterRelease ─────────────────────────────────────────────────────
test('a racer inside its band at release that finishes outside counts as an exit', () => {
  const rows = [{ sollBereich: 1, rankAtRelease: 3, finalRank: 9 }]; // B1 at release, B2 at finish
  const r = bandExitAfterRelease(rows);
  assert.equal(r[1].inside, 1);
  assert.equal(r[1].exited, 1);
  assert.equal(r[1].rate, 1);
});

test('a racer inside its band at release that stays inside is not an exit', () => {
  const rows = [{ sollBereich: 1, rankAtRelease: 3, finalRank: 5 }];
  const r = bandExitAfterRelease(rows);
  assert.equal(r[1].inside, 1);
  assert.equal(r[1].exited, 0);
  assert.equal(r[1].rate, 0);
});

test('a racer OUTSIDE its band at release is excluded entirely — "never arrived" is not drift', () => {
  // This is the metric's whole point: endpoint band-reach would count this as a miss; here it must
  // not even enter the denominator, whether it finishes outside...
  const missOut = [{ sollBereich: 1, rankAtRelease: 20, finalRank: 22 }];
  const a = bandExitAfterRelease(missOut);
  assert.equal(a[1].inside, 0);
  assert.equal(a[1].exited, 0);
  assert.equal(a[1].rate, null); // no denominator → null, never 0
  // ...or arrives late and finishes inside (an ENTRY, also not drift).
  const lateIn = [{ sollBereich: 1, rankAtRelease: 20, finalRank: 2 }];
  const b = bandExitAfterRelease(lateIn);
  assert.equal(b[1].inside, 0);
  assert.equal(b[1].rate, null);
});

test('bands are accounted separately and B2 is tracked too', () => {
  const rows = [
    { sollBereich: 1, rankAtRelease: 2, finalRank: 12 }, // B1 exit
    { sollBereich: 1, rankAtRelease: 4, finalRank: 1 }, // B1 stay
    { sollBereich: 2, rankAtRelease: 8, finalRank: 30 }, // B2 exit
    { sollBereich: 2, rankAtRelease: 9, finalRank: 11 }, // B2 stay
    { sollBereich: 3, rankAtRelease: 20, finalRank: 39 }, // untracked band, ignored
  ];
  const r = bandExitAfterRelease(rows);
  assert.equal(r[1].inside, 2);
  assert.equal(r[1].exited, 1);
  assert.equal(r[1].rate, 0.5);
  assert.equal(r[2].inside, 2);
  assert.equal(r[2].exited, 1);
  assert.equal(r[2].rate, 0.5);
  assert.equal(r[3], undefined);
});

test('incomplete rows are skipped rather than counted as non-exits', () => {
  const rows = [
    { sollBereich: 1, rankAtRelease: null, finalRank: 3 }, // race never reached release
    { sollBereich: null, rankAtRelease: 3, finalRank: 3 }, // no assigned band
    { sollBereich: 1, rankAtRelease: 3, finalRank: null }, // never finished
  ];
  const r = bandExitAfterRelease(rows);
  assert.equal(r[1].inside, 0);
  assert.equal(r[1].rate, null);
});

test('empty / missing input is safe', () => {
  assert.equal(bandExitAfterRelease([])[1].rate, null);
  assert.equal(bandExitAfterRelease(undefined)[1].rate, null);
});

// ── p1SwapAfter090 ───────────────────────────────────────────────────────────
test('the 0.90 leader winning is not a swap; losing is', () => {
  assert.equal(p1SwapAfter090({ winnerIsLeaderAt090: true, winnerIdx: 3 }, { leaderIdxAt090: 3 }), false);
  assert.equal(p1SwapAfter090({ winnerIsLeaderAt090: false, winnerIdx: 7 }, { leaderIdxAt090: 3 }), true);
});

test('an unanswerable record yields null, not false', () => {
  assert.equal(p1SwapAfter090({ winnerIsLeaderAt090: false, winnerIdx: null }, { leaderIdxAt090: 3 }), null);
  assert.equal(p1SwapAfter090({ winnerIsLeaderAt090: false, winnerIdx: 2 }, { leaderIdxAt090: null }), null);
});
