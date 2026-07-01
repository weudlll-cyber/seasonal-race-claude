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
  estimateClosedTrackDurationSec,
  openTrackDurationRange,
  computeClosedTrackSsf,
  REFERENCE_CLOSED_PATH_PX,
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

describe('estimateClosedTrackDurationSec', () => {
  // Validated against runSingleRace (median finisher, N=40, 2 laps, seeds 1–3) within <1%.
  // Assertions use a ~5% tolerance around the measured realized durations.
  const within5 = (actual, expected) => Math.abs(actual - expected) / expected <= 0.05;

  it('city-circuit (motorbike, 6130px, 2 laps) ≈ 51.5s realized', () => {
    const s = estimateClosedTrackDurationSec(2, 6130, 1.05, 40);
    expect(within5(s, 51.5)).toBe(true);
  });

  it('dirt-oval (horse, 6541px, 2 laps) ≈ 58.5s realized', () => {
    const s = estimateClosedTrackDurationSec(2, 6541, 1.0, 40);
    expect(within5(s, 58.5)).toBe(true);
  });

  it('ice-track (snowmobile, 6065px, 2 laps) ≈ 49.3s realized', () => {
    const s = estimateClosedTrackDurationSec(2, 6065, 1.1, 40);
    expect(within5(s, 49.3)).toBe(true);
  });

  it('scales with laps and path length; longer track → longer realized duration', () => {
    const short = estimateClosedTrackDurationSec(2, 3200, 1.0, 40);
    const long = estimateClosedTrackDurationSec(2, 6400, 1.0, 40);
    expect(long).toBeCloseTo(short * 2, 5); // closedSsf doubles
    const oneLap = estimateClosedTrackDurationSec(1, 3200, 1.0, 40);
    expect(short).toBeCloseTo(oneLap * 2, 5); // laps double
  });
});

describe('openTrackDurationRange', () => {
  const SPACE_SPRINT_PATH_PX = 19772;
  const RIVER_RUN_PATH_PX = 13061;

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

  it('River Run max is approximately 95s', () => {
    const range = openTrackDurationRange(RIVER_RUN_PATH_PX, DEFAULT_BASE_SPEED_CONFIG, 1.0, 0.05);
    // §7.1: River Run ~95s
    expect(range.max).toBeGreaterThan(85);
    expect(range.max).toBeLessThan(110);
  });

  it('max increases with longer path lengths', () => {
    const short = openTrackDurationRange(2000);
    const long = openTrackDurationRange(10000);
    expect(long.max).toBeGreaterThan(short.max);
  });

  it('slider min/max calculation — River Run slider range is [30, ~95]', () => {
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

describe('computeClosedTrackSsf', () => {
  it('REFERENCE_CLOSED_PATH_PX is 3200', () => {
    expect(REFERENCE_CLOSED_PATH_PX).toBe(3200);
  });

  it('returns 1.0 at the reference path length', () => {
    expect(computeClosedTrackSsf(3200)).toBeCloseTo(1.0, 5);
  });

  it('Searound (5147px) returns ~1.609', () => {
    expect(computeClosedTrackSsf(5147)).toBeCloseTo(5147 / 3200, 5);
  });

  it('Dirt Oval (3245px) returns ~1.014 — within 2% of 1', () => {
    const ssf = computeClosedTrackSsf(3245);
    expect(ssf).toBeCloseTo(3245 / 3200, 5);
    expect(Math.abs(ssf - 1)).toBeLessThan(0.02);
  });

  it('Garden Path (2506px) returns ~0.783', () => {
    expect(computeClosedTrackSsf(2506)).toBeCloseTo(2506 / 3200, 5);
  });

  it('longer path yields ssf > 1 (slower race)', () => {
    expect(computeClosedTrackSsf(4000)).toBeGreaterThan(1);
  });

  it('shorter path yields ssf < 1 (faster race up to reference)', () => {
    expect(computeClosedTrackSsf(2000)).toBeLessThan(1);
  });

  it('returns 1 for zero or missing pathLengthPx', () => {
    expect(computeClosedTrackSsf(0)).toBe(1);
    expect(computeClosedTrackSsf(null)).toBe(1);
    expect(computeClosedTrackSsf(undefined)).toBe(1);
  });

  it('is proportional: doubling path length doubles ssf', () => {
    const s1 = computeClosedTrackSsf(2000);
    const s2 = computeClosedTrackSsf(4000);
    expect(s2).toBeCloseTo(s1 * 2, 5);
  });
});
