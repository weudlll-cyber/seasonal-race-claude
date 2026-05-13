// ============================================================
// File:        raceBehavior.test.js
// Path:        client/src/modules/raceBehavior.test.js
// Project:     RaceArena
// Description: Tests for sight-based preventive race AI.
//              Critical invariant: physicalY delta ≤ maxLateralStepPerFrame every frame.
// ============================================================

import { describe, it, expect } from 'vitest';
import { initRacerBehavior, applyRacerBehavior } from './raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';

const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG, corridorHalfWidthPx: 75 };
const CORRIDOR_HALF = 75;
const MAX_STEP = cfg.maxLateralStepPerFrame / CORRIDOR_HALF; // ≈0.0533

function makeRacer(overrides = {}) {
  const t = overrides.t ?? 0.5;
  const r = {
    index: 0,
    t,
    x: t * 1280, // straight-track proxy: ensures spatial separation by default
    y: 360,
    angle: 0,
    finished: false,
    baseSpeed: 0.001045,
    visibleWidthPx: 24,
    visibleLengthPx: 24,
    ...overrides,
  };
  initRacerBehavior(r);
  return r;
}

// ── initRacerBehavior ──────────────────────────────────────────────────────

describe('initRacerBehavior', () => {
  it('sets physicalY to 0 when not previously set', () => {
    const r = makeRacer();
    expect(r.physicalY).toBe(0);
  });

  it('preserves existing physicalY', () => {
    const r = { index: 0, t: 0.5, x: 0, y: 0, angle: 0, finished: false, physicalY: 0.4 };
    initRacerBehavior(r);
    expect(r.physicalY).toBe(0.4);
  });

  it('sets targetPhysicalY = physicalY', () => {
    const r = { index: 0, t: 0.5, x: 0, y: 0, angle: 0, finished: false, physicalY: 0.3 };
    initRacerBehavior(r);
    expect(r.targetPhysicalY).toBe(0.3);
  });

  it('sets laneCommitFrames to 0', () => {
    const r = makeRacer();
    expect(r.laneCommitFrames).toBe(0);
  });

  it('sets draftingBoostFactor to 0', () => {
    const r = makeRacer();
    expect(r.draftingBoostFactor).toBe(0);
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

// ── Sight horizon ──────────────────────────────────────────────────────────

describe('applyRacerBehavior — sight horizon', () => {
  it('racer beyond tHorizon is not a threat (no lane change)', () => {
    // tHorizon ≈ 0.001045 * 90 ≈ 0.094; gap of 0.2 is outside
    const r1 = makeRacer({ index: 0, t: 0.5 });
    const r2 = makeRacer({ index: 1, t: 0.7 }); // gap = 0.2 > 0.094
    r1.physicalY = 0;
    r2.physicalY = 0;
    r1.targetPhysicalY = 0;
    applyRacerBehavior([r1, r2], cfg);
    expect(r1.laneCommitFrames).toBe(0);
    expect(r1.avoidanceActive).toBe(false);
  });

  it('racer within tHorizon in same lane is a threat → lane change committed', () => {
    // gap = 0.05 < 0.094; same physicalY = 0 → lateral conflict
    const r1 = makeRacer({ index: 0, t: 0.5 });
    const r2 = makeRacer({ index: 1, t: 0.55 });
    r1.physicalY = 0;
    r2.physicalY = 0;
    r1.targetPhysicalY = 0;
    applyRacerBehavior([r1, r2], cfg);
    // r1 should commit to a clear lane (r2 is blocking centerline)
    expect(r1.laneCommitFrames).toBeGreaterThan(0);
    expect(r1.targetPhysicalY).not.toBe(0);
  });

  it('racer behind (negative gap) is not in sight ahead', () => {
    const r1 = makeRacer({ index: 0, t: 0.55 });
    const r2 = makeRacer({ index: 1, t: 0.5 }); // r2 is behind r1
    r1.physicalY = 0;
    r2.physicalY = 0;
    r1.targetPhysicalY = 0;
    applyRacerBehavior([r1, r2], cfg);
    // r1 should NOT react to r2 which is behind
    expect(r1.laneCommitFrames).toBe(0);
    expect(r1.avoidanceActive).toBe(false);
  });
});

// ── Lane commitment ────────────────────────────────────────────────────────

describe('applyRacerBehavior — lane commitment', () => {
  it('commitment is held for multiple frames', () => {
    const r1 = makeRacer({ index: 0, t: 0.5 });
    const r2 = makeRacer({ index: 1, t: 0.55 });
    r1.physicalY = 0;
    r2.physicalY = 0;
    r1.targetPhysicalY = 0;

    // Frame 1: establish commitment
    applyRacerBehavior([r1, r2], cfg);
    const target = r1.targetPhysicalY;
    const commit = r1.laneCommitFrames;
    expect(commit).toBeGreaterThan(0);

    // Move r2 out of the way — commitment should still hold
    r2.physicalY = 0.9;
    applyRacerBehavior([r1, r2], cfg);
    expect(r1.laneCommitFrames).toBe(commit - 1);
    expect(r1.targetPhysicalY).toBeCloseTo(target, 5);
  });

  it('commitment is released when committed target becomes blocked', () => {
    const r1 = makeRacer({ index: 0, t: 0.5 });
    const r2 = makeRacer({ index: 1, t: 0.55 });
    const r3 = makeRacer({ index: 2, t: 0.57 }); // different t → different x → no world overlap
    r1.physicalY = 0;
    r2.physicalY = 0;
    r3.physicalY = 0;
    r1.targetPhysicalY = 0;

    // Frame 1: r1 commits to a clear lane
    applyRacerBehavior([r1, r2, r3], cfg);
    const originalTarget = r1.targetPhysicalY;
    expect(r1.laneCommitFrames).toBeGreaterThan(0);

    // Move r3 to exactly the committed target — now it blocks the target
    r3.physicalY = originalTarget;
    r3.targetPhysicalY = originalTarget;

    // Frame 2: target blocked → commitment released, racer replans to a different lane
    applyRacerBehavior([r1, r2, r3], cfg);
    expect(r1.targetPhysicalY).not.toBeCloseTo(originalTarget, 3);
  });

  it('no commitment when in free-running phase (no threats)', () => {
    const r1 = makeRacer({ index: 0, t: 0.5 });
    r1.physicalY = 0;
    r1.targetPhysicalY = 0;
    applyRacerBehavior([r1], cfg);
    expect(r1.laneCommitFrames).toBe(0);
  });
});

// ── avoidanceActive when all lanes blocked ─────────────────────────────────

describe('applyRacerBehavior — all lanes blocked', () => {
  it('sets avoidanceActive when findClearLane returns null', () => {
    // visibleWidthPx=100 → halfWidth=50/75≈0.667 → stepPhys=1.387 > MAX_LATERAL=0.95
    // All candidates (physicalY ± 1.387) exceed ±0.95 and are skipped → findClearLane returns null
    const r1 = makeRacer({ index: 0, t: 0.5, visibleWidthPx: 100 });
    const r2 = makeRacer({ index: 1, t: 0.55, visibleWidthPx: 100 });
    r1.physicalY = 0;
    r2.physicalY = 0;
    r1.targetPhysicalY = 0;

    applyRacerBehavior([r1, r2], cfg);
    expect(r1.avoidanceActive).toBe(true);
  });
});

// ── Finished racers ────────────────────────────────────────────────────────

describe('applyRacerBehavior — finished racers', () => {
  it('finished racers are not affected by sight logic', () => {
    const r1 = makeRacer({ index: 0, t: 0.5, finished: true });
    const r2 = makeRacer({ index: 1, t: 0.55 });
    r1.physicalY = 0.3;
    r2.physicalY = 0.3;
    r1.targetPhysicalY = 0.3;
    applyRacerBehavior([r1, r2], cfg);
    expect(r1.physicalY).toBe(0.3);
    expect(r1.avoidanceActive).toBe(false);
  });
});

// ── CRITICAL: Movement smoothness invariant ─────────────────────────────────

describe('applyRacerBehavior — CRITICAL smoothness invariant', () => {
  it('600 frames, 20 racers: no physicalY delta ever exceeds maxLateralStepPerFrame', () => {
    const racers = Array.from({ length: 20 }, (_, i) => {
      const r = makeRacer({
        index: i,
        t: i / 20,
        x: i * 64, // 64px apart → dx=64 >> 16 → no safety net interference
        y: 360,
        baseSpeed: 0.001045,
      });
      r.physicalY = ((i % 7) - 3) * 0.12;
      r.targetPhysicalY = r.physicalY;
      return r;
    });

    for (let f = 0; f < 600; f++) {
      const before = racers.map((r) => r.physicalY);
      applyRacerBehavior(racers, cfg);
      for (let i = 0; i < racers.length; i++) {
        const delta = Math.abs(racers[i].physicalY - before[i]);
        // Hard invariant: no jump ever exceeds maxLateralStepPerFrame/corridorHalf
        expect(delta).toBeLessThanOrEqual(MAX_STEP + 1e-9);
      }
    }
  });

  it('physicalY is always within [-0.95, +0.95] after 600 frames', () => {
    const racers = Array.from({ length: 20 }, (_, i) => {
      const r = makeRacer({ index: i, t: i / 20, x: i * 64, y: 360 }); // x=i*64 → unique positions
      r.physicalY = ((i % 5) - 2) * 0.3;
      r.targetPhysicalY = r.physicalY;
      return r;
    });
    for (let f = 0; f < 600; f++) applyRacerBehavior(racers, cfg);
    for (const r of racers) {
      expect(r.physicalY).toBeGreaterThanOrEqual(-0.95);
      expect(r.physicalY).toBeLessThanOrEqual(0.95);
    }
  });
});

// ── Drafting — smooth ramp ─────────────────────────────────────────────────

describe('applyRacerBehavior — drafting smooth', () => {
  it('draftingBoostFactor increases by 1/draftingActivationFrames per frame in cone', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 });
    leader.physicalY = 0;
    follower.physicalY = 0;
    follower.targetPhysicalY = 0;

    applyRacerBehavior([leader, follower], {
      ...cfg,
      draftingMaxDistance: 200,
      draftingConeAngle: 60,
    });
    const expected = 1 / cfg.draftingActivationFrames;
    expect(follower.draftingBoostFactor).toBeCloseTo(expected, 5);
  });

  it('draftingBoostFactor reaches 1 after full activation period in cone', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 });
    leader.physicalY = 0;
    follower.physicalY = 0;
    follower.targetPhysicalY = 0;

    for (let f = 0; f < cfg.draftingActivationFrames + 5; f++) {
      applyRacerBehavior([leader, follower], {
        ...cfg,
        draftingMaxDistance: 200,
        draftingConeAngle: 60,
      });
    }
    expect(follower.draftingBoostFactor).toBe(1);
    expect(follower.draftingBoostActive).toBe(true);
  });

  it('draftingBoostFactor ramps down when follower leaves cone', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 });
    leader.physicalY = 0;
    follower.physicalY = 0;
    follower.targetPhysicalY = 0;
    follower.draftingBoostFactor = 1; // pre-set to fully active

    // Move follower in front of leader (out of cone)
    follower.x = 350;
    applyRacerBehavior([leader, follower], {
      ...cfg,
      draftingMaxDistance: 200,
      draftingConeAngle: 60,
    });
    expect(follower.draftingBoostFactor).toBeLessThan(1);
  });

  it('draftingBoostActive is false when factor ≤ 0.01', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 });
    leader.physicalY = 0;
    follower.physicalY = 0;
    follower.targetPhysicalY = 0;

    // Follower too far away → factor stays 0
    applyRacerBehavior([leader, follower], {
      ...cfg,
      draftingMaxDistance: 50, // follower is 100px away → outside
      draftingConeAngle: 60,
    });
    expect(follower.draftingBoostFactor).toBe(0);
    expect(follower.draftingBoostActive).toBe(false);
  });

  it('no boost when behavior is disabled', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 });
    leader.physicalY = 0;
    follower.physicalY = 0;
    follower.targetPhysicalY = 0;

    applyRacerBehavior([leader, follower], { ...cfg, enabled: false });
    expect(follower.draftingBoostActive).toBe(false);
  });

  it('leader does not get drafting boost', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const follower = makeRacer({ index: 1, t: 0.48, x: 100, y: 300, angle: 0 });
    leader.physicalY = 0;
    follower.physicalY = 0;
    follower.targetPhysicalY = 0;

    for (let f = 0; f < cfg.draftingActivationFrames + 2; f++) {
      applyRacerBehavior([leader, follower], {
        ...cfg,
        draftingMaxDistance: 200,
        draftingConeAngle: 60,
      });
    }
    expect(leader.draftingBoostActive).toBe(false);
  });
});

