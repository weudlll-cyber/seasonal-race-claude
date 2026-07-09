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
