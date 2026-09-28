// @vitest-environment node
// ============================================================
// File:        countRange.test.js
// Path:        client/src/modules/track-effects/effects/countRange.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-3
// Description: Every track effect's amount runs from OFF to MANY. 0 must draw nothing; the slider's
//              maximum is the measured one; the default stays on the slider's grid. The value's
//              meaning (per second, per minute, or items) is unchanged, so stored tracks look as before.
// ============================================================
import { describe, it, expect } from 'vitest';
import bubbles from './bubbles.js';
import dust from './dust.js';
import fireflies from './fireflies.js';
import mud from './mud.js';
import rain from './rain.js';
import stars from './stars.js';
import wave from './wave.js';

// The maxima set by browser measurement (PARTICLES-VISIBILITY-3; rain, stars, wave raised by -4).
const MAX = {
  bubbles: 240000,
  dust: 4000,
  fireflies: 4000,
  mud: 80000,
  rain: 4000,
  stars: 8000,
  wave: 1000,
};
const EFFECTS = { bubbles, dust, fireflies, mud, rain, stars, wave };
const CANVAS = { width: 800, height: 600 };

function countingCtx() {
  let draws = 0;
  const count = () => draws++;
  const noop = () => {};
  return {
    get draws() {
      return draws;
    },
    // PARTICLES-VISIBILITY-4: effects cull against the canvas under the current transform.
    canvas: CANVAS,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: count,
    fill: count,
    stroke: count,
  };
}

describe.each(Object.entries(EFFECTS))('%s', (name, effect) => {
  const field = effect.configSchema.find((f) => f.key === 'count');

  it('the amount slider runs from 0 to the measured maximum', () => {
    expect(field.min).toBe(0);
    expect(field.max).toBe(MAX[name]);
  });

  it('the default is unchanged in meaning and sits on the slider grid', () => {
    expect(effect.defaultConfig.count).toBe(field.default);
    expect(field.default % field.step).toBe(0);
  });

  it('count 0 is OFF — nothing is spawned or drawn, even after seconds of updates', () => {
    const inst = effect.create(CANVAS, { ...effect.defaultConfig, count: 0 });
    for (let i = 0; i < 60; i++) inst.update(50);
    const ctx = countingCtx();
    inst.render(ctx);
    expect(ctx.draws).toBe(0);
  });
});
