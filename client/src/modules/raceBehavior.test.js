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
// softSteeringStrength pinned 0: the soft-steering spring is the unconditional lateral
// model now, so we neutralize it here to isolate the kept force mechanisms under test.
const cfg = {
  ...DEFAULT_RACE_BEHAVIOR_CONFIG,
  hardSeparationEnabled: false,
  softSteeringStrength: 0,
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

// ── Comfort zone & boundary ────────────────────────────────────────────────

describe('applyRacerBehavior — comfort zone & boundary', () => {
  it('no soft repulsion inside comfortThreshold', () => {
    const r = makeRacer();
    r.physicalY = cfg.comfortThreshold - 0.05; // just inside
    const before = r.physicalY;
    // With homeForce pulling toward 0, displacement grows unless repulsion adds extra.
    // Run isolated to detect any repulsion contribution.
    applyRacerBehavior([r], { ...cfg, softRepulsionStrength: 999 });
    // Without home force and inside threshold, repulsion should not fire → no change
    expect(r.physicalY).toBeCloseTo(before, 5);
  });

  it('soft repulsion fires outside comfortThreshold', () => {
    const r = makeRacer();
    r.physicalY = cfg.comfortThreshold + 0.1;
    applyRacerBehavior([r], { ...cfg });
    // Repulsion should push physicalY toward center
    expect(r.physicalY).toBeLessThan(cfg.comfortThreshold + 0.1);
  });

  it('soft repulsion grows as physicalY approaches 1.0', () => {
    const near = makeRacer();
    const far = makeRacer();
    near.physicalY = 0.95;
    far.physicalY = cfg.comfortThreshold + 0.01;
    applyRacerBehavior([near], { ...cfg });
    applyRacerBehavior([far], { ...cfg });
    const nearDelta = 0.95 - near.physicalY;
    const farDelta = cfg.comfortThreshold + 0.01 - far.physicalY;
    expect(nearDelta).toBeGreaterThan(farDelta);
  });

  it('hard clamp keeps physicalY within [-1, +1]', () => {
    const r = makeRacer();
    r.physicalY = 2.0; // artificially beyond boundary
    applyRacerBehavior([r], { ...cfg, softRepulsionStrength: 0 });
    expect(r.physicalY).toBeLessThanOrEqual(1.0);
  });

  it('hard clamp works on negative side', () => {
    const r = makeRacer();
    r.physicalY = -2.0;
    applyRacerBehavior([r], { ...cfg, softRepulsionStrength: 0 });
    expect(r.physicalY).toBeGreaterThanOrEqual(-1.0);
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
      speedBrakeTMultiplier: 1.5,
    });
    expect(inside.avoidanceActive).toBe(true);

    // Place trailer just outside threshold (dT=0.041) → does not fire
    const outside = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.0 });
    const leader2 = makeLaneRacer({ index: 1, t: 0.541, physicalY: 0.0 });
    applyRacerBehavior([outside, leader2], {
      ...cfg,
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
      speedBrakeTMultiplier: 1.5,
    });
    expect(trailerIn.avoidanceActive).toBe(true);

    // outside: |dY|=0.45 > 0.400 → no brake even though longitudinally close
    const trailerOut = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.0 });
    const leaderOut = makeLaneRacer({ index: 1, t: 0.537, physicalY: 0.45 });
    applyRacerBehavior([trailerOut, leaderOut], {
      ...cfg,
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

// ── Lateral velocity + damping ──────────────────────────────────────────────

describe('applyRacerBehavior — lateral velocity + damping', () => {
  it('velocity is reset to 0 when physicalY is clamped at the boundary', () => {
    const r = makeRacer();
    r.physicalY = 2.0; // beyond maxLateral — will be clamped
    r.physicalYVelocity = 0.5; // outward momentum
    applyRacerBehavior([r], { ...cfg, softRepulsionStrength: 0 });
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
      softRepulsionStrength: 0,
      avoidanceWarmupMs: 3000,
    };
    for (const isOpen of [true, false]) {
      const [a, b] = overlapPair();
      // priorityExtras supplies currentTs → the warmup clock. currentTs=0 → scale 0.
      applyRacerBehavior([a, b], { ...base, isOpen }, { currentTs: 0 });
      expect(a.physicalY).toBeCloseTo(0.01, 9); // unchanged — strength ramped to 0
      expect(b.physicalY).toBeCloseTo(-0.01, 9);
    }
  });

  it('warmup ramp: half warmup separates less than full warmup', () => {
    const base = {
      ...onFull(1.0),
      lateralForce: 0,
      softRepulsionStrength: 0,
      avoidanceWarmupMs: 3000,
    };
    const [aH, bH] = overlapPair();
    const [aF, bF] = overlapPair();
    applyRacerBehavior([aH, bH], base, { currentTs: 1500 }); // half warmup
    applyRacerBehavior([aF, bF], base, { currentTs: 3000 }); // full warmup
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
