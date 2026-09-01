// ============================================================
// File:        scripts/parity/goldenRunner.mjs
// Project:     RaceArena — golden equality harness (fix-plan step 6)
//
// WHAT THIS IS: two arms that take the SAME race identity and each derive the race the way
// their own side does, then run the shared per-frame loop and emit an outcome hash.
//
//   browserArm() — derives inputs exactly as SetupScreen + RaceScreen do:
//                  the browser CONFIG LOADERS (loadBaseSpeedConfig / loadRaceDynamicsConfig /
//                  loadRaceBehaviorConfig), trackDefaultLaps / trackDefaultSeconds, the canonical
//                  duration model, and RaceScreen's own `dynamicsConfig.X ?? fallback` plan wiring
//                  keyed on realizedDurationSec * 1000.
//   simArm()     — derives inputs exactly as sim-fairness.mjs's combo loop does:
//                  the DEFAULT_* config objects, the CLI's laps/seconds resolution, and the sim's
//                  own plan wiring keyed on its realizedDurationSec * 1000.
//
// SCOPE — READ THIS BEFORE TRUSTING A GREEN RESULT. browserArm and simArm share the per-frame loop
// (`runSingleRace`): the forces have been single-sourced since FORCE-PARITY, and re-implementing
// that loop here would only test the re-implementation. What those two arms genuinely test is the
// INPUT DERIVATION CHAIN — the layer where every divergence has actually lived (D-GRID, D-STREAM,
// D-DUR, O1) — plus end-to-end determinism. A green browserArm==simArm means: given one identity, the
// browser's derivation and the sim's derivation produce the same race, checkpoint for checkpoint.
// It does NOT mean two independent physics implementations agree, because there is only one.
//
// realArm (ARM C) closes that gap. It runs the REAL RaceScreen init + per-step advance, extracted into
// client/src/modules/raceCore.js (createRaceFromIdentity + stepRacePhysics), which RaceScreen renders
// THROUGH — so realArm executes the browser's own loop, not the sim's. realArm therefore DIVERGES from
// simArm wherever the browser genuinely differs (D-INIT per-step order; D-RUNOUT finished handling —
// see DIVERGENCE-AUDIT.md §2f). Use browserArm==simArm for the derivation guard; use realArm to see the
// real browser↔sim residual.
//
// Imported by client/src/modules/parity/goldenEquality.test.js and scripts/parity/soak.mjs.
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { EditorShape } from "../../client/src/modules/track-editor/EditorShape.js";
import { runSingleRace } from "../sim-fairness.mjs";
import {
  makeRaceRng,
  createRacePlan,
  createTrajectoryController,
} from "../../client/src/modules/racePlanner.js";
import {
  computeEvenRowLayout,
  computeRacerLayout,
  computeBodyNarrowRef,
  computeStartRowCount,
} from "../../client/src/modules/rowLayout.js";
import { loadRowLayoutConfig } from "../../client/src/modules/rowLayoutConfig.js";
import {
  createRaceFromIdentity,
  stepRacePhysics,
} from "../../client/src/modules/raceCore.js";
import {
  deriveRaceDuration,
  normalSpeedFrom,
  paceSpeedPxPerSec,
  trackDefaultLaps,
  trackDefaultSeconds,
} from "../../client/src/modules/durationModel.js";
import { loadBaseSpeedConfig } from "../../client/src/modules/baseSpeedConfig.js";
import { loadRaceDynamicsConfig } from "../../client/src/modules/raceDynamicsConfig.js";
import { loadRaceBehaviorConfig } from "../../client/src/modules/raceBehaviorConfig.js";
import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_BASE_SPEED_CONFIG,
} from "../../client/src/modules/storage/defaults.js";
import { DEFAULT_AUTO_SCALE_CONFIG } from "../../client/src/modules/autoSpriteScale.js";
import {
  hashWorld,
  WORLD_SCHEMA_VERSION,
} from "../../client/src/modules/raceConfigWorld.js";
import {
  CHECKPOINT_INTERVAL_MS,
  hashTrackGeometry,
  hashRoster,
  makeRaceIdentity,
  makeRaceOutcome,
  hashOutcome,
} from "../../client/src/modules/parity/raceIdentity.js";
import { QUICK_TEST_NAMES } from "../../client/src/modules/racerNames.js";
import { racerFacts } from "../lib/racerFacts.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The 10 shipped tracks with their default racer type — the soak's track axis. */
export const TRACKS = [
  ["city-circuit", "motorbike"],
  ["dirt-oval", "horse"],
  ["garden-path", "snail"],
  ["ice-track", "snowmobile"],
  ["luger-hill", "luge"],
  ["mountainstreet", "boarder"],
  ["river-run", "duck"],
  ["searound", "manta"],
  ["seatrack", "dolphin"],
  ["space-sprint", "rocket"],
];

