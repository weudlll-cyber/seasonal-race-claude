// ============================================================
// File:        raceBehaviorPriorityMode.test.js
// Path:        client/src/modules/raceBehaviorPriorityMode.test.js
// Project:     RaceArena
// Created:     2026-06-10
// Description: Contract tests for raceBehavior.js — priority-mode system
//              (OVERLAP / COOLDOWN) and anti-starvation commit timeout.
//              All fixtures use makeLaneRacer (drawnBodyWidthPx + drawnBodyLengthPx
//              set) to hit the browser geometry path, never the sim frameSizePx
//              fallback (which would fire overlap at the wrong threshold).
// ============================================================

import { describe, it, expect } from 'vitest';
import { applyRacerBehavior, PRIORITY_MODE, initRacerBehavior } from './raceBehavior.js';
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

// Browser-path fixture: drawnBodyWidthPx=28 + drawnBodyLengthPx=31 match the
// dragon sprite. pairContact produces contactWidth=28px, contactLength=31px.
//   Gate:    latPx < 28×1.2=33.6  AND  longPx < 31×1.2=37.2
//   Overlap: latPx ≤ 28 (|dY|≤0.4)  AND  longPx ≤ 31 (dT≤0.0258)
// Without drawnBody* the sim fallback uses frameSizePx=40 (square) → overlap
// fires at the wrong distance. Never use plain makeRacer for these tests.
function makeLaneRacer(overrides = {}) {
  const { physicalY, ...rest } = overrides;
  const racer = makeRacer({
    frameSizePx: 40,
    trackWidthPx: 140,
    pathLengthPx: 1200,
    drawnBodyWidthPx: 28,
    drawnBodyLengthPx: 31,
    ...rest,
  });
  if (Number.isFinite(physicalY)) racer.physicalY = physicalY;
  return racer;
}

// Pin the hard-separation backstop OFF: these tests isolate priority-mode home-force
// behavior; the positional separation pass (default-on) would perturb physicalY.
// softSteeringEnabled pinned false too: these verify the legacy L1–L5 home-force path,
// which is now the opt-out path (the default flipped to true). See storage/defaults.js.
const cfg = {
  ...DEFAULT_RACE_BEHAVIOR_CONFIG,
  hardSeparationEnabled: false,
  softSteeringEnabled: false,
};

// Isolates home-force effect: avoidance and soft-repulsion zeroed, home-force
// active at a known value so mode-based suspension is observable.
const cfgHomeSpy = {
  ...cfg,
  lateralForce: 0,
  softRepulsionStrength: 0,
  homeForceStrength: 0.04,
};

// Freezes lateral position across many frames: all lateral forces zeroed.
// isOpen:true required — Stage B (same-lane commit) is open-track only.
const cfgFrozenOpen = {
  ...cfg,
  lateralForce: 0,
  homeForceStrength: 0,
  isOpen: true,
};

// ── A1 — OVERLAP mode: detected and home force suspended ──────────────────────

describe('applyRacerBehavior — priority mode OVERLAP', () => {
  // Geometry: dT=0.001 → longPx=1.2 < longTrigger(37.2) → gate passes.
  // |dY|=0 → latPx=0 < latTrigger(33.6) → gate passes.
  // Overlap: dT=0.001 ≤ tHalfSpan(31/1200≈0.0258) AND |dY|=0 ≤ lateralHalfSpan(28/70≈0.4) → true.
  // Browser path confirmed: both racers carry drawnBodyWidthPx=28 + drawnBodyLengthPx=31.

  it('both racers enter PRIORITY_MODE.OVERLAP when geometrically overlapping', () => {
    const a = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 1, t: 0.501, physicalY: 0.5 });

    applyRacerBehavior([a, b], cfgHomeSpy, { cooldownMs: 500, currentTs: 1000 });

    expect(a.currentMode).toBe(PRIORITY_MODE.OVERLAP);
    expect(b.currentMode).toBe(PRIORITY_MODE.OVERLAP);
  });

  it('physicalY does not move toward center during OVERLAP (home force suspended)', () => {
    // lateralForce:0 + softRepulsionStrength:0 + OVERLAP mode → net delta = 0 → physicalY frozen.
    // Without priorityExtras the legacy home force would pull physicalY below 0.5.
    const a = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 1, t: 0.501, physicalY: 0.5 });

    applyRacerBehavior([a, b], cfgHomeSpy, { cooldownMs: 500, currentTs: 1000 });

    expect(a.physicalY).toBeCloseTo(0.5, 5);
  });
});

// ── A2 — COOLDOWN grace period after overlap ends ─────────────────────────────

describe('applyRacerBehavior — priority mode COOLDOWN', () => {
  it('transitions OVERLAP → COOLDOWN → NORMAL; home force matches each mode', () => {
    const a = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0.5 });
    const b = makeLaneRacer({ index: 1, t: 0.501, physicalY: 0.5 });
    const cooldownMs = 500;

    // Step 1: overlapping → OVERLAP; home force suspended (physicalY frozen).
    applyRacerBehavior([a, b], cfgHomeSpy, { cooldownMs, currentTs: 1000 });
    expect(a.currentMode).toBe(PRIORITY_MODE.OVERLAP);
    expect(a.physicalY).toBeCloseTo(0.5, 5);

    // Separate the pair so they no longer overlap.
    // longPx = 0.1 × 1200 = 120 > longTrigger(37.2) → gate rejects → not in overlapSet.
    b.t = 0.6;

    // Step 2: same currentTs — timeSinceOverlap = 0 < cooldownMs → COOLDOWN; home force still off.
    applyRacerBehavior([a, b], cfgHomeSpy, { cooldownMs, currentTs: 1000 });
    expect(a.currentMode).toBe(PRIORITY_MODE.COOLDOWN);
    expect(a.physicalY).toBeCloseTo(0.5, 5);

    // Step 3: currentTs past cooldownMs — timeSinceOverlap = 502 > 500 → NORMAL; home force on.
    applyRacerBehavior([a, b], cfgHomeSpy, { cooldownMs, currentTs: 1502 });
    expect(a.currentMode).toBe(PRIORITY_MODE.NORMAL);
    expect(a.physicalY).toBeLessThan(0.5); // inward pull resumes → physicalY decreases
  });
});

