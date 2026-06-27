// ============================================================
// File:        raceBehavior.test.js
// Path:        client/src/modules/raceBehavior.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Unit tests for D7b racer-behavior logic (physicalY-based
//              avoidance, home force, drafting cone, speed brake).
// ============================================================

import { describe, it, expect } from 'vitest';
import { initRacerBehavior, applyRacerBehavior } from './raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';

function makeRacer(overrides = {}) {
  const r = {
    index: 0,
    t: 0.5,
    x: 640,
    y: 360,
    angle: 0,
    finished: false,
    ...overrides,
  };
  initRacerBehavior(r);
  return r;
}

function makeLaneRacer(overrides = {}) {
  const { physicalY, ...rest } = overrides;
  const racer = makeRacer({
    frameSizePx: 40,
    trackWidthPx: 140,
    pathLengthPx: 1200,
    // Dragon-approximate body sizes (real dragon N≈40: 28.5 wide, 30.6 long; rounded).
    // pairContact: contactWidth = 28/2+28/2 = 28px, contactLength = 31/2+31/2 = 31px.
    // Gate fires when: latPx < 28×1.2=33.6 (|dY|<0.480) AND longPx < 31×1.2=37.2 (dT<0.031).
    // Free-lane fires when: latPx ≤ 28 (|dY|≤0.400) AND longPx ≤ 31 (dT≤0.0258).
    drawnBodyWidthPx: 28,
    drawnBodyLengthPx: 31,
    ...rest,
  });
  if (Number.isFinite(physicalY)) racer.physicalY = physicalY;
  return racer;
}

// Pin the hard-separation backstop OFF for the force-isolation tests below: it is
// default-on in production but would perturb physicalY here. The dedicated
// 'hard position separation' describe block opts back in explicitly (ON vs OFF).
// softSteeringEnabled pinned false: these tests verify the legacy L1–L5 force model,
// which is now the opt-out path (the default flipped to true). See storage/defaults.js.
const cfg = {
  ...DEFAULT_RACE_BEHAVIOR_CONFIG,
  hardSeparationEnabled: false,
  softSteeringEnabled: false,
};

// ── initRacerBehavior ──────────────────────────────────────────────────────

describe('initRacerBehavior', () => {
  it('sets physicalY to 0 (centerline)', () => {
    const r = makeRacer();
    expect(r.physicalY).toBe(0);
  });

  it('sets physicalYVelocity to 0', () => {
    const r = makeRacer();
    expect(r.physicalYVelocity).toBe(0);
  });

  it('sets avoidanceActive to false', () => {
    const r = makeRacer();
    expect(r.avoidanceActive).toBe(false);
  });

  it('sets draftingBoostActive to false', () => {
    const r = makeRacer();
    expect(r.draftingBoostActive).toBe(false);
  });
});

// ── applyRacerBehavior — disabled ──────────────────────────────────────────

describe('applyRacerBehavior — disabled', () => {
  it('clears avoidanceActive when disabled', () => {
    const r = makeRacer();
    r.avoidanceActive = true;
    applyRacerBehavior([r], { ...cfg, enabled: false });
    expect(r.avoidanceActive).toBe(false);
  });

  it('clears draftingBoostActive when disabled', () => {
    const r = makeRacer();
    r.draftingBoostActive = true;
    applyRacerBehavior([r], { ...cfg, enabled: false });
    expect(r.draftingBoostActive).toBe(false);
  });

  it('does not modify physicalY when disabled', () => {
    const r = makeRacer();
    r.physicalY = 0.5;
    applyRacerBehavior([r], { ...cfg, enabled: false });
    expect(r.physicalY).toBe(0.5);
  });
});

// ── Home force ──────────────────────────────────────────────────────────────

describe('applyRacerBehavior — home force', () => {
  it('moves physicalY toward 0 when displaced', () => {
    const r = makeRacer();
    r.physicalY = 0.5;
    applyRacerBehavior([r], cfg);
    expect(r.physicalY).toBeLessThan(0.5);
    expect(r.physicalY).toBeGreaterThan(0);
  });

  it('converges physicalY to near-zero over many frames', () => {
    const r = makeRacer();
    r.physicalY = 1.0;
    // Phase 5 physics (hfs=0.030, ld=0.160) converges more slowly than legacy defaults —
    // needs ~290 frames to cross 0.15 from 1.0. 360 gives a safe margin.
    for (let f = 0; f < 360; f++) applyRacerBehavior([r], cfg);
    expect(Math.abs(r.physicalY)).toBeLessThan(0.15);
  });

  it('strength controls convergence rate', () => {
    const fast = makeRacer();
    const slow = makeRacer();
    fast.physicalY = 0.5;
    slow.physicalY = 0.5;
    applyRacerBehavior([fast], { ...cfg, homeForceStrength: 0.05 });
    applyRacerBehavior([slow], { ...cfg, homeForceStrength: 0.005 });
    expect(fast.physicalY).toBeLessThan(slow.physicalY);
  });

  it('applies no home force when physicalY is exactly 0', () => {
    const r = makeRacer();
    r.physicalY = 0;
    applyRacerBehavior([r], cfg);
    expect(r.physicalY).toBe(0);
  });

  it('reduces home force by factor during active overlap', () => {
    // dT=0.001: longPx=1.2 < longTrigger(37.2) → gate passes; overlap: dT≤tHalfSpan(0.0258) ✓
    // dY=0: laterally coincident → lateral overlap ✓ → homeForceReductionOnOverlap fires
    const a = makeLaneRacer({ index: 70, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 71, t: 0.501, physicalY: 0.5 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0.04,
      homeForceReductionOnOverlap: 0.3,
      lateralForce: 0,
      lateralDamping: 0.45,
    });

    // vel = (0 + force) × damping = (-0.5×0.04×0.3) × 0.45 = -0.0027; y = 0.5 − 0.0027 = 0.4973
    expect(a.physicalY).toBeCloseTo(0.4973, 5);
  });

  it('keeps full home force when there is no overlap', () => {
    // dT=0.2: longPx=240 > longTrigger(37.2) → gate rejects → no overlap detected
    // → home force applies at full strength (no reduction)
    const a = makeLaneRacer({ index: 72, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 73, t: 0.7, physicalY: 0.5 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0.04,
      homeForceReductionOnOverlap: 0.3,
      lateralForce: 0,
      lateralDamping: 0.45,
    });

    // vel = (0 + (-0.5×0.04)) × 0.45 = -0.009; y = 0.5 − 0.009 = 0.491
    expect(a.physicalY).toBeCloseTo(0.491, 5);
  });

  it('homeForceReductionOnOverlap=1.0 disables reduction (backwards-compat)', () => {
    // Same close pair — gate passes, overlap detected, but factor=1.0 → no reduction
    const a = makeLaneRacer({ index: 74, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 75, t: 0.501, physicalY: 0.5 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0.04,
      homeForceReductionOnOverlap: 1.0,
      lateralForce: 0,
      lateralDamping: 0.45,
    });

    // Factor=1.0 (no reduction); vel = -0.5×0.04 × 0.45 = -0.009 → y = 0.491
    expect(a.physicalY).toBeCloseTo(0.491, 5);
  });

  it('homeForceReductionOnOverlap=0.0 disables home force during overlap', () => {
    // Gate passes, overlap detected, factor=0.0 → home force zeroed
    const a = makeLaneRacer({ index: 76, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 77, t: 0.501, physicalY: 0.5 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0.04,
      homeForceReductionOnOverlap: 0.0,
      lateralForce: 0,
    });

    expect(a.physicalY).toBeCloseTo(0.5, 6);
  });
});

