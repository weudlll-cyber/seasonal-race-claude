// ============================================================
// File:        raceBaseSpeed.test.js
// Path:        client/src/modules/raceBaseSpeed.test.js
// Project:     RaceArena
// Created:     2026-05-03
// Description: Unit tests for computeRaceBaseSpeed (PR-A2)
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeRaceBaseSpeed } from './raceBaseSpeed.js';

const REFERENCE_FPS = 62.5;

describe('computeRaceBaseSpeed', () => {
  it('median racer reaches open-track finishT in exactly targetDuration', () => {
    const rbsp = computeRaceBaseSpeed(0.95, 30);
    // rbsp * REFERENCE_FPS * 30 should equal finishT=0.95
    expect(rbsp * REFERENCE_FPS * 30).toBeCloseTo(0.95, 5);
  });

  it('closed track — 2 laps in 60s', () => {
    const rbsp = computeRaceBaseSpeed(2, 60);
    expect(rbsp * REFERENCE_FPS * 60).toBeCloseTo(2, 5);
  });

  it('closed track — 4 laps in 120s', () => {
    const rbsp = computeRaceBaseSpeed(4, 120);
    expect(rbsp * REFERENCE_FPS * 120).toBeCloseTo(4, 5);
  });

  it('returns 0 for zero duration', () => {
    expect(computeRaceBaseSpeed(0.95, 0)).toBe(0);
  });

  it('returns 0 for negative duration', () => {
    expect(computeRaceBaseSpeed(0.95, -10)).toBe(0);
  });

  it('proportional to finishT for same duration', () => {
    const r1 = computeRaceBaseSpeed(0.5, 30);
    const r2 = computeRaceBaseSpeed(1.0, 30);
    expect(r2).toBeCloseTo(r1 * 2, 5);
  });

  it('inversely proportional to targetDuration for same finishT', () => {
    const r30 = computeRaceBaseSpeed(0.95, 30);
    const r60 = computeRaceBaseSpeed(0.95, 60);
    expect(r30).toBeCloseTo(r60 * 2, 5);
  });

  it('open track 30s — numeric value is in expected range', () => {
    const rbsp = computeRaceBaseSpeed(0.95, 30);
    // 0.95 / (62.5 * 30) ≈ 0.000507
    expect(rbsp).toBeCloseTo(0.000507, 6);
  });

  it('racer with speedMultiplier=1.25 reaches finishT in targetDuration/1.25', () => {
    const rbsp = computeRaceBaseSpeed(0.95, 60);
    const sm = 1.25;
    const framesNeeded = 0.95 / (rbsp * sm);
    const secondsNeeded = framesNeeded / REFERENCE_FPS;
    expect(secondsNeeded).toBeCloseTo(60 / sm, 2);
  });
});