/**
 * Racer-type physical config for the types the soak uses.
 *
 * ── THE PHYSICAL FIELDS ARE READ FROM THE REGISTRY, NOT COPIED ─────────────────────────────────
 *
 * `client/src/modules/racer-types/` is the one authority for a racer's physical facts, and as of
 * 2026-09-02 (REGISTRY-LITERALS-1) `speedMultiplier`, `displaySize`, `bodyFillX` and `bodyFillY`
 * are IMPORTED rather than restated. There is nothing here to edit and nothing here to drift.
 *
 * WHY THE COPIES WENT. Until 2026-09-01 this comment claimed the table "mirrors sim-fairness's
 * RACER_CONFIGS". It did not: five of ten entries (snail, motorbike, duck, luge, boarder) were round
 * hand-written approximations left behind by a partial refresh, and the false claim of a mirror is
 * what made them look authoritative. That cost two blocks — a reader took the stale duck as the
 * product's, and the report correcting them then made a false absence claim about these tables.
 * SPRITE-TABLE-DRIFT-1 diagnosed it; GOLDEN-TABLE-REGISTRY-1 corrected the five; a drift guard was
 * proposed and HELD, and REGISTRY-IMPORT-FEASIBILITY-1 then showed the copies need not exist at all.
 *
 * THE OWNER'S REASONING FOR IMPORTING RATHER THAN GUARDING: a golden going red when a racer changes
 * is the correct loud signal, where a literal drifting silently is not. The cost is accepted and
 * named — a racer-type edit now MOVES these races instead of being ignored by them.
 *
 * WHY NOT `.config` DIRECTLY: `index.js` applies stored Dev-Screen tunable overrides at module load
 * and mutates `type.config` in place, and two of the four fields are tunable. `scripts/lib/racerFacts.mjs`
 * reads the frozen pre-override snapshot instead, so a developer's local tuning cannot change what
 * this soak measures. That module carries the full rule.
 *
 * `surfaceClasses` below is NOT the registry's surface list and is deliberately NOT imported: it is
 * never read from this table (checked), and the registry's field means "which surfaces this type may
 * race on", which is a different question from the soak's one-tag-per-track pairing. It has no other
 * home in the tree, which is why it stays a literal here.
 */
export const RACER_CONFIGS = {
  horse: { ...racerFacts("horse"), surfaceClasses: ["earth"] },
  rocket: { ...racerFacts("rocket"), surfaceClasses: ["space"] },
  snail: { ...racerFacts("snail"), surfaceClasses: ["garden"] },
  motorbike: { ...racerFacts("motorbike"), surfaceClasses: ["asphalt"] },
  duck: { ...racerFacts("duck"), surfaceClasses: ["water"] },
  luge: { ...racerFacts("luge"), surfaceClasses: ["ice", "snow"] },
  boarder: { ...racerFacts("boarder"), surfaceClasses: ["snow"] },
  manta: { ...racerFacts("manta"), surfaceClasses: ["water"] },
  dolphin: { ...racerFacts("dolphin"), surfaceClasses: ["water"] },
  snowmobile: { ...racerFacts("snowmobile"), surfaceClasses: ["snow", "ice", "earth"] },
};

const trackCache = new Map();

