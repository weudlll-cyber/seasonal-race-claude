// ============================================================
// File:        SpriteRacerType.test.js
// Path:        client/src/modules/racer-types/SpriteRacerType.test.js
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for SpriteRacerType configuration-driven base class (D3.5).
//              Covers: constructor validation, defaults, all public methods,
//              tinting path switching, and rteDefinitions reservation.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpriteRacerType } from './SpriteRacerType.js';
import { getCachedSprite } from './spriteLoader.js';
import { getCoatVariants, tintSprite, tintSpriteWithMask } from './spriteTinter.js';

vi.mock('./spriteLoader.js', () => ({
  getCachedSprite: vi.fn(),
  loadSprite: vi.fn().mockResolvedValue({}),
  _clearSpriteCache: vi.fn(),
}));

vi.mock('./spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockResolvedValue(new Map());
  getCoatVariants.cached = vi.fn();
  return {
    getCoatVariants,
    tintSprite: vi.fn().mockReturnValue({ _isTinted: true }),
    tintSpriteWithMask: vi.fn().mockReturnValue({ _isMaskTinted: true }),
    _clearTintCache: vi.fn(),
    _clearMaskedTintCache: vi.fn(),
  };
});

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowBlur: 0,
    shadowColor: '',
    lineWidth: 0,
    globalAlpha: 1,
  };
}

const MOCK_RACER = { x: 100, y: 100, angle: 0, baseSpeed: 2, index: 0 };

function makeConfig(overrides = {}) {
  return {
    id: 'test-type',
    emoji: '🐴',
    spriteUrl: '/assets/test.png',
    frameCount: 4,
    basePeriodMs: 600,
    displaySize: 40,
    coats: [
      { id: 'base', name: 'Base', tint: null },
      { id: 'red', name: 'Red', tint: '#ff0000' },
    ],
    defaultCoatId: 'base',
    primaryColor: '#E8DCC4',
    accentColor: '#2A1F18',
    leaderRingColor: '#ffd700',
    leaderEllipseRx: 16,
    leaderEllipseRy: 10,
    trailFactory: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

describe('SpriteRacerType — constructor: required field validation', () => {
  afterEach(() => vi.clearAllMocks());

  for (const field of [
    'id',
    'spriteUrl',
    'frameCount',
    'basePeriodMs',
    'displaySize',
    'coats',
    'trailFactory',
  ]) {
    it(`throws when "${field}" is missing`, () => {
      const cfg = makeConfig({ [field]: undefined });
      expect(() => new SpriteRacerType(cfg)).toThrow(field);
    });
  }

  it('throws when tintMode is "mask" but maskUrl is not set', () => {
    expect(() => new SpriteRacerType(makeConfig({ tintMode: 'mask' }))).toThrow(/maskUrl/);
  });

  it('throws TypeError when rteDefinitions is explicitly a non-array', () => {
    expect(() => new SpriteRacerType(makeConfig({ rteDefinitions: 'bad' }))).toThrow(TypeError);
  });
});

describe('SpriteRacerType — constructor: defaults', () => {
  afterEach(() => vi.clearAllMocks());

  it('silhouetteScale defaults to 1.0 when not provided', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.config.silhouetteScale).toBe(1.0);
  });

  it('silhouetteScale can be overridden', () => {
    const rt = new SpriteRacerType(makeConfig({ silhouetteScale: 1.5 }));
    expect(rt.config.silhouetteScale).toBe(1.5);
  });

  it('fallbackColor defaults to primaryColor when not provided', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.config.fallbackColor).toBe('#E8DCC4');
  });

  it('fallbackColor is used when explicitly set (Snail-Pattern)', () => {
    const rt = new SpriteRacerType(makeConfig({ fallbackColor: '#3A2E1F' }));
    expect(rt.config.fallbackColor).toBe('#3A2E1F');
  });

  it('tintMode defaults to "multiply"', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.config.tintMode).toBe('multiply');
  });

  it('speedMultiplier defaults to 1.0', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.config.speedMultiplier).toBe(1.0);
  });

  it('baseRotationOffset defaults to Math.PI / 2', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.config.baseRotationOffset).toBeCloseTo(Math.PI / 2);
  });

  it('frameWidth defaults to 128', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.config.frameWidth).toBe(128);
  });

  it('frameHeight defaults to 128', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.config.frameHeight).toBe(128);
  });

  it('rteDefinitions defaults to [] when not provided', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.config.rteDefinitions).toEqual([]);
  });

  it('rteDefinitions is accepted as-is when an array is provided', () => {
    const defs = [{ type: 'splash', intensity: 2 }, { type: 'fire' }];
    const rt = new SpriteRacerType(makeConfig({ rteDefinitions: defs }));
    expect(rt.config.rteDefinitions).toBe(defs);
  });

  it('accepts tintMode "mask" when maskUrl is also provided', () => {
    expect(
      () => new SpriteRacerType(makeConfig({ tintMode: 'mask', maskUrl: '/mask.png' }))
    ).not.toThrow();
  });
});

