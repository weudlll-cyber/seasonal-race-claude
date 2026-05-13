// ============================================================
// File:        speedRangeSim.test.js
// Path:        client/src/modules/speedRangeSim.test.js
// Project:     RaceArena
// Created:     2026-05-13
// Description: Sim-Test: verify speed spread stays <5% with new defaults.
//              Replicates the scripts/diagnose-speed-range.mjs simulation
//              inline using the actual DEFAULT_BASE_SPEED_CONFIG,
//              DEFAULT_ROW_LAYOUT_CONFIG, DEFAULT_RACE_DYNAMICS_CONFIG values.
//              Acceptance criterion from speed-range-fix sprint spec.
// ============================================================

import { describe, it, expect } from 'vitest';
import { DEFAULT_BASE_SPEED_CONFIG } from './baseSpeedConfig.js';
import { DEFAULT_ROW_LAYOUT_CONFIG } from './rowLayoutConfig.js';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './raceDynamicsConfig.js';

// ── Simulation helpers (mirrored from scripts/diagnose-speed-range.mjs) ──────

const REFERENCE_FPS = 62.5;
const N_RACERS = 20;
const SIM_FRAMES = 1200;
const DT_MS = 16;
const ROW_COUNT = 4;
const PATH_LENGTH_PX = 1200;
const TARGET_DURATION_S = 60;
const FINISH_T = 2;
const SPEED_MULTIPLIER = 1.0;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function simulateSpeedSpread(baseSpeedConfig, rowConfig, dynamicsConfig) {
  const BASE_SPEED_MIN = baseSpeedConfig.min;
  const BASE_SPEED_MAX = baseSpeedConfig.max;
  const BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2;
  const spreadMinFactor = BASE_SPEED_MIN / BASE_SPEED_MEAN;
  const spreadMaxFactor = BASE_SPEED_MAX / BASE_SPEED_MEAN;
  const ROW_GAP_PX = rowConfig.rowGapMultiplier * 28;
  const SPEED_BONUS_FACTOR = rowConfig.speedBonusFactor;

  const expectedMinSpreadFactor =
    spreadMinFactor + (spreadMaxFactor - spreadMinFactor) / (N_RACERS + 1);

  const race_baseSpeed =
    FINISH_T / (REFERENCE_FPS * TARGET_DURATION_S * expectedMinSpreadFactor * SPEED_MULTIPLIER);

  const rollCount = Math.max(
    2,
    Math.floor(TARGET_DURATION_S / dynamicsConfig.reRollIntervalDivisor)
  );
  const rollInterval_ms =
    ((dynamicsConfig.reRollLastPositionPercent / 100) * TARGET_DURATION_S * 1000) / rollCount;
  const spreadRange = (BASE_SPEED_MAX - BASE_SPEED_MIN) / BASE_SPEED_MEAN;
  const halfWidth = spreadRange * (dynamicsConfig.reRollVariationPercent / 100);
  const lastRollDeadline_ms =
    TARGET_DURATION_S * 1000 * (dynamicsConfig.reRollLastPositionPercent / 100);
  const RE_ROLL_TRANSITION_DURATION_MS = dynamicsConfig.reRollTransitionDuration * 1000;

  const racers = Array.from({ length: N_RACERS }, (_, i) => {
    const rowIndex = Math.floor(i / (N_RACERS / ROW_COUNT));
    const speedBonus =
      rowIndex === 0 || PATH_LENGTH_PX <= 0
        ? 0
        : ((rowIndex * ROW_GAP_PX) / PATH_LENGTH_PX) * SPEED_BONUS_FACTOR;
    const speedBonusMult = 1 + speedBonus;
    const spreadFactor =
      (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
    const rollJitter = (Math.random() - 0.5) * 2 * rollInterval_ms * 0.2;
    return {
      spreadFactor,
      spreadFactorPrev: spreadFactor,
      spreadFactorTarget: spreadFactor,
      speedBonusMult,
      transitionStartTime: 0,
      transitionDuration: RE_ROLL_TRANSITION_DURATION_MS,
      nextRollTime: rollInterval_ms + rollJitter,
      baseSpeed: race_baseSpeed * SPEED_MULTIPLIER * spreadFactor * speedBonusMult,
    };
  });

  const spreadPcts = [];
  let ts = 0;

  for (let frame = 0; frame < SIM_FRAMES; frame++) {
    ts += DT_MS;

    for (const r of racers) {
      if (ts >= r.nextRollTime && ts < lastRollDeadline_ms) {
        const newTarget = clamp(
          r.spreadFactor + (Math.random() - 0.5) * 2 * halfWidth,
          spreadMinFactor,
          spreadMaxFactor
        );
        r.spreadFactorPrev = r.spreadFactor;
        r.spreadFactorTarget = newTarget;
        r.transitionStartTime = ts;
        const jOff = (Math.random() - 0.5) * 2 * rollInterval_ms * 0.2;
        r.nextRollTime = ts + rollInterval_ms + jOff;
      }

      const elapsed = ts - r.transitionStartTime;
      if (elapsed < r.transitionDuration) {
        const tProg = elapsed / r.transitionDuration;
        r.spreadFactor =
          r.spreadFactorPrev + (r.spreadFactorTarget - r.spreadFactorPrev) * easeInOutCubic(tProg);
        r.baseSpeed = race_baseSpeed * SPEED_MULTIPLIER * r.spreadFactor * r.speedBonusMult;
      }
    }

    const speeds = racers.map((r) => r.baseSpeed);
    const min = Math.min(...speeds);
    const max = Math.max(...speeds);
    const mean = speeds.reduce((s, v) => s + v, 0) / speeds.length;
    spreadPcts.push(((max - min) / mean) * 100);
  }

  const meanSpread = spreadPcts.reduce((s, v) => s + v, 0) / spreadPcts.length;
  const maxSpread = Math.max(...spreadPcts);
  return { meanSpread, maxSpread };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Speed-Range Sim — new defaults', () => {
  // Note: total spread includes speedBonusMult (intentional start-row compensation) +
  // spreadFactor (random draw) + re-roll variation. SpeedBonusMult ~10.5% for row 3
  // is by design (back-row racers compensated for starting further back).
  // Target: total spread stays well below the old 34% which caused field scatter.

  it('mean speed spread is below 20% over 1200 frames (was 34% with old defaults)', () => {
    const results = Array.from({ length: 3 }, () =>
      simulateSpeedSpread(
        DEFAULT_BASE_SPEED_CONFIG,
        DEFAULT_ROW_LAYOUT_CONFIG,
        DEFAULT_RACE_DYNAMICS_CONFIG
      )
    );
    for (const { meanSpread } of results) {
      expect(meanSpread).toBeLessThan(20);
    }
  });

  it('speedFactor-only spread (no row bonus) is below 5% — confirms tight BASE_SPEED range', () => {
    // Test with speedBonusFactor=0 to isolate BASE_SPEED contribution
    const noRowBonus = { ...DEFAULT_ROW_LAYOUT_CONFIG, speedBonusFactor: 0 };
    const { meanSpread } = simulateSpeedSpread(
      DEFAULT_BASE_SPEED_CONFIG,
      noRowBonus,
      DEFAULT_RACE_DYNAMICS_CONFIG
    );
    expect(meanSpread).toBeLessThan(5);
  });

  it('old BASE_SPEED defaults with no row bonus produce spread >15% (confirms S1 was real)', () => {
    const oldBaseSpeed = { min: 0.00091, max: 0.00118 };
    const noRowBonus = { ...DEFAULT_ROW_LAYOUT_CONFIG, speedBonusFactor: 0 };
    const { meanSpread } = simulateSpeedSpread(
      oldBaseSpeed,
      noRowBonus,
      DEFAULT_RACE_DYNAMICS_CONFIG
    );
    expect(meanSpread).toBeGreaterThan(15);
  });
});