/** Load a shipped track seed + its EditorShape, memoised. */
export function loadTrack(trackId) {
  if (trackCache.has(trackId)) return trackCache.get(trackId);
  const track = JSON.parse(
    readFileSync(join(ROOT, `server/seeds/tracks/${trackId}.json`), "utf8"),
  );
  const shape = new EditorShape(track);
  const ctx = {
    trackId,
    track,
    shape,
    isOpen: !!shape.isOpen,
    pathLengthPx: track.pathLengthPx ?? shape.getTotalLength(),
    geometricTrackWidth: track.width ?? shape.getActualTrackWidth(),
    trackGeometryHash: hashTrackGeometry(track),
  };
  trackCache.set(trackId, ctx);
  return ctx;
}

/** A deterministic roster of N names — the browser's Quick-Test fill, in order. */
export function rosterOf(n) {
  return Array.from({ length: n }, (_, i) => ({
    name: QUICK_TEST_NAMES[i] ?? `Racer${i}`,
  }));
}
export const RACER_NAMES = QUICK_TEST_NAMES;

/** The world hash both arms stamp into the identity (shipped defaults — no export loaded). */
export function shippedWorldHash() {
  return hashWorld({
    schemaVersion: WORLD_SCHEMA_VERSION,
    note: "shipped-defaults",
  }).full;
}

/**
 * Build a race identity for a track/type/shape combination.
 *
 * @param {object} p
 * @param {string} p.trackId
 * @param {string} p.racerType
 * @param {number} p.seed
 * @param {number} p.nRacers
 * @param {'closed'|'open-in-range'|'open-slowdown'} p.shape
 * @param {number} [p.laps]  explicit lap count for closed shapes
 * @returns {object} identity
 */
export function buildIdentity({
  trackId,
  racerType,
  seed,
  nRacers,
  shape,
  laps,
}) {
  const ctx = loadTrack(trackId);
  const cfg = RACER_CONFIGS[racerType];
  const V = normalSpeedFrom(DEFAULT_BASE_SPEED_CONFIG);
  const pace = paceSpeedPxPerSec(V, cfg.speedMultiplier);
  const runout = DEFAULT_RACE_BEHAVIOR_CONFIG.runoutZone;

  let identityLaps = null;
  let requestedSeconds = null;
  if (ctx.isOpen) {
    const natMax = ((1 - runout) * ctx.pathLengthPx) / pace;
    requestedSeconds =
      shape === "open-slowdown"
        ? Math.ceil(natMax * 1.5) // deliberately past the ceiling → uniform slowdown
        : Math.max(10, Math.floor(natMax * 0.6)); // comfortably in range
  } else {
    identityLaps = laps ?? trackDefaultLaps(ctx.track);
  }

  // The racePlanEnabled gate, evaluated exactly as both sides evaluate it.
  const model = deriveRaceDuration({
    isOpen: ctx.isOpen,
    pathLengthPx: ctx.pathLengthPx,
    laps: identityLaps ?? 1,
    requestedSeconds: requestedSeconds ?? 0,
    normalSpeedPxPerSec: V,
    speedMultiplier: cfg.speedMultiplier,
    runoutZone: runout,
  });
  const racePlanEnabled =
    model.realizedDurationSec >=
    (DEFAULT_RACE_DYNAMICS_CONFIG.racePlanMinDurationSec ?? 30);

  return {
    ...makeRaceIdentity({
      seed,
      nRacers,
      isOpen: ctx.isOpen,
      laps: identityLaps,
      requestedSeconds,
      racePlanEnabled,
      speedMultiplier: cfg.speedMultiplier,
      worldHash: shippedWorldHash(),
      trackGeometryHash: ctx.trackGeometryHash,
      rosterHash: hashRoster(rosterOf(nRacers)),
    }),
    // carried alongside the hashed identity so a runner can resolve the track/type without a lookup
    _trackId: trackId,
    _racerType: racerType,
    _shape: shape,
  };
}

// ── Plan config, as each side builds it ──────────────────────────────────────────────────────
// Written twice ON PURPOSE: the browser reads `dynamicsConfig.X ?? fallback` (RaceScreen
// index.jsx), the sim reads its CLI vars which default to DEFAULT_RACE_DYNAMICS_CONFIG. If those
// two mappings ever drift, the golden test must catch it — a shared helper here would hide it.

