// ============================================================
// look-before-brake.test.mjs — attribution + tally unit tests for the LBB-DIAG observer.
//
// Run: node --test scripts/sim/observers/look-before-brake.test.mjs
//
// Proves that each synthetic decision record is attributed to the FIRST blocking condition in the gate's
// OWN evaluation order (room → slower → no-free-side → drift → dodged), that windowEmpty is tallied
// independently of the blocking reason, and that brakeThenDodge fires only when a real "braked, then
// dodged the same leader without traffic in between" encounter exists.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attributeDecision,
  summarizeDecisions,
  detectBrakeThenDodge,
} from './look-before-brake.mjs';

// A record where every gate condition PASSES (dodged). dynamicBrakeT > dTStart so windowEmpty is false,
// and dT > dTStart so there is room. Individual tests override single fields to force one failure.
function passingRec(over = {}) {
  return {
    trailerIndex: 1,
    leaderIndex: 2,
    dT: 0.02,
    dTStart: 0.01,
    dynamicBrakeT: 0.03, // > dTStart → windowEmpty false
    tLat: 5,
    slowerLeaderOk: true,
    heroPass: false,
    dir: -1,
    vLatToward: 0.5,
    noRoomBothSides: null,
    takeFreeLane: true,
    frame: 0,
    ...over,
  };
}

test('all four conditions pass → dodged', () => {
  assert.equal(attributeDecision(passingRec()).outcome, 'dodged');
});

test('(a) first: dT <= dTStart → blockedRoom, with the room shortfall', () => {
  const a = attributeDecision(passingRec({ dT: 0.005, dTStart: 0.01 }));
  assert.equal(a.outcome, 'blockedRoom');
  assert.ok(Math.abs(a.roomShortfall - 0.005) < 1e-9);
});

test('gate order: blockedRoom wins even when a later condition also fails', () => {
  // dT fails (a) AND slowerLeaderOk fails (b) AND dir===0 (c): the FIRST (room) must be attributed.
  const a = attributeDecision(
    passingRec({ dT: 0.005, slowerLeaderOk: false, heroPass: false, dir: 0 })
  );
  assert.equal(a.outcome, 'blockedRoom');
});

test('(b) slower-leader fails but a hero pass rescues it (heroPass OR)', () => {
  assert.equal(attributeDecision(passingRec({ slowerLeaderOk: false, heroPass: false })).outcome, 'blockedSlower');
  // heroPass true → condition (b) passes, so it falls through to dodged.
  assert.equal(attributeDecision(passingRec({ slowerLeaderOk: false, heroPass: true })).outcome, 'dodged');
});

test('(c) dir===0 → blockedNoFreeSide, split by noRoomBothSides', () => {
  const noRoom = attributeDecision(passingRec({ dir: 0, noRoomBothSides: true }));
  assert.equal(noRoom.outcome, 'blockedNoFreeSide');
  assert.equal(noRoom.noFreeSideKind, 'noRoomOnTrack');
  const traffic = attributeDecision(passingRec({ dir: 0, noRoomBothSides: false }));
  assert.equal(traffic.outcome, 'blockedNoFreeSide');
  assert.equal(traffic.noFreeSideKind, 'trafficBothSides');
});

test('(d) drift: vLatToward < 0 → blockedDrift', () => {
  assert.equal(attributeDecision(passingRec({ vLatToward: -0.2 })).outcome, 'blockedDrift');
});

test('windowEmpty is tallied independently: a decision can be both blockedRoom AND windowEmpty', () => {
  // dTStart >= dynamicBrakeT → windowEmpty; and (since a brake-zone entry has dT < dynamicBrakeT) it is
  // also blockedRoom by construction.
  const a = attributeDecision(passingRec({ dT: 0.02, dTStart: 0.03, dynamicBrakeT: 0.03 }));
  assert.equal(a.outcome, 'blockedRoom');
  assert.equal(a.windowEmpty, true);
  // A blockedRoom with a live window (dTStart < dynamicBrakeT) is NOT windowEmpty.
  const b = attributeDecision(passingRec({ dT: 0.005, dTStart: 0.01, dynamicBrakeT: 0.03 }));
  assert.equal(b.outcome, 'blockedRoom');
  assert.equal(b.windowEmpty, false);
});