// ── Comfort zone & boundary ────────────────────────────────────────────────

describe('applyRacerBehavior — comfort zone & boundary', () => {
  it('no soft repulsion inside comfortThreshold', () => {
    const r = makeRacer();
    r.physicalY = cfg.comfortThreshold - 0.05; // just inside
    const before = r.physicalY;
    // With homeForce pulling toward 0, displacement grows unless repulsion adds extra.
    // Run isolated to detect any repulsion contribution.
    applyRacerBehavior([r], { ...cfg, homeForceStrength: 0, softRepulsionStrength: 999 });
    // Without home force and inside threshold, repulsion should not fire → no change
    expect(r.physicalY).toBeCloseTo(before, 5);
  });

  it('soft repulsion fires outside comfortThreshold', () => {
    const r = makeRacer();
    r.physicalY = cfg.comfortThreshold + 0.1;
    applyRacerBehavior([r], { ...cfg, homeForceStrength: 0 });
    // Repulsion should push physicalY toward center
    expect(r.physicalY).toBeLessThan(cfg.comfortThreshold + 0.1);
  });

  it('soft repulsion grows as physicalY approaches 1.0', () => {
    const near = makeRacer();
    const far = makeRacer();
    near.physicalY = 0.95;
    far.physicalY = cfg.comfortThreshold + 0.01;
    applyRacerBehavior([near], { ...cfg, homeForceStrength: 0 });
    applyRacerBehavior([far], { ...cfg, homeForceStrength: 0 });
    const nearDelta = 0.95 - near.physicalY;
    const farDelta = cfg.comfortThreshold + 0.01 - far.physicalY;
    expect(nearDelta).toBeGreaterThan(farDelta);
  });

  it('hard clamp keeps physicalY within [-1, +1]', () => {
    const r = makeRacer();
    r.physicalY = 2.0; // artificially beyond boundary
    applyRacerBehavior([r], { ...cfg, homeForceStrength: 0, softRepulsionStrength: 0 });
    expect(r.physicalY).toBeLessThanOrEqual(1.0);
  });

  it('hard clamp works on negative side', () => {
    const r = makeRacer();
    r.physicalY = -2.0;
    applyRacerBehavior([r], { ...cfg, homeForceStrength: 0, softRepulsionStrength: 0 });
    expect(r.physicalY).toBeGreaterThanOrEqual(-1.0);
  });
});

// ── Avoidance ──────────────────────────────────────────────────────────────

