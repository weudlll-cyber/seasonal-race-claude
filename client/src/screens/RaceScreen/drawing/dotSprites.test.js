// FRAME-DROPS-80: the cached dot and glow images — one per colour, reused, and nothing when there is
// no 2D canvas; and the particles drawing from them, with no blur pass.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dotSprite, glowDotSprite, _setDotCanvasFactory } from './dotSprites.js';
import { drawParticles } from './particleRendering.js';

let made;
let prev;
beforeEach(() => {
  made = [];
  prev = _setDotCanvasFactory((size) => {
    const g = {
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      stops: [],
      gradientFills: [],
      beginPath() {},
      arc() {},
      fill() {},
      fillRect() {
        if (typeof g.fillStyle === 'object') g.gradientFills.push(g.globalCompositeOperation);
      },
      createRadialGradient: () => ({ addColorStop: (at, c) => g.stops.push(c) }),
    };
    const c = { size, getContext: () => g };
    made.push(c);
    return c;
  });
});
afterEach(() => _setDotCanvasFactory(prev));

describe('dotSprites', () => {
  it('makes one image per colour and reuses it', () => {
    const a = dotSprite('#f00');
    expect(dotSprite('#f00')).toBe(a);
    expect(dotSprite('#0f0')).not.toBe(a);
    expect(glowDotSprite('#f00')).not.toBe(a); // a glow is its own image
    expect(made).toHaveLength(3);
  });

  it('gives nothing when no 2D canvas can be made, so callers draw the original circles', () => {
    _setDotCanvasFactory(() => null);
    expect(dotSprite('#f00')).toBeNull();
    expect(glowDotSprite('#f00')).toBeNull();
  });

  it("the glow fades only the colour's opacity, never towards another colour", () => {
    glowDotSprite('#ffd700');
    const g = made[0].getContext();
    // Every gradient stop is pure alpha, and the gradient is applied as a mask: a fade towards
    // transparent BLACK drawn over the colour rings each dot grey on a light ground.
    expect(g.stops.length).toBeGreaterThan(0);
    for (const c of g.stops) expect(c).toMatch(/^rgba\(0,0,0,[\d.]+\)$/);
    expect(g.gradientFills).toEqual(['destination-in']);
  });
});

describe('drawParticles with the images', () => {
  function ctxDouble() {
    const calls = [];
    const ctx = {
      calls,
      globalAlpha: 1,
      fillStyle: '',
      shadowColor: '',
      beginPath() {},
      arc: () => calls.push('arc'),
      fill: () => calls.push('fill'),
      drawImage: (img, x, y, w, h) => calls.push(['drawImage', x, y, w, h]),
    };
    let blur = 0;
    Object.defineProperty(ctx, 'shadowBlur', {
      get: () => blur,
      set: (v) => {
        blur = v;
        if (v > 0) calls.push('shadowBlur');
      },
    });
    return ctx;
  }

  it('a finish burst draws glow images and never switches a blur on', () => {
    const ctx = ctxDouble();
    const burst = [
      { x: 10, y: 10, r: 3, alpha: 1, color: '#ffd700' },
      { x: 20, y: 20, r: 2, alpha: 0.5, color: '#ff3388' },
    ];
    drawParticles(ctx, [], burst);
    expect(ctx.calls).toEqual([
      ['drawImage', 4, 4, 12, 12],
      ['drawImage', 16, 16, 8, 8],
    ]);
  });

  it('dust draws one dot image per particle, at its own size', () => {
    const ctx = ctxDouble();
    drawParticles(ctx, [{ x: 5, y: 6, r: 1.5, alpha: 0.3 }], []);
    expect(ctx.calls).toEqual([['drawImage', 3.5, 4.5, 3, 3]]);
  });
});
