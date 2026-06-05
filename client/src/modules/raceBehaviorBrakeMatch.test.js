// ============================================================
// File:        raceBehaviorBrakeMatch.test.js
// Path:        client/src/modules/raceBehaviorBrakeMatch.test.js
// Project:     RaceArena
// Description: Unit tests for Step-1 brake-to-match logic (report 06).
//              Pure logic tests: cap computation, jitter guard, state lifecycle,
//              multi-leader selection, anti-trap, stale-index guard.
//              No React, no DOM — mirrors raceBehavior.test.js style.
//
// Geometry note: dynamicBrakeT = (spriteWorldSizePx/pathLengthPx) × speedBrakeTMultiplier
//   With spriteWorldSizePx=40, pathLengthPx=20000, multiplier=1.5 → dynamicBrakeT=0.003.
//   Pair dT must be < 0.003 to enter the brake zone. Tests use dT=0.0015 (leader at t+0.0015).
//   Anti-trap tests also set lateralForce=0 + homeForceStrength=0 so physicalY stays at 0
//   across all 90 frames (no free-lane push drifts the pair out of the brake zone).
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeBrakeMatchFactor, initRacerBehavior, applyRacerBehavior } from './raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRacer(overrides = {}) {
  const r = {
    index: 0,
    t: 0.5,
    x: 0,
    y: 0,
    angle: 0,
    finished: false,
    baseSpeed: 1.0e-4,
    trajectoryMult: 1.0,
    areaBonusMult: 1.0,
    rubberBandMult: 1.0,
    draftingBoostActive: false,
    spriteWorldSizePx: 40,
    geometricTrackWidthPx: 300,
    pathLengthPx: 20000,
    ...overrides,
  };
  initRacerBehavior(r);
  return r;
}

// Base config: pin activation-zone params to the values these tests were designed for.
// Avoidance zone: (40/20000) × speedBrakeTMultiplier=1.5 = 0.003 → pairs at dT=0.0015 activate.
// Brake-to-match zone: pinned equal to avoidance zone so test pairs enter both zones.
// Pinning all four values here makes the tests independent of DEFAULT_RACE_BEHAVIOR_CONFIG changes
// (these tests verify brake-to-match formula/state logic, not the activation threshold defaults).
const cfg = {
  ...DEFAULT_RACE_BEHAVIOR_CONFIG,
  speedBrakeTMultiplier: 1.5,
  speedBrakeYThreshold: 0.18,
  brakeMatchActivationTMultiplier: 1.5,
  brakeMatchActivationYThreshold: 0.18,
};

// Config variant that freezes physicalY: no lateral forces fire.
// Used for anti-trap tests where we need the pair to stay in the brake zone
// for all 90 frames without lateral drift.
const cfgFrozen = { ...cfg, lateralForce: 0, homeForceStrength: 0 };

// Pair in brake zone: trailer t=0.5000, leader t=0.5015 → dT=0.0015 < dynamicBrakeT=0.003
function makePair(trailerSpeed = 1.2e-4, leaderSpeed = 1.0e-4) {
  const leader = makeRacer({ index: 1, t: 0.5015, baseSpeed: leaderSpeed });
  const trailer = makeRacer({ index: 0, t: 0.5, baseSpeed: trailerSpeed });
  return [trailer, leader];
}

function runFrames(racers, n, config = cfg) {
  for (let i = 0; i < n; i++) applyRacerBehavior(racers, config);
  return racers;
}

// ── computeBrakeMatchFactor — basic ───────────────────────────────────────────

describe('computeBrakeMatchFactor — basic', () => {
  it('returns 1.0 when leaderFwdSpeed is zero', () => {
    expect(computeBrakeMatchFactor(0, 1e-4, 0.005, 0.001)).toBe(1.0);
  });

  it('returns 1.0 when trailerDenom is zero', () => {
    expect(computeBrakeMatchFactor(1e-4, 0, 0.005, 0.001)).toBe(1.0);
  });

  it('returns 1.0 when trailer is same speed as leader', () => {
    expect(computeBrakeMatchFactor(1e-4, 1e-4, 0.005, 0.001)).toBe(1.0);
  });

  it('returns 1.0 when trailer is slower than leader', () => {
    expect(computeBrakeMatchFactor(1.2e-4, 0.9e-4, 0.005, 0.001)).toBe(1.0);
  });
});

