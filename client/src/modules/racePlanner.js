// ============================================================
// File:        racePlanner.js
// Path:        client/src/modules/racePlanner.js
// Project:     RaceArena
// Description: Race Plan / Trajectory Generator — Phase 3A Pilot
//              Pure JS, no DOM/React dependencies.
//              Works in Node.js (scripts/sim-fairness.mjs) and browser.
//
// Exports:
//   createRacePlan(racers, finishT, targetDurationMs, config, seed) → RacePlan
//   createTrajectoryController(racePlan) → TrajectoryController
// ============================================================

// ── Mulberry32 PRNG (same algorithm as scripts/sim-fairness.mjs) ──────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ── Phase 3A pilot defaults ───────────────────────────────────────────────────
// Winner row probability for dragon@r70 Space Sprint (5 rows).
// 4-row aggregate 28/25/24/23 → Row 3+4 each get half of the 23% rear block.
// ±2pp per row allowed without further approval (Spec §A).
const DEFAULT_WINNER_ROW_PROB = [0.28, 0.25, 0.24, 0.12, 0.11];

const DEFAULT_PHASE_FRACTIONS = {
  pulkStart: 0.25,
  pulkEnd: 0.5,
  transitionEnd: 0.67,
  corridorEnd: 0.95,
  midToLateSwitchFraction: 0.85,
};

const DEFAULT_CORRIDOR_CONFIG = {
  topMarginFraction: 0.4, // min lead over rank+1 as fraction of tGap
  bottomMarginFraction: 1.5, // max lead before controller stops accelerating
};

const DEFAULT_CONTROLLER_PARAMS = {
  gain: 8.0,
  maxMult: 1.2,
  minMult: 0.85,
};

const DEFAULT_PULK_TARGET_SPREAD = 0.005; // ±t-space spread within pulk
const DEFAULT_STOCHASTIC_NOISE = 0.0008; // ±per step, prevents locked-on look
const DEFAULT_PULK_BIAS_GAIN = 2.0; // planBias coefficient in bias formula

// ── createRacePlan ────────────────────────────────────────────────────────────

/**
 * Create a deterministic Race Plan for one race.
 *
 * @param {Array<{index:number, startRowIndex:number}>} racers
 * @param {number}  finishT          t-space finish line
 * @param {number}  targetDurationMs intended race length in ms
 * @param {object}  [config]         partial config overrides
 * @param {number}  [seed]           PRNG seed; 0 = non-deterministic
 * @returns {object} RacePlan
 */
