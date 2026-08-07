// ============================================================
// File:        nameTagLayout.shrink.test.js
// Path:        client/src/screens/RaceScreen/nameTagLayout.shrink.test.js
// Project:     RaceArena — LABEL-SHRINK-1
//
// WHAT THIS GUARDS: the shrink FACTOR — how small a formation's labels have to get, and the floor
// that stops them getting smaller than a viewer can read.
//
// The TRIGGER is guarded next door in nameTagLayout.stagger.test.js and is not re-tested here; the
// shrink reuses it unchanged, and a second copy of those assertions would be a second place to
// update. R7's two questions are answered at each test below.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  computeLabelShrink,
  formationNeedsStagger,
  labelBoxHeight,
  labelOffsetAbove,
  LABEL_MIN_SCALE,
} from './nameTagLayout.js';

const FONT = 16;

/** A label box centred at (cx, cy) with `textW` of text in it, at full size. */
function boxAt(index, cx, cy, textW = 50, fontPx = FONT) {
  const h = labelBoxHeight(fontPx);
  const off = labelOffsetAbove(fontPx);
  const w = textW + 8; // labelBoxWidth
  return {
    index,
    left: cx - w / 2,
    right: cx + w / 2,
    top: cy - off - h,
    bottom: cy - off,
  };
}

/** Apply the factor the way drawNameTag does, then ask whether anything still collides. */
function stillOverlapsAfter(boxes, scale, fontPx = FONT) {
  const scaled = boxes.map((b) => {
    const cx = (b.left + b.right) / 2;
    const t = b.right - b.left - 8;
    const w = t * scale + 8;
    const sy = b.bottom + labelOffsetAbove(fontPx); // racer centre
    const bottom = sy - labelOffsetAbove(fontPx) * scale;
    return {
      index: b.index,
      left: cx - w / 2,
      right: cx + w / 2,
      top: bottom - labelBoxHeight(fontPx) * scale,
      bottom,
    };
  });
  return formationNeedsStagger(scaled);
}

describe('computeLabelShrink — the factor (LABEL-SHRINK-1)', () => {
  // What breaks if deleted: the factor could stop clearing collisions and only the ten-track sweep
  // would notice, which nobody runs on every commit.
  // What goes unnoticed: labels that still overlap after the rule claims to have fixed them.
  it('shrinks a colliding formation until nothing collides', () => {
    // 45 px apart at the same height, 50 px of text each: the boxes are 58 px wide so they overlap
    // at full size, and the overlap is shallow enough to be cleared above the floor. (10 px apart
    // would NOT be — that is a floor case, and it has its own test below.)
    const boxes = [boxAt(0, 100, 300), boxAt(1, 145, 300)];
    expect(formationNeedsStagger(boxes)).toBe(true);

    const { scale, clears } = computeLabelShrink(boxes, FONT);
    expect(clears).toBe(true);
    expect(scale).toBeLessThan(1);
    expect(stillOverlapsAfter(boxes, scale)).toBe(false);
  });

  // What breaks if deleted: the rule could start shrinking every track.
  // What goes unnoticed: exactly the defect the owner named — a track changing when it did not
  // need to. It is invisible in a screenshot of the track that DID need it.
  it('leaves a roomy formation at exactly 1 — those tracks must not change at all', () => {
    const roomy = [boxAt(0, 100, 300), boxAt(1, 400, 300), boxAt(2, 700, 300)];
    expect(formationNeedsStagger(roomy)).toBe(false);
    const { scale, clears } = computeLabelShrink(roomy, FONT);
    // EXACTLY 1, not merely close to it. The renderer's "changed nothing" path keys on this, and
    // 0.999 would move every pixel of every label on every untouched track.
    expect(scale).toBe(1);
    expect(clears).toBe(true);
  });

  // What breaks if deleted: nothing today — which is why it is worth pinning. The floor is the one
  // thing standing between a crowded grid and unreadable text.
  // What goes unnoticed: a formation quietly shrinking to nothing, which looks like a bug in the
  // font rather than a deliberate limit.
  it('stops AT the floor rather than going under it, and says it did not clear', () => {
    // Two long labels almost exactly on top of each other: clearing them needs a factor far below
    // any sane floor, so the floor must bind.
    const boxes = [boxAt(0, 100, 300, 400), boxAt(1, 101, 300, 400)];
    const { scale, clears } = computeLabelShrink(boxes, FONT);
    expect(scale).toBe(LABEL_MIN_SCALE);
    // The honest half: it reports that it did NOT clear, so the caller can report it rather than
    // believe the problem is solved.
    expect(clears).toBe(false);
    expect(stillOverlapsAfter(boxes, scale)).toBe(true);
  });

  it('never returns a factor below the floor, whatever it is handed', () => {
    for (const gap of [0.5, 1, 2, 5]) {
      const boxes = [boxAt(0, 100, 300, 300), boxAt(1, 100 + gap, 300, 300)];
      expect(computeLabelShrink(boxes, FONT).scale).toBeGreaterThanOrEqual(LABEL_MIN_SCALE);
    }
  });

  it('uses the VERTICAL escape when that is the cheaper one', () => {
    // Same x, separated vertically by a little less than one box height: shrinking the height alone
    // clears them, and the factor should be close to that ratio rather than tiny.
    const dy = labelBoxHeight(FONT) * 0.8;
    const boxes = [boxAt(0, 100, 300), boxAt(1, 100, 300 + dy)];
    expect(formationNeedsStagger(boxes)).toBe(true);
    const { scale } = computeLabelShrink(boxes, FONT);
    expect(scale).toBeGreaterThan(0.75);
    expect(stillOverlapsAfter(boxes, scale)).toBe(false);
  });

  it('handles the degenerate inputs a live frame can produce', () => {
    expect(computeLabelShrink([], FONT).scale).toBe(1);
    expect(computeLabelShrink([boxAt(0, 100, 300)], FONT).scale).toBe(1);
    expect(computeLabelShrink(null, FONT).scale).toBe(1);
    expect(computeLabelShrink([boxAt(0, 100, 300)], 0).scale).toBe(1);
  });
});
