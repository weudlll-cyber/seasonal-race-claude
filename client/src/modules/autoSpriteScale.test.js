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

describe('getEffectiveMinTargetScreenPx — world-pixel floor (Block Y)', () => {
  it('floor value 36 returns 36 (generic pass-through test)', () => {
    expect(getEffectiveMinTargetScreenPx(undefined, 36)).toBe(36);
  });

  it('72px world-pixel floor returns 72', () => {
    expect(getEffectiveMinTargetScreenPx(undefined, 72)).toBe(72);
  });

  it('floor is resolution-independent: same value regardless of canvas size', () => {
    // floor value always passes through unchanged, unlike old pct×canvasH which varied by canvas size
    expect(getEffectiveMinTargetScreenPx(undefined, 36)).toBe(36);
  });

  it('type override (absolute px) wins when set', () => {
    expect(getEffectiveMinTargetScreenPx(48, 36)).toBe(48);
  });

  it('null type override falls back to world-pixel floor', () => {
    expect(getEffectiveMinTargetScreenPx(null, 36)).toBe(36);
  });

  it('type override 0 (explicit zero) is respected', () => {
    expect(getEffectiveMinTargetScreenPx(0, 36)).toBe(0);
  });
});

describe('getEffectiveMinTargetScreenPx — floor in computeRenderDisplayScale (Block Y)', () => {
  it('closed-track: floor 36px — screenPx ≥ 36 for realistic effZoom range', () => {
    const floor36 = getEffectiveMinTargetScreenPx(undefined, 36);
    for (const effZoom of [0.5, 0.8, 1.0, 1.5, 2.0]) {
      const result = computeRenderDisplayScale(40, 0.65, effZoom, floor36);
      const screenPx = 40 * result * effZoom;
      expect(screenPx).toBeGreaterThanOrEqual(floor36 - 0.001);
    }
  });

  it('open-track: effZoom ≈ 0.32 (6000px world) — floor 36 clamps render to 36px', () => {
    // 6000px world: overviewZoom = 1280/6000 ≈ 0.213; with openTrackBaseZoom=1.5 → 0.32
    const openEffZoom = 1.5 * (1280 / 6000);
    const floor36 = getEffectiveMinTargetScreenPx(undefined, 36);
    const dss = 1.44; // river-run at N=10 from diagnostic
    const result = computeRenderDisplayScale(40, dss, openEffZoom, floor36);
    const screenPx = 40 * result * openEffZoom;
    expect(screenPx).toBeCloseTo(36, 1);
    expect(screenPx).toBeGreaterThanOrEqual(36);
  });
});

describe('computeRenderDisplayScale', () => {
  const displaySize = 40;
  const displaySizeScale = 1.0145; // 140/6/23 — neutral on reference track
  const minPx = 32;

  it('no-floor case: result = displaySizeScale (proportional, floor not active)', () => {
    // effZoom=1.5 (open-track OVERVIEW): proportionalPx = 40×1.0145×1.5 = 60.9 > 32
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, 1.5, minPx);
    expect(result).toBeCloseTo(displaySizeScale, 5);
  });

  it('sprite screen size scales proportionally with effZoom (LEADER > OVERVIEW)', () => {
    // OVERVIEW: effZoom=1.5 → screenPx = 40×1.0145×1.5 = 60.9
    // LEADER:   effZoom=2.1 → screenPx = 40×1.0145×2.1 = 85.2
    const overviewScale = computeRenderDisplayScale(displaySize, displaySizeScale, 1.5, minPx);
    const leaderScale = computeRenderDisplayScale(displaySize, displaySizeScale, 2.1, minPx);
    const overviewScreenPx = displaySize * overviewScale * 1.5;
    const leaderScreenPx = displaySize * leaderScale * 2.1;
    expect(leaderScreenPx).toBeGreaterThan(overviewScreenPx);
    expect(leaderScreenPx).toBeCloseTo(85.2, 0);
    expect(overviewScreenPx).toBeCloseTo(60.9, 0);
  });

  it('1280-track + LEADER: screen size ≈ 85px (proportional, was 57px constant in D7a)', () => {
    // worldWidth=1280 open track, LEADER cam.zoom=1.4: effZoom=1.5×1.4=2.1
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, 2.1, minPx);
    const screenPx = displaySize * result * 2.1;
    expect(screenPx).toBeCloseTo(85.2, 0);
  });

  it('1280-track + OVERVIEW: screen size ≈ 61px', () => {
    // worldWidth=1280 open track, OVERVIEW cam.zoom=1.0: effZoom=1.5×1.0=1.5
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, 1.5, minPx);
    const screenPx = displaySize * result * 1.5;
    expect(screenPx).toBeCloseTo(60.9, 0);
  });

  it('floor kicks in on large closed track (effZoom≈0.064) — screenPx = 32', () => {
    // worldWidth=6000 closed track, LEADER state:
    // cam.zoom = (1280/6000)×1.4 = 0.2987, bsX = 1280/6000 = 0.2133
    // effZoom = 0.2987 × 0.2133 = 0.0637
    const effZoom = (1280 / 6000) * 1.4 * (1280 / 6000);
    const dss = computeAutoScaleFactor(140, 6, DEFAULT_AUTO_SCALE_CONFIG); // 1.0145
    const result = computeRenderDisplayScale(displaySize, dss, effZoom, minPx);
    const screenPx = displaySize * result * effZoom;
    expect(screenPx).toBeCloseTo(32, 1);
    expect(screenPx).toBeGreaterThanOrEqual(32);
  });

  it('floor protects on any large track: screenPx never falls below minTargetScreenPx', () => {
    for (const effZoom of [0.01, 0.05, 0.1, 0.15]) {
      const result = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, minPx);
      const screenPx = displaySize * result * effZoom;
      expect(screenPx).toBeGreaterThanOrEqual(minPx - 0.001);
    }
  });

  it('custom minTargetScreenPx=48: floor at 48px', () => {
    const effZoom = 0.05; // tiny, would give proportional ~2px
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, 48);
    const screenPx = displaySize * result * effZoom;
    expect(screenPx).toBeCloseTo(48, 1);
  });

  it('returns displaySizeScale for invalid effZoom (guard against divide-by-zero)', () => {
    expect(computeRenderDisplayScale(displaySize, displaySizeScale, 0, minPx)).toBe(
      displaySizeScale
    );
    expect(computeRenderDisplayScale(displaySize, displaySizeScale, -1, minPx)).toBe(
      displaySizeScale
    );
    expect(computeRenderDisplayScale(displaySize, displaySizeScale, null, minPx)).toBe(
      displaySizeScale
    );
  });

  it('returns displaySizeScale for invalid displaySize (guard)', () => {
    expect(computeRenderDisplayScale(0, displaySizeScale, 1.5, minPx)).toBe(displaySizeScale);
    expect(computeRenderDisplayScale(-5, displaySizeScale, 1.5, minPx)).toBe(displaySizeScale);
  });

  it('BATTLE > LEADER > OVERVIEW screen size (proportional ordering preserved)', () => {
    // worldWidth=1280 open track
    const overview = computeRenderDisplayScale(displaySize, displaySizeScale, 1.5, minPx);
    const leader = computeRenderDisplayScale(displaySize, displaySizeScale, 2.1, minPx);
    const battle = computeRenderDisplayScale(displaySize, displaySizeScale, 2.4, minPx);
    const overviewPx = displaySize * overview * 1.5;
    const leaderPx = displaySize * leader * 2.1;
    const battlePx = displaySize * battle * 2.4;
    expect(battlePx).toBeGreaterThan(leaderPx);
    expect(leaderPx).toBeGreaterThan(overviewPx);
  });
});

