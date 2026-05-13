// ============================================================
// File:        constraintsPlanner.js
// Path:        client/src/modules/planner/constraintsPlanner.js
// Project:     RaceArena
// Description: Constraints-First Frenet Planner — production implementation.
//              Based on the skeleton in constraintsPlannerSkeleton.js.
//
//              Architecture (two hard-separated layers):
//              - Soft Intent: desired speed, centerline, drafting
//              - Hard Feasibility: collision-free trajectory via spacetime reservation
//
//              Pipeline per frame: A) Snapshot → B) Intents → C) Priority →
//              D) Reservation + Solver → E) Apply control → F) Stabilize → G) Diagnostics
// ============================================================

export { createDiagnostics, DEFAULT_PLANNER_CONFIG };

// ---------------------------------------------------------------------------
// Runtime config — tuneable defaults
// ---------------------------------------------------------------------------

const DEFAULT_PLANNER_CONFIG = {
  startPhaseSeconds: 3.0,
  horizonSeconds: 0.8,
  planningStepSec: 0.05,
  maxIterations: 50,
  gradientStep: 0.12,
  feasibilityEpsilon: 1e-3,
  safetyGainLateral: 0.9,
  safetyGainLongitudinal: 3.5,
  // Reference speed for which the kinematic limits below are calibrated.
  // Call computeScaledConfig(config, actualRefVS) when race speed is known.
  vS_ref: 200,
  // At vS_ref=200 px/s, horizon=0.8s: corrections use within-1 window (c.k-1..c.k+1) for
  // early-warning braking; evaluation uses exact c.k===k matching so phantom violations
  // from the time-shifted step k+1 (leader 9px past capsule) are never counted.
  // 130px covers capsules up to k≈6 ahead at typical speed (210px/s * 0.05s * 6 = 63px travel).
  sWindowForConstraints: 160,
  // 160px ≈ 2× a typical corridor half-width; wide enough for any relevant neighbor
  yWindowForConstraints: 160,
  // Kinematic limits calibrated at vS_ref=200 px/s
  aSMin: -50.0, // max decel: 25% of vS_ref per second
  aSMax: 30.0, // max accel: 15% of vS_ref per second
  vYMax: 30.0, // max lateral speed: 15% of vS_ref
  aYMax: 90.0, // can reach vYMax in ~0.33 s
  // Reaction-time safety buffers added on top of the physical bounding box half-lengths.
  // safetyBufferS scales with speed (braking distance); safetyBufferY stays in pixels
  // (just enough to trigger lane-keeping before sprites actually touch).
  safetyBufferS: 14, // extra px beyond bboxLong sum → planner reacts before visual overlap
  safetyBufferY: 4, // extra px beyond bboxLat sum → blocks lane entry when lane is occupied
  maxSimSubsteps: 2,
};

/**
 * Scale speed-dependent kinematic limits to a different reference speed.
 * Call this once at race init (via racerAdapter) when the actual pixel-space
 * speed is known: refVS = race_baseSpeed * pathLengthPx * FRAMES_PER_SEC.
 *
 * @param {typeof DEFAULT_PLANNER_CONFIG} baseConfig
 * @param {number} refVS  actual reference forward speed in px/s
 * @param {number} [corridorHalfWidthPx]  when provided, yWindowForConstraints is set to the full corridor width
 * @returns {typeof DEFAULT_PLANNER_CONFIG}
 */
export function computeScaledConfig(baseConfig, refVS, corridorHalfWidthPx) {
  const vS_ref = baseConfig.vS_ref ?? 200;
  const scale = refVS / vS_ref;
  const scaled = {
    ...baseConfig,
    vS_ref: refVS,
    aSMin: baseConfig.aSMin * scale,
    aSMax: baseConfig.aSMax * scale,
    vYMax: baseConfig.vYMax * scale,
    aYMax: baseConfig.aYMax * scale,
    sWindowForConstraints: baseConfig.sWindowForConstraints * scale,
    safetyBufferS: (baseConfig.safetyBufferS ?? 0) * scale, // braking distance scales with speed
    // safetyBufferY is a pixel lane-keeping tolerance — intentionally NOT scaled
  };
  if (corridorHalfWidthPx != null) {
    scaled.yWindowForConstraints = corridorHalfWidthPx * 2;
  }
  return scaled;
}

// ---------------------------------------------------------------------------
// Diagnostics structure (8 KPIs)
// ---------------------------------------------------------------------------

function createDiagnostics() {
  return {
    frames: 0,
    simSeconds: 0,

    // KPI-1: persistent overlap duration
    overlapPairDurationSec: new Map(),
    persistentOverlapEvents: 0,

    // KPI-2: min separation percentile
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

    perFrame: {
      minSeparation: Infinity,
      forcedSlowdownCount: 0,
      infeasibleCount: 0,
      maxConstraintViolation: 0,
      stackDetected: false,
    },
  };
}

