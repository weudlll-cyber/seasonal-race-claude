// CAMERA-PICTURE-FIXES-1 removed the describe blocks that covered the minimum-sprite-size FLOOR
// (`getEffectiveMinTargetScreenPx` and `computeRenderDisplayScale`'s `Math.max`). The floor is gone
// — sprites scale with the camera and nothing holds them up — so those tests covered deleted code
// and were removed rather than "adapted". What replaces them is the no-floor block at the end of
// this file, which pins the property the owner actually asked for.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeAutoScaleFactor,
  computeRenderDisplayScale,
  getEffectiveMinTargetScreenPx,
  getEffectiveMaxTargetScreenPx,
  DEFAULT_AUTO_SCALE_CONFIG,
  loadAutoScaleConfig,
  saveAutoScaleConfig,
} from './autoSpriteScale.js';

// Mock storage module
vi.mock('./storage/storage.js', () => ({
  KEYS: { AUTO_SCALE_CONFIG: 'racearena:autoScaleConfig' },
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(),
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import { storageGet, storageSet } from './storage/storage.js';

beforeEach(() => {
  vi.clearAllMocks();
  storageGet.mockReturnValue(null);
});

describe('DEFAULT_AUTO_SCALE_CONFIG', () => {
  it('exposes the required config keys', () => {
    expect(DEFAULT_AUTO_SCALE_CONFIG).toHaveProperty('enabled');
    expect(DEFAULT_AUTO_SCALE_CONFIG).toHaveProperty('referenceValue');
    expect(DEFAULT_AUTO_SCALE_CONFIG).toHaveProperty('minScale');
    expect(DEFAULT_AUTO_SCALE_CONFIG).toHaveProperty('maxScale');
    expect(DEFAULT_AUTO_SCALE_CONFIG).toHaveProperty('minTargetScreenPx');
  });
});

describe('computeAutoScaleFactor', () => {
  it('returns ≈ 1.0 for default track (140px) and 6 racers', () => {
    const factor = computeAutoScaleFactor(140, 6, DEFAULT_AUTO_SCALE_CONFIG);
    // 140 / 6 / 23 ≈ 1.014
    expect(factor).toBeGreaterThan(0.99);
    expect(factor).toBeLessThan(1.1);
  });

  it('clamps to minScale for very narrow track or many racers', () => {
    // 50 / 10 / 23 ≈ 0.217, below minScale 0.65 (Befund-3 fix: was 0.4)
    expect(computeAutoScaleFactor(50, 10, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.65);
  });

  it('clamps to maxScale for very wide track or few racers', () => {
    // 2000 / 1 / 23 ≈ 86.9, above maxScale 2.5
    expect(computeAutoScaleFactor(2000, 1, DEFAULT_AUTO_SCALE_CONFIG)).toBe(2.5);
  });

  it('returns minScale when racerCount is 0', () => {
    expect(computeAutoScaleFactor(140, 0, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.65);
  });

  it('returns minScale when trackWidth is 0', () => {
    expect(computeAutoScaleFactor(0, 6, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.65);
  });

  it('returns minScale when both are 0', () => {
    expect(computeAutoScaleFactor(0, 0, DEFAULT_AUTO_SCALE_CONFIG)).toBe(0.65);
  });

  it('minScale 0.65 floor: 6 racers on 50px track still returns at least 0.65', () => {
    // 50 / 6 / 23 ≈ 0.362 — below minScale 0.65 — floor prevents tiny sprites
    const result = computeAutoScaleFactor(50, 6, DEFAULT_AUTO_SCALE_CONFIG);
    expect(result).toBeGreaterThanOrEqual(0.65);
  });

  it('scales proportionally with larger referenceValue', () => {
    // doubling referenceValue halves the factor (before clamping)
    // Use minScale=0.3 so 0.507 is not clamped
    const cfg = { ...DEFAULT_AUTO_SCALE_CONFIG, referenceValue: 46, minScale: 0.3 };
    const factor = computeAutoScaleFactor(140, 6, cfg);
    // 140 / 6 / 46 ≈ 0.507
    expect(factor).toBeCloseTo(0.507, 2);
  });

  it('respects custom minScale', () => {
    const cfg = { ...DEFAULT_AUTO_SCALE_CONFIG, minScale: 0.2 };
    // 20 / 10 / 23 ≈ 0.087, below minScale 0.2 → clamped to 0.2
    expect(computeAutoScaleFactor(20, 10, cfg)).toBe(0.2);
  });

  it('respects custom maxScale', () => {
    const cfg = { ...DEFAULT_AUTO_SCALE_CONFIG, maxScale: 1.5 };
    expect(computeAutoScaleFactor(2000, 1, cfg)).toBe(1.5);
  });

  it('returns exact neutral at trackWidth/racerCount == referenceValue', () => {
    const factor = computeAutoScaleFactor(23, 1, DEFAULT_AUTO_SCALE_CONFIG);
    expect(factor).toBe(1);
  });
});

describe('loadAutoScaleConfig', () => {
  it('returns DEFAULT_AUTO_SCALE_CONFIG when storage is empty', () => {
    storageGet.mockReturnValue(null);
    const cfg = loadAutoScaleConfig();
    expect(cfg).toEqual(DEFAULT_AUTO_SCALE_CONFIG);
  });

  it('merges stored values with defaults', () => {
    storageGet.mockReturnValue({ enabled: true, referenceValue: 30 });
    const cfg = loadAutoScaleConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.referenceValue).toBe(30);
    expect(cfg.minScale).toBe(DEFAULT_AUTO_SCALE_CONFIG.minScale);
    expect(cfg.maxScale).toBe(DEFAULT_AUTO_SCALE_CONFIG.maxScale);
  });

  it('returns defaults when stored value is not an object', () => {
    storageGet.mockReturnValue(42);
    const cfg = loadAutoScaleConfig();
    expect(cfg).toEqual(DEFAULT_AUTO_SCALE_CONFIG);
  });

  it('does not mutate DEFAULT_AUTO_SCALE_CONFIG', () => {
    const snapshot = { ...DEFAULT_AUTO_SCALE_CONFIG };
    storageGet.mockReturnValue({ enabled: false, referenceValue: 99 });
    loadAutoScaleConfig();
    expect(DEFAULT_AUTO_SCALE_CONFIG).toEqual(snapshot);
  });
});

describe('saveAutoScaleConfig', () => {
  it('writes config to storage', () => {
    const cfg = { enabled: true, referenceValue: 30, minScale: 0.3, maxScale: 3.0 };
    saveAutoScaleConfig(cfg);
    expect(storageSet).toHaveBeenCalledWith('racearena:autoScaleConfig', cfg);
  });
});

describe('getEffectiveMaxTargetScreenPx', () => {
  it('returns globalMaxPx when typeOverridePx is undefined', () => {
    expect(getEffectiveMaxTargetScreenPx(undefined, 160)).toBe(160);
  });

  it('returns globalMaxPx when typeOverridePx is null', () => {
    expect(getEffectiveMaxTargetScreenPx(null, 160)).toBe(160);
  });

  it('returns typeOverridePx when set', () => {
    expect(getEffectiveMaxTargetScreenPx(200, 160)).toBe(200);
  });

  it('returns typeOverridePx=0 even when globalMaxPx is non-zero (falsy override)', () => {
    expect(getEffectiveMaxTargetScreenPx(0, 160)).toBe(0);
  });
});

// ── computeRenderDisplayScale — ceiling clamp (maxTargetScreenPx) ─────────────

// ── computeRenderDisplayScale: sprites scale, nothing holds them up ─────────────────────────────
// CAMERA-PICTURE-FIXES-1. The owner's rule: "die Sprites sollten immer angepasst groß sein". A
// racer's size on screen says how far in the camera is, and says nothing else. The old minimum-size
// floor bound in OVERVIEW on 9 of the 10 shipped tracks, drawing 28 px where the zoom asked for
// 17-20 px; it is gone, and these tests pin its absence.

describe('computeRenderDisplayScale — proportional, with no floor', () => {
  const DS = 36;

  it('returns the density scale untouched: screen size is purely zoom x world size', () => {
    for (const eff of [0.05, 0.25, 1, 2.5, 10]) {
      expect(computeRenderDisplayScale(DS, 1.0, eff)).toBeCloseTo(1.0, 12);
      expect(computeRenderDisplayScale(DS, 0.7, eff)).toBeCloseTo(0.7, 12);
    }
  });

  it('NO FLOOR: a far-out camera draws a genuinely tiny sprite', () => {
    // The case the floor existed for — a large closed track at OVERVIEW. It now shrinks.
    const eff = 0.064;
    const scale = computeRenderDisplayScale(DS, 1.0, eff);
    expect(DS * scale * eff).toBeCloseTo(DS * eff, 9); // 2.3 px, not the old 32 px
    expect(DS * scale * eff).toBeLessThan(5);
  });

  it('screen size is strictly monotonic in zoom — twice the zoom is twice the sprite', () => {
    const px = (eff) => DS * computeRenderDisplayScale(DS, 1.0, eff) * eff;
    expect(px(2)).toBeCloseTo(2 * px(1), 9);
    expect(px(4)).toBeCloseTo(2 * px(2), 9);
    let prev = 0;
    for (const eff of [0.1, 0.5, 1, 2, 5]) {
      const cur = px(eff);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it('the state ordering follows the zoom ordering, with no floor flattening the wide end', () => {
    // BATTLE (tightest) > LEADER > OVERVIEW (widest) — and OVERVIEW is no longer pinned to a floor.
    const px = (eff) => DS * computeRenderDisplayScale(DS, 1.0, eff) * eff;
    const overview = px(0.5),
      leader = px(1.0),
      battle = px(1.33);
    expect(battle).toBeGreaterThan(leader);
    expect(leader).toBeGreaterThan(overview);
    expect(leader / overview).toBeCloseTo(2.0, 9); // exactly the zoom ratio
  });

  it('degenerate inputs fall back to the density scale rather than dividing by zero', () => {
    for (const args of [
      [DS, 0.8, 0],
      [DS, 0.8, -1],
      [0, 0.8, 1],
      [DS, 0.8, undefined],
    ]) {
      expect(computeRenderDisplayScale(...args)).toBe(0.8);
    }
  });
});

describe('computeRenderDisplayScale — the ceiling survives (it is a different question)', () => {
  const DS = 36;

  it('clamps when the proportional size exceeds the ceiling', () => {
    const scale = computeRenderDisplayScale(DS, 1.0, 10, 160);
    expect(DS * scale * 10).toBeCloseTo(160, 9);
  });

  it('does not touch a sprite inside the ceiling', () => {
    expect(computeRenderDisplayScale(DS, 1.0, 2, 160)).toBeCloseTo(1.0, 12);
  });

  it('an absent, zero or negative ceiling means no ceiling', () => {
    for (const max of [undefined, null, 0, -5]) {
      expect(computeRenderDisplayScale(DS, 1.0, 10, max)).toBeCloseTo(1.0, 12);
    }
  });

  it('the ceiling no longer depends on a floor to decide whether to apply', () => {
    // The old guard was `maxTargetScreenPx > minTargetScreenPx`, so removing the floor could have
    // silently disabled the ceiling. It is now a plain positive check.
    const scale = computeRenderDisplayScale(DS, 1.0, 10, 40);
    expect(DS * scale * 10).toBeCloseTo(40, 9);
  });
});