export function createRacePlan(racers, finishT, targetDurationMs, config = {}, seed = 0) {
  const rng = seed > 0 ? mulberry32(seed) : Math.random;

  const phaseFractions = { ...DEFAULT_PHASE_FRACTIONS, ...(config.phaseFractions ?? {}) };
  const corridorConfig = { ...DEFAULT_CORRIDOR_CONFIG, ...(config.corridorConfig ?? {}) };
  const controllerParams = { ...DEFAULT_CONTROLLER_PARAMS, ...(config.controllerParams ?? {}) };
  const winnerRowProb = config.winnerRowProb ?? DEFAULT_WINNER_ROW_PROB;

  // Group racers by startRowIndex
  const byRow = new Map();
  for (const r of racers) {
    const row = r.startRowIndex ?? 0;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(r);
  }
  const totalRows =
    racers.length > 0 ? Math.max(...racers.map((r) => r.startRowIndex ?? 0)) + 1 : 1;

  // Sample winner row from distribution (normalised in case totalRows < 5)
  const probs = winnerRowProb.slice(0, totalRows);
  const probSum = probs.reduce((s, p) => s + p, 0);
  let winnerRow = totalRows - 1;
  let cumul = 0;
  const roll = rng();
  for (let i = 0; i < probs.length; i++) {
    cumul += probs[i] / probSum;
    if (roll < cumul) {
      winnerRow = i;
      break;
    }
  }

  // Pick one random racer from the winner row (fallback: all racers)
  const winnerPool = byRow.get(winnerRow) ?? racers;
  const winnerRacer = winnerPool[Math.floor(rng() * winnerPool.length)];
  const winnerRacerId = winnerRacer.index;

  // Select 3 pulk racers from middle field (rows 1–3 preferred), never the winner
  const middleField = racers.filter((r) => {
    const row = r.startRowIndex ?? 0;
    return r.index !== winnerRacerId && row >= 1 && row <= 3;
  });
  const pulkPool =
    middleField.length >= 3 ? middleField : racers.filter((r) => r.index !== winnerRacerId);

  // Fisher-Yates shuffle with seeded RNG
  const shuffled = [...pulkPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const pulkRacerIds = shuffled.slice(0, 3).map((r) => r.index);

  // Absolute phase boundaries in ms
  // postStartHoldMs: absolute minimum for pulkStart (camera/avoidance warmup constraint)
  const postStartHoldMs = config.postStartHoldMs ?? 0;
  const phases = {
    pulkStart: Math.max(postStartHoldMs, phaseFractions.pulkStart * targetDurationMs),
    pulkEnd: phaseFractions.pulkEnd * targetDurationMs,
    transEnd: phaseFractions.transitionEnd * targetDurationMs,
    corrEnd: phaseFractions.corridorEnd * targetDurationMs,
    midSwitch: phaseFractions.midToLateSwitchFraction * targetDurationMs,
  };

  return {
    seed,
    winnerRacerId,
    pulkRacerIds,
    phaseFractions,
    corridorConfig,
    controllerParams,
    _phases: phases,
    _finishT: finishT,
    _targetDurationMs: targetDurationMs,
    _pulkTargetSpread: config.pulkTargetSpread ?? DEFAULT_PULK_TARGET_SPREAD,
    _stochasticNoise: config.stochasticNoise ?? DEFAULT_STOCHASTIC_NOISE,
    _pulkBiasGain: config.pulkBiasGain ?? DEFAULT_PULK_BIAS_GAIN,
  };
}

// ── createTrajectoryController ────────────────────────────────────────────────

/**
 * Create a stateful Trajectory Controller from a Race Plan.
 *
 * Usage:
 *   const ctrl = createTrajectoryController(plan);
 *   // Each physics step:
 *   //   Pass 1 (re-rolls): call ctrl.computePulkBiasedTarget() for pulk racers
 *   //   Controller-Pass:   call ctrl.update(racers, elapsedMs)
 *   //   Pass 2 (t-update): r.t += r.baseSpeed * boost * brake * r.trajectoryMult * dt
 *
 * @param {object} racePlan  output of createRacePlan
 * @returns {object} TrajectoryController
 */
export function createTrajectoryController(racePlan) {
  const plan = racePlan;
  const { gain, maxMult, minMult } = plan.controllerParams;
  const { pulkStart, pulkEnd, transEnd, corrEnd, midSwitch } = plan._phases;

  // Use a separate seed offset so controller noise differs from plan selection
  const rng = plan.seed > 0 ? mulberry32(plan.seed + 0x9e3779b9) : Math.random;

  // Telemetry counters (reset-able via collectTelemetry)
  let _winnerBlockedInOutcome = 0;
  let _totalOutcomeSteps = 0;
  let _pulkBiasDeltaSum = 0;
  let _pulkBiasEventCount = 0;

  function getPhase(elapsedMs) {
    if (elapsedMs < pulkStart) return 'PRE_PULK';
    if (elapsedMs < pulkEnd) return 'PULK';
    if (elapsedMs < transEnd) return 'TRANSITION';
    if (elapsedMs < corrEnd) return 'OUTCOME';
    return 'FINAL';
  }

  /**
   * Controller-Pass: sets r.trajectoryMult on every racer.
   * Only the winner receives a non-1.0 value in OUTCOME phase.
   *
   * @param {Array}  racers    live racer objects (must have .index, .t, .finished, .avoidanceActive)
   * @param {number} elapsedMs physicsTs in ms from race start
   */
  function update(racers, elapsedMs) {
    for (const r of racers) r.trajectoryMult = 1.0;

    if (getPhase(elapsedMs) !== 'OUTCOME') return;

    const winner = racers.find((r) => r.index === plan.winnerRacerId && !r.finished);
    if (!winner) return;

    _totalOutcomeSteps++;
    if (winner.avoidanceActive) _winnerBlockedInOutcome++;

    // Sort non-finished racers by t descending; stable tiebreak: lower index = higher rank
    const active = racers
      .filter((r) => !r.finished)
      .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));

    if (active.length === 0) return;

    const winnerRank = active.findIndex((r) => r.index === plan.winnerRacerId) + 1;

    // Mid-OUTCOME: aim for rank 3, no intervention when rank ≤ 2, corridor ≤ rank 5
    // Late-OUTCOME: aim for rank 2, no intervention when rank ≤ 1, corridor ≤ rank 3
    const isMid = elapsedMs < midSwitch;
    const noInterventionRank = isMid ? 2 : 1;
    const targetRank = isMid ? 3 : 2;

    const noise = (rng() - 0.5) * 2 * plan._stochasticNoise;

    if (winnerRank <= noInterventionRank) {
      // Already ahead of corridor centre — stochastic noise only
      winner.trajectoryMult = clamp(1.0 + noise, minMult, maxMult);
      return;
    }

    // Target t = position of racer at targetRank (0-indexed)
    const targetIdx = Math.min(targetRank - 1, active.length - 1);
    const tTarget = active[targetIdx].t;
    const tError = tTarget - winner.t; // positive = winner is behind target

    // corridorBottomMargin: stop accelerating if winner already leads by > margin × tGap
    // tGap = gap between adjacent racers near targetIdx (reference spacing)
    const refA = active[Math.min(targetIdx, active.length - 2)];
    const refB = active[Math.min(targetIdx + 1, active.length - 1)];
    const tGap = refA && refB ? Math.max(Math.abs(refA.t - refB.t), 1e-6) : 1e-4;
    if (tError < -(plan.corridorConfig.bottomMarginFraction * tGap)) {
      // Winner too far ahead of corridor — let physics coast, just add noise
      winner.trajectoryMult = clamp(1.0 + noise, minMult, maxMult);
      return;
    }

    // P-controller: push winner toward tTarget
    winner.trajectoryMult = clamp(1.0 + gain * tError + noise, minMult, maxMult);
  }

  /**
   * Pulk-phase re-roll bias.
   * Called during the re-roll event (Pass 1) for pulk racers instead of the plain random draw.
   *
   * Bias formula: biasedTarget = rawSample + pulkBiasGain × normalisedTError
   * where normalisedTError = (pulkCenter.t - racer.t) / finishT
   *
   * @param {number} racerIndex
   * @param {number} rawSample   pre-clamp random draw from the re-roll engine
   * @param {number} spreadMin   BASE_SPEED_MIN / BASE_SPEED_MEAN
   * @param {number} spreadMax   BASE_SPEED_MAX / BASE_SPEED_MEAN
   * @param {Array}  racers      all racers
   * @param {number} elapsedMs
   * @returns {number}  biased pre-clamp value; caller applies final clamp
   */
  function computePulkBiasedTarget(racerIndex, rawSample, spreadMin, spreadMax, racers, elapsedMs) {
    if (getPhase(elapsedMs) !== 'PULK') return rawSample;
    if (!plan.pulkRacerIds.includes(racerIndex)) return rawSample;

    const thisRacer = racers.find((r) => r.index === racerIndex);
    if (!thisRacer || thisRacer.finished) return rawSample;

    // Pulk centre = mean t of all non-finished pulk racers
    const pulkLive = racers.filter((r) => plan.pulkRacerIds.includes(r.index) && !r.finished);
    if (pulkLive.length === 0) return rawSample;

    const pulkCenterT = pulkLive.reduce((s, r) => s + r.t, 0) / pulkLive.length;
    const normalisedErr = (pulkCenterT - thisRacer.t) / Math.max(plan._finishT, 1e-6);
    const biased = rawSample + plan._pulkBiasGain * normalisedErr;

    const result = clamp(biased, spreadMin, spreadMax);
    _pulkBiasDeltaSum += Math.abs(result - rawSample);
    _pulkBiasEventCount += 1;
    return result;
  }

  /**
   * Collect per-race naturalness telemetry for Naturalness-Gate evaluation.
   * Resets counters after collection (call once per race, at race end).
   *
   * @returns {{ winnerBlockedFractionInOutcome, planBiasDeltaMean, pulkBiasEventCount }}
   */
  function collectTelemetry() {
    const tel = {
      winnerBlockedFractionInOutcome:
        _totalOutcomeSteps > 0 ? _winnerBlockedInOutcome / _totalOutcomeSteps : 0,
      planBiasDeltaMean: _pulkBiasEventCount > 0 ? _pulkBiasDeltaSum / _pulkBiasEventCount : 0,
      pulkBiasEventCount: _pulkBiasEventCount,
    };
    _winnerBlockedInOutcome = 0;
    _totalOutcomeSteps = 0;
    _pulkBiasDeltaSum = 0;
    _pulkBiasEventCount = 0;
    return tel;
  }

  return { update, computePulkBiasedTarget, getPhase, collectTelemetry };
}