describe('SpriteRacerType — identity methods', () => {
  let rt;
  beforeEach(() => {
    rt = new SpriteRacerType(makeConfig({ emoji: '🐎', speedMultiplier: 0.85 }));
  });
  afterEach(() => vi.clearAllMocks());

  it('getEmoji returns config.emoji', () => {
    expect(rt.getEmoji()).toBe('🐎');
  });

  it('getSpeedMultiplier returns the configured value', () => {
    expect(rt.getSpeedMultiplier()).toBe(0.85);
  });

  it('getSpeedMultiplier returns the default 1.0 when not overridden', () => {
    const rt2 = new SpriteRacerType(makeConfig());
    expect(rt2.getSpeedMultiplier()).toBe(1.0);
  });
});

describe('SpriteRacerType — _getFrameIndex', () => {
  let rt;
  beforeEach(() => {
    rt = new SpriteRacerType(makeConfig({ frameCount: 4, basePeriodMs: 600 }));
  });
  afterEach(() => vi.clearAllMocks());

  it('returns 0 at frame=0', () => {
    expect(rt._getFrameIndex(0, 1)).toBe(0);
  });

  it('returns approximately frameCount/2 at half the period', () => {
    const idx = rt._getFrameIndex(300, 1); // 300ms = half of 600ms period
    expect(idx).toBe(2); // floor(0.5 * 4) = 2
  });

  it('stays in range [0, frameCount-1] over many cycles', () => {
    for (let frame = 0; frame <= 10000; frame += 37) {
      for (const speed of [0.3, 1, 2, 5]) {
        const idx = rt._getFrameIndex(frame, speed);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(rt.config.frameCount - 1);
      }
    }
  });

  it('higher speed produces a higher frame index at the same timestamp', () => {
    const idx1 = rt._getFrameIndex(150, 1);
    const idx2 = rt._getFrameIndex(150, 2);
    expect(idx2).toBeGreaterThanOrEqual(idx1);
  });

  it('cycles through all frames over one period', () => {
    const { frameCount, basePeriodMs } = rt.config;
    const binWidth = basePeriodMs / frameCount;
    const seen = new Set();
    for (let i = 0; i < frameCount; i++) {
      seen.add(rt._getFrameIndex(Math.floor(i * binWidth + binWidth / 2), 1));
    }
    expect(seen.size).toBe(frameCount);
  });
});

describe('SpriteRacerType — getTrailParticles', () => {
  let rt;
  let factory;
  beforeEach(() => {
    factory = vi.fn().mockReturnValue([{ x: 1, y: 2, r: 3 }]);
    rt = new SpriteRacerType(makeConfig({ trailFactory: factory }));
  });
  afterEach(() => vi.clearAllMocks());

  it('calls trailFactory with (x, y, speed, angle, frame, undefined)', () => {
    rt.getTrailParticles(10, 20, 1.5, 0.7, 500);
    expect(factory).toHaveBeenCalledWith(10, 20, 1.5, 0.7, 500, undefined);
  });

  it('returns whatever trailFactory returns', () => {
    const result = rt.getTrailParticles(0, 0, 1, 0, 0);
    expect(result).toEqual([{ x: 1, y: 2, r: 3 }]);
  });
});

