// ============================================================
// File:        client/src/modules/raceCore.js
// Project:     RaceArena — the REAL race init + per-step advance, extracted from
//              screens/RaceScreen/index.jsx so it is importable WITHOUT the DOM.
//
// WHY THIS FILE EXISTS
// The golden-equality harness (scripts/parity/goldenRunner.mjs) had two arms that both ran
// the SIM's per-frame loop (runSingleRace). That proved the two INPUT-DERIVATION chains agree,
// but it could never expose a divergence that lives in the ORDER RaceScreen executes its own
// loop — because neither arm ran RaceScreen's loop. This module is that loop, lifted out
// verbatim: RaceScreen now renders through `createRaceFromIdentity()` + `stepRacePhysics()`
// (a pure refactor — byte-identical browser physics), and the harness calls the SAME functions
// headless via `runRaceHeadless()`. What the browser runs and what the harness measures are now
// the same code, by construction — not a hand-built mirror.
//
// SCOPE — this is the PHYSICS core only. Rendering, camera, particles, the fixed-timestep
// accumulator, the 2-step catch-up cap and BATTLE/PHOTO-FINISH slow-motion stay in RaceScreen:
// they are wall-clock / render concerns that do not change the deterministic physics sequence
// (a seeded race is frame-rate / slow-mo independent — see seedDeterminism.test.js). The
// headless runner steps FIXED_DT to the finish exactly as a browser under no frame stall would.
//
// KEY DIFFERENCE FROM THE SIM (this is deliberate, and is the whole point of the extraction):
//   RaceScreen order per step:  controller.update() → re-roll draw (reads live field + plan
//                               state) → advanceRacerT, INTERLEAVED per racer.
//   sim (runSingleRace) order:  re-roll draw (Pass 1) → controller.update() → advanceRacerT
//                               (Pass 2), each a SEPARATE pass over the field.
// When a Race Plan is running, the re-roll's pulk/gap bias reads the controller + neighbour
// positions at a one-frame offset between the two orders. That offset is the residual the
// harness now makes machine-visible. This module reproduces the BROWSER order.
// ============================================================

import { deriveRaceDuration } from './durationModel.js';
import {
  computeEvenRowLayout,
  computeRowPhysicalY,
  computeSpeedBonus,
  computeStartRowCount,
} from './rowLayout.js';
import { computeEffectiveBrakeFactor } from './raceBehaviorConfig.js';
import { initRacerBehavior, applyRacerBehavior } from './raceBehavior.js';
import { computeRowEnvMult, computeRowEnvSmoothed, advanceRacerT } from './raceStep.js';
import { applyPulkLeadRotation, computeDirectorCeiling } from './raceGovernor.js';
import { meanDrawnBodyLen, lenScaleFrom } from './raceLengths.js';
import { createRacePlan, createTrajectoryController, makeRaceRng } from './racePlanner.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './raceDynamicsConfig.js';
import { currentLap } from './camera/lapUtils.js';
import { easeInOutCubic } from '../utils/mathUtils.js';

/** Fixed physics timestep in ms — the one quantum. Mirrors RaceScreen/index.jsx FIXED_DT. */
export const FIXED_DT = 16;

/** Closed-track t-wrap helper — identical to RaceScreen/index.jsx:139 and sim tPos. */
const tPos = (t) => ((t % 1) + 1) % 1;

/**
 * Build a race from its resolved inputs — the REAL RaceScreen init, DOM-free.
 *
 * Every physics draw site (row shuffle, per-racer spreadFactor + roll jitter) is threaded through
 * ONE explicit seeded stream (`raceRng`) in the exact order RaceScreen draws them, so a seed
 * reproduces the browser's race bit-for-bit. Render-only fields (icon/colour/coat/trail) are NOT
 * set here — the caller (RaceScreen) augments each racer in place; they never touch the stream.
 *
 * @param {object} p resolved inputs (the caller derives these the way its own side does).
 * @returns {{state:object, config:object, meta:object, computePositions:function}}
 */
