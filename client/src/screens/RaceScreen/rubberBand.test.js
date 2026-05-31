// ============================================================
// File:        rubberBand.test.js
// Path:        client/src/screens/RaceScreen/rubberBand.test.js
// Project:     RaceArena
// Created:     2026-05-31
// Description: Unit tests for rubber-band catch-up math.
// ============================================================

import { describe, it, expect } from 'vitest';
import { DEFAULT_RUBBER_BAND_CONFIG } from '../../modules/storage/defaults.js';

// ── Shared math helpers (mirrored from RaceScreen/index.jsx) ──────────────────

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Returns true when the leader-to-2nd gap exceeds the threshold.
function shouldBoostNonLeaders(leaderGap, gapThreshold) {
  return leaderGap > gapThreshold;
}

// Returns the rubberBandMult target for a given racer.
function computeFlatTarget(isLeader, boostActive, flatBoost) {
  return !isLeader && boostActive ? 1.0 + flatBoost : 1.0;
}

function stepRubberBand(r, physicsTs, boostRampMs) {
  const elapsed = physicsTs - r.rubberBandTransStart;
  return elapsed < boostRampMs
    ? r.rubberBandMultPrev +
        (r.rubberBandMultTarget - r.rubberBandMultPrev) * easeInOutCubic(elapsed / boostRampMs)
    : r.rubberBandMultTarget;
}

// Gate: mirrors the index.jsx condition (leaderT > 0 && leaderProgress < endgameThreshold)
function shouldApplyRubberBand(leaderT, finishT, endgameThreshold) {
  return leaderT > 0 && leaderT / finishT < endgameThreshold;
}

// ── DEFAULT_RUBBER_BAND_CONFIG shape ──────────────────────────────────────────

describe('DEFAULT_RUBBER_BAND_CONFIG', () => {
  it('has all required keys', () => {
    const keys = ['enabled', 'flatBoost', 'boostRampMs', 'gapThreshold'];
    for (const k of keys) {
      expect(DEFAULT_RUBBER_BAND_CONFIG).toHaveProperty(k);
    }
  });

  it('does not have removed keys', () => {
    expect(DEFAULT_RUBBER_BAND_CONFIG).not.toHaveProperty('maxBoost');
    expect(DEFAULT_RUBBER_BAND_CONFIG).not.toHaveProperty('maxCombinedMult');
  });

  it('defaults are within valid ranges', () => {
    const c = DEFAULT_RUBBER_BAND_CONFIG;
    expect(c.enabled).toBe(true);
    expect(c.flatBoost).toBeGreaterThanOrEqual(0);
    expect(c.flatBoost).toBeLessThanOrEqual(1);
    expect(c.boostRampMs).toBeGreaterThan(0);
    expect(c.gapThreshold).toBeGreaterThan(0);
    expect(c.gapThreshold).toBeLessThan(1);
  });
});

// ── shouldBoostNonLeaders ─────────────────────────────────────────────────────

describe('shouldBoostNonLeaders', () => {
  const threshold = 0.003;

  it('returns false when gap is below threshold', () => {
    expect(shouldBoostNonLeaders(0.0, threshold)).toBe(false);
    expect(shouldBoostNonLeaders(0.002, threshold)).toBe(false);
  });

  it('returns false when gap equals threshold exactly', () => {
    expect(shouldBoostNonLeaders(threshold, threshold)).toBe(false);
  });

  it('returns true when gap exceeds threshold', () => {
    expect(shouldBoostNonLeaders(0.004, threshold)).toBe(true);
    expect(shouldBoostNonLeaders(0.05, threshold)).toBe(true);
  });
});

// ── computeFlatTarget ─────────────────────────────────────────────────────────

