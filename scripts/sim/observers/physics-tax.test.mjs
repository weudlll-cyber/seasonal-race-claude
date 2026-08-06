// ============================================================
// physics-tax.test.mjs — PHYSICS TAX observer unit tests (GREENFIELD P0).
//
// Run: node --test scripts/sim/observers/physics-tax.test.mjs
//
// The module is pure, so every invariant here is exact rather than statistical: a constant brake
// of 0.9 must produce lostFrac == 0.1 to the last digit, regardless of frame count. The decile
// binning and the band normalisation (sigma) are pinned both ways — a value that satisfies the
// definition and one that just misses it — so a drift in either fails here rather than silently
// in a sweep.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makePhysicsTaxTracker,
  summarizePhysicsTax,
  PHYSICS_TAX_DECILES,
} from "./physics-tax.mjs";

// The shipped band: BASE_SPEED_MIN/MAX = 0.00096/0.00113 → mean 0.001045 → half-width ≈ 0.0813.
const BAND_HALF = 0.00113 / ((0.00096 + 0.00113) / 2) - 1;

const near = (actual, expected, digits = 9) =>
  assert.ok(
    Math.abs(actual - expected) < 10 ** -digits,
    `expected ${actual} to be within 1e-${digits} of ${expected}`,
  );

// ── makePhysicsTaxTracker ───────────────────────────────────────────────────────────────────

test("reports zero loss when physics never brakes", () => {
  const t = makePhysicsTaxTracker();
  for (let f = 0; f < 100; f++) t.sample(0, f / 100, 0.001, 1.0, 1.0);
  const r = t.result();
  assert.equal(r.perRacer.length, 1);
  assert.equal(r.perRacer[0].lostFrac, 0);
  assert.equal(r.perRacer[0].brakeFrameShare, 0);
  assert.equal(r.perRacer[0].draftGainFrac, 0);
});

test("lostFrac is exactly the counterfactual share for a constant brake", () => {
  // brake = 0.9 every frame → the racer covers 0.9 of what it would have; the loss is 0.1 of the
  // no-brake distance. lostFrac must be exactly 0.1, independent of frame count.
  const t = makePhysicsTaxTracker();
  for (let f = 0; f < 250; f++) t.sample(7, f / 250, 0.001, 1.0, 0.9);
  const p = t.result().perRacer[0];
  assert.equal(p.index, 7);
  near(p.lostFrac, 0.1);
  assert.equal(p.brakeFrameShare, 1);
});

test("vAppl + brakeLoss equals the no-brake counterfactual by construction", () => {
  // Mixed braking: half the frames at 0.8, half free. Applied = 0.5*0.8 + 0.5*1 = 0.9 of the free
  // distance, so lostFrac = 0.1 and the brake-frame share is 0.5.
  const t = makePhysicsTaxTracker();
  for (let f = 0; f < 200; f++)
    t.sample(1, f / 200, 0.002, 1.0, f % 2 === 0 ? 0.8 : 1.0);
  const p = t.result().perRacer[0];
  near(p.lostFrac, 0.1);
  near(p.brakeFrameShare, 0.5);
});

test("separates the drafting gain from the braking loss", () => {
  const t = makePhysicsTaxTracker();
  for (let f = 0; f < 100; f++) t.sample(3, f / 100, 0.001, 1.25, 1.0);
  const p = t.result().perRacer[0];
  assert.equal(p.lostFrac, 0);
  // draftGain = vAppl * (1 - 1/boost) = 1 - 1/1.25 = 0.2 of the applied distance.
  near(p.draftGainFrac, 0.2);
});

test("bins the per-decile profile by race progress, tail included", () => {
  const t = makePhysicsTaxTracker();
  // Brake ONLY in the last decile → every earlier decile must read 0 and the last 0.5.
  for (let f = 0; f < 1000; f++) {
    const p = f / 1000;
    t.sample(0, p, 0.001, 1.0, p >= 0.9 ? 0.5 : 1.0);
  }
  const d = t.result().perRacer[0].decLostFrac;
  assert.equal(d.length, PHYSICS_TAX_DECILES);
  for (let i = 0; i < 9; i++) assert.equal(d[i], 0);
  near(d[9], 0.5, 6);
});

test("clamps progress at both ends instead of writing out of bounds", () => {
  const t = makePhysicsTaxTracker();
  t.sample(0, -0.5, 0.001, 1.0, 0.5); // below 0 → first decile
  t.sample(0, 1.0, 0.001, 1.0, 0.5); // exactly 1 → last decile, not index 10
  const d = t.result().perRacer[0].decLostFrac;
  near(d[0], 0.5, 6);
  near(d[9], 0.5, 6);
  assert.equal(d.length, PHYSICS_TAX_DECILES);
});

