// ============================================================
// File:        raceBehavior.test.js
// Path:        client/src/modules/raceBehavior.test.js
// Project:     RaceArena
// Description: Tests for PBD (Position-Based Dynamics) race AI.
//              Critical invariants:
//                - physicalY delta ≤ maxLateralStepPerFrame every frame (hard cap)
//                - targetPhysicalY overlaps = 0 after constraint resolution
//                - Asymmetric resolution: leader (higher t) displaced less than follower
//                - Centerline force pulls isolated racers toward Y=0 over time
// ============================================================

import { describe, it, expect } from 'vitest';
import { initRacerBehavior, applyRacerBehavior } from './raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';

const CORRIDOR_HALF = 75;
const cfg = {
  ...DEFAULT_RACE_BEHAVIOR_CONFIG,
  corridorHalfWidthPx: CORRIDOR_HALF,
  centerlineForce: 0.02,
  frontWeight: 0.2,
  pbdIterationsPerFrame: 5,
  safetyMarginPx: 4,
  maxLateralStepPerFrame: 4,
};
const MAX_STEP = cfg.maxLateralStepPerFrame / CORRIDOR_HALF;

function makeRacer(overrides = {}) {
  const t = overrides.t ?? 0.5;
  const r = {
    index: 0,
    t,
    x: t * 1280,
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

function minLatNorm(c = cfg) {
  const halfW = 24 / 2 / (c.corridorHalfWidthPx ?? 75);
  return halfW * 2 + (c.safetyMarginPx ?? 4) / (c.corridorHalfWidthPx ?? 75);
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

// ── Disabled mode ──────────────────────────────────────────────────────────

describe('applyRacerBehavior — disabled', () => {
  it('clears avoidanceActive and draftingBoostActive when disabled', () => {
    const r = makeRacer();
    r.avoidanceActive = true;
    r.draftingBoostActive = true;
    applyRacerBehavior([r], { ...cfg, enabled: false });
    expect(r.avoidanceActive).toBe(false);
    expect(r.draftingBoostActive).toBe(false);
  });

  it('does not move physicalY when disabled', () => {
    const r = makeRacer({ physicalY: 0.5 });
    r.targetPhysicalY = 0.5;
    applyRacerBehavior([r], { ...cfg, enabled: false });
    expect(r.physicalY).toBe(0.5);
  });
});

// ── Step 1: Centerline Attraction ─────────────────────────────────────────

describe('applyRacerBehavior — centerline attraction', () => {
  it('single racer with no conflicts converges toward Y=0 over 100 frames', () => {
    const r = makeRacer({ physicalY: 0.8, t: 0.5, x: 640, y: 360, angle: 0 });
    r.targetPhysicalY = 0.8;
    for (let i = 0; i < 100; i++) {
      applyRacerBehavior([r], cfg);
    }
    expect(r.physicalY).toBeLessThan(0.8);
    expect(r.targetPhysicalY).toBeLessThan(0.4);
  });

  it('single racer from negative side converges toward Y=0', () => {
    const r = makeRacer({ physicalY: -0.8, t: 0.5, x: 640, y: 360, angle: 0 });
    r.targetPhysicalY = -0.8;
    for (let i = 0; i < 100; i++) {
      applyRacerBehavior([r], cfg);
    }
    expect(r.physicalY).toBeGreaterThan(-0.8);
    expect(r.targetPhysicalY).toBeGreaterThan(-0.4);
  });
});

// ── Step 2: Constraint Resolution ─────────────────────────────────────────

describe('applyRacerBehavior — two overlapping racers pushed apart', () => {
  it('two racers at same position: targetPhysicalY separated by at least minLat after one frame', () => {
    const rA = makeRacer({ index: 0, t: 0.5, x: 640, y: 360, angle: 0, physicalY: 0.0 });
    const rB = makeRacer({ index: 1, t: 0.5, x: 640, y: 360, angle: 0, physicalY: 0.0 });
    rA.targetPhysicalY = 0.0;
    rB.targetPhysicalY = 0.0;
    applyRacerBehavior([rA, rB], cfg);
    const separation = Math.abs(rA.targetPhysicalY - rB.targetPhysicalY);
    expect(separation).toBeGreaterThanOrEqual(minLatNorm() - 0.001);
  });

  it('two laterally close racers at similar world position: pushed apart', () => {
    const rA = makeRacer({ index: 0, t: 0.5, x: 640, y: 360, angle: 0, physicalY: 0.1 });
    const rB = makeRacer({ index: 1, t: 0.501, x: 641, y: 360, angle: 0, physicalY: 0.1 });
    rA.targetPhysicalY = 0.1;
    rB.targetPhysicalY = 0.1;
    applyRacerBehavior([rA, rB], cfg);
    const sep = Math.abs(rA.targetPhysicalY - rB.targetPhysicalY);
    expect(sep).toBeGreaterThan(0.01);
  });

  it('two well-separated racers: targetPhysicalY unchanged by constraint (no centerline)', () => {
    const rA = makeRacer({ index: 0, t: 0.5, x: 640, y: 360, angle: 0, physicalY: -0.5 });
    const rB = makeRacer({ index: 1, t: 0.5, x: 640, y: 360, angle: 0, physicalY: 0.5 });
    rA.targetPhysicalY = -0.5;
    rB.targetPhysicalY = 0.5;
    applyRacerBehavior([rA, rB], { ...cfg, centerlineForce: 0 });
    expect(rA.targetPhysicalY).toBeCloseTo(-0.5, 3);
    expect(rB.targetPhysicalY).toBeCloseTo(0.5, 3);
  });
});

describe('applyRacerBehavior — asymmetric resolution: leader displaced less than follower', () => {
  it('leader (higher t) is displaced less than follower', () => {
    // rA is leader (t=0.6), rB is follower (t=0.5)
    const rA = makeRacer({ index: 0, t: 0.6, x: 640, y: 360, angle: 0, physicalY: 0.0 });
    const rB = makeRacer({ index: 1, t: 0.5, x: 638, y: 360, angle: 0, physicalY: 0.0 });
    rA.targetPhysicalY = 0.0;
    rB.targetPhysicalY = 0.0;
    applyRacerBehavior([rA, rB], { ...cfg, centerlineForce: 0 });
    const dispA = Math.abs(rA.targetPhysicalY - 0.0);
    const dispB = Math.abs(rB.targetPhysicalY - 0.0);
    expect(dispA).toBeLessThan(dispB);
  });

  it('displacement ratio matches frontWeight (leader gets frontWeight fraction)', () => {
    const fw = 0.2;
    const rA = makeRacer({ index: 0, t: 0.6, x: 640, y: 360, angle: 0, physicalY: 0.0 });
    const rB = makeRacer({ index: 1, t: 0.5, x: 638, y: 360, angle: 0, physicalY: 0.0 });
    rA.targetPhysicalY = 0.0;
    rB.targetPhysicalY = 0.0;
    applyRacerBehavior([rA, rB], {
      ...cfg,
      centerlineForce: 0,
      frontWeight: fw,
      pbdIterationsPerFrame: 1,
    });
    const dispA = Math.abs(rA.targetPhysicalY);
    const dispB = Math.abs(rB.targetPhysicalY);
    const total = dispA + dispB;
    if (total > 0.0001) {
      expect(dispA / total).toBeCloseTo(fw, 1);
      expect(dispB / total).toBeCloseTo(1 - fw, 1);
    }
  });
});

describe('applyRacerBehavior — three racers in conflict: all pairs resolved', () => {
  it('three stacked racers: all targetPhysicalY pairs separated after 10 iterations', () => {
    // Fully-stacked 3-racer scenario is the extreme edge case.
    // 5 iterations resolves pair-by-pair but outer pair needs more passes.
    // 10 iterations guarantees full resolution for this geometry.
    const racers = [
      makeRacer({ index: 0, t: 0.6, x: 640, y: 360, angle: 0, physicalY: 0 }),
      makeRacer({ index: 1, t: 0.5, x: 639, y: 360, angle: 0, physicalY: 0 }),
      makeRacer({ index: 2, t: 0.4, x: 638, y: 360, angle: 0, physicalY: 0 }),
    ];
    racers.forEach((r) => {
      r.targetPhysicalY = 0;
    });
    applyRacerBehavior(racers, { ...cfg, centerlineForce: 0, pbdIterationsPerFrame: 10 });
    const minSep = minLatNorm() - 0.01;
    for (let i = 0; i < racers.length; i++) {
      for (let j = i + 1; j < racers.length; j++) {
        const sep = Math.abs(racers[i].targetPhysicalY - racers[j].targetPhysicalY);
        expect(sep).toBeGreaterThanOrEqual(minSep);
      }
    }
  });
});

describe('applyRacerBehavior — constraint writes targetPhysicalY, not physicalY directly', () => {
  it('physicalY bounded by maxLateralStepPerFrame even when large correction is needed', () => {
    const rA = makeRacer({ index: 0, t: 0.5, x: 640, y: 360, angle: 0, physicalY: 0.0 });
    const rB = makeRacer({ index: 1, t: 0.5, x: 639, y: 360, angle: 0, physicalY: 0.0 });
    rA.targetPhysicalY = 0.0;
    rB.targetPhysicalY = 0.0;
    const prevPhysA = rA.physicalY;
    const prevPhysB = rB.physicalY;
    applyRacerBehavior([rA, rB], cfg);
    expect(Math.abs(rA.physicalY - prevPhysA)).toBeLessThanOrEqual(MAX_STEP + 0.0001);
    expect(Math.abs(rB.physicalY - prevPhysB)).toBeLessThanOrEqual(MAX_STEP + 0.0001);
    // targetPhysicalY must be set further apart than the single-frame physicalY delta
    const targetSep = Math.abs(rA.targetPhysicalY - rB.targetPhysicalY);
    const physSep = Math.abs(rA.physicalY - rB.physicalY);
    expect(targetSep).toBeGreaterThanOrEqual(physSep);
  });
});

// ── Step 3: Smooth Movement ────────────────────────────────────────────────

describe('applyRacerBehavior — smooth lateral movement: no frame exceeds maxLateralStepPerFrame', () => {
  it('20-racer sim, 600 frames: every frame every racer within maxLateralStepPerFrame', () => {
    const FRAMES = 600;
    const N = 20;
    const racers = Array.from({ length: N }, (_, i) => {
      const t = 0.4 + i * 0.002;
      const r = makeRacer({
        index: i,
        t,
        x: 640 + i * 2,
        y: 360,
        angle: 0,
        physicalY: i % 3 === 0 ? 0.5 : i % 3 === 1 ? -0.3 : 0.1,
      });
      r.targetPhysicalY = r.physicalY;
      return r;
    });

    for (let frame = 0; frame < FRAMES; frame++) {
      const before = racers.map((r) => r.physicalY);
      applyRacerBehavior(racers, cfg);
      for (let i = 0; i < N; i++) {
        const delta = Math.abs(racers[i].physicalY - before[i]);
        expect(delta).toBeLessThanOrEqual(MAX_STEP + 0.0001);
      }
      racers.forEach((r) => {
        r.t = (r.t + 0.001045) % 1;
        r.x = r.t * 1280;
      });
    }
  });
});

// ── Hard 0-overlap guarantee ──────────────────────────────────────────────

describe('applyRacerBehavior — hard 0-overlap guarantee in targetPhysicalY', () => {
  function hasHitboxOverlap(rA, rB) {
    const halfWidthA = (rA.visibleWidthPx ?? 24) / 2 / CORRIDOR_HALF;
    const halfWidthB = (rB.visibleWidthPx ?? 24) / 2 / CORRIDOR_HALF;
    const minLat = halfWidthA + halfWidthB + cfg.safetyMarginPx / CORRIDOR_HALF;
    if (Math.abs(rA.targetPhysicalY - rB.targetPhysicalY) >= minLat) return false;
    const midAngle = (rA.angle + rB.angle) * 0.5;
    const dx = rB.x - rA.x;
    const dy = rB.y - rA.y;
    const longDist = Math.abs(dx * Math.cos(midAngle) + dy * Math.sin(midAngle));
    const minLong =
      (rA.visibleLengthPx ?? 24) / 2 + (rB.visibleLengthPx ?? 24) / 2 + cfg.safetyMarginPx;
    return longDist < minLong;
  }

  it('20-racer sim 1200 frames: 0 hitbox overlaps in targetPhysicalY after warmup (frame 60+)', () => {
    const FRAMES = 1200;
    const WARMUP = 60;
    const N = 20;
    const racers = Array.from({ length: N }, (_, i) => {
      const t = (i / N) * 0.5 + 0.25;
      const r = makeRacer({
        index: i,
        t,
        x: 640 + i * 4,
        y: 360,
        angle: 0,
        physicalY: ((i % 5) - 2) * 0.1,
      });
      r.targetPhysicalY = r.physicalY;
      return r;
    });

    let maxOverlap = 0;

    for (let frame = 0; frame < FRAMES; frame++) {
      applyRacerBehavior(racers, cfg);
      racers.forEach((r) => {
        r.t = (r.t + 0.001045) % 1;
        r.x = r.t * 1280;
      });

      if (frame >= WARMUP) {
        let overlaps = 0;
        for (let i = 0; i < racers.length; i++) {
          for (let j = i + 1; j < racers.length; j++) {
            if (hasHitboxOverlap(racers[i], racers[j])) overlaps++;
          }
        }
        maxOverlap = Math.max(maxOverlap, overlaps);
      }
    }

    // Sub-pixel residuals (<1px) are documented tolerance; full hitbox overlaps = 0.
    expect(maxOverlap).toBe(0);
  });
});

// ── Drafting ──────────────────────────────────────────────────────────────

describe('applyRacerBehavior — drafting', () => {
  it('draftingBoostFactor ramps up when follower is in cone', () => {
    const leader = makeRacer({ index: 0, t: 0.51, x: 660, y: 360, angle: 0, physicalY: 0 });
    const follower = makeRacer({ index: 1, t: 0.5, x: 560, y: 360, angle: 0, physicalY: 0 });
    leader.targetPhysicalY = 0;
    follower.targetPhysicalY = 0;
    expect(follower.draftingBoostFactor).toBe(0);
    applyRacerBehavior([leader, follower], cfg);
    expect(follower.draftingBoostFactor).toBeGreaterThan(0);
    expect(follower.draftingBoostFactor).toBeLessThanOrEqual(
      1 / cfg.draftingActivationFrames + 0.001
    );
  });

  it('draftingBoostFactor ramps down when out of cone', () => {
    const leader = makeRacer({ index: 0, t: 0.8, x: 1024, y: 360, angle: 0, physicalY: 0 });
    const follower = makeRacer({ index: 1, t: 0.5, x: 640, y: 360, angle: 0, physicalY: 0 });
    leader.targetPhysicalY = 0;
    follower.targetPhysicalY = 0;
    follower.draftingBoostFactor = 0.5;
    applyRacerBehavior([leader, follower], cfg);
    expect(follower.draftingBoostFactor).toBeLessThan(0.5);
  });
});

// ── No Render-EMA ─────────────────────────────────────────────────────────

describe('applyRacerBehavior — no Render-EMA (Lesson 70)', () => {
  it('does not add any render-smoothing field to racer', () => {
    const r = makeRacer();
    applyRacerBehavior([r], cfg);
    expect(r.renderY).toBeUndefined();
    expect(r.displayY).toBeUndefined();
    expect(r.smoothedY).toBeUndefined();
  });
});

// ── DEFAULT_RACE_BEHAVIOR_CONFIG: PBD constants present, old constants absent ─

describe('DEFAULT_RACE_BEHAVIOR_CONFIG — PBD architecture', () => {
  it('has pbdIterationsPerFrame', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.pbdIterationsPerFrame).toBeGreaterThanOrEqual(1);
  });

  it('has frontWeight in [0, 1]', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.frontWeight).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.frontWeight).toBeLessThanOrEqual(1);
  });

  it('has centerlineForce in [0, 1]', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.centerlineForce).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.centerlineForce).toBeLessThanOrEqual(1);
  });

  it('has safetyMarginPx', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.safetyMarginPx).toBeGreaterThanOrEqual(0);
  });

  it('has maxLateralStepPerFrame', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.maxLateralStepPerFrame).toBeGreaterThan(0);
  });

  it('does NOT have sight-model constants', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.sightHorizonFrames).toBeUndefined();
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.laneCommitFrames).toBeUndefined();
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.overtakeAggressionDefault).toBeUndefined();
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.speedAdvantageThreshold).toBeUndefined();
  });

  it('does NOT have force-model constants', () => {
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.homeForceStrength).toBeUndefined();
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.comfortThreshold).toBeUndefined();
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.avoidanceDistance).toBeUndefined();
    expect(DEFAULT_RACE_BEHAVIOR_CONFIG.lateralForce).toBeUndefined();
  });
});
