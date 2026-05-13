/**
 * Constraints-first planner skeleton for Frenet space (s, y).
 *
 * Purpose:
 * - Provide a concrete JS implementation scaffold for a browser horse-racing sim.
 * - Keep anti-collision as a hard constraint (never a soft recommendation).
 * - Keep drafting and centerline as soft objectives.
 *
 * Notes:
 * - This is intentionally minimal but executable JS (not pseudocode).
 * - Integrate with your existing world conversion and drafting modules.
 */

// -----------------------------------------------------------------------------
// 1) Plain-object data structure examples (requested object literals)
// -----------------------------------------------------------------------------

/** @type {HorseState} */
export const EXAMPLE_HORSE_STATE = {
  id: 'horse-03',
  lapCount: 1,
  s: 428.5,
  vS: 13.2,
  aS: 0.0,
  y: 8.0,
  vY: 0.1,
  aY: 0.0,
  headingError: 0.0,
  visibleWidthPx: 34,
  visibleLengthPx: 38,
  bboxLat: 17,
  bboxLong: 19,
  phase: 'race',
  commit: {
    mode: 'none',
    side: 0,
    remainingSec: 0.0,
  },
  target: {
    desiredY: 0,
    desiredVS: 13.8,
  },
  lastFeasiblePlan: null,
  render: {
    spriteX: 0,
    spriteY: 0,
    nameTagX: 0,
    nameTagY: 0,
  },
};

/** @type {TrackModel} */
export const EXAMPLE_TRACK_MODEL = {
  lengthS: 2200,
  corridorHalfWidthPx: 75,
  yMin: (s) => -75,
  yMax: (s) => 75,
  centerlineY: (s) => 0,
  curvature: (s) => 0.002,
  surfaceParams: {
    baseGrip: 1.0,
    dirtSlipFactor: 0.08,
  },
};

/** @type {Intent} */
export const EXAMPLE_INTENT = {
  horseId: 'horse-03',
  desiredVS: 13.8,
  desiredAS: 0.3,
  desiredY: 0,
  desiredVY: 0,
  draftTargetId: 'horse-01',
  draftBonus: 0.04,
  overtakeIntent: 'undecided',
  objectiveWeights: {
    wSpeed: 1.5,
    wCenterline: 0.8,
    wDraft: 0.6,
    wSmoothY: 0.9,
    wSmoothS: 0.5,
  },
};

/** @type {ReservationTube} */
export const EXAMPLE_RESERVATION_TUBE = {
  horizonSeconds: 0.8,
  planningStepSec: 0.05,
  samples: 16,
  reservedCapsules: [
    {
      ownerHorseId: 'horse-01',
      tau0: 0.0,
      tau1: 0.05,
      s0: 430,
      s1: 430.6,
      y0: 0,
      y1: 0,
      sInterval: [429.0, 431.6],
      yInterval: [-19, 19],
      safetyMarginS: 3,
      safetyMarginY: 2,
    },
  ],
};

/** @type {ConstraintSet} */
export const EXAMPLE_CONSTRAINT_SET = {
  bounds: {
    yMin: -75,
    yMax: 75,
    aSMin: -5.0,
    aSMax: 3.0,
    vYMax: 2.5,
    aYMax: 6.0,
  },
  trackBoundsBySample: [
    { k: 0, yMin: -75, yMax: 75 },
    { k: 1, yMin: -75, yMax: 75 },
  ],
  collisionWindows: [
    {
      againstHorseId: 'horse-01',
      k: 1,
      minSGap: 40,
      minYGap: 34,
      reservedS: 430.6,
      reservedY: 0,
      priorityLocked: true,
    },
  ],
};

/** @type {SolverInput} */
export const EXAMPLE_SOLVER_INPUT = {
  horseId: 'horse-03',
  initialState: EXAMPLE_HORSE_STATE,
  intent: EXAMPLE_INTENT,
  trackModel: EXAMPLE_TRACK_MODEL,
  constraints: EXAMPLE_CONSTRAINT_SET,
  reservationTube: EXAMPLE_RESERVATION_TUBE,
  horizonSeconds: 0.8,
  planningStepSec: 0.05,
  samples: 16,
  config: {
    maxIterations: 18,
    gradientStep: 0.1,
    feasibilityEpsilon: 1e-3,
    safetyGainLateral: 0.9,
    safetyGainLongitudinal: 1.2,
  },
};

/** @type {SolverOutput} */
export const EXAMPLE_SOLVER_OUTPUT = {
  horseId: 'horse-03',
  feasibleTrajectory: [
    { tau: 0.0, s: 428.5, vS: 13.2, y: 8.0, vY: 0.1 },
    { tau: 0.05, s: 429.16, vS: 13.16, y: 7.78, vY: -0.35 },
  ],
  appliedControl: {
    aS_cmd: -0.8,
    aY_cmd: -3.2,
  },
  flags: {
    isFeasible: true,
    slowedForSafety: true,
    lateralBlocked: false,
    fallbackUsed: false,
  },
  diagnostics: {
    minSeparation: 3.4,
    maxConstraintViolation: 0.0,
    iterations: 12,
  },
};

