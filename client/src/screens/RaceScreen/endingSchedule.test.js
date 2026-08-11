// ============================================================
// File:        endingSchedule.test.js
// Path:        client/src/screens/RaceScreen/endingSchedule.test.js
// Project:     RaceArena — ENDING-HOLD-1
// Created:     2026-08-13
// Description: The hold's two positions, and the total nobody should add up by hand.
//
//              THE DEFAULT MOVED, 2026-08-12. It shipped at 0 because the measurement said there
//              was no WAIT to restore; the owner then asked for the picture to stand still after
//              the last crossing, which is a different request the 0 could not answer. The default
//              is now that behaviour. BOTH positions are still tested — L203 — and 0 keeps its own
//              test, because "no hold at all" is the escape hatch and an escape hatch nobody
//              exercises is a claim rather than a feature.
// ============================================================

import { describe, it, expect } from 'vitest';

import { endingHoldMs, endingTotalMs, SCREEN_TRANSITION_MS } from './endingSchedule.js';
import { DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';

const PAUSE = DEFAULT_CAMERA_CONFIG.finishPauseMs;
const BEAT = DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs;

describe('ENDING-HOLD-1 — the shipped default IS the hold', () => {
  it('ships at his beat, the same 1500 the podium build-up uses', () => {
    expect(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs).toBe(1500);
    expect(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs).toBe(
      DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs
    );
  });

  it('at the default the navigation delay is the hold PLUS the pause', () => {
    const hold = endingHoldMs(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs);
    expect(hold).toBe(1500);
    expect(hold + PAUSE).toBe(1500 + PAUSE);
  });

  // WHAT THE OWNER ACTUALLY SEES GROW. The winner card is capped at min(card, pause) and does not
  // inherit the hold, so the hold lands entirely on the CARD-FREE tail of the ending.
  it('the card-free tail is what grows, and the card itself does not', () => {
    const card = Math.min(DEFAULT_CAMERA_CONFIG.winnerCardMs, PAUSE);
    const tailBefore = endingHoldMs(0) + PAUSE - card;
    const tailAfter = endingHoldMs(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs) + PAUSE - card;
    expect(tailBefore).toBe(500);
    expect(tailAfter).toBe(2000);
    expect(card).toBe(3000); // unchanged by the hold
  });
});

describe('ENDING-HOLD-1 — the OTHER position, which is the escape hatch', () => {
  it('0 means no hold at all — the ending that existed before this key', () => {
    expect(endingHoldMs(0)).toBe(0);
    expect(endingHoldMs(0) + PAUSE).toBe(PAUSE);
  });

  it('the two positions differ, which is the whole point of the switch', () => {
    expect(endingHoldMs(0) + PAUSE).not.toBe(
      endingHoldMs(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs) + PAUSE
    );
  });

  it('a set hold ADDS to the pause and does not replace it', () => {
    expect(endingHoldMs(2000) + PAUSE).toBe(2000 + PAUSE);
  });

  it('reads a broken or negative stored value as no hold, not as the default', () => {
    for (const bad of [NaN, Infinity, -1, '2000']) {
      expect(endingHoldMs(bad)).toBe(0);
    }
  });

  // `undefined`/`null` mean "the key is absent", which is a DIFFERENT question from "the key is
  // broken": an absent key must fall back to the shipped default, or every stored config written
  // before this key existed would silently opt out of the behaviour he asked for.
  it('an ABSENT key falls back to the shipped default, not to 0', () => {
    expect(endingHoldMs(undefined)).toBe(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs);
    expect(endingHoldMs(null)).toBe(DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs);
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
    expect(total()).toBe(
      DEFAULT_CAMERA_CONFIG.finishHoldAfterLastMs + PAUSE + SCREEN_TRANSITION_MS + 4 * BEAT
    );
  });

  // The number the owner is judging: 11 370 ms at the shipped config, against 9 870 with no hold.
  it('the shipped ending costs 11370 ms, and 9870 with the hold switched off', () => {
    expect(total()).toBe(11370);
    expect(total({ holdMs: 0 })).toBe(9870);
  });

  it('grows by exactly the hold', () => {
    expect(total({ holdMs: 2500 })).toBe(total({ holdMs: 0 }) + 2500);
  });

  it('the podium term is FOUR beats, because that is what the build-up costs', () => {
    expect(total({ podiumBeatMs: 1000 }) - total({ podiumBeatMs: 0 })).toBe(4000);
  });

  it('every phase at 0 leaves only the screen transition, which is not a key', () => {
    expect(total({ holdMs: 0, pauseMs: 0, podiumBeatMs: 0 })).toBe(SCREEN_TRANSITION_MS);
  });
});