describe('applyRacerBehavior — avoidance', () => {
  it('gate rejects pairs outside the body contact zone (lateral axis)', () => {
    // |dY|=1.0 → latPx = 1.0 × (140/2) = 70px ≥ latTrigger(28×1.2=33.6) → gate rejects
    // No avoidance, no free-lane, physicalY unchanged.
    const r1 = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.5 });
    const r2 = makeLaneRacer({ index: 1, t: 0.5, physicalY: 0.5 });
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0 });
    expect(r1.avoidanceActive).toBe(false);
    expect(r1.physicalY).toBeCloseTo(-0.5, 5);
  });

  it('gate rejects pairs outside the body contact zone (longitudinal axis)', () => {
    // dT=0.10 → longPx = 0.10×1200 = 120px ≥ longTrigger(31×1.2=37.2) → gate rejects
    const r1 = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.05 });
    const r2 = makeLaneRacer({ index: 1, t: 0.6, physicalY: 0.05 });
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0 });
    expect(r1.physicalY).toBeCloseTo(-0.05, 5);
  });

  it('yDiff≈0: trailer de-stacks deterministically, leader holds (closed, asymmetric)', () => {
    // De-stacking now runs on closed tracks. With both bodies in the same lane (yDiff=0),
    // Stage B acts on the TRAILER only — trailer yields, leader holds (the asymmetric
    // avoidance design). The trailer is pushed to a deterministic side via the stable
    // tie-direction (stablePairBit + index), so the stack resolves; the leader stays put.
    // (Symmetric opposite-direction separation needs a true overlap, dT ≤ 0.0258; here
    // dT=0.029 sits in the gate zone, so only the Stage-B trailer push fires.)
    const r1 = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0 }); // trailer (lower t)
    const r2 = makeLaneRacer({ index: 1, t: 0.529, physicalY: 0 }); // leader
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0, isOpen: false });
    expect(r1.physicalY).toBeLessThan(0); // trailer de-stacks to the deterministic tie-side
    expect(r1.physicalY).toBeCloseTo(-0.00194, 5); // measured magnitude (regression guard)
    expect(r2.physicalY).toBe(0); // leader holds

    // Determinism: identical inputs → identical de-stack (no randomness).
    const s1 = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0 });
    const s2 = makeLaneRacer({ index: 1, t: 0.529, physicalY: 0 });
    applyRacerBehavior([s1, s2], { ...cfg, homeForceStrength: 0, isOpen: false });
    expect(s1.physicalY).toBe(r1.physicalY);
    expect(s2.physicalY).toBe(r2.physicalY);
  });

  it('asymmetric: trailer yields, leader physicalY unchanged', () => {
    // dT=0.029: longPx=34.8 — gate fires (< 37.2), free-lane does NOT fire (34.8 > 31).
    // Only avoidance runs; avoidance only pushes the trailer, not the leader.
    const r1 = makeLaneRacer({ index: 0, t: 0.4, physicalY: -0.1 }); // trailer (lower t)
    const r2 = makeLaneRacer({ index: 1, t: 0.429, physicalY: 0.1 }); // leader
    const before2 = r2.physicalY;
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0 });
    expect(r2.physicalY).toBeCloseTo(before2, 5); // leader unchanged (avoidance is one-sided)
    expect(r1.physicalY).toBeLessThan(-0.1); // trailer pushed further from leader
  });

  it('trailer is pushed away from leader physicalY', () => {
    // dT=0.029: gate fires (longPx=34.8 < 37.2), free-lane skipped (34.8 > contactLength=31).
    const trailer = makeLaneRacer({ index: 0, t: 0.4, physicalY: -0.1 });
    const leader = makeLaneRacer({ index: 1, t: 0.429, physicalY: 0.1 });
    applyRacerBehavior([trailer, leader], { ...cfg, homeForceStrength: 0 });
    expect(trailer.physicalY).toBeLessThan(-0.1);
  });

  it('force magnitude scales with proximity (closer = stronger)', () => {
    // close pair: dT=0.01 → longPx=12 < longTrigger(37.2) → gate fires
    const close1 = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.05 });
    const close2 = makeLaneRacer({ index: 1, t: 0.51, physicalY: 0.05 });
    // far pair: dT=0.08 → longPx=96 ≥ longTrigger(37.2) → gate rejects entirely
    const far1 = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.05 });
    const far2 = makeLaneRacer({ index: 1, t: 0.58, physicalY: 0.05 });
    applyRacerBehavior([close1, close2], { ...cfg, homeForceStrength: 0 });
    applyRacerBehavior([far1, far2], { ...cfg, homeForceStrength: 0 });
    // close: gate fires → trailer moves; far: gate rejects → no avoidance force
    expect(Math.abs(close1.physicalY - -0.05)).toBeGreaterThan(0);
    expect(Math.abs(far1.physicalY - -0.05)).toBe(0);
  });

  it('gate geometry: rejects on each axis independently, fires when both axes inside zone', () => {
    // ── Longitudinal rejection ──
    // dT=0.10: longPx = 0.10×1200 = 120 ≥ longTrigger(31×1.2=37.2) → gate rejects
    const lonA = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.01 });
    const lonB = makeLaneRacer({ index: 1, t: 0.6, physicalY: 0.01 });
    applyRacerBehavior([lonA, lonB], { ...cfg, homeForceStrength: 0 });
    expect(lonA.physicalY).toBeCloseTo(-0.01, 5);

    // ── Lateral rejection ──
    // |dY|=0.8: latPx = 0.8×70 = 56 ≥ latTrigger(28×1.2=33.6) → gate rejects
    const latA = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.4 });
    const latB = makeLaneRacer({ index: 1, t: 0.501, physicalY: 0.4 });
    applyRacerBehavior([latA, latB], { ...cfg, homeForceStrength: 0 });
    expect(latA.physicalY).toBeCloseTo(-0.4, 5);

    // ── Both axes inside zone → gate fires ──
    // |dY|=0.1: latPx=7 < 33.6; dT=0.01: longPx=12 < 37.2 → gate fires → trailer moves
    const inA = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.05 });
    const inB = makeLaneRacer({ index: 1, t: 0.51, physicalY: 0.05 });
    applyRacerBehavior([inA, inB], { ...cfg, homeForceStrength: 0 });
    expect(inA.physicalY).toBeLessThan(-0.05);
  });

  it('finished racers are not affected by avoidance', () => {
    const r1 = makeRacer({ index: 0, t: 0.5, x: 200, y: 200, finished: true });
    const r2 = makeRacer({ index: 1, t: 0.51, x: 200, y: 200 });
    r1.physicalY = 0.3;
    r2.physicalY = 0;
    applyRacerBehavior([r1, r2], cfg);
    expect(r1.physicalY).toBe(0.3); // not modified
  });

  it('anti-stacking: force with 4 neighbors is sqrt(4)× solo force, not 4×', () => {
    // Real geometry: makeLaneRacer (trackWidthPx=140, pathLengthPx=1200, drawnBodyWidthPx=28).
    // physicalY=±0.2: dY=0.4 → latPx=28 < latTrigger(33.6); dT=0.01 → longPx=12 < longTrigger(37.2).
    // Gate fires. Both avoidance and free-lane normalized by sqrt(neighborCount).
    // r0 has 4 identical neighbors: each force = solo force → delta5 = 4×force/√4 = 2×deltaSolo.
    const solo0 = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.2 });
    const solo1 = makeLaneRacer({ index: 1, t: 0.51, physicalY: 0.2 });
    applyRacerBehavior([solo0, solo1], { ...cfg, homeForceStrength: 0 });
    const deltaSolo = Math.abs(solo0.physicalY - -0.2);

    const r0 = makeLaneRacer({ index: 0, t: 0.5, physicalY: -0.2 });
    const r1 = makeLaneRacer({ index: 1, t: 0.51, physicalY: 0.2 });
    const r2 = makeLaneRacer({ index: 2, t: 0.51, physicalY: 0.2 });
    const r3 = makeLaneRacer({ index: 3, t: 0.51, physicalY: 0.2 });
    const r4 = makeLaneRacer({ index: 4, t: 0.51, physicalY: 0.2 });
    applyRacerBehavior([r0, r1, r2, r3, r4], { ...cfg, homeForceStrength: 0 });
    const delta5 = Math.abs(r0.physicalY - -0.2);

    // Without normalization delta5 would be 4×deltaSolo. With sqrt(4) it is 2×.
    expect(delta5).toBeCloseTo(2 * deltaSolo, 3);
  });

  it('avoidance produces measurable spread over 60 frames in a tight pack', () => {
    // Real geometry (makeLaneRacer). Adjacent racers: dT=0.001 → longPx=1.2 < longTrigger(37.2).
    // Initial dY pairs ≤ 0.06 → latPx ≤ 4.2 < latTrigger(33.6) — gate fires.
    const racers = [
      makeLaneRacer({ index: 0, t: 0.5 }),
      makeLaneRacer({ index: 1, t: 0.501 }),
      makeLaneRacer({ index: 2, t: 0.502 }),
      makeLaneRacer({ index: 3, t: 0.503 }),
    ];
    racers[0].physicalY = -0.03;
    racers[1].physicalY = -0.01;
    racers[2].physicalY = 0.01;
    racers[3].physicalY = 0.03;
    for (let f = 0; f < 60; f++) applyRacerBehavior(racers, cfg);
    const spread =
      Math.max(...racers.map((r) => r.physicalY)) - Math.min(...racers.map((r) => r.physicalY));
    expect(spread).toBeGreaterThan(0.05);
  });
});