// -----------------------------------------------------------------------------
// Type docs (JSDoc typedefs used by editors/intellisense)
// -----------------------------------------------------------------------------

/**
 * @typedef {'start' | 'race' | 'finish'} HorsePhase
 */

/**
 * @typedef {{
 *   mode: 'none' | 'overtake' | 'hold-lane',
 *   side: -1 | 0 | 1,
 *   remainingSec: number
 * }} CommitState
 */

/**
 * @typedef {{
 *   spriteX: number,
 *   spriteY: number,
 *   nameTagX: number,
 *   nameTagY: number
 * }} RenderAnchors
 */

/**
 * @typedef {{
 *   id: string,
 *   lapCount: number,
 *   s: number,
 *   vS: number,
 *   aS: number,
 *   y: number,
 *   vY: number,
 *   aY: number,
 *   headingError: number,
 *   visibleWidthPx: number,
 *   visibleLengthPx: number,
 *   bboxLat: number,
 *   bboxLong: number,
 *   phase: HorsePhase,
 *   commit: CommitState,
 *   target: { desiredY: number, desiredVS: number },
 *   lastFeasiblePlan: null | SolverOutput,
 *   render: RenderAnchors
 * }} HorseState
 */

/**
 * @typedef {{
 *   lengthS: number,
 *   corridorHalfWidthPx: number,
 *   yMin: (s: number) => number,
 *   yMax: (s: number) => number,
 *   centerlineY: (s: number) => number,
 *   curvature: (s: number) => number,
 *   surfaceParams: { baseGrip: number, dirtSlipFactor: number }
 * }} TrackModel
 */

/**
 * @typedef {{
 *   horseId: string,
 *   desiredVS: number,
 *   desiredAS: number,
 *   desiredY: number,
 *   desiredVY: number,
 *   draftTargetId: string | null,
 *   draftBonus: number,
 *   overtakeIntent: 'none' | 'left' | 'right' | 'undecided',
 *   objectiveWeights: {
 *     wSpeed: number,
 *     wCenterline: number,
 *     wDraft: number,
 *     wSmoothY: number,
 *     wSmoothS: number
 *   }
 * }} Intent
 */

/**
 * @typedef {{
 *   ownerHorseId: string,
 *   tau0: number,
 *   tau1: number,
 *   s0: number,
 *   s1: number,
 *   y0: number,
 *   y1: number,
 *   sInterval: [number, number],
 *   yInterval: [number, number],
 *   safetyMarginS: number,
 *   safetyMarginY: number
 * }} ReservedCapsule
 */

/**
 * Reservation tube used by the hard layer.
 * reservedCapsules stores swept occupancy for already-planned horses.
 * @typedef {{
 *   horizonSeconds: number,
 *   planningStepSec: number,
 *   samples: number,
 *   reservedCapsules: ReservedCapsule[]
 * }} ReservationTube
 */

/**
 * @typedef {{
 *   bounds: { yMin: number, yMax: number, aSMin: number, aSMax: number, vYMax: number, aYMax: number },
 *   trackBoundsBySample: Array<{ k: number, yMin: number, yMax: number }>,
 *   collisionWindows: Array<{ againstHorseId: string, k: number, minSGap: number, minYGap: number, reservedS: number, reservedY: number, priorityLocked: boolean }>
 * }} ConstraintSet
 */

/**
 * @typedef {{
 *   horseId: string,
 *   initialState: HorseState,
 *   intent: Intent,
 *   trackModel: TrackModel,
 *   constraints: ConstraintSet,
 *   reservationTube: ReservationTube,
 *   horizonSeconds: number,
 *   planningStepSec: number,
 *   samples: number,
 *   config: {
 *     maxIterations: number,
 *     gradientStep: number,
 *     feasibilityEpsilon: number,
 *     safetyGainLateral: number,
 *     safetyGainLongitudinal: number
 *   }
 * }} SolverInput
 */

/**
 * @typedef {{
 *   horseId: string,
 *   feasibleTrajectory: Array<{ tau: number, s: number, vS: number, y: number, vY: number }>,
 *   appliedControl: { aS_cmd: number, aY_cmd: number },
 *   flags: { isFeasible: boolean, slowedForSafety: boolean, lateralBlocked: boolean, fallbackUsed: boolean },
 *   diagnostics: { minSeparation: number, maxConstraintViolation: number, iterations: number }
 * }} SolverOutput
 */

