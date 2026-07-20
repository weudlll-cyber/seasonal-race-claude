// ============================================================
// runaway-parade.test.mjs — classifier unit tests (baseline measurement).
//
// Run: node --test scripts/sim/observers/runaway-parade.test.mjs
//
// Proves the two race-level classifiers against synthetic raw records: each spec clause is exercised
// both ways (a race that satisfies it and one that just misses it), so a threshold or boundary drift
// fails here rather than silently in a sweep.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyRace,
  leadingGroup,
  relativeSpeedSpread,
  winnerIndexOf,
  leaderGapLengths,
  makeFormationTracker,
  formationLeaderStable,
  formationBucket,
  speedProduct,
  speedSaturation,
  SPEED_SOURCE_SAMPLES,
  RUNAWAY_PARADE_DEFAULTS,
} from './runaway-parade.mjs';
import { arcT } from '../../../client/src/modules/raceLengths.js';

const D = RUNAWAY_PARADE_DEFAULTS;

// ── RUNAWAY_WINNER ────────────────────────────────────────────────────────────
test('runaway: all three clauses satisfied → true', () => {
  const raw = {
    leaderIdxAt090: 7, leaderGapP2At090Len: 4.0, minLeadFrom090Len: 2.5,
    line: { order: [7, 3], gaps: [4.0] },
    speed095ByIndex: {}, finalRankByIndex: { 7: 1, 3: 2 },
  };
  const c = classifyRace(raw, D);
  assert.equal(c.runawayWinner, true);
  assert.equal(c.winnerIsLeaderAt090, true);
});

test('runaway (a) fails: lead at 0.90 below leadLen → false', () => {
  const raw = {
    leaderIdxAt090: 7, leaderGapP2At090Len: 2.9, minLeadFrom090Len: 2.5,
    line: { order: [7, 3], gaps: [2.9] },
    speed095ByIndex: {}, finalRankByIndex: { 7: 1, 3: 2 },
  };
  assert.equal(classifyRace(raw, D).runawayWinner, false);
});

test('runaway (b) fails: 0.90-leader does NOT finish first → false', () => {
  const raw = {
    leaderIdxAt090: 7, leaderGapP2At090Len: 5.0, minLeadFrom090Len: 2.0,
    line: { order: [7, 3], gaps: [5.0] },
    speed095ByIndex: {}, finalRankByIndex: { 7: 2, 3: 1 }, // racer 3 wins instead
  };
  const c = classifyRace(raw, D);
  assert.equal(c.winnerIsLeaderAt090, false);
  assert.equal(c.runawayWinner, false);
});

test('runaway (c) fails: challenged inside the window (min < challengeLen) → false', () => {
  const raw = {
    leaderIdxAt090: 7, leaderGapP2At090Len: 4.0, minLeadFrom090Len: 0.4, // dipped under 1.0
    line: { order: [7, 3], gaps: [4.0] },
    speed095ByIndex: {}, finalRankByIndex: { 7: 1, 3: 2 },
  };
  assert.equal(classifyRace(raw, D).runawayWinner, false);
});

test('runaway (c) boundary: min exactly == challengeLen → true (>=)', () => {
  const raw = {
    leaderIdxAt090: 1, leaderGapP2At090Len: 3.0, minLeadFrom090Len: 1.0,
    line: { order: [1, 2], gaps: [3.0] },
    speed095ByIndex: {}, finalRankByIndex: { 1: 1, 2: 2 },
  };
  assert.equal(classifyRace(raw, D).runawayWinner, true);
});

// ── PARADE_FINISH ─────────────────────────────────────────────────────────────
test('parade: two side-by-side leaders far from the field → true', () => {
  // order 0,1 within 0.3L of each other; 3.5L to racer 2 behind.
  const line = { order: [0, 1, 2, 3], gaps: [0.3, 3.5, 1.0] };
  const g = leadingGroup(line, D);
  assert.equal(g.isParade, true);
  assert.equal(g.size, 2);
  assert.deepEqual(g.members, [0, 1]);
});

test('parade: group of 3 side-by-side, then a 4.0L gap → true, size 3', () => {
  const line = { order: [0, 1, 2, 5], gaps: [0.4, 0.2, 4.0] };
  const g = leadingGroup(line, D);
  assert.equal(g.isParade, true);
  assert.equal(g.size, 3);
});

test('parade (a) fails: internal gap exceeds sideBySideLen → false', () => {
  const line = { order: [0, 1, 2], gaps: [0.7, 3.5] }; // 0.7 > 0.5, so no >=2 side-by-side group
  const g = leadingGroup(line, D);
  assert.equal(g.isParade, false);
});

test('parade (b) fails: next gap below farLen (bunched field, not detached) → false', () => {
  const line = { order: [0, 1, 2], gaps: [0.3, 2.0] }; // side-by-side pair but only 2.0L to the field
  const g = leadingGroup(line, D);
  assert.equal(g.isParade, false);
});

