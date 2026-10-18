// ============================================================
// File:        SurfaceClassPreview.test.jsx
// Path:        client/src/screens/DevScreen/sections/SurfaceClassPreview.test.jsx
// Project:     RaceArena
// Description: rAF lifecycle tests for the live-preview canvas component.
//              Kept in a separate file so SurfaceClassPreview is NOT mocked
//              (unlike SurfaceClassManager.test.jsx which stubs it).
// ============================================================

import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SurfaceClassPreview } from './SurfaceClassPreview.jsx';

const CLOUD_CONFIG = {
  color: '#cccccc',
  startSize: 3,
  endSize: 12,
  lifetimeFrames: 40,
  spawnProbability: 0.3,
  driftDirection: 'back',
};

describe('SurfaceClassPreview — rAF lifecycle', () => {
  let pendingRafIds;

  beforeEach(() => {
    pendingRafIds = new Set();

    vi.stubGlobal('requestAnimationFrame', (cb) => {
      const id = Math.random();
      pendingRafIds.add(id);
      // Schedule callback synchronously for testing (single frame)
      Promise.resolve().then(() => {
        if (pendingRafIds.has(id)) cb(performance.now());
      });
      return id;
    });

    vi.stubGlobal('cancelAnimationFrame', (id) => {
      pendingRafIds.delete(id);
    });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: '',
      globalAlpha: 1,
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      clearRect: vi.fn(),
      strokeStyle: '',
      lineWidth: 1,
      lineCap: '',
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
      canvas: { width: 440, height: 130 },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calls requestAnimationFrame on mount', () => {
    render(<SurfaceClassPreview generatorId="cloud" config={CLOUD_CONFIG} />);
    // At least one rAF request should have been made
    expect(pendingRafIds.size).toBeGreaterThan(0);
  });

  it('stops the rAF loop on unmount (cancelAnimationFrame called)', () => {
    const cancelled = new Set();
    vi.stubGlobal('cancelAnimationFrame', (id) => {
      pendingRafIds.delete(id);
      cancelled.add(id);
    });

    const { unmount } = render(<SurfaceClassPreview generatorId="cloud" config={CLOUD_CONFIG} />);
    const rafCountBefore = pendingRafIds.size;

    unmount();

    // After unmount, the cleanup function should have called cancelAnimationFrame
    expect(cancelled.size).toBeGreaterThan(0);
    // Or pending count decreased
    expect(pendingRafIds.size).toBeLessThan(rafCountBefore + 1);
  });

  // 2026-10-18: jsdom's canvas has no 2D context; a frame that fired while a Dev Screen test was
  // still mounted threw on `ctx.fillStyle` and failed the whole client suite as an unhandled error.
  it('starts no loop and throws nothing when the canvas has no 2D context', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    const errors = [];
    const onError = (e) => errors.push(e);
    window.addEventListener('error', onError);
    try {
      render(<SurfaceClassPreview generatorId="cloud" config={CLOUD_CONFIG} />);
      expect(pendingRafIds.size, 'no frame requested without a context').toBe(0);
      // Let any frame that WAS requested run (the stub runs it on the next microtask).
      await Promise.resolve();
      await Promise.resolve();
      expect(errors).toEqual([]);
    } finally {
      window.removeEventListener('error', onError);
    }
  });

  it('renders a canvas element', () => {
    const { container } = render(
      <SurfaceClassPreview generatorId="particle" config={CLOUD_CONFIG} />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(440);
    expect(canvas.height).toBe(130);
  });

  it('renders without throwing for all 4 generator types', () => {
    const configs = {
      cloud: CLOUD_CONFIG,
      particle: {
        color: '#4a7c3f',
        sizeMin: 1,
        sizeMax: 2.5,
        lifetimeFrames: 20,
        spawnProbability: 0.35,
        drift: 0.6,
        gravity: 0.04,
      },
      splash: {
        color: '#2196f3',
        count: 5,
        sizeMin: 1.5,
        sizeMax: 4,
        lifetimeFrames: 22,
        spawnProbability: 0.55,
        gravity: 0.18,
        spreadAngle: 1.8,
      },
      line: { color: '#555555', thickness: 1.5, lifetimeFrames: 120 },
    };

    for (const [genId, config] of Object.entries(configs)) {
      expect(() =>
        render(<SurfaceClassPreview generatorId={genId} config={config} />)
      ).not.toThrow();
    }
  });
});