// -----------------------------------------------------------------------------
// 4) Diagnostics / KPI counters (requested full structure)
// -----------------------------------------------------------------------------

export function createDiagnostics() {
  return {
    frames: 0,
    simSeconds: 0,

    // KPI-1: persistent overlap duration
    overlapPairDurationSec: new Map(), // key: "idA|idB" -> seconds
    persistentOverlapEvents: 0,

    // KPI-2: min separation percentile (store rolling samples)
    minSeparationSamples: [],
    minSeparationP01: Infinity,

    // KPI-3: forced slowdown ratio
    forcedSlowdownFrames: 0,

    // KPI-4: reservation infeasible rate
    reservationAttempts: 0,
    reservationInfeasible: 0,

    // KPI-5: max constraint violation
    maxConstraintViolationEver: 0,

    // KPI-6: lane-change smoothness
    laneAbsAYSamples: [],
    laneJerkSamples: [],
    prevAYByHorse: new Map(),

    // KPI-7: stack detector
    stackEvents: 0,

    // KPI-8: visual coherence
    visualJitterSamples: [],

    // recent frame debug snapshots
    perFrame: {
      minSeparation: Infinity,
      forcedSlowdownCount: 0,
      infeasibleCount: 0,
      maxConstraintViolation: 0,
      stackDetected: false,
    },
  };
}

// -----------------------------------------------------------------------------
// Runtime config for planner
// -----------------------------------------------------------------------------

export const DEFAULT_PLANNER_CONFIG = {
  startPhaseSeconds: 3.0,
  horizonSeconds: 0.8,
  planningStepSec: 0.05,
  maxIterations: 18,
  gradientStep: 0.12,
  feasibilityEpsilon: 1e-3,
  safetyGainLateral: 0.9,
  safetyGainLongitudinal: 1.2,
  sWindowForConstraints: 120,
  yWindowForConstraints: 80,
  aSMin: -6.0,
  aSMax: 3.5,
  vYMax: 2.8,
  aYMax: 7.0,
  maxSimSubsteps: 2,
};

// -----------------------------------------------------------------------------
// 2) planFrame(state, dt) pipeline (A..G) with clear function boundaries
// -----------------------------------------------------------------------------

/**
 * Shared planner state container.
 * @typedef {{
 *   timeSec: number,
 *   frameIndex: number,
 *   trackModel: TrackModel,
 *   horses: HorseState[],
 *   config: typeof DEFAULT_PLANNER_CONFIG,
 *   diagnostics: ReturnType<typeof createDiagnostics>,
 *   draftApi?: {
 *     computeDraftBonus: (horse: HorseState, horses: HorseState[], track: TrackModel) => { targetId: string | null, bonus: number }
 *   }
 * }} PlannerState
 */

/**
 * Frame pipeline A..G.
 * A Predict Snapshot
 * B Compute Intents
 * C Sort by Priority
 * D Reservation Layer + Hard Solver
 * E Apply first control
 * F Post stabilize
 * G Write diagnostics
 *
 * @param {PlannerState} state
 * @param {number} dt
 */
export function planFrame(state, dt) {
  const clampedDt = Math.max(1 / 120, Math.min(dt, 1 / 30));

  // A) snapshot for deterministic planning
  const snapshot = predictSnapshot(state, clampedDt);

  // B) soft intent creation
  const intents = computeIntents(snapshot, state);

  // C) rank leaders first (front has priority)
  const priorityOrder = sortByPriority(snapshot.horses, snapshot.trackModel);

  // D) reserve spacetime in order and solve per horse
  const reservationResult = reservationLayer(snapshot, intents, priorityOrder, state);

  // E) execute only first control (MPC / receding horizon)
  applyFirstControl(
    state.horses,
    reservationResult.outputsByHorseId,
    clampedDt,
    snapshot.trackModel
  );

  // F) numerical cleanup and wrapping
  postStabilize(state.horses, snapshot.trackModel);

  // G) KPI updates
  writeDiagnostics(state, reservationResult, clampedDt);

  state.timeSec += clampedDt;
  state.frameIndex += 1;
}

function predictSnapshot(state, dt) {
  const horses = state.horses.map((h) => ({
    ...h,
    commit: { ...h.commit },
    target: { ...h.target },
    render: { ...h.render },
  }));
  return {
    dt,
    trackModel: state.trackModel,
    horses,
  };
}

/**
 * Integrates existing drafting logic as intent factor, then adds centerline preference.
 * @param {{ dt: number, trackModel: TrackModel, horses: HorseState[] }} snapshot
 * @param {PlannerState} state
 * @returns {Map<string, Intent>}
 */
