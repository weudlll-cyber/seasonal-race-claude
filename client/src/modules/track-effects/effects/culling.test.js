// @vitest-environment node
// ============================================================
// File:        culling.test.js
// Path:        client/src/modules/track-effects/effects/culling.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-4
// Description: Track effects draw only what is on screen, and draw it cheaper without moving it.
//              1. Culling — an item outside the canvas is not drawn, an item inside is.
//              2. Batching — where items are drawn as one path per alpha tier (or one path for all),
//                 every visible item is still drawn exactly once, at its own centre and radius.
// ============================================================
import { describe, it, expect, afterEach, vi } from 'vitest';
import bubbles from './bubbles.js';
import dust from './dust.js';
import fireflies from './fireflies.js';
import mud from './mud.js';
import rain from './rain.js';
import stars from './stars.js';
import wave from './wave.js';

const EFFECTS = { bubbles, dust, fireflies, mud, rain, stars, wave };
const identity = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

/** Records every disc drawn (arc centre + radius) and, for mud, which draws polygons, path starts. */
function recordingCtx(canvas) {
  const discs = [];
  const starts = [];
  const noop = () => {};
  return {
    discs,
    get points() {
      return discs.length ? discs : starts;
    },
    canvas,
    getTransform: identity,
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
    beginPath: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    lineTo: noop,
    moveTo: (x, y) => starts.push({ x, y }),
    arc: (x, y, r) => discs.push({ x, y, r }),
  };
}

/** A deterministic Math.random, so two instances of an effect are laid out identically. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function runAndDraw(effect, canvas, world) {
  const config = { ...effect.defaultConfig };
  const max = effect.configSchema.find((f) => f.key === 'count').max;
  config.count = Math.min(max, 400);
  const inst = effect.create(canvas, config, world);
  for (let i = 0; i < 40; i++) inst.update(50);
  const ctx = recordingCtx(canvas);
  inst.render(ctx);
  return ctx.points;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(Object.entries(EFFECTS))('%s — culling', (name, effect) => {
  // The world is twice as wide as the canvas, so about half of the items are off screen.
  const WORLD = { width: 2000, height: 1000 };
  const CANVAS = { width: 1000, height: 1000 };
  // Generous enough for the largest drawn size: a wave ring (MAX_R 60 × size), a mud blob, a glow.
  const MARGIN = 200;

  it("nothing is drawn beyond the canvas edge (plus the item's drawn size)", () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(7));
    const pts = runAndDraw(effect, CANVAS, WORLD);
    for (const p of pts) expect(p.x).toBeLessThanOrEqual(CANVAS.width + MARGIN);
  });

  it('items on the canvas are drawn, and more are drawn when the canvas covers everything', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(7));
    const onHalf = runAndDraw(effect, CANVAS, WORLD);
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(7));
    const onAll = runAndDraw(effect, WORLD, WORLD);
    expect(onHalf.some((p) => p.x < CANVAS.width)).toBe(true);
    expect(onAll.length).toBeGreaterThan(onHalf.length);
  });
});

// Drawing — batched per alpha tier (stars) or per item (dust) — must draw every visible item exactly
// once, at its own centre and radius. Dust and stars are laid out by create() alone, from a known
// sequence of Math.random calls, so the expected discs can be recomputed independently of the effect.
function expectedDiscs(randomsPerItem, count, place) {
  const next = seededRandom(23);
  return Array.from({ length: count }, () => place(Array.from({ length: randomsPerItem }, next)));
}
const byPosition = (a, b) => a.x - b.x || a.y - b.y;

describe('batched drawing draws every item once, where it is', () => {
  const CANVAS = { width: 800, height: 600 };

  it('dust — every particle drawn once, at its own centre and radius', () => {
    const config = { ...dust.defaultConfig, count: 300 };
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(23));
    const inst = dust.create(CANVAS, config);
    const ctx = recordingCtx(CANVAS);
    inst.render(ctx);
    // create() draws per particle: x, y, vx, vy, ratio.
    const want = expectedDiscs(5, 300, ([x, y, , , ratio]) => ({
      x: x * CANVAS.width,
      y: y * CANVAS.height,
      r: config.size * (0.5 + ratio) * 3,
    }));
    const got = [...ctx.discs].sort(byPosition);
    want.sort(byPosition);
    expect(got.length).toBe(want.length);
    got.forEach((d, i) => {
      expect(d.x).toBeCloseTo(want[i].x, 9);
      expect(d.y).toBeCloseTo(want[i].y, 9);
      expect(d.r).toBeCloseTo(want[i].r, 9);
    });
  });

  it('stars — one path per twinkle tier, the same discs as one path per star', () => {
    const config = { ...stars.defaultConfig, count: 300 };
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(23));
    const inst = stars.create(CANVAS, config);
    const ctx = recordingCtx(CANVAS);
    inst.render(ctx);
    // create() draws per star: x, y, phaseOffset, baseSize.
    const want = expectedDiscs(4, 300, ([x, y, , base]) => ({
      x: x * CANVAS.width,
      y: y * CANVAS.height,
      r: config.size * (0.6 + base * 0.8),
    }));
    const got = [...ctx.discs].sort(byPosition);
    want.sort(byPosition);
    expect(got.length).toBe(want.length);
    got.forEach((d, i) => {
      expect(d.x).toBeCloseTo(want[i].x, 9);
      expect(d.y).toBeCloseTo(want[i].y, 9);
      expect(d.r).toBeCloseTo(want[i].r, 9);
    });
  });
});
