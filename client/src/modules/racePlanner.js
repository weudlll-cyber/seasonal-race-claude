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
import { arcT } from './raceLengths.js'; // shared lap-aware arc distance (gap-cap re-roll bias)
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js'; // single source for phase-boundary defaults (no raw drift)

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

// ── The race's physics RNG (parity step 1 — one shared entry point, both engines) ─────────────────
// ONE stream feeds, IN DRAW ORDER, every physics-random site: the start-row shuffle, each racer's
// initial spreadFactor + roll jitter, and every scheduled re-roll target + jitter. Threading this
// single stream explicitly through those sites (instead of monkey-patching the global `Math.random`
// for the whole race) is what keeps render-only draws — camera framing, trail/particle spawns — OFF
// the race stream: the seeded race is now independent of frame rate, camera state, and slow-mo, and
// the headless sim (no camera, no trails) draws the identical sequence. Because the algorithm and the
// `0x6d2b79f5` constant match the sim's former `makePRNG`, a given seed reproduces byte-for-byte.
//
// `seed <= 0` → the native generator (unseeded / exploration), exactly as the pre-swap legacy path.
// Returns a `{ physics }` bag (not a bare function) so a future named stream can be added without
// touching call sites. `physics` carries PRNG state — create it ONCE per race and reuse the instance.
export function makeRaceRng(seed) {
  return { physics: seed > 0 ? mulberry32(seed) : Math.random };
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

// THE default phase boundaries. pulkStart defines the CHAOS→PULK / director-anchor boundary; it is NOT a raw
// literal — it derives from the single source `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart` (the shipped
// default, 0.15) so it can never drift from the shipped world. The hero-curve generator's anchor default
// derives from this (heroCurveGenerator.js reads DEFAULT_PHASE_FRACTIONS.pulkStart), and the live per-race
// value is threaded into the generator from the resolved plan — so there is no second copy of the anchor value.
export const DEFAULT_PHASE_FRACTIONS = {
  pulkStart: DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart,
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

// EXPORTED since DIRECTION-AUTHORITY-1 (2026-09-12): `heroCurveGenerator.js` derives the hero
// feasibility model's DROP budget from `minMult` rather than carrying a second copy of it. The live
// per-race value is threaded into the generator config below; this export is what a direct or test
// call to the generator falls back to, so the fallback reads the one home instead of a literal.
export const DEFAULT_CONTROLLER_PARAMS = {
  gain: 2.0,
  maxMult: 1.1,
  minMult: 0.85,
  bandStrictness: 1.0,
};

const DEFAULT_PULK_TARGET_SPREAD = 0.005;
const DEFAULT_STOCHASTIC_NOISE = 0.0008;

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
  // (the DevScreen "PULK end / OUTCOME begins here" slider writes it). When it is set EQUAL to pulkStart
  // PULK is zero-width and this degenerates to the former collapse, byte-identical to the reactive
  // path's steer-from-the-chaos-boundary. (That was the state at the pre-COMBO15 defaults, where both
  // sides were 0.25; at today's shipped values PULK is a real window — the two numbers live in
  // defaults.js and are deliberately not repeated here.) Raising it widens [pulkStart, pulkEnd] and moves
  // OUTCOME with it. The clamp chain below keeps pulkStart <= pulkEnd <= corridorStart <= corridorEnd.
  // Single source: every downstream phase read (getPhase, the engine's + sim's areaBonus phase-split
  // via getPhaseFractions) inherits these fractions — no duplicated phase math. Choreography is
  // UNCONDITIONAL: PULK ends at choreoOutcomeStart and OUTCOME steers from there (one boundary).
  // Fallback tracks the resolved pulkStart (not a raw literal): when choreoOutcomeStart is absent, PULK
  // collapses to zero-width AT pulkStart, whatever the shipped default is — so nothing can drift from it.
  const choreoPulkEnd = config.choreoOutcomeStart ?? phaseFractions.pulkStart;
  phaseFractions.pulkEnd = choreoPulkEnd;
  phaseFractions.corridorStart = choreoPulkEnd;

  // Phase-boundary hardening (Stage A): keep the boundaries ordered the way the ordered
  // getPhase branches below assume — pulkStart <= pulkEnd <= corridorStart <= corridorEnd —
  // so no consumer sees an inverted TRANSITION or a negative span. A span that would be <= 0
  // degenerates cleanly to a zero-duration phase (never NaN, never inverted). Monotonic clamp
  // chain anchored on corridorEnd as the ceiling; it SUPERSEDES the former corridorStart <=
  // corridorEnd clamp (min against corridorEnd is preserved as the upper bound). No-op for
  // well-ordered configs — DEFAULT_PHASE_FRACTIONS above is already ordered, so the chain is a no-op
  // on it whatever those values are (they are not restated here; they moved once already). Single source: the
  // sim imports createRacePlan (sim-fairness.mjs:59), so browser and sim inherit this identically.
  // No hardcoded fractions — every bound reads the live resolved phaseFractions.
  const resolvedCorridorStart = phaseFractions.corridorStart ?? phaseFractions.transitionEnd;
  // pulkStart is now ownable (DevScreen "PULK begins here"); anchor it to [0, corridorEnd] first so the
  // monotonic chain below can never produce an inverted PULK. No-op at the shipped pulkStart.
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

  // Absolute phase boundaries in ms.
  //
  // POST-START-HOLD-UNIFY: this used to read `config.postStartHoldMs` and take
  // `Math.max(postStartHoldMs, …)` as a floor on pulkStart. It is gone, and the reason it can go
  // without moving the race is that IT NEVER RAN: no caller of `createRacePlan` anywhere in the
  // repository passes that key — not `raceCore.js`, not `sim-fairness.mjs`, not `goldenRunner.mjs`,
  // not either diag harness — so `?? 0` always resolved to 0 and `Math.max(0, x)` is `x` for every
  // x this expression can produce. The removal is byte-identical by construction, and the world
  // fingerprint was re-measured to say so rather than to be reasoned about.
  //
  // WHY IT WAS A REMOVAL AND NOT A REPAIR. `postStartHoldMs` was a CAMERA key with a camera
  // meaning: how long the director held LEADER_ZOOM after a hard-coded 3 s start overview, so the
  // hold ended at 3000 + the value. (Both are retired since START-ONE-WINDOW-1, which replaced them
  // with one `startWindowMs`; this note is kept because the QUESTION below is still open and still
  // the owner's.) Read here as an absolute floor from zero it meant something else — the
  // earliest the PULK phase may begin — and was 3000 ms out even on its own terms. Wiring it
  // correctly (a floor of 3000 + 7000 = 10000 ms) MOVES THE RACE: it binds on six of the ten
  // fingerprint tracks and changes the outcome on five of them. That is a rebaseline decision and
  // it belongs to the owner, so this file states the question instead of deciding it. The measured
  // numbers are in reports/evolution/POST-START-HOLD-UNIFY.md.
  const phases = {
    pulkStart: phaseFractions.pulkStart * targetDurationMs,
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
    _pulkBiasGain: config.pulkBiasGain ?? DEFAULT_RACE_DYNAMICS_CONFIG.pulkBiasGain,
    // ── COMBO15 shipped fair-arrival mechanism (default ON). Two cooperating parts, both flag-gated so OFF
    // reproduces the pre-combo15 world byte-identically. CHAOS STEER: a CONTINUOUS gentle pull during the
    // CHAOS phase ONLY toward the DRAWN BAND (not a draw bias, not a hard wall). Reachable — the pre-outcome
    // pin early-return is skipped while active. Out of band → eased toward it (two-sided clamp
    // [minMult,maxMult], _setTarget slews it → Sanftheits); in band → 1.0, untouched. Pull TARGET ends with
    // chaos; the slew-eased mult then decays into early PULK (no snap). Flag OFF → null → never runs. ──
    _chaosSteer: config.chaosSteer
      ? { gain: config.chaosSteerGain ?? DEFAULT_RACE_DYNAMICS_CONFIG.chaosSteerGain }
      : null,
    // BAND-BIAS DRAW: from R, re-aim the re-roll DRAW (not the position) toward the drawn band — the dice are
    // aimed within the honest [spreadMin,spreadMax] range, so nothing is fought and in-band racers keep free
    // dice. This is the fairness win (arrival 85–90%); the Cliff Law's correct sign (LESSONS L184). OFF → null.
    _bandBias: config.bandBias
      ? {
          R: config.bandBiasR ?? DEFAULT_RACE_DYNAMICS_CONFIG.bandBiasR,
          gain: config.bandBiasGain ?? DEFAULT_RACE_DYNAMICS_CONFIG.bandBiasGain,
        }
      : null,
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
    _choreoIntensity: config.choreoIntensity ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoIntensity,
    _choreoPackBandStrictness:
      config.choreoPackBandStrictness ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoPackBandStrictness,
    // Stage 1 spoiler switch (default OFF): suppress the B1-target pool's CHAOS areaBonus so the future
    // top-5 are not pulled forward before the race opens. A bonus switch, NOT a depth tool (depth is
    // authored via the establish-act fall-back). Read in update()'s choreo areaBonus block.
    _choreoSuppressChaosBonusB1: !!config.choreoSuppressChaosBonusB1,
    // Step 4: front-contest release + staggered per-band resolve (DevScreen-adjustable). B1 heroes
    // are held to _choreoReleaseProgress then RELEASED to natural speed; _choreoBandResolve[band] is the
    // resolve checkpoint per band (index 0=B1 uses the release). Fed to the generator + the release.
    _choreoReleaseProgress:
      config.choreoReleaseProgress ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoReleaseProgress,
    _choreoBandResolve: [
      config.choreoReleaseProgress ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoReleaseProgress,
      config.choreoResolveB2 ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB2,
      config.choreoResolveB3 ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB3,
      config.choreoResolveB4 ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB4,
      config.choreoResolveB5 ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoResolveB5,
    ],
    _heroCurves: null, // Map index → anchored curve, once generated
    _heldRelease: null, // Map index → release progress, for HELD heroes only
    _choreoGenerated: false,
    _choreoPrevRanks: null, // one-frame-earlier ranks, for the jerk-anchor velocities
    _choreoPrevProgress: null,
    // Spatial-hysteresis threshold for a RELEASED racer: how far (ranks) it may drift past its band
    // edge before the servo re-engages at strictness 1 and steers it back; it releases again only
    // once it is fully inside (bandError == 0). The release↔re-steer gap IS the anti-flicker guard —
    // there is NO time cooldown. Read by the B2-attacker free phase below (the only release path).
    _packReSteerThreshold:
      config.packReSteerThreshold ?? DEFAULT_RACE_DYNAMICS_CONFIG.packReSteerThreshold,
    // ── B2-attacker "Attack & Fall" (SHIPPED ON at b2AttackHeroes 3; 0 casts none → pre-feature game) ──
    // Threaded into the hero-curve generator (which casts the attackers) AND read by the servo below, which
    // runs the Track-to-FinalRank-then-Free logic for role 'attacker-b2'. See heroCurveGenerator.js.
    _b2AttackHeroes: config.b2AttackHeroes ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes,
    _b2AttackPeakRank: config.b2AttackPeakRank ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackPeakRank,
    _b2AttackFinalRank: config.b2AttackFinalRank ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackFinalRank,
    _b2AttackProgress: config.b2AttackProgress ?? {
      ...DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackProgress,
    },
    _b2AttackResolveProgress:
      config.b2AttackResolveProgress ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackResolveProgress,
    // Release model: false = fixed-final (steer to finalRank, with margin); true = band-arrival (free on
    // band re-entry = the edge, no margin). Default false → current shipped behaviour.
    _b2AttackBandArrival: !!config.b2AttackBandArrival,
    _attackerParams: null, // Map index → {peakRank, finalRank}, populated by update() at cast time
    // ── Front distance leash (SIM-ONLY: supplied only via the sim harness config; default OFF) ──────
    // A gap-space brake on the current runaway leader (see reports/proposals/RUNAWAY-CONCEPT.md DECISION).
    // The BROWSER never sets these (its config carries no frontLeash* keys) → both stay null → the leash
    // block in update() early-skips and update() is never even passed the leader→P2 length → byte-identical.
    // Read by update() together with the OPTIONAL leaderGapLen argument the sim (only) passes each frame.
    _frontLeashMaxLengths: config.frontLeashMaxLengths ?? null, // engage above this leader→P2 gap (lengths)
    _frontLeashGainPct: config.frontLeashGainPct ?? null, // brake per excess length (percent of natural speed)
    // ── Gap-cap re-roll bias (SHIPPED; docs/CONCEPT-COHESION.md) ──────────────────────────────────
    // "Loaded dice within the honest range": when a racer has opened a hole (arc gap > G to the racer
    // behind) its re-roll draw is shifted toward the SLOWER band edge; in symmetric mode a dropped racer
    // (gap > G to the racer ahead) is shifted FASTER. All ≤ G → bit-exact no-op.
    //
    // ★ THIS RUNS IN THE BROWSER. It was sim-only when written and this comment said so; the feature
    // SHIPPED, and `defaults.js` now carries `gapRerollEnabled: true` and
    // `gapRerollThresholdLengths: 0.5`, so the threshold is NOT null on the shipped path and
    // `computeGapBiasedTarget` really does bias draws in a browser race. Corrected 2026-09-13 after
    // GAP-CEILING-BASELINE-1 measured it firing in the owner's own stored race — his leader's draw was
    // cut 1.0813 → 0.9187 — while this comment still said the browser never set the keys. The
    // `frontLeash*` comment two lines above is a DIFFERENT case and is still accurate: those keys
    // appear nowhere in `defaults.js`, so that block really is sim-only.
    _gapRerollThresholdLengths: config.gapRerollThresholdLengths ?? null, // G (lengths); null = feature OFF
    // ── GAP-BRAKE-1: the gap-based leader brake (docs/DEAD-ENDS.md "Governor family" is why it is
    // gap-based and not rank-based). OFF unless the caller passes the switch, so a config that does
    // not mention it produces today's race byte-identically.
    _gapBrakeEnabled: config.gapBrakeEnabled === true,
    _gapBrakeAllowedGapPx: config.gapBrakeAllowedGapPx ?? null, // world px, leader->2nd; null = OFF
    _gapBrakeWindowEnd: config.gapBrakeWindowEnd ?? null, // progress fraction; window START is corrStartFrac
    // GAP-BRAKE-RATE-1: the brake's maximum authority, as a fraction of natural speed. The owner's
    // own number and the ONLY free one the mechanism has; the default is read from its one home
    // rather than restated, so a tuned key moves the brake with it.
    _gapBrakeMaxAuthority:
      config.gapBrakeMaxAuthority ?? DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeMaxAuthority,
    // GAP-BRAKE-RATE-1: the interval the gap's CHANGE is read over, and it is NOT a new number —
    // it is `trajectoryTransitionDuration`, the ease every trajectory target in this engine already
    // travels over, including this brake's own (see `_retargetInFlight`). Measuring the change over
    // exactly the interval the command needs to be delivered is the one non-arbitrary choice
    // available, and at 1000 ms it is five times the 200 ms the project measured physics jitter to
    // dominate below (coefficient of variation 26.5% at 33 ms, 12.2% at 200 ms).
    _gapBrakeRateWindowMs:
      (config.trajectoryTransitionDuration ??
        DEFAULT_RACE_DYNAMICS_CONFIG.trajectoryTransitionDuration) * 1000,
    // The track's path length, so a t-gap (t is in PATH LENGTHS, durationModel.js:22) can be read as
    // world px without the physics ever touching the camera. Passed in by raceCore; null = brake off.
    _pathLengthPx: config.pathLengthPx ?? null,
    _gapRerollMode: config.gapRerollMode ?? DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollMode, // 'symmetric' | 'down'
    // NOT unfireable, and it is the one entry on the 29 where the triage's UNFIREABLE verdict is
    // wrong: the sim passes `gapRerollStrength: undefined` on the world-OFF arm, so this fallback
    // DOES run there. It is inert all the same — `_gapRerollThresholdLengths` is null on that arm,
    // so `computeGapBiasedTarget` returns rawSample before it ever reads the strength. Measured:
    // world-off is byte-identical either side of this line (MIRROR-CENSUS-1).
    _gapRerollStrength: config.gapRerollStrength ?? DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollStrength, // fraction-to-edge = min(1, strength·(gap−G))
    // Window-derivation input (config-relative, zero hardcoded). Lower bound = corrStartFrac (the LIVE
    // choreoOutcomeStart). Upper bound = (harness lastRollDeadlineMs, realized-duration basis) −
    // transitionDur, so a biased roll's easeInOutCubic ramp settles before the schedule's own last roll.
    // The deadline is PASSED IN per race (never re-derived here) — one duration basis, closed-track-safe.
    _reRollTransitionDurationMs:
      config.reRollTransitionDuration != null ? config.reRollTransitionDuration * 1000 : 0,
    // ── FRONT ACT window start ────────────────────────────────────────────────────────────────────
    // contestWindowStart is the front act's OWN key: the sustained-P1-battle observer measures over
    // [contestWindowStart, first finish]. It falls back to choreoResolveB2 so a caller that predates
    // the key (and the committed baselines measured under it) behaves exactly as before.
    _contestWindowStart: config.contestWindowStart ?? config.choreoResolveB2 ?? 0.8,
  };
}

// ── createTrajectoryController ────────────────────────────────────────────────

/**
 * -- THE ARRIVAL, AND IT IS NOW THE ONLY ONE ---------------------------------------------------
 *
 * What a HELD comebacker does once he closes on his drawn place. The owner described this shape on
 * 2026-09-13 and it is what the race does. The four measurement variants it was chosen against
 * (A today, B free-on-arrival, C B-plus-taper, D C-plus-runaway-guard) and the five taper distances
 * are GONE -- measured, then deleted, because a switchable set of experiments is not a product. The
 * evidence is ARRIVAL-SHAPE-E-1 and SERVO-RANKS-1.
 *
 *   (a) THE CEILING. Over the last `ARRIVAL_CEILING_RANKS` ranks of his approach HIS OWN drive
 *       ceiling eases down to `ARRIVAL_CEILING_AT_PLACE`, so the pace he carries ACROSS his place is
 *       a settling one rather than the shipped clamp. `arrivalCeiling` says why this moves the
 *       CEILING and not the error -- a taper that scaled the error was measured and deleted, because
 *       the clamp discarded its reduction wherever the error still saturated (TAPER-INVISIBLE-1).
 *   (b) THEN HE IS STEERED, exactly as any other racer is: to his drawn place, at the hero's
 *       strictness 1.0. The "unsteered inside his block" half was built so he would not feel braked
 *       on arrival, measured, and DELETED -- it cost 3.3x the pre-shape gap at twenty racers, and
 *       the ceiling above removes the reason it existed.
 *
 * -- NEITHER CLAMP NUMBER NOR THE EASE DURATION IS TOUCHED, and no other role is reached: every
 * branch is inside the `heldFree` test.
 */

/**
 * -- THE ARRIVAL CEILING (ARRIVAL-SOLVE-1, 2026-09-13) -----------------------------------------
 *
 * THE PARAGRAPH A READER CAN CHECK. The servo commands
 * `clamp(1.0 + gain * error / nActive + noise, minMult, maxMult)`. It SATURATES whenever the error
 * exceeds `(maxMult - 1) * nActive / gain` -- 2.0 ranks at forty racers. TAPER-INVISIBLE-1 measured
 * what that costs: a taper that scales the ERROR has its reduction thrown away by the clamp for
 * every rank above that threshold, so a four-rank taper had two ranks of authority at N=40 and
 * arrived at 1.077, which is three quarters of the untapered rush and invisible on screen.
 *
 * THIS LEVER MOVES THE CEILING INSTEAD OF THE ERROR. While a held comebacker is closing on his drawn
 * place, HIS OWN `maxMult` eases down from the shipped clamp to `ARRIVAL_CEILING_AT_PLACE`. Because
 * the ceiling IS the commanded value wherever the raw drive saturates, it reaches its target
 * EXACTLY and at EVERY field size -- there is no `nActive` in it to make it field-size dependent,
 * which is the defect that made a rank-counted taper mean four different things at four field sizes.
 *
 * -- IT TOUCHES ONE RACER. Every line is inside `heldFree`, so no other racer's steering, no other
 * role, and no shared clamp is reached. `minMult` is untouched: this bounds the DRIVE, never the
 * brake. The owner's constraint of 2026-09-13 is that the problem is one racer and the rest of the
 * field must be left alone, and that is why this lever was preferred over the response curve, which
 * measured better and changed everyone.
 *
 * -- IT ALSO GIVES THE EASE SOMETHING TO FOLLOW. The old shape left the command pinned at 1.100 and
 * then dropped it in the last rank, which a 1 s ease cannot track. The ceiling falls across the
 * whole approach -- a nominal 2.4-3.4 s -- so the multiplier has a gradient rather than a cliff.
 */
export const ARRIVAL_CEILING_RANKS = 4;

/**
 * What his personal ceiling is worth the moment he reaches his place. Read in on-screen terms: at
 * the ~5.7x magnification the camera uses during an approach, 1.100 eats 85 canvas px/s of the gap
 * ahead, 1.05 eats 44, and 1.02 eats 17 -- which is what "settling" rather than "closing" looks
 * like (TAPER-INVISIBLE-1 SS3).
 */
export const ARRIVAL_CEILING_AT_PLACE = (() => {
  const v = Number.parseFloat(globalThis.process?.env?.RA_ARRIVAL_CEIL ?? '');
  return Number.isFinite(v) && v >= 1 ? v : 1.02;
})();

/**
 * His personal drive ceiling at `rankError` ranks short of his place. `maxMult` far out, easing to
 * `ARRIVAL_CEILING_AT_PLACE` at the place itself. smoothstep, so it leaves the shipped clamp and
 * arrives at its floor with zero slope and there is no corner in the trace.
 *
 * It NEVER returns above `maxMult`: this lever can only ever tighten a racer's ceiling, never raise
 * it, so it cannot make anybody faster than the shipped clamp already allows.
 */
export function arrivalCeiling(
  rankError,
  maxMult,
  ranks = ARRIVAL_CEILING_RANKS,
  atPlace = ARRIVAL_CEILING_AT_PLACE
) {
  const floor = Math.min(atPlace, maxMult);
  if (!(ranks > 0)) return maxMult;
  if (!(rankError > 0)) return floor;
  if (rankError >= ranks) return maxMult;
  const u = rankError / ranks;
  return floor + (maxMult - floor) * (u * u * (3 - 2 * u));
}

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
  // ARRIVAL-VARIANTS-1: indices that have reached their drawn place at least once since the release.
  // A latch, not a live test — once he has arrived he stays arrived, so a variant cannot flicker in
  // and out of being steered as he crosses back and forth.
  const _arrivedAtDrawn = new Set();
  const { pulkStart, pulkEnd, transEnd, corrStart, corrEnd } = plan._phases;

  // Phase-boundary FRACTIONS [0,1] for the leader-progress phase clock.
  // Single-source: derived from the same absolute ms boundaries used by the elapsedMs path
  // (no second copy of pulkStart/corridorStart) — keeps both clocks in lock-step.
  // This line used to end "including any postStartHold offset baked into pulkStart". There is no
  // such offset any more (POST-START-HOLD-UNIFY), so the derivation is the only thing it defends.
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
  // CHAOS-STEER-1 telemetry (closure-scoped ⇒ per race). Ticks steered, summed target mult (mean pull),
  // max per-tick |Δ trajectoryMult| over steered racers (Sanftheits proof), and the in-band-at-chaos-end
  // scorecard (index → in drawn band at the first PULK frame) captured read-only for EVERY arm (ship too).
  let _chaosSteerTicks = 0;
  let _chaosSteerMultSum = 0;
  let _chaosSteerMaxTickDelta = 0;
  const _chaosSteerInBandEnd = new Map();
  const _chaosSteerLastMult = new Map(); // index → trajectoryMult observed last frame (frame-to-frame Δ)
  const _chaosSteerRacers = new Set(); // distinct racers the steer touched (out of band ≥1 chaos frame)
  const _chaosSteerByRacer = new Map(); // index → {ticks, multSum} (per-racer steer exposure → per-row skew)
  let _chaosSteerEndCaptured = false;
  let _racerStepCount = 0;
  let _racersInCorridorCount = 0;
  let _corridorViolationSum = 0;
  let _corridorViolationMax = 0;
  let _bidirectionalBoostCount = 0;
  let _bidirectionalBrakeCount = 0;
  let _racersBlockedCount = 0;
  // Release hysteresis state + diagnostics for a FREED B2-attacker (closure-scoped ⇒ resets per race
  // automatically, since createTrajectoryController runs once per race). Keyed by r.index — survives
  // the spread-copy that would break an object-identity compare. With no attackers cast these stay
  // untouched.
  const _packReleased = new Map(); // index → boolean: currently in the released (strictness 0) state
  let _packReleaseEvents = 0; // count of steering→released transitions (a racer arrived in-band)
  // ── Gap-cap re-roll bias telemetry (closure-scoped ⇒ per race; TELEMETRY ONLY, like the
  // computePulkBiasedTarget counters — never feeds back into the returned draw, so determinism holds).
  let _gapBiasEvents = 0; // total scheduled rolls this race that were gap-biased (shifted)
  const _gapWindowRollsByRacer = new Map(); // index → rolls that fell inside the window for that racer
  const _gapBiasByRacer = new Map(); // index → rolls that were actually shifted for that racer
  // Branch-fire diagnostic for the small-G chase-suppression question: the gapBehind>G branch RETURNS
  // before the gapAhead>G check, so a racer that is BOTH detached from the field behind it AND far
  // behind the racer ahead gets tilted SLOWER — the chase is structurally suppressed. These counters
  // measure how often that happens. TELEMETRY ONLY: never read back into a returned draw.
  let _gapDownTilts = 0; // gapBehind>G branch fired (toward SLOWER)
  let _gapUpTilts = 0; // gapAhead>G branch fired (toward FASTER; symmetric mode only)
  let _gapDownAheadGtBehind = 0; // SMOKING GUN: a DOWN-tilt while gapAhead > gapBehind
  let _gapDownLeader = 0; // DOWN-tilts on the live leader (rank 1)
  // SCREEN-tier escape-latency telemetry (read-only). One entry per DOWN-tilt applied to the LIVE
  // LEADER, which is the event the eye sees as "the escapee gets braked". At that instant `gapBehind`
  // IS the P1->P2 gap, so the entry records how far the leader had already escaped when the correction
  // arrived, and how hard the correction was. Collecting it cannot change any drawn value: the array
  // is written after `frac` is computed and never read by the transform.
  //   gapLen — P1->P2 gap in racer lengths at the moment of the tilt (the escape depth at correction)
  //   frac   — min(1, strength*(gapBehind-G)) : fraction-of-the-way-to-the-band-edge actually applied
  //   delta  — the absolute spreadFactor reduction applied this event (frac * (rawSample - spreadMin))
  const _gapLeaderDownEvents = [];
  let _gapDownChaser = 0; // DOWN-tilts on live ranks 2–5 (the chase group)
  let _gapDownPack = 0; // DOWN-tilts on live rank ≥6 (the pack)
  let _gapDownGapAheadSum = 0; // Σ gapAhead at DOWN-tilt moments (lengths)
  let _gapDownGapBehindSum = 0; // Σ gapBehind at DOWN-tilt moments (lengths)
  let _packReSteerEvents = 0; // count of released→steering transitions (a racer drifted out)
  let _packReleasedFrames = 0; // freed-attacker frames spent released (strictness 0)
  let _packSteerFrames = 0; // freed-attacker frames spent re-steering (strictness 1)
  // B2-attacker "Attack & Fall" state (closure-scoped ⇒ per-race). _attackerMinRank tracks the best
  // (lowest) live rank each attacker has REACHED (peak-tracking); _attackerFreed latches once it has
  // climbed to its peak AND been steered down to its finalRank in-band (then it joins the release
  // hysteresis via _packReleased). _attackerFreeEvents counts freeings (diagnostic).
  const _attackerMinRank = new Map(); // index → best (lowest) live rank reached so far
  const _attackerFreed = new Map(); // index → boolean: has completed climb+orchestrated-fall → free
  let _attackerFreeEvents = 0;
  // ── ★ E (ARRIVAL-VARIANTS-1, the owner's shape) telemetry. All zero for every other variant,
  // because every increment sits behind `heldFree`. `_eArrivalMults` holds one entry
  // per staged comebacker: the pace multiplier he carried the first frame he reached his drawn place
  // — the direct test of whether the taper finished before he got there (it should read 1.0).
  // Per-held-comebacker arrival observations, keyed by racer index. Read-only measurement, filled
  // for EVERY variant — see the block in `update`. One entry per held comebacker per race.
  const _arrivalObs = new Map();
  // ── Front distance leash state (SIM-ONLY; only touched when plan._frontLeashMaxLengths != null) ──
  // Latched onto ONE racer (the runaway leader) when the leash engages, so the B1-floor disengage
  // ("leashed racer's live rank ≥ 3") is meaningful — it tracks that specific racer, not whoever is
  // momentarily rank 1. Closure-scoped ⇒ per race; resets automatically.
  let _leashEngaged = false; // hysteresis state: currently braking?
  let _leashTargetIdx = -1; // index of the leashed racer while engaged
  let _leashFrames = 0; // diagnostic: frames the brake was applied
  // ── GAP-BRAKE-1 telemetry. Read-only counters; they answer the two questions the owner asked —
  // how often does it fire, and does it ever fire on a gap it was told to allow.
  // GAP-BRAKE-ARRIVAL-1: the racer the brake was the binding constraint on last step, or -1.
  // Closure-scoped, so it resets per race like every other piece of controller state.
  let _gapBrakeBindingIdx = -1;
  let _gapBrakeWindowFrames = 0; // leader-frames inside [corrStart, windowEnd]
  let _gapBrakeFrames = 0; // of those, frames the brake actually pulled
  let _gapBrakeMinMult = 1.0; // hardest correction commanded this race
  let _gapBrakeMaxGapPx = 0; // biggest leader->2nd gap seen inside the window
  let _gapBrakeMinFiringGapPx = Infinity; // smallest gap at which anything was WRITTEN (fade included)
  const _gapBrakeGapsAtFire = []; // the gap at every firing frame (step 4's distribution)
  // ── GAP-BRAKE-RATE-1 state. The strength is now INTEGRATED, so it is state rather than a
  // function of the frame — these five are the whole of it, and all five are closure-scoped, so
  // they reset per race exactly like every other controller field.
  let _gapBrakeEngaged = false; // has the SIZE gate let it in, and has it not yet faded out?
  let _gapBrakeLeaderIdx = -1; // the racer the brake is latched to while engaged
  let _gapBrakeStrength = 0; // current authority, [0, maxAuthority]; the commanded target is 1 - this
  let _gapBrakeSmoothedGapPx = null; // the gap after the rate-window smoothing; null = not yet seeded
  let _gapBrakeLastMs = null; // previous in-window frame's clock, for dt
  let _gapBrakeMinEngageGapPx = Infinity; // ★ smallest gap at which it ever ENGAGED — must exceed the allowance
  let _gapBrakeMaxStrength = 0; // deepest authority held this race
  let _gapBrakeLastDGapPx = 0; // last smoothed-gap change, read-only (harness step trace)
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
  // The smallest target change `_setTarget` will act on. It was already the literal below; naming
  // it lets the gap brake ask the same question the setter does — "would this even be written?" —
  // instead of carrying a second epsilon of its own.
  const TARGET_EPSILON = 0.001;

  /**
   * GAP-BRAKE-ARRIVAL-1 — move a target that is ALREADY in flight, without restarting its ease.
   *
   * ★ WHY THIS EXISTS. `_setTarget` above resets `trajectoryMultPrev` to the value held RIGHT NOW
   * and `trajectoryMultTransStart` to now, so every write begins the 1000 ms ease again from
   * wherever the multiplier happens to be. For a target that settles, that is correct and is what
   * every racer has always done. For a target that MOVES EVERY STEP it is fatal:
   * `easeInOutCubic` is 4t^3 near zero (mathUtils.js:12), so a restart every few steps keeps the
   * multiplier permanently in the flat part of the curve and it never travels. GAP-BRAKE-PARADOX-1
   * measured the consequence on space-sprint seed 2 — a slowdown commanded on 592 of 592 braked
   * steps, and a multiplier above 1.0 on 592 of 592, frozen at the 1.094 boost it happened to hold.
   *
   * So while the brake is the binding constraint on a racer, the target is moved and the CLOCK IS
   * LEFT ALONE. The ease then runs to completion exactly as designed; once `elapsed` passes the
   * transition duration, raceCore.js:565-574 returns the target itself and the held value tracks
   * the command step for step.
   *
   * ★ THIS IS NOT A SECOND TRANSITION MECHANISM. It writes no multiplier and carries no rate of
   * its own — it is the SAME ease, with the restart omitted. There is no new number here.
   *
   * ★ AND IT CANNOT CAUSE A JUMP. The held value is a continuous function of (prev, target,
   * elapsed); moving the target by d changes it by d x ease(elapsed/dur) <= d, and d is the
   * brake's per-step command change, which is a fraction of a thousandth.
   */
  function _retargetInFlight(r, newTarget) {
    r.trajectoryMultTarget = newTarget;
  }
  function _setTarget(r, newTarget, elapsedMs) {
    if (Math.abs(newTarget - (r.trajectoryMultTarget ?? 1.0)) > TARGET_EPSILON) {
      r.trajectoryMultPrev = r.trajectoryMult ?? 1.0;
      r.trajectoryMultTarget = newTarget;
      r.trajectoryMultTransStart = elapsedMs;
    }
  }

  /**
   * GAP-BRAKE-RATE-1 — the gap-based leader brake. Returns `{ index, target }` for the racer who
   * should be slowed this frame, or `null` when the brake is off, outside its window, or — the
   * normal case — when no gap has ever opened past the allowance.
   *
   * ── THE WINDOW ──────────────────────────────────────────────────────────────────────────────
   * START is `corrStartFrac`, NOT a constant: it is the resolved OUTCOME-phase boundary, which is
   * the SAME quantity that ends the PULK brake (`phaseFractions.pulkEnd = corridorStart =
   * choreoOutcomeStart`, above). Move that boundary and both mechanisms move with it, so no
   * unbraked gap can open between them. END is the owner's own key, `gapBrakeWindowEnd`.
   *
   * ── SIZE DECIDES WHETHER, CHANGE DECIDES HOW STRONG (the owner, 2026-09-14) ─────────────────
   * The gap is leader->2nd in WORLD px: `t` counts path lengths (durationModel.js:22), so the
   * difference times `pathLengthPx` is the on-screen distance between them.
   *
   * ★ THE GATE IS UNCHANGED AND IS STILL A SIZE. Until the gap has been strictly greater than the
   * allowance the brake does not ENGAGE and nothing is written — a leader ten pixels clear is never
   * braked, which is the whole reason this mechanism is gap-based rather than rank-based
   * (docs/DEAD-ENDS.md, "Governor family").
   *
   * ★★ THE STRENGTH IS NO LONGER A SIZE. The first build read the gap's size through a ramp that
   * reached full authority at twice the allowance, and the owner's objection to it is correct: a
   * brake that works prevents the gap from ever reaching the size that would earn it its strength,
   * so it cannot get there, and where brake and drive balance the gap PARKS. The structural cause
   * is that the old law returned to ZERO authority exactly at the allowance — an equilibrium above
   * the allowance was therefore guaranteed, whatever the numbers.
   *
   * So the strength is INTEGRATED from the gap's change:
   *
   *   growing   S := min(ceiling, S + ceiling * dGap / allowance)
   *   shrinking S := S * (gap / gapBefore)
   *
   * and neither line carries a number of its own. The RISE gain is `ceiling / allowance`: one whole
   * allowance of further growth buys the whole of the authority the owner named. The FALL is not a
   * gain at all — it is the identity dS/S = dGap/gap, which makes the strength PROPORTIONAL TO THE
   * GAP while it is closing and so reaches zero only when the gap does. That is the half of his
   * design the old law could not express: it stays engaged past the allowance, follows the gap all
   * the way down, and the leader returns to normal speed gradually instead of snapping back.
   *
   * ★★ AND THAT SHRINK LINE IS THE WHOLE OF THE FIX, stated as an inequality. On a gap that only
   * ever GROWS the two laws agree by construction — both hand over the full authority one allowance
   * past the allowance — so nothing about a widening gap distinguishes them. They part company the
   * moment the brake starts WINNING:
   *
   *     old (size ramp)  dS/S = dGap / (gap - allowance)
   *     new (this law)   dS/S = dGap /  gap
   *
   * and `gap > gap - allowance` always, so the new law surrenders STRICTLY LESS of its strength for
   * every pixel it closes, and surrenders none of it at the allowance where the old law surrendered
   * all of it. An equilibrium above the allowance is therefore no longer structurally guaranteed,
   * which is the thing the owner was actually objecting to. Pinned by the give-back test in
   * `gapLeaderBrake.test.js`.
   *
   * ★ THE ENTRY VALUE, and why the old ramp survives there and ONLY there. A gap can be past the
   * allowance the moment the window opens, having done its growing where this mechanism was not
   * watching. The seed credits exactly that growth at exactly the rise gain —
   * `ceiling * clamp((gap - allowance) / allowance, 0, 1)` — so entry is continuous with the
   * growth path: a gap that crosses the allowance from below seeds 0, which is what one step of
   * growth from the allowance would have given it. One formula, one gain, used once.
   *
   * ── WHY THE GAP IS SMOOTHED FIRST ───────────────────────────────────────────────────────────
   * An integrator on a per-step difference would chase physics jitter, and it would chase it
   * ASYMMETRICALLY — the rise gain is constant while the fall gain is `S / gap`, so symmetric noise
   * would ratchet the strength upward. The gap is therefore smoothed over `_gapBrakeRateWindowMs`
   * before any change is read from it. That interval is the engine's own
   * `trajectoryTransitionDuration` — see the plan field — not a constant introduced here.
   *
   * ── WHAT IS REUSED UNCHANGED ────────────────────────────────────────────────────────────────
   * The rate limit is not a new term: the returned target goes through `_setTarget` /
   * `_retargetInFlight`, so it rides the existing `trajectoryTransitionDurationMs` ease that every
   * other target already uses (GAP-BRAKE-ARRIVAL-1). The fold at the call site is still
   * `Math.min`, so the brake can never raise a speed. `TARGET_EPSILON` is still the setter's own
   * "would this even be written" test, and it is also what ends the fade.
   *
   * @param {Array} active non-finished racers, already sorted by t descending (rank 1 first)
   * @param {number} nActive `active.length`
   * @param {number|null} phaseProgress leader-progress fraction
   * @param {number} elapsedMs physics clock, for the smoothing interval's dt
   * @returns {{index:number, target:number}|null}
   */
  function _gapBrakeRelease() {
    _gapBrakeEngaged = false;
    _gapBrakeStrength = 0;
    _gapBrakeSmoothedGapPx = null;
    _gapBrakeLastMs = null;
    _gapBrakeLastDGapPx = 0;
  }

  function _computeGapLeaderBrake(active, nActive, phaseProgress, elapsedMs) {
    if (!plan._gapBrakeEnabled) return null;
    const allowedPx = plan._gapBrakeAllowedGapPx;
    const windowEnd = plan._gapBrakeWindowEnd;
    const ceiling = plan._gapBrakeMaxAuthority;
    const rateWindowMs = plan._gapBrakeRateWindowMs;
    const pathPx = plan._pathLengthPx;
    // Every input must be present and usable. A missing one means the caller did not wire the
    // brake, and a brake that guessed a default here would be a mechanism nobody switched on.
    if (!(allowedPx > 0) || windowEnd == null || !(pathPx > 0)) return null;
    if (!(ceiling > 0) || !(rateWindowMs > 0)) return null;
    if (nActive < 2 || phaseProgress == null) {
      _gapBrakeRelease();
      return null;
    }
    if (phaseProgress < corrStartFrac || phaseProgress > windowEnd) {
      _gapBrakeRelease();
      return null;
    }

    const leader = active[0];
    const gapPx = (leader.t - active[1].t) * pathPx;
    _gapBrakeWindowFrames++;
    if (gapPx > _gapBrakeMaxGapPx) _gapBrakeMaxGapPx = gapPx;

    // ── THE SMOOTHED GAP. One exponential filter with the rate window as its time constant; the
    // per-step coefficient is dt/window, so a paused or repeated clock cannot move it. The first
    // in-window frame seeds it and reports no change, which is correct: one sample is not a rate.
    const dtMs = _gapBrakeLastMs == null ? 0 : elapsedMs - _gapBrakeLastMs;
    _gapBrakeLastMs = elapsedMs;
    const gapBefore = _gapBrakeSmoothedGapPx;
    if (gapBefore == null) {
      _gapBrakeSmoothedGapPx = gapPx;
    } else if (dtMs > 0) {
      _gapBrakeSmoothedGapPx = gapBefore + (gapPx - gapBefore) * Math.min(1, dtMs / rateWindowMs);
    }
    const gapNow = _gapBrakeSmoothedGapPx;
    const dGap = gapBefore == null ? 0 : gapNow - gapBefore;
    _gapBrakeLastDGapPx = dGap;

    // ★ THE BRAKE IS LATCHED TO ONE RACER. If somebody else has taken the lead the gap it was
    // working on is closed by definition, so the accumulated authority goes with it rather than
    // being handed to a racer who never earned it. The new leader must pass the gate on his own.
    if (_gapBrakeEngaged && _gapBrakeLeaderIdx !== leader.index) {
      _gapBrakeRelease();
      // the release above cleared the filter; re-seed it so this frame still has a gap to read
      _gapBrakeSmoothedGapPx = gapPx;
      _gapBrakeLastMs = elapsedMs;
    }

    if (!_gapBrakeEngaged) {
      // ★ THE GATE. Strictly greater — a lead exactly at the allowance is allowed. This is the one
      // place the SIZE is read, and it decides only WHETHER.
      if (!(gapPx > allowedPx)) return null;
      _gapBrakeEngaged = true;
      _gapBrakeLeaderIdx = leader.index;
      _gapBrakeStrength = ceiling * clamp((_gapBrakeSmoothedGapPx - allowedPx) / allowedPx, 0, 1);
      if (gapPx < _gapBrakeMinEngageGapPx) _gapBrakeMinEngageGapPx = gapPx;
    } else if (dGap >= 0) {
      // GROWING (or held): the authority rises by the same gain the entry seed used.
      _gapBrakeStrength = Math.min(ceiling, _gapBrakeStrength + ceiling * (dGap / allowedPx));
    } else {
      // SHRINKING: the authority stays proportional to the gap, so it reaches zero with the gap and
      // not at the allowance. `gapBefore > 0` is the only guard the ratio needs.
      _gapBrakeStrength = gapBefore > 0 ? _gapBrakeStrength * (gapNow / gapBefore) : 0;
      if (!(_gapBrakeStrength > 0)) _gapBrakeStrength = 0;
    }

    const target = 1 - _gapBrakeStrength;
    // ★ A CORRECTION TOO SMALL TO BE WRITTEN IS NOT A CORRECTION, and it is also the END OF THE
    // FADE. A hair over the allowance on entry, or a gap that has all but closed, both leave a
    // command `_setTarget` would decline to move the target for. Releasing here is what lets the
    // brake finish: the strength only ever reaches zero asymptotically, so without this it would
    // stay nominally engaged for ever. It is not a second threshold — it is the setter's own.
    if (!(1 - target > TARGET_EPSILON)) {
      _gapBrakeRelease();
      return null;
    }
    _gapBrakeFrames++;
    if (_gapBrakeStrength > _gapBrakeMaxStrength) _gapBrakeMaxStrength = _gapBrakeStrength;
    if (target < _gapBrakeMinMult) _gapBrakeMinMult = target;
    if (gapPx < _gapBrakeMinFiringGapPx) _gapBrakeMinFiringGapPx = gapPx;
    if (_gapBrakeGapsAtFire.length < 20000) _gapBrakeGapsAtFire.push(gapPx);
    return { index: leader.index, target };
  }

  function update(racers, elapsedMs, phaseProgress = null, leaderGapLen = null) {
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
    // CHAOS-STEER-1: the pre-outcome pin returns early — which is precisely why the chaos steer never
    // gripped (the per-racer steer block sat AFTER this return, dead). Skip the early return during chaos
    // when the steer is active so that block is reached. OFF → chaosSteerNow false → identical early-return.
    const chaosSteerNow =
      plan._chaosSteer != null && phaseProgress != null && phaseProgress < pulkStartFrac;
    if (_preOutcome && !choreoActive && !chaosSteerNow) {
      for (const r of racers) _setTarget(r, 1.0, elapsedMs);
      return;
    }

    // Sort non-finished racers by t descending; stable tiebreak: lower index = higher rank
    const active = racers
      .filter((r) => !r.finished)
      .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));

    // CHAOS-STEER-1 scorecard: at the FIRST PULK frame (chaos end) snapshot whether each racer is in its
    // DRAWN band. Read-only (no _setTarget / no RNG), so it runs for EVERY arm — ship included — to give
    // the in-band-at-chaos-end delta, and cannot perturb the OFF fingerprint.
    if (!_chaosSteerEndCaptured && phaseProgress != null && phaseProgress >= pulkStartFrac) {
      for (let i = 0; i < active.length; i++) {
        const rr = active[i];
        const dr = plan._racerTargetRank.get(rr.index);
        if (dr == null) continue;
        const [blo, bhi] = getAreaBounds(dr);
        _chaosSteerInBandEnd.set(rr.index, i + 1 >= blo && i + 1 <= bhi);
      }
      _chaosSteerEndCaptured = true;
    }

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
            // DIRECTION-AUTHORITY-1: the hero feasibility model prices a DESCENT at the clamp's drop
            // authority and a CLIMB at its climb authority. Threaded from the LIVE resolved
            // controllerParams -- the same reason anchorProgress is threaded -- so a tuned clamp
            // moves the gate with it and no second copy of either number exists.
            dropBudgetFrac: 1 - minMult,
            releaseProgress: plan._choreoReleaseProgress,
            bandResolve: plan._choreoBandResolve,
            // B2-attacker "Attack & Fall" params (SHIPPED ON at 3; 0 → no attackers → pre-feature game).
            b2AttackHeroes: plan._b2AttackHeroes,
            b2AttackPeakRank: plan._b2AttackPeakRank,
            b2AttackFinalRank: plan._b2AttackFinalRank,
            b2AttackProgress: plan._b2AttackProgress,
            b2AttackResolveProgress: plan._b2AttackResolveProgress,
          },
        });
        plan._heroCurves = new Map(gen.curves.map((c) => [c.index, c.curve]));
        // HOLD-AND-RELEASE: index -> the progress at which a HELD hero's curve ends and he is handed
        // back to his drawn rank. Only held curves carry `releaseAt`, so this map is empty for every
        // plan that casts none and the servo below is then byte-identical to before.
        plan._heldRelease = new Map(
          gen.curves.filter((c) => c.releaseAt != null).map((c) => [c.index, c.releaseAt])
        );
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
        // recomputed, never read by physics. Delivered to the CameraDirector (setCameraPlan).
        //
        // THE ROLES ARE CONSUMED; THE BEATS ARE NOT. (This comment said "currently UNCONSUMED" until
        // 2026-08-23, which stopped being true when B4 landed.) `comebackDetector.setPlan` reads
        // `role === 'comebacker'` and keeps those indices as the primary comeback candidates; the
        // per-hero `beats` array (anchor / peak / resolve) is dropped on arrival, so the camera still
        // infers from rank history what this plan already states, and the `resolve` beat never reaches
        // it at all. Open point, with the evidence, in docs/BACKLOG.md PART TWO D14 — nothing is
        // proposed here and nothing is built.
        //
        // The channel is also the prerequisite for the planned B4b faller shot, because b1Indices
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

    // ── GAP-BRAKE-1 — the gap-based leader brake, computed ONCE per frame ─────────────────────
    //
    // ★ WHY IT IS COMPUTED HERE AND NOT APPLIED AFTER THE LOOP. `_setTarget` restarts the
    // trajectoryMult ease every time the target moves by more than 0.001. A second `_setTarget` on
    // the leader after the servo had already written him would re-trigger the ease twice per frame,
    // every frame, pinning `elapsed` at 0 so the multiplier would freeze at its previous value and
    // the brake would never actually take hold. (That is also why the dead front leash below, which
    // does exactly that, could not have worked had its keys ever been set.) So the brake produces a
    // TARGET here and the loop folds it into the leader's single write with Math.min.
    //
    // ★ ON THE GAP, NEVER ON RANK. Below the allowance this block sets nothing at all.
    const gapBrake = _computeGapLeaderBrake(active, nActive, phaseProgress, elapsedMs);
    // Which racer the brake was the binding constraint on LAST step. It is the whole state the
    // arrival fix needs: the first step of a pull starts the ease normally (a smooth onset from
    // wherever he is), and every step after that moves the target without restarting it.
    const brakeHeldLast = _gapBrakeBindingIdx;
    let brakeBindingNow = -1;

    for (let rankIdx = 0; rankIdx < nActive; rankIdx++) {
      const r = active[rankIdx];
      const currentRank = rankIdx + 1; // 1-indexed, 1 = leading
      const heroCurve = heroCurves && r.isHeroChoreographed ? heroCurves.get(r.index) : null;
      const isHero = !!heroCurve;
      // ── CHAOS-STEER-1: the owner's Part 1, built PROPERLY (reachable — see the early-return skip above).
      // During chaos (< pulkStart) a racer OUT of its DRAWN band is eased toward it by a clamped multiplier
      // (Sanftheits-Regel: _setTarget slews it, no per-tick snap; two-sided clamp [minMult,maxMult] honoured).
      // IN band → csErr 0 → target 1.0 → untouched. The pull TARGET ends with the chaos phase. Telemetry:
      // steered-tick count, summed target mult (mean pull), and the max per-tick |Δ mult| (smoothness proof).
      if (plan._chaosSteer && phaseProgress != null && phaseProgress < pulkStartFrac) {
        const csDrawn = plan._racerTargetRank.get(r.index) ?? currentRank;
        const [csLo, csHi] = getAreaBounds(csDrawn);
        const csErr =
          currentRank < csLo ? currentRank - csLo : currentRank > csHi ? currentRank - csHi : 0;
        const csTarget = clamp(1.0 + plan._chaosSteer.gain * clamp(csErr, -5, 5), minMult, maxMult);
        _setTarget(r, csTarget, elapsedMs);
        // Smoothness proof: the eased trajectoryMult read this frame is last frame's RESULT; compare to the
        // value observed the previous frame → the true per-tick step the ease produced (bounded = smooth).
        const nowMult = r.trajectoryMult ?? 1.0;
        if (_chaosSteerLastMult.has(r.index)) {
          const d = Math.abs(nowMult - _chaosSteerLastMult.get(r.index));
          if (d > _chaosSteerMaxTickDelta) _chaosSteerMaxTickDelta = d;
        }
        _chaosSteerLastMult.set(r.index, nowMult);
        if (csErr !== 0) {
          _chaosSteerTicks++;
          _chaosSteerMultSum += csTarget;
          _chaosSteerRacers.add(r.index);
          const pr = _chaosSteerByRacer.get(r.index) ?? { ticks: 0, multSum: 0 };
          pr.ticks++;
          pr.multSum += csTarget;
          _chaosSteerByRacer.set(r.index, pr);
        }
        continue;
      }
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
      // A HELD hero is released at his curve's end: from there he is steered to his DRAWN rank like
      // any other racer, which is the climb the owner asked to watch rather than one more authored
      // leg. Before that he tracks his curve exactly, as every hero does.
      const heldReleaseAt =
        isHero && plan._heldRelease ? plan._heldRelease.get(r.index) : undefined;
      const heldFree = heldReleaseAt != null && phaseProgress >= heldReleaseAt;
      // ── ★ ARRIVAL OBSERVATION (ARRIVAL-SHAPE-E-1) — READ-ONLY, AND THE SAME FOR EVERY VARIANT ──
      // The instrument that answers "which distance works". It is deliberately OUTSIDE the variant
      // branches below, so variant A's baseline is measured by the SAME code as E's arm and the two
      // columns are comparable; it touches no RNG and calls no `_setTarget`, so it cannot move a
      // race. `active` is already sorted by t descending, so the leader gap costs one subtraction.
      if (heldFree) {
        const drawn = plan._racerTargetRank.get(r.index) ?? currentRank;
        let o = _arrivalObs.get(r.index);
        if (!o) {
          o = {
            index: r.index,
            drawn,
            arrivalMult: null, // ★ his pace the frame he first reached his place — should be 1.0
            arrivalProgress: null,
            arrivalMs: null,
            twoOutMs: null, // when he was last two ranks short, for "how long two ranks take"
            twoRankMs: null,
            maxLeadGapFrac: 0, // ★ peak gap to 2nd while he leads, as a fraction of the race
            maxLeadGapProgress: 0,
            worstRankAfter: null, // ★ the drift the net is there to bound
            bestRankAfter: null,
            releaseRank: currentRank, // his rank the frame he was handed back — what a viewer sees
            ceilStartRank: null, // ★ the rank he was at when HIS ceiling first bound
            ceilStartMs: null,
            ceilAtArrival: null, // ★ what his ceiling was worth the frame he reached his place
            // ★ One entry per RANK CHANGE during the approach, so "where was he one second before he
            // arrived" can be answered exactly rather than extrapolated from an average rate. Capped
            // so a pathological race cannot grow it without bound; the approach is short.
            trail: [],
          };
          _arrivalObs.set(r.index, o);
        }
        if (o.arrivalMs == null && currentRank === drawn + 2) o.twoOutMs = elapsedMs;
        if (o.trail.length < 400) {
          const last = o.trail[o.trail.length - 1];
          if (!last || last.rank !== currentRank)
            o.trail.push({ ms: elapsedMs, rank: currentRank });
        }
        if (o.arrivalMs == null && currentRank <= drawn) {
          o.arrivalMult = r.trajectoryMult ?? 1.0;
          o.ceilAtArrival = arrivalCeiling(0, maxMult);
          o.arrivalProgress = phaseProgress;
          o.arrivalMs = elapsedMs;
          if (o.twoOutMs != null) o.twoRankMs = elapsedMs - o.twoOutMs;
        }
        if (o.arrivalMs != null) {
          o.worstRankAfter = Math.max(o.worstRankAfter ?? currentRank, currentRank);
          o.bestRankAfter = Math.min(o.bestRankAfter ?? currentRank, currentRank);
        }
        if (rankIdx === 0 && nActive > 1 && plan._finishT > 0) {
          const g = (r.t - active[1].t) / plan._finishT;
          if (g > o.maxLeadGapFrac) {
            o.maxLeadGapFrac = g;
            o.maxLeadGapProgress = phaseProgress ?? 0;
          }
        }
      }
      const targetRank = released
        ? currentRank
        : isHero && !heldFree
          ? sampleHeroCurve(heroCurve, phaseProgress)
          : (plan._racerTargetRank.get(r.index) ?? currentRank);
      // ── ★ THE ARRIVAL — see the block above createTrajectoryController ────────────────────────
      // Everything here is inside `heldFree`, so no other role is reached.
      // (b) FREE means UNSTEERED, and it is expressed as band steering rather than as a hard 1.0:
      // inside his block `bandError` is 0, so the servo commands 1.0 anyway, and at the block's edge
      // the SAME expression is already the net. One mechanism, two jobs.
      let arrived = false;
      if (heldFree) {
        const drawnPlace = plan._racerTargetRank.get(r.index) ?? currentRank;
        if (currentRank <= drawnPlace) _arrivedAtDrawn.add(r.index);
        arrived = _arrivedAtDrawn.has(r.index);
      }
      // positive rankError = racer currently ranked worse than target → boost
      let rankError = currentRank - targetRank;
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
      // ≤ peakRank) AND (b) been steered down to finalRank in-band; from then it runs under the spatial
      // release hysteresis (free inside band, re-steer > _packReSteerThreshold ranks outside).
      // No resolve-checkpoint constraint (hero-privilege).
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
      }
      // ★ AFTER HE ARRIVES HE IS STEERED, like any other racer (ARRIVAL-STEERED-AGAIN-1,
      // 2026-09-13). He used to be put on band steering here -- `strictness = 0`, which commands 1.0
      // anywhere inside his block -- so that he would not FEEL braked on arrival. That reason is
      // gone: with the eased ceiling above he no longer arrives fighting the brake, and the owner's
      // argument is that the brake now takes hold FASTER because there is half as much to shed (the
      // ease costs the same second either way, but 1.05 -> 1.0 is half the distance of 1.10 -> 1.0).
      // What it cost was clause 2: unsteered, he opened 3.3x the pre-shape gap at twenty racers.
      // `strictness` therefore stays at the hero's 1.0 and the blend below is exact-rank steering.
      // Blended error: strictness=1.0 ≡ rankError (exact); <1.0 steers toward the band edge (loose pack).
      const error = strictness * rankError + (1 - strictness) * bandError;
      const noise = (rng() - 0.5) * 2 * plan._stochasticNoise;
      // -- HIS OWN CEILING, and nobody else's. `heldFree` is the whole gate: every other racer
      // clamps against the shipped `maxMult` exactly as before.
      let ceilFor = maxMult;
      if (heldFree && !arrived) {
        ceilFor = arrivalCeiling(rankError, maxMult);
        const o = _arrivalObs.get(r.index);
        if (o && ceilFor < maxMult && o.ceilStartRank == null) {
          o.ceilStartRank = currentRank;
          o.ceilStartMs = elapsedMs;
        }
      }
      const rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, ceilFor);
      // GAP-BRAKE-1: the leader's target is the SLOWER of the servo's and the brake's. Math.min, not
      // an override, because a brake must never speed anyone up — if the servo is already pulling him
      // back harder than the gap warrants, the servo wins and the brake is silent.
      const steerTarget =
        gapBrake != null && r.index === gapBrake.index
          ? Math.min(rawTarget, gapBrake.target)
          : rawTarget;
      // ★ IS THE BRAKE THE ONE BEING OBEYED THIS STEP? Only then does the arrival path apply, so
      // the change stays on the brake's own path: a racer the brake is not acting on, and a racer
      // whose own servo is already pulling harder than the gap warrants, both keep the shipped
      // `_setTarget` behaviour untouched.
      const brakeIsBinding =
        gapBrake != null && r.index === gapBrake.index && gapBrake.target < rawTarget;
      if (brakeIsBinding) brakeBindingNow = r.index;
      if (brakeIsBinding && brakeHeldLast === r.index) {
        // continuing pull: move the target, leave the ease running (GAP-BRAKE-ARRIVAL-1)
        _retargetInFlight(r, steerTarget);
      } else {
        _setTarget(r, steerTarget, elapsedMs);
      }

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

    // GAP-BRAKE-ARRIVAL-1: remember who the brake was obeyed on, for the next step's decision.
    _gapBrakeBindingIdx = brakeBindingNow;

    // ── Front distance leash (SIM-ONLY; gap-space brake on the runaway leader) ─────────────────────
    // Only ever runs when BOTH the plan carries leash config (sim-only) AND the caller passed the
    // leader→P2 length (sim-only). The browser passes neither ⇒ this whole block is skipped and the
    // controller is byte-identical (guarded by the fingerprint gate). No RNG here (determinism).
    // Overrides the leashed racer's trajectoryMult TARGET via the same _setTarget → 1 s slew path as
    // every other target (no new smoothing). All thresholds are FIXED internal params per the spec.
    if (plan._frontLeashMaxLengths != null && leaderGapLen != null) {
      const LEASH_LO = 0.6; // window start (OUTCOME begin)
      const LEASH_HI = 0.92; // window end (protect the run-out)
      const LEASH_HYST = 0.5; // disengage margin (lengths) below the max
      const LEASH_MIN_MULT = 0.85; // brake floor (== controllerParams.minMult; fixed per spec)
      const LEASH_FLOOR_RANK = 3; // disengage once the leashed racer has fallen to rank ≥ this
      const LEASH_MIN_GAP = 1.0; // disengage once the gap is this close (contest achieved)
      const maxLen = plan._frontLeashMaxLengths;
      const gainFrac = (plan._frontLeashGainPct ?? 0) / 100; // brake per excess length
      const inWindow =
        phaseProgress != null && phaseProgress >= LEASH_LO && phaseProgress <= LEASH_HI;
      if (!inWindow) {
        _leashEngaged = false;
        _leashTargetIdx = -1;
      } else {
        // Engage: latch onto the CURRENT rank-1 racer the first frame the gap exceeds the max.
        if (!_leashEngaged && leaderGapLen > maxLen && leaderGapLen >= LEASH_MIN_GAP) {
          _leashEngaged = true;
          _leashTargetIdx = active[0].index;
        }
        if (_leashEngaged) {
          const li = active.findIndex((r) => r.index === _leashTargetIdx); // live rank-1 of the leashed racer
          const leashedRank = li + 1; // 1-indexed; li === -1 ⇒ leashed racer finished/absent
          // Forcible disengage: contest achieved (hysteresis / min-gap) OR the leashed racer has been
          // passed down to the B1 floor OR it left the field. Otherwise apply the proportional brake.
          if (
            li < 0 ||
            leashedRank >= LEASH_FLOOR_RANK ||
            leaderGapLen < LEASH_MIN_GAP ||
            leaderGapLen < maxLen - LEASH_HYST
          ) {
            _leashEngaged = false;
            _leashTargetIdx = -1;
          } else {
            const brake = clamp(1 - gainFrac * (leaderGapLen - maxLen), LEASH_MIN_MULT, 1.0);
            _setTarget(active[li], brake, elapsedMs);
            _leashFrames++;
          }
        }
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
    const thisRacer0 = racers.find((r) => r.index === racerIndex);
    if (!thisRacer0 || thisRacer0.finished) return rawSample;

    // ── FAIR-ARRIVAL-1 ARM B: from R, AIM the re-roll DRAW toward the racer's drawn band, clamped to the
    // honest [spreadMin, spreadMax] range — nothing is fought and no position is forced, the tempo dice are
    // simply loaded toward the band. An OUT-of-band racer draws toward the near edge (catch-up / fall-back);
    // an IN-band racer keeps the free dice, so the within-band order is still decided by chance (pillar 3). ──
    if (plan._bandBias && phaseProgress != null && phaseProgress >= plan._bandBias.R) {
      let rank = 1;
      for (const o of racers) if (!o.finished && o.t > thisRacer0.t) rank++;
      const [bbLo, bbHi] = getAreaBounds(plan._racerTargetRank.get(racerIndex) ?? rank);
      const bandErr = rank < bbLo ? rank - bbLo : rank > bbHi ? rank - bbHi : 0;
      if (bandErr === 0) return rawSample; // in band → free dice
      const biased = clamp(rawSample + plan._bandBias.gain * bandErr, spreadMin, spreadMax);
      _pulkBiasDeltaSum += Math.abs(biased - rawSample);
      _pulkBiasEventCount += 1;
      return biased;
    }

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
   * Gap-cap re-roll bias (docs/CONCEPT-COHESION.md "loaded dice within the honest range").
   * SIM-ONLY: activated only when the plan carries a gapReroll threshold (the browser never sets it,
   * so this early-returns rawSample there → byte-identical). PURE: a deterministic function of the
   * already-drawn rawSample + live race state + config, using NO new RNG. computePulkBiasedTarget's
   * behavior is untouched; this is a separate, phase-disjoint transform (OUTCOME window vs PULK).
   *
   * NORMATIVE DIRECTION (also the corrected CONCEPT-COHESION table):
   *   • arc gap TO THE RACER BEHIND > G  (opened a hole behind itself) → shift toward the SLOWER edge.
   *   • symmetric mode only: arc gap TO THE RACER AHEAD > G (dropped) → shift toward the FASTER edge.
   *   • all gaps ≤ G → bit-exact no-op (rawSample passes through unchanged).
   * Strength: the draw moves toward the relevant band edge by min(1, strength·(gap−G)) of the remaining
   * distance to that edge; always clamped to the honest [spreadMin, spreadMax] band, never beyond.
   *
   * Window (config-derived, zero hardcoded constants): fires only for scheduled rolls at/after the LIVE
   * choreoOutcomeStart (corrStartFrac) whose easeInOutCubic transition can settle before the schedule's
   * OWN last-roll deadline (passed in as lastRollDeadlineMs − transitionDur; same realized-duration basis
   * as elapsedMs). Both bounds move with config; the transform never re-derives a duration itself.
   *
   * @param {number} racerIndex   racer being re-rolled
   * @param {number} rawSample    the (already PULK-biased) pre-clamp draw
   * @param {number} spreadMin    BASE_SPEED_MIN / BASE_SPEED_MEAN (slow band edge)
   * @param {number} spreadMax    BASE_SPEED_MAX / BASE_SPEED_MEAN (fast band edge)
   * @param {Array}  racers       all racers
   * @param {number} elapsedMs    fire time of this roll
   * @param {number} phaseProgress leader-progress fraction [0,1]
   * @param {number} lenScale     govLenScale (arc t → racer lengths); ≤0 or null ⇒ passthrough
   * @param {boolean} isOpen      track topology (lap-aware arcT)
   * @param {number} lastRollDeadlineMs the harness's own realized-duration last-roll deadline (ms);
   *                 null ⇒ no upper cap. The ONE duration basis in the window-end comparison.
   * @returns {number} biased pre-clamp value; caller applies the final band clamp
   */
  function computeGapBiasedTarget(
    racerIndex,
    rawSample,
    spreadMin,
    spreadMax,
    racers,
    elapsedMs,
    phaseProgress,
    lenScale,
    isOpen,
    lastRollDeadlineMs
  ) {
    const G = plan._gapRerollThresholdLengths;
    if (G == null || !(lenScale > 0)) return rawSample; // feature OFF → byte-identical passthrough
    // ── Window (derived; never hardcoded) ──
    if (phaseProgress == null || phaseProgress < corrStartFrac) return rawSample; // before choreoOutcomeStart
    // Upper bound derived from the SCHEDULE'S OWN clock: the harness passes lastRollDeadlineMs (built from
    // realizedDurationSec — the SAME basis elapsedMs runs on), so there is ONE duration basis in this
    // comparison. Deriving it from plan._targetDurationMs instead was the bug: on closed tracks realized
    // duration > target, so a target-based end excluded every in-window roll (0 biased rolls). The transform
    // NEVER re-derives a duration itself. A biased roll's transition must settle before that deadline.
    if (lastRollDeadlineMs != null) {
      const windowEndMs = lastRollDeadlineMs - plan._reRollTransitionDurationMs;
      if (elapsedMs > windowEndMs) return rawSample;
    }
    const self = racers.find((r) => r.index === racerIndex);
    if (!self || self.finished) return rawSample;
    // This roll is inside the window for this racer (telemetry denominator for the duty-cycle).
    _gapWindowRollsByRacer.set(racerIndex, (_gapWindowRollsByRacer.get(racerIndex) ?? 0) + 1);
    // Live order by t desc: the immediate neighbours ahead (higher t) and behind (lower t).
    const live = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t || a.index - b.index);
    const pos = live.findIndex((r) => r.index === racerIndex);
    const behind = pos >= 0 && pos < live.length - 1 ? live[pos + 1] : null;
    const ahead = pos > 0 ? live[pos - 1] : null;
    const gapBehind = behind ? arcT(self.t, behind.t, isOpen) * lenScale : 0; // hole opened behind self
    const gapAhead = ahead ? arcT(ahead.t, self.t, isOpen) * lenScale : 0; // self dropped behind ahead
    const strength = plan._gapRerollStrength;
    // BRANCH PRIORITY (correctness fix). When BOTH gaps exceed G the LARGER IMBALANCE decides the
    // direction. Previously `gapBehind > G` returned unconditionally, so a racer that had broken from
    // the pack — opening a hole behind itself while still far behind the leader — was tilted SLOWER,
    // structurally suppressing the chase. The diagnostic found this misdirection firing 6.6x more
    // often at small G, which is exactly where the span lever wants to operate. Ties keep the old
    // gapBehind-first behaviour, so only the genuinely misdirected cases change.
    if (gapBehind > G && gapBehind >= gapAhead) {
      const frac = Math.min(1, strength * (gapBehind - G));
      _gapBiasEvents++;
      _gapBiasByRacer.set(racerIndex, (_gapBiasByRacer.get(racerIndex) ?? 0) + 1);
      _gapDownTilts++;
      _gapDownGapAheadSum += gapAhead;
      _gapDownGapBehindSum += gapBehind;
      if (gapAhead > gapBehind) _gapDownAheadGtBehind++;
      if (pos === 0) {
        _gapDownLeader++;
        // Read-only escape-latency capture (see _gapLeaderDownEvents). Written only for the LIVE
        // leader; does not touch rawSample, spreadMin/Max or any RNG.
        _gapLeaderDownEvents.push({
          p: phaseProgress,
          gapLen: gapBehind,
          frac,
          delta: frac * (rawSample - spreadMin),
        });
      } else if (pos <= 4) _gapDownChaser++;
      else _gapDownPack++;
      return clamp(rawSample - frac * (rawSample - spreadMin), spreadMin, spreadMax); // toward SLOWER
    }
    // In 'down' mode the up direction does not exist, so a racer whose gapAhead is the larger
    // imbalance now receives NO tilt rather than a misdirected slow-down. That is the point of the
    // fix: the old behaviour actively braked the chase it was meant to leave alone.
    if (plan._gapRerollMode === 'symmetric' && gapAhead > G) {
      const frac = Math.min(1, strength * (gapAhead - G));
      _gapBiasEvents++;
      _gapBiasByRacer.set(racerIndex, (_gapBiasByRacer.get(racerIndex) ?? 0) + 1);
      _gapUpTilts++;
      return clamp(rawSample + frac * (spreadMax - rawSample), spreadMin, spreadMax); // toward FASTER
    }
    return rawSample; // dead zone (≤ G) → bit-exact no-op
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
      // Attacker-release diagnostics (0 when no attackers are cast — no transitions ever fire).
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
      // ★ E-variant diagnostics (all 0 under A–D). netFrameFraction is the question the owner's
      // addendum asks: OFTEN means band steering is a second hold, RARELY means it is a net.
      // ★ One row per held comebacker: his drawn place, the pace he carried across it, the peak gap
      // he opened while leading, and how far he drifted afterwards. The arm-vs-arm table is built
      // from these; they are recorded identically under every variant.
      arrivalObs: [..._arrivalObs.values()].map((o) => ({ ...o })),
      eArrivalMults: [..._arrivalObs.values()].map((o) => o.arrivalMult).filter((m) => m != null),
      // Front-leash diagnostic (0 when OFF / never engaged): frames the leader brake was applied.
      leashFrames: _leashFrames,
      // Gap-cap re-roll diagnostics (0 when OFF): total biased rolls this race + the leader duty-cycle
      // (the MAX over racers of biased/window rolls — the "one racer repeatedly held" watch, per CONCEPT-COHESION).
      gapBiasedRolls: _gapBiasEvents,
      // Window-eligible rolls this race (the duty-cycle denominator; the STOP-gate signal that the window
      // is non-empty on a track — 0 on closed tracks was the bug this fix resolves).
      gapWindowRolls: (() => {
        let s = 0;
        for (const [, w] of _gapWindowRollsByRacer) s += w;
        return s;
      })(),
      gapLeaderDutyCycle: (() => {
        let mx = 0;
        for (const [idx, w] of _gapWindowRollsByRacer) {
          if (w > 0) {
            const r = (_gapBiasByRacer.get(idx) ?? 0) / w;
            if (r > mx) mx = r;
          }
        }
        return mx;
      })(),
      // Branch-fire split (small-G chase-suppression diagnostic; 0 when OFF). gapDownAheadGtBehind is
      // the smoking gun: DOWN-tilts applied to a racer whose gap to the racer AHEAD already exceeded
      // its gap to the racer behind — i.e. a chaser being slowed down instead of let go.
      gapDownTilts: _gapDownTilts,
      gapUpTilts: _gapUpTilts,
      gapDownAheadGtBehind: _gapDownAheadGtBehind,
      gapDownLeader: _gapDownLeader,
      gapDownChaser: _gapDownChaser,
      gapDownPack: _gapDownPack,
      gapDownGapAheadMean: _gapDownTilts > 0 ? _gapDownGapAheadSum / _gapDownTilts : 0,
      gapDownGapBehindMean: _gapDownTilts > 0 ? _gapDownGapBehindSum / _gapDownTilts : 0,
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
    // The arrival latch is per-RACE state, not telemetry, but this block is the only per-race reset
    // the controller has ("call once per race"), so it belongs here. A controller that outlived a
    // race would otherwise carry "he has already arrived" into the next one and free him at the
    // start. No-op while every race builds its own controller; correct if one ever does not.
    _arrivedAtDrawn.clear();
    _arrivalObs.clear();
    _leashFrames = 0;
    _leashEngaged = false;
    _leashTargetIdx = -1;
    _gapBiasEvents = 0;
    _gapWindowRollsByRacer.clear();
    _gapBiasByRacer.clear();
    _gapDownTilts = 0;
    _gapUpTilts = 0;
    _gapDownAheadGtBehind = 0;
    _gapDownLeader = 0;
    _gapDownChaser = 0;
    _gapDownPack = 0;
    _gapDownGapAheadSum = 0;
    _gapDownGapBehindSum = 0;
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
    computeGapBiasedTarget,
    // CHAOS-STEER-1 read-only per-race telemetry. inBandEnd = the direct Part-1 scorecard (index → in
    // drawn band at chaos end), captured for EVERY arm; ticks/meanMult = grip; maxTickDelta = Sanftheits.
    getChaosSteerStats: () => ({
      inBandEnd: [..._chaosSteerInBandEnd.entries()],
      steeredTicks: _chaosSteerTicks,
      steeredRacers: _chaosSteerRacers.size,
      meanMult: _chaosSteerTicks ? _chaosSteerMultSum / _chaosSteerTicks : null,
      maxTickDelta: _chaosSteerMaxTickDelta,
      byRacer: [..._chaosSteerByRacer.entries()], // [index, {ticks, multSum}] — per-row skew join
    }),
    // SCREEN escape-latency: how many DOWN-tilts have hit the LIVE LEADER so far. Read per frame by
    // the sim so it can freeze escapeDepth (the max P1->P2 gap reached BEFORE the first correction)
    // at the exact moment the first one fires. Read-only accessor, no state change.
    getGapLeaderDownCount: () => _gapDownLeader,
    // The per-event log itself. Deliberately NOT part of collectTelemetry(): that call RESETS its
    // counters and is invoked earlier in the sim's race-teardown than the escape-latency record is
    // written, and its result is aggregated/averaged downstream where an array field would be
    // meaningless. This getter neither resets nor mutates; the copy stops a consumer editing state.
    // Controllers are constructed per race, so the log cannot accumulate across races.
    getGapLeaderDownEvents: () => _gapLeaderDownEvents.map((e) => ({ ...e })),
    // GAP-BRAKE-1 read-only telemetry. Deliberately NOT part of collectTelemetry(), which RESETS
    // its counters — this getter neither resets nor mutates, so a caller can read it at any point.
    // `minFiringGapPx` is the one that matters: it must never be <= the configured allowance.
    getGapBrakeStats: () => ({
      enabled: plan._gapBrakeEnabled,
      allowedGapPx: plan._gapBrakeAllowedGapPx,
      windowStart: corrStartFrac,
      windowEnd: plan._gapBrakeWindowEnd,
      windowFrames: _gapBrakeWindowFrames,
      firedFrames: _gapBrakeFrames,
      minMultCommanded: _gapBrakeMinMult,
      maxGapPxInWindow: _gapBrakeMaxGapPx,
      minFiringGapPx: _gapBrakeMinFiringGapPx,
      gapsAtFire: _gapBrakeGapsAtFire.slice(),
      // ── GAP-BRAKE-RATE-1 ──────────────────────────────────────────────────────────────────
      // `minEngageGapPx` is the one that answers the owner's gate question: the smallest gap at
      // which the brake ever ENGAGED, which must never be at or below the allowance.
      // `minFiringGapPx` above is a DIFFERENT number now and is deliberately allowed to be
      // smaller: once engaged the brake follows the gap down past the allowance as it fades, so
      // the smallest gap it ever WROTE at is a fade-out value, not a gate breach.
      maxAuthority: plan._gapBrakeMaxAuthority,
      rateWindowMs: plan._gapBrakeRateWindowMs,
      minEngageGapPx: _gapBrakeMinEngageGapPx,
      maxStrength: _gapBrakeMaxStrength,
      // The live state, so a harness can trace the mechanism step by step without a second copy
      // of the law. Read-only; this getter never resets or mutates.
      engaged: _gapBrakeEngaged,
      // The racer the brake's command was the value actually OBEYED on last step, or -1. Engaged is
      // not the same question: the brake can be engaged and silent, because the fold takes the
      // SLOWER of the servo's target and the brake's and the servo often already asks for less.
      bindingIdx: _gapBrakeBindingIdx,
      strength: _gapBrakeStrength,
      smoothedGapPx: _gapBrakeSmoothedGapPx,
      dGapPx: _gapBrakeLastDGapPx,
    }),
    getPhase,
    getPhaseFractions,
    // Diagnostics-only: the retained index→role map (null until heroes are cast). Read by GovernorDiagHUD.
    getHeroRoles: () => plan._heroRoles ?? null,
    // Diagnostics-only: index → release progress for HELD heroes (null until heroes are cast, empty
    // when none was cast). The role label alone cannot tell a HELD comebacker from the fall-back
    // one — both are 'comebacker' — and an instrument that guessed from the race would be guessing.
    getHeldRelease: () => plan._heldRelease ?? null,
    // The DRAWN place for one racer. Read-only, for the browser hold probe, which otherwise has no
    // way to say "two ranks before his place" without recomputing the thing it is observing.
    getTargetRank: (index) => plan._racerTargetRank?.get(index) ?? null,
    // B4a: the full authored cameraPlan (null until heroes are cast). Delivered to the CameraDirector,
    // which passes it to comebackDetector.setPlan — where the ROLES are consumed and the BEATS are
    // DISCARDED. See the note at the assignment of `_cameraPlan` above; the open point is
    // docs/BACKLOG.md PART TWO D14.
    getCameraPlan: () => plan._cameraPlan ?? null,
    collectTelemetry,
    seed: plan.seed,
  };
}