function computeIntents(snapshot, state) {
  const intents = new Map();
  for (const horse of snapshot.horses) {
    const centerY = snapshot.trackModel.centerlineY(horse.s);
    const draft = state.draftApi
      ? state.draftApi.computeDraftBonus(horse, snapshot.horses, snapshot.trackModel)
      : { targetId: null, bonus: 0 };

    const desiredVS = horse.vS * (1 + draft.bonus);
    const desiredAS = clamp((desiredVS - horse.vS) / Math.max(snapshot.dt, 1e-6), -2.0, 2.0);

    /** @type {Intent} */
    const intent = {
      horseId: horse.id,
      desiredVS,
      desiredAS,
      desiredY: centerY,
      desiredVY: 0,
      draftTargetId: draft.targetId,
      draftBonus: draft.bonus,
      overtakeIntent: 'undecided',
      objectiveWeights: {
        wSpeed: 1.6,
        wCenterline: 0.9,
        wDraft: 0.7,
        wSmoothY: 1.0,
        wSmoothS: 0.6,
      },
    };

    intents.set(horse.id, intent);
  }
  return intents;
}

/**
 * Front-first sorting on absolute progress (lap * length + s), with stable id tie-break.
 * @param {HorseState[]} horses
 * @param {TrackModel} trackModel
 * @returns {HorseState[]}
 */
function sortByPriority(horses, trackModel) {
  const withProgress = horses.map((h) => ({
    horse: h,
    progress: h.lapCount * trackModel.lengthS + wrapS(h.s, trackModel.lengthS),
  }));

  withProgress.sort((a, b) => {
    if (b.progress !== a.progress) return b.progress - a.progress;
    return a.horse.id.localeCompare(b.horse.id);
  });

  return withProgress.map((v) => v.horse);
}

/**
 * Reservation layer: each horse plans against already reserved higher-priority tubes.
 * @param {{ dt: number, trackModel: TrackModel, horses: HorseState[] }} snapshot
 * @param {Map<string, Intent>} intents
 * @param {HorseState[]} priorityOrder
 * @param {PlannerState} state
 */
function reservationLayer(snapshot, intents, priorityOrder, state) {
  const config = state.config;
  const samples = Math.max(2, Math.round(config.horizonSeconds / config.planningStepSec));

  /** @type {ReservationTube} */
  const tube = {
    horizonSeconds: config.horizonSeconds,
    planningStepSec: config.planningStepSec,
    samples,
    reservedCapsules: [],
  };

  /** @type {Map<string, SolverOutput>} */
  const outputsByHorseId = new Map();

  for (const horse of priorityOrder) {
    const constraints = buildConstraintSet(horse, snapshot.trackModel, tube, config);
    /** @type {SolverInput} */
    const input = {
      horseId: horse.id,
      initialState: horse,
      intent: intents.get(horse.id),
      trackModel: snapshot.trackModel,
      constraints,
      reservationTube: tube,
      horizonSeconds: config.horizonSeconds,
      planningStepSec: config.planningStepSec,
      samples,
      config: {
        maxIterations: config.maxIterations,
        gradientStep: config.gradientStep,
        feasibilityEpsilon: config.feasibilityEpsilon,
        safetyGainLateral: config.safetyGainLateral,
        safetyGainLongitudinal: config.safetyGainLongitudinal,
      },
    };

    const output = solveHardLayerProjectedQP(input);
    outputsByHorseId.set(horse.id, output);

    // Reserve this horse trajectory for lower-priority horses.
    reserveTrajectoryCapsules(tube, horse, output, snapshot.trackModel);
  }

  return {
    tube,
    outputsByHorseId,
  };
}

function buildConstraintSet(horse, trackModel, tube, config) {
  const trackBoundsBySample = [];
  const collisionWindows = [];
  const samples = tube.samples;

  for (let k = 0; k < samples; k++) {
    const tau = k * tube.planningStepSec;
    const sProbe = wrapS(horse.s + horse.vS * tau, trackModel.lengthS);
    trackBoundsBySample.push({
      k,
      yMin: trackModel.yMin(sProbe),
      yMax: trackModel.yMax(sProbe),
    });
  }

  // Neighbor pruning for performance.
  const sWindow = config.sWindowForConstraints;
  const yWindow = config.yWindowForConstraints;

  for (const c of tube.reservedCapsules) {
    const ds = Math.abs(deltaSWrapped(horse.s, c.s0, trackModel.lengthS));
    const dy = Math.abs(horse.y - c.y0);
    if (ds > sWindow || dy > yWindow) continue;

    collisionWindows.push({
      againstHorseId: c.ownerHorseId,
      k: Math.max(0, Math.floor(c.tau0 / tube.planningStepSec)),
      minSGap: (horse.bboxLong || horse.visibleLengthPx / 2) + c.safetyMarginS,
      minYGap: (horse.bboxLat || horse.visibleWidthPx / 2) + c.safetyMarginY,
      reservedS: c.s0,
      reservedY: c.y0,
      priorityLocked: true,
    });
  }

  /** @type {ConstraintSet} */
  return {
    bounds: {
      yMin: -trackModel.corridorHalfWidthPx,
      yMax: trackModel.corridorHalfWidthPx,
      aSMin: config.aSMin,
      aSMax: config.aSMax,
      vYMax: config.vYMax,
      aYMax: config.aYMax,
    },
    trackBoundsBySample,
    collisionWindows,
  };
}