export function createRaceFromIdentity(p) {
  const {
    shape,
    isOpenTrack,
    pathLengthPx,
    trackWidthPx,
    speedMultiplier,
    baseSpeedConfig,
    behaviorConfig,
    rowConfig,
    dynamicsConfig,
    normalSpeedPxPerSec,
    laps,
    requestedSeconds,
    nRacers,
    racePlanSeed,
    racePlanEnabledFlag,
    physicalSpriteSize,
    drawnBodyWidthRefPx,
    bodyFillNarrow,
    bodyFillLong,
    constSpeedActive = false,
  } = p;

  const BASE_SPEED_MIN = baseSpeedConfig.min;
  const BASE_SPEED_MAX = baseSpeedConfig.max;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;

  const effectiveWidth = trackWidthPx * behaviorConfig.startSpreadRange;

  // ── THE canonical speed/duration derivation (durationModel.js) — the SAME shared call the sim
  // makes, with the same inputs, so finishT / raceBaseSpeed / the clock are identical by construction.
  const durationModel = deriveRaceDuration({
    isOpen: isOpenTrack,
    pathLengthPx,
    laps,
    requestedSeconds,
    normalSpeedPxPerSec,
    speedMultiplier,
    runoutZone: behaviorConfig.runoutZone,
  });
  const finishT = durationModel.finishT;
  const race_baseSpeed = durationModel.raceBaseSpeed;
  const realizedDurationSec = durationModel.realizedDurationSec;
  const maxLaps = isOpenTrack ? 1 : finishT;

  // ── ONE explicit seeded physics stream. seed <= 0 → native generator (legacy exploration). ──
  const raceRng = makeRaceRng(racePlanSeed).physics;

  const rowGapPx = physicalSpriteSize * rowConfig.rowGapMultiplier;
  const deltaT_per_row = pathLengthPx > 0 ? rowGapPx / pathLengthPx : 0.01;
  // D-ROWCOUNT: the ONE shared start-row count (rowLayout.js) — no longer an inline formula here.
  const rowCount = computeStartRowCount(effectiveWidth, nRacers, physicalSpriteSize);
  const rowLayout = computeEvenRowLayout(nRacers, rowCount, raceRng);

  // Re-Roll schedule keyed on the ONE canonical clock (realizedDurationSec).
  const rerollDurationSec = realizedDurationSec;
  const rollCount = Math.max(
    2,
    Math.floor(rerollDurationSec / dynamicsConfig.reRollIntervalDivisor)
  );
  const rollInterval =
    ((dynamicsConfig.reRollLastPositionPercent / 100) * rerollDurationSec * 1000) / rollCount;

  const rowSizeByRow = new Map();
  for (const a of rowLayout.assignments) {
    rowSizeByRow.set(a.rowIndex, (rowSizeByRow.get(a.rowIndex) ?? 0) + 1);
  }
  const assignmentByRacer = new Map(rowLayout.assignments.map((a) => [a.racerIndex, a]));

  const racers = Array.from({ length: nRacers }, (_, i) => {
    const assignment = assignmentByRacer.get(i) ?? { rowIndex: 0, indexInRow: 0 };
    const rowSize = rowSizeByRow.get(assignment.rowIndex) ?? 1;
    const speedBonus = computeSpeedBonus(
      assignment.rowIndex,
      rowGapPx,
      pathLengthPx,
      rowConfig.speedBonusFactor,
      finishT,
      isOpenTrack,
      rowLayout.totalRows
    );
    const tStart = isOpenTrack
      ? (rowLayout.totalRows - assignment.rowIndex) * deltaT_per_row
      : -(assignment.rowIndex * deltaT_per_row);
    // spreadFactor: random luck draw — DRAW 2 (per racer). rollJitter: DRAW 3 (per racer).
    const spreadFactor =
      (BASE_SPEED_MIN + raceRng() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
    const speedBonusMult = 1 + speedBonus;
    const rollJitter = (raceRng() - 0.5) * 2 * rollInterval * 0.2;
    const racer = {
      index: i,
      t: tStart,
      lap: 1,
      spreadFactor,
      speedBonusMult,
      rawRowBonus: speedBonus,
      baseSpeed: race_baseSpeed * speedMultiplier * spreadFactor * speedBonusMult,
      spreadFactorPrev: spreadFactor,
      spreadFactorTarget: spreadFactor,
      transitionStartTime: 0,
      transitionDuration: dynamicsConfig.reRollTransitionDuration * 1000,
      nextRollTime: rollInterval + rollJitter,
      finished: false,
      finishRank: null,
      runoutDecay: 1,
      x: 0,
      y: 0,
      angle: 0,
      frameSizePx: physicalSpriteSize,
      drawnBodyWidthPx: drawnBodyWidthRefPx,
      drawnBodyLengthPx:
        bodyFillNarrow > 0
          ? (drawnBodyWidthRefPx * bodyFillLong) / bodyFillNarrow
          : drawnBodyWidthRefPx,
      trackWidthPx,
      pathLengthPx,
      trajectoryMult: 1.0,
      trajectoryMultTarget: 1.0,
      trajectoryMultPrev: 1.0,
      trajectoryMultTransStart: 0,
      areaBonusMult: 1.0,
      governorMult: 1.0,
    };
    initRacerBehavior(racer);
    racer.physicalY = computeRowPhysicalY(
      assignment.indexInRow,
      rowSize,
      behaviorConfig.startSpreadRange
    );
    return racer;
  });

  // The mutable per-race state RaceScreen assigns to g.current (it adds render/phase fields on top).
  const state = {
    finishedCount: 0,
    maxLaps,
    finishT,
    raceProgress: 0,
    physicsTs: 0,
    racers,
  };

  // ── Race Plan controller ── gated on the ONE canonical clock — the same scalar the sim gates on.
  const racePlanEnabled =
    !!racePlanEnabledFlag && realizedDurationSec >= (dynamicsConfig.racePlanMinDurationSec ?? 30);
  let racePlanController = null;
  let rpPlanInfo = null;
  if (racePlanEnabled) {
    const planRacers = racers.map((r) => ({
      index: r.index,
      startRowIndex: assignmentByRacer.get(r.index)?.rowIndex ?? 0,
    }));
    const plan = createRacePlan(
      planRacers,
      finishT,
      realizedDurationSec * 1000,
      {
        bonusStrengthMultiplier: dynamicsConfig.racePlanBonusStrengthMultiplier ?? 2.0,
        phaseSplitBonusEnabled: dynamicsConfig.phaseSplitBonusEnabled ?? false,
        areaBonusEarly: dynamicsConfig.areaBonusEarly ?? 1.0,
        areaBonusPulk: dynamicsConfig.areaBonusPulk ?? 0,
        areaBonusPost: dynamicsConfig.areaBonusPost ?? 1.0,
        pulkStart: dynamicsConfig.racePlanPulkStart ?? 0.25,
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
          dynamicsConfig.choreoOutcomeStart ?? DEFAULT_RACE_DYNAMICS_CONFIG.choreoOutcomeStart,
        packReSteerThreshold: dynamicsConfig.packReSteerThreshold ?? 1.0,
        b2AttackHeroes:
          dynamicsConfig.b2AttackHeroes ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackHeroes,
        b2AttackPeakRank: dynamicsConfig.b2AttackPeakRank ?? 5,
        b2AttackFinalRank:
          dynamicsConfig.b2AttackFinalRank ?? DEFAULT_RACE_DYNAMICS_CONFIG.b2AttackFinalRank,
        b2AttackProgress: dynamicsConfig.b2AttackProgress ?? { start: 0.4, end: 0.7 },
        b2AttackResolveProgress: dynamicsConfig.b2AttackResolveProgress ?? 0.85,
        b2AttackBandArrival: dynamicsConfig.b2AttackBandArrival ?? true,
        gapRerollThresholdLengths: dynamicsConfig.gapRerollEnabled
          ? (dynamicsConfig.gapRerollThresholdLengths ??
            DEFAULT_RACE_DYNAMICS_CONFIG.gapRerollThresholdLengths)
          : null,
        gapRerollMode: dynamicsConfig.gapRerollMode ?? 'symmetric',
        gapRerollStrength: dynamicsConfig.gapRerollStrength ?? 1.0,
        reRollTransitionDuration: dynamicsConfig.reRollTransitionDuration,
        // Finale front-compression (Evolution Act 2) — default OFF → byte-identical.
        finaleFrontCompression: dynamicsConfig.finaleFrontCompression ?? false,
        finaleContestWindowStart:
          dynamicsConfig.finaleContestWindowStart ??
          DEFAULT_RACE_DYNAMICS_CONFIG.finaleContestWindowStart,
        finaleContestWindowEnd:
          dynamicsConfig.finaleContestWindowEnd ??
          DEFAULT_RACE_DYNAMICS_CONFIG.finaleContestWindowEnd,
        finaleCatchupGateLengths:
          dynamicsConfig.finaleCatchupGateLengths ??
          DEFAULT_RACE_DYNAMICS_CONFIG.finaleCatchupGateLengths,
        finaleLeaderBleedGateLengths:
          dynamicsConfig.finaleLeaderBleedGateLengths ??
          DEFAULT_RACE_DYNAMICS_CONFIG.finaleLeaderBleedGateLengths,
        finaleCompressStrength:
          dynamicsConfig.finaleCompressStrength ??
          DEFAULT_RACE_DYNAMICS_CONFIG.finaleCompressStrength,
        // Finale ADAPTIVE gates (Evolution Act 2) — default OFF → byte-identical.
        finaleAdaptiveGates: dynamicsConfig.finaleAdaptiveGates ?? false,
        finaleCatchupGateFrac:
          dynamicsConfig.finaleCatchupGateFrac ??
          DEFAULT_RACE_DYNAMICS_CONFIG.finaleCatchupGateFrac,
        finaleLeaderBleedGateFrac:
          dynamicsConfig.finaleLeaderBleedGateFrac ??
          DEFAULT_RACE_DYNAMICS_CONFIG.finaleLeaderBleedGateFrac,
        finaleAdaptiveMinSpreadLengths:
          dynamicsConfig.finaleAdaptiveMinSpreadLengths ??
          DEFAULT_RACE_DYNAMICS_CONFIG.finaleAdaptiveMinSpreadLengths,
      },
      racePlanSeed
    );
    racePlanController = createTrajectoryController(plan);
    rpPlanInfo = {
      targetRanks: plan._racerTargetRank,
      b1Indices: new Set(
        [...plan._racerTargetRank.entries()].filter(([, rank]) => rank <= 5).map(([idx]) => idx)
      ),
    };
  }

  // ── Pre-OUTCOME contest-injector "director" (PulkLeadRotation — default OFF) ──
  const pulkLeadRotationOn = racePlanEnabled;
  const pulkLeadRotCfg = {
    enabled: pulkLeadRotationOn,
    attackerSlots: dynamicsConfig.pulkLeadRotationAttackerSlots ?? 2,
    dropDepthLengths: dynamicsConfig.pulkLeadRotationDropDepthLengths ?? 2,
    outsiderMaxReachLengths: dynamicsConfig.pulkLeadRotationOutsiderMaxReachLengths ?? 15,
    deadlockTimeoutMs: dynamicsConfig.pulkLeadRotationDeadlockTimeoutMs ?? 12000,
    minHoldMs: dynamicsConfig.pulkLeadRotationMinHoldMs ?? 750,
    frontPool: dynamicsConfig.pulkFrontPool ?? 8,
    leaderBrake: dynamicsConfig.pulkLeaderBrake ?? 0,
    challengerBoost: dynamicsConfig.pulkChallengerBoost ?? 0,
    maxEffect: dynamicsConfig.pulkEnvelopeMaxEffect ?? 0.12,
    maxStepPerFrame: dynamicsConfig.pulkEnvelopeMaxStepPerFrame ?? 0.01,
    ceilingCap:
      (dynamicsConfig.pulkCeilingCap ?? false)
        ? computeDirectorCeiling(
            BASE_SPEED_MAX,
            BASE_SPEED_MEAN,
            dynamicsConfig.pulkBoostHeadroom ?? 0
          )
        : 0,
  };
  const govFractions = racePlanController?.getPhaseFractions?.() ?? null;
  const govSeed = racePlanController?.seed ?? 0;

  // ── PULK-action phase-split bonuses (parity with the sim) ──
  const phaseSplitBonusEnabled = dynamicsConfig.phaseSplitBonusEnabled ?? false;
  const rowBonusEarly = dynamicsConfig.rowBonusEarly ?? 1;
  const rowBonusPulk = dynamicsConfig.rowBonusPulk ?? 1;
  const rowBonusPost = dynamicsConfig.rowBonusPost ?? 1;
  const enableRowEnvSmooth = dynamicsConfig.enableRowEnvSmooth ?? false;
  const PHASE_CHAOS_END = govFractions?.pulkStartFrac ?? 0.25;
  const PHASE_PULK_END = govFractions?.pulkEndFrac ?? 0.5;
  const rowPhaseCfg = {
    enabled: phaseSplitBonusEnabled,
    chaosEndFrac: PHASE_CHAOS_END,
    pulkEndFrac: PHASE_PULK_END,
    early: rowBonusEarly,
    pulk: rowBonusPulk,
    post: rowBonusPost,
    smooth: enableRowEnvSmooth,
  };
  const dirState = {};
  const govMeanBodyLen = meanDrawnBodyLen(racers);

  // ── Canvas positions ── (RaceScreen's exact open-track perp-projection; closed = plain getPosition)
  const computePositions = () => {
    for (const r of state.racers) {
      const t = isOpenTrack ? Math.min(r.t, 1) : tPos(r.t);
      if (isOpenTrack) {
        const center = shape.getPosition(t, 0);
        const lateral = shape.getPosition(t, r.physicalY / 2);
        const perpCos = Math.cos(center.angle + Math.PI / 2);
        const perpSin = Math.sin(center.angle + Math.PI / 2);
        const lateralDist = (lateral.x - center.x) * perpCos + (lateral.y - center.y) * perpSin;
        r.x = center.x + perpCos * lateralDist;
        r.y = center.y + perpSin * lateralDist;
        r.angle = center.angle;
      } else {
        const pos = shape.getPosition(t, r.physicalY / 2);
        r.x = pos.x;
        r.y = pos.y;
        r.angle = pos.angle;
      }
    }
  };

  // Frame-constant re-roll scalars (RaceScreen computes these per-rAF at :941-944; they never
  // change during a race, so hoisting them here is byte-identical).
  const lastRollDeadline =
    rerollDurationSec * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);
  const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
  const halfWidth = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);

  const config = {
    // constants + configs the per-step advance reads
    BASE_SPEED_MIN,
    BASE_SPEED_MAX,
    BASE_SPEED_MEAN,
    race_baseSpeed,
    speedMultiplier,
    behaviorConfig,
    dynamicsConfig,
    isOpenTrack,
    pathLengthPx,
    maxLaps,
    raceRng,
    racePlanController,
    rowPhaseCfg,
    pulkLeadRotCfg,
    pulkLeadRotationOn,
    govFractions,
    govMeanBodyLen,
    dirState,
    rollInterval,
    lastRollDeadline,
    spreadRange,
    halfWidth,
    trajectoryTransitionDurationMs: dynamicsConfig.trajectoryTransitionDuration * 1000,
    gapRerollEnabled: dynamicsConfig.gapRerollEnabled ?? false,
    gapRerollDevMarker: dynamicsConfig.gapRerollDevMarker ?? false,
    constSpeedActive,
    computePositions,
  };

  const meta = {
    racePlanEnabled,
    racePlanController,
    rpPlanInfo,
    rowLayout,
    assignmentByRacer,
    govFractions,
    govSeed,
    govMeanBodyLen,
    pulkLeadRotationOn,
    realizedDurationSec,
    finishT,
    race_baseSpeed,
    rerollDurationSec,
    rollInterval,
    lastRollDeadline,
    durationModel,
  };

  return { state, config, meta, computePositions };
}