// ── Free-lane separation ───────────────────────────────────────────────────

describe('applyRacerBehavior — free-lane separation', () => {
  it('overlap + both sides free: geometric rule separates left/right', () => {
    const left = makeLaneRacer({ index: 10, t: 0.5, physicalY: -0.03 });
    const right = makeLaneRacer({ index: 11, t: 0.501, physicalY: 0.03 });

    applyRacerBehavior([left, right], {
      ...cfg,
      homeForceStrength: 0,
    });

    expect(left.physicalY).toBeLessThan(-0.03);
    expect(right.physicalY).toBeGreaterThan(0.03);
  });

  it('one racer has a single free side: it uses that side, other follows geometric rule', () => {
    const a = makeLaneRacer({ index: 20, t: 0.5, physicalY: -0.03 }); // geometric-left racer
    const b = makeLaneRacer({ index: 21, t: 0.501, physicalY: 0.03 });
    // Block B's right side only.
    const rightBlocker = makeLaneRacer({ index: 22, t: 0.501, physicalY: 0.03 + 40 / 140 });

    applyRacerBehavior([a, b, rightBlocker], {
      ...cfg,
      homeForceStrength: 0,
    });

    expect(a.physicalY).toBeLessThan(-0.03);
    expect(b.physicalY).toBeLessThan(0.03);
  });

  it('A only left free + B only right free: A goes left, B goes right', () => {
    const a = makeLaneRacer({ index: 30, t: 0.5, physicalY: -0.03 });
    const b = makeLaneRacer({ index: 31, t: 0.501, physicalY: 0.03 });
    const blockAOnRight = makeLaneRacer({ index: 32, t: 0.5, physicalY: -0.03 + 40 / 140 });
    const blockBOnLeft = makeLaneRacer({ index: 33, t: 0.501, physicalY: 0.03 - 40 / 140 });

    applyRacerBehavior([a, b, blockAOnRight, blockBOnLeft], {
      ...cfg,
      homeForceStrength: 0,
    });

    expect(a.physicalY).toBeLessThan(-0.03);
    expect(b.physicalY).toBeGreaterThan(0.03);
  });

  it('yDiff≈0 with all sides blocked: central pair de-stacks deterministically (closed)', () => {
    // De-stacking now runs on closed tracks. The central overlapping pair (a, b) both sit
    // at physicalY=0; each is a trailer in some pair (a behind b; b ahead of its same-t
    // blockers by index tie-break), so Stage B pushes both to the deterministic tie-side.
    // Previously this asserted "no movement" via isOpen:false disabling Stage B — that
    // isolation is gone. The result is bounded and reproducible (no randomness).
    const make = () => {
      const a = makeLaneRacer({ index: 40, t: 0.5, physicalY: 0.0 });
      const b = makeLaneRacer({ index: 41, t: 0.501, physicalY: 0.0 });
      const blockALeft = makeLaneRacer({ index: 42, t: 0.5, physicalY: -40 / 140 });
      const blockARight = makeLaneRacer({ index: 43, t: 0.5, physicalY: 40 / 140 });
      const blockBLeft = makeLaneRacer({ index: 44, t: 0.501, physicalY: -40 / 140 });
      const blockBRight = makeLaneRacer({ index: 45, t: 0.501, physicalY: 40 / 140 });
      applyRacerBehavior([a, b, blockALeft, blockARight, blockBLeft, blockBRight], {
        ...cfg,
        homeForceStrength: 0,
        isOpen: false,
      });
      return { a, b };
    };
    const { a, b } = make();
    expect(a.physicalY).toBeLessThan(0); // de-stacks to the deterministic tie-side
    expect(b.physicalY).toBeLessThan(0);
    expect(a.physicalY).toBeCloseTo(-0.002736, 5); // measured magnitude (regression guard)
    expect(b.physicalY).toBeCloseTo(-0.00191086, 5);

    // Determinism: identical inputs → identical de-stack.
    const second = make();
    expect(second.a.physicalY).toBe(a.physicalY);
    expect(second.b.physicalY).toBe(b.physicalY);
  });

  it('exact same physicalY uses deterministic tie direction', () => {
    const mkPair = () => [
      makeLaneRacer({ index: 50, name: 'Alpha', t: 0.5, physicalY: 0 }),
      makeLaneRacer({ index: 51, name: 'Beta', t: 0.501, physicalY: 0 }),
    ];

    const [a1, b1] = mkPair();
    applyRacerBehavior([a1, b1], { ...cfg, homeForceStrength: 0 });
    const out1 = [a1.physicalY, b1.physicalY];

    const [a2, b2] = mkPair();
    applyRacerBehavior([a2, b2], { ...cfg, homeForceStrength: 0 });
    const out2 = [a2.physicalY, b2.physicalY];

    expect(out1).toEqual(out2);
    expect(Math.abs(out1[0])).toBeGreaterThan(0);
    expect(Math.abs(out1[1])).toBeGreaterThan(0);
  });

  it('free-lane movement respects maxLateral clamp (no jump outside cap)', () => {
    const a = makeLaneRacer({ index: 60, t: 0.5, physicalY: -0.94 });
    const b = makeLaneRacer({ index: 61, t: 0.501, physicalY: -0.94 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0,
      maxLateral: 0.95,
    });

    expect(a.physicalY).toBeGreaterThanOrEqual(-0.95);
    expect(a.physicalY).toBeLessThanOrEqual(0.95);
    expect(b.physicalY).toBeGreaterThanOrEqual(-0.95);
    expect(b.physicalY).toBeLessThanOrEqual(0.95);
  });
});