// -----------------------------------------------------------------------------
// 3) Minimal hard-layer solver: sequential convex / projected gradient + active set
// -----------------------------------------------------------------------------

/**
 * Minimal hard-layer solver.
 *
 * Strategy:
 * - Control variables: aS[k], aY[k] for each planning sample.
 * - Iterative projected gradient on soft objective (speed/centerline/smoothness).
 * - Active-set style correction for hard constraints:
 *   1) track bounds and lateral speed/acc limits
 *   2) reservation collisions: first try lateral evasion; if blocked, brake longitudinally
 *
 * @param {SolverInput} input
 * @returns {SolverOutput}
 */
export function solveHardLayerProjectedQP(input) {
  const {
    initialState,
    intent,
    trackModel,
    constraints,
    reservationTube,
    samples,
    planningStepSec,
    config,
  } = input;

  const N = samples;
  const dTau = planningStepSec;

  const aS = new Array(N).fill(
    clamp(intent.desiredAS, constraints.bounds.aSMin, constraints.bounds.aSMax)
  );
  const aY = new Array(N).fill(
    clamp(
      (intent.desiredY - initialState.y) * 0.08,
      -constraints.bounds.aYMax,
      constraints.bounds.aYMax
    )
  );

  let bestTraj = rollout(initialState, aS, aY, dTau, trackModel);
  let bestViol = evaluateConstraintViolation(
    bestTraj,
    constraints,
    reservationTube,
    initialState,
    trackModel
  );

  let lateralBlocked = false;
  let slowedForSafety = false;

  for (let iter = 0; iter < config.maxIterations; iter++) {
    // Soft objective gradients (lightweight approximation)
    for (let k = 0; k < N; k++) {
      const node = bestTraj[k];
      const w = intent.objectiveWeights;

      const speedErr = node.vS - intent.desiredVS;
      const yErr = node.y - intent.desiredY;
      const smoothY = k > 0 ? aY[k] - aY[k - 1] : 0;
      const smoothS = k > 0 ? aS[k] - aS[k - 1] : 0;

      let gradAS = 2 * w.wSpeed * speedErr + 2 * w.wSmoothS * smoothS;
      let gradAY = 2 * w.wCenterline * yErr + 2 * w.wSmoothY * smoothY;

      // Drafting wants to remain behind/near wake lane, but still soft.
      gradAS -= w.wDraft * intent.draftBonus;

      aS[k] = clamp(
        aS[k] - config.gradientStep * gradAS * 0.03,
        constraints.bounds.aSMin,
        constraints.bounds.aSMax
      );
      aY[k] = clamp(
        aY[k] - config.gradientStep * gradAY * 0.03,
        -constraints.bounds.aYMax,
        constraints.bounds.aYMax
      );
    }

    // Active-set style feasibility pass.
    let traj = rollout(initialState, aS, aY, dTau, trackModel);

    for (let k = 0; k < traj.length; k++) {
      const node = traj[k];
      const trackBound =
        constraints.trackBoundsBySample[Math.min(k, constraints.trackBoundsBySample.length - 1)];

      // Hard bound correction by nudging aY.
      if (node.y < trackBound.yMin) {
        aY[k] += config.safetyGainLateral * 2.0;
      } else if (node.y > trackBound.yMax) {
        aY[k] -= config.safetyGainLateral * 2.0;
      }

      if (Math.abs(node.vY) > constraints.bounds.vYMax) {
        aY[k] -= Math.sign(node.vY) * config.safetyGainLateral * 1.5;
      }

      // Reservation collisions: lateral first, else longitudinal braking.
      for (const c of constraints.collisionWindows) {
        if (Math.abs(c.k - k) > 1) continue;

        const ds = Math.abs(deltaSWrapped(node.s, c.reservedS, trackModel.lengthS));
        const dy = Math.abs(node.y - c.reservedY);

        const overlapS = c.minSGap - ds;
        const overlapY = c.minYGap - dy;

        if (overlapS <= 0 || overlapY <= 0) continue;

        // try lateral separation first
        const lateralDirection = node.y >= c.reservedY ? 1 : -1;
        const canPushLaterally =
          node.y + lateralDirection * overlapY >= trackBound.yMin &&
          node.y + lateralDirection * overlapY <= trackBound.yMax;

        if (canPushLaterally) {
          aY[k] += lateralDirection * overlapY * config.safetyGainLateral;
        } else {
          // blocked: enforce longitudinal stalling behind reservation
          aS[k] -= overlapS * config.safetyGainLongitudinal;
          lateralBlocked = true;
          slowedForSafety = true;
        }

        aS[k] = clamp(aS[k], constraints.bounds.aSMin, constraints.bounds.aSMax);
        aY[k] = clamp(aY[k], -constraints.bounds.aYMax, constraints.bounds.aYMax);
      }
    }

    traj = rollout(initialState, aS, aY, dTau, trackModel);
    const violation = evaluateConstraintViolation(
      traj,
      constraints,
      reservationTube,
      initialState,
      trackModel
    );

    if (violation < bestViol) {
      bestTraj = traj;
      bestViol = violation;
    }

    if (violation <= config.feasibilityEpsilon) {
      bestTraj = traj;
      bestViol = violation;
      break;
    }
  }

  const fallbackUsed = !Number.isFinite(bestTraj[1]?.s);
  const firstNode = bestTraj[Math.min(1, bestTraj.length - 1)] || bestTraj[0];
  const aS_cmd = firstNode
    ? clamp(
        (firstNode.vS - initialState.vS) / dTau,
        constraints.bounds.aSMin,
        constraints.bounds.aSMax
      )
    : 0;
  const aY_cmd = firstNode
    ? clamp(
        (firstNode.vY - initialState.vY) / dTau,
        -constraints.bounds.aYMax,
        constraints.bounds.aYMax
      )
    : 0;

  return {
    horseId: input.horseId,
    feasibleTrajectory: bestTraj.map((n, i) => ({
      tau: i * dTau,
      s: n.s,
      vS: n.vS,
      y: n.y,
      vY: n.vY,
    })),
    appliedControl: {
      aS_cmd,
      aY_cmd,
    },
    flags: {
      isFeasible: bestViol <= Math.max(config.feasibilityEpsilon, 0.02),
      slowedForSafety,
      lateralBlocked,
      fallbackUsed,
    },
    diagnostics: {
      minSeparation: computeMinSeparationAgainstReservations(bestTraj, constraints, trackModel),
      maxConstraintViolation: bestViol,
      iterations: config.maxIterations,
    },
  };
}

