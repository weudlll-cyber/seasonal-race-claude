// ============================================================
// File:        racePlanner.js
// Path:        client/src/modules/racePlanner.js
// Project:     RaceArena
// Description: Race Plan / Trajectory Generator — Phase 3A M2v2
//              Pure JS, no DOM/React dependencies.
//              Works in Node.js (scripts/sim-fairness.mjs) and browser.
//
// Exports:
//   createRacePlan(racers, finishT, targetDurationMs, config, seed) → RacePlan
//   createTrajectoryController(racePlan) → TrajectoryController
// ============================================================

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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

// Returns [lo, hi] rank bounds for the Bereich containing the given sollRank.
// Bereich 1: 1-5, B2: 6-15, B3: 16-25, B4: 26-40, B5: 41+
function getBereichBounds(sollRank) {
  if (sollRank <= 5) return [1, 5];
  if (sollRank <= 15) return [6, 15];
  if (sollRank <= 25) return [16, 25];
  if (sollRank <= 40) return [26, 40];
  return [41, Infinity];
}

// ── Phase 3A M2v2 defaults ────────────────────────────────────────────────────

const DEFAULT_PHASE_FRACTIONS = {
  pulkStart: 0.25,
  pulkEnd: 0.5,
  transitionEnd: 0.67,
  corridorEnd: 0.95,
  midToLateSwitchFraction: 0.85,
};

const DEFAULT_CORRIDOR_CONFIG = {
  topMarginFraction: 0.4,
  bottomMarginFraction: 1.5,
};

const DEFAULT_CONTROLLER_PARAMS = {
  gain: 2.0,
  maxMult: 1.1,
  minMult: 0.85,
};

const DEFAULT_PULK_TARGET_SPREAD = 0.005;
const DEFAULT_STOCHASTIC_NOISE = 0.0008;
const DEFAULT_PULK_BIAS_GAIN = 2.0;

// Base deltas for the Bereichs-Bonus. multiplier=1.0 reproduces the original values.
// bonus = 1.0 + (BASE_DELTA × multiplier). Range 0.5–3.0 is sane for the multiplier.
const BEREICHS_BONUS_BASE_DELTAS = { B1: 0.03, B2: 0.02, B3: 0.01, B4: 0.0, B5: -0.01 };
const DEFAULT_BEREICHS_BONUS_FADE_MS = 1500;

function computeBereichsBonusMap(multiplier) {
  const m = multiplier ?? 1.0;
  return {
    B1: 1.0 + BEREICHS_BONUS_BASE_DELTAS.B1 * m,
    B2: 1.0 + BEREICHS_BONUS_BASE_DELTAS.B2 * m,
    B3: 1.0 + BEREICHS_BONUS_BASE_DELTAS.B3 * m,
    B4: 1.0,
    B5: 1.0 + BEREICHS_BONUS_BASE_DELTAS.B5 * m,
  };
}

function getBereichsBonus(sollRank, bonusMap) {
  if (sollRank <= 5) return bonusMap.B1;
  if (sollRank <= 15) return bonusMap.B2;
  if (sollRank <= 25) return bonusMap.B3;
  if (sollRank <= 40) return bonusMap.B4;
  return bonusMap.B5;
}

// ── createRacePlan ────────────────────────────────────────────────────────────

