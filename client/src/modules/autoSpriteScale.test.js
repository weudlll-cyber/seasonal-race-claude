// CAMERA-PICTURE-FIXES-1 removed the minimum-sprite-size floor; CAMERA-MIN-DRAW-1 brought it back
// with its purpose stated and its implementation fixed — a FRACTION OF THE FRAME rather than
// absolute screen pixels, and drawing-only rather than a second zoom authority.
//
// The blocks below are therefore in three parts, and the middle one is the point:
//   • PROPORTIONAL — with the floor OFF, screen size is purely zoom x world size (unchanged).
//   • THE FLOOR    — what it guarantees, where it binds, and a failure proof of the picture
//                    without it (the owner's Space Sprint start formation).
//   • THE CEILING  — a different question, untouched.
// `getEffectiveMinTargetScreenPx` is NOT back: the old per-type absolute-pixel override belonged to
// the old implementation, and nothing asked for it to return.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeAutoScaleFactor,
  computeRenderDisplayScale,
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

describe('computeRenderDisplayScale — proportional when the floor is OFF', () => {
  const DS = 36;

  it('returns the density scale untouched: screen size is purely zoom x world size', () => {
    for (const eff of [0.05, 0.25, 1, 2.5, 10]) {
      expect(computeRenderDisplayScale(DS, 1.0, eff)).toBeCloseTo(1.0, 12);
      expect(computeRenderDisplayScale(DS, 0.7, eff)).toBeCloseTo(0.7, 12);
    }
  });

  it('floor OFF: a far-out camera draws a genuinely tiny sprite', () => {
    // With the floor at 0 the old behaviour is exactly reproduced — nothing holds the sprite up.
    const eff = 0.064;
    const scale = computeRenderDisplayScale(DS, 1.0, eff, undefined, 0);
    expect(DS * scale * eff).toBeCloseTo(DS * eff, 9); // 2.3 px
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

  it('the state ordering follows the zoom ordering when nothing binds', () => {
    // BATTLE (tightest) > LEADER > OVERVIEW (widest), in exact proportion to the zoom.
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

// ── CAMERA-MIN-DRAW-1: the readability floor ─────────────────────────────────────────────────
// The owner found this himself and his evidence settled it: the Space Sprint START formation used
// to overlap slightly and no longer did. Same 20 slots, same grid — the sprites had shrunk.
describe('computeRenderDisplayScale — the readability FLOOR', () => {
  const DS = 36;
  const CH = 720;
  const FRAC = 0.045; // the shipped default
  const px = (eff, frac = FRAC, scale = 1.0) =>
    DS * computeRenderDisplayScale(DS, scale, eff, undefined, frac, CH) * eff;

  it('guarantees the fraction exactly, and not a pixel more', () => {
    // eff 0.064 would draw 2.3 px; the floor lifts it to 4.5% of 720 = 32.4 px.
    expect(px(0.064)).toBeCloseTo(FRAC * CH, 9);
    expect(px(0.2)).toBeCloseTo(FRAC * CH, 9);
  });

  it('does nothing at all once the sprite is big enough', () => {
    const eff = 2;
    expect(px(eff)).toBeCloseTo(DS * eff, 9); // purely zoom x world size
    expect(computeRenderDisplayScale(DS, 1.0, eff, undefined, FRAC, CH)).toBeCloseTo(1.0, 12);
  });

  it('is a floor, not a target — screen size still rises with zoom above it', () => {
    const a = px(1);
    const b = px(2);
    expect(b).toBeCloseTo(2 * a, 9);
    expect(a).toBeGreaterThan(FRAC * CH);
  });

  it('0 turns it off, and so does a missing value', () => {
    const eff = 0.064;
    expect(px(eff, 0)).toBeCloseTo(DS * eff, 9);
    expect(DS * computeRenderDisplayScale(DS, 1.0, eff) * eff).toBeCloseTo(DS * eff, 9);
  });

  it('is a FRACTION of the frame — a taller canvas gets a proportionally larger floor', () => {
    // This is the whole reason it is not 32 absolute pixels any more.
    const eff = 0.064;
    const at = (h) => DS * computeRenderDisplayScale(DS, 1.0, eff, undefined, FRAC, h) * eff;
    expect(at(720)).toBeCloseTo(0.045 * 720, 9);
    expect(at(1440)).toBeCloseTo(0.045 * 1440, 9);
    expect(at(1440) / at(720)).toBeCloseTo(2, 9);
  });

  it('outranks the ceiling — being readable beats being small', () => {
    // A contradictory pair (floor above ceiling) must resolve, and it resolves upward.
    const eff = 0.064;
    const scale = computeRenderDisplayScale(DS, 1.0, eff, 10, FRAC, CH);
    expect(DS * scale * eff).toBeCloseTo(FRAC * CH, 9);
  });

  // FAILURE PROOF — the owner's own picture, as arithmetic. On Space Sprint the racer is drawn at
  // 14.3 world px and OVERVIEW's frameEffZoom is 1.6, so without a floor it is 22.8 screen px:
  // 3.17% of the frame, against the 4.44% he had approved. That 29% shrink is what stopped the
  // start formation overlapping.
  it('FAILURE PROOF: without the floor the Space Sprint start draws at 3.17% of the frame', () => {
    const DRAWN_WORLD = 14.25;
    const OVERVIEW_EFF = 1.6;
    const bare =
      DRAWN_WORLD *
      computeRenderDisplayScale(DRAWN_WORLD, 1.0, OVERVIEW_EFF, undefined, 0) *
      OVERVIEW_EFF;
    expect(bare).toBeCloseTo(22.8, 1);
    expect(bare / 720).toBeLessThan(0.035); // unreadably small, and below what he approved
    const floored =
      DRAWN_WORLD *
      computeRenderDisplayScale(DRAWN_WORLD, 1.0, OVERVIEW_EFF, undefined, FRAC, 720) *
      OVERVIEW_EFF;
    expect(floored).toBeCloseTo(32.4, 1); // back to the size in his reference image (32.0)
    expect(floored / bare).toBeCloseTo(1.42, 2);
  });
});