describe('computeFlatTarget', () => {
  const flatBoost = 0.1;

  it('leader always gets 1.0, even when boost is active', () => {
    expect(computeFlatTarget(true, true, flatBoost)).toBeCloseTo(1.0, 10);
    expect(computeFlatTarget(true, false, flatBoost)).toBeCloseTo(1.0, 10);
  });

  it('non-leader gets 1.0 + flatBoost when boost is active', () => {
    expect(computeFlatTarget(false, true, flatBoost)).toBeCloseTo(1.0 + flatBoost, 10);
  });

  it('non-leader gets 1.0 when boost is not active', () => {
    expect(computeFlatTarget(false, false, flatBoost)).toBeCloseTo(1.0, 10);
  });

  it('boost value is exact — no proportional scaling', () => {
    // All non-leaders get the same flat amount regardless of their individual gap.
    const boost1 = computeFlatTarget(false, true, 0.1);
    const boost2 = computeFlatTarget(false, true, 0.1);
    expect(boost1).toBeCloseTo(boost2, 10);
    expect(boost1).toBeCloseTo(1.1, 10);
  });
});

// ── Outcome-phase gate ────────────────────────────────────────────────────────

describe('shouldApplyRubberBand — outcome-phase gate', () => {
  const finishT = 1.0;
  const threshold = 0.9;

  it('active below endgame threshold', () => {
    expect(shouldApplyRubberBand(0.89, finishT, threshold)).toBe(true);
  });

  it('inactive at exactly the endgame threshold', () => {
    expect(shouldApplyRubberBand(0.9, finishT, threshold)).toBe(false);
  });

  it('inactive above the endgame threshold', () => {
    expect(shouldApplyRubberBand(0.95, finishT, threshold)).toBe(false);
  });

  it('rubber band target = 1.0 when OUTCOME phase active, regardless of gap', () => {
    const leaderProgress = 0.95; // past threshold → OUTCOME
    const active = shouldApplyRubberBand(leaderProgress * finishT, finishT, threshold);
    // boostActive is irrelevant since shouldApplyRubberBand returns false
    const boostActive = shouldBoostNonLeaders(0.5, DEFAULT_RUBBER_BAND_CONFIG.gapThreshold);
    const target = active
      ? computeFlatTarget(false, boostActive, DEFAULT_RUBBER_BAND_CONFIG.flatBoost)
      : 1.0;
    expect(target).toBeCloseTo(1.0, 10);
  });
});

// ── easeInOutCubic transition ──────────────────────────────────────────────────

describe('stepRubberBand easing', () => {
  it('at elapsed=0 returns prev value', () => {
    const r = {
      rubberBandMult: 1.0,
      rubberBandMultPrev: 1.0,
      rubberBandMultTarget: 1.1,
      rubberBandTransStart: 0,
    };
    expect(stepRubberBand(r, 0, 2000)).toBeCloseTo(1.0, 10);
  });

  it('at elapsed=boostRampMs returns target exactly', () => {
    const r = {
      rubberBandMult: 1.0,
      rubberBandMultPrev: 1.0,
      rubberBandMultTarget: 1.1,
      rubberBandTransStart: 0,
    };
    expect(stepRubberBand(r, 2000, 2000)).toBeCloseTo(1.1, 10);
  });

  it('at elapsed=halfway returns interpolated value (easeInOutCubic midpoint = 0.5)', () => {
    const r = {
      rubberBandMult: 1.0,
      rubberBandMultPrev: 1.0,
      rubberBandMultTarget: 1.1,
      rubberBandTransStart: 0,
    };
    // easeInOutCubic(0.5)=0.5 → value = 1.0 + 0.5 * (1.1 - 1.0) = 1.05
    expect(stepRubberBand(r, 1000, 2000)).toBeCloseTo(1.05, 10);
  });

  it('past boostRampMs stays at target (no overshoot)', () => {
    const r = {
      rubberBandMult: 1.1,
      rubberBandMultPrev: 1.0,
      rubberBandMultTarget: 1.1,
      rubberBandTransStart: 0,
    };
    expect(stepRubberBand(r, 99999, 2000)).toBeCloseTo(1.1, 10);
  });
});
