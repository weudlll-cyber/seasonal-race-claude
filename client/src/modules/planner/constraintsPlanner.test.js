// ============================================================
// File:        constraintsPlanner.test.js
// Path:        client/src/modules/planner/constraintsPlanner.test.js
// Project:     RaceArena
// Description: Unit tests for the Constraints-First Frenet Planner.
//              Tests cover planner mechanics, kinematic constraints,
//              convergence example, and 20-racer acceptance criteria.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  planFrame,
  solveHardLayerProjectedQP,
  createDiagnostics,
  DEFAULT_PLANNER_CONFIG,
  wrapS,
  _testExports,
} from './constraintsPlanner.js';

const { predictSnapshot, computeIntents, sortByPriority, applyFirstControl } = _testExports;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TRACK_LENGTH = 2000;
const CORRIDOR = 80;

function makeTrack(overrides = {}) {
  return {
    lengthS: TRACK_LENGTH,
    corridorHalfWidthPx: CORRIDOR,
    yMin: () => -CORRIDOR,
    yMax: () => CORRIDOR,
    centerlineY: () => 0,
    curvature: () => 0,
    surfaceParams: { baseGrip: 1.0, dirtSlipFactor: 0.05 },
    ...overrides,
  };
}

function makeHorse(id, overrides = {}) {
  return {
    id: String(id),
    lapCount: 0,
    s: 500,
    vS: 200,
    aS: 0,
    y: 0,
    vY: 0,
    aY: 0,
    headingError: 0,
    visibleWidthPx: 24,
    visibleLengthPx: 28,
    bboxLat: 12,
    bboxLong: 14,
    phase: 'race',
    commit: { mode: 'none', side: 0, remainingSec: 0 },
    target: { desiredY: 0, desiredVS: 200 },
    lastFeasiblePlan: null,
    render: { spriteX: 0, spriteY: 0, nameTagX: 0, nameTagY: 0 },
    ...overrides,
  };
}

