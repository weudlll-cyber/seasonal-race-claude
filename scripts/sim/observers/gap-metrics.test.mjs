// ============================================================
// gap-metrics.test.mjs — THE GOLDEN TEST (INFRA 5C).
//
// Run: node --test scripts/sim/observers/gap-metrics.test.mjs
//
// The standing, executable proof that the project's fairness gate — which lives entirely
// in RANK space — CANNOT see a dead race. Two synthetic races with IDENTICAL final ranks,
// one a perfectly bunched field, one strung out:
//   • every RANK-space metric (bandReach, reachedFront, placesGained) is IDENTICAL;
//   • every GAP-space metric differs.
// If this test ever fails, either a rank-space metric started (wrongly) depending on gaps,
// or a gap-space metric went blind to them — both are regressions worth stopping for.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  secondsBehindLeader,
  lengthsBehindLeader,
  fieldSpreadP10P90,
  gapsAtLine,
  inContentionFraction,
  visibleComeback,
  deadRaceFlag,
  reachedFront,
  bandReach,
  placesGained,
  PROPOSED_THRESHOLDS,
} from './gap-metrics.mjs';

// ── Two synthetic 5-racer races with IDENTICAL final ranks (1..5) ─────────────────────
// Each racer: { startRank, finalRank, finishSec }. Both races share start & final ranks;
// only the finish TIMES (the gap structure) differ.
const RANKS = [
  { startRank: 5, finalRank: 1 },
  { startRank: 4, finalRank: 2 },
  { startRank: 3, finalRank: 3 },
  { startRank: 2, finalRank: 4 },
  { startRank: 1, finalRank: 5 },
];

// BUNCHED: a photo-finish — all five cross within 0.20 s.
const BUNCHED_FINISH = [10.00, 10.05, 10.1, 10.15, 10.2];
// STRUNG-OUT: a dead race — the leader is gone, 2 s between each finisher (8 s P1→P5).
const STRUNG_FINISH = [10.0, 12.0, 14.0, 16.0, 18.0];

function race(finishSec) {
  return RANKS.map((r, i) => ({ ...r, finishSec: finishSec[i] }));
}
const bunched = race(BUNCHED_FINISH);
const strung = race(STRUNG_FINISH);

// A leader progress-vs-time trace for each race: the P1 racer runs at constant pace to the
// line (position 1.0 at its finish time). ts in ms.
function leaderTrace(finishSec) {
  const t1 = finishSec[0] * 1000;
  return [
    { ts: 0, t: 0 },
    { ts: t1, t: 1.0 },
  ];
}

test('RANK-space metrics are IDENTICAL between bunched and strung-out (blind to the gap)', () => {
  for (let i = 0; i < RANKS.length; i++) {
    assert.equal(
      reachedFront(bunched[i].finalRank),
      reachedFront(strung[i].finalRank),
      `reachedFront differs at racer ${i}`
    );
    assert.equal(
      bandReach(bunched[i].finalRank, bunched[i].finalRank),
      bandReach(strung[i].finalRank, strung[i].finalRank),
      `bandReach differs at racer ${i}`
    );
    assert.equal(
      placesGained(bunched[i].startRank, bunched[i].finalRank),
      placesGained(strung[i].startRank, strung[i].finalRank),
      `placesGained differs at racer ${i}`
    );
  }
  // And the aggregate rank-space headline — front-band reach count — is identical.
  const frontCount = (race) => race.filter((r) => reachedFront(r.finalRank)).length;
  assert.equal(frontCount(bunched), frontCount(strung));
});

test('GAP-space metrics DIFFER between bunched and strung-out (they see the dead race)', () => {
  // 1. At-the-line spreads.
  const gB = gapsAtLine(BUNCHED_FINISH);
  const gS = gapsAtLine(STRUNG_FINISH);
  assert.notEqual(gB.leaderGapToP2, gS.leaderGapToP2);
  assert.notEqual(gB.top5Spread, gS.top5Spread);
  assert.ok(gS.leaderGapToP2 > gB.leaderGapToP2, 'strung leader→P2 must be larger');
  assert.ok(gS.top5Spread > gB.top5Spread, 'strung top-5 spread must be larger');

  // 2. Field spread (p10..p90 of seconds-behind-leader at the line). Behind-leader seconds
  //    at the line = each finisher's finishSec − leader finishSec.
  const behind = (finish) => finish.map((s) => s - finish[0]);
  const fsB = fieldSpreadP10P90(behind(BUNCHED_FINISH));
  const fsS = fieldSpreadP10P90(behind(STRUNG_FINISH));
  assert.notEqual(fsB, fsS);
  assert.ok(fsS > fsB);

  // 3. secondsBehindLeader for the P5 racer, sampled mid-race at track-position 0.5.
  //    Trailing racer sits at t=0.5 while the leader is already at the line.
  const sbB = secondsBehindLeader(0.5, leaderTrace(BUNCHED_FINISH), BUNCHED_FINISH[4] * 1000);
  const sbS = secondsBehindLeader(0.5, leaderTrace(STRUNG_FINISH), STRUNG_FINISH[4] * 1000);
  assert.notEqual(sbB, sbS);
  assert.ok(sbS > sbB);
});

