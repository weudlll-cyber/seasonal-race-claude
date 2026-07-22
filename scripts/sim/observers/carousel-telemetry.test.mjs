// ============================================================
// carousel-telemetry.test.mjs — authored-vs-completed handover tests.
//
// Run: node --test scripts/sim/observers/carousel-telemetry.test.mjs
//
// The completion rule is the whole point of this observer, so it is exercised from both sides: a
// hold that is long enough counts, a touch that is not does not. If a nose-ahead counted, a jittering
// front could manufacture a perfect completion score without a single real lead change.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCarouselTracker } from './carousel-telemetry.mjs';

// Three segments, leaders rotating 0 → 1 → 2, mapped onto racers 10/11/12.
const SEGMENTS = [
  { start: 0.60, climbEnd: 0.64, end: 0.70, leader: 0 },
  { start: 0.70, climbEnd: 0.74, end: 0.80, leader: 1 },
  { start: 0.80, climbEnd: 0.84, end: 0.90, leader: 2 },
];
const ORDER = [10, 11, 12];
const mk = (dwellSec) => makeCarouselTracker({ segments: SEGMENTS, order: ORDER, dwellSec });
// A field where `leadIdx` is in front; the others trail.
const field = (leadIdx) =>
  ORDER.map((index) => ({ index, t: index === leadIdx ? 10 : 1, finished: false }));

test('authoredHandovers excludes the establishing segment', () => {
  const t = mk(1);
  assert.equal(t.result().authoredHandovers, SEGMENTS.length - 1);
});

test('a hold at or beyond the dwell counts as a completed handover', () => {
  const t = mk(1);
  // segment 1 belongs to racer 11: hold it for 2 s
  t.observe(field(11), 0.75, 0);
  t.observe(field(11), 0.76, 1000);
  t.observe(field(11), 0.77, 2000);
  const r = t.result();
  assert.equal(r.completedHandovers, 1);
  assert.ok(r.dwellsSec[1] >= 1);
});

test('a brief touch below the dwell does NOT count', () => {
  const t = mk(1);
  t.observe(field(11), 0.75, 0);
  t.observe(field(11), 0.76, 300); // only 0.3 s in front
  t.observe(field(10), 0.77, 600); // swallowed again
  assert.equal(t.result().completedHandovers, 0);
});

test('only the segment’s AUTHORED leader can complete it', () => {
  const t = mk(1);
  // racer 12 leads through segment 1, but segment 1 was authored to racer 11
  t.observe(field(12), 0.72, 0);
  t.observe(field(12), 0.76, 3000);
  assert.equal(t.result().completedHandovers, 0);
});

test('the hold must be CONTINUOUS — two short stints do not add up', () => {
  const t = mk(1);
  t.observe(field(11), 0.72, 0);
  t.observe(field(11), 0.73, 800); // 0.8 s
  t.observe(field(10), 0.74, 900); // interrupted
  t.observe(field(11), 0.75, 1000);
  t.observe(field(11), 0.76, 1800); // another 0.8 s
  assert.equal(t.result().completedHandovers, 0);
});

test('a full rotation completes every handover', () => {
  const t = mk(1);
  t.observe(field(10), 0.62, 0); // establishing
  t.observe(field(10), 0.66, 1000);
  t.observe(field(11), 0.75, 2000); // segment 1
  t.observe(field(11), 0.78, 4000);
  t.observe(field(12), 0.85, 5000); // segment 2
  t.observe(field(12), 0.88, 7000);
  const r = t.result();
  assert.equal(r.completedHandovers, 2);
  assert.equal(r.completionRate, 1);
});

test('a hold still open at race end is counted', () => {
  const t = mk(1);
  t.observe(field(11), 0.75, 0);
  t.observe(field(11), 0.78, 2500);
  assert.equal(t.result().completedHandovers, 1);
});

test('result() is non-destructive', () => {
  const t = mk(1);
  t.observe(field(11), 0.75, 0);
  t.observe(field(11), 0.78, 2500);
  assert.deepEqual(t.result(), t.result());
});

test('frames outside the schedule are ignored and break a hold', () => {
  const t = mk(1);
  t.observe(field(11), 0.75, 0);
  t.observe(field(11), 0.95, 5000); // past the last segment → not counted, closes the hold
  assert.equal(t.result().completedHandovers, 0);
});

test('finished racers do not count as leading', () => {
  const t = mk(1);
  const done = [
    { index: 11, t: 10, finished: true },
    { index: 10, t: 5, finished: false },
  ];
  t.observe(done, 0.75, 0);
  t.observe(done, 0.78, 3000);
  assert.equal(t.result().completedHandovers, 0);
});

test('an empty schedule is inert, never a divide-by-zero', () => {
  const t = makeCarouselTracker({});
  t.observe(field(10), 0.75, 0);
  const r = t.result();
  assert.equal(r.authoredHandovers, 0);
  assert.equal(r.completedHandovers, 0);
  assert.equal(r.completionRate, null);
});

test('perSegmentCompleted + firstTearAt locate WHERE the rotation tears', () => {
  const t = mk(1);
  t.observe(field(10), 0.62, 0); // establishing
  t.observe(field(10), 0.66, 1500);
  t.observe(field(11), 0.75, 2000); // segment 1: completes (2 s hold)
  t.observe(field(11), 0.78, 4000);
  t.observe(field(10), 0.85, 5000); // segment 2: authored to 12, but 10 leads → tears
  t.observe(field(10), 0.88, 7000);
  const r = t.result();
  assert.deepEqual(r.perSegmentCompleted, [null, true, false]);
  assert.equal(r.firstTearAt, 2);
  assert.equal(r.completedHandovers, 1);
});

test('firstTearAt is null when every authored handover completes', () => {
  const t = mk(1);
  t.observe(field(10), 0.66, 0);
  t.observe(field(11), 0.75, 1000);
  t.observe(field(11), 0.78, 3000);
  t.observe(field(12), 0.85, 4000);
  t.observe(field(12), 0.88, 6000);
  const r = t.result();
  assert.equal(r.firstTearAt, null);
  assert.equal(r.completionRate, 1);
});