function browserPlanConfig(dynamicsConfig) {
  return {
    bonusStrengthMultiplier:
      dynamicsConfig.racePlanBonusStrengthMultiplier ?? 2.0,
    phaseSplitBonusEnabled: dynamicsConfig.phaseSplitBonusEnabled ?? false,
    areaBonusEarly: dynamicsConfig.areaBonusEarly ?? 1.0,
    areaBonusPulk: dynamicsConfig.areaBonusPulk ?? 0,
    areaBonusPost: dynamicsConfig.areaBonusPost ?? 1.0,
    pulkStart:
      dynamicsConfig.racePlanPulkStart ??
      DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart,
    bonusTransitionEnd: dynamicsConfig.racePlanBonusTransitionEnd ?? 0.75,
    bonusFadeDuration: dynamicsConfig.racePlanBonusFadeDuration ?? 1500,
    corridorStart: dynamicsConfig.racePlanCorridorStart ?? 0.55,
    corridorEnd: dynamicsConfig.racePlanCorridorEnd ?? 1.0,
    pulkBiasGain: dynamicsConfig.pulkBiasGain ?? 2.0,
    choreoIntensity: dynamicsConfig.choreoIntensity ?? 0.6,
    choreoPackBandStrictness: dynamicsConfig.choreoPackBandStrictness ?? 0.5,
    choreoReleaseProgress: dynamicsConfig.choreoReleaseProgress ?? 0.97,
    choreoResolveB2: dynamicsConfig.choreoResolveB2 ?? 0.8,
    choreoResolveB3: dynamicsConfig.choreoResolveB3 ?? 0.7,
    choreoResolveB4: dynamicsConfig.choreoResolveB4 ?? 0.65,
    choreoResolveB5: dynamicsConfig.choreoResolveB5 ?? 0.6,
    choreoOutcomeStart:
      dynamicsConfig.choreoOutcomeStart ??
      DEFAULT_RACE_DYNAMICS_CONFIG.choreoOutcomeStart,
    packReSteerThreshold: dynamicsConfig.packReSteerThreshold ?? 1.0,
    b2AttackHeroes:
      dynamicsConfig.b2AttackHeroes ??
      DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes,
    b2AttackPeakRank: dynamicsConfig.b2AttackPeakRank ?? 5,
    b2AttackFinalRank:
      dynamicsConfig.b2AttackFinalRank ??
      DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackFinalRank,
    b2AttackProgress: dynamicsConfig.b2AttackProgress ?? {
      start: 0.4,
      end: 0.7,
    },
    b2AttackResolveProgress: dynamicsConfig.b2AttackResolveProgress ?? 0.85,
    b2AttackBandArrival: dynamicsConfig.b2AttackBandArrival ?? true,
    gapRerollThresholdLengths: dynamicsConfig.gapRerollEnabled
      ? (dynamicsConfig.gapRerollThresholdLengths ??
        DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollThresholdLengths)
      : null,
    gapRerollMode: dynamicsConfig.gapRerollMode ?? "symmetric",
    gapRerollStrength: dynamicsConfig.gapRerollStrength ?? 1.0,
    reRollTransitionDuration: dynamicsConfig.reRollTransitionDuration,
    // COMBO15 fair-arrival mechanism — mirror of raceCore's createRacePlan wiring (kept in sync per the
    // "written twice" note). chaosSteer/bandBias are shipped defaults; OFF ⇒ null in the plan ⇒ pre-combo15.
    chaosSteer: dynamicsConfig.chaosSteer ?? false,
    chaosSteerGain: dynamicsConfig.chaosSteerGain ?? 0.06,
    bandBias: dynamicsConfig.bandBias ?? false,
    bandBiasR: dynamicsConfig.bandBiasR ?? 0.8,
    bandBiasGain: dynamicsConfig.bandBiasGain ?? 0.06,
  };
}

