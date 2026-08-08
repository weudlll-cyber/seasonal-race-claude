// ============================================================
// File:        labelBoxGeometry.test.js
// Path:        client/src/screens/RaceScreen/labelBoxGeometry.test.js
// Project:     RaceArena — CLEANUP-BEFORE-NUMBERS-1
//
// WHAT THIS GUARDS: that the label box has ONE definition, and that unifying it changed no arithmetic.
//
// This is the whole test suite the salvage needs. The mechanisms these helpers were extracted for —
// the stagger, the shrink, the roll call — are all gone, so there is nothing else here to keep
// honest. Testing them further would be testing the shape of a rectangle.
//
// R7's two questions are answered at each test.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { labelBoxHeight, labelOffsetAbove, labelBoxWidth } from './nameTagLayout.js';

describe('the label box has one definition (CLEANUP-BEFORE-NUMBERS-1)', () => {
  // What breaks if deleted: nothing today — which is exactly the point. The two copies that existed
  // before had not drifted either.
  // What goes unnoticed: the layout reasoning about a box the renderer does not draw. Invisible
  // until a label lands somewhere nobody predicted, and then very hard to attribute.
  it('renders the box the same way it was measured before the merge', () => {
    // The literals the renderer used to carry, pinned so the unification stays arithmetically
    // identical. If the box is ever RESHAPED on purpose, these change with it in one place.
    //
    // The `labelOffsetAbove(20) === 20 * 2.0` assertion that stood here is GONE ON PURPOSE, not
    // lost: LABEL-OFFSET-1 changed that contract by the owner's order, because a gap tied to the
    // font is exactly the defect he saw. Its replacement is the suite below.
    expect(labelBoxHeight(20)).toBeCloseTo(20 * 1.18, 10);
    expect(labelBoxWidth(42)).toBeCloseTo(50, 10);
  });

  it('scales linearly with the font, so one frame fraction sets the whole box', () => {
    expect(labelBoxHeight(30) / labelBoxHeight(10)).toBeCloseTo(3, 10);
    // The padding is a fixed inset and deliberately does NOT scale — it is a drawn margin, not type.
    expect(labelBoxWidth(0)).toBe(labelBoxWidth(0));
    expect(labelBoxWidth(10) - 10).toBe(labelBoxWidth(100) - 100);
  });

  it('is not re-typed as a literal in the renderer', () => {
    // The drift this exists to catch: somebody adding `fontPx * 1.18` back rather than importing.
    const src = readFileSync(
      join(process.cwd(), 'src/screens/RaceScreen/drawing/racerRendering.js'),
      'utf8'
    );
    expect(src).toMatch(/from '\.\.\/nameTagLayout\.js'/);
    expect(src).not.toMatch(/fontPx \* 1\.18/);
    expect(src).not.toMatch(/fontPx \* 2\.0/);
  });
});

describe('the gap follows the racer, not the font (LABEL-OFFSET-1)', () => {
  // What breaks if deleted: the gap could be re-tied to the font — it is one edit away, and the old
  // form was shorter to write.
  // What goes unnoticed: everything, for a while. Labels would still be drawn, still be readable,
  // still be decluttered. They would simply sit at a distance that has nothing to do with the racer
  // — snug on a big sprite and detached on a small one — which is the defect the owner had to spot
  // by eye on river-run because no test could see it.
  it('scales with the racer’s drawn height', () => {
    // Half the height, so the label's bottom edge lands on the racer's top edge.
    expect(labelOffsetAbove(40, 0)).toBeCloseTo(20, 10);
    expect(labelOffsetAbove(80, 0)).toBeCloseTo(40, 10);
    // Doubling the racer doubles the gap it is given.
    expect(labelOffsetAbove(80, 0) / labelOffsetAbove(40, 0)).toBeCloseTo(2, 10);
  });

  it('gives a larger racer a larger gap than a smaller one at the same margin', () => {
    // The spec's requirement, stated as a comparison rather than an absolute so it survives any
    // future change to the margin's default.
    const margin = 6;
    const small = labelOffsetAbove(32, margin);
    const large = labelOffsetAbove(96, margin);
    expect(large).toBeGreaterThan(small);
    // And the whole of the difference is the racer — the margin cancels, which is what makes the
    // margin a gap the owner can tune rather than a second size multiplier.
    expect(large - small).toBeCloseTo((96 - 32) / 2, 10);
  });

  it('does not move when the font changes, which is the defect it was built to end', () => {
    // The old rule was `fontPx * 2.0`. Nothing here takes a font at all, so the only way to bring
    // the defect back is to change the signature — which every call site would have to follow.
    expect(labelOffsetAbove.length).toBe(2);
  });

  it('adds the margin above the racer’s edge, and only that', () => {
    expect(labelOffsetAbove(40, 6) - labelOffsetAbove(40, 0)).toBeCloseTo(6, 10);
    expect(labelOffsetAbove(0, 6)).toBeCloseTo(6, 10);
  });

  it('survives the degenerate sizes a live frame can produce', () => {
    // A racer whose sprite has not loaded, or a frame before the scale is known, must not throw or
    // fling the label off screen — it collapses to the margin.
    expect(labelOffsetAbove(0, 0)).toBe(0);
    expect(labelOffsetAbove(NaN, 6)).toBeCloseTo(6, 10);
    expect(labelOffsetAbove(-40, 6)).toBeCloseTo(6, 10);
    expect(labelOffsetAbove(40, NaN)).toBeCloseTo(20, 10);
  });
});
