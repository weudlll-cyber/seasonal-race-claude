// ============================================================
// File:        rollCall.test.js
// Path:        client/src/screens/RaceScreen/rollCall.test.js
// Project:     RaceArena — START-SEQUENCE-1
//
// WHAT THIS GUARDS: the owner's promise — every spectator can find their racer once — now that it is
// kept over TIME on crowded formations instead of in a single frame.
//
// R7's two questions are answered at each test.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  partitionIntoWaves,
  countdownDurationFor,
  rollCallWaveIndex,
  formationNeedsStagger,
  labelBoxHeight,
  labelOffsetAbove,
} from './nameTagLayout.js';

const FONT = 16;

/** A label box centred at (cx, cy) holding `textW` of text, at full size. */
function boxAt(index, cx, cy, textW = 50, fontPx = FONT) {
  const h = labelBoxHeight(fontPx);
  const off = labelOffsetAbove(fontPx);
  const w = textW + 8;
  return {
    index,
    left: cx - w / 2,
    right: cx + w / 2,
    top: cy - off - h,
    bottom: cy - off,
  };
}

describe('every name appears at least once (START-SEQUENCE-1)', () => {
  // What breaks if deleted: a racer could silently never be named.
  // What goes unnoticed: exactly that. The roll call would still LOOK like a roll call — names
  // appearing and changing — while one spectator waits for a name that never comes. There is no
  // symptom to spot, which is why this is the promise that gets a test rather than a comment.
  it('names every racer, however crowded the formation', () => {
    // 40 labels stacked on almost the same point: maximum conflict.
    const boxes = Array.from({ length: 40 }, (_, i) => boxAt(i, 100 + i * 2, 300));
    const waves = partitionIntoWaves(boxes);
    const named = new Set(waves.flat().map((b) => b.index));
    expect(named.size).toBe(40);
    // and nobody is named twice, which would waste a wave
    expect(waves.flat()).toHaveLength(40);
  });

  it('never puts two overlapping labels in the same wave', () => {
    const boxes = Array.from({ length: 30 }, (_, i) => boxAt(i, 100 + i * 6, 300 + (i % 3) * 4));
    for (const wave of partitionIntoWaves(boxes)) {
      expect(formationNeedsStagger(wave)).toBe(false);
    }
  });
});

describe('a roomy formation is exactly one wave (START-SEQUENCE-1)', () => {
  // What breaks if deleted: the rule could start splitting formations that never needed it.
  // What goes unnoticed: the owner's "only where necessary" quietly becoming "always" — every
  // uncrowded track would gain a roll call nobody asked for, and it would look deliberate.
  it('returns ONE wave when nothing overlaps, so those tracks are untouched', () => {
    const roomy = [boxAt(0, 100, 300), boxAt(1, 400, 300), boxAt(2, 700, 300)];
    expect(formationNeedsStagger(roomy)).toBe(false);
    const waves = partitionIntoWaves(roomy);
    expect(waves).toHaveLength(1);
    expect(waves[0]).toHaveLength(3);
  });

  it('falls out of the mechanism rather than a special case — one racer, one wave', () => {
    expect(partitionIntoWaves([boxAt(0, 100, 300)])).toHaveLength(1);
    expect(partitionIntoWaves([])).toHaveLength(0);
  });

  it('a one-wave formation can never stretch the countdown', () => {
    // The link between the two halves: one wave, whatever the per-wave beat, is the minimum.
    for (const per of [0, 100, 900, 3999]) {
      expect(countdownDurationFor(1, 4000, per)).toBe(4000);
    }
  });

  it('and its wave index is always 0, so the clock cannot affect it', () => {
    for (const t of [0, 500, 10_000, 1e9]) {
      expect(rollCallWaveIndex(t, 900, 1)).toBe(0);
    }
  });
});

describe('the countdown never falls below the configured minimum (START-SEQUENCE-1)', () => {
  // What breaks if deleted: the derivation could shorten a countdown.
  // What goes unnoticed: a countdown that got FASTER because a formation was crowded — the exact
  // opposite of the intent, and the kind of inversion that reads as "the game feels rushed today"
  // rather than as a bug anyone would report.
  it('is the minimum whenever the roll call is shorter than it', () => {
    expect(countdownDurationFor(1, 4000, 900)).toBe(4000);
    expect(countdownDurationFor(4, 4000, 900)).toBe(4000); // 3600 < 4000
  });

  it('stretches, and only stretches, when the roll call is longer', () => {
    expect(countdownDurationFor(5, 4000, 900)).toBe(4500);
    expect(countdownDurationFor(10, 4000, 900)).toBe(9000);
  });

  it('is monotonic in the wave count — more names can never mean less time', () => {
    let previous = 0;
    for (let w = 1; w <= 20; w++) {
      const ms = countdownDurationFor(w, 4000, 900);
      expect(ms).toBeGreaterThanOrEqual(previous);
      previous = ms;
    }
  });

  it('survives the degenerate configs a Dev Panel can produce', () => {
    expect(countdownDurationFor(0, 4000, 900)).toBe(4000);
    expect(countdownDurationFor(3, 0, 900)).toBe(2700);
    expect(countdownDurationFor(3, 4000, 0)).toBe(4000);
    expect(countdownDurationFor(NaN, 4000, 900)).toBe(4000);
  });
});