describe('computeBrakeMatchFactor — min-differential guard', () => {
  const minDiff = 0.005;
  const leader = 1e-4;

  it('returns 1.0 when trailer excess equals minDifferential exactly (border, not strictly over)', () => {
    // trailerDenom = leader × (1 + minDiff) → condition is ≤ not <, so returns 1.0
    const trailer = leader * (1 + minDiff);
    expect(computeBrakeMatchFactor(leader, trailer, minDiff, 0.001)).toBe(1.0);
  });

  it('returns < 1.0 when trailer exceeds leader by more than minDifferential', () => {
    // Add a tiny epsilon above the threshold
    const trailer = leader * (1 + minDiff) + 1e-9;
    expect(computeBrakeMatchFactor(leader, trailer, minDiff, 0.001)).toBeLessThan(1.0);
  });
});

describe('computeBrakeMatchFactor — cap formula', () => {
  it('equals leaderSpeed/trailerDenom × (1−safetyMargin)', () => {
    const leader = 0.9e-4;
    const trailer = 1.1e-4;
    const margin = 0.001;
    expect(computeBrakeMatchFactor(leader, trailer, 0.005, margin)).toBeCloseTo(
      (leader / trailer) * (1 - margin),
      10
    );
  });

  it('result is strictly less than 1.0 when trailer is meaningfully faster', () => {
    expect(computeBrakeMatchFactor(0.9e-4, 1.1e-4, 0.005, 0.001)).toBeLessThan(1.0);
  });

  it('result is positive', () => {
    expect(computeBrakeMatchFactor(0.1e-4, 1.1e-4, 0.005, 0.001)).toBeGreaterThan(0);
  });

  it('safetyMargin shifts result fractionally below raw ratio', () => {
    const leader = 0.85e-4;
    const trailer = 1.1e-4;
    const withMargin = computeBrakeMatchFactor(leader, trailer, 0.001, 0.002);
    const withoutMargin = leader / trailer;
    expect(withMargin).toBeLessThan(withoutMargin);
    expect(withMargin).toBeCloseTo(withoutMargin * (1 - 0.002), 10);
  });
});

// ── initRacerBehavior — new brake-match fields ────────────────────────────────

describe('initRacerBehavior — brake-match fields', () => {
  it('initialises brakeMatchLeaderIndex to -1', () => {
    expect(makeRacer().brakeMatchLeaderIndex).toBe(-1);
  });

  it('initialises brakeMatchFactor to 1.0', () => {
    expect(makeRacer().brakeMatchFactor).toBe(1.0);
  });

  it('initialises brakeMatchFrames to 0', () => {
    expect(makeRacer().brakeMatchFrames).toBe(0);
  });

  it('initialises brakeReleaseFrames to 0', () => {
    expect(makeRacer().brakeReleaseFrames).toBe(0);
  });
});

// ── state lifecycle — entering hold ──────────────────────────────────────────

describe('brake-match state — entering hold', () => {
  it('sets brakeMatchLeaderIndex to leader index after one frame in brake zone', () => {
    const [trailer, leader] = makePair();
    applyRacerBehavior([trailer, leader], cfg);
    expect(trailer.brakeMatchLeaderIndex).toBe(leader.index);
  });

  it('sets brakeMatchFactor < 1.0 when trailer is faster than leader beyond min-diff', () => {
    const [trailer, leader] = makePair(1.2e-4, 1.0e-4); // trailer 20% faster
    applyRacerBehavior([trailer, leader], cfg);
    expect(trailer.brakeMatchFactor).toBeLessThan(1.0);
  });

  it('brakeMatchFactor matches computeBrakeMatchFactor formula', () => {
    const trailerSpeed = 1.2e-4;
    const leaderSpeed = 1.0e-4;
    const [trailer, leader] = makePair(trailerSpeed, leaderSpeed);
    applyRacerBehavior([trailer, leader], cfg);
    const expected = computeBrakeMatchFactor(
      leaderSpeed,
      trailerSpeed,
      cfg.speedMatchMinDifferential,
      cfg.speedMatchSafetyMargin
    );
    expect(trailer.brakeMatchFactor).toBeCloseTo(expected, 8);
  });

  it('increments brakeMatchFrames each frame while in brake zone', () => {
    const [trailer, leader] = makePair();
    applyRacerBehavior([trailer, leader], cfgFrozen);
    expect(trailer.brakeMatchFrames).toBe(1);
    applyRacerBehavior([trailer, leader], cfgFrozen);
    expect(trailer.brakeMatchFrames).toBe(2);
  });

  it('leader does NOT have its brakeMatchLeaderIndex set (only trailer is capped)', () => {
    const [trailer, leader] = makePair();
    applyRacerBehavior([trailer, leader], cfg);
    expect(leader.brakeMatchLeaderIndex).toBe(-1);
  });
});