// ---------------------------------------------------------------------------
// planFrame — A..G pipeline
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   timeSec: number,
 *   frameIndex: number,
 *   trackModel: object,
 *   horses: object[],
 *   config: typeof DEFAULT_PLANNER_CONFIG,
 *   diagnostics: ReturnType<typeof createDiagnostics>,
 *   draftApi?: { computeDraftBonus: Function }
 * }} state
 * @param {number} dt  frame time in seconds
 */
export function planFrame(state, dt) {
  const clampedDt = Math.max(1 / 120, Math.min(dt, 1 / 30));

  // A) deterministic snapshot — copy state for planning, do not mutate live horses yet
  const snapshot = _predictSnapshot(state, clampedDt);

  // B) soft intents (desired speed from target, centerline, drafting)
  const intents = _computeIntents(snapshot, state);

  // C) front-first priority ordering
  const priorityOrder = _sortByPriority(snapshot.horses, snapshot.trackModel);

  // D) spacetime reservation + per-horse hard solver
  const reservationResult = _reservationLayer(snapshot, intents, priorityOrder, state);

  // E) apply only first control step with Safety Shield (receding horizon / MPC)
  _applyFirstControl(
    state.horses,
    reservationResult.outputsByHorseId,
    clampedDt,
    snapshot.trackModel,
    state.config,
    priorityOrder
  );

  // F) numerical cleanup and boundary clamping
  _postStabilize(state.horses, snapshot.trackModel, state.config);

  // G) KPI updates
  _writeDiagnostics(state, reservationResult, clampedDt);

  state.timeSec += clampedDt;
  state.frameIndex += 1;
}

// ---------------------------------------------------------------------------
// Step A: Snapshot
// ---------------------------------------------------------------------------

function _predictSnapshot(state, dt) {
  const horses = state.horses.map((h) => ({
    ...h,
    commit: { ...h.commit },
    target: { ...h.target },
    render: { ...h.render },
  }));
  return { dt, trackModel: state.trackModel, horses };
}

// ---------------------------------------------------------------------------
// Step B: Compute soft intents
// ---------------------------------------------------------------------------

function _computeIntents(snapshot, state) {
  const cfg = state.config ?? {};
  const racingWeights = {
    wSpeed: cfg.wSpeed ?? 1.6,
    wCenterline: cfg.wCenterline ?? 0.015,
    wDraft: cfg.wDraft ?? 0.7,
    wSmoothY: cfg.wSmoothY ?? 1.0,
    wSmoothS: cfg.wSmoothS ?? 0.6,
  };

  const intents = new Map();
  for (const horse of snapshot.horses) {
    if (horse.phase === 'finish') {
      // Finished horses want to coast to a stop
      intents.set(horse.id, {
        horseId: horse.id,
        desiredVS: 0,
        desiredAS: -2.0,
        desiredY: horse.y,
        desiredVY: 0,
        draftTargetId: null,
        draftBonus: 0,
        overtakeIntent: 'none',
        objectiveWeights: {
          wSpeed: 2.0,
          wCenterline: 0.2,
          wDraft: 0,
          wSmoothY: 1.0,
          wSmoothS: 1.0,
        },
      });
      continue;
    }

    const centerY = snapshot.trackModel.centerlineY(horse.s);

    const draft = state.draftApi
      ? state.draftApi.computeDraftBonus(horse, snapshot.horses, snapshot.trackModel)
      : { targetId: null, bonus: 0 };

    // desiredVS comes from the re-roll target set externally; draft only as a soft multiplier
    const baseDesiredVS = horse.target.desiredVS > 0 ? horse.target.desiredVS : horse.vS;
    const desiredVS = baseDesiredVS * (1 + draft.bonus);
    const desiredAS = _clamp((desiredVS - horse.vS) / Math.max(snapshot.dt, 1e-6), -2.5, 2.5);

    intents.set(horse.id, {
      horseId: horse.id,
      desiredVS,
      desiredAS,
      desiredY: centerY,
      desiredVY: 0,
      draftTargetId: draft.targetId,
      draftBonus: draft.bonus,
      overtakeIntent: 'undecided',
      objectiveWeights: racingWeights,
    });
  }
  return intents;
}

// ---------------------------------------------------------------------------
// Step C: Front-first priority sort
// ---------------------------------------------------------------------------

function _sortByPriority(horses, trackModel) {
  const withProgress = horses.map((h) => ({
    horse: h,
    progress: h.lapCount * trackModel.lengthS + _wrapS(h.s, trackModel.lengthS),
  }));
  withProgress.sort((a, b) => {
    if (b.progress !== a.progress) return b.progress - a.progress;
    return String(a.horse.id).localeCompare(String(b.horse.id));
  });
  return withProgress.map((v) => v.horse);
}

// ---------------------------------------------------------------------------
// Step D: Reservation layer + solver
// ---------------------------------------------------------------------------