test('parade: lone leader (first gap already large) → not a parade', () => {
  const line = { order: [0, 1, 2], gaps: [4.0, 0.3] };
  assert.equal(leadingGroup(line, D).isParade, false);
});

test('parade: whole field side-by-side (no trailing gap) → not a parade (no field behind)', () => {
  const line = { order: [0, 1], gaps: [0.3] };
  assert.equal(leadingGroup(line, D).isParade, false);
});

// ── speed spread + winner helper ──────────────────────────────────────────────
test('relativeSpeedSpread: (max-min)/mean', () => {
  // speeds 1.0 and 1.1 → mean 1.05, spread 0.1/1.05
  assert.ok(Math.abs(relativeSpeedSpread([0, 1], { 0: 1.0, 1: 1.1 }) - (0.1 / 1.05)) < 1e-6);
  assert.equal(relativeSpeedSpread([0], { 0: 1.0 }), 0); // single member → 0
});

test('classifyRace reports parade group + speed spread together', () => {
  const raw = {
    leaderIdxAt090: 0, leaderGapP2At090Len: 0.3, minLeadFrom090Len: 0.3,
    line: { order: [0, 1, 2], gaps: [0.3, 3.5] },
    speed095ByIndex: { 0: 2.00, 1: 2.02, 2: 1.5 },
    finalRankByIndex: { 0: 1, 1: 2, 2: 3 },
  };
  const c = classifyRace(raw, D);
  assert.equal(c.paradeFinish, true);
  assert.equal(c.paradeGroupSize, 2);
  assert.ok(c.paradeSpeedSpread > 0 && c.paradeSpeedSpread < 0.02); // ~0.02/2.01
  assert.equal(c.runawayWinner, false); // lead at 0.90 way under 3.0
});

test('winnerIndexOf finds rank 1', () => {
  assert.equal(winnerIndexOf({ 4: 3, 9: 1, 2: 2 }), 9);
  assert.equal(winnerIndexOf({}), null);
});

// ── Golden symmetry: the front-leash gap input == the observer's leader→P2 length ──────────────
// leaderGapLengths is the ONE source both the runaway-winner metric and the sim-only front-distance
// leash consume, so "the quantity we measure" == "the quantity we steer on", bitwise, on any snapshot.
test('leaderGapLengths == observer leader→P2 (arcT × lenScale) on identical snapshots, within 1e-9', () => {
  const scale = 1 / 30; // arbitrary govLenScale
  const cases = [
    { racers: [{ index: 0, t: 0.50, finished: false }, { index: 1, t: 0.44, finished: false }, { index: 2, t: 0.40, finished: false }], isOpen: true },
    // finished racers excluded; leader→P2 among the live pair
    { racers: [{ index: 5, t: 0.99, finished: true }, { index: 0, t: 0.50, finished: false }, { index: 1, t: 0.31, finished: false }], isOpen: true },
    // closed track (lap-aware arcT path)
    { racers: [{ index: 3, t: 2.10, finished: false }, { index: 7, t: 1.95, finished: false }], isOpen: false },
  ];
  for (const { racers, isOpen } of cases) {
    const live = racers.filter((r) => !r.finished).sort((a, b) => (b.t - a.t) || (a.index - b.index));
    const observer = arcT(live[0].t, live[1].t, isOpen) * scale; // what the observer records (pre-round)
    const leashInput = leaderGapLengths(racers, isOpen, scale); // what the leash steers on
    assert.ok(Math.abs(leashInput - observer) < 1e-9, `expected ${observer}, got ${leashInput}`);
  }
});

test('leaderGapLengths returns 0 for < 2 live racers or non-positive scale', () => {
  assert.equal(leaderGapLengths([{ index: 0, t: 0.5, finished: false }], true, 1 / 30), 0);
  assert.equal(leaderGapLengths([{ index: 0, t: 0.5, finished: false }, { index: 1, t: 0.4, finished: false }], true, 0), 0);
});

// ── FORMATION tracker (WHEN does the leader→P2 gap form?) ──────────────────────────────────────
// Feed a synthetic (gap, progress, leaderIdx) frame sequence and assert the recorded fields.
function feed(frames) {
  const t = makeFormationTracker();
  for (const [gap, prog, idx] of frames) t.observe(gap, prog, idx ?? 0);
  return t.result();
}

test('formation: threshold crossings recorded at the earliest crossing progress', () => {
  const r = feed([[0.5, 0.10], [1.6, 0.20], [2.0, 0.40], [3.1, 0.50], [4.0, 0.80]]);
  assert.equal(r.firstCross15, 0.20); // first frame gap ≥ 1.5
  assert.equal(r.firstCross30, 0.50); // first frame gap ≥ 3.0
});

test('formation: sustained flag true when gap holds through 0.90, false if it dips before', () => {
  const held = feed([[3.1, 0.50], [3.5, 0.70], [4.0, 0.90]]);
  assert.equal(held.sustained30, true);
  const dipped = feed([[3.1, 0.50], [2.0, 0.70], [4.0, 0.90]]); // dips below 3.0 at 0.70 (< 0.90)
  assert.equal(dipped.sustained30, false);
  // a dip AFTER 0.90 does not break sustained
  const dipLate = feed([[3.1, 0.50], [4.0, 0.90], [1.0, 0.95]]);
  assert.equal(dipLate.sustained30, true);
});

