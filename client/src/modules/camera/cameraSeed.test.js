// ============================================================
// File:        cameraSeed.test.js
// Project:     RaceArena — CAMERA-SEED-AND-LINE-1
//
// THE PROMISE: the same race seed gives the same camera, shot for shot; different race seeds do
// not. The first half is the one that matters and it is the one that can pass vacuously, so it is
// SABOTAGE-PROVED — the test is re-run against a deliberately broken derivation and must fail.
//
// A trajectory here is the DIRECTOR'S OWN state over a driven race, not a proxy for it: the zoom,
// the centre and the state name, frame by frame. Two cameras that agree on all three for every
// frame are the same camera.
// ============================================================

import { describe, it, expect } from 'vitest';
import { cameraSeedForRace } from './cameraSeed.js';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';

const WORLD = 4000;
const CANVAS_W = 1280;
const CANVAS_H = 720;
const FINISH_T = 1;

const makeShape = () => ({
  isOpen: true,
  getPosition: (t) => ({ x: Math.max(0, Math.min(1, t)) * WORLD, y: 360 }),
  getActualTrackWidth: () => 300,
});

/**
 * Drive one race with a given CAMERA seed and record the camera each frame.
 * The race itself is identical in every call — only the camera seed varies — so any difference in
 * the recording is the camera's own.
 */
function trajectory(cameraSeed, frames = 400) {
  const cd = new CameraDirector(
    WORLD,
    CANVAS_H,
    true,
    { ...DEFAULT_CAMERA_CONFIG },
    36,
    makeShape(),
    300
  );
  cd.setRandomSeed(cameraSeed);
  cd.state = CAM_STATE.OVERVIEW;
  const out = [];
  let ts = 1000;
  for (let f = 0; f < frames; f++) {
    const p = 0.05 + (0.9 * f) / frames;
    // A field that CLUSTERS and SWAPS. The director only rolls a die when it has a choice to make,
    // so a fixture where nobody ever contends never touches the RNG — which is exactly what the
    // sabotage assertion below caught in the first version of this test.
    const racers = Array.from({ length: 8 }, (_, i) => {
      const wobble = 0.004 * Math.sin(f / 9 + i * 1.7);
      const t = Math.max(0, p - i * 0.0015 + wobble);
      return { index: i, t: t * FINISH_T, x: t * WORLD, y: 360 + (i - 4) * 6 };
    });
    cd.update(
      racers,
      ts,
      // PAST the start window from frame 1: inside it the director is forced to one state and has
      // nothing to choose, so the dice would never be rolled.
      { finishT: FINISH_T, finishedCount: 0, raceElapsed: 20000 + f * (1000 / 60) },
      CANVAS_W,
      CANVAS_H
    );
    out.push(`${cd.zoom.toFixed(9)}|${cd.offsetX.toFixed(6)}|${cd.offsetY.toFixed(6)}|${cd.state}`);
    ts += 1000 / 60;
  }
  return out.join('\n');
}

describe('CAMERA-SEED-AND-LINE-1 — the camera seed comes from the race seed', () => {
  // IF DELETED: the whole point of the block goes unguarded — a later change could return to
  // drawing the seed and nothing would notice until the owner reported an irreproducible picture.
  it('the same race seed derives the same camera seed', () => {
    expect(cameraSeedForRace(9)).toBe(cameraSeedForRace(9));
    expect(cameraSeedForRace(5601)).toBe(cameraSeedForRace(5601));
  });

  it('different race seeds derive different camera seeds', () => {
    const seen = new Set();
    for (const s of [1, 2, 3, 9, 42, 5601, 123456, 999999]) seen.add(cameraSeedForRace(s));
    expect(seen.size).toBe(8);
  });

  // The salt exists to stop two subsystems seeded "from 5601" walking the same sequence. If the
  // derivation ever became the identity, this is what says so.
  it('the camera seed is not the race seed itself', () => {
    for (const s of [1, 9, 5601]) expect(cameraSeedForRace(s)).not.toBe(s);
  });

  // An unseeded race (Start Race) keeps its variety — it must NOT collapse to a constant.
  it('an unseeded race still varies, and does not return the no-seed sentinel', () => {
    let n = 0;
    const seeds = new Set();
    for (let i = 0; i < 8; i++) seeds.add(cameraSeedForRace(0, () => (n++ + 0.5) / 8));
    expect(seeds.size).toBeGreaterThan(1);
    for (const s of seeds) expect(s).toBeGreaterThan(0);
    expect(cameraSeedForRace(-1, () => 0)).toBeGreaterThan(0);
  });

  // ── THE TRAJECTORY-LEVEL PROMISE IS PROVED ELSEWHERE, AND HERE IS WHY ─────────────────────
  //
  // "Two runs of one seed give the same camera" was written here first, on a hand-built field, and
  // the fixture was BLIND: measured, the director rolled its dice ONCE in 600 frames, and that draw
  // was against a weight of 1, where the value cannot change the outcome. Two DIFFERENT seeds
  // produced byte-identical trajectories — so the "identical" assertion passed while proving
  // nothing at all.
  //
  // The state machine only reaches its random choices on a race with real geometry: pulk detection,
  // comeback detection and the lead-change latch all read fields a synthetic racer does not carry.
  // So that half lives in `scripts/camera-seed-determinism.test.mjs`, on the real driver and a real
  // track, where the two halves sabotage-prove each other. This file keeps the derivation itself.
});