function simPlanConfig(DYN) {
  return {
    bonusStrengthMultiplier: DYN.racePlanBonusStrengthMultiplier,
    phaseSplitBonusEnabled: DYN.phaseSplitBonusEnabled,
    areaBonusEarly: DYN.areaBonusEarly,
    areaBonusPulk: DYN.areaBonusPulk,
    areaBonusPost: DYN.areaBonusPost,
    pulkStart: DYN.racePlanPulkStart,
    bonusTransitionEnd: DYN.racePlanBonusTransitionEnd,
    bonusFadeDuration: DYN.racePlanBonusFadeDuration,
    corridorStart: DYN.racePlanCorridorStart,
    corridorEnd: DYN.racePlanCorridorEnd,
    pulkBiasGain: DYN.pulkBiasGain,
    choreoIntensity: DYN.choreoIntensity,
    choreoPackBandStrictness: DYN.choreoPackBandStrictness,
    choreoReleaseProgress: DYN.choreoReleaseProgress,
    choreoResolveB2: DYN.choreoResolveB2,
    choreoResolveB3: DYN.choreoResolveB3,
    choreoResolveB4: DYN.choreoResolveB4,
    choreoResolveB5: DYN.choreoResolveB5,
    choreoOutcomeStart: DYN.choreoOutcomeStart,
    packReSteerThreshold: DYN.packReSteerThreshold,
    b2AttackHeroes: DYN.b2AttackHeroes,
    b2AttackPeakRank: DYN.b2AttackPeakRank,
    b2AttackFinalRank: DYN.b2AttackFinalRank,
    b2AttackProgress: DYN.b2AttackProgress,
    b2AttackResolveProgress: DYN.b2AttackResolveProgress,
    b2AttackBandArrival: DYN.b2AttackBandArrival,
    gapRerollThresholdLengths: DYN.gapRerollEnabled
      ? DYN.gapRerollThresholdLengths
      : null,
    gapRerollMode: DYN.gapRerollMode,
    gapRerollStrength: DYN.gapRerollStrength,
    reRollTransitionDuration: DYN.reRollTransitionDuration,
    contestWindowStart: DYN.contestWindowStart,
    // COMBO15 (MERGE-SHIP-1): the FAIR-ARRIVAL mechanism is a shipped default — thread it here too so the sim
    // arm matches the real browser arm (raceCore) under the new defaults. Mirrors browserPlanConfig.
    chaosSteer: DYN.chaosSteer ?? false,
    chaosSteerGain: DYN.chaosSteerGain ?? 0.06,
    bandBias: DYN.bandBias ?? false,
    bandBiasR: DYN.bandBiasR ?? 0.8,
    bandBiasGain: DYN.bandBiasGain ?? 0.06,
  };
}

/** Shared execution: identical from here down — the per-frame loop is single-sourced. */
function execute({
  ctx,
  cfg,
  identity,
  model,
  planConfig,
  behaviorConfig,
  laps,
  requestedSeconds,
}) {
  const { seed, nRacers } = identity;
  const effectiveWidth =
    ctx.geometricTrackWidth * behaviorConfig.startSpreadRange;
  // D-ROWCOUNT: use the ONE shared start-row count (rowLayout.js) — the browser's formula, which disagrees
  // with computeRacerLayout.rowCount for small sprites (dolphin: 4 vs 3). createRaceFromIdentity uses it too.
  const physicalSpriteSize = computeRacerLayout(
    effectiveWidth,
    nRacers,
    cfg.displaySize,
    DEFAULT_AUTO_SCALE_CONFIG,
  ).spriteSize;
  const totalRows = computeStartRowCount(
    effectiveWidth,
    nRacers,
    physicalSpriteSize,
  );

  const raceRng = makeRaceRng(seed).physics;
  const rowLayout = computeEvenRowLayout(nRacers, totalRows, raceRng);

  let racePlanController = null;
  let racerTargetRankMap = null;
  if (identity.racePlanEnabled) {
    const planRacers = rowLayout.assignments
      .map((a) => ({ index: a.racerIndex, startRowIndex: a.rowIndex }))
      .sort((x, y) => x.index - y.index);
    const plan = createRacePlan(
      planRacers,
      model.finishT,
      model.realizedDurationSec * 1000,
      planConfig,
      seed,
    );
    racePlanController = createTrajectoryController(plan);
    racerTargetRankMap = plan._racerTargetRank;
  }

  const checkpoints = new Map();
  let nextCp = CHECKPOINT_INTERVAL_MS;
  const frameHook = (raceTs, _diag, racers) => {
    if (raceTs >= nextCp) {
      const arr = new Array(nRacers).fill(null);
      for (const r of racers) arr[r.index] = r.t;
      checkpoints.set(nextCp, arr);
      nextCp += CHECKPOINT_INTERVAL_MS;
    }
  };

  const results = runSingleRace({
    shape: ctx.shape,
    pathLengthPx: ctx.pathLengthPx,
    geometricTrackWidth: ctx.geometricTrackWidth,
    isOpen: ctx.isOpen,
    speedMultiplier: cfg.speedMultiplier,
    displaySize: cfg.displaySize,
    bodyFillX: cfg.bodyFillX,
    bodyFillY: cfg.bodyFillY,
    // The arm's OWN resolved inputs — never re-read from the identity here. If these could
    // drift from what the model above was derived from, the harness would compare a race
    // against a model of a different race and could report false parity.
    laps,
    requestedSeconds,
    normalSpeedPxPerSec: normalSpeedFrom(DEFAULT_BASE_SPEED_CONFIG),
    seed,
    nRacers,
    raceRng,
    rowLayout,
    // D-NAME: hand the sim the SAME roster the browser races (the avoidance symmetry tiebreak keys on
    // r.name). Without this, arm A/B would race an `R{i+1}` roster while the real browser races these.
    racerNames: rosterOf(nRacers).map((r) => r.name),
    behaviorConfigOverrides: { isOpen: ctx.isOpen },
    racePlanController,
    racerTargetRankMap,
    frameHook,
  });

  const outcome = makeRaceOutcome({ results, checkpoints });
  return { outcome, hash: hashOutcome(outcome), model, results };
}