/**
 * Advance the race by ONE fixed physics step (FIXED_DT ms) — the REAL RaceScreen per-step advance,
 * in RaceScreen's own order (controller.update BEFORE the re-roll, advance INTERLEAVED per racer).
 * Mutates `st` (racers, physicsTs, raceProgress, finishedCount). Pure physics: no render, no camera,
 * no diagnostics. RaceScreen calls this inside its accumulator; the headless runner calls it in a
 * tight loop.
 *
 * @param {object} st  the mutable race state from createRaceFromIdentity().state
 * @param {object} cfg the config bundle from createRaceFromIdentity().config
 */
export function stepRacePhysics(st, cfg) {
  const {
    BASE_SPEED_MIN,
    BASE_SPEED_MAX,
    BASE_SPEED_MEAN,
    race_baseSpeed,
    speedMultiplier,
    behaviorConfig,
    isOpenTrack,
    pathLengthPx,
    maxLaps,
    raceRng,
    racePlanController,
    rowPhaseCfg,
    pulkLeadRotCfg,
    pulkLeadRotationOn,
    govFractions,
    govMeanBodyLen,
    dirState,
    rollInterval,
    lastRollDeadline,
    halfWidth,
    trajectoryTransitionDurationMs,
    gapRerollEnabled,
    gapRerollDevMarker,
    constSpeedActive,
    computePositions,
  } = cfg;

  st.physicsTs += FIXED_DT;
  const physicsTs = st.physicsTs;

  // B1: snapshot per-step so _prev is always exactly 1 step behind curr (render interpolation).
  for (const r of st.racers) {
    r._prevT = r.t;
    r._prevX = r.x;
    r._prevY = r.y;
    r._prevAngle = r.angle;
  }
  // NOTE: the constSpeed `_diagPrevT` snapshot stays with the caller (RaceScreen sets it once per
  // rAF, before the accumulator loop, matching the legacy per-rAF cadence); the equalize below just
  // reads it. In a headless run constSpeedActive is false, so the equalize never fires.

  // Monotonic leader track-progress [0,1] — drives WHEN phases switch (route-based).
  let _leaderT = -Infinity;
  for (const r of st.racers) {
    if (!r.finished && r.t > _leaderT) _leaderT = r.t;
  }
  const _rawProgress = _leaderT > -Infinity ? _leaderT / st.finishT : 0;
  if (_leaderT > -Infinity) {
    st.raceProgress = Math.min(1, Math.max(st.raceProgress, _rawProgress));
  }

  // Controller-Pass: rank racers by current t, write trajectoryMultTarget on each.
  if (racePlanController) racePlanController.update(st.racers, physicsTs, st.raceProgress);

  // trajectoryMult easeInOutCubic transition (mirrors spreadFactor pattern).
  if (racePlanController) {
    const TT_DUR_MS = trajectoryTransitionDurationMs;
    for (const r of st.racers) {
      const elapsed = physicsTs - r.trajectoryMultTransStart;
      r.trajectoryMult =
        elapsed < TT_DUR_MS
          ? r.trajectoryMultPrev +
            (r.trajectoryMultTarget - r.trajectoryMultPrev) * easeInOutCubic(elapsed / TT_DUR_MS)
          : r.trajectoryMultTarget;
    }
  }

  // PulkLeadRotation (default OFF → skipped).
  if (pulkLeadRotationOn && govFractions) {
    applyPulkLeadRotation(
      st.racers,
      st.finishT,
      {
        progress: st.raceProgress,
        pulkStartFrac: govFractions.pulkStartFrac,
        pulkEndFrac: govFractions.pulkEndFrac,
        corrStartFrac: govFractions.corrStartFrac,
        pathLengthPx,
        meanBodyLen: govMeanBodyLen,
        isOpen: isOpenTrack,
        currentMs: physicsTs,
        dirState,
      },
      pulkLeadRotCfg
    );
  }

  // Gap-cap re-roll bias context (disabled ⇒ never called).
  const gapLenScale = gapRerollEnabled
    ? lenScaleFrom(pathLengthPx, meanDrawnBodyLen(st.racers))
    : 0;

  for (const r of st.racers) {
    // ── Per-racer spreadFactor re-roll + smooth transition ──
    if (!r.finished) {
      if (physicsTs >= r.nextRollTime && physicsTs < lastRollDeadline) {
        const rawSample = r.spreadFactor + (raceRng() - 0.5) * 2 * halfWidth;
        const biasedSample = racePlanController
          ? racePlanController.computePulkBiasedTarget(
              r.index,
              rawSample,
              BASE_SPEED_MIN / BASE_SPEED_MEAN,
              BASE_SPEED_MAX / BASE_SPEED_MEAN,
              st.racers,
              physicsTs,
              st.raceProgress
            )
          : rawSample;
        const gapBiasedSample =
          gapRerollEnabled && racePlanController
            ? racePlanController.computeGapBiasedTarget(
                r.index,
                biasedSample,
                BASE_SPEED_MIN / BASE_SPEED_MEAN,
                BASE_SPEED_MAX / BASE_SPEED_MEAN,
                st.racers,
                physicsTs,
                st.raceProgress,
                gapLenScale,
                behaviorConfig.isOpen,
                lastRollDeadline
              )
            : biasedSample;
        if (gapRerollDevMarker && gapBiasedSample !== biasedSample) r._gapBiasMarkAt = physicsTs;
        const newTarget = Math.max(
          BASE_SPEED_MIN / BASE_SPEED_MEAN,
          Math.min(BASE_SPEED_MAX / BASE_SPEED_MEAN, gapBiasedSample)
        );
        r.spreadFactorPrev = r.spreadFactor;
        r.spreadFactorTarget = newTarget;
        r.transitionStartTime = physicsTs;
        const jOff = (raceRng() - 0.5) * 2 * rollInterval * 0.2;
        r.nextRollTime = physicsTs + rollInterval + jOff;
      }
      const elapsed = physicsTs - r.transitionStartTime;
      if (elapsed < r.transitionDuration) {
        const tProg = elapsed / r.transitionDuration;
        r.spreadFactor =
          r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(tProg);
        r.baseSpeed = race_baseSpeed * speedMultiplier * r.spreadFactor * r.speedBonusMult;
      }
    }
    // D7b boost/brake from the previous step.
    const boost = r.draftingBoostActive ? behaviorConfig.draftingBoost : 1.0;
    const effectiveBrakeFactor = computeEffectiveBrakeFactor(
      behaviorConfig,
      isOpenTrack,
      physicsTs
    );
    const brake = r.avoidanceActive
      ? Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)
      : 1.0;
    const rowEnvTarget = computeRowEnvMult(r.rawRowBonus, st.raceProgress, rowPhaseCfg);
    const rowEnvMult = rowPhaseCfg.smooth
      ? computeRowEnvSmoothed(r, rowEnvTarget, physicsTs)
      : rowEnvTarget;
    if (!r.finished) {
      r.t = advanceRacerT(r, {
        boost,
        brake,
        raceProgress: st.raceProgress,
        finishT: st.finishT,
        phase: rowPhaseCfg,
        rowEnvMult,
      });
    } else {
      r.runoutDecay *= 0.97;
      r.t += r.baseSpeed * r.runoutDecay;
    }
    r.vt =
      race_baseSpeed > 0 && !r.finished
        ? (r.baseSpeed * boost * brake * rowEnvMult * r.trajectoryMult * r.areaBonusMult) /
          race_baseSpeed
        : 0;
  }

  // D4: equalize all non-finished racers to the mean delta-t (constSpeed diag only).
  if (constSpeedActive) {
    const active = st.racers.filter((r) => !r.finished);
    if (active.length > 0) {
      const meanDt = active.reduce((s, r) => s + (r.t - (r._diagPrevT ?? r.t)), 0) / active.length;
      for (const r of active) {
        r.t = (r._diagPrevT ?? r.t) + meanDt;
        r.vt = race_baseSpeed > 0 ? meanDt / race_baseSpeed : 0;
      }
    }
  }

  computePositions();
  applyRacerBehavior(st.racers, behaviorConfig, { currentTs: physicsTs });

  for (const r of st.racers) {
    if (r.finished) continue;
    if (r.t >= st.finishT) {
      r.finished = true;
      r.finishRank = ++st.finishedCount;
      r.finishTimeMs = physicsTs;
    }
    r.lap = isOpenTrack ? 1 : currentLap(r.t, maxLaps);
  }
}