// ── Speed brake ────────────────────────────────────────────────────────────

describe('applyRacerBehavior — speed brake', () => {
  it('sets avoidanceActive on trailer when side-by-side within dynamic threshold', () => {
    // drawnBodyLengthPx=31, pathLengthPx=1200, multiplier=1.5 → dynamicT = 31/1200*1.5 = 0.03875
    // drawnBodyWidthPx=28, trackWidthPx=140 → sameLaneY = 28/70 = 0.400
    // dT=0.01 < 0.03875 AND |dY|=0.0 < 0.400 → brake fires
    const trailer = makeLaneRacer({ index: 0, t: 0.5, x: 200, y: 200, physicalY: 0.05 });
    const leader = makeLaneRacer({ index: 1, t: 0.51, x: 200, y: 200, physicalY: 0.05 });
    applyRacerBehavior([trailer, leader], {
      ...cfg,
      homeForceStrength: 0,
      speedBrakeTMultiplier: 1.5,
    });
    expect(trailer.avoidanceActive).toBe(true);
  });

  it('dynamic threshold scales with body size and path length', () => {
    // dynamicT = brakeContactLength / pathLengthPx * speedBrakeTMultiplier
    // brakeContactLength = drawnBodyLengthPx/2 + drawnBodyLengthPx/2 = 31px (makeLaneRacer)
    // pathLengthPx=1200, multiplier=1.5 → dynamicT = 31/1200*1.5 = 0.038750
    // Place trailer just inside threshold (dT=0.037) → fires
    const inside = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.0 });
    const leader1 = makeLaneRacer({ index: 1, t: 0.537, physicalY: 0.0 });
    applyRacerBehavior([inside, leader1], {
      ...cfg,
      homeForceStrength: 0,
      speedBrakeTMultiplier: 1.5,
    });
    expect(inside.avoidanceActive).toBe(true);

    // Place trailer just outside threshold (dT=0.041) → does not fire
    const outside = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.0 });
    const leader2 = makeLaneRacer({ index: 1, t: 0.541, physicalY: 0.0 });
    applyRacerBehavior([outside, leader2], {
      ...cfg,
      homeForceStrength: 0,
      speedBrakeTMultiplier: 1.5,
    });
    expect(outside.avoidanceActive).toBe(false);
  });

  it('same-lane filter: no brake when |dY| exceeds body contact width', () => {
    // drawnBodyWidthPx=28, trackWidthPx=140 → sameLaneY = 28/70 = 0.400
    // physicalY diff = 0.5 - (-0.5) = 1.0 > 0.400 → racers in different lanes, no brake
    const trailer = makeLaneRacer({ index: 0, t: 0.5, x: 200, y: 200, physicalY: -0.5 });
    const leader = makeLaneRacer({ index: 1, t: 0.51, x: 200, y: 200, physicalY: 0.5 });
    applyRacerBehavior([trailer, leader], {
      ...cfg,
      homeForceStrength: 0,
      speedBrakeTMultiplier: 1.5,
    });
    expect(trailer.avoidanceActive).toBe(false);
  });

  it('same-lane filter: brakes just inside body-width, no brake just outside', () => {
    // drawnBodyWidthPx=28, trackWidthPx=140 → sameLaneY = 28/70 = 0.400
    // dynamicT = 31/1200*1.5 = 0.03875 (longitudinal zone for makeLaneRacer)
    // inside: |dY|=0.35 < 0.400 AND dT=0.037 < 0.03875 → fires
    const trailerIn = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.0 });
    const leaderIn = makeLaneRacer({ index: 1, t: 0.537, physicalY: 0.35 });
    applyRacerBehavior([trailerIn, leaderIn], {
      ...cfg,
      homeForceStrength: 0,
      speedBrakeTMultiplier: 1.5,
    });
    expect(trailerIn.avoidanceActive).toBe(true);

    // outside: |dY|=0.45 > 0.400 → no brake even though longitudinally close
    const trailerOut = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.0 });
    const leaderOut = makeLaneRacer({ index: 1, t: 0.537, physicalY: 0.45 });
    applyRacerBehavior([trailerOut, leaderOut], {
      ...cfg,
      homeForceStrength: 0,
      speedBrakeTMultiplier: 1.5,
    });
    expect(trailerOut.avoidanceActive).toBe(false);
  });
});