function rollout(initialState, aS, aY, dTau, trackModel) {
  const out = [];
  let s = initialState.s;
  let vS = initialState.vS;
  let y = initialState.y;
  let vY = initialState.vY;

  for (let k = 0; k < aS.length; k++) {
    vS += aS[k] * dTau;
    vY += aY[k] * dTau;
    s = wrapS(s + vS * dTau, trackModel.lengthS);
    y = y + vY * dTau;
    out.push({ s, vS, y, vY });
  }

  return out;
}

function evaluateConstraintViolation(traj, constraints, reservationTube, initialState, trackModel) {
  let maxV = 0;

  for (let k = 0; k < traj.length; k++) {
    const n = traj[k];
    const b =
      constraints.trackBoundsBySample[Math.min(k, constraints.trackBoundsBySample.length - 1)];

    maxV = Math.max(maxV, b.yMin - n.y, n.y - b.yMax);
    maxV = Math.max(maxV, Math.abs(n.vY) - constraints.bounds.vYMax);

    for (const c of constraints.collisionWindows) {
      if (Math.abs(c.k - k) > 1) continue;
      const ds = Math.abs(deltaSWrapped(n.s, c.reservedS, trackModel.lengthS));
      const dy = Math.abs(n.y - c.reservedY);
      const overlapS = c.minSGap - ds;
      const overlapY = c.minYGap - dy;
      if (overlapS > 0 && overlapY > 0) {
        maxV = Math.max(maxV, Math.min(overlapS, overlapY));
      }
    }
  }

  return Math.max(0, maxV);
}

function computeMinSeparationAgainstReservations(traj, constraints, trackModel) {
  let best = Infinity;
  for (let k = 0; k < traj.length; k++) {
    const n = traj[k];
    for (const c of constraints.collisionWindows) {
      if (Math.abs(c.k - k) > 1) continue;
      const ds = Math.abs(deltaSWrapped(n.s, c.reservedS, trackModel.lengthS));
      const dy = Math.abs(n.y - c.reservedY);
      const sepS = ds - c.minSGap;
      const sepY = dy - c.minYGap;
      best = Math.min(best, Math.min(sepS, sepY));
    }
  }
  return Number.isFinite(best) ? best : 9999;
}