/**
 * Run a full race HEADLESS through the REAL RaceScreen core, collecting the outcome the golden
 * harness compares (finishing order + per-racer t at fixed physicsTs checkpoints). Steps FIXED_DT
 * to the finish exactly as a browser under no frame stall does — no slow-mo, no catch-up cap, no
 * render draws (those never touch the seeded physics stream anyway).
 *
 * @param {object} params inputs for createRaceFromIdentity()
 * @param {object} [opts]
 * @param {number} [opts.checkpointIntervalMs=5000] checkpoint cadence in physics ms
 * @returns {{results:Array, checkpoints:Map<number,Array>, meta:object}}
 */
export function runRaceHeadless(params, opts = {}) {
  const checkpointIntervalMs = opts.checkpointIntervalMs ?? 5000;
  const { state, config, meta } = createRaceFromIdentity(params);
  const nRacers = state.racers.length;

  // Set world positions once at t=0 (matches the COUNTDOWN computePositions before RACING).
  config.computePositions();

  const checkpoints = new Map();
  let nextCp = checkpointIntervalMs;

  // Safety cap mirrors the sim's: 3× the realized duration or 10 min, whichever is larger.
  const maxTime = Math.max(meta.realizedDurationSec * 3, 600) * 1000;

  while (state.finishedCount < nRacers && state.physicsTs < maxTime) {
    stepRacePhysics(state, config);
    if (state.physicsTs >= nextCp) {
      const arr = new Array(nRacers).fill(null);
      for (const r of state.racers) arr[r.index] = r.t;
      checkpoints.set(nextCp, arr);
      nextCp += checkpointIntervalMs;
    }
  }

  // DNF: rank unfinished by current t (higher = better), after all finishers — mirrors the sim.
  const dnf = state.racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
  for (let k = 0; k < dnf.length; k++) {
    dnf[k].finishRank = state.finishedCount + 1 + k;
  }

  const results = state.racers.map((r) => ({
    racerIndex: r.index,
    finalRank: r.finishRank,
    // finishTime in SECONDS (the harness's convention); finishTimeMs is a strict FIXED_DT multiple.
    finishTime: r.finishTimeMs == null ? null : r.finishTimeMs / 1000,
  }));

  return { results, checkpoints, meta };
}