test('inContentionFraction separates the two at the proposed X', () => {
  const X = PROPOSED_THRESHOLDS.inContentionSec; // 2.0 s
  // Per-racer behind-leader series at the line (single-sample proxy for the test).
  const behindB = BUNCHED_FINISH.map((s) => s - BUNCHED_FINISH[0]);
  const behindS = STRUNG_FINISH.map((s) => s - STRUNG_FINISH[0]);
  // Bunched: all within 0.2 s → everyone in contention. Strung: only P1/P2 within 2 s.
  assert.equal(inContentionFraction(behindB, X), 1.0);
  assert.ok(inContentionFraction(behindS, X) < 1.0);
});

test('visibleComeback: a rank<=5 finish is NOT automatically a comeback', () => {
  const { comebackDepthSec: Y, comebackFinishSec: Z } = PROPOSED_THRESHOLDS; // 5, 1.5
  // The strung-out P5 finished 5th (reachedFront by the OLD rank rule — front band is 1..5 in
  // a 5-racer field) but is 8 s behind the leader → NOT a visible comeback.
  assert.equal(reachedFront(5), true, 'old rank rule would call this "front"');
  assert.equal(visibleComeback(/*maxBehind*/ 8.0, /*finalBehind*/ 8.0, Y, Z), false);
  // A racer that WAS 6 s behind after chaos but closed to 1 s at the line IS a visible comeback.
  assert.equal(visibleComeback(6.0, 1.0, Y, Z), true);
});

test('deadRaceFlag fires on the strung race and not the bunched race', () => {
  const { deadRaceGapSec: thr, deadRaceMajorityFrac: maj } = PROPOSED_THRESHOLDS; // 3.0, 0.5
  // leader→P2 gap sampled through the final third. Bunched ~0.05 s throughout; strung ~2 s but
  // widening — model the run-in as a rising gap that spends most of the final third above 3 s.
  const bunchedFinalThird = [0.05, 0.05, 0.05, 0.05, 0.05];
  const strungFinalThird = [3.5, 3.8, 4.0, 4.2, 2.9]; // >3 s for 4 of 5 samples
  assert.equal(deadRaceFlag(bunchedFinalThird, thr, maj), false);
  assert.equal(deadRaceFlag(strungFinalThird, thr, maj), true);
});

// ── PRIMARY UNIT: RACER LENGTHS ───────────────────────────────────────────────────────
// The same bunched/strung distinction, now measured in racer lengths (the spatial gap the HUD
// shows). lenScale = pathLengthPx/meanBodyLen = 3000/30 = 100 lengths per lap-fraction. Leader at
// t=0.5 (away from the 0/1 seam). Identical final ranks 1..5; only the on-track SPACING differs.
const LEN_SCALE = 100;
const LEADER_T = 0.5;
const BUNCHED_T = [0.5, 0.499, 0.498, 0.497, 0.496]; // 0.0 … 0.4 lengths behind (a photo-finish)
const STRUNG_T = [0.5, 0.48, 0.46, 0.44, 0.42]; //       0 … 8 lengths behind (a dead race)
const lenBehind = (posArr) => posArr.map((t) => lengthsBehindLeader(t, LEADER_T, false, LEN_SCALE));

test('LENGTHS: bunched vs strung-out differ in racer lengths (identical ranks stay blind)', () => {
  const lb = lenBehind(BUNCHED_T);
  const ls = lenBehind(STRUNG_T);
  // Rank-space is identical (ranks 1..5 both) — proven above; here the lengths must diverge.
  assert.ok(Math.max(...ls) > Math.max(...lb), 'strung field is more lengths behind');
  assert.ok(fieldSpreadP10P90(ls) > fieldSpreadP10P90(lb), 'strung field p10–p90 spread is larger (lengths)');
  // Sanity on the shared conversion: P5 in the strung race is 8 lengths back, in the bunched ~0.4.
  assert.ok(Math.abs(Math.max(...ls) - 8.0) < 1e-9);
  assert.ok(Math.max(...lb) < 0.5);
});

test('LENGTHS: inContentionFraction separates the two at the proposed X (lengths)', () => {
  const X = PROPOSED_THRESHOLDS.inContentionLen; // 3.0 lengths
  assert.equal(inContentionFraction(lenBehind(BUNCHED_T), X), 1.0); // all within 3 lengths
  assert.ok(inContentionFraction(lenBehind(STRUNG_T), X) < 1.0); // only the front two within 3 lengths
});

test('LENGTHS: a rank<=5 finish is NOT automatically a comeback (lengths thresholds)', () => {
  const { comebackDepthLen: Y, comebackFinishLen: Z } = PROPOSED_THRESHOLDS; // 8, 3
  assert.equal(visibleComeback(/*maxBehindLen*/ 8.0, /*finalBehindLen*/ 8.0, Y, Z), false); // 8 lengths back at the line
  assert.equal(visibleComeback(9.0, 2.0, Y, Z), true); // was 9 lengths back, closed to 2 — a real comeback
});

test('LENGTHS: deadRaceFlag / front-gap fires on the strung race, not the bunched (lengths)', () => {
  const { deadRaceGapLen: thr, deadRaceMajorityFrac: maj } = PROPOSED_THRESHOLDS; // 5, 0.5
  const bunchedFinalThird = [0.4, 0.4, 0.4, 0.4, 0.4]; // < 5 lengths throughout
  const strungFinalThird = [6.0, 6.5, 7.0, 7.5, 4.0]; // > 5 lengths for 4 of 5 samples
  assert.equal(deadRaceFlag(bunchedFinalThird, thr, maj), false);
  assert.equal(deadRaceFlag(strungFinalThird, thr, maj), true);
});
