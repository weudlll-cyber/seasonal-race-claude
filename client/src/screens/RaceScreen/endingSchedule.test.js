// ============================================================
// File:        endingSchedule.test.js
// Path:        client/src/screens/RaceScreen/endingSchedule.test.js
// Project:     RaceArena — ENDING-HOLD-1
// Created:     2026-08-13
// Description: The hold's two positions, and the total nobody should add up by hand.
//
//              THE POSITION THAT MATTERS IS 0. The measurement said there is no defect in the
//              ending, so this key ships switched OFF and its first duty is to prove it changes
//              nothing — L203, a switch is tested by proving its two positions differ, and the
//              default position must be indistinguishable from the code before the key existed.
// ============================================================

import { describe, it, expect } from 'vitest';

import { endingHoldMs, endingTotalMs, SCREEN_TRANSITION_MS } from './endingSchedule.js';
import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';

const PAUSE = DEFAULT_CAMERA_CONFIG.finishPauseMs;
const BEAT = DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs;

describe('ENDING-HOLD-1 — the shipped default is OFF', () => {
  it('ships at 0', () => {
    expect(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs).toBe(0);
  });

  it('at the default the navigation delay is exactly the pause — the arithmetic that was there before', () => {
    const hold = endingHoldMs(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs);
    expect(hold).toBe(0);
    expect(hold + PAUSE).toBe(PAUSE);
  });
});

describe('ENDING-HOLD-1 — the other position', () => {
  it('a set hold ADDS to the pause and does not replace it', () => {
    expect(endingHoldMs(2000) + PAUSE).toBe(2000 + PAUSE);
  });

  it('the two positions differ, which is the whole point of the switch', () => {
    expect(endingHoldMs(0) + PAUSE).not.toBe(endingHoldMs(2000) + PAUSE);
  });

  it('reads a broken or negative stored value as OFF', () => {
    for (const bad of [undefined, null, NaN, Infinity, -1, '2000']) {
      expect(endingHoldMs(bad)).toBe(0);
    }
  });
});

describe('ENDING-HOLD-1 — the total the Dev Screen shows', () => {
  const total = (over = {}) =>
    endingTotalMs({
      holdMs: DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs,
      pauseMs: PAUSE,
      podiumBeatMs: BEAT,
      transitionMs: SCREEN_TRANSITION_MS,
      ...over,
    });

  it('is the sum of the phases, not a number typed anywhere', () => {
    expect(total()).toBe(0 + PAUSE + SCREEN_TRANSITION_MS + 4 * BEAT);
  });

  it('grows by exactly the hold', () => {
    expect(total({ holdMs: 2500 })).toBe(total() + 2500);
  });

  it('the podium term is FOUR beats, because that is what the build-up costs', () => {
    expect(total({ podiumBeatMs: 1000 }) - total({ podiumBeatMs: 0 })).toBe(4000);
  });

  it('every phase at 0 leaves only the screen transition, which is not a key', () => {
    expect(total({ holdMs: 0, pauseMs: 0, podiumBeatMs: 0 })).toBe(SCREEN_TRANSITION_MS);
  });
});