describe('SpriteRacerType — drawRacer', () => {
  let rt;
  beforeEach(() => {
    rt = new SpriteRacerType(makeConfig());
    getCachedSprite.mockReturnValue(undefined); // keep _drawBody in fallback mode
    getCoatVariants.cached.mockReturnValue(undefined);
  });
  afterEach(() => vi.clearAllMocks());

  it('positions canvas at (x, y) and rotates by angle', () => {
    const ctx = makeCtx();
    rt.drawRacer(ctx, 150, 200, Math.PI / 4, MOCK_RACER, false, 0);
    expect(ctx.translate.mock.calls[0]).toEqual([150, 200]);
    expect(ctx.rotate.mock.calls[0]).toEqual([Math.PI / 4]);
  });

  it('saves and restores ctx state', () => {
    const ctx = makeCtx();
    rt.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('never calls fillText', () => {
    const ctx = makeCtx();
    rt.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(ctx.fillText.mock.calls.length).toBe(0);
  });

  it('isLeader=true sets leaderRingColor as strokeStyle', () => {
    const colors = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      get() {
        return this._s ?? '';
      },
      set(v) {
        this._s = v;
        colors.push(v);
      },
      configurable: true,
    });
    rt.drawRacer(ctx, 0, 0, 0, MOCK_RACER, true, 0);
    expect(colors).toContain('#ffd700');
  });

  it('isLeader=true calls ellipse with leaderEllipseRx and leaderEllipseRy', () => {
    const ctx = makeCtx();
    rt.drawRacer(ctx, 0, 0, 0, MOCK_RACER, true, 0);
    const ellipseCall = ctx.ellipse.mock.calls[0];
    expect(ellipseCall[2]).toBe(16); // leaderEllipseRx
    expect(ellipseCall[3]).toBe(10); // leaderEllipseRy
  });

  it('isLeader=false does not set leaderRingColor as strokeStyle', () => {
    const colors = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'strokeStyle', {
      get() {
        return this._s ?? '';
      },
      set(v) {
        this._s = v;
        colors.push(v);
      },
      configurable: true,
    });
    rt.drawRacer(ctx, 0, 0, 0, MOCK_RACER, false, 0);
    expect(colors).not.toContain('#ffd700');
  });
});