// ── getEffectiveMaxTargetScreenPx ──────────────────────────────────────────────

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

describe('computeRenderDisplayScale — ceiling clamp', () => {
  const displaySize = 40;
  const displaySizeScale = 1.0;
  const minPx = 32;

  it('no ceiling when maxTargetScreenPx is undefined — behavior unchanged', () => {
    const effZoom = 2.0; // proportional = 40*1*2 = 80px, above 32 floor
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, minPx);
    const screenPx = displaySize * result * effZoom;
    expect(screenPx).toBeCloseTo(80, 1); // no ceiling applied
  });

  it('ceiling clamps screenPx to maxTargetScreenPx when zoom pushes it over', () => {
    const effZoom = 5.0; // proportional = 40*1*5 = 200px > max=160
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, minPx, 160);
    const screenPx = displaySize * result * effZoom;
    expect(screenPx).toBeCloseTo(160, 1);
    expect(screenPx).toBeLessThanOrEqual(160.001);
  });

  it('ceiling does NOT clamp when proportional is within corridor', () => {
    const effZoom = 2.0; // proportional = 80px, within [32, 160]
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, minPx, 160);
    const screenPx = displaySize * result * effZoom;
    expect(screenPx).toBeCloseTo(80, 1);
  });

  it('floor still applies when proportional is below min, ceiling above min', () => {
    const effZoom = 0.05; // proportional = 40*1*0.05 = 2px < min=32
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, minPx, 160);
    const screenPx = displaySize * result * effZoom;
    expect(screenPx).toBeCloseTo(32, 1);
  });

  it('edge case: min > max — ceiling ignored (min wins)', () => {
    const effZoom = 5.0; // proportional = 200px
    // min=100, max=50: invalid corridor → max ignored, floor at 100 applied
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, 100, 50);
    const screenPx = displaySize * result * effZoom;
    // Floor at 100 wins; proportional 200 > 100, so proportional used (no floor)
    expect(screenPx).toBeCloseTo(200, 1);
  });

  it('edge case: displaySize=0 — returns displaySizeScale, no NaN', () => {
    const result = computeRenderDisplayScale(0, 1.5, 2.0, minPx, 160);
    expect(result).toBe(1.5);
    expect(isNaN(result)).toBe(false);
  });

  it('corridor clamping: extreme high zoom (effZoom=10) stays at ceiling', () => {
    const effZoom = 10.0; // proportional = 40*1*10 = 400px
    const result = computeRenderDisplayScale(displaySize, displaySizeScale, effZoom, minPx, 160);
    const screenPx = displaySize * result * effZoom;
    expect(screenPx).toBeCloseTo(160, 1);
  });
});
