// ============================================================
// File:        cameraSeed.test.js
// Project:     RaceArena — CAMERA-SEED-AND-LINE-1
//
// THE PROMISE: the same race seed gives the same camera, shot for shot; different race seeds do
// not. THIS FILE HOLDS THE DERIVATION HALF ONLY. The trajectory half lives in
// `scripts/camera-seed-determinism.test.mjs`, on the real driver and a real track, and the closing
// comment in this file records why it had to move there.
//
// DEAD-LINES-1 (2026-09-04) removed a 44-line `trajectory()` helper and the whole fixture that
// existed only to feed it — a CameraDirector import, a synthetic track shape, and four constants.
// It was never called, by anything, from the commit that introduced it (`76742cab`, where the file
// arrives as 116 added lines). It is the BLIND hand-built fixture the closing comment below
// describes: the one where the director rolled its dice once in 600 frames against a weight of 1,
// so two different seeds produced identical trajectories and the assertion proved nothing. The test
// that used it was correctly moved out; the fixture was left behind, and the header still described
// it as though it were live.
// ============================================================

import { describe, it, expect } from 'vitest';
import { cameraSeedForRace } from './cameraSeed.js';

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
