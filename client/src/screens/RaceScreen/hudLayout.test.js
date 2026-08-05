// ============================================================
// File:        hudLayout.test.js
// Project:     RaceArena — CAMERA-COMPANY-ONLY-2 §1
//
// The regression this exists for: the build-identity line drew on top of the LAP counter on the
// owner's screen. Two right-aligned rows, two files, two hardcoded y values. These tests fail if any
// two rows can overlap again — at any canvas size, with any combination of rows hidden.
// ============================================================

import { describe, it, expect } from 'vitest';
import { hudRightColumn, rowsOverlap } from './hudLayout.js';

const SIZES = [
  [1280, 720], // the reference
  [1920, 1080],
  [3840, 2160],
  [960, 540],
  [640, 360], // small enough that the minimum clamps bite
  [1280, 400], // deliberately squat
];

const KEYS = ['racePlan', 'cfg', 'lap', 'build'];

describe('the right-hand HUD column cannot overlap itself', () => {
  it.each(SIZES)('no two rows overlap at %ix%i, all shown', (w, h) => {
    const rows = hudRightColumn(w, h);
    for (let i = 0; i < KEYS.length; i++) {
      for (let j = i + 1; j < KEYS.length; j++) {
        expect(rowsOverlap(rows[KEYS[i]], rows[KEYS[j]]), `${KEYS[i]} vs ${KEYS[j]}`).toBe(false);
      }
    }
  });

  it('THE EXACT REGRESSION: the build line never overlaps the lap counter', () => {
    for (const [w, h] of SIZES) {
      const rows = hudRightColumn(w, h);
      expect(rowsOverlap(rows.lap, rows.build), `${w}x${h}`).toBe(false);
    }
  });

  it('no two rows overlap for ANY combination of hidden rows', () => {
    for (const [w, h] of SIZES) {
      // every subset of visibility flags
      for (let mask = 0; mask < 1 << KEYS.length; mask++) {
        const visible = {};
        KEYS.forEach((k, i) => (visible[k] = !!(mask & (1 << i))));
        const rows = hudRightColumn(w, h, visible);
        for (let i = 0; i < KEYS.length; i++) {
          for (let j = i + 1; j < KEYS.length; j++) {
            expect(
              rowsOverlap(rows[KEYS[i]], rows[KEYS[j]]),
              `${w}x${h} mask ${mask}: ${KEYS[i]} vs ${KEYS[j]}`
            ).toBe(false);
          }
        }
      }
    }
  });

  it('a hidden row takes no space — the stack closes up', () => {
    const all = hudRightColumn(1280, 720);
    const noPlan = hudRightColumn(1280, 720, { racePlan: false });
    expect(noPlan.cfg.y).toBeLessThan(all.cfg.y);
    expect(noPlan.racePlan.shown).toBe(false);
  });

  it('everything is sized from the frame, not from constants — doubling the height doubles the stack', () => {
    const a = hudRightColumn(1280, 720);
    const b = hudRightColumn(2560, 1440);
    expect(b.build.y / a.build.y).toBeCloseTo(2, 1);
    expect(b.lap.fontPx / a.lap.fontPx).toBeCloseTo(2, 1);
    expect(b.build.h / a.build.h).toBeCloseTo(2, 1);
  });

  it('every row stays inside the frame', () => {
    for (const [w, h] of SIZES) {
      const rows = hudRightColumn(w, h);
      for (const k of KEYS) {
        expect(rows[k].y, `${k} top at ${w}x${h}`).toBeGreaterThanOrEqual(0);
        expect(rows[k].y + rows[k].h, `${k} bottom at ${w}x${h}`).toBeLessThanOrEqual(h);
        expect(rows[k].right).toBeLessThan(w);
      }
    }
  });

  it('rows are ordered top to bottom as declared', () => {
    const r = hudRightColumn(1280, 720);
    expect(r.racePlan.y).toBeLessThan(r.cfg.y);
    expect(r.cfg.y).toBeLessThan(r.lap.y);
    expect(r.lap.y).toBeLessThan(r.build.y);
  });
});