test("keeps racers independent and emits them in index order", () => {
  const t = makePhysicsTaxTracker();
  for (let f = 0; f < 50; f++) {
    t.sample(5, f / 50, 0.001, 1.0, 0.9);
    t.sample(2, f / 50, 0.001, 1.0, 1.0);
  }
  const rs = t.result().perRacer;
  assert.deepEqual(
    rs.map((r) => r.index),
    [2, 5],
  );
  assert.equal(rs[0].lostFrac, 0);
  near(rs[1].lostFrac, 0.1);
});

test("ignores non-positive free speed rather than emitting a racer", () => {
  const t = makePhysicsTaxTracker();
  t.sample(0, 0.5, 0, 1.0, 0.5);
  assert.equal(t.result().perRacer.length, 0);
});

// ── field geometry ──────────────────────────────────────────────────────────────────────────

test("field geometry averages spread and derives the mean rank gap", () => {
  const t = makePhysicsTaxTracker();
  // 40 live racers, constant 39-length spread → mean rank gap = 39/39 = 1.0 length.
  for (let f = 0; f < 100; f++) t.sampleField(39, 3.0, 40);
  const g = t.fieldGeom();
  near(g.meanFullSpreadLen, 39, 6);
  near(g.meanNLive, 40, 6);
  near(g.meanRankGapLen, 1.0, 6);
  near(g.meanFieldSpeedLenPerSec, 3.0, 6);
});

test("field geometry ignores frames with a collapsed field", () => {
  const t = makePhysicsTaxTracker();
  t.sampleField(10, 3.0, 5); // counts toward spread
  t.sampleField(0, 3.0, 1); // < 2 live → spread ignored, but speed still counts
  const g = t.fieldGeom();
  near(g.meanFullSpreadLen, 10, 6);
  near(g.meanNLive, 5, 6);
});

test("field geometry is null before any sample", () => {
  const g = makePhysicsTaxTracker().fieldGeom();
  assert.equal(g.meanFullSpreadLen, null);
  assert.equal(g.meanRankGapLen, null);
  assert.equal(g.meanFieldSpeedLenPerSec, null);
});

// ── summarizePhysicsTax ─────────────────────────────────────────────────────────────────────

const raceWith = (lostFracs) => ({
  physicsTax: {
    deciles: PHYSICS_TAX_DECILES,
    perRacer: lostFracs.map((lf, i) => ({
      index: i,
      lostFrac: lf,
      draftGainFrac: 0,
      brakeFrameShare: lf > 0 ? 1 : 0,
      decLostFrac: new Array(PHYSICS_TAX_DECILES).fill(lf),
    })),
  },
});

test("converts a loss fraction into band authority (sigma)", () => {
  // A racer losing exactly one band half-width of distance has consumed the whole band.
  const s = summarizePhysicsTax([raceWith([BAND_HALF])], BAND_HALF);
  near(s.sigma.mean, 1.0);
  near(s.lostFrac.mean, BAND_HALF);
  assert.equal(s.nRacers, 1);
});

test("reports a uniform tax as concentration 1.0", () => {
  const s = summarizePhysicsTax([raceWith([0.02, 0.02, 0.02])], BAND_HALF);
  near(s.concentration, 1.0, 6);
  near(s.tailLostFrac, 0.02, 6);
});

test("flags a concentrated tax with concentration > 1", () => {
  const race = raceWith([0.01]);
  // Same racer, but all of the loss sits in the last decile.
  race.physicsTax.perRacer[0].decLostFrac = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1];
  const s = summarizePhysicsTax([race], BAND_HALF);
  assert.ok(
    s.concentration > 1,
    `expected concentration > 1, got ${s.concentration}`,
  );
  near(s.tailLostFrac, 0.1, 6);
});

test("pools across races and orders the percentiles", () => {
  const s = summarizePhysicsTax(
    [raceWith([0.01, 0.02]), raceWith([0.03, 0.1])],
    BAND_HALF,
  );
  assert.equal(s.nRacers, 4);
  assert.ok(s.lostFrac.p50 <= s.lostFrac.p95);
  assert.ok(s.lostFrac.p95 <= s.lostFrac.max);
  near(s.lostFrac.max, 0.1);
});

test("survives an empty race set without throwing", () => {
  const s = summarizePhysicsTax([], BAND_HALF);
  assert.equal(s.nRacers, 0);
  assert.equal(s.lostFrac.max, null);
});