// ── state lifecycle — debounced release ───────────────────────────────────────

describe('brake-match state — debounced release', () => {
  it('brakeMatchLeaderIndex stays -1 when never in brake zone', () => {
    // leader is far ahead: dT >> dynamicBrakeT
    const leader = makeRacer({ index: 1, t: 0.6, baseSpeed: 1.0e-4 });
    const trailer = makeRacer({ index: 0, t: 0.5, baseSpeed: 1.2e-4 });
    applyRacerBehavior([trailer, leader], cfg);
    expect(trailer.brakeMatchLeaderIndex).toBe(-1);
    expect(trailer.brakeMatchFactor).toBe(1.0);
  });

  it('releases hold after brakeReleaseDebounceFrames consecutive clear frames', () => {
    const [trailer, leader] = makePair();
    // Enter hold
    applyRacerBehavior([trailer, leader], cfgFrozen);
    expect(trailer.brakeMatchLeaderIndex).toBe(1);

    // Move leader far away (dT >> dynamicBrakeT)
    leader.t = 0.6;
    const debounce = cfg.brakeReleaseDebounceFrames; // 3

    // Frames 1..(debounce-1): still in hold (debounce counting)
    for (let i = 0; i < debounce - 1; i++) {
      applyRacerBehavior([trailer, leader], cfgFrozen);
      expect(trailer.brakeMatchLeaderIndex).toBe(1);
    }
    // Frame debounce: hold releases
    applyRacerBehavior([trailer, leader], cfgFrozen);
    expect(trailer.brakeMatchLeaderIndex).toBe(-1);
    expect(trailer.brakeMatchFactor).toBe(1.0);
    expect(trailer.brakeMatchFrames).toBe(0);
  });
});

// ── multi-leader: most constraining wins ──────────────────────────────────────

describe('brake-match state — multi-leader selection', () => {
  it('locks to the leader producing the lowest cap (most constraining)', () => {
    // trailer at t=0.500, two leaders both within brake zone (dT < 0.003)
    const trailer = makeRacer({ index: 0, t: 0.5, baseSpeed: 1.2e-4 });
    const fastLeader = makeRacer({ index: 1, t: 0.501, baseSpeed: 1.05e-4 }); // nearly as fast → higher cap
    const slowLeader = makeRacer({ index: 2, t: 0.5018, baseSpeed: 0.8e-4 }); // slow → lower cap

    applyRacerBehavior([trailer, fastLeader, slowLeader], cfgFrozen);

    const capFast = computeBrakeMatchFactor(
      fastLeader.baseSpeed,
      trailer.baseSpeed,
      cfg.speedMatchMinDifferential,
      cfg.speedMatchSafetyMargin
    );
    const capSlow = computeBrakeMatchFactor(
      slowLeader.baseSpeed,
      trailer.baseSpeed,
      cfg.speedMatchMinDifferential,
      cfg.speedMatchSafetyMargin
    );
    // slowLeader imposes more braking (lower cap)
    expect(capSlow).toBeLessThan(capFast);
    expect(trailer.brakeMatchFactor).toBeCloseTo(capSlow, 6);
    expect(trailer.brakeMatchLeaderIndex).toBe(slowLeader.index);
  });
});

// ── anti-trap: timeout → escape → cooldown ───────────────────────────────────