/**
 * Create a deterministic Race Plan for one race.
 *
 * M2v2: assigns a random sollRank (1..n) to every racer regardless of start row.
 * The racer with sollRank=1 is the designated winner.
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

  // M2v2: assign random sollRank 1..n to each racer via Fisher-Yates shuffle
  const n = racers.length;
  const rankPool = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = rankPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rankPool[i], rankPool[j]] = [rankPool[j], rankPool[i]];
  }
  const racerSollRank = new Map();
  for (let i = 0; i < racers.length; i++) {
    racerSollRank.set(racers[i].index, rankPool[i]);
  }
  // Winner = racer with sollRank=1 (used for reporting, not for steering)
  const winnerEntry = [...racerSollRank.entries()].find(([, rank]) => rank === 1);
  const winnerRacerId = winnerEntry[0];

  // Group racers by startRowIndex
  const byRow = new Map();
  for (const r of racers) {
    const row = r.startRowIndex ?? 0;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(r);
  }

  // Select 3 pulk racers from middle field (rows 1–3 preferred), never the winner
  const middleField = racers.filter((r) => {
    const row = r.startRowIndex ?? 0;
    return r.index !== winnerRacerId && row >= 1 && row <= 3;
  });
  const pulkPool =
    middleField.length >= 3 ? middleField : racers.filter((r) => r.index !== winnerRacerId);

  // Fisher-Yates shuffle for pulk selection (uses same rng, advancing state)
  const shuffled = [...pulkPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const pulkRacerIds = shuffled.slice(0, 3).map((r) => r.index);

  // Absolute phase boundaries in ms
  const postStartHoldMs = config.postStartHoldMs ?? 0;
  const phases = {
    pulkStart: Math.max(postStartHoldMs, phaseFractions.pulkStart * targetDurationMs),
    pulkEnd: phaseFractions.pulkEnd * targetDurationMs,
    transEnd: phaseFractions.transitionEnd * targetDurationMs,
    corrEnd: phaseFractions.corridorEnd * targetDurationMs,
    midSwitch: phaseFractions.midToLateSwitchFraction * targetDurationMs,
  };

  // Bereichs-Bonus: one constant multiplier per racer based on their soll-Bereich.
  // bereichsBonusByBereich in config takes precedence; otherwise scale by bonusStrengthMultiplier.
  const bereichsBonusMap =
    config.bereichsBonusByBereich ?? computeBereichsBonusMap(config.bonusStrengthMultiplier ?? 1.0);
  const racerBereichsBonus = new Map();
  for (const [racerIdx, sollRank] of racerSollRank) {
    racerBereichsBonus.set(racerIdx, getBereichsBonus(sollRank, bereichsBonusMap));
  }

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
    _racerSollRank: racerSollRank,
    _racerBereichsBonus: racerBereichsBonus,
    _bereichsBonusFadeDuration: config.bereichsBonusFadeDuration ?? DEFAULT_BEREICHS_BONUS_FADE_MS,
  };
}

// ── createTrajectoryController ────────────────────────────────────────────────

/**
 * Create a stateful Trajectory Controller from a Race Plan.
 *
 * M2v2: bidirectional P-controller for ALL racers in OUTCOME phase.
 * Each racer is pushed toward their assigned sollRank.
 *
 * Usage:
 *   const ctrl = createTrajectoryController(plan);
 *   // Each physics step:
 *   //   Pass 1 (re-rolls): call ctrl.computePulkBiasedTarget() for pulk racers
 *   //   Controller-Pass:   call ctrl.update(racers, elapsedMs)
 *   //   Pass 2 (t-update): r.t += r.baseSpeed * boost * brake * r.trajectoryMult * r.bereichsBonusMult * dt
 *
 * @param {object} racePlan  output of createRacePlan
 * @returns {object} TrajectoryController
 */