/**
 * ARM A, derivation only — the browser's duration scalars, WITHOUT running the race.
 * Split out so the cheap parity assertions (scalar equality) do not pay for a full race.
 */
export function browserModel(identity) {
  const ctx = loadTrack(identity._trackId);
  const cfg = RACER_CONFIGS[identity._racerType];
  const baseSpeedConfig = loadBaseSpeedConfig();
  const behaviorConfig = loadRaceBehaviorConfig();
  const V = normalSpeedFrom(baseSpeedConfig);
  const pace = paceSpeedPxPerSec(V, cfg.speedMultiplier);
  return deriveRaceDuration({
    isOpen: ctx.isOpen,
    pathLengthPx: ctx.pathLengthPx,
    laps: identity.isOpen ? 1 : (identity.laps ?? trackDefaultLaps(ctx.track)),
    requestedSeconds: identity.isOpen
      ? (identity.requestedSeconds ??
        trackDefaultSeconds(
          ctx.track,
          ctx.pathLengthPx,
          pace,
          behaviorConfig.runoutZone,
        ))
      : 0,
    normalSpeedPxPerSec: V,
    speedMultiplier: cfg.speedMultiplier,
    runoutZone: behaviorConfig.runoutZone,
  });
}

/** ARM B, derivation only — the sim's duration scalars, WITHOUT running the race. */
export function simModel(identity) {
  const ctx = loadTrack(identity._trackId);
  const cfg = RACER_CONFIGS[identity._racerType];
  const V = normalSpeedFrom(DEFAULT_BASE_SPEED_CONFIG);
  const behaviorConfig = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const pace = paceSpeedPxPerSec(V, cfg.speedMultiplier);
  return deriveRaceDuration({
    isOpen: ctx.isOpen,
    pathLengthPx: ctx.pathLengthPx,
    laps: ctx.isOpen ? 1 : (identity.laps ?? trackDefaultLaps(ctx.track)),
    requestedSeconds: ctx.isOpen
      ? (identity.requestedSeconds ??
        trackDefaultSeconds(
          ctx.track,
          ctx.pathLengthPx,
          pace,
          behaviorConfig.runoutZone,
        ))
      : 0,
    normalSpeedPxPerSec: V,
    speedMultiplier: cfg.speedMultiplier,
    runoutZone: behaviorConfig.runoutZone,
  });
}

/**
 * ARM A — the browser's derivation chain (SetupScreen defaults + RaceScreen init wiring).
 * Reads the BROWSER config loaders and the browser's own per-track default resolution.
 */
