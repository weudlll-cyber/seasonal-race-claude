// @vitest-environment node
// ============================================================
// File:        racerDust.test.js
// Path:        client/src/screens/RaceScreen/racerDust.test.js
// Project:     RaceArena — PARTICLES-VISIBILITY-2
// Description: A finished racer's dust fades out and is compacted away; a finish only stops NEW
//              dust. Before this, a finished racer's dust froze where it was until the screen closed.
// ============================================================
import { describe, it, expect } from 'vitest';
import { advanceRacerDust } from './racerDust.js';
import cloudGenerator from '../../modules/surface-effects/generators/cloud.js';

// A cloud emitter that always spawns, with a short lifetime so the test is quick.
const LIFETIME = 10;
const makeEmitter = () =>
  cloudGenerator.create({
    color: '#d4b483',
    startSize: 4,
    endSize: 10,
    lifetimeFrames: LIFETIME,
    spawnProbability: 1,
    driftDirection: 'back',
  });

const makeRacer = (over = {}) => ({
  x: 100,
  y: 100,
  angle: 0,
  baseSpeed: 1,
  finished: false,
  surfaceEmitter: makeEmitter(),
  surfaceParticles: [],
  ...over,
});

const noNativeTrail = {
  getTrailParticles: () => {
    throw new Error('a racer with a surface emitter must not use the fallback trail');
  },
};

describe('advanceRacerDust — surface dust', () => {
  it('a running racer spawns dust', () => {
    const r = makeRacer();
    advanceRacerDust([r], [], noNativeTrail, 1, 0);
    expect(r.surfaceParticles.length).toBe(1);
  });

  it('a finished racer spawns NO new dust', () => {
    const r = makeRacer({ finished: true });
    for (let i = 0; i < 5; i++) advanceRacerDust([r], [], noNativeTrail, 1, i);
    expect(r.surfaceParticles.length).toBe(0);
  });

  it("a finished racer's dust keeps FADING and is gone within its lifetime", () => {
    const r = makeRacer();
    for (let i = 0; i < 5; i++) advanceRacerDust([r], [], noNativeTrail, 1, i);
    const before = r.surfaceParticles.map((p) => p.alpha);
    expect(before.length).toBeGreaterThan(0);

    r.finished = true;
    advanceRacerDust([r], [], noNativeTrail, 1, 5);
    // Every particle still alive is fainter than it was — it is being advanced, not frozen.
    for (const p of r.surfaceParticles) expect(p.alpha).toBeLessThan(Math.max(...before));

    for (let i = 0; i < LIFETIME + 1; i++) advanceRacerDust([r], [], noNativeTrail, 1, 6 + i);
    expect(r.surfaceParticles.length).toBe(0);
  });
});

describe('advanceRacerDust — the fallback pool', () => {
  it('a finished racer adds nothing to the pool, and the pool still fades out', () => {
    let calls = 0;
    const nativeTrail = {
      getTrailParticles: () => {
        calls++;
        return [{ x: 0, y: 0, vx: 0, vy: 0, alpha: 0.5, r: 4 }];
      },
    };
    const r = makeRacer({ surfaceEmitter: null });
    const pool = [];
    advanceRacerDust([r], pool, nativeTrail, 1, 0);
    expect(calls).toBe(1);
    expect(pool.length).toBe(1);

    r.finished = true;
    for (let i = 0; i < 30; i++) advanceRacerDust([r], pool, nativeTrail, 1, i + 1);
    expect(calls).toBe(1);
    expect(pool.length).toBe(0);
  });
});
