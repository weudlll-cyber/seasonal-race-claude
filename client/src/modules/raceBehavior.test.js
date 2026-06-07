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
    ...rest,
  });
  if (Number.isFinite(physicalY)) racer.physicalY = physicalY;
  return racer;
}

const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };

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
    const a = makeLaneRacer({ index: 70, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 71, t: 0.501, physicalY: 0.5 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0.04,
      homeForceReductionOnOverlap: 0.3,
      avoidanceDistance: 1.0,
      lateralForce: 0,
      lateralDamping: 0.45,
    });

    // Force delta = -0.5×0.04×0.3 = -0.006; with damping 0.45: vel = -0.0027 → y = 0.4973
    expect(a.physicalY).toBeCloseTo(0.4973, 5);
  });

  it('keeps full home force when there is no overlap', () => {
    const a = makeLaneRacer({ index: 72, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 73, t: 0.7, physicalY: 0.5 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0.04,
      homeForceReductionOnOverlap: 0.3,
      avoidanceDistance: 1.0,
      lateralForce: 0,
      lateralDamping: 0.45,
    });

    // Force delta = -0.5×0.04 = -0.02; with damping 0.45: vel = -0.009 → y = 0.491
    expect(a.physicalY).toBeCloseTo(0.491, 5);
  });

  it('homeForceReductionOnOverlap=1.0 disables reduction (backwards-compat)', () => {
    const a = makeLaneRacer({ index: 74, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 75, t: 0.501, physicalY: 0.5 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0.04,
      homeForceReductionOnOverlap: 1.0,
      avoidanceDistance: 1.0,
      lateralForce: 0,
      lateralDamping: 0.45,
    });

    // Factor=1.0 (no reduction); delta = -0.02; with damping 0.45: vel = -0.009 → y = 0.491
    expect(a.physicalY).toBeCloseTo(0.491, 5);
  });

  it('homeForceReductionOnOverlap=0.0 disables home force during overlap', () => {
    const a = makeLaneRacer({ index: 76, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 77, t: 0.501, physicalY: 0.5 });

    applyRacerBehavior([a, b], {
      ...cfg,
      homeForceStrength: 0.04,
      homeForceReductionOnOverlap: 0.0,
      avoidanceDistance: 1.0,
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
  it('no effect when anisotropic distance exceeds avoidanceDistance', () => {
    const r1 = makeRacer({ index: 0, t: 0.0, x: 0, y: 0 });
    const r2 = makeRacer({ index: 1, t: 0.5, x: 0, y: 0 }); // deltaT=0.5 → large dist
    r1.physicalY = 0;
    r2.physicalY = 0;
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0 });
    expect(r1.avoidanceActive).toBe(false);
    expect(r2.avoidanceActive).toBe(false);
  });

  it('no lateral force when both racers share the same physicalY (yDiff≈0, B2)', () => {
    const r1 = makeRacer({ index: 0, t: 0.4, x: 100, y: 200 });
    const r2 = makeRacer({ index: 1, t: 0.41, x: 100, y: 200 });
    r1.physicalY = 0;
    r2.physicalY = 0;
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    // Neither racer should be pushed (no meaningful yDiff direction)
    expect(r1.physicalY).toBe(0);
    expect(r2.physicalY).toBe(0);
  });

  it('asymmetric: trailer yields, leader physicalY unchanged', () => {
    // r1 (lower t) is trailer; r2 (higher t) is leader — start at different Y
    const r1 = makeRacer({ index: 0, t: 0.4, x: 100, y: 200 });
    const r2 = makeRacer({ index: 1, t: 0.41, x: 100, y: 200 });
    r1.physicalY = -0.1; // trailer slightly below leader
    r2.physicalY = 0.1;
    const before2 = r2.physicalY;
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    // Leader (r2) should not change (no avoidance force applied to leader)
    expect(r2.physicalY).toBeCloseTo(before2, 5);
    // Trailer (r1) should be pushed further negative (away from leader's Y)
    expect(r1.physicalY).toBeLessThan(-0.1);
  });

  it('trailer is pushed away from leader physicalY', () => {
    // trailer below leader → pushed further below (more negative)
    const trailer = makeRacer({ index: 0, t: 0.4, x: 200, y: 200 });
    const leader = makeRacer({ index: 1, t: 0.41, x: 200, y: 200 });
    trailer.physicalY = -0.1; // below leader
    leader.physicalY = 0.1;
    applyRacerBehavior([trailer, leader], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    expect(trailer.physicalY).toBeLessThan(-0.1);
  });

  it('force magnitude scales with proximity (closer = stronger)', () => {
    const close1 = makeRacer({ index: 0, t: 0.4, x: 0, y: 0 });
    const close2 = makeRacer({ index: 1, t: 0.41, x: 0, y: 0 });
    const far1 = makeRacer({ index: 0, t: 0.4, x: 0, y: 0 });
    const far2 = makeRacer({ index: 1, t: 0.48, x: 0, y: 0 }); // larger deltaT = more distant
    // Give each pair different physicalY so yDiff ≠ 0 (avoidance needs a direction)
    close1.physicalY = -0.05;
    close2.physicalY = 0.05;
    far1.physicalY = -0.05;
    far2.physicalY = 0.05;

    applyRacerBehavior([close1, close2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    applyRacerBehavior([far1, far2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });

    // Trailers are pushed; the closer pair should push more
    expect(Math.abs(close1.physicalY)).toBeGreaterThan(Math.abs(far1.physicalY));
  });

  it('anisotropic distance: deltaT×tWeight > deltaY×yWeight when tWeight is high', () => {
    // Two racers same physicalY but different t: with tWeight=10, huge t-distance
    const r1 = makeRacer({ index: 0, t: 0.0, x: 0, y: 0 });
    const r2 = makeRacer({ index: 1, t: 0.12, x: 0, y: 0 }); // deltaT=0.12
    r1.physicalY = 0;
    r2.physicalY = 0;
    // With tWeight=10: dist = 0.12*10 = 1.2 > avoidanceDistance(0.35) → no avoidance
    applyRacerBehavior([r1, r2], {
      ...cfg,
      homeForceStrength: 0,
      tWeight: 10,
      avoidanceDistance: 0.35,
    });
    expect(r1.avoidanceActive).toBe(false);

    // Same pair, tWeight=0.1: dist = 0.12*0.1 = 0.012 < 0.35 → avoidance fires.
    // Give different physicalY so the yDiff direction is defined.
    const r3 = makeRacer({ index: 0, t: 0.0, x: 0, y: 0 });
    const r4 = makeRacer({ index: 1, t: 0.12, x: 0, y: 0 });
    r3.physicalY = -0.01;
    r4.physicalY = 0.01;
    applyRacerBehavior([r3, r4], {
      ...cfg,
      homeForceStrength: 0,
      tWeight: 0.1,
      avoidanceDistance: 0.35,
    });
    const moved = r3.physicalY !== 0 || r4.physicalY !== 0;
    expect(moved).toBe(true);
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
    // racer 0 as trailer, 4 identical leaders equidistant in t and physicalY.
    // All 4 leaders have the same physicalY so they don't push each other (B2 skip).
    const solo0 = makeRacer({ index: 0, t: 0.5, x: 0, y: 0 });
    const solo1 = makeRacer({ index: 1, t: 0.51, x: 0, y: 0 });
    solo0.physicalY = -0.2;
    solo1.physicalY = 0.2;
    applyRacerBehavior([solo0, solo1], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    const deltaSolo = Math.abs(solo0.physicalY - -0.2);

    const r0 = makeRacer({ index: 0, t: 0.5, x: 0, y: 0 });
    const r1 = makeRacer({ index: 1, t: 0.51, x: 0, y: 0 });
    const r2 = makeRacer({ index: 2, t: 0.51, x: 0, y: 0 });
    const r3 = makeRacer({ index: 3, t: 0.51, x: 0, y: 0 });
    const r4 = makeRacer({ index: 4, t: 0.51, x: 0, y: 0 });
    r0.physicalY = -0.2;
    r1.physicalY = r2.physicalY = r3.physicalY = r4.physicalY = 0.2;
    applyRacerBehavior([r0, r1, r2, r3, r4], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
    });
    const delta5 = Math.abs(r0.physicalY - -0.2);

    // Without normalization delta5 would be 4 × deltaSolo. With sqrt(4) it should be 2 ×.
    expect(delta5).toBeCloseTo(2 * deltaSolo, 3);
  });

  it('avoidance produces measurable spread over 60 frames in a tight pack', () => {
    const racers = [
      makeRacer({ index: 0, t: 0.5, x: 200, y: 200 }),
      makeRacer({ index: 1, t: 0.501, x: 202, y: 200 }),
      makeRacer({ index: 2, t: 0.502, x: 204, y: 200 }),
      makeRacer({ index: 3, t: 0.503, x: 206, y: 200 }),
    ];
    // Stagger initial physicalY (as computeStartPhysicalY would) so avoidance has a direction
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
      avoidanceDistance: 1.0,
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
      avoidanceDistance: 1.0,
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
      avoidanceDistance: 1.0,
    });

    expect(a.physicalY).toBeLessThan(-0.03);
    expect(b.physicalY).toBeGreaterThan(0.03);
  });

  it('all sides blocked: no additional free-lane action (force logic fallback)', () => {
    const a = makeLaneRacer({ index: 40, t: 0.5, physicalY: 0.0 });
    const b = makeLaneRacer({ index: 41, t: 0.501, physicalY: 0.0 });
    const blockALeft = makeLaneRacer({ index: 42, t: 0.5, physicalY: -40 / 140 });
    const blockARight = makeLaneRacer({ index: 43, t: 0.5, physicalY: 40 / 140 });
    const blockBLeft = makeLaneRacer({ index: 44, t: 0.501, physicalY: -40 / 140 });
    const blockBRight = makeLaneRacer({ index: 45, t: 0.501, physicalY: 40 / 140 });

    // isOpen: false scopes to closed-track / free-lane-separation behavior only;
    // Stage B (same-lane commit) is open-track only and must not affect this assertion.
    applyRacerBehavior([a, b, blockALeft, blockARight, blockBLeft, blockBRight], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      isOpen: false,
    });

    expect(a.physicalY).toBe(0);
    expect(b.physicalY).toBe(0);
  });

  it('exact same physicalY uses deterministic tie direction', () => {
    const mkPair = () => [
      makeLaneRacer({ index: 50, name: 'Alpha', t: 0.5, physicalY: 0 }),
      makeLaneRacer({ index: 51, name: 'Beta', t: 0.501, physicalY: 0 }),
    ];

    const [a1, b1] = mkPair();
    applyRacerBehavior([a1, b1], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    const out1 = [a1.physicalY, b1.physicalY];

    const [a2, b2] = mkPair();
    applyRacerBehavior([a2, b2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
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
      avoidanceDistance: 1.0,
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
    // frameSizePx=40, pathLengthPx=1200, multiplier=1.5 → dynamicT = 40/1200*1.5 = 0.050
    // dT = 0.51 - 0.50 = 0.01 < 0.050 → brake fires
    const trailer = makeLaneRacer({ index: 0, t: 0.5, x: 200, y: 200, physicalY: 0.05 });
    const leader = makeLaneRacer({ index: 1, t: 0.51, x: 200, y: 200, physicalY: 0.05 });
    applyRacerBehavior([trailer, leader], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      speedBrakeYThreshold: 0.2,
      speedBrakeTMultiplier: 1.5,
    });
    expect(trailer.avoidanceActive).toBe(true);
  });

  it('dynamic threshold scales with sprite size and path length', () => {
    // dynamicT = frameSizePx / pathLengthPx * speedBrakeTMultiplier
    // frameSizePx=40, pathLengthPx=1200, multiplier=1.5 → dynamicT = 0.050
    // Place trailer just inside threshold (dT=0.049) → fires
    const inside = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.0 });
    const leader1 = makeLaneRacer({ index: 1, t: 0.549, physicalY: 0.0 });
    applyRacerBehavior([inside, leader1], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      speedBrakeYThreshold: 0.2,
      speedBrakeTMultiplier: 1.5,
    });
    expect(inside.avoidanceActive).toBe(true);

    // Place trailer just outside threshold (dT=0.051) → does not fire
    const outside = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.0 });
    const leader2 = makeLaneRacer({ index: 1, t: 0.551, physicalY: 0.0 });
    applyRacerBehavior([outside, leader2], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      speedBrakeYThreshold: 0.2,
      speedBrakeTMultiplier: 1.5,
    });
    expect(outside.avoidanceActive).toBe(false);
  });

  it('no speed brake when Y difference exceeds threshold', () => {
    const trailer = makeLaneRacer({ index: 0, t: 0.5, x: 200, y: 200, physicalY: -0.5 });
    const leader = makeLaneRacer({ index: 1, t: 0.51, x: 200, y: 200, physicalY: 0.5 });
    applyRacerBehavior([trailer, leader], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      speedBrakeYThreshold: 0.2,
      speedBrakeTMultiplier: 1.5,
    });
    expect(trailer.avoidanceActive).toBe(false);
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
  // Two close racers in avoidance range (dT=0, dY=0.2 → dist=0.2 < avoidanceDistance=0.35).
  // homeForce off; frameSizePx absent so free-lane separation does not fire.
  // Avoidance delta = rA.physicalY_after - 0.1
  function avoidDelta(trackW) {
    const rA = makeRacer({
      index: 0,
      t: 0.5,
      ...(trackW > 0 && { trackWidthPx: trackW }),
    });
    rA.physicalY = 0.1;
    const rB = makeRacer({
      index: 1,
      t: 0.5,
      ...(trackW > 0 && { trackWidthPx: trackW }),
    });
    rB.physicalY = -0.1;
    applyRacerBehavior([rA, rB], { ...cfg, homeForceStrength: 0 });
    return rA.physicalY - 0.1;
  }

  it('scale = 1.0 at reference width (98 px) — same as no track-width info', () => {
    expect(avoidDelta(98)).toBe(avoidDelta(0));
  });

  it('scale = 0.5 when track width is double the reference (196 px)', () => {
    expect(avoidDelta(196)).toBeCloseTo(avoidDelta(98) * 0.5, 10);
  });

  it('scale clamped to 0.1 for very wide tracks — both 1000 px and 2000 px give the same delta', () => {
    expect(avoidDelta(1000)).toBeCloseTo(avoidDelta(2000), 10);
  });

  it('scale clamped to 3.0 for very narrow tracks — both 10 px and 20 px give the same delta', () => {
    expect(avoidDelta(10)).toBeCloseTo(avoidDelta(20), 10);
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