function reserveTrajectoryCapsules(tube, horse, output, trackModel) {
  const traj = output.feasibleTrajectory;
  for (let i = 0; i < traj.length - 1; i++) {
    const a = traj[i];
    const b = traj[i + 1];
    const halfLong = horse.bboxLong || horse.visibleLengthPx / 2;
    const halfLat = horse.bboxLat || horse.visibleWidthPx / 2;

    tube.reservedCapsules.push({
      ownerHorseId: horse.id,
      tau0: a.tau,
      tau1: b.tau,
      s0: a.s,
      s1: b.s,
      y0: a.y,
      y1: b.y,
      sInterval: [Math.min(a.s, b.s) - halfLong, Math.max(a.s, b.s) + halfLong],
      yInterval: [Math.min(a.y, b.y) - halfLat, Math.max(a.y, b.y) + halfLat],
      safetyMarginS: halfLong,
      safetyMarginY: halfLat,
    });
  }
}

function applyFirstControl(horses, outputsByHorseId, dt, trackModel) {
  for (const horse of horses) {
    const out = outputsByHorseId.get(horse.id);
    if (!out) continue;

    horse.aS = out.appliedControl.aS_cmd;
    horse.aY = out.appliedControl.aY_cmd;

    horse.vS += horse.aS * dt;
    horse.vY += horse.aY * dt;

    horse.s = wrapS(horse.s + horse.vS * dt, trackModel.lengthS);
    horse.y = horse.y + horse.vY * dt;

    horse.lastFeasiblePlan = out;
  }
}

function postStabilize(horses, trackModel) {
  for (const horse of horses) {
    const yMin = trackModel.yMin(horse.s);
    const yMax = trackModel.yMax(horse.s);
    horse.s = wrapS(horse.s, trackModel.lengthS);
    horse.y = clamp(horse.y, yMin, yMax);

    // Snap tiny numerical noise to zero to avoid visual micro-jitter.
    if (Math.abs(horse.vY) < 1e-4) horse.vY = 0;
    if (Math.abs(horse.aY) < 1e-4) horse.aY = 0;
  }
}

function writeDiagnostics(state, reservationResult, dt) {
  const d = state.diagnostics;
  d.frames += 1;
  d.simSeconds += dt;

  d.perFrame.minSeparation = Infinity;
  d.perFrame.forcedSlowdownCount = 0;
  d.perFrame.infeasibleCount = 0;
  d.perFrame.maxConstraintViolation = 0;
  d.perFrame.stackDetected = false;

  // KPI-3/4/5 and smoothness collection
  for (const horse of state.horses) {
    const out = reservationResult.outputsByHorseId.get(horse.id);
    if (!out) continue;

    d.reservationAttempts += 1;
    if (!out.flags.isFeasible) {
      d.reservationInfeasible += 1;
      d.perFrame.infeasibleCount += 1;
    }
    if (out.flags.slowedForSafety) {
      d.forcedSlowdownFrames += 1;
      d.perFrame.forcedSlowdownCount += 1;
    }

    d.perFrame.minSeparation = Math.min(d.perFrame.minSeparation, out.diagnostics.minSeparation);
    d.perFrame.maxConstraintViolation = Math.max(
      d.perFrame.maxConstraintViolation,
      out.diagnostics.maxConstraintViolation
    );
    d.maxConstraintViolationEver = Math.max(
      d.maxConstraintViolationEver,
      out.diagnostics.maxConstraintViolation
    );

    // KPI-6 lane smoothness
    d.laneAbsAYSamples.push(Math.abs(horse.aY));
    const prev = d.prevAYByHorse.get(horse.id) ?? horse.aY;
    d.laneJerkSamples.push(Math.abs(horse.aY - prev) / Math.max(dt, 1e-6));
    d.prevAYByHorse.set(horse.id, horse.aY);

    // KPI-8 visual coherence
    const jitter = Math.hypot(
      horse.render.nameTagX - horse.render.spriteX,
      horse.render.nameTagY - horse.render.spriteY
    );
    d.visualJitterSamples.push(jitter);
  }

  // KPI-1 + KPI-2 pairwise checks
  updatePairMetrics(state.horses, state.trackModel, d, dt);

  // KPI-7 stack detector
  d.perFrame.stackDetected = detectStackEvent(state.horses, state.trackModel);
  if (d.perFrame.stackDetected) d.stackEvents += 1;

  // update rolling p01 estimate for KPI-2
  if (d.perFrame.minSeparation < Infinity) {
    d.minSeparationSamples.push(d.perFrame.minSeparation);
    if (d.minSeparationSamples.length > 2000) d.minSeparationSamples.shift();
    d.minSeparationP01 = percentile(d.minSeparationSamples, 0.01);
  }
}

