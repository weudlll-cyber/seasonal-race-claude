// ============================================================
// File:        raceRelevantReset.test.js
// Path:        client/src/screens/DevScreen/sections/raceRelevantReset.test.js
// Description: The INVARIANT behind the Race Tuning "Reset All Defaults" button: the reset target restores
//              EXACTLY the five race-relevant config blocks to their shipped defaults, and touches no
//              cosmetic block. Because the HUD badge's race count is splitConfigDiffs(...).race over those
//              same five blocks, this pins that after a reset the badge reads "0 race" by construction —
//              the button and the badge can never disagree again.
// ============================================================

import { describe, it, expect } from 'vitest';
import { RACE_RELEVANT_DEFAULTS } from './raceRelevantReset.js';
import {
  splitConfigDiffs,
  RACE_RELEVANT_CONFIG_KEYS,
  COSMETIC_CONFIG_KEYS,
} from '../../../modules/parity/configFingerprint.js';
import {
  DEFAULT_RACE_DYNAMICS_CONFIG,
  DEFAULT_RACE_BEHAVIOR_CONFIG,
  DEFAULT_ROW_LAYOUT_CONFIG,
  DEFAULT_BASE_SPEED_CONFIG,
  DEFAULT_FRAME_TIMING_CONFIG,
  DEFAULT_CAMERA_CONFIG,
} from '../../../modules/storage/defaults.js';
import { DEFAULT_AUTO_SCALE_CONFIG } from '../../../modules/autoSpriteScale.js';

// The shipped-default world the badge diffs against (mirrors exportRaceConfig.DEFAULT_CONFIG_WORLD).
const DEFAULTS_WORLD = {
  raceDynamicsConfig: DEFAULT_RACE_DYNAMICS_CONFIG,
  raceBehaviorConfig: DEFAULT_RACE_BEHAVIOR_CONFIG,
  rowLayoutConfig: DEFAULT_ROW_LAYOUT_CONFIG,
  baseSpeedConfig: DEFAULT_BASE_SPEED_CONFIG,
  autoScaleConfig: DEFAULT_AUTO_SCALE_CONFIG,
  frameTimingConfig: DEFAULT_FRAME_TIMING_CONFIG,
  cameraConfig: DEFAULT_CAMERA_CONFIG,
};

describe('RACE_RELEVANT_DEFAULTS — the master-reset target', () => {
  it('covers EXACTLY the five race-relevant blocks (no cosmetic block, none missing)', () => {
    expect(Object.keys(RACE_RELEVANT_DEFAULTS).sort()).toEqual(
      [...RACE_RELEVANT_CONFIG_KEYS].sort()
    );
    for (const c of COSMETIC_CONFIG_KEYS) {
      expect(RACE_RELEVANT_DEFAULTS).not.toHaveProperty(c);
    }
  });

  it('each block equals the shipped default the badge diffs against', () => {
    for (const block of RACE_RELEVANT_CONFIG_KEYS) {
      expect(RACE_RELEVANT_DEFAULTS[block]).toEqual(DEFAULTS_WORLD[block]);
    }
  });
});

describe('after "Reset All Defaults" the badge reads 0 race — by construction', () => {
  it('a world whose five race blocks are the reset target → race.count === 0', () => {
    // Simulate the post-reset world: every race-relevant block set to the reset target; cosmetic blocks
    // left arbitrarily drifted (the reset does not touch them — the operator's overlays survive).
    const worldAfterReset = {
      ...structuredClone(RACE_RELEVANT_DEFAULTS),
      cameraConfig: { ...DEFAULT_CAMERA_CONFIG, entryConvergenceZoom: 999, _devOverlay: true },
      frameTimingConfig: { ...DEFAULT_FRAME_TIMING_CONFIG, dtSmoothingAlpha: 0.123 },
    };
    const s = splitConfigDiffs(worldAfterReset, DEFAULTS_WORLD);
    expect(s.race.count).toBe(0); // never red after a reset
    expect(s.race.keys).toEqual([]);
    // cosmetic drift is still reported (quietly) — proves the reset deliberately left it alone
    expect(s.cosmetic.count).toBeGreaterThan(0);
  });

  it('the finale front-compression flag is in the reset target and counted by the badge', () => {
    // Evolution Act 2 added six race-relevant keys. Reset must restore them, and toggling the feature on
    // must register as a RACE diff so the HUD badge reads "R race".
    expect(RACE_RELEVANT_DEFAULTS.raceDynamicsConfig).toHaveProperty(
      'finaleFrontCompression',
      false
    );
    expect(RACE_RELEVANT_DEFAULTS.raceDynamicsConfig).toHaveProperty(
      'finaleLeaderBleedGateLengths'
    );
    // Act 2 adaptive keys are in the reset target too.
    expect(RACE_RELEVANT_DEFAULTS.raceDynamicsConfig).toHaveProperty('finaleAdaptiveGates', false);
    expect(RACE_RELEVANT_DEFAULTS.raceDynamicsConfig).toHaveProperty('finaleCatchupGateFrac');
    const on = structuredClone(RACE_RELEVANT_DEFAULTS);
    on.raceDynamicsConfig.finaleFrontCompression = true;
    on.raceDynamicsConfig.finaleAdaptiveGates = true;
    const s = splitConfigDiffs(on, DEFAULTS_WORLD);
    expect(s.race.keys).toContain('raceDynamicsConfig.finaleFrontCompression');
    expect(s.race.keys).toContain('raceDynamicsConfig.finaleAdaptiveGates');
    expect(s.race.count).toBeGreaterThan(0);
  });

  it('flipping any single race block off-target makes race.count > 0 (guards the coverage)', () => {
    for (const block of RACE_RELEVANT_CONFIG_KEYS) {
      const cur = structuredClone(RACE_RELEVANT_DEFAULTS);
      const firstKey = Object.keys(cur[block])[0];
      cur[block][firstKey] = '__off_target__';
      expect(splitConfigDiffs(cur, DEFAULTS_WORLD).race.count).toBeGreaterThan(0);
    }
  });
});