// ── Drafting ──────────────────────────────────────────────────────────────

describe('applyRacerBehavior — drafting cone', () => {
  it('grants boost when follower is directly behind leader', () => {
    // Leader moving right (angle=0), follower directly to the left of leader
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 }); // behind
    leader.physicalY = 0;
    follower.physicalY = 0;
    applyRacerBehavior([leader, follower], {
      ...cfg,
      homeForceStrength: 0,
      draftingMaxDistance: 200,
      draftingConeAngle: 60,
    });
    expect(follower.draftingBoostActive).toBe(true);
    expect(leader.draftingBoostActive).toBe(false);
  });

  it('no boost when follower is outside cone', () => {
    // Leader moving right (angle=0), follower is to the right (ahead, not behind)
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 300, y: 300, angle: 0 }); // in front
    leader.physicalY = 0;
    follower.physicalY = 0;
    applyRacerBehavior([leader, follower], {
      ...cfg,
      homeForceStrength: 0,
      draftingMaxDistance: 200,
      draftingConeAngle: 60,
    });
    expect(follower.draftingBoostActive).toBe(false);
  });

  it('no boost when follower is too far away', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 500, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 }); // 400px away
    leader.physicalY = 0;
    follower.physicalY = 0;
    applyRacerBehavior([leader, follower], {
      ...cfg,
      homeForceStrength: 0,
      draftingMaxDistance: 110,
      draftingConeAngle: 60,
    });
    expect(follower.draftingBoostActive).toBe(false);
  });

  it('no boost when follower is actually ahead of leader in t', () => {
    const ahead = makeRacer({ index: 0, t: 0.52, x: 200, y: 300, angle: 0 });
    const behind = makeRacer({ index: 1, t: 0.5, x: 100, y: 300, angle: 0 });
    ahead.physicalY = 0;
    behind.physicalY = 0;
    applyRacerBehavior([ahead, behind], {
      ...cfg,
      homeForceStrength: 0,
      draftingMaxDistance: 200,
      draftingConeAngle: 60,
    });
    // "behind" is the follower but relative to "ahead" which is the leader — boost should apply
    expect(behind.draftingBoostActive).toBe(true);
    // "ahead" should NOT get boost (it's the leader)
    expect(ahead.draftingBoostActive).toBe(false);
  });

  it('no boost when behavior disabled', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 });
    leader.physicalY = 0;
    follower.physicalY = 0;
    applyRacerBehavior([leader, follower], { ...cfg, enabled: false });
    expect(follower.draftingBoostActive).toBe(false);
  });
});

// ── applyRacerBehavior — track-relative lateralForce scaling ─────────────

describe('applyRacerBehavior — track-relative lateralForce scaling', () => {
  // Fix latPx across both racers so latFraction is identical → only lateralScale varies.
  // dT=0.029 chosen so: longPx=34.8 is inside gate (< longTrigger=37.2) but outside
  // free-lane zone (> contactLength=31), isolating pure avoidance force.
  // De-stacking now runs on all tracks, so Stage B is no longer flag-gated. The
  // scale-ratio test (below) isolates pure base avoidance via GEOMETRY instead: it uses
  // a lateral offset large enough that Stage B's same-lane gate (|yDiff| < sameLaneHH)
  // does not fire. The two clamp tests keep a small latPx but compare EQUAL-latPx pairs,
  // so any Stage-B force is identical on both sides and cancels in the equality.
  // contactWidth=28 (drawnBodyWidthPx from makeLaneRacer) → latTrigger=33.6px.
  // rA (index=0) is trailer (lower index, same t) → pushed in positive direction by avoidance.
  function avoidDeltaFixedPx(trackW, latPxTarget) {
    const halfTW = trackW / 2;
    const physicalYOffset = latPxTarget / halfTW; // same latPx regardless of track width
    const rA = makeLaneRacer({ index: 0, t: 0.5, trackWidthPx: trackW });
    const rB = makeLaneRacer({ index: 1, t: 0.529, trackWidthPx: trackW });
    rA.physicalY = physicalYOffset;
    rB.physicalY = -physicalYOffset;
    // commitDirDeadZoneY: 0 isolates lateralScale — the tiny latPx here yields relPos values
    // that would otherwise straddle the default dead-zone (pairTieDir vs sign(relPos)) across the
    // two compared track widths. With the dead-zone off, both sides use sign(relPos) and any
    // Stage-B force is identical on both, cancelling in the equality.
    applyRacerBehavior([rA, rB], { ...cfg, homeForceStrength: 0, commitDirDeadZoneY: 0 });
    return rA.physicalY - physicalYOffset;
  }

  it('scale = 1.0 at reference width (98 px), 0.5 at double reference (196 px)', () => {
    // Isolate base avoidance scaling via geometry: latPx=15 ≥ 14 keeps Stage B silent
    // (|yDiff| = 4·latPx/trackW ≥ sameLaneHH = 56/trackW ⇔ latPx ≥ 14), while the gate
    // still fires (gate latPx = 2·latPx = 30 < latTrigger 33.6). Same latPx → same
    // latFraction → only lateralScale differs (98/98=1.0 vs 98/196=0.5) → ratio 0.5.
    const delta98 = avoidDeltaFixedPx(98, 15);
    const delta196 = avoidDeltaFixedPx(196, 15);
    expect(delta98).toBeGreaterThan(0); // gate fires, force non-zero at reference width
    expect(delta196).toBeCloseTo(delta98 * 0.5, 10);
  });

  it('scale clamped to 0.1 for very wide tracks — 1000 px and 2000 px give the same delta', () => {
    // lateralScale = clamp(98/1000, 0.1, 3.0) = 0.1 = clamp(98/2000, 0.1, 3.0).
    // Same latPx=7 → same latFraction → only lateralScale differs (both 0.1 → same).
    expect(avoidDeltaFixedPx(1000, 7)).toBeCloseTo(avoidDeltaFixedPx(2000, 7), 10);
  });

  it('scale clamped to 3.0 for very narrow tracks — 10 px and 20 px give the same delta', () => {
    // lateralScale = clamp(98/10, 0.1, 3.0) = 3.0; clamp(98/20, 0.1, 3.0) = 3.0.
    // latPxTarget=0.1 keeps physicalYOffset well within [-1,+1] for 10px-wide tracks.
    // Same latPx → same latFraction → same forceMag → only lateralScale (both 3.0).
    expect(avoidDeltaFixedPx(10, 0.1)).toBeCloseTo(avoidDeltaFixedPx(20, 0.1), 10);
  });
});

