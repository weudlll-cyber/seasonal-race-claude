// @vitest-environment node
// ============================================================
// File:        worldPlacement.test.js
// Path:        client/src/modules/track-effects/effects/worldPlacement.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-2
// Description: Every track effect places its content over the area it is drawn in. The race screen
//              draws effects inside the world transform and passes the world size as `create`'s
//              third argument; before that, everything landed in a canvas-sized corner of the world
//              (rain on Dirt Oval: 1280x720 of a 3072x2047 world). The track editor passes no world
//              and must keep placing over its canvas.
// ============================================================
import { describe, it, expect } from 'vitest';
import bubbles from './bubbles.js';
import dust from './dust.js';
import fireflies from './fireflies.js';
import mud from './mud.js';
import rain from './rain.js';
import stars from './stars.js';
import wave from './wave.js';

const EFFECTS = { bubbles, dust, fireflies, mud, rain, stars, wave };
const CANVAS = { width: 100, height: 60 };
const WORLD = { width: 3000, height: 2000 };

/** A context that records every position the effect draws at (circle centres, path starts). */
function recordingCtx() {
  const points = [];
  const noop = () => {};
  return {
    points,
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
    arc: (x, y) => points.push({ x, y }),
    moveTo: (x, y) => points.push({ x, y }),
  };
}

/**
 * Create, run 20 simulated seconds, and collect every distinct position drawn in one frame per
 * second. Several effects spawn slowly (bubbles and mud count per MINUTE) or hold a small fixed set,
 * so a single frame would sample too few positions to say anything about where they land.
 */
function drawnPoints(effect, world) {
  const config = { ...effect.defaultConfig };
  const max = effect.configSchema.find((f) => f.key === 'count')?.max;
  if (max != null) config.count = max;
  const inst = effect.create(CANVAS, config, world);
  const ctx = recordingCtx();
  for (let i = 1; i <= 400; i++) {
    inst.update(50);
    if (i % 20 === 0) inst.render(ctx);
  }
  const seen = new Map(ctx.points.map((p) => [`${p.x},${p.y}`, p]));
  return [...seen.values()];
}

/** The bounding box of a point set, by reduce — large sets overflow a spread into Math.max. */
const bounds = (pts) =>
  pts.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x),
      maxX: Math.max(b.maxX, p.x),
      minY: Math.min(b.minY, p.y),
      maxY: Math.max(b.maxY, p.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

// Some effects draw a little outside their area by design: dust wraps 50 px past the edge, and
// bubbles and mud draw offsets from their centre. None of it comes near a canvas-sized error.
const SLACK = 60;

describe.each(Object.entries(EFFECTS))('%s', (name, effect) => {
  it('with a world, places content across the WHOLE world — not in a canvas-sized corner', () => {
    const pts = drawnPoints(effect, WORLD);
    expect(pts.length).toBeGreaterThan(20);
    const b = bounds(pts);
    expect(b.maxX).toBeGreaterThan(WORLD.width / 2);
    expect(b.maxY).toBeGreaterThan(WORLD.height / 2);
    expect(b.minX).toBeGreaterThanOrEqual(-SLACK);
    expect(b.maxX).toBeLessThanOrEqual(WORLD.width + SLACK);
    expect(b.minY).toBeGreaterThanOrEqual(-SLACK);
    expect(b.maxY).toBeLessThanOrEqual(WORLD.height + SLACK);
  });

  it('without a world (the track editor), keeps placing over the canvas', () => {
    const pts = drawnPoints(effect, undefined);
    expect(pts.length).toBeGreaterThan(0);
    const b = bounds(pts);
    expect(b.maxX).toBeLessThanOrEqual(CANVAS.width + SLACK);
    expect(b.maxY).toBeLessThanOrEqual(CANVAS.height + SLACK);
  });
});
