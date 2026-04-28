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

  it('asymmetric: trailer yields, leader physicalY unchanged', () => {
    // r1 (lower t) is trailer; r2 (higher t) is leader
    const r1 = makeRacer({ index: 0, t: 0.4, x: 100, y: 200 });
    const r2 = makeRacer({ index: 1, t: 0.41, x: 100, y: 200 });
    r1.physicalY = 0;
    r2.physicalY = 0;
    const before2 = r2.physicalY;
    applyRacerBehavior([r1, r2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    // Leader (r2) should not change (no avoidance force applied to leader)
    expect(r2.physicalY).toBeCloseTo(before2, 5);
    // Trailer (r1) should be pushed in some direction
    expect(r1.physicalY).not.toBe(0);
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
    const far2 = makeRacer({ index: 1, t: 0.48, x: 0, y: 0 }); // larger deltaT
    [close1, close2, far1, far2].forEach((r) => {
      r.physicalY = 0;
    });

    applyRacerBehavior([close1, close2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });
    applyRacerBehavior([far1, far2], { ...cfg, homeForceStrength: 0, avoidanceDistance: 1.0 });

    // Both trailers are pushed; the closer pair should push more
    expect(Math.abs(close1.physicalY)).toBeGreaterThanOrEqual(Math.abs(far1.physicalY));
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

    // Same pair, tWeight=0.1: dist = 0.12*0.1 = 0.012 < 0.35 → avoidance
    const r3 = makeRacer({ index: 0, t: 0.0, x: 0, y: 0 });
    const r4 = makeRacer({ index: 1, t: 0.12, x: 0, y: 0 });
    r3.physicalY = 0;
    r4.physicalY = 0;
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

  it('avoidance produces measurable spread over 60 frames in a tight pack', () => {
    const racers = [
      makeRacer({ index: 0, t: 0.5, x: 200, y: 200 }),
      makeRacer({ index: 1, t: 0.501, x: 202, y: 200 }),
      makeRacer({ index: 2, t: 0.502, x: 204, y: 200 }),
      makeRacer({ index: 3, t: 0.503, x: 206, y: 200 }),
    ];
    racers.forEach((r) => {
      r.physicalY = 0;
    });
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
});