// ── Lateral velocity + damping ──────────────────────────────────────────────

describe('applyRacerBehavior — lateral velocity + damping', () => {
  it('velocity carries over: frame-2 displacement is larger than frame-1', () => {
    const r = makeRacer();
    r.physicalY = 0.5;
    applyRacerBehavior([r], cfg);
    const delta1 = 0.5 - r.physicalY;
    const y1 = r.physicalY;
    applyRacerBehavior([r], cfg);
    const delta2 = y1 - r.physicalY;
    // On frame 2 velocity from frame 1 carries over, so displacement grows
    expect(delta2).toBeGreaterThan(delta1);
  });

  it('velocity is reset to 0 when physicalY is clamped at the boundary', () => {
    const r = makeRacer();
    r.physicalY = 2.0; // beyond maxLateral — will be clamped
    r.physicalYVelocity = 0.5; // outward momentum
    applyRacerBehavior([r], { ...cfg, homeForceStrength: 0, softRepulsionStrength: 0 });
    expect(r.physicalYVelocity).toBe(0);
    expect(r.physicalY).toBeLessThanOrEqual(cfg.maxLateral);
  });
});

// ── brake-to-match regressions (Step 1) ───────────────────────────────────────

describe('applyRacerBehavior — brake-to-match regressions', () => {
  function makeLanePair(trailerSpeed, leaderSpeed) {
    const leader = makeLaneRacer({ index: 1, t: 0.41, baseSpeed: leaderSpeed });
    const trailer = makeLaneRacer({ index: 0, t: 0.4, baseSpeed: trailerSpeed });
    return [trailer, leader];
  }

  it('avoidanceActive still fires on trailer when inside proximity zone under new cap', () => {
    const [trailer, leader] = makeLanePair(1.2e-4, 1.0e-4);
    applyRacerBehavior([trailer, leader], cfg);
    expect(trailer.avoidanceActive).toBe(true);
  });

  it('brakeMatchFactor is 1.0 (no extra cap) when trailer speed is within min-diff of leader', () => {
    // Trailer only 0.1% faster — below the 0.5% minDifferential threshold
    const [trailer, leader] = makeLanePair(1.001e-4, 1.0e-4);
    applyRacerBehavior([trailer, leader], cfg);
    expect(trailer.brakeMatchFactor).toBe(1.0);
  });
});

// ── Hard position separation (Layer 2, behind hardSeparationEnabled flag) ────
// Isolated by comparing ON vs OFF on identical inputs: any difference is caused
// solely by the separation pass (every other force is identical between the two).

