// ============================================================
// pursuit-sim.test.mjs — unit tests for the handicap-pursuit prototype (branch exp/handicap-pursuit).
// Standalone (node assert), sim-only. Run: node scripts/exp/pursuit-sim.test.mjs
// ============================================================

import assert from 'assert';
import { FIELD, A_MAX, handicapOffset, expectedArrivalSec, runRace, loadTrack } from './pursuit-sim.mjs';

let passed = 0;
const it = (name, fn) => { fn(); passed++; console.log(`  ok  ${name}`); };

// (1) THE FAIRNESS INVARIANT: at slope=1 the noiseless expected arrival is EQUAL for every ability.
it('slope=1 equalizes expected arrival across all abilities (the fairness proof)', () => {
  const D = 10000;
  const arrivals = FIELD.map((f) => expectedArrivalSec(f.mult, D, 1.0));
  const a0 = arrivals[0];
  for (const a of arrivals) assert.ok(Math.abs(a - a0) < 1e-9, `arrival ${a} != ${a0}`);
  // and it equals D / (V0 * a_max) by construction.
  assert.ok(Math.abs(a0 - D / (150 * A_MAX)) < 1e-9);
});

// (2) slope != 1 does NOT equalize (so the calibration is finding a real, unique equalizer).
it('slope<1 favors the fast, slope>1 favors the slow (expected arrival ordering flips)', () => {
  const D = 10000;
  const fast = FIELD.find((f) => f.mult === A_MAX).mult;
  const slow = FIELD.reduce((m, f) => Math.min(m, f.mult), Infinity);
  // slope 0.9: fast arrives sooner than slow (under-handicapped).
  assert.ok(expectedArrivalSec(fast, D, 0.9) < expectedArrivalSec(slow, D, 0.9));
  // slope 1.1: fast arrives later than slow (over-handicapped).
  assert.ok(expectedArrivalSec(fast, D, 1.1) > expectedArrivalSec(slow, D, 1.1));
});

// (3) The fastest racer's handicap offset is 0 (it starts furthest back); the slowest starts furthest up.
it('handicap staggers the grid by ability (fastest at the back, offset 0)', () => {
  const D = 10000;
  assert.strictEqual(handicapOffset(A_MAX, D, 1.0), 0);
  const slow = FIELD.reduce((m, f) => Math.min(m, f.mult), Infinity);
  assert.ok(handicapOffset(slow, D, 1.0) > 0 && handicapOffset(slow, D, 1.0) < D);
});

// (4) DETERMINISM: same seed+slope+track ⇒ identical race (no wall-clock, no shared rng bleed).
it('a race is deterministic from its seed', () => {
  const track = loadTrack('searound');
  const a = runRace(track, 4242, 1.0);
  const b = runRace(track, 4242, 1.0);
  assert.strictEqual(a.winnerIdx, b.winnerIdx);
  assert.strictEqual(a.top3Spread, b.top3Spread);
  assert.strictEqual(a.leadChangesLate, b.leadChangesLate);
});

// (5) NOTHING after the gun reads rank / steers: two racers of IDENTICAL ability with the same seed-stream
// are symmetric, so over many seeds neither replica of a class systematically wins — a blunt no-steering
// check (a rank-reading controller would break this symmetry).
it('identical-ability replicas are statistically symmetric (no rank-based steering)', () => {
  const track = loadTrack('luger-hill');
  // horse class occupies FIELD indices 12..15 (4 replicas). Count wins among them over 300 seeds.
  const horseIdx = FIELD.map((f, i) => (f.cls === 'horse' ? i : -1)).filter((i) => i >= 0);
  const wins = Object.fromEntries(horseIdx.map((i) => [i, 0]));
  for (let s = 0; s < 300; s++) { const r = runRace(track, 7000 + s, 1.0); if (horseIdx.includes(r.winnerIdx)) wins[r.winnerIdx]++; }
  const counts = Object.values(wins);
  const total = counts.reduce((a, b) => a + b, 0);
  // No replica should take more than ~60% of the class's wins (symmetric ⇒ ~25% each).
  if (total > 0) assert.ok(Math.max(...counts) / total < 0.6, `replica skew ${JSON.stringify(wins)}`);
});

console.log(`\n${passed} passed`);