// ── Safety net ────────────────────────────────────────────────────────────

describe('applyRacerBehavior — safety net', () => {
  it('sets avoidanceActive on both overlapping racers', () => {
    // Place two racers at the same world position to force hitbox overlap
    const rA = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const rB = makeRacer({ index: 1, t: 0.51, x: 200, y: 300, angle: 0 });
    rA.physicalY = 0;
    rB.physicalY = 0;
    rA.targetPhysicalY = 0;
    rB.targetPhysicalY = 0;

    // Make sight horizon too short so sight logic doesn't fire (rB is 0.01 ahead)
    // But racers overlap in world space → safety net fires
    applyRacerBehavior([rA, rB], { ...cfg, sightHorizonFrames: 1 });
    expect(rA.avoidanceActive).toBe(true);
    expect(rB.avoidanceActive).toBe(true);
  });

  it('yielder nudge stays within maxLateralStepPerFrame', () => {
    const rA = makeRacer({ index: 0, t: 0.5, x: 200, y: 300, angle: 0 });
    const rB = makeRacer({ index: 1, t: 0.51, x: 200, y: 300, angle: 0 });
    rA.physicalY = -0.3;
    rB.physicalY = 0.3;
    rA.targetPhysicalY = -0.3;
    rB.targetPhysicalY = 0.3;
    const beforeA = rA.physicalY;
    const beforeB = rB.physicalY;

    applyRacerBehavior([rA, rB], { ...cfg, sightHorizonFrames: 1 });
    expect(Math.abs(rA.physicalY - beforeA)).toBeLessThanOrEqual(MAX_STEP + 1e-9);
    expect(Math.abs(rB.physicalY - beforeB)).toBeLessThanOrEqual(MAX_STEP + 1e-9);
  });
});

// ── Acceptance sim ────────────────────────────────────────────────────────

// ── Acceptance sim ────────────────────────────────────────────────────────

describe('applyRacerBehavior — acceptance sim', () => {
  it('follower avoids blocker ahead and holds a clear lane after 50 frames', () => {
    // One blocker ahead in t, same lane. Follower must commit and reach a clear lane.
    const blocker = makeRacer({ index: 0, t: 0.55, angle: 0 });
    blocker.physicalY = 0;
    blocker.targetPhysicalY = 0;

    const follower = makeRacer({ index: 1, t: 0.48, angle: 0 });
    follower.physicalY = 0;
    follower.targetPhysicalY = 0;

    for (let f = 0; f < 50; f++) {
      for (const r of [blocker, follower]) {
        r.t = (r.t + r.baseSpeed) % 1;
        r.x = r.t * 1280; // straight-track proxy
      }
      applyRacerBehavior([blocker, follower], cfg);
    }

    // Follower should have moved to a distinct clear lane (≥0.30 physY from origin)
    expect(Math.abs(follower.physicalY)).toBeGreaterThan(0.3);
    // Blocker should not have been disturbed (nothing was behind it in sight)
    expect(blocker.physicalY).toBeCloseTo(0, 3);
  });
});