export function browserArm(identity) {
  const ctx = loadTrack(identity._trackId);
  const cfg = RACER_CONFIGS[identity._racerType];
  const baseSpeedConfig = loadBaseSpeedConfig();
  const dynamicsConfig = loadRaceDynamicsConfig();
  const behaviorConfig = loadRaceBehaviorConfig();
  const V = normalSpeedFrom(baseSpeedConfig);

  // SetupScreen resolves the operator inputs from the track defaults at THIS race's pace.
  const pace = paceSpeedPxPerSec(V, cfg.speedMultiplier);
  const browserLaps = identity.isOpen
    ? 1
    : (identity.laps ?? trackDefaultLaps(ctx.track));
  const browserSeconds = identity.isOpen
    ? (identity.requestedSeconds ??
      trackDefaultSeconds(
        ctx.track,
        ctx.pathLengthPx,
        pace,
        behaviorConfig.runoutZone,
      ))
    : 0;

  // RaceScreen re-derives the model from the payload's canonical inputs.
  const model = deriveRaceDuration({
    isOpen: ctx.isOpen,
    pathLengthPx: ctx.pathLengthPx,
    laps: browserLaps,
    requestedSeconds: browserSeconds,
    normalSpeedPxPerSec: V,
    speedMultiplier: cfg.speedMultiplier,
    runoutZone: behaviorConfig.runoutZone,
  });

  return execute({
    ctx,
    cfg,
    identity,
    model,
    planConfig: browserPlanConfig(dynamicsConfig),
    behaviorConfig,
    laps: browserLaps,
    requestedSeconds: browserSeconds,
  });
}

/**
 * ARM C — the REAL browser core. Unlike arm A (which hand-mirrors the derivation and then runs
 * the SIM's per-frame loop), this arm runs the ACTUAL RaceScreen init + per-step advance, extracted
 * into client/src/modules/raceCore.js and imported here headless. RaceScreen renders through the
 * SAME functions, so this is what the browser executes — not a mirror. Where RaceScreen's per-step
 * ORDER differs from the sim's (controller.update BEFORE the re-roll; advance interleaved per racer),
 * this arm will diverge from simArm — and that divergence is the point of the arm.
 */
