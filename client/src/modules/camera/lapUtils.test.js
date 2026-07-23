// ============================================================
// File:        lapUtils.test.js
// Path:        client/src/modules/camera/lapUtils.test.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: Unit tests for lap bookkeeping.
//
// The suites that used to live here — lapsFromDuration, estimatedSecondsPerLap,
// estimateClosedTrackDurationSec, openTrackDurationRange, computeClosedTrackSsf —
// tested derivations deleted at the speed/duration ship. Their replacement lives in
// client/src/modules/durationModel.test.js, which pins the ONE canonical model.
// ============================================================

import { describe, it, expect } from 'vitest';
import { lapProgress, currentLap, REFERENCE_FPS } from './lapUtils.js';

describe('REFERENCE_FPS', () => {
  it('is the 16 ms physics frame reference', () => {
    expect(REFERENCE_FPS).toBe(62.5);
    expect(1000 / REFERENCE_FPS).toBe(16);
  });
});

describe('lapProgress', () => {
  it('returns 0 at start', () => {
    expect(lapProgress(0, 4)).toBe(0);
  });

  it('returns 1 when t equals maxLaps', () => {
    expect(lapProgress(4, 4)).toBe(1);
  });

  it('clamps above 1', () => {
    expect(lapProgress(5, 4)).toBe(1);
  });

  it('returns 0.5 halfway through', () => {
    expect(lapProgress(2, 4)).toBeCloseTo(0.5);
  });
});

describe('currentLap', () => {
  it('returns 1 at start', () => {
    expect(currentLap(0, 4)).toBe(1);
  });

  it('returns 2 after first lap', () => {
    expect(currentLap(1.0, 4)).toBe(2);
  });

  it('caps at maxLaps', () => {
    expect(currentLap(10, 4)).toBe(4);
  });
});