describe('brake-match state — anti-trap', () => {
  // cfgFrozen (lateralForce=0, homeForceStrength=0) keeps physicalY=0 so the pair
  // stays inside the brake zone for all 90+ frames.

  it('brakeMatchFrames goes negative after brakeHoldTimeoutFrames hold frames', () => {
    const [trailer, leader] = makePair();
    runFrames([trailer, leader], cfg.brakeHoldTimeoutFrames, cfgFrozen);
    expect(trailer.brakeMatchFrames).toBeLessThan(0);
    expect(trailer.brakeMatchLeaderIndex).toBe(-1);
    expect(trailer.brakeMatchFactor).toBe(1.0);
  });

  it('brakeMatchFrames starts at -(escapeFrames+cooldownFrames) immediately after escape', () => {
    const [trailer, leader] = makePair();
    runFrames([trailer, leader], cfg.brakeHoldTimeoutFrames, cfgFrozen);
    const expected = -(
      cfg.brakeHoldEscapeReleaseDurationFrames + cfg.brakeHoldEscapeCooldownFrames
    );
    expect(trailer.brakeMatchFrames).toBe(expected);
  });

  it('brakeMatchFrames counts up by 1 per frame during escape/cooldown', () => {
    const [trailer, leader] = makePair();
    runFrames([trailer, leader], cfg.brakeHoldTimeoutFrames, cfgFrozen);
    const startFrames = trailer.brakeMatchFrames;
    applyRacerBehavior([trailer, leader], cfgFrozen);
    expect(trailer.brakeMatchFrames).toBe(startFrames + 1);
  });

  it('brakeMatchLeaderIndex stays -1 during full escape+cooldown even with leader in zone', () => {
    const [trailer, leader] = makePair();
    // Trigger escape
    runFrames([trailer, leader], cfg.brakeHoldTimeoutFrames, cfgFrozen);
    const total = cfg.brakeHoldEscapeReleaseDurationFrames + cfg.brakeHoldEscapeCooldownFrames;
    for (let i = 0; i < total; i++) {
      applyRacerBehavior([trailer, leader], cfgFrozen);
      expect(trailer.brakeMatchLeaderIndex).toBe(-1);
    }
  });

  it('can re-enter hold after escape+cooldown reaches 0', () => {
    const [trailer, leader] = makePair();
    // Trigger escape
    runFrames([trailer, leader], cfg.brakeHoldTimeoutFrames, cfgFrozen);
    // Run through full escape+cooldown
    const total = cfg.brakeHoldEscapeReleaseDurationFrames + cfg.brakeHoldEscapeCooldownFrames;
    runFrames([trailer, leader], total, cfgFrozen);
    // brakeMatchFrames should now be 0
    expect(trailer.brakeMatchFrames).toBe(0);
    // Next frame with leader in zone: re-enter hold
    applyRacerBehavior([trailer, leader], cfgFrozen);
    expect(trailer.brakeMatchLeaderIndex).toBe(leader.index);
    expect(trailer.brakeMatchFrames).toBe(1);
  });
});

// ── stale-index guard ─────────────────────────────────────────────────────────

describe('brake-match state — stale-index guard', () => {
  it('resets brakeMatchLeaderIndex to -1 when locked leader is marked finished', () => {
    const [trailer, leader] = makePair();
    // Enter hold
    applyRacerBehavior([trailer, leader], cfgFrozen);
    expect(trailer.brakeMatchLeaderIndex).toBe(leader.index);

    // Mark leader as finished — applyRacerBehavior filters it out of active
    leader.finished = true;
    applyRacerBehavior([trailer, leader], cfgFrozen);
    expect(trailer.brakeMatchLeaderIndex).toBe(-1);
    expect(trailer.brakeMatchFactor).toBe(1.0);
  });
});

// ── leader-brake fix: cap accounts for leader's floor brake ──────────────────
//
// Proved mechanism (report 09): cap was computed from leaderRawSpeed, but the
// leader also advances at leaderRawSpeed × 0.945 (floor brake when avoidanceActive).
// Trailer was capped at leaderRawSpeed → 5.8% bypass every frame.
// Fix: leaderFwdSpeed = leaderRawSpeed × min(speedBrakeFactor, leader.brakeMatchFactor).