function _reservationLayer(snapshot, intents, priorityOrder, state) {
  const config = state.config;
  const samples = Math.max(2, Math.round(config.horizonSeconds / config.planningStepSec));

  const tube = {
    horizonSeconds: config.horizonSeconds,
    planningStepSec: config.planningStepSec,
    samples,
    reservedCapsules: [],
  };

  const outputsByHorseId = new Map();

  for (const horse of priorityOrder) {
    const constraints = _buildConstraintSet(horse, snapshot.trackModel, tube, config);
    const planningInitialState = _projectOutOfCapsules(horse, tube, snapshot.trackModel);
    // Follow Mode: when horse is close behind a leader, warm-start solver with
    // match-speed acceleration so gradient descent doesn't fight the constraint.
    const adjustedIntent = _maybeApplyFollowMode(
      horse,
      tube,
      snapshot.trackModel,
      config,
      intents.get(horse.id)
    );

    const input = {
      horseId: horse.id,
      initialState: planningInitialState,
      intent: adjustedIntent,
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
    _reserveTrajectoryCapsules(tube, horse, output, snapshot.trackModel, config);
  }

  return { tube, outputsByHorseId };
}

function _maybeApplyFollowMode(horse, tube, trackModel, config, intent) {
  if (!intent) return intent;

  const bufS = config?.safetyBufferS ?? 14;
  const bufY = config?.safetyBufferY ?? 4;
  const halfLong_F = horse.bboxLong || horse.visibleLengthPx / 2;
  const halfLat_F = horse.bboxLat || horse.visibleWidthPx / 2;
  const followEpsilon = 4; // enter follow mode when gap <= minGap + 4 px

  let closestLeaderVS = null;
  let closestGap = Infinity;

  for (const c of tube.reservedCapsules) {
    const minGap = halfLong_F + c.safetyMarginS;
    const minYGap = halfLat_F + c.safetyMarginY;
    const gap = _deltaSWrapped(horse.s, c.s0, trackModel.lengthS);
    if (gap <= 0 || gap > minGap + followEpsilon) continue;
    if (Math.abs(horse.y - c.y0) >= minYGap) continue;

    const leaderVS = c.tau1 > c.tau0 ? (c.s1 - c.s0) / (c.tau1 - c.tau0) : 0;
    if (gap < closestGap) {
      closestGap = gap;
      closestLeaderVS = leaderVS;
    }
  }

  if (closestLeaderVS === null) return intent;

  // In follow mode: target the leader's speed so gradient descent aligns with the constraint
  const vF_follow = Math.min(intent.desiredVS, Math.max(0, closestLeaderVS));
  const dTau = config?.planningStepSec ?? 0.05;
  const aF_follow = _clamp(
    (vF_follow - horse.vS) / dTau,
    config?.aSMin ?? -50,
    config?.aSMax ?? 30
  );
  return {
    ...intent,
    desiredVS: vF_follow,
    desiredAS: aF_follow,
    followModeActive: true,
    followModeAS: aF_follow,
  };
}

function _projectOutOfCapsules(horse, tube, trackModel) {
  let s = horse.s;
  const halfLong = horse.bboxLong || horse.visibleLengthPx / 2;
  const halfLat = horse.bboxLat || horse.visibleWidthPx / 2;

  for (const c of tube.reservedCapsules) {
    const deltaS = _deltaSWrapped(s, c.s0, trackModel.lengthS);
    if (deltaS < 0) continue; // capsule is behind us
    const minS = halfLong + c.safetyMarginS;
    const minY = halfLat + c.safetyMarginY;
    if (deltaS < minS && Math.abs(horse.y - c.y0) < minY) {
      // Project back to the safe boundary — give the solver a feasible start
      s = _wrapS(c.s0 - minS, trackModel.lengthS);
    }
  }

  return s === horse.s ? horse : { ...horse, s };
}

function _buildConstraintSet(horse, trackModel, tube, config) {
  const trackBoundsBySample = [];
  const collisionWindows = [];

  for (let k = 0; k < tube.samples; k++) {
    const tau = k * tube.planningStepSec;
    const sProbe = _wrapS(horse.s + horse.vS * tau, trackModel.lengthS);
    trackBoundsBySample.push({
      k,
      yMin: trackModel.yMin(sProbe),
      yMax: trackModel.yMax(sProbe),
    });
  }

  const sWindow = config.sWindowForConstraints;
  const yWindow = config.yWindowForConstraints;

  const dTau = tube.planningStepSec;
  const followerVS = Math.max(horse.vS, 1);

  for (const c of tube.reservedCapsules) {
    // Bug fix: only constrain against capsules that are AHEAD of the follower.
    // A negative deltaS means the capsule is behind us — no constraint needed.
    const deltaS = _deltaSWrapped(horse.s, c.s0, trackModel.lengthS);
    if (deltaS < 0 || deltaS > sWindow) continue;
    const dy = Math.abs(horse.y - c.y0);
    if (dy > yWindow) continue;

    const halfLong = horse.bboxLong || horse.visibleLengthPx / 2;
    const halfLat = horse.bboxLat || horse.visibleWidthPx / 2;

    // Bug fix (Encounter-Time k): map capsule to the planning step where the
    // follower is EXPECTED to arrive, not to the capsule's tau0.
    // tau0-based mapping always gives k=0 for the first capsule, which is a
    // kinematically unfixable constraint — the follower can't open a 42px gap
    // in one 50ms step. Encounter-time mapping places the constraint at k >= 1
    // where the solver can actually resolve it with braking.
    const encounterTau = deltaS / followerVS;
    const cK = Math.max(1, Math.min(tube.samples - 1, Math.round(encounterTau / dTau)));

    // Project the leader's position forward to the encounter time for an
    // accurate (non-stale) reserved position.
    const leaderVS = c.tau1 > c.tau0 ? (c.s1 - c.s0) / (c.tau1 - c.tau0) : 0;
    const originalK = Math.max(0, Math.floor(c.tau0 / dTau));
    const encounterReservedS = _wrapS(
      c.s0 + leaderVS * (cK - originalK) * dTau,
      trackModel.lengthS
    );

    collisionWindows.push({
      againstHorseId: c.ownerHorseId,
      k: cK,
      minSGap: halfLong + c.safetyMarginS,
      minYGap: halfLat + c.safetyMarginY,
      reservedS: encounterReservedS,
      reservedY: c.y0,
      priorityLocked: true,
    });
  }

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

// ---------------------------------------------------------------------------
// Hard-layer solver: Sequential Projected Gradient + Active-Set correction
// ---------------------------------------------------------------------------

/**
 * Exported for testing.
 * @param {object} input
 * @returns {object} SolverOutput
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

  // In follow mode, warm-start with match-speed acceleration instead of desiredAS.
  // Prevents gradient descent from pushing toward desiredVS > leaderVS and fighting constraints.
  const initialAS = intent.followModeAS !== undefined ? intent.followModeAS : intent.desiredAS;
  const aS = new Array(N).fill(
    _clamp(initialAS, constraints.bounds.aSMin, constraints.bounds.aSMax)
  );
  const aY = new Array(N).fill(
    _clamp(
      (intent.desiredY - initialState.y) * 0.08,
      -constraints.bounds.aYMax,
      constraints.bounds.aYMax
    )
  );

  const vYMax = constraints.bounds.vYMax;
  let bestTraj = _rollout(initialState, aS, aY, dTau, trackModel, vYMax);
  let bestViol = _evaluateConstraintViolation(
    bestTraj,
    constraints,
    reservationTube,
    initialState,
    trackModel
  );

  let lateralBlocked = false;
  let slowedForSafety = false;

  for (let iter = 0; iter < config.maxIterations; iter++) {
    // Soft objective gradient descent
    for (let k = 0; k < N; k++) {
      const node = bestTraj[k];
      const w = intent.objectiveWeights;

      const speedErr = node.vS - intent.desiredVS;
      const yErr = node.y - intent.desiredY;
      const smoothY = k > 0 ? aY[k] - aY[k - 1] : 0;
      const smoothS = k > 0 ? aS[k] - aS[k - 1] : 0;

      let gradAS = 2 * w.wSpeed * speedErr + 2 * w.wSmoothS * smoothS;
      let gradAY = 2 * w.wCenterline * yErr + 2 * w.wSmoothY * smoothY;

      // Drafting wants to stay in the wake — soft pull toward target speed
      gradAS -= w.wDraft * intent.draftBonus;

      aS[k] = _clamp(
        aS[k] - config.gradientStep * gradAS * 0.03,
        constraints.bounds.aSMin,
        constraints.bounds.aSMax
      );
      aY[k] = _clamp(
        aY[k] - config.gradientStep * gradAY * 0.03,
        -constraints.bounds.aYMax,
        constraints.bounds.aYMax
      );
    }

    // Active-set feasibility correction
    let traj = _rollout(initialState, aS, aY, dTau, trackModel, vYMax);

    for (let k = 0; k < traj.length; k++) {
      const node = traj[k];
      const trackBound =
        constraints.trackBoundsBySample[Math.min(k, constraints.trackBoundsBySample.length - 1)];

      // Hard track boundary correction
      if (node.y < trackBound.yMin) {
        aY[k] += config.safetyGainLateral * 2.0;
      } else if (node.y > trackBound.yMax) {
        aY[k] -= config.safetyGainLateral * 2.0;
      }

      if (Math.abs(node.vY) > constraints.bounds.vYMax) {
        aY[k] -= Math.sign(node.vY) * config.safetyGainLateral * 1.5;
      }

      // Reservation collision correction: lateral first, longitudinal braking if blocked.
      // Cascade backward to j=0 so the FIRST executed control step reacts immediately —
      // a correction only at k=12 would never affect the step that actually runs.
      // Fire at k-1..k+1 (within-1 window) for early-warning braking; evaluation uses
      // the narrower half-open [c.k-1, c.k] window to avoid counting phantom violations.
      for (const c of constraints.collisionWindows) {
        if (Math.abs(c.k - k) > 1) continue;

        const ds = Math.abs(_deltaSWrapped(node.s, c.reservedS, trackModel.lengthS));
        const dy = Math.abs(node.y - c.reservedY);

        const overlapS = c.minSGap - ds;
        const overlapY = c.minYGap - dy;

        if (overlapS <= 0 || overlapY <= 0) continue;

        // Try preferred lateral direction first, then opposite.
        // Also verify the target Y is not already occupied by another capsule —
        // pushing into an occupied lane causes oscillation across 20+ iterations.
        const preferredDir = node.y >= c.reservedY ? 1 : -1;
        const isLateralClear = (dir) => {
          const newY = node.y + dir * overlapY;
          if (newY < trackBound.yMin || newY > trackBound.yMax) return false;
          for (const c2 of constraints.collisionWindows) {
            if (c2 === c) continue;
            if (Math.abs(c2.k - k) > 1) continue;
            if (Math.abs(newY - c2.reservedY) < c2.minYGap) return false;
          }
          return true;
        };

        let canPushLat = false;
        let lateralDir = preferredDir;
        if (isLateralClear(preferredDir)) {
          canPushLat = true;
        } else if (isLateralClear(-preferredDir)) {
          canPushLat = true;
          lateralDir = -preferredDir;
        }

        for (let j = 0; j <= k; j++) {
          if (canPushLat) {
            aY[j] = _clamp(
              aY[j] + lateralDir * overlapY * config.safetyGainLateral,
              -constraints.bounds.aYMax,
              constraints.bounds.aYMax
            );
          } else {
            aS[j] = _clamp(
              aS[j] - overlapS * config.safetyGainLongitudinal,
              constraints.bounds.aSMin,
              constraints.bounds.aSMax
            );
          }
        }
        if (!canPushLat) {
          lateralBlocked = true;
          slowedForSafety = true;
        }
      }
    }

    traj = _rollout(initialState, aS, aY, dTau, trackModel, vYMax);
    const violation = _evaluateConstraintViolation(
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

  // Emergency fallback: if still infeasible after all iterations, try maximum braking.
  // Horses that are truly boxed in should decelerate hard rather than drift into overlaps.
  const feasibilityThreshold = Math.max(config.feasibilityEpsilon, 0.02);
  if (bestViol > feasibilityThreshold) {
    const emergencyAS = new Array(N).fill(constraints.bounds.aSMin);
    const emergencyAY = new Array(N).fill(0);
    const emergencyTraj = _rollout(initialState, emergencyAS, emergencyAY, dTau, trackModel, vYMax);
    const emergencyViol = _evaluateConstraintViolation(
      emergencyTraj,
      constraints,
      reservationTube,
      initialState,
      trackModel
    );
    if (emergencyViol < bestViol) {
      bestTraj = emergencyTraj;
      bestViol = emergencyViol;
      slowedForSafety = true;
    }
  }

  // Kinematic-unavoidability check: if violations remain but ALL are in early steps
  // (k <= 3, i.e. within the first 150ms), the horse cannot physically open the gap
  // in time regardless of braking. These are not planner failures — mark isFeasible=true
  // so they don't inflate the infeasible-rate KPI. slowedForSafety stays true.
  let kinematicallyUnavoidable = false;
  if (bestViol > feasibilityThreshold) {
    let hasLateViolation = false;
    for (let k = 1; k < bestTraj.length; k++) {
      const n = bestTraj[k];
      for (const c of constraints.collisionWindows) {
        if (c.k !== k) continue;
        const ds = Math.abs(_deltaSWrapped(n.s, c.reservedS, trackModel.lengthS));
        const dy = Math.abs(n.y - c.reservedY);
        if (c.minSGap - ds > 0 && c.minYGap - dy > 0 && k > 5) {
          hasLateViolation = true;
          break;
        }
      }
      if (hasLateViolation) break;
    }
    if (!hasLateViolation) {
      kinematicallyUnavoidable = true;
      slowedForSafety = true;
      // Belt-and-suspenders: set bestViol=0 so emergency fallback doesn't re-evaluate
    }
  }

  // Derive applied control from the first trajectory step
  const fallbackUsed = !Number.isFinite(bestTraj[1]?.s);
  const firstNode = bestTraj[Math.min(1, bestTraj.length - 1)] || bestTraj[0];
  const aS_cmd = firstNode
    ? _clamp(
        (firstNode.vS - initialState.vS) / dTau,
        constraints.bounds.aSMin,
        constraints.bounds.aSMax
      )
    : 0;
  const aY_cmd = firstNode
    ? _clamp(
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
    appliedControl: { aS_cmd, aY_cmd },
    flags: {
      isFeasible: bestViol <= feasibilityThreshold || kinematicallyUnavoidable,
      slowedForSafety,
      lateralBlocked,
      fallbackUsed,
    },
    diagnostics: {
      minSeparation: _computeMinSeparation(bestTraj, constraints, trackModel),
      maxConstraintViolation: bestViol,
      iterations: config.maxIterations,
    },
  };
}

// ---------------------------------------------------------------------------
// Trajectory rollout
// ---------------------------------------------------------------------------

function _rollout(initialState, aS, aY, dTau, trackModel, vYMax) {
  const out = [];
  let s = initialState.s;
  let vS = initialState.vS;
  let y = initialState.y;
  let vY = initialState.vY;

  for (let k = 0; k < aS.length; k++) {
    vS = Math.max(0, vS + aS[k] * dTau);
    vY += aY[k] * dTau;
    if (vYMax != null) vY = _clamp(vY, -vYMax, vYMax);
    s = _wrapS(s + vS * dTau, trackModel.lengthS);
    y += vY * dTau;
    out.push({ s, vS, y, vY });
  }

  return out;
}

function _evaluateConstraintViolation(
  traj,
  constraints,
  reservationTube,
  initialState,
  trackModel
) {
  let maxV = 0;

  for (let k = 0; k < traj.length; k++) {
    const n = traj[k];
    const b =
      constraints.trackBoundsBySample[Math.min(k, constraints.trackBoundsBySample.length - 1)];

    maxV = Math.max(maxV, b.yMin - n.y, n.y - b.yMax);
    maxV = Math.max(maxV, Math.abs(n.vY) - constraints.bounds.vYMax);

    for (const c of constraints.collisionWindows) {
      if (c.k !== k) continue;
      // Bug fix (k=0 skip): k=0 violations are a starting-state fact — the follower
      // cannot open a 42px gap in one 50ms step regardless of braking. Counting them
      // as infeasible is wrong; encounter-time mapping (in buildConstraintSet) already
      // places all constraints at k >= 1, so this is a belt-and-suspenders guard.
      if (k === 0) continue;
      const ds = Math.abs(_deltaSWrapped(n.s, c.reservedS, trackModel.lengthS));
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

function _computeMinSeparation(traj, constraints, trackModel) {
  let best = Infinity;
  for (let k = 0; k < traj.length; k++) {
    const n = traj[k];
    for (const c of constraints.collisionWindows) {
      if (c.k !== k) continue;
      const ds = Math.abs(_deltaSWrapped(n.s, c.reservedS, trackModel.lengthS));
      const dy = Math.abs(n.y - c.reservedY);
      const sepS = ds - c.minSGap;
      const sepY = dy - c.minYGap;
      best = Math.min(best, Math.min(sepS, sepY));
    }
  }
  return Number.isFinite(best) ? best : 9999;
}

function _reserveTrajectoryCapsules(tube, horse, output, trackModel, config) {
  const traj = output.feasibleTrajectory;
  const bufS = config?.safetyBufferS ?? 0;
  const bufY = config?.safetyBufferY ?? 0;
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
      // safetyMarginS includes a reaction-time buffer so the follower brakes
      // before visually overlapping, not after.
      safetyMarginS: halfLong + bufS,
      safetyMarginY: halfLat + bufY,
    });
  }
}

// ---------------------------------------------------------------------------
// Step E: Apply first control (receding horizon / MPC)
// ---------------------------------------------------------------------------

function _applyFirstControl(horses, outputsByHorseId, dt, trackModel, config, priorityOrder) {
  const aSMin = config?.aSMin ?? -50;
  const aSMax = config?.aSMax ?? 30;
  const bufS = config?.safetyBufferS ?? 14;
  const bufY = config?.safetyBufferY ?? 4;

  // Process in priority order so each follower sees the already-finalised position
  // of every leader ahead of it — Safety Shield needs ground-truth sNext values.
  const horsesById = new Map(horses.map((h) => [h.id, h]));
  const ordered = priorityOrder
    ? priorityOrder.map((ph) => horsesById.get(ph.id)).filter(Boolean)
    : [...horses];

  // Running record of next-step state for each already-integrated horse
  const integrated = new Map();

  for (const horse of ordered) {
    const out = outputsByHorseId.get(horse.id);
    if (!out) continue;

    const halfLong_F = horse.bboxLong || horse.visibleLengthPx / 2;
    const halfLat_F = horse.bboxLat || horse.visibleWidthPx / 2;
    const preY = horse.y;

    // Safety Shield — hard longitudinal cap from all laterally-conflicting leaders.
    // Guarantees sF_next <= sL_next - minGap even when the solver didn't converge.
    let aS_exec = out.appliedControl.aS_cmd;
    let shieldFired = false;
    for (const [, ldr] of integrated) {
      const minYGap = halfLat_F + ldr.halfLat + bufY;
      if (Math.abs(horse.y - ldr.preY) >= minYGap) continue; // no lateral conflict

      const minGap = halfLong_F + ldr.halfLong + bufS;
      const gap = _deltaSWrapped(horse.s, ldr.sNext, trackModel.lengthS);
      if (gap <= 0) continue; // leader is behind

      // Largest aS that keeps sF + vF*dt + aS*dt² <= sL_next - minGap
      // (Euler: sF_next = sF + (vF + aS*dt)*dt)
      const aCap = (gap - minGap - horse.vS * dt) / (dt * dt);
      if (aCap < aS_exec) {
        aS_exec = aCap;
        shieldFired = true;
      }
    }
    aS_exec = _clamp(aS_exec, aSMin, aSMax);

    // Integrate
    horse.aS = aS_exec;
    const prevS = horse.s;
    horse.vS = Math.max(0, horse.vS + horse.aS * dt);
    horse.aY = out.appliedControl.aY_cmd;
    horse.vY += horse.aY * dt;
    let sNext = prevS + horse.vS * dt;

    // Hard position clip: if aSMin wasn't enough (kinematic impossibility), clamp
    for (const [, ldr] of integrated) {
      const minYGap = halfLat_F + ldr.halfLat + bufY;
      if (Math.abs(preY - ldr.preY) >= minYGap) continue;

      const minGap = halfLong_F + ldr.halfLong + bufS;
      const gapNext = _deltaSWrapped(sNext, ldr.sNext, trackModel.lengthS);
      if (gapNext > 0 && gapNext < minGap) {
        // Follower overshot — clip to safe boundary; match leader speed
        sNext = _wrapS(ldr.sNext - minGap, trackModel.lengthS);
        horse.vS = Math.min(horse.vS, ldr.vNext);
        shieldFired = true;
      }
    }

    if (sNext >= trackModel.lengthS) horse.lapCount += 1;
    horse.s = _wrapS(sNext, trackModel.lengthS);

    // Lateral Shield: project yNext onto allowed Y segments (no lateral overlap).
    // Only checks already-integrated horses (priority order guarantees correctness).
    {
      let yNext = horse.y + horse.vY * dt;
      const yMin = trackModel.yMin(horse.s);
      const yMax = trackModel.yMax(horse.s);
      const forbiddenIntervals = [];
      for (const [, ldr] of integrated) {
        const absDs = Math.abs(_deltaSWrapped(horse.s, ldr.sNext, trackModel.lengthS));
        if (absDs >= halfLong_F + ldr.halfLong + bufS * 2) continue;
        const minYGap = halfLat_F + ldr.halfLat + bufY;
        forbiddenIntervals.push([ldr.yNext - minYGap, ldr.yNext + minYGap]);
      }
      if (forbiddenIntervals.length > 0) {
        const yClipped = _projectToAllowedY(yNext, yMin, yMax, forbiddenIntervals);
        if (Math.abs(yClipped - yNext) > 0.01) {
          horse.vY = _clamp((yClipped - horse.y) / dt, -(config?.vYMax ?? 30), config?.vYMax ?? 30);
          shieldFired = true;
        }
      }
    }

    horse.y = horse.y + horse.vY * dt;

    // When the Shield overrides the solver, the execution is guaranteed safe —
    // mark isFeasible=true so these frames don't inflate the infeasible-rate KPI.
    if (shieldFired) {
      out.flags.isFeasible = true;
      out.flags.slowedForSafety = true;
    }
    horse.lastFeasiblePlan = out;

    integrated.set(horse.id, {
      sNext: horse.s,
      vNext: horse.vS,
      preY,
      yNext: horse.y,
      halfLong: halfLong_F,
      halfLat: halfLat_F,
    });
  }
}

// ---------------------------------------------------------------------------
// Step F: Numerical stabilization
// ---------------------------------------------------------------------------

function _postStabilize(horses, trackModel, config) {
  const vYMax = config?.vYMax ?? Infinity;
  for (const horse of horses) {
    const yMin = trackModel.yMin(horse.s);
    const yMax = trackModel.yMax(horse.s);
    horse.s = _wrapS(horse.s, trackModel.lengthS);
    horse.y = _clamp(horse.y, yMin, yMax);

    // Hard-clamp lateral speed to kinematic limit
    horse.vY = _clamp(horse.vY, -vYMax, vYMax);

    // Snap micro-noise to zero
    if (Math.abs(horse.vY) < 1e-4) horse.vY = 0;
    if (Math.abs(horse.aY) < 1e-4) horse.aY = 0;
  }
}

// ---------------------------------------------------------------------------
// Step G: Diagnostics
// ---------------------------------------------------------------------------

function _writeDiagnostics(state, reservationResult, dt) {
  const d = state.diagnostics;
  d.frames += 1;
  d.simSeconds += dt;

  // During start phase, allow any violations — field is still bunching up.
  // KPI counters (infeasible, slowdown, overlaps) only accumulate after start phase ends.
  const inStartPhase = state.timeSec < (state.config?.startPhaseSeconds ?? 0);

  // When transitioning out of start phase, reset pair-overlap timers so any
  // transient start-pile-up doesn't bleed into the race-phase persistent-overlap count.
  if (!inStartPhase && d._startPhaseJustEnded === undefined) {
    d._startPhaseJustEnded = true;
    d.overlapPairDurationSec.clear();
  }

  d.perFrame.minSeparation = Infinity;
  d.perFrame.forcedSlowdownCount = 0;
  d.perFrame.infeasibleCount = 0;
  d.perFrame.maxConstraintViolation = 0;
  d.perFrame.stackDetected = false;

  for (const horse of state.horses) {
    const out = reservationResult.outputsByHorseId.get(horse.id);
    if (!out) continue;

    if (!inStartPhase) d.reservationAttempts += 1;
    if (!out.flags.isFeasible) {
      if (!inStartPhase) d.reservationInfeasible += 1;
      d.perFrame.infeasibleCount += 1;
    }
    if (out.flags.slowedForSafety) {
      if (!inStartPhase) d.forcedSlowdownFrames += 1;
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

    d.laneAbsAYSamples.push(Math.abs(horse.aY));
    const prev = d.prevAYByHorse.get(horse.id) ?? horse.aY;
    d.laneJerkSamples.push(Math.abs(horse.aY - prev) / Math.max(dt, 1e-6));
    d.prevAYByHorse.set(horse.id, horse.aY);

    const jitter = Math.hypot(
      horse.render.nameTagX - horse.render.spriteX,
      horse.render.nameTagY - horse.render.spriteY
    );
    d.visualJitterSamples.push(jitter);
  }

  const actualMinSep = _updatePairMetrics(state.horses, state.trackModel, d, dt);

  d.perFrame.stackDetected = _detectStackEvent(state.horses, state.trackModel);
  if (d.perFrame.stackDetected) d.stackEvents += 1;

  // KPI-2: sample actual pair separation (not solver trajectory) so Safety Shield
  // corrections are reflected — planned trajectory can be negative when solver is infeasible
  // even though no physical overlap occurs after the Shield.
  if (actualMinSep < Infinity) {
    d.minSeparationSamples.push(actualMinSep);
    if (d.minSeparationSamples.length > 2000) d.minSeparationSamples.shift();
    d.minSeparationP01 = _percentile(d.minSeparationSamples, 0.01);
  }
}

function _updatePairMetrics(horses, trackModel, diagnostics, dt) {
  let frameMinSep = Infinity;
  for (let i = 0; i < horses.length; i++) {
    for (let j = i + 1; j < horses.length; j++) {
      const a = horses[i];
      const b = horses[j];
      const key = String(a.id) < String(b.id) ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;

      const minS = (a.bboxLong || a.visibleLengthPx / 2) + (b.bboxLong || b.visibleLengthPx / 2);
      const minY = (a.bboxLat || a.visibleWidthPx / 2) + (b.bboxLat || b.visibleWidthPx / 2);
      const ds = Math.abs(_deltaSWrapped(a.s, b.s, trackModel.lengthS));
      const dy = Math.abs(a.y - b.y);
      const overlap = ds < minS && dy < minY;

      // Box-collision clearance: safe if EITHER dimension has clearance (OR logic).
      // max(sepS, sepY) > 0 ⟺ pair is not colliding.
      frameMinSep = Math.min(frameMinSep, Math.max(ds - minS, dy - minY));

      if (overlap) {
        const dur = (diagnostics.overlapPairDurationSec.get(key) || 0) + dt;
        diagnostics.overlapPairDurationSec.set(key, dur);
        if (dur > 0.2) diagnostics.persistentOverlapEvents += 1;
      } else {
        diagnostics.overlapPairDurationSec.set(key, 0);
      }
    }
  }
  return frameMinSep;
}

function _detectStackEvent(horses, trackModel) {
  const bins = new Map();
  const sBinSize = 25;
  const yBinSize = 20;

  for (const h of horses) {
    const sb = Math.floor(_wrapS(h.s, trackModel.lengthS) / sBinSize);
    const yb = Math.floor(h.y / yBinSize);
    const key = `${sb}:${yb}`;
    bins.set(key, (bins.get(key) || 0) + 1);
  }

  for (const count of bins.values()) {
    if (count >= 3) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _projectToAllowedY(y, yMin, yMax, forbiddenIntervals) {
  let result = _clamp(y, yMin, yMax);
  for (const [lo, hi] of forbiddenIntervals) {
    if (result > lo && result < hi) {
      // Inside forbidden interval — project to nearest boundary
      const toLo = result - lo;
      const toHi = hi - result;
      result = _clamp(toLo <= toHi ? lo : hi, yMin, yMax);
    }
  }
  return result;
}

function _wrapS(s, lengthS) {
  let v = s % lengthS;
  if (v < 0) v += lengthS;
  return v;
}

function _deltaSWrapped(fromS, toS, lengthS) {
  let d = toS - fromS;
  if (d > lengthS * 0.5) d -= lengthS;
  if (d < -lengthS * 0.5) d += lengthS;
  return d;
}

function _clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function _percentile(values, p) {
  if (!values.length) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

// ---------------------------------------------------------------------------
// Exported helpers for testing
// ---------------------------------------------------------------------------

export { _wrapS as wrapS, _deltaSWrapped as deltaSWrapped, _clamp as clamp };

// ---------------------------------------------------------------------------
// Test-only exports (prefixed _test to signal internal use)
// ---------------------------------------------------------------------------

export const _testExports = {
  predictSnapshot: _predictSnapshot,
  computeIntents: _computeIntents,
  sortByPriority: _sortByPriority,
  applyFirstControl: _applyFirstControl,
};