describe('SpriteRacerType — _drawBody', () => {
  afterEach(() => vi.clearAllMocks());

  it('falls back to arc circle when sprite is not loaded', () => {
    getCachedSprite.mockReturnValue(undefined);
    getCoatVariants.cached.mockReturnValue(undefined);
    const rt = new SpriteRacerType(makeConfig());
    const ctx = makeCtx();
    rt._drawBody(ctx, MOCK_RACER, 0);
    expect(ctx.arc.mock.calls.length).toBe(1);
    expect(ctx.drawImage.mock.calls.length).toBe(0);
  });

  it('fallback circle uses primaryColor when fallbackColor is not explicitly set', () => {
    getCachedSprite.mockReturnValue(undefined);
    getCoatVariants.cached.mockReturnValue(undefined);
    const rt = new SpriteRacerType(makeConfig({ primaryColor: '#E8DCC4' }));
    const fills = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'fillStyle', {
      get() {
        return this._f ?? '';
      },
      set(v) {
        this._f = v;
        fills.push(v);
      },
      configurable: true,
    });
    rt._drawBody(ctx, MOCK_RACER, 0);
    expect(fills).toContain('#E8DCC4');
  });

  it('fallback circle uses explicit fallbackColor (Snail-Pattern)', () => {
    getCachedSprite.mockReturnValue(undefined);
    getCoatVariants.cached.mockReturnValue(undefined);
    const rt = new SpriteRacerType(makeConfig({ fallbackColor: '#3A2E1F' }));
    const fills = [];
    const ctx = makeCtx();
    Object.defineProperty(ctx, 'fillStyle', {
      get() {
        return this._f ?? '';
      },
      set(v) {
        this._f = v;
        fills.push(v);
      },
      configurable: true,
    });
    rt._drawBody(ctx, MOCK_RACER, 0);
    expect(fills).toContain('#3A2E1F');
  });

  it('calls tintSprite (multiply) when base sprite is loaded but variants cache is cold', () => {
    const mockBase = { naturalWidth: 128, naturalHeight: 128 };
    getCachedSprite.mockReturnValue(mockBase);
    getCoatVariants.cached.mockReturnValue(undefined);
    const rt = new SpriteRacerType(makeConfig({ tintMode: 'multiply' }));
    const ctx = makeCtx();
    rt._drawBody(ctx, { ...MOCK_RACER, coatId: 'red' }, 0);
    expect(tintSprite).toHaveBeenCalledWith(mockBase, '#ff0000');
    expect(tintSpriteWithMask).not.toHaveBeenCalled();
  });

  it('calls tintSpriteWithMask when tintMode is "mask" and both sprites are loaded', () => {
    const mockBase = { naturalWidth: 128, naturalHeight: 128 };
    const mockMask = { naturalWidth: 128, naturalHeight: 128 };
    getCachedSprite.mockImplementation((url) => {
      if (url === '/assets/test.png') return mockBase;
      if (url === '/mask.png') return mockMask;
      return undefined;
    });
    getCoatVariants.cached.mockReturnValue(undefined);
    const rt = new SpriteRacerType(makeConfig({ tintMode: 'mask', maskUrl: '/mask.png' }));
    const ctx = makeCtx();
    rt._drawBody(ctx, { ...MOCK_RACER, coatId: 'red' }, 0);
    expect(tintSpriteWithMask).toHaveBeenCalledWith(mockBase, mockMask, '#ff0000');
    expect(tintSprite).not.toHaveBeenCalled();
  });

  it('uses base sprite directly for base coat (tint: null) without calling tintSprite', () => {
    const mockBase = { naturalWidth: 128, naturalHeight: 128 };
    getCachedSprite.mockReturnValue(mockBase);
    getCoatVariants.cached.mockReturnValue(undefined);
    const rt = new SpriteRacerType(makeConfig());
    const ctx = makeCtx();
    rt._drawBody(ctx, { ...MOCK_RACER, coatId: 'base' }, 0); // base coat has tint: null
    expect(tintSprite).not.toHaveBeenCalled();
    expect(tintSpriteWithMask).not.toHaveBeenCalled();
    expect(ctx.drawImage.mock.calls[0][0]).toBe(mockBase);
  });

  it('uses pre-warmed variant cache when available (fast path)', () => {
    const tintedCanvas = { _isTinted: true };
    getCoatVariants.cached.mockReturnValue(
      new Map([
        ['red', tintedCanvas],
        ['base', {}],
      ])
    );
    const rt = new SpriteRacerType(makeConfig());
    const ctx = makeCtx();
    rt._drawBody(ctx, { ...MOCK_RACER, coatId: 'red' }, 0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(tintedCanvas);
    expect(tintSprite).not.toHaveBeenCalled();
  });

  it('applies baseRotationOffset via ctx.rotate when sprite is loaded', () => {
    const mockBase = {};
    getCachedSprite.mockReturnValue(mockBase);
    getCoatVariants.cached.mockReturnValue(undefined);
    const rt = new SpriteRacerType(makeConfig({ baseRotationOffset: Math.PI / 2 }));
    const ctx = makeCtx();
    rt._drawBody(ctx, { ...MOCK_RACER, coatId: 'base' }, 0);
    const hasOffset = ctx.rotate.mock.calls.some(
      (call) => Math.abs(call[0] - Math.PI / 2) < 0.0001
    );
    expect(hasOffset).toBe(true);
  });
});

describe('SpriteRacerType — getRteDefinitions', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns [] by default', () => {
    const rt = new SpriteRacerType(makeConfig());
    expect(rt.getRteDefinitions()).toEqual([]);
  });

  it('returns the provided rteDefinitions array unchanged', () => {
    const defs = [{ type: 'splash' }, { type: 'mud', intensity: 3 }];
    const rt = new SpriteRacerType(makeConfig({ rteDefinitions: defs }));
    expect(rt.getRteDefinitions()).toBe(defs);
  });
});