describe('hard position separation', () => {
  // Bodies: contactWidth = 28px, contactLength = 31px, trackWidth 140, pathLength 1200.
  // Tolerance (default 0.10) → separation engages/stops one band inside contact:
  //   latTargetPx = 28 × (1 − 0.10) = 25.2px.
  const CONTACT_W = 28;
  const latTargetPx = CONTACT_W * (1 - cfg.hardSeparationTolerancePct); // 25.2
  // True overlap: same t (dT=0), physicalY 0.02 apart → 1.4px ≪ latTarget → deep overlap.
  const overlapPair = () => [
    makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.01 }),
    makeLaneRacer({ index: 1, t: 0.5, physicalY: -0.01 }),
  ];
  const gapPx = (a, b) => Math.abs(a.physicalY - b.physicalY) * (140 / 2);
  // No-clock callers (no priorityExtras) → warmupScale = 1 (full strength).
  const onFull = (relax = 1.0) => ({
    ...cfg,
    hardSeparationEnabled: true,
    hardSeparationRelaxation: relax,
  });

  it('flag OFF (explicit): zero effect — overlapping pair stays overlapping', () => {
    const [a, b] = overlapPair();
    applyRacerBehavior([a, b], { ...cfg, hardSeparationEnabled: false });
    expect(gapPx(a, b)).toBeLessThan(latTargetPx); // still interpenetrating, pass did not run
  });

  it('flag ON vs OFF: ON opens the gap to the tolerance boundary, OFF does not', () => {
    const [aOff, bOff] = overlapPair();
    const [aOn, bOn] = overlapPair();
    applyRacerBehavior([aOff, bOff], { ...cfg, hardSeparationEnabled: false });
    applyRacerBehavior([aOn, bOn], onFull(1.0));
    expect(gapPx(aOn, bOn)).toBeGreaterThan(gapPx(aOff, bOff));
    expect(gapPx(aOn, bOn)).toBeGreaterThanOrEqual(latTargetPx - 1e-6); // separated to tolerance
  });

  it('flag ON: separation is symmetric — each racer moves an equal, opposite amount', () => {
    // Zero the lateral forces so the ONLY thing moving physicalY is the separation pass.
    const noForce = {
      ...onFull(1.0),
      lateralForce: 0,
      homeForceStrength: 0,
      softRepulsionStrength: 0,
    };
    const [a, b] = overlapPair(); // +0.01 / −0.01, symmetric about 0
    applyRacerBehavior([a, b], noForce);
    expect(gapPx(a, b)).toBeGreaterThanOrEqual(latTargetPx - 1e-6); // separated
    expect(a.physicalY + b.physicalY).toBeCloseTo(0, 9); // midpoint preserved
    expect(Math.abs(a.physicalY - 0.01)).toBeCloseTo(Math.abs(b.physicalY + 0.01), 9); // equal travel
  });

  it('flag ON: relaxation < 1 resolves only a fraction per frame (smooth, no snap)', () => {
    const [aOff, bOff] = overlapPair();
    const [aHalf, bHalf] = overlapPair();
    const [aFull, bFull] = overlapPair();
    applyRacerBehavior([aOff, bOff], { ...cfg, hardSeparationEnabled: false });
    applyRacerBehavior([aHalf, bHalf], onFull(0.5));
    applyRacerBehavior([aFull, bFull], onFull(1.0));
    expect(gapPx(aHalf, bHalf)).toBeGreaterThan(gapPx(aOff, bOff));
    expect(gapPx(aHalf, bHalf)).toBeLessThan(gapPx(aFull, bFull));
  });

  it('flag ON: soft stop — separation halts at the tolerance boundary, not full contact', () => {
    const noForce = {
      ...onFull(1.0),
      lateralForce: 0,
      homeForceStrength: 0,
      softRepulsionStrength: 0,
    };
    const [a, b] = overlapPair();
    applyRacerBehavior([a, b], noForce);
    expect(gapPx(a, b)).toBeCloseTo(latTargetPx, 5); // exactly the tolerance boundary (25.2)
    expect(gapPx(a, b)).toBeLessThan(CONTACT_W); // NOT pushed to full contact (28)
  });

  it('flag ON: does NOT engage when the overlap is within the tolerance dead-zone', () => {
    const noForce = {
      ...onFull(1.0),
      lateralForce: 0,
      homeForceStrength: 0,
      softRepulsionStrength: 0,
    };
    // 0.19 → gap 26.6px: inside the tolerance band (25.2 < 26.6 < 28) → no separation.
    const a = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.19 });
    const b = makeLaneRacer({ index: 1, t: 0.5, physicalY: -0.19 });
    applyRacerBehavior([a, b], noForce);
    expect(a.physicalY).toBeCloseTo(0.19, 9); // untouched
    expect(b.physicalY).toBeCloseTo(-0.19, 9);
  });

  it('warmup ramp: no separation at raceElapsedMs=0 (warmupScale 0), on open AND closed', () => {
    const base = {
      ...onFull(1.0),
      lateralForce: 0,
      homeForceStrength: 0,
      softRepulsionStrength: 0,
      avoidanceWarmupMs: 3000,
    };
    for (const isOpen of [true, false]) {
      const [a, b] = overlapPair();
      // priorityExtras supplies currentTs → the warmup clock. currentTs=0 → scale 0.
      applyRacerBehavior([a, b], { ...base, isOpen }, { currentTs: 0, cooldownMs: 500 });
      expect(a.physicalY).toBeCloseTo(0.01, 9); // unchanged — strength ramped to 0
      expect(b.physicalY).toBeCloseTo(-0.01, 9);
    }
  });

  it('warmup ramp: half warmup separates less than full warmup', () => {
    const base = {
      ...onFull(1.0),
      lateralForce: 0,
      homeForceStrength: 0,
      softRepulsionStrength: 0,
      avoidanceWarmupMs: 3000,
    };
    const [aH, bH] = overlapPair();
    const [aF, bF] = overlapPair();
    applyRacerBehavior([aH, bH], base, { currentTs: 1500, cooldownMs: 500 }); // half warmup
    applyRacerBehavior([aF, bF], base, { currentTs: 3000, cooldownMs: 500 }); // full warmup
    expect(gapPx(aH, bH)).toBeGreaterThan(gapPx(overlapPair()[0], overlapPair()[1])); // some effect
    expect(gapPx(aH, bH)).toBeLessThan(gapPx(aF, bF)); // but weaker than full
  });

  it('flag ON: never pushes a racer past the maxLateral boundary; uses longitudinal emergency', () => {
    // Both pinned at the outer boundary in the same lane → lateral push has no room.
    const cap = Math.min(cfg.maxLateral, 1.0);
    const a = makeLaneRacer({ index: 0, t: 0.5, physicalY: cap });
    const b = makeLaneRacer({ index: 1, t: 0.5001, physicalY: cap });
    const dtBefore = Math.abs(a.t - b.t);
    applyRacerBehavior([a, b], onFull(1.0));
    expect(Math.abs(a.physicalY)).toBeLessThanOrEqual(cap + 1e-9);
    expect(Math.abs(b.physicalY)).toBeLessThanOrEqual(cap + 1e-9);
    expect(Math.abs(a.t - b.t)).toBeGreaterThan(dtBefore); // emergency opened the t-gap
  });

  it('flag ON vs OFF: a well-separated pair is bit-identical (pass is a no-op)', () => {
    const mk = () => [
      makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.6 }),
      makeLaneRacer({ index: 1, t: 0.5, physicalY: -0.6 }),
    ];
    const [aOff, bOff] = mk();
    const [aOn, bOn] = mk();
    applyRacerBehavior([aOff, bOff], { ...cfg, hardSeparationEnabled: false });
    applyRacerBehavior([aOn, bOn], onFull(1.0));
    // 84px apart ≫ 28px contact → no overlap → ON and OFF must match exactly.
    expect(aOn.physicalY).toBe(aOff.physicalY);
    expect(bOn.physicalY).toBe(bOff.physicalY);
  });
});