export function realArm(identity) {
  const ctx = loadTrack(identity._trackId);
  const cfg = RACER_CONFIGS[identity._racerType];
  const baseSpeedConfig = loadBaseSpeedConfig();
  const dynamicsConfig = loadRaceDynamicsConfig();
  const behaviorConfig = { ...loadRaceBehaviorConfig(), isOpen: ctx.isOpen };
  const rowConfig = loadRowLayoutConfig();
  const V = normalSpeedFrom(baseSpeedConfig);
  const pace = paceSpeedPxPerSec(V, cfg.speedMultiplier);

  const browserLaps = identity.isOpen
    ? 1
    : (identity.laps ?? trackDefaultLaps(ctx.track));
  const browserSeconds = identity.isOpen
    ? (identity.requestedSeconds ??
      trackDefaultSeconds(
        ctx.track,
        ctx.pathLengthPx,
        pace,
        behaviorConfig.runoutZone,
      ))
    : 0;

  // Auto-scale exactly as RaceScreen/the sim compute it (no D3.5.5 override in a headless run — the
  // 600-identity soak already proved the browser and sim body dims agree on every identity).
  const effectiveWidth =
    ctx.geometricTrackWidth * behaviorConfig.startSpreadRange;
  const { spriteSize: physicalSpriteSize } = computeRacerLayout(
    effectiveWidth,
    identity.nRacers,
    cfg.displaySize,
    DEFAULT_AUTO_SCALE_CONFIG,
  );
  const bodyFillNarrow = Math.min(cfg.bodyFillX, cfg.bodyFillY);
  const bodyFillLong = Math.max(cfg.bodyFillX, cfg.bodyFillY);
  const W_REF = Math.min(285, effectiveWidth);
  const bodyRef = computeBodyNarrowRef(
    W_REF,
    identity.nRacers,
    cfg.displaySize,
    bodyFillNarrow,
    DEFAULT_AUTO_SCALE_CONFIG,
  );

  // Build the REAL browser race via the shared core, then AUGMENT each racer with the browser's roster
  // name — exactly as RaceScreen does before rendering (the avoidance symmetry tiebreak keys on r.name).
  // We step the core directly here (rather than via runRaceHeadless) so raceCore.js stays untouched.
  const { state, config, meta } = createRaceFromIdentity({
    shape: ctx.shape,
    isOpenTrack: ctx.isOpen,
    pathLengthPx: ctx.pathLengthPx,
    trackWidthPx: ctx.geometricTrackWidth,
    speedMultiplier: cfg.speedMultiplier,
    baseSpeedConfig,
    behaviorConfig,
    rowConfig,
    dynamicsConfig,
    normalSpeedPxPerSec: V,
    laps: browserLaps,
    requestedSeconds: browserSeconds,
    nRacers: identity.nRacers,
    racePlanSeed: identity.seed,
    racePlanEnabledFlag: true,
    physicalSpriteSize,
    drawnBodyWidthRefPx: bodyRef.bodyNarrow,
    bodyFillNarrow,
    bodyFillLong,
  });
  const names = rosterOf(identity.nRacers).map((r) => r.name);
  for (let i = 0; i < state.racers.length; i++) state.racers[i].name = names[i];

  config.computePositions();
  const nR = state.racers.length;
  const checkpoints = new Map();
  let nextCp = CHECKPOINT_INTERVAL_MS;
  const maxTime = Math.max(meta.realizedDurationSec * 3, 600) * 1000;
  while (state.finishedCount < nR && state.physicsTs < maxTime) {
    stepRacePhysics(state, config);
    if (state.physicsTs >= nextCp) {
      const arr = new Array(nR).fill(null);
      for (const r of state.racers) arr[r.index] = r.t;
      checkpoints.set(nextCp, arr);
      nextCp += CHECKPOINT_INTERVAL_MS;
    }
  }
  const dnf = state.racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
  for (let k = 0; k < dnf.length; k++)
    dnf[k].finishRank = state.finishedCount + 1 + k;
  const results = state.racers.map((r) => ({
    racerIndex: r.index,
    finalRank: r.finishRank,
    finishTime: r.finishTimeMs == null ? null : r.finishTimeMs / 1000,
  }));

  const outcome = makeRaceOutcome({ results, checkpoints });
  return {
    outcome,
    hash: hashOutcome(outcome),
    model: meta.durationModel,
    results,
  };
}

/**
 * ARM B — the sim's derivation chain (sim-fairness.mjs combo loop).
 * Reads the DEFAULT_* config objects and the CLI's laps/seconds resolution.
 */
export function simArm(identity) {
  const ctx = loadTrack(identity._trackId);
  const cfg = RACER_CONFIGS[identity._racerType];
  const V = normalSpeedFrom(DEFAULT_BASE_SPEED_CONFIG);
  const behaviorConfig = { ...DEFAULT_RACE_BEHAVIOR_CONFIG };
  const pace = paceSpeedPxPerSec(V, cfg.speedMultiplier);

  // The combo loop's --track-defaults resolution.
  const comboLaps = ctx.isOpen
    ? 1
    : (identity.laps ?? trackDefaultLaps(ctx.track));
  const comboSeconds = ctx.isOpen
    ? (identity.requestedSeconds ??
      trackDefaultSeconds(
        ctx.track,
        ctx.pathLengthPx,
        pace,
        behaviorConfig.runoutZone,
      ))
    : 0;

  const model = deriveRaceDuration({
    isOpen: ctx.isOpen,
    pathLengthPx: ctx.pathLengthPx,
    laps: comboLaps,
    requestedSeconds: comboSeconds,
    normalSpeedPxPerSec: V,
    speedMultiplier: cfg.speedMultiplier,
    runoutZone: behaviorConfig.runoutZone,
  });

  return execute({
    ctx,
    cfg,
    identity,
    model,
    planConfig: simPlanConfig(DEFAULT_RACE_DYNAMICS_CONFIG),
    behaviorConfig,
    laps: comboLaps,
    requestedSeconds: comboSeconds,
  });
}
