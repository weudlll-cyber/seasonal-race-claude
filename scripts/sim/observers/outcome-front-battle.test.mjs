// ============================================================
// outcome-front-battle.test.mjs — sustained-P1-battle metric unit tests.
//
// Run: node --test scripts/sim/observers/outcome-front-battle.test.mjs
//
// This metric is going to become a design target, so every primitive is exercised BOTH WAYS: the
// case that counts and the near-miss that must not. The classifier is checked at each of its four
// boundaries individually (exactly-at-threshold passes, one step off fails), because a conjunction
// hides which term actually fired.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FRONT_BATTLE_DEFAULTS,
  makeFrontBattleTracker,
  classifyFrontBattle,
} from "./outcome-front-battle.mjs";

// Helper: a field as [index, t, finished?] triples (same shape release-contest.test.mjs uses).
const field = (...rows) =>
  rows.map(([index, t, finished = false]) => ({ index, t, finished }));
// Length gap for tests: t is in "lengths" directly, so the lap-aware path collapses to a subtraction.
const gapLen = (a, b) => a - b;

const W = 0.8; // stand-in for the LIVE choreoResolveB2

// ── window gating ────────────────────────────────────────────────────────────
test("frames before windowStart are ignored entirely", () => {
  const t = makeFrontBattleTracker({ windowStart: W });
  t.observe(field([1, 10], [2, 9.5], [3, 9.4]), 0.5, 0, gapLen);
  t.observe(field([2, 12], [1, 11], [3, 10.9]), 0.79, 1000, gapLen);
  const r = t.result();
  assert.equal(r.windowFrames, 0);
  assert.equal(r.distinctLeaders, 0);
  assert.equal(r.leadChangeCount, 0);
  assert.equal(r.maxLeadHoldShare, null);
  assert.equal(r.frontContestFraction, null);
  assert.equal(r.p1LongestMultiSec, 0);
});

test("a frame exactly at windowStart is inside the window", () => {
  const t = makeFrontBattleTracker({ windowStart: W });
  t.observe(field([1, 10], [2, 9]), W, 0, gapLen);
  assert.equal(t.result().windowFrames, 1);
});

// ── the freeze at the first finish ───────────────────────────────────────────
// The whole reason this rule exists: without it the finish procession inherits rank 1 down the
// field and every race reports ~field-size distinct leaders.
test("the window freezes at the first finish — the procession does not inflate distinctLeaders", () => {
  const t = makeFrontBattleTracker({ windowStart: W });
  t.observe(field([1, 10], [2, 9], [3, 8]), 0.9, 0, gapLen);
  t.observe(field([1, 11], [2, 10], [3, 9]), 0.95, 1000, gapLen); // leader-crossing frame: all live
  t.observe(field([1, 12, true], [2, 11], [3, 10]), 0.98, 2000, gapLen); // racer 1 home -> freeze
  t.observe(field([1, 13, true], [2, 12, true], [3, 11]), 0.99, 5000, gapLen);
  const r = t.result();
  assert.equal(r.windowFrames, 2);
  assert.equal(r.distinctLeaders, 1); // NOT 3
  assert.equal(r.p1LongestMultiSec, 1); // the frames at 2000/5000ms must not stretch it
});

test("a frozen tracker ignores everything afterwards, including a fresh scrap", () => {
  const t = makeFrontBattleTracker({ windowStart: W });
  t.observe(field([1, 10], [2, 9]), 0.9, 0, gapLen);
  t.observe(field([1, 11, true], [2, 10]), 0.95, 1000, gapLen); // freeze
  for (let i = 0; i < 20; i++) {
    t.observe(
      field([2 + (i % 3), 20 + i], [5, 19 + i]),
      0.99,
      2000 + i * 100,
      gapLen,
    );
  }
  const r = t.result();
  assert.equal(r.windowFrames, 1);
  assert.equal(r.distinctLeaders, 1);
  assert.equal(r.leadChangeCount, 0);
});

// ── distinctLeaders ──────────────────────────────────────────────────────────
test("distinctLeaders counts every racer that held rank 1, once each", () => {
  const t = makeFrontBattleTracker({ windowStart: W });
  t.observe(field([1, 10], [2, 9]), 0.81, 0, gapLen);
  t.observe(field([2, 12], [1, 11]), 0.85, 100, gapLen);
  t.observe(field([1, 14], [2, 13]), 0.9, 200, gapLen); // back to 1 — still 2 distinct
  t.observe(field([3, 17], [1, 16]), 0.95, 300, gapLen);
  assert.equal(t.result().distinctLeaders, 3);
});

