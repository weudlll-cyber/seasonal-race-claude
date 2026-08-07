// ============================================================
// File:        nameTagLayout.stagger.test.js
// Path:        client/src/screens/RaceScreen/nameTagLayout.stagger.test.js
// Project:     RaceArena — LABEL-STAGGER-1
//
// WHAT THIS GUARDS: the TRIGGER — the question "does this formation have a label problem at all".
// The placement half of LABEL-STAGGER-1 was measured and did NOT ship (see the module header), so
// there is deliberately no test here for a staggered picture: there is no staggered picture.
//
// R7's two questions, per test, are answered at each test.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  formationNeedsStagger,
  labelBoxHeight,
  labelOffsetAbove,
  labelBoxWidth,
} from './nameTagLayout.js';

/** A label box at (cx, cy) that is `w` wide and one label tall, in screen px. */
function boxAt(index, cx, cy, w = 50, fontPx = 16) {
  const h = labelBoxHeight(fontPx);
  const off = labelOffsetAbove(fontPx);
  return {
    index,
    left: cx - w / 2,
    right: cx + w / 2,
    top: cy - off - h,
    bottom: cy - off,
  };
}

describe('formationNeedsStagger — the trigger (LABEL-STAGGER-1)', () => {
  // What breaks if deleted: the trigger could invert and nothing would notice.
  // What goes unnoticed: a rule that fires on every formation, or on none — both look "fine"
  // until the owner sees a track that changed for no reason.
  it('fires when two labels genuinely intersect', () => {
    // Same height, 10 px apart horizontally, 50 px wide — they must overlap.
    const boxes = [boxAt(0, 100, 300), boxAt(1, 110, 300)];
    expect(formationNeedsStagger(boxes)).toBe(true);
  });

  it('does NOT fire on a roomy formation — the picture there must not change at all', () => {
    // The owner's requirement (d): where the room is sufficient, nothing changes. Far apart on
    // BOTH axes, and far apart on EITHER axis alone, because a box misses on either.
    const wideApart = [boxAt(0, 100, 300), boxAt(1, 400, 300)];
    const tallApart = [boxAt(0, 100, 300), boxAt(1, 100, 500)];
    expect(formationNeedsStagger(wideApart)).toBe(false);
    expect(formationNeedsStagger(tallApart)).toBe(false);
  });

  it('is not fooled by vertical closeness alone — the escape is horizontal', () => {
    // THE MEASURED DEFECT of the specified height-only rule, pinned as a test. These two labels sit
    // at the SAME height, which a "row separation vs label height" test condemns, and they do not
    // touch. That reading fired 153 times where no labels overlapped.
    const sameRowHeight = [boxAt(0, 100, 300), boxAt(1, 200, 300)];
    expect(formationNeedsStagger(sameRowHeight)).toBe(false);
  });

  it('handles the degenerate inputs a live frame can actually produce', () => {
    expect(formationNeedsStagger([])).toBe(false);
    expect(formationNeedsStagger([boxAt(0, 100, 300)])).toBe(false);
    expect(formationNeedsStagger(null)).toBe(false);
  });
});

describe('the label box has ONE definition (LABEL-STAGGER-1)', () => {
  // What breaks if deleted: nothing immediately — which is the point. The two copies that existed
  // before had not drifted either.
  // What goes unnoticed: the layout reasoning about a box the renderer does not draw. That is
  // invisible until a label lands somewhere nobody predicted.
  it('derives every dimension from the font size, with no second constant', () => {
    const fontPx = 20;
    expect(labelBoxHeight(fontPx)).toBeCloseTo(20 * 1.18, 10);
    expect(labelOffsetAbove(fontPx)).toBeCloseTo(20 * 2.0, 10);
    expect(labelBoxWidth(42)).toBeCloseTo(50, 10);
  });

  it('scales linearly with the font, so one frame fraction sets the whole box', () => {
    expect(labelBoxHeight(30) / labelBoxHeight(10)).toBeCloseTo(3, 10);
    expect(labelOffsetAbove(30) / labelOffsetAbove(10)).toBeCloseTo(3, 10);
  });
});
