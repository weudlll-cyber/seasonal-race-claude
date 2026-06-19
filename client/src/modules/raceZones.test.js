// ============================================================
// File:        raceZones.test.js
// Path:        client/src/modules/raceZones.test.js
// Project:     RaceArena
// Created:     2026-06-19
// Description: Unit tests for raceZones pure zone logic (resolveZones + zoneMultAt)
// ============================================================

import { describe, it, expect } from 'vitest';
import { resolveZones, zoneMultAt } from './raceZones.js';

const DISABLED = { enabled: false, position: 0.5, width: 0.05, brakeStrength: 0.85 };
const ENABLED = { enabled: true, position: 0.5, width: 0.05, brakeStrength: 0.85 };

describe('resolveZones', () => {
  it('returns [] when disabled', () => {
    expect(resolveZones(DISABLED, false)).toEqual([]);
  });

  it('returns [] for null/undefined config', () => {
    expect(resolveZones(null, false)).toEqual([]);
    expect(resolveZones(undefined, false)).toEqual([]);
  });

  it('returns a single zone when enabled (closed)', () => {
    const zones = resolveZones(ENABLED, false);
    expect(zones).toHaveLength(1);
    expect(zones[0].mult).toBe(0.85);
  });

  it('zone tStart/tEnd bracket the position symmetrically (closed)', () => {
    const zones = resolveZones(ENABLED, false);
    // position=0.5, width=0.05 → tStart=0.475, tEnd=0.525
    expect(zones[0].tStart).toBeCloseTo(0.475);
    expect(zones[0].tEnd).toBeCloseTo(0.525);
  });

  it('normal zone: tStart < tEnd (no seam, closed)', () => {
    const zones = resolveZones(ENABLED, false);
    expect(zones[0].tStart).toBeLessThan(zones[0].tEnd);
  });

  it('CLOSED: seam-straddling zone wraps when position is near boundary (position=0.02, width=0.06)', () => {
    const cfg = { enabled: true, position: 0.02, width: 0.06, brakeStrength: 0.85 };
    const zones = resolveZones(cfg, false);
    // tStart = 0.02 - 0.03 = -0.01 → wraps to 0.99; tEnd = 0.02 + 0.03 = 0.05
    expect(zones[0].tStart).toBeGreaterThan(zones[0].tEnd);
  });

  it('CLOSED: seam wraps (position=0.98, width=0.08 → tStart>tEnd)', () => {
    const cfg = { enabled: true, position: 0.98, width: 0.08, brakeStrength: 0.85 };
    const zones = resolveZones(cfg, false);
    // tStart = 0.94, tEnd = ((1.02 % 1) + 1) % 1 = 0.02
    expect(zones[0].tStart).toBeCloseTo(0.94);
    expect(zones[0].tEnd).toBeCloseTo(0.02);
    expect(zones[0].tStart).toBeGreaterThan(zones[0].tEnd);
  });

  it('OPEN: zone clamps when extending past 1 (position=0.95, width=0.2 → tEnd clamped to 1, no seam)', () => {
    const cfg = { enabled: true, position: 0.95, width: 0.2, brakeStrength: 0.85 };
    const zones = resolveZones(cfg, true);
    // tStart = max(0, 0.85) = 0.85; tEnd = min(1, 1.05) = 1.0
    expect(zones[0].tStart).toBeCloseTo(0.85);
    expect(zones[0].tEnd).toBe(1.0);
    expect(zones[0].tStart).toBeLessThan(zones[0].tEnd);
  });

  it('OPEN: zone clamps when extending below 0 (position=0.02, width=0.06 → tStart clamped to 0, no seam)', () => {
    const cfg = { enabled: true, position: 0.02, width: 0.06, brakeStrength: 0.85 };
    const zones = resolveZones(cfg, true);
    // tStart = max(0, -0.01) = 0; tEnd = min(1, 0.05) = 0.05
    expect(zones[0].tStart).toBe(0);
    expect(zones[0].tEnd).toBeCloseTo(0.05);
    expect(zones[0].tStart).toBeLessThan(zones[0].tEnd);
  });
});

describe('zoneMultAt', () => {
  it('returns 1.0 for empty zones', () => {
    expect(zoneMultAt(0.5, [])).toBe(1.0);
  });

  it('returns mult when zt is inside normal zone', () => {
    const zones = resolveZones(ENABLED, false); // covers [0.475, 0.525)
    expect(zoneMultAt(0.5, zones)).toBe(0.85);
  });

  it('returns 1.0 when zt is outside normal zone', () => {
    const zones = resolveZones(ENABLED, false); // covers [0.475, 0.525)
    expect(zoneMultAt(0.1, zones)).toBe(1.0);
    expect(zoneMultAt(0.9, zones)).toBe(1.0);
  });

  it('zt at exact tStart is inside the zone', () => {
    const zones = resolveZones(ENABLED, false);
    // Use the actual computed tStart to avoid floating-point comparison hazards.
    expect(zoneMultAt(zones[0].tStart, zones)).toBe(0.85);
  });

  it('zt at exact tEnd is outside the zone (exclusive upper bound)', () => {
    const zones = resolveZones(ENABLED, false);
    // Use the actual computed tEnd to avoid floating-point comparison hazards.
    expect(zoneMultAt(zones[0].tEnd, zones)).toBe(1.0);
  });

  it('SEAM zone (tStart 0.96, tEnd 0.04): zt 0.00 is inside', () => {
    const zones = [{ tStart: 0.96, tEnd: 0.04, mult: 0.85 }];
    expect(zoneMultAt(0.0, zones)).toBe(0.85);
  });

  it('SEAM zone (tStart 0.96, tEnd 0.04): zt 0.5 is outside', () => {
    const zones = [{ tStart: 0.96, tEnd: 0.04, mult: 0.85 }];
    expect(zoneMultAt(0.5, zones)).toBe(1.0);
  });

  it('SEAM zone (tStart 0.96, tEnd 0.04): zt 0.97 is inside', () => {
    const zones = [{ tStart: 0.96, tEnd: 0.04, mult: 0.85 }];
    expect(zoneMultAt(0.97, zones)).toBe(0.85);
  });

  it('SEAM zone (tStart 0.96, tEnd 0.04): zt 0.03 is inside', () => {
    const zones = [{ tStart: 0.96, tEnd: 0.04, mult: 0.85 }];
    expect(zoneMultAt(0.03, zones)).toBe(0.85);
  });

  it('safety clamp: mult 0.5 is clamped to 0.80', () => {
    const zones = [{ tStart: 0.4, tEnd: 0.6, mult: 0.5 }];
    expect(zoneMultAt(0.5, zones)).toBe(0.8);
  });

  it('safety clamp: mult 1.5 is clamped to 1.20', () => {
    const zones = [{ tStart: 0.4, tEnd: 0.6, mult: 1.5 }];
    expect(zoneMultAt(0.5, zones)).toBe(1.2);
  });

  it('result for outside-zone position is exactly 1.0 (never clamped from outside)', () => {
    const zones = [{ tStart: 0.4, tEnd: 0.6, mult: 0.85 }];
    expect(zoneMultAt(0.1, zones)).toBe(1.0);
  });
});
