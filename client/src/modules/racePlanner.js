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

// ── Rank-Proto (experimental, default OFF): SHOW-target generator ─────────────
// The ONLY new piece for the rank/show-target controller mode. Before corridorStart the OUTCOME
// P-controller is aimed at a rank-blind, seed-driven, WANDERING show-rank instead of being pinned
// to trajectoryMult 1.0 — reusing the SAME gain/clamp/error (no new speed authority). NEVER derived
// from targetRank: a rotating seed window of `frontBand` racers takes the front show-ranks and the
// rest follow in current t-rank order, so featured racers are pulled forward (charge to the front)
// and the incumbents are displaced back (braked) — a two-sided front contest expressed as a target.
const SHOW_SEED_XOR = 0x9e3779b1; // dedicated stream (distinct from GOVERNOR/DIRECTOR salts)
// FIXED show-target shape (no longer on the action slider — Stufe 2/2b proved the shape levers have
// low leverage). frontConcentration=3 gives a tight front cluster so the (closed-track) front actually
// contests when engaged (Stufe-2b: best closed leadΔ + B3). The ACTION slider is now ENGAGEMENT (2c).
const DEFAULT_SHOW_FRONT_BAND = 8; // racers drawn into the front contest (pool size)
const DEFAULT_SHOW_WANDER_DWELL = 0.06; // leader-progress per featured-window rotation
const DEFAULT_SHOW_FRONT_CONCENTRATION = 3; // distinct front show-ranks the featured target (tight cluster)
const DEFAULT_SHOW_ENGAGEMENT = 1.0; // how strongly the pre-OUTCOME controller steers toward the show-target

// ── Action-scalar coupling (Stufe 2c): ONE action∈[0,1] = ENGAGEMENT (calm→wild) ─────────────
// The ONLY action-driven quantity is ENGAGEMENT: how strongly the pre-OUTCOME controller steers
// toward the show-target. action 0 → engagement 0 (controller neutral pre-OUTCOME = calm baseline);
// action 1 → engagement 1 (full Stufe-1 show-target = wild, ~2× overtaking). The blend is applied in
// update() (target = 1 + engagement·(showTarget − 1)), so front-action rises MONOTONICALLY from
// baseline to full by construction. The show-target SHAPE (band/dwell/concentration) stays FIXED —
// engagement, not shape, is the lever. Speed authority (minMult/maxMult/gain) is NEVER on the slider.
export function actionToShowLevers(action) {
  return { showEngagement: Math.max(0, Math.min(1, action)) };
}

// Rank-blind per-racer key in [0,1) for the show-window shuffle (index+seed only, never targetRank).
function showStreamKey(index, seed) {
  const streamSeed = ((((seed >>> 0) ^ SHOW_SEED_XOR) >>> 0) + (index >>> 0)) >>> 0;
  return mulberry32(streamSeed)();
}

/**
 * Show-rank per active racer (Map index→rank, 1=front). Rank-blind + seed-driven + wandering.
 * @param {Array} active   non-finished racers, SORTED by t descending (current-rank order)
 * @param {number} seed
 * @param {number} progress leader-progress fraction [0,1]
 * @param {number} frontBand featured window size (racers drawn into the front contest)
 * @param {number} wanderDwell progress per rotation (>0)
 * @param {number} [frontConcentration] distinct front show-ranks the featured cast targets — the
 *   Stufe-2b intensity lever. `band` (default) → featured spread across 1..band (legacy, byte-identical);
 *   `1` → ALL featured target rank 1 (a direct fight for the lead). Non-featured always follow behind.
 * @returns {Map<number, number>} racerIndex → show-rank
 */