export function createTrajectoryController(racePlan) {
  const plan = racePlan;
  const { gain, maxMult, minMult } = plan.controllerParams;
  const { pulkStart, pulkEnd, transEnd, corrEnd } = plan._phases;

  const rng = plan.seed > 0 ? mulberry32(plan.seed + 0x9e3779b9) : Math.random;

  // Per-race telemetry counters (reset via collectTelemetry)
  let _winnerBlockedInOutcome = 0;
  let _winnerStepCount = 0;
  let _pulkBiasDeltaSum = 0;
  let _pulkBiasEventCount = 0;
  let _racerStepCount = 0;
  let _racersInCorridorCount = 0;
  let _corridorViolationSum = 0;
  let _corridorViolationMax = 0;
  let _bidirectionalBoostCount = 0;
  let _bidirectionalBrakeCount = 0;
  let _racersBlockedCount = 0;

  function getPhase(elapsedMs) {
    if (elapsedMs < pulkStart) return 'PRE_PULK';
    if (elapsedMs < pulkEnd) return 'PULK';
    if (elapsedMs < transEnd) return 'TRANSITION';
    if (elapsedMs < corrEnd) return 'OUTCOME';
    return 'FINAL';
  }

  /**
   * Controller-Pass: sets r.trajectoryMult on every racer.
   * In OUTCOME phase every racer gets a bidirectional correction toward their sollRank.
   *
   * @param {Array}  racers    live racer objects (must have .index, .t, .finished, .avoidanceActive)
   * @param {number} elapsedMs physicsTs in ms from race start
   */
  function _setTarget(r, newTarget, elapsedMs) {
    if (Math.abs(newTarget - (r.trajectoryMultTarget ?? 1.0)) > 0.001) {
      r.trajectoryMultPrev = r.trajectoryMult ?? 1.0;
      r.trajectoryMultTarget = newTarget;
      r.trajectoryMultTransStart = elapsedMs;
    }
  }

  function update(racers, elapsedMs) {
    // ── bereichsBonusMult: full pre-OUTCOME, easeInOutCubic fade at OUTCOME entry ──
    if (elapsedMs < transEnd) {
      for (const r of racers) {
        r.bereichsBonusMult = plan._racerBereichsBonus.get(r.index) ?? 1.0;
      }
    } else {
      const elapsedFade = elapsedMs - transEnd;
      const easedProgress = easeInOutCubic(
        Math.min(1.0, elapsedFade / plan._bereichsBonusFadeDuration)
      );
      for (const r of racers) {
        const origBonus = plan._racerBereichsBonus.get(r.index) ?? 1.0;
        r.bereichsBonusMult = origBonus + (1.0 - origBonus) * easedProgress;
      }
    }

    // ── trajectoryMult P-controller ───────────────────────────────────────────
    if (getPhase(elapsedMs) !== 'OUTCOME') {
      for (const r of racers) _setTarget(r, 1.0, elapsedMs);
      return;
    }

    // Sort non-finished racers by t descending; stable tiebreak: lower index = higher rank
    const active = racers
      .filter((r) => !r.finished)
      .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));

    for (const r of racers) {
      if (r.finished) _setTarget(r, 1.0, elapsedMs);
    }

    const nActive = active.length;
    if (nActive === 0) return;

    const NOISE_THRESH = plan._stochasticNoise;
    const tm = (r) => r.trajectoryMult ?? 1.0;

    for (let rankIdx = 0; rankIdx < nActive; rankIdx++) {
      const r = active[rankIdx];
      const currentRank = rankIdx + 1; // 1-indexed, 1 = leading
      const sollRank = plan._racerSollRank.get(r.index) ?? currentRank;

      // positive rankError = racer currently ranked worse than target → boost
      const rankError = currentRank - sollRank;
      const noise = (rng() - 0.5) * 2 * plan._stochasticNoise;
      const rawTarget = clamp(1.0 + gain * (rankError / nActive) + noise, minMult, maxMult);
      _setTarget(r, rawTarget, elapsedMs);

      // Telemetry uses r.trajectoryMult — the smoothed value from the previous physics step
      _racerStepCount++;
      _corridorViolationSum += Math.abs(rankError);
      if (Math.abs(rankError) > _corridorViolationMax) _corridorViolationMax = Math.abs(rankError);

      const [bereichLo, bereichHi] = getBereichBounds(sollRank);
      if (currentRank >= bereichLo && currentRank <= bereichHi) _racersInCorridorCount++;

      if (tm(r) > 1.0 + NOISE_THRESH) _bidirectionalBoostCount++;
      else if (tm(r) < 1.0 - NOISE_THRESH) _bidirectionalBrakeCount++;

      if (r.avoidanceActive) _racersBlockedCount++;

      if (r.index === plan.winnerRacerId) {
        _winnerStepCount++;
        if (r.avoidanceActive) _winnerBlockedInOutcome++;
      }
    }
  }

  /**
   * Pulk-phase re-roll bias.
   * Called during the re-roll event (Pass 1) for pulk racers instead of the plain random draw.
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
   * Collect per-race naturalness telemetry for gate evaluation.
   * Resets counters after collection (call once per race, at race end).
   *
   * @returns {object} telemetry snapshot
   */
  function collectTelemetry() {
    const tel = {
      winnerBlockedFractionInOutcome:
        _winnerStepCount > 0 ? _winnerBlockedInOutcome / _winnerStepCount : 0,
      planBiasDeltaMean: _pulkBiasEventCount > 0 ? _pulkBiasDeltaSum / _pulkBiasEventCount : 0,
      pulkBiasEventCount: _pulkBiasEventCount,
      racersInCorridorFraction: _racerStepCount > 0 ? _racersInCorridorCount / _racerStepCount : 0,
      corridorViolationMean: _racerStepCount > 0 ? _corridorViolationSum / _racerStepCount : 0,
      corridorViolationMax: _corridorViolationMax,
      bidirectionalBoostFraction:
        _racerStepCount > 0 ? _bidirectionalBoostCount / _racerStepCount : 0,
      bidirectionalBrakeFraction:
        _racerStepCount > 0 ? _bidirectionalBrakeCount / _racerStepCount : 0,
      racersBlockedInOutcome: _racerStepCount > 0 ? _racersBlockedCount / _racerStepCount : 0,
    };
    _winnerBlockedInOutcome = 0;
    _winnerStepCount = 0;
    _pulkBiasDeltaSum = 0;
    _pulkBiasEventCount = 0;
    _racerStepCount = 0;
    _racersInCorridorCount = 0;
    _corridorViolationSum = 0;
    _corridorViolationMax = 0;
    _bidirectionalBoostCount = 0;
    _bidirectionalBrakeCount = 0;
    _racersBlockedCount = 0;
    return tel;
  }

  return { update, computePulkBiasedTarget, getPhase, collectTelemetry };
}