test("one leader throughout gives distinctLeaders 1 and maxLeadHoldShare 1", () => {
  const t = makeFrontBattleTracker({ windowStart: W });
  for (let i = 0; i < 5; i++)
    t.observe(field([1, 10 + i], [2, 9 + i]), 0.85, i * 100, gapLen);
  const r = t.result();
  assert.equal(r.distinctLeaders, 1);
  assert.equal(r.maxLeadHoldShare, 1);
});

// ── leadChangeCount (delegated to makeLateContestTracker) ────────────────────
test("leadChangeCount counts real overtakes, and a finish is never one of them", () => {
  const t = makeFrontBattleTracker({ windowStart: W });
  t.observe(field([1, 10], [2, 9]), 0.81, 0, gapLen);
  t.observe(field([2, 12], [1, 11]), 0.85, 100, gapLen); // real overtake -> 1
  t.observe(field([1, 14], [2, 13]), 0.9, 200, gapLen); // taken back    -> 2
  t.observe(field([1, 16, true], [2, 15]), 0.98, 300, gapLen); // leader 1 home -> frozen, no change
  const r = t.result();
  assert.equal(r.leadChangeCount, 2);
  assert.equal(r.distinctLeaders, 2);
});

// ── maxLeadHoldShare ─────────────────────────────────────────────────────────
test("maxLeadHoldShare is the largest single share, not the last leader share", () => {
  const t = makeFrontBattleTracker({ windowStart: W });
  // 3 frames for racer 1, 1 frame for racer 2 -> 0.75
  t.observe(field([1, 10], [2, 9]), 0.81, 0, gapLen);
  t.observe(field([1, 11], [2, 10]), 0.85, 100, gapLen);
  t.observe(field([1, 12], [2, 11]), 0.9, 200, gapLen);
  t.observe(field([2, 14], [1, 13]), 0.95, 300, gapLen);
  assert.equal(t.result().maxLeadHoldShare, 0.75);
});

// ── frontContestFraction + the group-size convention ─────────────────────────
test("the front group INCLUDES P1: two racers within nearLen is a group of 2, not 3", () => {
  const t = makeFrontBattleTracker({ windowStart: W, nearLen: 3, minGroup: 3 });
  t.observe(field([1, 10], [2, 8]), 0.9, 0, gapLen); // group 2 -> not contested
  t.observe(field([1, 10], [2, 8], [3, 7.5]), 0.9, 100, gapLen); // group 3 -> contested
  assert.equal(t.result().frontContestFraction, 0.5);
});

test("a racer exactly at nearLen is inside the group; one step beyond is not", () => {
  const t = makeFrontBattleTracker({ windowStart: W, nearLen: 3, minGroup: 3 });
  t.observe(field([1, 10], [2, 8], [3, 7]), 0.9, 0, gapLen); // gaps 2.0 / 3.0 -> group 3
  t.observe(field([1, 10], [2, 8], [3, 6.99]), 0.9, 100, gapLen); // gaps 2.0 / 3.01 -> group 2
  assert.equal(t.result().frontContestFraction, 0.5);
});

test("a racer well clear of the pack leaves a group of 2 behind it", () => {
  const t = makeFrontBattleTracker({ windowStart: W, nearLen: 3, minGroup: 3 });
  // P1 escaped; P2/P3/P4 are tight, but the group is measured from P1, not from the pack.
  t.observe(field([1, 20], [2, 9], [3, 8.5], [4, 8]), 0.9, 0, gapLen);
  assert.equal(t.result().frontContestFraction, 0);
});

// ── p1LongestMultiSec ────────────────────────────────────────────────────────
test("p1LongestMultiSec is the longest CONTINUOUS stretch, not the total", () => {
  const t = makeFrontBattleTracker({ windowStart: W, nearLen: 3, minGroup: 3 });
  const tight = (ms) =>
    t.observe(field([1, 10], [2, 9], [3, 8]), 0.9, ms, gapLen);
  const loose = (ms) =>
    t.observe(field([1, 10], [2, 9], [3, 1]), 0.9, ms, gapLen);
  tight(0);
  tight(1000);
  tight(2000); // run A: 2s
  loose(3000); // break
  tight(4000);
  tight(5000); // run B: 1s  (total contested time 3s — must NOT be reported)
  assert.equal(t.result().p1LongestMultiSec, 2);
});

test("a run still open at race end is counted", () => {
  const t = makeFrontBattleTracker({ windowStart: W, nearLen: 3, minGroup: 3 });
  const tight = (ms) =>
    t.observe(field([1, 10], [2, 9], [3, 8]), 0.9, ms, gapLen);
  tight(0);
  tight(1500);
  tight(4000);
  assert.equal(t.result().p1LongestMultiSec, 4);
});