test('summarizeDecisions tallies outcomes, shares, windowEmpty and blockedRoom aggregates', () => {
  const decisions = [
    passingRec(),                                                        // dodged
    passingRec({ dT: 0.005, dTStart: 0.01, dynamicBrakeT: 0.03, tLat: 4 }), // blockedRoom, live window
    passingRec({ dT: 0.02, dTStart: 0.03, dynamicBrakeT: 0.03, tLat: 6 }),  // blockedRoom + windowEmpty
    passingRec({ slowerLeaderOk: false, heroPass: false }),              // blockedSlower
    passingRec({ dir: 0, noRoomBothSides: true }),                       // blockedNoFreeSide / noRoom
    passingRec({ dir: 0, noRoomBothSides: false }),                      // blockedNoFreeSide / traffic
    passingRec({ vLatToward: -0.1 }),                                    // blockedDrift
  ];
  const s = summarizeDecisions(decisions);
  assert.equal(s.decisions, 7);
  assert.equal(s.counts.dodged, 1);
  assert.equal(s.counts.blockedRoom, 2);
  assert.equal(s.counts.blockedSlower, 1);
  assert.equal(s.counts.blockedNoFreeSide, 2);
  assert.equal(s.counts.blockedDrift, 1);
  assert.equal(s.windowEmpty, 1); // only the one blockedRoom with dTStart >= dynamicBrakeT
  assert.equal(s.noRoomOnTrack, 1);
  assert.equal(s.trafficBothSides, 1);
  // roomShortfalls = {0.005, 0.01} → median 0.0075; tLats over blockedRoom = {4, 6} → median 5.
  assert.ok(Math.abs(s.roomShortfallMedian - 0.0075) < 1e-9);
  assert.equal(s.tLatMedian, 5);
  assert.equal(s.shares.dodged, 0.1429); // 1/7 rounded to 4 dp by the observer
});

test('brakeThenDodge: braked then dodged the same leader, no traffic in between → fires', () => {
  // Same trailer(1)/leader(2), consecutive frames: two blockedRoom brakes, then a dodge.
  const decisions = [
    passingRec({ frame: 10, dT: 0.005, dTStart: 0.01 }), // brake (room)
    passingRec({ frame: 11, dT: 0.006, dTStart: 0.01 }), // brake (room)
    passingRec({ frame: 12 }),                            // dodge
  ];
  const enc = detectBrakeThenDodge(decisions);
  assert.equal(enc.length, 1);
  assert.equal(enc[0].brakedBeforeDodge, 2);
});

test('brakeThenDodge: a traffic block before the dodge disqualifies the encounter', () => {
  const decisions = [
    passingRec({ frame: 10, dT: 0.005, dTStart: 0.01 }),      // brake (room)
    passingRec({ frame: 11, dir: 0, noRoomBothSides: false }), // brake (traffic) → disqualifies
    passingRec({ frame: 12 }),                                 // dodge
  ];
  assert.equal(detectBrakeThenDodge(decisions).length, 0);
});

test('brakeThenDodge: a frame gap splits the encounter (dodge with no prior brake in its run)', () => {
  const decisions = [
    passingRec({ frame: 10, dT: 0.005, dTStart: 0.01 }), // brake, encounter A (no later dodge)
    // gap: frames 11..19 not in brake zone → encounter break
    passingRec({ frame: 20 }),                            // dodge, encounter B (no prior brake)
  ];
  assert.equal(detectBrakeThenDodge(decisions).length, 0);
});

test('brakeThenDodge: an immediate dodge (no prior brake) does not fire', () => {
  const decisions = [
    passingRec({ frame: 10 }),                            // dodge on first frame of the encounter
    passingRec({ frame: 11, dT: 0.005, dTStart: 0.01 }), // brake after
  ];
  assert.equal(detectBrakeThenDodge(decisions).length, 0);
});

test('brakeThenDodge: different leaders are separate encounters', () => {
  // Trailer 1 brakes vs leader 2, then dodges leader 3 — NOT the same-leader pattern.
  const decisions = [
    passingRec({ frame: 10, leaderIndex: 2, dT: 0.005, dTStart: 0.01 }), // brake vs L2
    passingRec({ frame: 11, leaderIndex: 3 }),                            // dodge vs L3
  ];
  assert.equal(detectBrakeThenDodge(decisions).length, 0);
});