test('formation: boundary samples take the first frame at/after 0.30 and 0.60', () => {
  const r = feed([[1.0, 0.10], [2.2, 0.31], [2.5, 0.45], [3.3, 0.62], [5.0, 0.90]]);
  assert.equal(r.gapAt030, 2.2); // first frame ≥ 0.30
  assert.equal(r.gapAt060, 3.3); // first frame ≥ 0.60
});

test('formation: never-crossed → nulls (firstCross, sustained, leaderIdxAtCross30)', () => {
  const r = feed([[0.5, 0.30], [0.8, 0.60], [1.2, 0.90]]); // never reaches 1.5
  assert.equal(r.firstCross15, null);
  assert.equal(r.sustained15, null);
  assert.equal(r.firstCross30, null);
  assert.equal(r.leaderIdxAtCross30, null);
  assert.equal(r.gapAt030, 0.5); // boundary samples still recorded
  assert.equal(r.gapAt060, 0.8);
});

test('formation: leaderIdxAtCross30 captures the live rank-1 at the 3.0 crossing', () => {
  const r = feed([[1.0, 0.20, 7], [3.2, 0.40, 7], [4.0, 0.60, 3]]); // racer 7 leads at the crossing
  assert.equal(r.leaderIdxAtCross30, 7);
});

test('formationLeaderStable: true iff the crossing-leader finishes rank 1; null when never crossed', () => {
  assert.equal(formationLeaderStable(7, { 7: 1, 3: 2 }), true);
  assert.equal(formationLeaderStable(3, { 7: 1, 3: 2 }), false);
  assert.equal(formationLeaderStable(null, { 7: 1 }), null);
});

test('formationBucket: bins by crossing progress', () => {
  assert.equal(formationBucket(0.10), 'lt030');
  assert.equal(formationBucket(0.30), '030to060');
  assert.equal(formationBucket(0.59), '030to060');
  assert.equal(formationBucket(0.60), '060to075');
  assert.equal(formationBucket(0.74), '060to075');
  assert.equal(formationBucket(0.75), '075to090');
  assert.equal(formationBucket(0.89), '075to090');
  assert.equal(formationBucket(0.90), 'never'); // at/after 0.90 → not formed during the race
  assert.equal(formationBucket(null), 'never');
});

// ── SPEED-SOURCE decomposition helpers ────────────────────────────────────────────────────────
test('speedProduct multiplies the full factor chain', () => {
  const f = { baseSpeed: 2, boost: 1.1, brake: 0.9, rowEnvMult: 1.02, trajectoryMult: 1.05, areaBonusMult: 1.03, governorMult: 1.0 };
  const expected = 2 * 1.1 * 0.9 * 1.02 * 1.05 * 1.03 * 1.0;
  assert.ok(Math.abs(speedProduct(f) - expected) < 1e-12);
});

test('speedProduct with all-neutral factors returns baseSpeed', () => {
  assert.equal(speedProduct({ baseSpeed: 5, boost: 1, brake: 1, rowEnvMult: 1, trajectoryMult: 1, areaBonusMult: 1, governorMult: 1 }), 5);
});

test('speedSaturation: servoSaturated at the ceiling, headroom below, band headroom', () => {
  const atCeil = speedSaturation({ trajectoryMult: 1.1, spreadFactor: 1.081 }, 1.1, 1.081);
  assert.equal(atCeil.servoSaturated, true);
  assert.ok(Math.abs(atCeil.servoHeadroom) < 1e-9);
  assert.ok(Math.abs(atCeil.bandHeadroom) < 1e-9);
  const below = speedSaturation({ trajectoryMult: 0.95, spreadFactor: 1.03 }, 1.1, 1.081);
  assert.equal(below.servoSaturated, false);
  assert.ok(Math.abs(below.servoHeadroom - 0.15) < 1e-9);   // 1.1 − 0.95
  assert.ok(Math.abs(below.bandHeadroom - 0.051) < 1e-9);   // 1.081 − 1.03
});

test('speedSaturation: a braked leader (traj < 1) is NOT servoSaturated and has full servo headroom', () => {
  const s = speedSaturation({ trajectoryMult: 0.85, spreadFactor: 1.081 }, 1.1, 1.081);
  assert.equal(s.servoSaturated, false);
  assert.ok(s.servoHeadroom > 0.24); // 1.1 − 0.85 = 0.25
  assert.ok(Math.abs(s.bandHeadroom) < 1e-9); // at natural band ceiling → no natural headroom
});

test('SPEED_SOURCE_SAMPLES are the six late-race sample points', () => {
  assert.deepEqual(SPEED_SOURCE_SAMPLES, [0.70, 0.75, 0.80, 0.85, 0.90, 0.95]);
});