test("a single isolated contested frame is a 0s stretch", () => {
  const t = makeFrontBattleTracker({ windowStart: W, nearLen: 3, minGroup: 3 });
  t.observe(field([1, 10], [2, 9], [3, 8]), 0.9, 1000, gapLen);
  t.observe(field([1, 10], [2, 9], [3, 1]), 0.95, 2000, gapLen);
  const r = t.result();
  assert.equal(r.p1LongestMultiSec, 0);
  assert.equal(r.frontContestFraction, 0.5);
});

test("result() is non-destructive — calling it twice gives the same numbers", () => {
  const t = makeFrontBattleTracker({ windowStart: W, nearLen: 3, minGroup: 3 });
  t.observe(field([1, 10], [2, 9], [3, 8]), 0.9, 0, gapLen);
  t.observe(field([1, 10], [2, 9], [3, 8]), 0.95, 2000, gapLen);
  assert.deepEqual(t.result(), t.result());
  assert.equal(t.result().p1LongestMultiSec, 2);
});

// ── classifier ───────────────────────────────────────────────────────────────
// A metrics object that sits EXACTLY on all four thresholds — the pass case every near-miss below
// is derived from by moving one term a single step in the failing direction.
const AT_THRESHOLD = {
  windowFrames: 100,
  distinctLeaders: 3,
  leadChangeCount: 3,
  maxLeadHoldShare: 0.7,
  frontContestFraction: 0.5,
  p1LongestMultiSec: 4,
};

test("a race exactly on all four thresholds counts as REAL P1 ACTION", () => {
  assert.equal(classifyFrontBattle(AT_THRESHOLD), true);
});

test("each threshold fails on its own, one step off", () => {
  assert.equal(
    classifyFrontBattle({ ...AT_THRESHOLD, distinctLeaders: 2 }),
    false,
  );
  assert.equal(
    classifyFrontBattle({ ...AT_THRESHOLD, leadChangeCount: 2 }),
    false,
  );
  assert.equal(
    classifyFrontBattle({ ...AT_THRESHOLD, maxLeadHoldShare: 0.71 }),
    false,
  );
  assert.equal(
    classifyFrontBattle({ ...AT_THRESHOLD, frontContestFraction: 0.49 }),
    false,
  );
});

test("comfortably past every threshold still counts", () => {
  assert.equal(
    classifyFrontBattle({
      ...AT_THRESHOLD,
      distinctLeaders: 6,
      leadChangeCount: 11,
      maxLeadHoldShare: 0.31,
      frontContestFraction: 0.92,
    }),
    true,
  );
});

test("p1LongestMultiSec is NOT a criterion", () => {
  assert.equal(
    classifyFrontBattle({ ...AT_THRESHOLD, p1LongestMultiSec: 0 }),
    true,
  );
});

test("no window frames classifies as null, never as false", () => {
  assert.equal(classifyFrontBattle({ ...AT_THRESHOLD, windowFrames: 0 }), null);
  assert.equal(classifyFrontBattle(null), null);
  assert.equal(
    classifyFrontBattle({ ...AT_THRESHOLD, maxLeadHoldShare: null }),
    null,
  );
});

test("thresholds are overridable and the defaults are the documented ones", () => {
  assert.deepEqual(FRONT_BATTLE_DEFAULTS, {
    nearLen: 3.0,
    minGroup: 3,
    minDistinctLeaders: 3,
    minLeadChanges: 3,
    maxLeadHoldShare: 0.7,
    minFrontContestFraction: 0.5,
  });
  assert.equal(
    classifyFrontBattle(
      { ...AT_THRESHOLD, distinctLeaders: 2 },
      { minDistinctLeaders: 2 },
    ),
    true,
  );
});

// ── end-to-end: tracker -> classifier ────────────────────────────────────────
test("a lonely march classifies false, a genuine scrap classifies true", () => {
  const march = makeFrontBattleTracker({
    windowStart: W,
    nearLen: 3,
    minGroup: 3,
  });
  for (let i = 0; i < 10; i++)
    march.observe(
      field([1, 100 + i], [2, 50 + i], [3, 40 + i]),
      0.9,
      i * 500,
      gapLen,
    );
  assert.equal(classifyFrontBattle(march.result()), false);

  const scrap = makeFrontBattleTracker({
    windowStart: W,
    nearLen: 3,
    minGroup: 3,
  });
  const order = [1, 2, 3, 1, 4, 2, 4, 1, 3, 4]; // 4 distinct leaders, plenty of changes
  order.forEach((lead, i) => {
    const others = [1, 2, 3, 4].filter((x) => x !== lead);
    scrap.observe(
      field([lead, 100 + i], ...others.map((x, k) => [x, 99.5 + i - k * 0.5])),
      0.9,
      i * 500,
      gapLen,
    );
  });
  const r = scrap.result();
  assert.equal(r.distinctLeaders, 4);
  assert.equal(r.frontContestFraction, 1);
  assert.equal(classifyFrontBattle(r), true);
});