// ── A4 — Same-lane commit decays when same-lane leader departs ────────────────

describe('applyRacerBehavior — same-lane commit decays when leader departs (open track)', () => {
  // drawnBodyWidthPx=28 required: same-lane detection uses pxToPhysicalY(28, 140) ≈ 0.4.
  // Without drawnBodyWidthPx the sim fallback (frameSizePx=40) gives a different gate width.
  // isOpen:true required: Stage B is open-track only.
  // Debounce value read from cfg.brakeReleaseDebounceFrames (not hardcoded).
  //
  // Build phase: run pair in same-lane zone for (dbDecay+1) frames.
  //   After (dbDecay+1) frames: approachCommitFrames = dbDecay+1.
  // Decay maths for any dbDecay ≥ 1:
  //   Step 1: (dbDecay+1) − dbDecay = 1  → still non-zero  (gradual)
  //   Step 2: 1 − dbDecay ≤ 0 → 0        → cleared

  it('approachCommitDir reaches 0 after the leader leaves the same-lane zone', () => {
    const dbDecay = cfg.brakeReleaseDebounceFrames;
    const buildFrames = dbDecay + 1;

    const trailer = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0 });
    const leader = makeLaneRacer({ index: 1, t: 0.501, physicalY: 0 });

    // Phase 1: build commitment — pair in same-lane zone for (dbDecay+1) frames.
    for (let f = 0; f < buildFrames; f++) {
      applyRacerBehavior([trailer, leader], cfgFrozenOpen);
    }
    expect(trailer.approachCommitDir).not.toBe(0); // commitment confirmed before decay

    // Phase 2: move leader far ahead so no same-lane approach fires this frame.
    // longPx = 0.1 × 1200 = 120 > longTrigger(37.2) → gate rejects → inSameLane = false.
    leader.t = 0.6;

    // Phase 3: two decay steps exhaust approachCommitFrames (dbDecay+1 → 1 → 0).
    applyRacerBehavior([trailer, leader], cfgFrozenOpen);
    applyRacerBehavior([trailer, leader], cfgFrozenOpen);

    expect(trailer.approachCommitDir).toBe(0);
    expect(trailer.approachCommitFrames).toBe(0);
  });

  it('commitment is still non-zero after the first decay step (decay is gradual, not instant)', () => {
    const dbDecay = cfg.brakeReleaseDebounceFrames;
    const buildFrames = dbDecay + 1;

    const trailer = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0 });
    const leader = makeLaneRacer({ index: 1, t: 0.501, physicalY: 0 });

    for (let f = 0; f < buildFrames; f++) {
      applyRacerBehavior([trailer, leader], cfgFrozenOpen);
    }

    leader.t = 0.6;

    // One decay step: approachCommitFrames drops from (dbDecay+1) to 1 — not yet zero.
    applyRacerBehavior([trailer, leader], cfgFrozenOpen);

    expect(trailer.approachCommitDir).not.toBe(0);
    expect(trailer.approachCommitFrames).toBeGreaterThan(0);
  });
});

// ── A3 — Anti-starvation commit timeout (open track) ─────────────────────────

describe('applyRacerBehavior — anti-starvation commit timeout (open track)', () => {
  // drawnBodyWidthPx=28 required: sameLaneHH = pxToPhysicalY(28, 140) ≈ 0.4.
  // Without drawnBodyWidthPx the sim fallback (frameSizePx=40) gives sameLaneHH ≈ 0.571 —
  // a different detection width from what the browser uses.
  // isOpen:true required: Stage B same-lane commit is open-track only.
  // Timeout read from config (config-agnostic): test does not hardcode the frame count.

  it('approachCommitDir and approachCommitFrames reset to 0 after the configured timeout', () => {
    const trailer = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0 });
    const leader = makeLaneRacer({ index: 1, t: 0.501, physicalY: 0 });
    const timeout = cfg.brakeHoldTimeoutFrames;

    for (let f = 0; f < timeout; f++) {
      applyRacerBehavior([trailer, leader], cfgFrozenOpen);
    }

    expect(trailer.approachCommitDir).toBe(0);
    expect(trailer.approachCommitFrames).toBe(0);
  });

  it('commitment re-enters on the next frame after the timeout reset', () => {
    const trailer = makeLaneRacer({ index: 0, t: 0.5, physicalY: 0 });
    const leader = makeLaneRacer({ index: 1, t: 0.501, physicalY: 0 });
    const timeout = cfg.brakeHoldTimeoutFrames;

    for (let f = 0; f < timeout; f++) {
      applyRacerBehavior([trailer, leader], cfgFrozenOpen);
    }
    // Pair still in zone — commitment restarts the following frame.
    applyRacerBehavior([trailer, leader], cfgFrozenOpen);

    expect(trailer.approachCommitDir).not.toBe(0);
    expect(trailer.approachCommitFrames).toBeGreaterThan(0);
  });
});
