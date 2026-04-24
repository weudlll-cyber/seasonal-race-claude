import { describe, it, expect, vi } from 'vitest';
import { renderMinimap, MINIMAP_W, MINIMAP_H, MINIMAP_MARGIN } from './Minimap.js';

const SAMPLES = 80;

function makeMockShape(closed = true) {
  const bbox = { minX: 100, minY: 100, maxX: 900, maxY: 500 };
  const outer = Array.from({ length: SAMPLES + 1 }, (_, i) => ({
    x: 100 + (i / SAMPLES) * 800,
    y: 100,
  }));
  const inner = Array.from({ length: SAMPLES + 1 }, (_, i) => ({
    x: 100 + (i / SAMPLES) * 800,
    y: 500,
  }));
  return {
    isOpen: !closed,
    getBoundingBox: () => bbox,
    getEdgePoints: () => ({ outer, inner }),
  };
}

function makeMockRacers(n) {
  return Array.from({ length: n }, (_, i) => ({
    x: 200 + i * 100,
    y: 300,
    color: '#ff0000',
  }));
}

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  };
}

describe('renderMinimap', () => {
  it('does not throw with a valid closed shape and racers', () => {
    const ctx = makeCtx();
    expect(() =>
      renderMinimap(ctx, makeMockShape(true), makeMockRacers(3), 0, 1280, 720)
    ).not.toThrow();
  });

  it('draws the background panel at bottom-left with correct dimensions', () => {
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(true), makeMockRacers(3), 0, 1280, 720);
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    const [bx, by, w, h] = ctx.fillRect.mock.calls[0];
    expect(bx).toBe(MINIMAP_MARGIN);
    expect(by).toBe(720 - MINIMAP_H - MINIMAP_MARGIN);
    expect(w).toBe(MINIMAP_W);
    expect(h).toBe(MINIMAP_H);
  });

  it('draws n+1 arc calls total: one dot per racer plus leader ring', () => {
    const ctx = makeCtx();
    const racers = makeMockRacers(4);
    renderMinimap(ctx, makeMockShape(true), racers, 0, 1280, 720);
    // 4 racer dots + 1 leader ring = 5
    expect(ctx.arc).toHaveBeenCalledTimes(racers.length + 1);
  });

  it('wraps drawing in save/restore to protect caller ctx state', () => {
    const ctx = makeCtx();
    renderMinimap(ctx, makeMockShape(true), makeMockRacers(2), 0, 1280, 720);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });
});