export function computeShowRanks(
  active,
  seed,
  progress,
  frontBand,
  wanderDwell,
  frontConcentration
) {
  const out = new Map();
  const n = active.length;
  if (n === 0) return out;
  const band = Math.min(Math.max(1, frontBand), n);
  const conc = Math.min(Math.max(1, frontConcentration ?? band), band); // default = band → legacy spread
  // Stable seed-shuffled order of the field (rank-blind permutation).
  const order = active
    .map((r) => ({ idx: r.index, key: showStreamKey(r.index, seed) }))
    .sort((a, b) => (a.key !== b.key ? a.key - b.key : a.idx - b.idx));
  // Rotating featured window of `band` racers in that shuffled order.
  const slot = wanderDwell > 0 ? Math.floor(progress / wanderDwell) : 0;
  const start = (((slot * band) % n) + n) % n;
  const featured = new Set();
  for (let j = 0; j < band; j++) featured.add(order[(start + j) % n].idx);
  // Featured → a tight FRONT cluster: show-ranks cycle through 1..conc (conc<band → several racers
  // share the very-front ranks → they compete for the lead). conc=band ⇒ 1..band (legacy spread).
  // Non-featured always follow behind the pool (band+1..N, current t-rank order) so the incumbent
  // leader, when unfeatured, is displaced back (braked) — the two-sided contest is preserved.
  let j = 0;
  for (const o of order) if (featured.has(o.idx)) out.set(o.idx, 1 + (j++ % conc));
  let rank = band + 1;
  for (const r of active) if (!featured.has(r.index)) out.set(r.index, rank++);
  return out;
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

const DEFAULT_PHASE_FRACTIONS = {
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
  if (config.bonusTransitionEnd !== undefined)
    phaseFractions.transitionEnd = config.bonusTransitionEnd;
  if (config.corridorStart !== undefined) phaseFractions.corridorStart = config.corridorStart;
  if (config.corridorEnd !== undefined) phaseFractions.corridorEnd = config.corridorEnd;

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

  // PULK-surge config (default ON — the cohesion PULK bias below is the toggle-off fallback).
  // Last-resort ?? fallbacks mirror DEFAULT_RACE_DYNAMICS_CONFIG (defaults.js) exactly.
  const pulkSurgeEnabled = config.pulkSurgeEnabled ?? false;
  const pulkSurgeFraction = config.pulkSurgeFraction ?? 0.2;
  const pulkSurgeBonus = config.pulkSurgeBonus ?? 0.1;
  const pulkSurgeRampInMs = config.pulkSurgeRampInMs ?? 1200;
  const pulkSurgeRampOutMs = config.pulkSurgeRampOutMs ?? 1200;
  const pulkBrakeExemptStrength = config.pulkBrakeExemptStrength ?? 0.5;

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

  // PULK-surge selection (only when enabled). Cohesion selection above is UNCHANGED — it is
  // the fallback. Surge uses a SEPARATE, dedicated RNG stream seeded from racePlanSeed XORed
  // with a fixed constant that is distinct from BOTH the target-rank shuffle stream (seed) and
  // the controller-noise stream (seed + 0x9e3779b9), so surge membership cannot correlate with
  // the target-rank assignment. Eligibility EXCLUDES target ranks 1–3 (winner + podium): those
  // racers are already at their target rank, so the controller does not reel them back — surging
  // them yields a runaway, not the surge-then-caught drama. Only racers that WILL be reeled back
  // (target rank ≥ 4) are eligible; the RNG pick among them is unchanged (still rank-decoupled).
  let surgeRacerIds;
  if (pulkSurgeEnabled) {
    // seed>0: dedicated stream decoupled from the target-rank shuffle (mulberry32(seed)) for
    // reproducible sim runs. seed===0 (browser live default): intentionally Math.random =
    // fresh random surge selection each race; selection is index-based so it stays start-row
    // independent regardless of RNG source (fairness is unaffected — surge never touches target rank).
    const surgeRng = seed > 0 ? mulberry32((seed ^ 0x5bf03635) >>> 0) : Math.random;
    // Deterministic pre-filter: only racers with target rank ≥ 4 are eligible (excludes the
    // winner + podium, ranks 1–3, which the controller does not reel back). Uses the already-
    // computed racerTargetRank map — no rank recomputation. Small fields where the eligible pool
    // is smaller than surgeCount (or empty, e.g. ≤3 racers) simply surge whoever is eligible.
    const surgePool = racers
      .map((r) => r.index)
      .filter((idx) => (racerTargetRank.get(idx) ?? 4) > 3);
    for (let i = surgePool.length - 1; i > 0; i--) {
      const j = Math.floor(surgeRng() * (i + 1));
      [surgePool[i], surgePool[j]] = [surgePool[j], surgePool[i]];
    }
    const surgeCount = Math.ceil(pulkSurgeFraction * n);
    surgeRacerIds = new Set(surgePool.slice(0, surgeCount));
  }

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
    surgeRacerIds,
    _pulkSurgeEnabled: pulkSurgeEnabled,
    _pulkSurgeFraction: pulkSurgeFraction,
    _pulkSurgeBonus: pulkSurgeBonus,
    _pulkSurgeRampInMs: pulkSurgeRampInMs,
    _pulkSurgeRampOutMs: pulkSurgeRampOutMs,
    _pulkBrakeExemptStrength: pulkBrakeExemptStrength,
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
    // Rank-Proto (experimental, default OFF): show-target controller mode + its show params.
    _showTargetMode: config.showTargetMode ?? false,
    _showFrontBand: config.showFrontBand ?? DEFAULT_SHOW_FRONT_BAND,
    _showWanderDwell: config.showWanderDwell ?? DEFAULT_SHOW_WANDER_DWELL,
    _showFrontConcentration: config.showFrontConcentration ?? DEFAULT_SHOW_FRONT_CONCENTRATION,
    _showEngagement: config.showEngagement ?? DEFAULT_SHOW_ENGAGEMENT,
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
  // PULK-surge telemetry (PART H): steps where a surger is actively surging, and the summed
  // absolute applied delta |pulkSurgeMult - 1| over those steps.
  let _surgeStepCount = 0;
  let _surgeAppliedDeltaSum = 0;
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
    // Rank-Proto: PHASE-DECOUPLE areaBonus in show-target mode — 0-effect (1.0) before corridorStart,
    // full from corridorStart on. Removes the targetRank-coupled early-front correlation leak without
    // a new constant (reuses the existing corridorStart gate). Default OFF → existing behaviour.
    if (plan._showTargetMode && _preOutcome) {
      for (const r of racers) r.areaBonusMult = 1.0;
    } else {
      // ── areaBonusMult: full until transEnd (bonusTransitionEnd), then easeInOutCubic fade ──
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
    } // end show-target areaBonus decouple guard

    // ── PULK-surge pass (PART D) ────────────────────────────────────────────────
    // Surge is the default PULK mechanic. When it is toggled OFF (DevScreen) every racer's
    // pulkSurgeMult stays pinned at 1.0 and the cohesion PULK bias (computePulkBiasedTarget) owns
    // PULK unchanged — that path is the fallback.
    // When enabled (default), surgers get +pulkSurgeBonus during the PULK phase: ramp-in on entering PULK,
    // ramp-out on leaving. Eased with the SAME easeInOutCubic Prev/Target/TransStart structure as
    // trajectoryMult; the ramp duration differs (in vs out) so it is stored per-racer.
    if (plan._pulkSurgeEnabled) {
      const inPulk = getPhase(elapsedMs, phaseProgress) === 'PULK';
      for (const r of racers) {
        const isSurger = plan.surgeRacerIds ? plan.surgeRacerIds.has(r.index) : false;
        const surging = isSurger && inPulk && !r.finished;
        const newTarget = surging ? 1.0 + plan._pulkSurgeBonus : 1.0;
        const rampMs = surging ? plan._pulkSurgeRampInMs : plan._pulkSurgeRampOutMs;
        if (Math.abs(newTarget - (r.pulkSurgeMultTarget ?? 1.0)) > 0.001) {
          r.pulkSurgeMultPrev = r.pulkSurgeMult ?? 1.0;
          r.pulkSurgeMultTarget = newTarget;
          r.pulkSurgeMultTransStart = elapsedMs;
          r._pulkSurgeTransDur = rampMs;
        }
        const dur = r._pulkSurgeTransDur ?? 1;
        const elapsedSurge = elapsedMs - (r.pulkSurgeMultTransStart ?? 0);
        r.pulkSurgeMult =
          elapsedSurge < dur
            ? (r.pulkSurgeMultPrev ?? 1.0) +
              ((r.pulkSurgeMultTarget ?? 1.0) - (r.pulkSurgeMultPrev ?? 1.0)) *
                easeInOutCubic(elapsedSurge / dur)
            : (r.pulkSurgeMultTarget ?? 1.0);
        if (surging) {
          _surgeStepCount++;
          _surgeAppliedDeltaSum += Math.abs(r.pulkSurgeMult - 1);
        }
      }
    } else {
      for (const r of racers) r.pulkSurgeMult = 1.0;
    }

    // ── trajectoryMult P-controller ───────────────────────────────────────────
    if (_preOutcome) {
      if (!plan._showTargetMode) {
        for (const r of racers) _setTarget(r, 1.0, elapsedMs);
        return;
      }
      // Rank-Proto SHOW-TARGET: reuse the SAME P-controller (gain/clamp/error/noise) aimed at a
      // rank-blind wandering show-rank instead of pinning to 1.0. No new speed authority. The
      // OUTCOME branch below (true targetRank) is UNCHANGED and takes over at corridorStart.
      const activeShow = racers
        .filter((r) => !r.finished)
        .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));
      for (const r of racers) if (r.finished) _setTarget(r, 1.0, elapsedMs);
      const nShow = activeShow.length;
      if (nShow === 0) return;
      const showRanks = computeShowRanks(
        activeShow,
        plan.seed,
        phaseProgress ?? 0,
        plan._showFrontBand,
        plan._showWanderDwell,
        plan._showFrontConcentration
      );
      // ENGAGEMENT blend (Stufe 2c): scale the show-target steering from neutral (0) to full (1) so
      // the action slider raises front-action MONOTONICALLY from baseline to full. engagement 0 →
      // every target = 1.0 (controller neutral pre-OUTCOME = calm baseline); 1 → full show-rank steer.
      const engagement = plan._showEngagement;
      for (let i = 0; i < nShow; i++) {
        const r = activeShow[i];
        const currentRank = i + 1;
        const showRank = showRanks.get(r.index) ?? currentRank;
        const error = currentRank - showRank; // positive → ranked worse than show-target → boost
        const noise = (rng() - 0.5) * 2 * plan._stochasticNoise;
        const rawTarget = clamp(1.0 + gain * (error / nShow) + noise, minMult, maxMult);
        // Blend toward neutral (1.0) by (1 − engagement). Authority (the clamp) is unchanged; only the
        // fraction of it applied pre-OUTCOME scales with the slider. engagement=1 ⇒ rawTarget (full).
        const blendedTarget = 1.0 + engagement * (rawTarget - 1.0);
        _setTarget(r, blendedTarget, elapsedMs);
      }
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
      const targetRank = plan._racerTargetRank.get(r.index) ?? currentRank;

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
      // Blended error: bandStrictness=1.0 ≡ rankError (no-op); =0.0 steers only to band edge.
      const error = bandStrictness * rankError + (1 - bandStrictness) * bandError;
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
      // PULK-surge (cohesion telemetry above is retained — cohesion still exists as the fallback).
      surgeEventCount: _surgeStepCount,
      surgeAppliedDeltaMean: _surgeStepCount > 0 ? _surgeAppliedDeltaSum / _surgeStepCount : 0,
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
    _surgeStepCount = 0;
    _surgeAppliedDeltaSum = 0;
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
    collectTelemetry,
    seed: plan.seed,
  };
}
