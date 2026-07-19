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

import { easeInOutCubic } from '../utils/mathUtils.js';
import { sampleHeroCurve } from './heroChoreography.js';
import { generateHeroCurves, GENERATOR_CONFIG } from './heroCurveGenerator.js';

// ── Mulberry32 PRNG (same algorithm as scripts/sim-fairness.mjs) ──────────────
// Exported so the governor (raceGovernor.js) reuses the SAME PRNG helper (A3) instead of
// introducing a second RNG — with its own distinct XOR-seed constant.
export function mulberry32(seed) {
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

// Single-source band split points: ranks 1–5=B1, 6–15=B2, 16–25=B3, 26–40=B4, 41+=B5.
export const BAND_EDGES = [5, 15, 25, 40];

// Maps a rank to its 0-based band index (0=B1 … 4=B5).
function rankToBandIndex(rank) {
  for (let i = 0; i < BAND_EDGES.length; i++) {
    if (rank <= BAND_EDGES[i]) return i;
  }
  return BAND_EDGES.length;
}

// Returns [lo, hi] rank bounds for the area containing the given targetRank.
// Area 1: 1-5, B2: 6-15, B3: 16-25, B4: 26-40, B5: 41+
function getAreaBounds(targetRank) {
  const i = rankToBandIndex(targetRank);
  const lo = i === 0 ? 1 : BAND_EDGES[i - 1] + 1;
  const hi = i < BAND_EDGES.length ? BAND_EDGES[i] : Infinity;
  return [lo, hi];
}

// ── Phase 3A M2v2 defaults ────────────────────────────────────────────────────

// THE single source for the default phase boundaries. pulkStart here is the ONE literal that defines
// the CHAOS→PULK / director-anchor boundary; the hero-curve generator's anchor default derives from it
// (heroCurveGenerator.js reads DEFAULT_PHASE_FRACTIONS.pulkStart), and the live per-race value is
// threaded into the generator from the resolved plan — so there is no second copy of the anchor value.
export const DEFAULT_PHASE_FRACTIONS = {
  pulkStart: 0.25,
  pulkEnd: 0.5,
  transitionEnd: 0.75,
  corridorStart: 0.55,
  corridorEnd: 1.0,
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
  bandStrictness: 1.0,
};

const DEFAULT_PULK_TARGET_SPREAD = 0.005;
const DEFAULT_STOCHASTIC_NOISE = 0.0008;
const DEFAULT_PULK_BIAS_GAIN = 2.0;

// Base deltas for the area bonus. multiplier=1.0 reproduces the original values.
// bonus = 1.0 + (BASE_DELTA × multiplier). Range 0.5–3.0 is sane for the multiplier.
const AREA_BONUS_BASE_DELTAS = { B1: 0.03, B2: 0.02, B3: 0.01, B4: 0.0, B5: -0.01 };
const DEFAULT_AREA_BONUS_FADE_MS = 1500;

function computeAreaBonusMap(multiplier) {
  const m = multiplier ?? 1.0;
  return {
    B1: 1.0 + AREA_BONUS_BASE_DELTAS.B1 * m,
    B2: 1.0 + AREA_BONUS_BASE_DELTAS.B2 * m,
    B3: 1.0 + AREA_BONUS_BASE_DELTAS.B3 * m,
    B4: 1.0,
    B5: 1.0 + AREA_BONUS_BASE_DELTAS.B5 * m,
  };
}

function getAreaBonus(targetRank, bonusMap) {
  const keys = ['B1', 'B2', 'B3', 'B4', 'B5'];
  return bonusMap[keys[rankToBandIndex(targetRank)]];
}

// ── createRacePlan ────────────────────────────────────────────────────────────

/**
 * Create a deterministic Race Plan for one race.
 *
 * M2v2: assigns a random targetRank (1..n) to every racer regardless of start row.
 * The racer with targetRank=1 is the designated winner.
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

  // Top-level timing shortcuts: bonusTransitionEnd / corridorStart / corridorEnd / bonusFadeDuration.
  // These take precedence over phaseFractions when explicitly provided, and are reflected back into
  // phaseFractions so plan.phaseFractions always shows the effective values.
  if (config.pulkStart !== undefined) phaseFractions.pulkStart = config.pulkStart;
  if (config.bonusTransitionEnd !== undefined)
    phaseFractions.transitionEnd = config.bonusTransitionEnd;
  if (config.corridorStart !== undefined) phaseFractions.corridorStart = config.corridorStart;
  if (config.corridorEnd !== undefined) phaseFractions.corridorEnd = config.corridorEnd;

  // choreo TWO-PHASE MODEL (CHAOS → PULK → OUTCOME): under choreo there is no TRANSITION phase — OUTCOME
  // (the pack's band-steering) begins exactly where PULK ends, so `corridorStart := pulkEnd` (the live
  // value, DERIVED not copied). `choreoOutcomeStart` is the STORAGE KEY for the PULK-end fraction
  // (the DevScreen "PULK end / OUTCOME begins here" slider writes it). At defaults it equals pulkStart
  // (0.25) → PULK is zero-width and this degenerates to the former collapse, byte-identical to the
  // reactive path's steer-from-0.25. Raising it reopens the PULK window [pulkStart, pulkEnd] and moves
  // OUTCOME with it. The clamp chain below keeps pulkStart <= pulkEnd <= corridorStart <= corridorEnd.
  // Single source: every downstream phase read (getPhase, the engine's + sim's areaBonus phase-split
  // via getPhaseFractions) inherits these fractions — no duplicated phase math. Choreography is
  // UNCONDITIONAL: PULK ends at choreoOutcomeStart and OUTCOME steers from there (one boundary).
  const choreoPulkEnd = config.choreoOutcomeStart ?? 0.25;
  phaseFractions.pulkEnd = choreoPulkEnd;
  phaseFractions.corridorStart = choreoPulkEnd;

  // Phase-boundary hardening (Stage A): keep the boundaries ordered the way the ordered
  // getPhase branches below assume — pulkStart <= pulkEnd <= corridorStart <= corridorEnd —
  // so no consumer sees an inverted TRANSITION or a negative span. A span that would be <= 0
  // degenerates cleanly to a zero-duration phase (never NaN, never inverted). Monotonic clamp
  // chain anchored on corridorEnd as the ceiling; it SUPERSEDES the former corridorStart <=
  // corridorEnd clamp (min against corridorEnd is preserved as the upper bound). No-op for
  // well-ordered configs — the defaults (0.25/0.5/0.55/1.0) are unchanged. Single source: the
  // sim imports createRacePlan (sim-fairness.mjs:59), so browser and sim inherit this identically.
  // No hardcoded fractions — every bound reads the live resolved phaseFractions.
  const resolvedCorridorStart = phaseFractions.corridorStart ?? phaseFractions.transitionEnd;
  // pulkStart is now ownable (DevScreen "PULK begins here"); anchor it to [0, corridorEnd] first so the
  // monotonic chain below can never produce an inverted PULK. No-op for the defaults (0.25).
  phaseFractions.pulkStart = clamp(phaseFractions.pulkStart, 0, phaseFractions.corridorEnd);
  phaseFractions.pulkEnd = clamp(
    phaseFractions.pulkEnd,
    phaseFractions.pulkStart,
    phaseFractions.corridorEnd
  );
  phaseFractions.corridorStart = clamp(
    resolvedCorridorStart,
    phaseFractions.pulkEnd,
    phaseFractions.corridorEnd
  );

  const corridorConfig = { ...DEFAULT_CORRIDOR_CONFIG, ...(config.corridorConfig ?? {}) };
  const controllerParams = { ...DEFAULT_CONTROLLER_PARAMS, ...(config.controllerParams ?? {}) };

  // M2v2: assign random targetRank 1..n to each racer via Fisher-Yates shuffle
  const n = racers.length;
  const rankPool = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = rankPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rankPool[i], rankPool[j]] = [rankPool[j], rankPool[i]];
  }
  const racerTargetRank = new Map();
  for (let i = 0; i < racers.length; i++) {
    racerTargetRank.set(racers[i].index, rankPool[i]);
  }
  // Winner = racer with targetRank=1 (used for reporting, not for steering)
  const winnerEntry = [...racerTargetRank.entries()].find(([, rank]) => rank === 1);
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
    transEnd: phaseFractions.transitionEnd * targetDurationMs, // areaBonusMult fade boundary
    corrStart: phaseFractions.corridorStart * targetDurationMs, // P-controller start (OUTCOME begin)
    corrEnd: phaseFractions.corridorEnd * targetDurationMs, // P-controller end  (OUTCOME end)
    midSwitch: phaseFractions.midToLateSwitchFraction * targetDurationMs,
  };

  // Area bonus: one constant multiplier per racer based on their target area.
  // areaBonusByArea in config takes precedence; otherwise scale by bonusStrengthMultiplier.
  const areaBonusMap =
    config.areaBonusByArea ?? computeAreaBonusMap(config.bonusStrengthMultiplier ?? 1.0);
  const racerAreaBonus = new Map();
  for (const [racerIdx, targetRank] of racerTargetRank) {
    racerAreaBonus.set(racerIdx, getAreaBonus(targetRank, areaBonusMap));
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
    _racerTargetRank: racerTargetRank,
    _racerAreaBonus: racerAreaBonus,
    _areaBonusFadeDuration:
      config.bonusFadeDuration ?? config.areaBonusFadeDuration ?? DEFAULT_AREA_BONUS_FADE_MS,
    // ── areaBonus phase-split (INFRA 5A: ONE shared home for browser AND sim) ──────────────────
    // The controller rescales each racer's areaBonusMult to a phase-dependent STRENGTH (EARLY /
    // PULK / POST). This rescale used to be DUPLICATED: the browser did it in index.jsx AFTER
    // update(), the sim only did it behind the --areaBonus* flags — so a flagless sim applied the
    // full +6% band bonus while the browser applied the split-down +3%. Centralised here so both
    // engines inherit the SAME split from the SAME source (the sim imports createRacePlan). The
    // reference strength is the SAME multiplier the areaBonusMap was built with, so scale =
    // phaseStrength / refStrength reproduces the linear band delta exactly. Boundaries are read
    // from the LIVE plan fractions in the controller (never a literal). phaseSplitBonusEnabled
    // false → the controller skips the rescale → areaBonusMult stays the raw map value.
    _phaseSplitBonusEnabled: !!config.phaseSplitBonusEnabled,
    _areaRefStrength: config.bonusStrengthMultiplier ?? 1.0,
    _areaBonusEarly: config.areaBonusEarly ?? config.bonusStrengthMultiplier ?? 1.0,
    _areaBonusPulk: config.areaBonusPulk ?? config.bonusStrengthMultiplier ?? 1.0,
    _areaBonusPost: config.areaBonusPost ?? config.bonusStrengthMultiplier ?? 1.0,
    // ── Hero choreography (UNCONDITIONAL; _choreoEnabled is always true) ──────────────────────────────
    // The GENERATOR runs ONCE at the post-chaos boundary (~pulkStart) inside update(), on the ACTUAL
    // field state, and casts 2–4 heroes with anchored curves. These fields hold its inputs + the
    // mutable result (filled in-place by update()). _choreoPackBandStrictness loosens the PACK so heroes
    // can weave through (heroes themselves always track their curve exactly).
    _choreoEnabled: true,
    _choreoIntensity: config.choreoIntensity ?? 0.6,
    _choreoPackBandStrictness: config.choreoPackBandStrictness ?? 0.5,
    // Stage 1 spoiler switch (default OFF): suppress the B1-target pool's CHAOS areaBonus so the future
    // top-5 are not pulled forward before the race opens. A bonus switch, NOT a depth tool (depth is
    // authored via the establish-act fall-back). Read in update()'s choreo areaBonus block.
    _choreoSuppressChaosBonusB1: !!config.choreoSuppressChaosBonusB1,
    // Step 4: front-contest release + staggered per-band resolve (DevScreen-adjustable). B1 heroes
    // are held to _choreoReleaseProgress then RELEASED to natural speed; _choreoBandResolve[band] is the
    // resolve checkpoint per band (index 0=B1 uses the release). Fed to the generator + the release.
    _choreoReleaseProgress: config.choreoReleaseProgress ?? 0.97,
    _choreoBandResolve: [
      config.choreoReleaseProgress ?? 0.97,
      config.choreoResolveB2 ?? 0.8,
      config.choreoResolveB3 ?? 0.7,
      config.choreoResolveB4 ?? 0.65,
      config.choreoResolveB5 ?? 0.6,
    ],
    _heroCurves: null, // Map index → anchored curve, once generated
    _choreoGenerated: false,
    _choreoPrevRanks: null, // one-frame-earlier ranks, for the jerk-anchor velocities
    _choreoPrevProgress: null,
    // ── Pack-only strictness release with spatial hysteresis (flag-gated; default OFF) ──────────────
    // When a NON-hero (pack) racer is inside its target band the servo strictness drops to 0 so it
    // roams freely (error collapses to bandError, which is 0 inside the band → natural speed). When it
    // drifts more than _packReSteerThreshold ranks past the band edge the strictness snaps to 1 (full
    // rank pinning) until it is fully back inside (bandError == 0), then releases again. The release↔
    // re-steer gap IS the anti-flicker guard — there is NO time cooldown. Heroes are untouched (they
    // keep strictness 1.0 + their authored curves + the 0.97 B1-release). packReleaseEnabled false →
    // the servo strictness stays the shipped value → byte-identical to the pre-feature behaviour.
    _packReleaseEnabled: !!config.packReleaseEnabled,
    _packReSteerThreshold: config.packReSteerThreshold ?? 1.0,
    // ── B2-attacker "Attack & Fall" (default OFF: b2AttackHeroes 0 → generator casts none → byte-identical) ──
    // Threaded into the hero-curve generator (which casts the attackers) AND read by the servo below, which
    // runs the Track-to-FinalRank-then-Free logic for role 'attacker-b2'. See heroCurveGenerator.js.
    _b2AttackHeroes: config.b2AttackHeroes ?? 0,
    _b2AttackPeakRank: config.b2AttackPeakRank ?? 5,
    _b2AttackFinalRank: config.b2AttackFinalRank ?? 10,
    _b2AttackProgress: config.b2AttackProgress ?? { start: 0.4, end: 0.7 },
    _b2AttackResolveProgress: config.b2AttackResolveProgress ?? 0.85,
    // Release model: false = fixed-final (steer to finalRank, with margin); true = band-arrival (free on
    // band re-entry = the edge, no margin). Default false → current shipped behaviour.
    _b2AttackBandArrival: !!config.b2AttackBandArrival,
    // Universal band-arrival (V1 experiment): free B1-heroes + normal pack inside their assigned band.
    // B2-attackers are unaffected (own release). Default false → byte-identical.
    _universalBandArrival: !!config.universalBandArrival,
    _attackerParams: null, // Map index → {peakRank, finalRank}, populated by update() at cast time
  };
}

// ── createTrajectoryController ────────────────────────────────────────────────

/**
 * Create a stateful Trajectory Controller from a Race Plan.
 *
 * M2v2: bidirectional P-controller for ALL racers in OUTCOME phase.
 * Each racer is pushed toward their assigned targetRank.
 *
 * Usage:
 *   const ctrl = createTrajectoryController(plan);
 *   // Each physics step:
 *   //   Pass 1 (re-rolls): call ctrl.computePulkBiasedTarget() for pulk racers
 *   //   Controller-Pass:   call ctrl.update(racers, elapsedMs)
 *   //   Pass 2 (t-update): r.t += r.baseSpeed * boost * brake * r.trajectoryMult * r.areaBonusMult * dt
 *
 * @param {object} racePlan  output of createRacePlan
 * @returns {object} TrajectoryController
 */
export function createTrajectoryController(racePlan) {
  const plan = racePlan;
  const { gain, maxMult, minMult, bandStrictness } = plan.controllerParams;
  const { pulkStart, pulkEnd, transEnd, corrStart, corrEnd } = plan._phases;

  // Phase-boundary FRACTIONS [0,1] for the leader-progress phase clock.
  // Single-source: derived from the same absolute ms boundaries used by the elapsedMs path
  // (no second copy of pulkStart/corridorStart) — keeps both clocks in lock-step, including
  // any postStartHold offset baked into pulkStart.
  const _dur = plan._targetDurationMs > 0 ? plan._targetDurationMs : 1;
  const pulkStartFrac = pulkStart / _dur;
  const pulkEndFrac = pulkEnd / _dur;
  const transEndFrac = transEnd / _dur;
  const corrStartFrac = corrStart / _dur;
  const corrEndFrac = corrEnd / _dur;

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
  // Pack-release hysteresis state + diagnostics (closure-scoped ⇒ resets per race automatically,
  // since createTrajectoryController runs once per race). Keyed by r.index — survives the spread-copy
  // that would break an object-identity compare. Absent the flag these stay untouched (feature OFF).
  const _packReleased = new Map(); // index → boolean: currently in the released (strictness 0) state
  let _packReleaseEvents = 0; // count of steering→released transitions (a racer arrived in-band)
  let _packReSteerEvents = 0; // count of released→steering transitions (a racer drifted out)
  let _packReleasedFrames = 0; // pack-racer-frames spent released (strictness 0)
  let _packSteerFrames = 0; // pack-racer-frames spent re-steering under the feature (strictness 1)
  // B2-attacker "Attack & Fall" state (closure-scoped ⇒ per-race). _attackerMinRank tracks the best
  // (lowest) live rank each attacker has REACHED (peak-tracking); _attackerFreed latches once it has
  // climbed to its peak AND been steered down to its finalRank in-band (then it joins the pack-release
  // hysteresis via _packReleased). _attackerFreeEvents counts freeings (diagnostic).
  const _attackerMinRank = new Map(); // index → best (lowest) live rank reached so far
  const _attackerFreed = new Map(); // index → boolean: has completed climb+orchestrated-fall → free
  let _attackerFreeEvents = 0;
  // Wall-clock ms at which the areaBonus fade actually began (set on first trigger).
  // Closure-scoped per race (createTrajectoryController runs once per race), so it resets
  // automatically — no manual reset needed. Anchors the real-time fade ramp at the trigger
  // moment instead of the absolute transEnd ms boundary (the two diverge once the phase clock
  // runs on leader-progress rather than wall-time).
  let _fadeStartMs = null;

  // Phase clock: when phaseProgress (leader-progress fraction [0,1]) is supplied, phase
  // selection runs on the fraction boundaries; when null, the legacy elapsedMs ms-boundary
  // path is used unchanged (open stays bit-identical).
  function getPhase(elapsedMs, phaseProgress = null) {
    if (phaseProgress != null) {
      if (phaseProgress < pulkStartFrac) return 'PRE_PULK';
      if (phaseProgress < pulkEndFrac) return 'PULK';
      if (phaseProgress < corrStartFrac) return 'TRANSITION';
      if (phaseProgress < corrEndFrac) return 'OUTCOME';
      return 'FINAL';
    }
    if (elapsedMs < pulkStart) return 'PRE_PULK';
    if (elapsedMs < pulkEnd) return 'PULK';
    if (elapsedMs < corrStart) return 'TRANSITION';
    if (elapsedMs < corrEnd) return 'OUTCOME';
    return 'FINAL';
  }

  /**
   * Controller-Pass: sets r.trajectoryMult on every racer.
   * In OUTCOME phase every racer gets a bidirectional correction toward their targetRank.
   *
   * @param {Array}  racers        live racer objects (must have .index, .t, .finished, .avoidanceActive)
   * @param {number} elapsedMs     physicsTs in ms from race start (real-time easing/fade duration)
   * @param {number} [phaseProgress] leader-progress fraction [0,1]; when set, drives phase selection
   *                                  and the area-bonus fade trigger. null = legacy elapsedMs path.
   */
  function _setTarget(r, newTarget, elapsedMs) {
    if (Math.abs(newTarget - (r.trajectoryMultTarget ?? 1.0)) > 0.001) {
      r.trajectoryMultPrev = r.trajectoryMult ?? 1.0;
      r.trajectoryMultTarget = newTarget;
      r.trajectoryMultTransStart = elapsedMs;
    }
  }

  function update(racers, elapsedMs, phaseProgress = null) {
    const _preOutcome = getPhase(elapsedMs, phaseProgress) !== 'OUTCOME';
    // ── areaBonusMult ──────────────────────────────────────────────────────────
    // choreo (Stage 1, C-2): the areaBonus ends WITH the CHAOS phase — full during chaos, INSTANT ZERO
    // from the chaos boundary (pulkStart) onward, for EVERY racer (pack and heroes alike, so the
    // measured headwind asymmetry disappears). The boundary is READ from the phase structure
    // (pulkStartFrac), never a literal (A4). No fade past it (C-2). Under choreo `bonusFadeDuration`
    // becomes functionless; `transitionEnd` keeps its corridorStart-fallback role (:156) — neither is
    // deleted (C-3). choreo-OFF falls through to the shipped transEnd fade below → byte-identical.
    if (plan._choreoEnabled) {
      const inChaos = phaseProgress != null ? phaseProgress < pulkStartFrac : elapsedMs < pulkStart;
      for (const r of racers) {
        if (!inChaos) {
          r.areaBonusMult = 1.0;
          continue;
        } // instant cut at the chaos boundary
        let b = plan._racerAreaBonus.get(r.index) ?? 1.0;
        // Spoiler switch (default OFF): suppress the B1-target pool's CHAOS bonus so the future top-5
        // are not pulled forward before the race opens (owner). A bonus switch, NOT a depth tool.
        if (
          plan._choreoSuppressChaosBonusB1 &&
          (plan._racerTargetRank.get(r.index) ?? Infinity) <= BAND_EDGES[0]
        )
          b = 1.0;
        r.areaBonusMult = b;
      }
    } else {
      // ── choreo-OFF: areaBonusMult full until transEnd (bonusTransitionEnd), then easeInOutCubic fade ──
      // Fade TRIGGER runs on the phase clock (phaseProgress when supplied, else elapsedMs).
      // Fade DURATION stays on absolute elapsedMs — the 1.5 s easeInOutCubic ramp is real-time.
      const fadeNotStarted =
        phaseProgress != null ? phaseProgress < transEndFrac : elapsedMs < transEnd;
      if (fadeNotStarted) {
        for (const r of racers) {
          r.areaBonusMult = plan._racerAreaBonus.get(r.index) ?? 1.0;
        }
      } else {
        // Anchor the real-time fade ramp at the moment the trigger fired so elapsedFade starts at 0.
        //  • Legacy (null) path: the clock IS elapsedMs and the trigger boundary is exactly transEnd,
        //    so anchor there → bit-identical to the original behaviour (elapsedFade >= 0 always here).
        //  • Progress path: the trigger boundary in ms is not known ahead of time (it depends on when
        //    leader-progress crosses transEndFrac), so capture elapsedMs on the first triggered step.
        let fadeAnchorMs;
        if (phaseProgress != null) {
          if (_fadeStartMs === null) _fadeStartMs = elapsedMs;
          fadeAnchorMs = _fadeStartMs;
        } else {
          fadeAnchorMs = transEnd;
        }
        const elapsedFade = elapsedMs - fadeAnchorMs;
        // Math.max(0, …): lower-clamp safety net — guarantees the cubic ease never sees a negative
        // argument (which previously blew areaBonusMult up to 5–556× / negative). Upper Math.min(1.0).
        const easedProgress = easeInOutCubic(
          Math.max(0, Math.min(1.0, elapsedFade / plan._areaBonusFadeDuration))
        );
        for (const r of racers) {
          const origBonus = plan._racerAreaBonus.get(r.index) ?? 1.0;
          r.areaBonusMult = origBonus + (1.0 - origBonus) * easedProgress;
        }
      }
    }

    // ── areaBonus phase-split rescale (INFRA 5A: shared source — browser + sim inherit HERE) ────
    // Rescale the raw areaBonusMult set above to a phase-dependent STRENGTH: EARLY (chaos) / PULK /
    // POST. Formerly duplicated — the browser rescaled in index.jsx after update(), the sim only
    // under --areaBonus* flags; that made a flagless sim apply +6% where the browser applied +3%.
    // scale = phaseStrength / refStrength (the band delta is linear in strength, so this reproduces
    // the intended per-phase bonus). Boundaries read the LIVE plan fractions (pulkStartFrac /
    // pulkEndFrac), never a literal, mirroring the phase clock — so the split follows the PULK phase
    // if the owner moves it. The scale commutes with the transEnd fade above (both linear in
    // areaBonusMult−1), so composing them preserves the fade shape. phaseSplitBonusEnabled false →
    // skipped → areaBonusMult stays the raw value → byte-identical to the pre-split behaviour.
    if (plan._phaseSplitBonusEnabled) {
      const inChaos = phaseProgress != null ? phaseProgress < pulkStartFrac : elapsedMs < pulkStart;
      const inPulk = phaseProgress != null ? phaseProgress < pulkEndFrac : elapsedMs < pulkEnd;
      const phaseStrength = inChaos
        ? plan._areaBonusEarly
        : inPulk
          ? plan._areaBonusPulk
          : plan._areaBonusPost;
      const scale = plan._areaRefStrength > 0 ? phaseStrength / plan._areaRefStrength : 0;
      for (const r of racers) r.areaBonusMult = 1 + (r.areaBonusMult - 1) * scale;
    }

    // ── trajectoryMult P-controller ───────────────────────────────────────────
    // Pre-OUTCOME: no rank steering — every racer's trajectoryMult target is pinned to 1.0, EXCEPT
    // (choreo) the generated HEROES, which the controller tracks along their authored curves from the
    // choreo start (pulkStart). The correction MATH is unchanged; heroes change WHICH target they
    // steer toward, and the PACK runs at a looser bandStrictness. choreo-off → identical early-return.
    const choreoActive =
      plan._choreoEnabled && phaseProgress != null && phaseProgress >= pulkStartFrac;
    if (_preOutcome && !choreoActive) {
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

    // choreo: run the GENERATOR once, one frame after the choreo boundary (so each racer's rank-velocity
    // is available for the jerk-matched anchors). It casts 2–4 heroes with anchored curves; tag them
    // (isHeroChoreographed → director exclusion + lateral pass-priority). Deterministic per seed.
    if (choreoActive && !plan._choreoGenerated) {
      if (plan._choreoPrevRanks && phaseProgress > plan._choreoPrevProgress) {
        const dpr = phaseProgress - plan._choreoPrevProgress;
        const postChaos = active.map((r, i) => ({
          index: r.index,
          rank: i + 1,
          t: r.t,
          vel: plan._choreoPrevRanks.has(r.index)
            ? (i + 1 - plan._choreoPrevRanks.get(r.index)) / dpr
            : 0,
        }));
        const gen = generateHeroCurves({
          seed: plan.seed,
          postChaos,
          finalRanks: plan._racerTargetRank,
          intensity: plan._choreoIntensity,
          finishT: plan._finishT,
          // DevScreen-tuned per-band resolve + release override the generator defaults (single source
          // for the tunable values is the dynamics config, threaded through the plan). anchorProgress is
          // the LIVE resolved pulkStart fraction (the director-anchor = PULK begin): moving PULK begin
          // moves the hero curve anchor with it, with no second copy of the value.
          config: {
            ...GENERATOR_CONFIG,
            anchorProgress: pulkStartFrac,
            releaseProgress: plan._choreoReleaseProgress,
            bandResolve: plan._choreoBandResolve,
            // B2-attacker "Attack & Fall" params (default OFF: b2AttackHeroes 0 → no attackers → byte-identical).
            b2AttackHeroes: plan._b2AttackHeroes,
            b2AttackPeakRank: plan._b2AttackPeakRank,
            b2AttackFinalRank: plan._b2AttackFinalRank,
            b2AttackProgress: plan._b2AttackProgress,
            b2AttackResolveProgress: plan._b2AttackResolveProgress,
          },
        });
        plan._heroCurves = new Map(gen.curves.map((c) => [c.index, c.curve]));
        // B2-attacker runtime params (peakRank + finalRank), for the servo's Track-to-FinalRank-then-Free
        // logic. Only attacker-b2 curves carry them; empty map when the feature is OFF.
        plan._attackerParams = new Map(
          gen.curves
            .filter((c) => c.role === 'attacker-b2')
            .map((c) => [c.index, { peakRank: c.peakRank, finalRank: c.finalRank }])
        );
        // Retain the authored ROLE (sovereign-lead / comebacker / faller) the generator already
        // produced — ONE source, populated here beside _heroCurves. Diagnostics-only (GovernorDiagHUD);
        // never recomputed, never read by physics.
        plan._heroRoles = new Map(gen.curves.map((c) => [c.index, c.role]));
        // B4a foresight pipeline: retain the FULL authored cameraPlan (all heroes + roles + beat timing)
        // the generator already emits — ONE source, populated here beside _heroCurves/_heroRoles, never
        // recomputed, never read by physics. Delivered to the CameraDirector (setCameraPlan) but currently
        // UNCONSUMED — kept as the prerequisite channel for the planned B4b faller shot, because b1Indices
        // (targetRank ≤ 5) structurally cannot carry a faller (targetRank > 5).
        plan._cameraPlan = gen.cameraPlan ?? null;
        for (const r of racers) {
          r.isHeroChoreographed = plan._heroCurves.has(r.index);
          // Diagnostics-only tag for the eye-test hero-highlight (render-time). Read-only; never read by
          // physics. False for everyone when no attackers are cast → byte-identical.
          r.isAttackerB2 = plan._attackerParams ? plan._attackerParams.has(r.index) : false;
        }
        plan._choreoGenerated = true;
      } else {
        plan._choreoPrevRanks = new Map(active.map((r, i) => [r.index, i + 1]));
        plan._choreoPrevProgress = phaseProgress;
      }
    }
    // Stage 1 (C-2): under choreo the areaBonus is already zero for EVERY racer from the chaos boundary
    // (set in the areaBonus block above), so the old per-hero neutralize here is now redundant — the
    // whole-field cut subsumes it. heroCurves only exist post-pulkStart, i.e. after the cut.
    const heroCurves = plan._heroCurves;

    const NOISE_THRESH = plan._stochasticNoise;
    const tm = (r) => r.trajectoryMult ?? 1.0;

    for (let rankIdx = 0; rankIdx < nActive; rankIdx++) {
      const r = active[rankIdx];
      const currentRank = rankIdx + 1; // 1-indexed, 1 = leading
      const heroCurve = heroCurves && r.isHeroChoreographed ? heroCurves.get(r.index) : null;
      const isHero = !!heroCurve;
      // Pre-OUTCOME: only heroes steer (toward their curves); the pack stays pinned to 1.0 exactly as
      // before. In OUTCOME every racer steers (heroes toward their curves).
      if (_preOutcome && !isHero) {
        _setTarget(r, 1.0, elapsedMs);
        continue;
      }
      // Step 4 — FRONT CONTEST RELEASE (A1/A2): past the release progress, B1 heroes STOP being
      // steered (target = currentRank ⇒ rankError 0 ⇒ servo 1.0 ⇒ natural speed, slew-smoothed), so
      // the finish among them is a genuine run-out. They are already bunched in their B1 cluster, so
      // reordering within it stays in band. Non-B1 heroes + the pack keep steering (curve / constant).
      const released =
        isHero &&
        phaseProgress >= plan._choreoReleaseProgress &&
        (plan._racerTargetRank.get(r.index) ?? nActive) <= BAND_EDGES[0];
      // choreo heroes: time-varying target rank from their own curve; the pack: the constant Fisher-Yates
      // target (unchanged endpoint). The curve ends in the hero's assigned band.
      const targetRank = released
        ? currentRank
        : isHero
          ? sampleHeroCurve(heroCurve, phaseProgress)
          : (plan._racerTargetRank.get(r.index) ?? currentRank);
      // positive rankError = racer currently ranked worse than target → boost
      const rankError = currentRank - targetRank;
      // Band bounds computed once — used for both steering blend and corridor telemetry.
      const [areaLo, areaHi] = getAreaBounds(targetRank);
      // bandError: signed distance outside the target band (0 when already inside).
      const bandError =
        currentRank < areaLo
          ? currentRank - areaLo
          : currentRank > areaHi
            ? currentRank - areaHi
            : 0;
      // Heroes track their curve EXACTLY (strictness 1.0); the pack runs looser under choreo so heroes
      // can weave through. choreo-off → strictness == the shipped bandStrictness (1.0) → byte-identical.
      let strictness = isHero
        ? 1.0
        : plan._choreoEnabled
          ? plan._choreoPackBandStrictness
          : bandStrictness;
      // B2-attacker "Attack & Fall" (Track-to-FinalRank, then Free). While NOT yet freed the attacker
      // tracks its curve at strictness 1.0 — the mandatory climb to peakRank, then the orchestrated fall
      // that the curve steers down to finalRank. It FREES once it has (a) reached its peak (best live rank
      // ≤ peakRank) AND (b) been steered down to finalRank in-band; from then it joins the pack-release
      // spatial hysteresis (free inside band, re-steer > threshold ranks outside). Independent of
      // packReleaseEnabled (the attacker's own feature). No resolve-checkpoint constraint (hero-privilege).
      const atkParams =
        isHero && plan._attackerParams ? plan._attackerParams.get(r.index) : undefined;
      if (atkParams) {
        const mr = Math.min(_attackerMinRank.get(r.index) ?? Infinity, currentRank);
        _attackerMinRank.set(r.index, mr);
        let freed = _attackerFreed.get(r.index) ?? false;
        if (!freed) {
          // Orchestrated phase: strictness stays 1.0 (already set above) → tracks the curve target exactly.
          const peakReached = mr <= atkParams.peakRank;
          // Release condition. Fixed-final (default): steer all the way to finalRank (1+ rank INSIDE the
          // band, with margin) before freeing. Band-arrival (_b2AttackBandArrival): free the MOMENT the
          // racer re-enters its band on the way down (bandError 0 ⇒ the top edge, since it falls from the
          // peak above the band) — no margin. The diagnosis predicts band-arrival leaks more (edge release).
          if (
            peakReached &&
            bandError === 0 &&
            (plan._b2AttackBandArrival || currentRank >= atkParams.finalRank)
          ) {
            freed = true;
            _attackerFreed.set(r.index, true);
            _packReleased.set(r.index, true); // enter the free phase RELEASED (strictness 0)
            _attackerFreeEvents++;
          }
        }
        if (freed) {
          let released = _packReleased.get(r.index) ?? true;
          if (!released && bandError === 0) {
            released = true;
            _packReleaseEvents++;
          } else if (released && Math.abs(bandError) > plan._packReSteerThreshold) {
            released = false;
            _packReSteerEvents++;
          }
          _packReleased.set(r.index, released);
          strictness = released ? 0 : 1;
          if (released) _packReleasedFrames++;
          else _packSteerFrames++;
        }
        // not-yet-freed → strictness remains 1.0 (curve tracking); nothing else to do.
      } else if (plan._universalBandArrival) {
        // Universal band-arrival (V1 experiment): B1-heroes AND normal pack racers run FREE (strictness 0)
        // once inside their FIXED assigned band, and are re-steered (strictness 1) the moment they leave it.
        // The band comes from the racer's ASSIGNED target rank (getAreaBounds of _racerTargetRank), NOT the
        // moving hero-curve target — so a climbing hero counts as "arrived" only when it truly reaches its
        // band. B2-attackers keep their own release (atkParams branch above). OFF → skipped → byte-identical.
        const assignedRank = plan._racerTargetRank.get(r.index) ?? currentRank;
        const [aLo, aHi] = getAreaBounds(assignedRank);
        strictness = currentRank >= aLo && currentRank <= aHi ? 0 : 1.0;
      } else if (plan._packReleaseEnabled && !isHero) {
        // Pack-only strictness release (spatial hysteresis, flag-gated; heroes excluded). Inside the band
        // (bandError == 0) the pack racer releases → strictness 0 → error collapses to bandError (0), so it
        // runs at natural speed and reorders freely. Once it drifts MORE than _packReSteerThreshold ranks
        // past the band edge it snaps to full pinning (strictness 1) and is dragged back; it only releases
        // again after returning fully inside (bandError == 0). The release↔re-steer gap is the sole anti-
        // flicker guard — there is no time cooldown. Only reachable in OUTCOME for the pack (pre-OUTCOME
        // non-heroes early-return above), so the release is naturally confined to the OUTCOME phase.
        let released = _packReleased.get(r.index) ?? false;
        if (!released && bandError === 0) {
          released = true;
          _packReleaseEvents++;
        } else if (released && Math.abs(bandError) > plan._packReSteerThreshold) {
          released = false;
          _packReSteerEvents++;
        }
        _packReleased.set(r.index, released);
        strictness = released ? 0 : 1;
        if (released) _packReleasedFrames++;
        else _packSteerFrames++;
      }
      // Blended error: strictness=1.0 ≡ rankError (exact); <1.0 steers toward the band edge (loose pack).
      const error = strictness * rankError + (1 - strictness) * bandError;
      const noise = (rng() - 0.5) * 2 * plan._stochasticNoise;
      const rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult);
      _setTarget(r, rawTarget, elapsedMs);

      // Telemetry stays on rankError — measures exact-rank deviation, not blended error.
      _racerStepCount++;
      _corridorViolationSum += Math.abs(rankError);
      if (Math.abs(rankError) > _corridorViolationMax) _corridorViolationMax = Math.abs(rankError);

      if (currentRank >= areaLo && currentRank <= areaHi) _racersInCorridorCount++;

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
   * @param {number} [phaseProgress] leader-progress fraction [0,1]; null = legacy elapsedMs path
   * @returns {number}  biased pre-clamp value; caller applies final clamp
   */
  function computePulkBiasedTarget(
    racerIndex,
    rawSample,
    spreadMin,
    spreadMax,
    racers,
    elapsedMs,
    phaseProgress = null
  ) {
    if (getPhase(elapsedMs, phaseProgress) !== 'PULK') return rawSample;

    const thisRacer = racers.find((r) => r.index === racerIndex);
    if (!thisRacer || thisRacer.finished) return rawSample;

    // ── Shipped 3-racer PULK bias (the always-on field-cohesion path) ──────────────────────────
    if (!plan.pulkRacerIds.includes(racerIndex)) return rawSample;

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
    // B2-attacker per-race aggregates: how many were cast, and how many actually reached their peak rank
    // (casting-yield + peak-reached diagnostics — a null action result is ambiguous without them).
    const _atkCast = plan._attackerParams ? plan._attackerParams.size : 0;
    let _atkPeak = 0;
    if (plan._attackerParams) {
      for (const [idx, prm] of plan._attackerParams) {
        if ((_attackerMinRank.get(idx) ?? Infinity) <= prm.peakRank) _atkPeak++;
      }
    }
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
      // Pack-release diagnostics (0 when the feature is OFF — no transitions ever fire).
      packReleaseEvents: _packReleaseEvents,
      packReSteerEvents: _packReSteerEvents,
      packReleasedFrameFraction:
        _packReleasedFrames + _packSteerFrames > 0
          ? _packReleasedFrames / (_packReleasedFrames + _packSteerFrames)
          : 0,
      // B2-attacker diagnostics (0 when OFF): cast count, how many reached peak, how many completed the
      // climb+fall and freed (= reached finalRank in-band). yield=cast/target, peak-rate=peak/cast.
      attackerCast: _atkCast,
      attackerPeakReached: _atkPeak,
      attackerFreed: _attackerFreeEvents,
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
    _packReleaseEvents = 0;
    _packReSteerEvents = 0;
    _packReleasedFrames = 0;
    _packSteerFrames = 0;
    _packReleased.clear();
    _attackerMinRank.clear();
    _attackerFreed.clear();
    _attackerFreeEvents = 0;
    return tel;
  }

  // Live phase-boundary fractions [0,1], single-sourced from the same _phases the phase
  // clock uses (no second copy). Consumed by the pre-OUTCOME governor (raceGovernor.js) so
  // its fade binds to the CURRENT boundaries — moves automatically when the owner edits them.
  function getPhaseFractions() {
    return { pulkStartFrac, pulkEndFrac, transEndFrac, corrStartFrac, corrEndFrac };
  }

  return {
    update,
    computePulkBiasedTarget,
    getPhase,
    getPhaseFractions,
    // Diagnostics-only: the retained index→role map (null until heroes are cast). Read by GovernorDiagHUD.
    getHeroRoles: () => plan._heroRoles ?? null,
    // B4a: the full authored cameraPlan (null until heroes are cast). Delivered to the CameraDirector.
    getCameraPlan: () => plan._cameraPlan ?? null,
    collectTelemetry,
    seed: plan.seed,
  };
}
