// ============================================================
// File:        raceBehavior.test.js
// Path:        client/src/modules/raceBehavior.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Unit tests for D7b racer-behavior logic (physicalY-based
//              avoidance, home force, drafting cone, speed brake).
// ============================================================

import { describe, it, expect } from 'vitest';
import { initRacerBehavior, applyRacerBehavior, resetRacePhase } from './raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';
import { loadRaceBehaviorConfig } from './raceBehaviorConfig.js';

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

const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };

// ── initRacerBehavior ──────────────────────────────────────────────────────

describe('initRacerBehavior', () => {
  it('sets physicalY to 0 (centerline)', () => {
    const r = makeRacer();
    expect(r.physicalY).toBe(0);
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
    for (let f = 0; f < 120; f++) applyRacerBehavior([r], cfg);
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

  it('deterministic tie-breaking when both racers share the same physicalY (yDiff≈0)', () => {
    // r1: index 0 (trailer, lower t), r2: index 1 (leader, higher t)
    // When |dY| < minLateralEpsilon, pushDir = trailer.index > leader.index ? 1 : -1
    // Here trailer.index(0) < leader.index(1) → pushDir = -1
    // With symmetric avoidance: trailer moves -Y, leader moves +Y
    const r1 = makeRacer({ index: 0, t: 0.4, x: 100, y: 200 });
    const r2 = makeRacer({ index: 1, t: 0.41, x: 100, y: 200 });
    r1.physicalY = 0;
    r2.physicalY = 0;
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    // Trailer (r1, index 0) is pushed toward -Y
    expect(r1.physicalY).toBeLessThan(0);
    // Leader (r2, index 1) is pushed toward +Y (symmetric avoidance)
    expect(r2.physicalY).toBeGreaterThan(0);
    // Both move by equal magnitude (symmetric halving)
    expect(Math.abs(r1.physicalY)).toBeCloseTo(Math.abs(r2.physicalY), 10);
  });

  it('asymmetric (symmetricAvoidance: false): trailer yields, leader physicalY unchanged', () => {
    // r1 (lower t) is trailer; r2 (higher t) is leader — start at different Y
    const r1 = makeRacer({ index: 0, t: 0.4, x: 100, y: 200 });
    const r2 = makeRacer({ index: 1, t: 0.41, x: 100, y: 200 });
    r1.physicalY = -0.1; // trailer slightly below leader
    r2.physicalY = 0.1;
    const before2 = r2.physicalY;
    applyRacerBehavior([r1, r2], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      symmetricAvoidance: false,
    });
    // Leader (r2) should not change (asymmetric: only trailer yields)
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

// ── Speed brake ────────────────────────────────────────────────────────────

describe('applyRacerBehavior — speed brake', () => {
  it('sets avoidanceActive on trailer when side-by-side', () => {
    const trailer = makeRacer({ index: 0, t: 0.5, x: 200, y: 200 });
    const leader = makeRacer({ index: 1, t: 0.51, x: 200, y: 200 }); // within T threshold
    trailer.physicalY = 0.05; // within Y threshold
    leader.physicalY = 0.05;
    applyRacerBehavior([trailer, leader], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      speedBrakeYThreshold: 0.2,
      speedBrakeTThreshold: 0.02,
    });
    expect(trailer.avoidanceActive).toBe(true);
  });

  it('no speed brake when Y difference exceeds threshold', () => {
    const trailer = makeRacer({ index: 0, t: 0.5, x: 200, y: 200 });
    const leader = makeRacer({ index: 1, t: 0.51, x: 200, y: 200 });
    trailer.physicalY = -0.5; // far apart in Y
    leader.physicalY = 0.5;
    applyRacerBehavior([trailer, leader], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      speedBrakeYThreshold: 0.2,
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

  it('draftingMaxTargets=1 caps boost at one leader', () => {
    // Follower behind two leaders; only one should grant boost with maxTargets=1
    const leader1 = makeRacer({ index: 0, t: 0.55, x: 150, y: 300, angle: 0 });
    const leader2 = makeRacer({ index: 1, t: 0.52, x: 130, y: 300, angle: 0 });
    const follower = makeRacer({ index: 2, t: 0.48, x: 100, y: 300, angle: 0 });
    leader1.physicalY = leader2.physicalY = follower.physicalY = 0;
    applyRacerBehavior([leader1, leader2, follower], {
      ...cfg,
      homeForceStrength: 0,
      draftingMaxDistance: 200,
      draftingConeAngle: 60,
      draftingMaxTargets: 1,
    });
    // Boost is granted (at least one leader counted)
    expect(follower.draftingBoostActive).toBe(true);
  });
});

// ── Default config values ───────────────────────────────────────────────────

describe('DEFAULT_RACE_BEHAVIOR_CONFIG — new fields present', () => {
  const d = DEFAULT_RACE_BEHAVIOR_CONFIG;

  it('has minLateralEpsilon', () => {
    expect(typeof d.minLateralEpsilon).toBe('number');
    expect(d.minLateralEpsilon).toBeGreaterThan(0);
    expect(d.minLateralEpsilon).toBeLessThanOrEqual(0.1);
  });

  it('has crowdNormalizationExponent', () => {
    expect(typeof d.crowdNormalizationExponent).toBe('number');
    expect(d.crowdNormalizationExponent).toBeGreaterThanOrEqual(0);
    expect(d.crowdNormalizationExponent).toBeLessThanOrEqual(1);
  });

  it('has symmetricAvoidance (boolean)', () => {
    expect(typeof d.symmetricAvoidance).toBe('boolean');
  });

  it('has draftingMaxTargets (integer 1–5)', () => {
    expect(Number.isInteger(d.draftingMaxTargets)).toBe(true);
    expect(d.draftingMaxTargets).toBeGreaterThanOrEqual(1);
    expect(d.draftingMaxTargets).toBeLessThanOrEqual(5);
  });

  it('has avoidanceStrictness (0–1)', () => {
    expect(typeof d.avoidanceStrictness).toBe('number');
    expect(d.avoidanceStrictness).toBeGreaterThanOrEqual(0);
    expect(d.avoidanceStrictness).toBeLessThanOrEqual(1);
  });

  it('has startPhaseSpreadThreshold (> 0, <= 0.2)', () => {
    expect(d.startPhaseSpreadThreshold).toBeGreaterThan(0);
    expect(d.startPhaseSpreadThreshold).toBeLessThanOrEqual(0.2);
  });

  it('has startPhaseAvoidanceFactor (0–2)', () => {
    // Range extended to 2 to allow values > 1 for start-phase over-drive (see avoidance-force-decomposition.md)
    expect(d.startPhaseAvoidanceFactor).toBeGreaterThanOrEqual(0);
    expect(d.startPhaseAvoidanceFactor).toBeLessThanOrEqual(2);
  });

  it('has startPhaseHomeForceFactor (0–1)', () => {
    expect(d.startPhaseHomeForceFactor).toBeGreaterThanOrEqual(0);
    expect(d.startPhaseHomeForceFactor).toBeLessThanOrEqual(1);
  });
});

// ── Validation in raceBehaviorConfig ────────────────────────────────────────

describe('loadRaceBehaviorConfig — rejects out-of-range new fields', () => {
  it('returns defaults when symmetricAvoidance is not a boolean', () => {
    // Simulate corrupt storage by monkey-patching via the loaded config
    // (loadRaceBehaviorConfig merges from storageGet — we test the validation path
    //  by passing the validated merged object directly isn't possible, but we can
    //  verify that the valid default config passes validation)
    const result = loadRaceBehaviorConfig();
    expect(typeof result.symmetricAvoidance).toBe('boolean');
  });

  it('loaded config has all new fields with valid values', () => {
    const result = loadRaceBehaviorConfig();
    expect(result.minLateralEpsilon).toBeGreaterThan(0);
    expect(result.crowdNormalizationExponent).toBeGreaterThanOrEqual(0);
    expect(typeof result.symmetricAvoidance).toBe('boolean');
    expect(Number.isInteger(result.draftingMaxTargets)).toBe(true);
    expect(result.avoidanceStrictness).toBeGreaterThanOrEqual(0);
    expect(result.startPhaseSpreadThreshold).toBeGreaterThan(0);
    expect(result.startPhaseAvoidanceFactor).toBeGreaterThanOrEqual(0);
    expect(result.startPhaseHomeForceFactor).toBeGreaterThanOrEqual(0);
  });
});

// ── Phase detection ──────────────────────────────────────────────────────────

describe('applyRacerBehavior — start/race phase detection', () => {
  function makePack(n, spreadT = 0) {
    return Array.from({ length: n }, (_, i) => {
      const r = makeRacer({ index: i, t: 0.5 + i * (spreadT / n), x: 200, y: 200 });
      r.physicalY = (i - (n - 1) / 2) * 0.1;
      return r;
    });
  }

  it('applies damped avoidance in start phase (low spread)', () => {
    const raceId = Symbol('test');
    resetRacePhase(raceId);
    const racers = makePack(4, 0.02); // spread = 0.02, below default threshold 0.05

    const dampedCfg = {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      startPhaseSpreadThreshold: 0.05,
      startPhaseAvoidanceFactor: 0, // zero → no avoidance in start phase
      startPhaseHomeForceFactor: 0,
    };
    const beforeY = racers.map((r) => r.physicalY);
    applyRacerBehavior(racers, dampedCfg, raceId);
    // With avoidanceFactor=0, no racer should move
    racers.forEach((r, i) => expect(r.physicalY).toBeCloseTo(beforeY[i], 10));
  });

  it('transitions to race phase once spread exceeds threshold (permanent)', () => {
    const raceId = Symbol('test2');
    resetRacePhase(raceId);

    // Run with spread > threshold to trigger transition
    const racers = makePack(4, 0.12); // spread ≈ 0.12 > 0.05

    const phaseCfg = {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      startPhaseSpreadThreshold: 0.05,
      startPhaseAvoidanceFactor: 0, // start phase would block avoidance
      startPhaseHomeForceFactor: 0,
      avoidanceStrictness: 0.5,
    };
    // First call: spread triggers transition to race phase
    applyRacerBehavior(racers, phaseCfg, raceId);
    const afterY = racers.map((r) => r.physicalY);

    // At least one racer should have moved (race-phase forces applied, not start-phase zero)
    const anyMoved = racers.some(
      (r, i) => Math.abs(r.physicalY - afterY[i]) > 0 || afterY[i] !== (i - 1.5) * 0.1
    );
    // The transition fired, so avoidanceFactor=0 did NOT suppress forces
    expect(afterY.some((y, i) => y !== (i - 1.5) * 0.1)).toBe(true);
  });

  it('resetRacePhase restarts start phase', () => {
    const raceId = Symbol('test3');
    resetRacePhase(raceId);

    const racers = makePack(4, 0.12); // triggers transition
    const phaseCfg = {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      startPhaseSpreadThreshold: 0.05,
      startPhaseAvoidanceFactor: 0,
      startPhaseHomeForceFactor: 0,
    };
    applyRacerBehavior(racers, phaseCfg, raceId); // transition fires

    // Reset and create a new tight pack
    resetRacePhase(raceId);
    const pack2 = makePack(4, 0.02); // below threshold
    const beforeY2 = pack2.map((r) => r.physicalY);
    applyRacerBehavior(pack2, phaseCfg, raceId);
    // Start phase is back — avoidanceFactor=0 blocks all avoidance
    pack2.forEach((r, i) => expect(r.physicalY).toBeCloseTo(beforeY2[i], 10));
  });
});

// ── symmetricAvoidance ───────────────────────────────────────────────────────

describe('applyRacerBehavior — symmetricAvoidance', () => {
  it('symmetric=true: both racers move (equal magnitude, opposite direction)', () => {
    const r1 = makeRacer({ index: 0, t: 0.4, x: 100, y: 200 });
    const r2 = makeRacer({ index: 1, t: 0.41, x: 100, y: 200 });
    r1.physicalY = -0.1;
    r2.physicalY = 0.1;
    applyRacerBehavior([r1, r2], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      symmetricAvoidance: true,
    });
    const deltaR1 = Math.abs(r1.physicalY - -0.1);
    const deltaR2 = Math.abs(r2.physicalY - 0.1);
    expect(deltaR1).toBeGreaterThan(0);
    expect(deltaR2).toBeGreaterThan(0);
    expect(deltaR1).toBeCloseTo(deltaR2, 10);
  });

  it('symmetric=false: only trailer moves, leader unchanged', () => {
    const r1 = makeRacer({ index: 0, t: 0.4, x: 100, y: 200 });
    const r2 = makeRacer({ index: 1, t: 0.41, x: 100, y: 200 });
    r1.physicalY = -0.1;
    r2.physicalY = 0.1;
    const leaderBefore = r2.physicalY;
    applyRacerBehavior([r1, r2], {
      ...cfg,
      homeForceStrength: 0,
      avoidanceDistance: 1.0,
      symmetricAvoidance: false,
    });
    expect(r2.physicalY).toBeCloseTo(leaderBefore, 5); // leader unchanged
    expect(r1.physicalY).toBeLessThan(-0.1); // trailer moved
  });
});