describe('brake-match — cap accounts for leader own floor brake (pack-cascade fix)', () => {
  // Chain: r0 (slow, far ahead) → r1 (medium) → r2 (fastest trailer).
  // r0 is far enough ahead that r2 is NOT in r0's brake zone; only r1-r0 and r2-r1 pairs fire.
  function makeChain() {
    const r0 = makeRacer({ index: 0, t: 0.504, baseSpeed: 1.0e-4 }); // front, slow
    const r1 = makeRacer({ index: 1, t: 0.5015, baseSpeed: 1.1e-4 }); // middle
    const r2 = makeRacer({ index: 2, t: 0.5, baseSpeed: 1.3e-4 }); // trailer, fast
    return [r0, r1, r2];
  }

  it('first frame: r1 enters brake zone of r0, r1.avoidanceActive becomes true', () => {
    const [r0, r1, r2] = makeChain();
    applyRacerBehavior([r0, r1, r2], cfgFrozen);
    expect(r1.avoidanceActive).toBe(true);
    expect(r1.brakeMatchFactor).toBeLessThan(1.0);
  });

  it('second frame: r2 cap uses r1 braked speed (not r1 raw speed)', () => {
    const [r0, r1, r2] = makeChain();
    // Frame 1: establishes r1.avoidanceActive=true and r1.brakeMatchFactor
    applyRacerBehavior([r0, r1, r2], cfgFrozen);
    const r1BrakeFactor = r1.brakeMatchFactor; // ~0.908 = r0.baseSpeed/r1.baseSpeed × 0.999
    expect(r1BrakeFactor).toBeLessThan(1.0);

    // Frame 2: r2's cap should use r1.braked speed
    applyRacerBehavior([r0, r1, r2], cfgFrozen);

    const leaderBrake = Math.min(cfgFrozen.speedBrakeFactor, r1BrakeFactor);
    const expected = computeBrakeMatchFactor(
      1.1e-4 * leaderBrake, // r1.baseSpeed × leaderBrake
      1.3e-4, // r2.baseSpeed
      cfgFrozen.speedMatchMinDifferential,
      cfgFrozen.speedMatchSafetyMargin
    );
    expect(r2.brakeMatchFactor).toBeCloseTo(expected, 6);
  });

  it('second frame cap is tighter than first frame cap (accounts for leader brake)', () => {
    const [r0, r1, r2] = makeChain();
    // Frame 1: r2 cap ignores r1 brake (r1 not yet avoidanceActive at cap-compute time)
    applyRacerBehavior([r0, r1, r2], cfgFrozen);
    const cap1 = r2.brakeMatchFactor;
    // Frame 2: r2 cap uses r1 braked speed → tighter cap (lower brakeMatchFactor)
    applyRacerBehavior([r0, r1, r2], cfgFrozen);
    const cap2 = r2.brakeMatchFactor;
    expect(cap2).toBeLessThan(cap1);
  });

  it('cap uses raw leader speed when leader is NOT avoidanceActive', () => {
    // Isolated pair: leader not in any brake zone → leaderBrake=1.0
    const [trailer, leader] = makePair(1.2e-4, 1.0e-4);
    applyRacerBehavior([trailer, leader], cfgFrozen);
    // leader.avoidanceActive = false (leader has no leader ahead → not in speedBrakeSet)
    expect(leader.avoidanceActive).toBe(false);
    const expected = computeBrakeMatchFactor(
      1.0e-4, // raw speed, no discount
      1.2e-4,
      cfgFrozen.speedMatchMinDifferential,
      cfgFrozen.speedMatchSafetyMargin
    );
    expect(trailer.brakeMatchFactor).toBeCloseTo(expected, 6);
  });
});

// ── adjacent-collision prevention (min-diff guard) ────────────────────────────

describe('brake-match state — min-diff guard prevents unnecessary cap', () => {
  it('brakeMatchFactor is 1.0 when trailer speed equals leader speed', () => {
    const [trailer, leader] = makePair(1.0e-4, 1.0e-4); // identical speeds
    applyRacerBehavior([trailer, leader], cfg);
    expect(trailer.brakeMatchFactor).toBe(1.0);
  });

  it('brakeMatchFactor is 1.0 when trailer is only 0.1% faster (below 0.5% threshold)', () => {
    const [trailer, leader] = makePair(1.001e-4, 1.0e-4);
    applyRacerBehavior([trailer, leader], cfg);
    expect(trailer.brakeMatchFactor).toBe(1.0);
  });

  it('brakeMatchFactor is 1.0 when trailer is slower than leader', () => {
    const [trailer, leader] = makePair(0.9e-4, 1.2e-4);
    applyRacerBehavior([trailer, leader], cfg);
    expect(trailer.brakeMatchFactor).toBe(1.0);
  });
});
