// ============================================================
// File:        configFingerprint.test.js
// Path:        client/src/modules/parity/configFingerprint.test.js
// Description: Pins the HUD config-fingerprint COUNT logic (fix-plan step 4). The visual gets the
//              owner's eye later; the count must be exact.
// ============================================================

import { describe, it, expect } from 'vitest';
import { countConfigDiffs, configFingerprintSummary } from './configFingerprint.js';

const defaults = {
  raceDynamicsConfig: { a: 1, b: 2, nested: { x: 1 } },
  raceBehaviorConfig: { runoutZone: 0.05, draftingBoost: 1.04 },
  rowLayoutConfig: { rowGapMultiplier: 1.5 },
  baseSpeedConfig: { min: 0.9, max: 1.1 },
  autoScaleConfig: { enabled: true },
  frameTimingConfig: { dtSmoothingAlpha: 0.8 },
  cameraConfig: { countdownDurationMs: 4000 },
};

describe('countConfigDiffs — the badge count logic', () => {
  it('identical worlds → 0 diffs (on defaults)', () => {
    const r = countConfigDiffs(structuredClone(defaults), defaults);
    expect(r.count).toBe(0);
    expect(r.keys).toEqual([]);
  });

  it('a single changed leaf → 1 diff, named block.key', () => {
    const cur = structuredClone(defaults);
    cur.raceBehaviorConfig.runoutZone = 0.08;
    const r = countConfigDiffs(cur, defaults);
    expect(r.count).toBe(1);
    expect(r.keys).toEqual(['raceBehaviorConfig.runoutZone']);
  });

  it('changes across multiple blocks sum, and are reported by name', () => {
    const cur = structuredClone(defaults);
    cur.raceDynamicsConfig.a = 99;
    cur.baseSpeedConfig.max = 1.2;
    cur.cameraConfig.countdownDurationMs = 2000;
    const r = countConfigDiffs(cur, defaults);
    expect(r.count).toBe(3);
    expect(r.keys).toContain('raceDynamicsConfig.a');
    expect(r.keys).toContain('baseSpeedConfig.max');
    expect(r.keys).toContain('cameraConfig.countdownDurationMs');
  });

  it('a nested-object change is detected (canonical value compare, order-insensitive)', () => {
    const cur = structuredClone(defaults);
    cur.raceDynamicsConfig.nested = { x: 2 };
    expect(countConfigDiffs(cur, defaults).count).toBe(1);
    // reordering keys is NOT a diff
    const reordered = structuredClone(defaults);
    reordered.baseSpeedConfig = { max: 1.1, min: 0.9 };
    expect(countConfigDiffs(reordered, defaults).count).toBe(0);
  });

  it('a key present on one side only counts as a diff', () => {
    const cur = structuredClone(defaults);
    cur.rowLayoutConfig.speedBonusFactor = 1.0; // added
    expect(countConfigDiffs(cur, defaults).count).toBe(1);
    const missing = structuredClone(defaults);
    delete missing.baseSpeedConfig.min; // removed
    expect(countConfigDiffs(missing, defaults).count).toBe(1);
  });
});

describe('configFingerprintSummary', () => {
  it('on defaults → onDefaults true, diffCount 0, hashes present', () => {
    const s = configFingerprintSummary({
      currentWorld: structuredClone(defaults),
      defaultsWorld: defaults,
      trackGeometryHash: 'aaaaaaaa',
      rosterHash: 'bbbbbbbb',
    });
    expect(s.onDefaults).toBe(true);
    expect(s.diffCount).toBe(0);
    expect(s.worldHash).toMatch(/^[0-9a-f]{6}$/);
    expect(s.identityHash).toMatch(/^[0-9a-f]{6}$/);
  });

  it('off defaults → onDefaults false, prominent count', () => {
    const cur = structuredClone(defaults);
    cur.baseSpeedConfig.max = 1.3;
    const s = configFingerprintSummary({ currentWorld: cur, defaultsWorld: defaults });
    expect(s.onDefaults).toBe(false);
    expect(s.diffCount).toBe(1);
  });
});
