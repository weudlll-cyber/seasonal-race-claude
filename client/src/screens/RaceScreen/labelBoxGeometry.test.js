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
    expect(labelBoxHeight(20)).toBeCloseTo(20 * 1.18, 10);
    expect(labelOffsetAbove(20)).toBeCloseTo(20 * 2.0, 10);
    expect(labelBoxWidth(42)).toBeCloseTo(50, 10);
  });

  it('scales linearly with the font, so one frame fraction sets the whole box', () => {
    expect(labelBoxHeight(30) / labelBoxHeight(10)).toBeCloseTo(3, 10);
    expect(labelOffsetAbove(30) / labelOffsetAbove(10)).toBeCloseTo(3, 10);
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