function updatePairMetrics(horses, trackModel, diagnostics, dt) {
  for (let i = 0; i < horses.length; i++) {
    for (let j = i + 1; j < horses.length; j++) {
      const a = horses[i];
      const b = horses[j];
      const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;

      const minS = (a.bboxLong || a.visibleLengthPx / 2) + (b.bboxLong || b.visibleLengthPx / 2);
      const minY = (a.bboxLat || a.visibleWidthPx / 2) + (b.bboxLat || b.visibleWidthPx / 2);
      const ds = Math.abs(deltaSWrapped(a.s, b.s, trackModel.lengthS));
      const dy = Math.abs(a.y - b.y);
      const overlap = ds < minS && dy < minY;

      if (overlap) {
        const dur = (diagnostics.overlapPairDurationSec.get(key) || 0) + dt;
        diagnostics.overlapPairDurationSec.set(key, dur);
        if (dur > 0.2) diagnostics.persistentOverlapEvents += 1;
      } else {
        diagnostics.overlapPairDurationSec.set(key, 0);
      }
    }
  }
}

function detectStackEvent(horses, trackModel) {
  // Simple 2D bin check for clusters with near-identical s and y.
  const bins = new Map();
  const sBinSize = 25;
  const yBinSize = 20;

  for (const h of horses) {
    const sb = Math.floor(wrapS(h.s, trackModel.lengthS) / sBinSize);
    const yb = Math.floor(h.y / yBinSize);
    const key = `${sb}:${yb}`;
    bins.set(key, (bins.get(key) || 0) + 1);
  }

  for (const count of bins.values()) {
    if (count >= 3) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// 5) Concrete convergence scenario example (2-3 horses)
// -----------------------------------------------------------------------------

/**
 * Demonstrates centerline convergence with priority + reservations.
 * Expected:
 * - Leader (front) remains on centerline.
 * - Follower attempts lateral bypass.
 * - If no lateral room, follower brakes longitudinally.
 */
export function runConvergenceExample() {
  const track = {
    ...EXAMPLE_TRACK_MODEL,
    yMin: () => -75,
    yMax: () => 75,
    centerlineY: () => 0,
  };

  /** @type {PlannerState} */
  const state = {
    timeSec: 12.0,
    frameIndex: 720,
    trackModel: track,
    config: { ...DEFAULT_PLANNER_CONFIG },
    diagnostics: createDiagnostics(),
    draftApi: {
      computeDraftBonus: (horse, horses) => {
        const leader = horses.find((h) => h.id === 'L1');
        if (!leader || horse.id === 'L1') return { targetId: null, bonus: 0 };
        const ds = deltaSWrapped(horse.s, leader.s, track.lengthS);
        const behind = ds < 0 && Math.abs(ds) < 45;
        return behind ? { targetId: 'L1', bonus: 0.05 } : { targetId: null, bonus: 0 };
      },
    },
    horses: [
      {
        ...EXAMPLE_HORSE_STATE,
        id: 'L1',
        lapCount: 2,
        s: 1000,
        vS: 14.0,
        y: 0,
        vY: 0,
        aY: 0,
        target: { desiredY: 0, desiredVS: 14.0 },
      },
      {
        ...EXAMPLE_HORSE_STATE,
        id: 'F2',
        lapCount: 2,
        s: 972,
        vS: 14.8,
        y: 2,
        vY: 0,
        aY: 0,
        target: { desiredY: 0, desiredVS: 14.8 },
      },
      {
        ...EXAMPLE_HORSE_STATE,
        id: 'F3',
        lapCount: 2,
        s: 965,
        vS: 14.6,
        y: -3,
        vY: 0,
        aY: 0,
        target: { desiredY: 0, desiredVS: 14.6 },
      },
    ],
  };

  planFrame(state, 1 / 60);

  return {
    afterOneFrame: state.horses.map((h) => ({
      id: h.id,
      s: round2(h.s),
      vS: round2(h.vS),
      y: round2(h.y),
      vY: round2(h.vY),
      aS: round2(h.aS),
      aY: round2(h.aY),
      slowed: Boolean(h.lastFeasiblePlan?.flags.slowedForSafety),
      lateralBlocked: Boolean(h.lastFeasiblePlan?.flags.lateralBlocked),
    })),
    diagnosticsSnapshot: {
      minSeparation: state.diagnostics.perFrame.minSeparation,
      infeasibleCount: state.diagnostics.perFrame.infeasibleCount,
      forcedSlowdownCount: state.diagnostics.perFrame.forcedSlowdownCount,
      stackDetected: state.diagnostics.perFrame.stackDetected,
    },
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function wrapS(s, lengthS) {
  let v = s % lengthS;
  if (v < 0) v += lengthS;
  return v;
}

function deltaSWrapped(fromS, toS, lengthS) {
  let d = toS - fromS;
  if (d > lengthS * 0.5) d -= lengthS;
  if (d < -lengthS * 0.5) d += lengthS;
  return d;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function percentile(values, p) {
  if (!values.length) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}
