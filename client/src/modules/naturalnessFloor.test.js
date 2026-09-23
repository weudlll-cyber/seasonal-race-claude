// @vitest-environment node
// ============================================================
// File:        naturalnessFloor.test.js
// Path:        client/src/modules/naturalnessFloor.test.js
// Project:     RaceArena — NIGHT-2026-09-24C piece 3(d)
// Description: The slow side of the naturalness envelope now has a leitplanke, and it REFUSES a
//              configuration below it — while every shipped stage passes untouched.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  NATURALNESS_CEILING,
  NATURALNESS_FLOOR,
  computeDirectorFloor,
  isWithinNaturalnessFloor,
  assertNaturalnessFloor,
} from './raceGovernor.js';
import { RACE_ACTION_STAGES, DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';

describe('the slow side of the naturalness envelope', () => {
  it('★ the floor MIRRORS the ceiling — 0.8 against 1.2, the same ±20%', () => {
    expect(NATURALNESS_FLOOR).toBeCloseTo(2 - NATURALNESS_CEILING, 10);
  });

  it('the floor is the governor’s own bound for a braked racer, 1 − max(maxEffect, brake)', () => {
    expect(computeDirectorFloor(0.12, 0.1)).toBeCloseTo(0.88, 10);
    expect(computeDirectorFloor(0.12, 0.15)).toBeCloseTo(0.85, 10);
    // it EXPANDS as the brake grows — which is exactly the gap RACE-ACTION.md §6 describes
    expect(computeDirectorFloor(0.12, 0.3)).toBeCloseTo(0.7, 10);
  });

  it('★★ REFUSES a configuration below the line', () => {
    expect(isWithinNaturalnessFloor(0.12, 0.3)).toBe(false);
    expect(() => assertNaturalnessFloor(0.12, 0.3)).toThrow(RangeError);
    expect(() => assertNaturalnessFloor(0.12, 0.3)).toThrow(/naturalness floor breached/i);
    // and the message names both inputs and the multiplier they permit, so it is actionable
    expect(() => assertNaturalnessFloor(0.12, 0.3)).toThrow(/0\.700/);
  });

  it('★ the boundary itself is INSIDE, not outside', () => {
    expect(isWithinNaturalnessFloor(0, 0.2)).toBe(true); // exactly 0.80
    expect(isWithinNaturalnessFloor(0, 0.2 + 1e-6)).toBe(false);
  });

  it('★★★ EVERY SHIPPED STAGE PASSES UNTOUCHED — the race is unchanged', () => {
    // Read from the shipped table, never typed here: a value that drifts must fail this test rather
    // than quietly keep agreeing with a copy.
    const maxEffect = DEFAULT_RACE_DYNAMICS_CONFIG.pulkEnvelopeMaxEffect;
    for (const [stage, cfg] of Object.entries(RACE_ACTION_STAGES)) {
      const brake = cfg.pulkLeaderBrake ?? DEFAULT_RACE_DYNAMICS_CONFIG.pulkLeaderBrake;
      expect(
        isWithinNaturalnessFloor(maxEffect, brake),
        `${stage} (brake ${brake}) must be inside the floor`
      ).toBe(true);
      expect(() => assertNaturalnessFloor(maxEffect, brake)).not.toThrow();
    }
  });

  it('★ WILD is inside the floor on the GOVERNOR bound — and that is not the same as the accepted breach', () => {
    // docs/RACE-ACTION.md records the owner accepting on 2026-08-24 that at `wild` a racer goes
    // under 0.80 in 22 of 30 races. That breach is in the REALISED speed factor, which includes the
    // spread factor and the area bonus; this floor bounds the governor's own multiplier, which at
    // wild's 0.15 brake is 0.85. The two are different quantities and this test pins that, so nobody
    // later reads a passing wild as evidence the accepted breach went away.
    expect(computeDirectorFloor(0.12, RACE_ACTION_STAGES.wild.pulkLeaderBrake)).toBeCloseTo(
      0.85,
      10
    );
    expect(isWithinNaturalnessFloor(0.12, RACE_ACTION_STAGES.wild.pulkLeaderBrake)).toBe(true);
  });

  it('handles absent and nonsense inputs without inventing a bound', () => {
    expect(computeDirectorFloor()).toBe(1);
    expect(computeDirectorFloor(null, undefined)).toBe(1);
    expect(computeDirectorFloor(-5, -5)).toBe(1); // negatives cannot deepen a brake
  });
});
