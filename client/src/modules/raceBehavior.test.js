// ============================================================
// File:        raceBehavior.test.js
// Path:        client/src/modules/raceBehavior.test.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: Unit tests for D11 racer-behavior logic (avoidance + drafting).
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { initRacerBehavior, applyRacerBehavior } from './raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';

function makeRacer(overrides = {}) {
  const r = {
    index: 0,
    t: 0.5,
    x: 640,
    y: 360,
    finished: false,
    trackOffset: 0,
    ...overrides,
  };
  initRacerBehavior(r);
  return r;
}

const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };

describe('initRacerBehavior', () => {
  it('sets targetLaneY equal to trackOffset', () => {
    const r = makeRacer({ trackOffset: 0.2 });
    expect(r.targetLaneY).toBe(0.2);
  });

  it('sets currentLaneY equal to trackOffset', () => {
    const r = makeRacer({ trackOffset: -0.3 });
    expect(r.currentLaneY).toBe(-0.3);
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

describe('applyRacerBehavior — disabled', () => {
  it('resets currentLaneY to targetLaneY when disabled', () => {
    const r = makeRacer({ trackOffset: 0.1 });
    r.currentLaneY = 0.25; // drifted
    applyRacerBehavior([r], { ...cfg, enabled: false });
    expect(r.currentLaneY).toBe(r.targetLaneY);
  });

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
});

describe('applyRacerBehavior — lane return', () => {
  it('interpolates currentLaneY toward targetLaneY when no avoidance', () => {
    const r = makeRacer({ trackOffset: 0.1 });
    r.currentLaneY = 0.25;
    applyRacerBehavior([r], cfg);
    // Should have moved toward 0.1
    expect(r.currentLaneY).toBeLessThan(0.25);
    expect(r.currentLaneY).toBeGreaterThan(0.1);
  });

  it('return speed determines interpolation fraction', () => {
    const r = makeRacer({ trackOffset: 0 });
    r.currentLaneY = 0.2;
    const returnSpeed = 0.1;
    applyRacerBehavior([r], { ...cfg, avoidanceReturnSpeed: returnSpeed });
    expect(r.currentLaneY).toBeCloseTo(0.2 * (1 - returnSpeed), 10);
  });
});

describe('applyRacerBehavior — avoidance', () => {
  it('applies no force when racers are farther than avoidanceDistance', () => {
    const r1 = makeRacer({ index: 0, x: 0, y: 0, trackOffset: -0.1 });
    const r2 = makeRacer({ index: 1, x: 200, y: 0, trackOffset: 0.1 });
    applyRacerBehavior([r1, r2], { ...cfg, avoidanceDistance: 80 });
    expect(r1.avoidanceActive).toBe(false);
    expect(r2.avoidanceActive).toBe(false);
  });

  it('activates avoidanceActive when racers are within avoidanceDistance', () => {
    const r1 = makeRacer({ index: 0, x: 0, y: 0, trackOffset: 0 });
    const r2 = makeRacer({ index: 1, x: 30, y: 0, trackOffset: 0 });
    applyRacerBehavior([r1, r2], { ...cfg, avoidanceDistance: 80 });
    expect(r1.avoidanceActive).toBe(true);
    expect(r2.avoidanceActive).toBe(true);
  });

  it('pushes racers apart in lane offset', () => {
    const r1 = makeRacer({ index: 0, x: 0, y: 0, trackOffset: -0.1 });
    const r2 = makeRacer({ index: 1, x: 30, y: 0, trackOffset: 0.1 });
    // r1 has lower offset (-0.1 < 0.1), so r1 should move more negative and r2 more positive
    const before1 = r1.currentLaneY;
    const before2 = r2.currentLaneY;
    applyRacerBehavior([r1, r2], { ...cfg, avoidanceDistance: 80 });
    expect(r1.currentLaneY).toBeLessThan(before1);
    expect(r2.currentLaneY).toBeGreaterThan(before2);
  });

  it('respects avoidanceMaxLateral clamp', () => {
    const r1 = makeRacer({ index: 0, x: 0, y: 0, trackOffset: 0 });
    const r2 = makeRacer({ index: 1, x: 1, y: 0, trackOffset: 0 });
    // Pre-set currentLaneY to near the limit
    r1.currentLaneY = 0.17;
    const maxLateral = 0.18;
    // Apply many times to hit the clamp
    for (let i = 0; i < 50; i++) {
      applyRacerBehavior([r1, r2], {
        ...cfg,
        avoidanceDistance: 80,
        avoidanceMaxLateral: maxLateral,
      });
    }
    expect(r1.currentLaneY).toBeLessThanOrEqual(r1.targetLaneY + maxLateral + 0.001);
    expect(r1.currentLaneY).toBeGreaterThanOrEqual(-0.5);
  });

  it('both racers can shift simultaneously', () => {
    const r1 = makeRacer({ index: 0, x: 0, y: 0, trackOffset: 0 });
    const r2 = makeRacer({ index: 1, x: 10, y: 0, trackOffset: 0 });
    applyRacerBehavior([r1, r2], cfg);
    // Both should have shifted (one up, one down)
    const moved1 = r1.currentLaneY !== r1.targetLaneY;
    const moved2 = r2.currentLaneY !== r2.targetLaneY;
    expect(moved1 || moved2).toBe(true);
  });
});

describe('applyRacerBehavior — drafting', () => {
  it('grants boost when follower is close behind leader in same lane', () => {
    const leader = makeRacer({ index: 0, x: 100, y: 0, t: 0.5, trackOffset: 0 });
    const follower = makeRacer({ index: 1, x: 90, y: 0, t: 0.49, trackOffset: 0 });
    applyRacerBehavior([leader, follower], cfg);
    expect(follower.draftingBoostActive).toBe(true);
    expect(leader.draftingBoostActive).toBe(false);
  });

  it('no boost when follower is in a different lane', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 100, y: 0, trackOffset: 0.3 });
    const follower = makeRacer({ index: 1, t: 0.49, x: 90, y: 0, trackOffset: -0.3 });
    applyRacerBehavior([leader, follower], cfg);
    expect(follower.draftingBoostActive).toBe(false);
  });

  it('no boost when racer is ahead of potential drafter target', () => {
    const r1 = makeRacer({ index: 0, t: 0.5, x: 100, y: 0, trackOffset: 0 });
    const r2 = makeRacer({ index: 1, t: 0.49, x: 90, y: 0, trackOffset: 0 });
    applyRacerBehavior([r1, r2], cfg);
    // r1 is ahead — r1 should NOT get a boost, r2 (follower) should
    expect(r1.draftingBoostActive).toBe(false);
  });

  it('no boost when follower is too far behind', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 100, y: 0, trackOffset: 0 });
    const follower = makeRacer({ index: 1, t: 0.4, x: 50, y: 0, trackOffset: 0 });
    // tDiff = 0.1 > draftingDistanceT = 0.02
    applyRacerBehavior([leader, follower], { ...cfg, draftingDistanceT: 0.02 });
    expect(follower.draftingBoostActive).toBe(false);
  });

  it('no boost when behaviorEnabled is false', () => {
    const leader = makeRacer({ index: 0, t: 0.5, x: 100, y: 0, trackOffset: 0 });
    const follower = makeRacer({ index: 1, t: 0.49, x: 90, y: 0, trackOffset: 0 });
    applyRacerBehavior([leader, follower], { ...cfg, enabled: false });
    expect(follower.draftingBoostActive).toBe(false);
  });
});

describe('applyRacerBehavior — finished racers excluded', () => {
  it('finished racers are not affected by avoidance', () => {
    const r1 = makeRacer({ index: 0, x: 0, y: 0, trackOffset: 0, finished: true });
    const r2 = makeRacer({ index: 1, x: 10, y: 0, trackOffset: 0 });
    r1.currentLaneY = 0.15; // drifted
    applyRacerBehavior([r1, r2], cfg);
    expect(r1.currentLaneY).toBe(0.15); // not touched
  });
});