function makePlannerState(horses, overrides = {}) {
  return {
    timeSec: 0,
    frameIndex: 0,
    trackModel: makeTrack(),
    horses,
    config: { ...DEFAULT_PLANNER_CONFIG },
    diagnostics: createDiagnostics(),
    draftApi: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Planner Mechanics
// ---------------------------------------------------------------------------

describe('predictSnapshot', () => {
  it('kopiert HorseState ohne Race-Loop zu mutieren', () => {
    const horse = makeHorse('A', { s: 100, vS: 150, y: 10 });
    const state = makePlannerState([horse]);

    const snap = predictSnapshot(state, 1 / 60);

    // Snapshot is a deep copy — modifying it must not affect state.horses
    snap.horses[0].s = 999;
    snap.horses[0].vS = 1;

    expect(state.horses[0].s).toBe(100);
    expect(state.horses[0].vS).toBe(150);
  });

  it('includes dt in the snapshot', () => {
    const state = makePlannerState([makeHorse('A')]);
    const snap = predictSnapshot(state, 1 / 30);
    expect(snap.dt).toBeCloseTo(1 / 30);
  });
});

describe('computeIntents', () => {
  it('setzt korrekte Soft-Ziele für isolierten Racer auf Centerline-Anziehung', () => {
    const horse = makeHorse('A', { y: 40, vS: 180, target: { desiredY: 0, desiredVS: 180 } });
    const state = makePlannerState([horse]);
    const snap = predictSnapshot(state, 1 / 60);

    const intents = computeIntents(snap, state);
    const intent = intents.get('A');

    expect(intent).toBeDefined();
    // desiredY = centerlineY = 0 (pulling horse from y=40 toward center)
    expect(intent.desiredY).toBe(0);
    // desiredVS based on target.desiredVS (no draft)
    expect(intent.desiredVS).toBeCloseTo(180);
    // wSmoothY > 0 (lateral smoothness objective present)
    expect(intent.objectiveWeights.wSmoothY).toBeGreaterThan(0);
  });

  it('finished horses get desiredVS = 0', () => {
    const horse = makeHorse('A', {
      phase: 'finish',
      vS: 200,
      target: { desiredY: 0, desiredVS: 0 },
    });
    const state = makePlannerState([horse]);
    const snap = predictSnapshot(state, 1 / 60);
    const intents = computeIntents(snap, state);
    expect(intents.get('A').desiredVS).toBe(0);
  });
});

describe('sortByPriority', () => {
  it('ordnet Racer korrekt nach Fortschritt (s + lap)', () => {
    const horses = [
      makeHorse('rear', { s: 200, lapCount: 0 }),
      makeHorse('leader', { s: 800, lapCount: 1 }),
      makeHorse('mid', { s: 600, lapCount: 0 }),
    ];
    const track = makeTrack();
    const sorted = sortByPriority(horses, track);

    expect(sorted[0].id).toBe('leader'); // lap 1 → highest progress
    expect(sorted[1].id).toBe('mid');
    expect(sorted[2].id).toBe('rear');
  });

  it('breaks ties by id (stable)', () => {
    const horses = [
      makeHorse('Z', { s: 500, lapCount: 0 }),
      makeHorse('A', { s: 500, lapCount: 0 }),
    ];
    const sorted = sortByPriority(horses, makeTrack());
    expect(sorted[0].id).toBe('A'); // 'A' < 'Z' alphabetically → first
  });
});

describe('reservationLayer (via planFrame)', () => {
  it('plant in Prioritäts-Reihenfolge: spätere Racer respektieren frühere Reservations', () => {
    // Two horses side by side, same s — after one frame the one with lower priority
    // (behind in progress) should have either moved laterally or been slowed.
    const leader = makeHorse('L', { s: 510, y: 0, vS: 200, lapCount: 0 });
    const follower = makeHorse('F', { s: 490, y: 2, vS: 200, lapCount: 0 });

    const state = makePlannerState([leader, follower]);
    planFrame(state, 1 / 60);

    // leader.lastFeasiblePlan should exist
    expect(leader.lastFeasiblePlan).not.toBeNull();
    expect(follower.lastFeasiblePlan).not.toBeNull();

    // At least one of: follower was slowed or moved laterally
    const followerPlan = follower.lastFeasiblePlan;
    const leaderPlan = leader.lastFeasiblePlan;
    const followedSafety = followerPlan.flags.slowedForSafety || Math.abs(follower.y) > 0.1;
    const leaderUndisturbed = !leaderPlan.flags.slowedForSafety;

    // Leader (higher priority) should not be slowed by follower
    expect(leaderUndisturbed).toBe(true);
    // Follower must have reacted (moved or slowed)
    expect(followedSafety).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Solver tests
// ---------------------------------------------------------------------------

function makeSolverInput(horseOverrides = {}, overrides = {}) {
  const track = makeTrack();
  const samples = 16;
  const planningStepSec = 0.05;
  const horse = makeHorse('T', horseOverrides);

  return {
    horseId: 'T',
    initialState: horse,
    intent: {
      horseId: 'T',
      desiredVS: horse.vS,
      desiredAS: 0,
      desiredY: 0,
      desiredVY: 0,
      draftTargetId: null,
      draftBonus: 0,
      overtakeIntent: 'none',
      objectiveWeights: { wSpeed: 1.5, wCenterline: 0.8, wDraft: 0, wSmoothY: 0.9, wSmoothS: 0.5 },
    },
    trackModel: track,
    constraints: {
      bounds: {
        yMin: -CORRIDOR,
        yMax: CORRIDOR,
        aSMin: DEFAULT_PLANNER_CONFIG.aSMin,
        aSMax: DEFAULT_PLANNER_CONFIG.aSMax,
        vYMax: DEFAULT_PLANNER_CONFIG.vYMax,
        aYMax: DEFAULT_PLANNER_CONFIG.aYMax,
      },
      trackBoundsBySample: Array.from({ length: samples }, (_, k) => ({
        k,
        yMin: -CORRIDOR,
        yMax: CORRIDOR,
      })),
      collisionWindows: [],
    },
    reservationTube: {
      horizonSeconds: DEFAULT_PLANNER_CONFIG.horizonSeconds,
      planningStepSec,
      samples,
      reservedCapsules: [],
    },
    horizonSeconds: DEFAULT_PLANNER_CONFIG.horizonSeconds,
    planningStepSec,
    samples,
    config: {
      maxIterations: DEFAULT_PLANNER_CONFIG.maxIterations,
      gradientStep: DEFAULT_PLANNER_CONFIG.gradientStep,
      feasibilityEpsilon: DEFAULT_PLANNER_CONFIG.feasibilityEpsilon,
      safetyGainLateral: DEFAULT_PLANNER_CONFIG.safetyGainLateral,
      safetyGainLongitudinal: DEFAULT_PLANNER_CONFIG.safetyGainLongitudinal,
    },
    ...overrides,
  };
}

describe('solveHardLayerProjectedQP', () => {
  it('findet feasible Lösung bei lateral freiem Pfad', () => {
    const input = makeSolverInput({ y: 0, vS: 150 });
    const out = solveHardLayerProjectedQP(input);

    expect(out.flags.isFeasible).toBe(true);
    expect(out.flags.lateralBlocked).toBe(false);
    expect(out.feasibleTrajectory.length).toBeGreaterThan(1);
    expect(out.diagnostics.maxConstraintViolation).toBeLessThanOrEqual(0.05);
  });

  it('bremst longitudinal wenn lateral blockiert (lateralBlocked Flag)', () => {
    // Horse is approaching a blocker from behind — faster (210 vs 200).
    // Lateral corridor is completely filled by blocker → no lateral escape.
    // Horse must brake to avoid closing the gap further.
    const horse = makeHorse('T', { s: 490, y: 0, vS: 210 });
    const track = makeTrack();
    const samples = 16;
    const planningStepSec = 0.05;

    const blockerVS = 200;
    const blockerS0 = 510; // 20 px ahead — already within minSGap=24 → closing gap
    const minSGap = horse.bboxLong + 10; // 24
    const minYGap = CORRIDOR * 1.8; // wider than corridor → lateral escape impossible

    // Each collision window tracks the blocker's position at that future time step.
    const collisionWindows = Array.from({ length: samples }, (_, k) => ({
      againstHorseId: 'B',
      k,
      minSGap,
      minYGap,
      reservedS: blockerS0 + blockerVS * (k + 1) * planningStepSec,
      reservedY: 0,
      priorityLocked: true,
    }));

    const input = {
      horseId: 'T',
      initialState: horse,
      intent: {
        horseId: 'T',
        desiredVS: 210,
        desiredAS: 0,
        desiredY: 0,
        desiredVY: 0,
        draftTargetId: null,
        draftBonus: 0,
        overtakeIntent: 'none',
        objectiveWeights: {
          wSpeed: 1.5,
          wCenterline: 0.8,
          wDraft: 0,
          wSmoothY: 0.9,
          wSmoothS: 0.5,
        },
      },
      trackModel: track,
      constraints: {
        bounds: {
          yMin: -CORRIDOR,
          yMax: CORRIDOR,
          aSMin: DEFAULT_PLANNER_CONFIG.aSMin,
          aSMax: DEFAULT_PLANNER_CONFIG.aSMax,
          vYMax: DEFAULT_PLANNER_CONFIG.vYMax,
          aYMax: DEFAULT_PLANNER_CONFIG.aYMax,
        },
        trackBoundsBySample: Array.from({ length: samples }, (_, k) => ({
          k,
          yMin: -CORRIDOR,
          yMax: CORRIDOR,
        })),
        collisionWindows,
      },
      reservationTube: { horizonSeconds: 0.8, planningStepSec, samples, reservedCapsules: [] },
      horizonSeconds: 0.8,
      planningStepSec,
      samples,
      config: {
        maxIterations: DEFAULT_PLANNER_CONFIG.maxIterations,
        gradientStep: DEFAULT_PLANNER_CONFIG.gradientStep,
        feasibilityEpsilon: DEFAULT_PLANNER_CONFIG.feasibilityEpsilon,
        safetyGainLateral: DEFAULT_PLANNER_CONFIG.safetyGainLateral,
        safetyGainLongitudinal: DEFAULT_PLANNER_CONFIG.safetyGainLongitudinal,
      },
    };

    const out = solveHardLayerProjectedQP(input);

    // Lateral blocked because minYGap > corridor width — horse must brake longitudinally
    expect(out.flags.lateralBlocked).toBe(true);
    expect(out.flags.slowedForSafety).toBe(true);
    // aS_cmd must be negative (braking, not accelerating further into the blocker)
    expect(out.appliedControl.aS_cmd).toBeLessThan(0);
  });

  it('aS_cmd stays within [aSMin, aSMax]', () => {
    const input = makeSolverInput({ vS: 300 });
    const out = solveHardLayerProjectedQP(input);
    expect(out.appliedControl.aS_cmd).toBeGreaterThanOrEqual(DEFAULT_PLANNER_CONFIG.aSMin);
    expect(out.appliedControl.aS_cmd).toBeLessThanOrEqual(DEFAULT_PLANNER_CONFIG.aSMax);
  });

  it('aY_cmd stays within [-aYMax, aYMax]', () => {
    const input = makeSolverInput({ y: 70 }); // near boundary
    const out = solveHardLayerProjectedQP(input);
    expect(out.appliedControl.aY_cmd).toBeGreaterThanOrEqual(-DEFAULT_PLANNER_CONFIG.aYMax);
    expect(out.appliedControl.aY_cmd).toBeLessThanOrEqual(DEFAULT_PLANNER_CONFIG.aYMax);
  });
});

describe('applyFirstControl', () => {
  it('integriert nur ersten Schritt der Trajektorie auf den State', () => {
    const horses = [makeHorse('A', { s: 100, vS: 200, y: 0, vY: 0, aS: 0, aY: 0 })];
    const outputsByHorseId = new Map([
      [
        'A',
        {
          appliedControl: { aS_cmd: 2.0, aY_cmd: -1.0 },
          feasibleTrajectory: [
            { tau: 0, s: 100, vS: 200, y: 0, vY: 0 },
            { tau: 0.05, s: 110, vS: 200.1, y: -0.05, vY: -0.05 },
          ],
          flags: {
            isFeasible: true,
            slowedForSafety: false,
            lateralBlocked: false,
            fallbackUsed: false,
          },
          diagnostics: { minSeparation: 999, maxConstraintViolation: 0, iterations: 5 },
        },
      ],
    ]);

    const dt = 1 / 60;
    applyFirstControl(horses, outputsByHorseId, dt, makeTrack());

    const h = horses[0];
    // aS_cmd = 2.0 → vS increased by 2.0 * dt
    expect(h.aS).toBe(2.0);
    expect(h.vS).toBeCloseTo(200 + 2.0 * dt, 4);
    // aY_cmd = -1.0 → vY decreased
    expect(h.aY).toBe(-1.0);
    expect(h.vY).toBeCloseTo(-1.0 * dt, 5);
    // s advanced by new vS * dt
    expect(h.s).toBeCloseTo(100 + (200 + 2.0 * dt) * dt, 1);
  });

  it('does not apply future trajectory steps', () => {
    const horses = [makeHorse('A', { s: 100, vS: 200 })];
    const farFutureS = 999;
    const outputsByHorseId = new Map([
      [
        'A',
        {
          appliedControl: { aS_cmd: 0, aY_cmd: 0 },
          feasibleTrajectory: [
            { tau: 0, s: 100, vS: 200, y: 0, vY: 0 },
            { tau: 0.05, s: 110, vS: 200, y: 0, vY: 0 },
            { tau: 0.1, s: farFutureS, vS: 200, y: 0, vY: 0 },
          ],
          flags: {
            isFeasible: true,
            slowedForSafety: false,
            lateralBlocked: false,
            fallbackUsed: false,
          },
          diagnostics: { minSeparation: 999, maxConstraintViolation: 0, iterations: 1 },
        },
      ],
    ]);

    applyFirstControl(horses, outputsByHorseId, 1 / 60, makeTrack());

    // s should not jump to farFutureS
    expect(horses[0].s).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// Receding-Horizon test
// ---------------------------------------------------------------------------

describe('Receding-Horizon', () => {
  it('plan is updated each tick (not reset from scratch), trajectory advances', () => {
    const horse = makeHorse('A', { s: 500, vS: 200, y: 5 });
    const state = makePlannerState([horse]);

    planFrame(state, 1 / 60);
    const planAfterFrame1 = horse.lastFeasiblePlan;
    const sAfterFrame1 = horse.s;

    planFrame(state, 1 / 60);
    const planAfterFrame2 = horse.lastFeasiblePlan;

    // Both frames produced a valid plan
    expect(planAfterFrame1).not.toBeNull();
    expect(planAfterFrame2).not.toBeNull();

    // Horse has advanced forward
    expect(horse.s).toBeGreaterThan(sAfterFrame1);

    // Frame 2 is a new plan (trajectory is not identical to frame 1)
    // (tau values should still start at 0, meaning it's a fresh receding-horizon plan)
    expect(planAfterFrame2.feasibleTrajectory[0].tau).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Convergence example (adapted from skeleton's runConvergenceExample)
// ---------------------------------------------------------------------------

describe('Convergence example', () => {
  it('3 Pferde wollen Centerline: Leader bleibt zentral, Verfolger gestaffelt oder gebremst', () => {
    const config = { ...DEFAULT_PLANNER_CONFIG };
    const track = makeTrack({
      lengthS: 2200,
      corridorHalfWidthPx: 75,
      yMin: () => -75,
      yMax: () => 75,
      centerlineY: () => 0,
    });

    const leader = makeHorse('L1', {
      lapCount: 2,
      s: 1000,
      vS: 220,
      y: 0,
      vY: 0,
      bboxLat: 17,
      bboxLong: 19,
    });
    const f2 = makeHorse('F2', {
      lapCount: 2,
      s: 972,
      vS: 230,
      y: 5,
      vY: 0,
      bboxLat: 17,
      bboxLong: 19,
    });
    const f3 = makeHorse('F3', {
      lapCount: 2,
      s: 965,
      vS: 228,
      y: -5,
      vY: 0,
      bboxLat: 17,
      bboxLong: 19,
    });

    // Set desired speeds
    leader.target.desiredVS = 220;
    f2.target.desiredVS = 230;
    f3.target.desiredVS = 228;

    const state = {
      timeSec: 12.0,
      frameIndex: 720,
      trackModel: track,
      horses: [leader, f2, f3],
      config,
      diagnostics: createDiagnostics(),
      draftApi: null,
    };

    planFrame(state, 1 / 60);

    // Leader (highest priority) must not be forced to slow down
    expect(leader.lastFeasiblePlan.flags.slowedForSafety).toBe(false);

    // Leader stays near centerline (no collision window forced it away)
    expect(Math.abs(leader.y)).toBeLessThan(20);

    // At least one follower reacted (slowed or moved laterally)
    const f2Reacted = f2.lastFeasiblePlan.flags.slowedForSafety || Math.abs(f2.y) > 0.5;
    const f3Reacted = f3.lastFeasiblePlan.flags.slowedForSafety || Math.abs(f3.y) > 0.5;
    expect(f2Reacted || f3Reacted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Kinematic constraints — 600-frame sim
// ---------------------------------------------------------------------------

describe('Kinematic constraints — 600 frames, 20 racers', () => {
  function make20RacerState() {
    const track = makeTrack();
    // Lane spacing 30 > minYGap(24+4=28); row spacing 50 > minSGap(14+14+14=42) — no initial overlaps.
    // Deterministic speed pattern avoids flaky tests.
    const horses = Array.from({ length: 20 }, (_, i) => {
      const lane = (i % 5) - 2; // lanes: -2, -1, 0, 1, 2
      const rowOffset = Math.floor(i / 5) * 50;
      const vS = 200 + ((i % 5) - 2) * 5; // 190, 195, 200, 205, 210
      return makeHorse(String(i), {
        s: 500 - rowOffset,
        vS,
        y: lane * 30,
        lapCount: 0,
        bboxLat: 12,
        bboxLong: 14,
        target: { desiredY: 0, desiredVS: vS },
      });
    });

    return {
      timeSec: 0,
      frameIndex: 0,
      trackModel: track,
      horses,
      config: { ...DEFAULT_PLANNER_CONFIG },
      diagnostics: createDiagnostics(),
      draftApi: null,
    };
  }

  it('keine Trajektorie verletzt vYMax über 600 Frames', { timeout: 30000 }, () => {
    const state = make20RacerState();
    const vYMax = DEFAULT_PLANNER_CONFIG.vYMax;

    let maxObservedVY = 0;
    for (let f = 0; f < 600; f++) {
      planFrame(state, 1 / 60);
      for (const horse of state.horses) {
        maxObservedVY = Math.max(maxObservedVY, Math.abs(horse.vY));
      }
    }
    // Single assertion at end — avoids per-frame vitest overhead causing timeout
    expect(maxObservedVY).toBeLessThanOrEqual(vYMax + 1e-3);
  });

  it('keine aS_cmd-Werte außerhalb [aSMin, aSMax] über 600 Frames', { timeout: 30000 }, () => {
    const state = make20RacerState();
    const { aSMin, aSMax } = DEFAULT_PLANNER_CONFIG;

    for (let f = 0; f < 600; f++) {
      planFrame(state, 1 / 60);
      for (const horse of state.horses) {
        if (horse.lastFeasiblePlan) {
          const cmd = horse.lastFeasiblePlan.appliedControl.aS_cmd;
          expect(cmd).toBeGreaterThanOrEqual(aSMin - 1e-3);
          expect(cmd).toBeLessThanOrEqual(aSMax + 1e-3);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Renn-Akzeptanz — 1200-frame, 20-racer sim
// ---------------------------------------------------------------------------

describe('Renn-Akzeptanz — 1200 frames, 20 racers', () => {
  function make20RacerRaceSim() {
    const track = makeTrack();
    // Lane spacing 30 > minYGap(24+4=28); row spacing 50 > minSGap(14+14+14=42) — no initial overlaps.
    // Speed variation creates realistic overtaking: i%3=0 fast, i%3=1 slow, i%3=2 medium.
    const horses = Array.from({ length: 20 }, (_, i) => {
      const lane = (i % 5) - 2;
      const rowOffset = Math.floor(i / 5) * 50;
      const dV = i % 3 === 0 ? 15 : i % 3 === 1 ? -10 : 5;
      return makeHorse(String(i), {
        s: 500 - rowOffset,
        vS: 200 + dV,
        y: lane * 30,
        lapCount: 0,
        bboxLat: 12,
        bboxLong: 14,
        target: { desiredY: 0, desiredVS: 200 + dV },
      });
    });

    return {
      timeSec: 0,
      frameIndex: 0,
      trackModel: track,
      horses,
      config: { ...DEFAULT_PLANNER_CONFIG },
      diagnostics: createDiagnostics(),
      draftApi: null,
    };
  }

  it('0 persistente Overlaps >200ms, minSeparation p1 > 0 px', { timeout: 60000 }, () => {
    const state = make20RacerRaceSim();

    for (let f = 0; f < 1200; f++) {
      planFrame(state, 1 / 60);
    }

    const d = state.diagnostics;

    // KPI-1: no persistent overlap events
    expect(d.persistentOverlapEvents).toBe(0);

    // KPI-2: minimum separation p1 > 0
    expect(d.minSeparationP01).toBeGreaterThan(0);
  });

  it('Stack-Detector = 0 nach Frame 180 (kein 3+-Cluster über 300ms)', { timeout: 60000 }, () => {
    const state = make20RacerRaceSim();

    let stackEventsAfterStartup = 0;
    for (let f = 0; f < 1200; f++) {
      planFrame(state, 1 / 60);
      if (f >= 180 && state.diagnostics.perFrame.stackDetected) {
        stackEventsAfterStartup += 1;
      }
    }

    // No stack events after startup phase
    expect(stackEventsAfterStartup).toBe(0);
  });

  it('Forced-Slowdown-Ratio zwischen 5% und 25%', { timeout: 60000 }, () => {
    const state = make20RacerRaceSim();

    for (let f = 0; f < 1200; f++) {
      planFrame(state, 1 / 60);
    }

    const d = state.diagnostics;
    const ratio = d.forcedSlowdownFrames / d.reservationAttempts;

    expect(ratio).toBeGreaterThanOrEqual(0.05);
    expect(ratio).toBeLessThanOrEqual(0.25);
  });

  it('Reservation-Infeasible-Rate < 1% bei 20 Racern', { timeout: 60000 }, () => {
    const state = make20RacerRaceSim();

    for (let f = 0; f < 1200; f++) {
      planFrame(state, 1 / 60);
    }

    const d = state.diagnostics;
    const infeasibleRate = d.reservationInfeasible / d.reservationAttempts;

    expect(infeasibleRate).toBeLessThan(0.01);
  });
});
