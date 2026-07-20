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
  RUNAWAY_PARADE_DEFAULTS,
} from './runaway-parade.mjs';

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
