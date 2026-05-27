// ============================================================
// File:        MinSpriteSizePreview.test.jsx
// Path:        client/src/screens/DevScreen/sections/MinSpriteSizePreview.test.jsx
// Project:     RaceArena
// Description: Verifies that MinSpriteSizePreview passes cfg.tintMode to
//              getCoatVariants.cached so user-created types with tintMode
//              'auto' or 'screen' hit the correct cache key instead of
//              falling through to the fallback circle.
// ============================================================

import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../modules/racer-types/spriteTinter.js', () => {
  const getCoatVariants = vi.fn().mockResolvedValue(new Map());
  getCoatVariants.cached = vi.fn();
  return { getCoatVariants };
});

import { MinSpriteSizePreview } from './MinSpriteSizePreview.jsx';
import { getCoatVariants } from '../../../modules/racer-types/spriteTinter.js';

// Minimal SpriteRacerType-shaped config used across all tests.
function makeRacerType(overrides = {}) {
  return {
    config: {
      id: 'test-custom',
      spriteUrl: 'data:image/png;base64,abc123',
      tintMode: 'multiply',
      frameCount: 4,
      frameWidth: 128,
      frameHeight: 128,
      basePeriodMs: 600,
      silhouetteScale: 1.0,
      baseRotationOffset: Math.PI / 2,
      defaultCoatId: 'base',
      coats: [{ id: 'base', name: 'Base', tint: null }],
      fallbackColor: '#ff0000',
      ...overrides,
    },
  };
}

// A minimal drawable object that satisfies ctx.drawImage.
const FAKE_DRAWABLE = { width: 128, height: 128 };

describe('MinSpriteSizePreview — getCoatVariants.cached key', () => {
  let ctx;
  let pendingRafIds;

  beforeEach(() => {
    pendingRafIds = new Set();

    vi.stubGlobal('requestAnimationFrame', (cb) => {
      const id = Math.random();
      pendingRafIds.add(id);
      Promise.resolve().then(() => {
        if (pendingRafIds.has(id)) cb(performance.now());
      });
      return id;
    });

    vi.stubGlobal('cancelAnimationFrame', (id) => {
      pendingRafIds.delete(id);
    });

    ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    };

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);
    vi.clearAllMocks();
  });

  afterEach(() => {
    pendingRafIds.clear();
    vi.unstubAllGlobals();
  });

  it('passes tintMode "auto" to getCoatVariants.cached for user-created type', async () => {
    const racerType = makeRacerType({ tintMode: 'auto' });
    getCoatVariants.cached.mockReturnValue(new Map([['base', FAKE_DRAWABLE]]));

    render(<MinSpriteSizePreview racerType={racerType} sizePx={40} />);
    await Promise.resolve(); // flush rAF microtask

    expect(getCoatVariants.cached).toHaveBeenCalledWith('data:image/png;base64,abc123', 'auto');
  });

  it('passes tintMode "screen" to getCoatVariants.cached for user-created type', async () => {
    const racerType = makeRacerType({ tintMode: 'screen' });
    getCoatVariants.cached.mockReturnValue(new Map([['base', FAKE_DRAWABLE]]));

    render(<MinSpriteSizePreview racerType={racerType} sizePx={40} />);
    await Promise.resolve();

    expect(getCoatVariants.cached).toHaveBeenCalledWith('data:image/png;base64,abc123', 'screen');
  });

  it('draws the sprite (not fallback circle) when cache hits with tintMode "auto"', async () => {
    const racerType = makeRacerType({ tintMode: 'auto' });
    getCoatVariants.cached.mockReturnValue(new Map([['base', FAKE_DRAWABLE]]));

    render(<MinSpriteSizePreview racerType={racerType} sizePx={40} />);
    await Promise.resolve();

    expect(ctx.drawImage).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it('draws fallback circle when cache misses (tintMode mismatch)', async () => {
    const racerType = makeRacerType({ tintMode: 'auto' });
    // Simulate a miss: return undefined regardless of args
    getCoatVariants.cached.mockReturnValue(undefined);

    render(<MinSpriteSizePreview racerType={racerType} sizePx={40} />);
    await Promise.resolve();

    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('passes tintMode "multiply" for built-in type (unchanged behavior)', async () => {
    const racerType = makeRacerType({
      spriteUrl: '/assets/sprites/horse.png',
      tintMode: 'multiply',
      defaultCoatId: 'cream',
      coats: [{ id: 'cream', name: 'Cream', tint: null }],
    });
    getCoatVariants.cached.mockReturnValue(new Map([['cream', FAKE_DRAWABLE]]));

    render(<MinSpriteSizePreview racerType={racerType} sizePx={40} />);
    await Promise.resolve();

    expect(getCoatVariants.cached).toHaveBeenCalledWith('/assets/sprites/horse.png', 'multiply');
    expect(ctx.drawImage).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it('falls back to "multiply" when tintMode is undefined', async () => {
    const racerType = makeRacerType({ tintMode: undefined });
    getCoatVariants.cached.mockReturnValue(new Map([['base', FAKE_DRAWABLE]]));

    render(<MinSpriteSizePreview racerType={racerType} sizePx={40} />);
    await Promise.resolve();

    expect(getCoatVariants.cached).toHaveBeenCalledWith('data:image/png;base64,abc123', 'multiply');
  });
});
