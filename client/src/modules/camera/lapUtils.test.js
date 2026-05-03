// ============================================================
// File:        lapUtils.test.js
// Path:        client/src/modules/camera/lapUtils.test.js
// Project:     RaceArena
// Created:     2026-04-22
// Description: Unit tests for lap utilities and openTrackDurationRange
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  lapsFromDuration,
  lapProgress,
  currentLap,
  estimatedSecondsPerLap,
  openTrackDurationRange,
  REFERENCE_FPS,
} from './lapUtils.js';
import { DEFAULT_BASE_SPEED_CONFIG } from '../storage/defaults.js';

describe('lapsFromDuration', () => {
  it('returns 1 for durations under 60s', () => {
    expect(lapsFromDuration(30)).toBe(1);
    expect(lapsFromDuration(59)).toBe(1);
  });

  it('returns 2 for 60s', () => {
    expect(lapsFromDuration(60)).toBe(2);
  });

  it('returns 3 for 90s', () => {
    expect(lapsFromDuration(90)).toBe(3);
  });

  it('returns 4 for 120s and above', () => {
    expect(lapsFromDuration(120)).toBe(4);
    expect(lapsFromDuration(180)).toBe(4);
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

describe('estimatedSecondsPerLap', () => {
  it('returns a positive number', () => {
    expect(estimatedSecondsPerLap(1.0)).toBeGreaterThan(0);
  });

  it('scales inversely with speedMultiplier', () => {
    const base = estimatedSecondsPerLap(1.0);
    const fast = estimatedSecondsPerLap(2.0);
    expect(fast).toBeCloseTo(base / 2, 3);
  });
});

describe('openTrackDurationRange', () => {
  const SPACE_SPRINT_PATH_PX = 19772;
  const RIVER_RUN_PATH_PX = 6156;

  it('min is always 30', () => {
    const range = openTrackDurationRange(RIVER_RUN_PATH_PX);
    expect(range.min).toBe(30);
  });

  it('max is at least min for very short paths', () => {
    const range = openTrackDurationRange(100);
    expect(range.max).toBeGreaterThanOrEqual(range.min);
  });

  it('Space Sprint max is approximately 144s', () => {
    const range = openTrackDurationRange(
      SPACE_SPRINT_PATH_PX,
      DEFAULT_BASE_SPEED_CONFIG,
      1.0,
      0.05
    );
    // §7.1: Space Sprint ~144s at internal ssf=9.886
    expect(range.max).toBeGreaterThan(130);
    expect(range.max).toBeLessThan(160);
  });

  it('River Run max is approximately 45s', () => {
    const range = openTrackDurationRange(RIVER_RUN_PATH_PX, DEFAULT_BASE_SPEED_CONFIG, 1.0, 0.05);
    // §7.1: River Run ~45s at ssf=3.08
    expect(range.max).toBeGreaterThan(35);
    expect(range.max).toBeLessThan(60);
  });

  it('max increases with longer path lengths', () => {
    const short = openTrackDurationRange(2000);
    const long = openTrackDurationRange(10000);
    expect(long.max).toBeGreaterThan(short.max);
  });

  it('slider min/max calculation — River Run slider range is [30, ~45]', () => {
    const range = openTrackDurationRange(RIVER_RUN_PATH_PX, DEFAULT_BASE_SPEED_CONFIG, 1.0, 0.05);
    expect(range.min).toBe(30);
    expect(range.max).toBeGreaterThanOrEqual(30);
  });

  it('runoutZone=0 gives slightly higher max than runoutZone=0.05', () => {
    const withRunout = openTrackDurationRange(
      SPACE_SPRINT_PATH_PX,
      DEFAULT_BASE_SPEED_CONFIG,
      1.0,
      0.05
    );
    const noRunout = openTrackDurationRange(
      SPACE_SPRINT_PATH_PX,
      DEFAULT_BASE_SPEED_CONFIG,
      1.0,
      0.0
    );
    expect(noRunout.max).toBeGreaterThanOrEqual(withRunout.max);
  });
});
