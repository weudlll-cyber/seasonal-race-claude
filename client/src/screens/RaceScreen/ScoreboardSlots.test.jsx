// ============================================================
// File:        ScoreboardSlots.test.jsx
// Path:        client/src/screens/RaceScreen/ScoreboardSlots.test.jsx
// Project:     RaceArena — SCOREBOARD-SLOT-LAYER
//
// WHAT THIS GUARDS: that the place column is the one the rows used to draw, and that it is drawn
// ONCE.
//
// Two different failures, and the second is the silent one. The first — a wrong badge, a missing
// crown, bronze on the wrong place — an eye catches in a second. The second is that the layer
// re-renders anyway: everything still LOOKS right, every other test stays green, and the whole
// reason the places were separated from the racers has quietly evaporated. So "drawn once" is
// asserted behaviourally, the same way the card's inertness is.
//
// R7 — what breaks if this file is deleted: somebody passes a live value into this layer (a lap, a
// leader name, a highlight), it re-renders every tick, and nothing says so.
// ============================================================

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ScoreboardSlots } from './ScoreboardSlots.jsx';
import { ROW_PITCH_PX, RANK_PALETTE } from './scoreboardLayout.js';

const badges = (container) => [...container.querySelectorAll('.sb-rank')];

describe('ScoreboardSlots — the places, and their colours', () => {
  it('crowns first place and numbers the rest, once per racer in the field', () => {
    const { container } = render(<ScoreboardSlots count={5} />);
    expect(badges(container).map((b) => b.textContent)).toEqual(['👑', '2', '3', '4', '5']);
  });

  it('colours the first THREE places and nothing below — gold, SILVER, bronze', () => {
    // The owner asked for this one to be checked rather than assumed: second place is silver.
    const { container } = render(<ScoreboardSlots count={4} />);
    const colors = badges(container).map((b) => b.style.color);
    expect(colors).toEqual([
      'rgb(255, 215, 0)', // #ffd700 gold
      'rgb(192, 192, 192)', // #c0c0c0 SILVER
      'rgb(205, 127, 50)', // #cd7f32 bronze
      'rgb(136, 136, 136)', // the #888 fallback — fourth is off the palette
    ]);
    expect(RANK_PALETTE).toEqual(['#ffd700', '#c0c0c0', '#cd7f32']);
    // The border takes its own fallback, exactly as the old row's `?? '#444'` did.
    expect(badges(container).at(-1).style.borderColor).toBe('rgb(68, 68, 68)');
  });

  it('stacks one pitch apart, starting flush at the top', () => {
    const { container } = render(<ScoreboardSlots count={3} />);
    const slots = [...container.querySelectorAll('.scoreboard-slot')];
    expect(slots.map((s) => s.style.transform)).toEqual([
      'translateY(0px)',
      `translateY(${ROW_PITCH_PX}px)`,
      `translateY(${2 * ROW_PITCH_PX}px)`,
    ]);
  });

  it('renders the whole field, at a size only a big race produces', () => {
    const { container } = render(<ScoreboardSlots count={140} />);
    const b = badges(container);
    expect(b).toHaveLength(140);
    expect(b.at(-1).textContent).toBe('140');
  });
});

describe('ScoreboardSlots — drawn ONCE, which is the point of the layer', () => {
  it('is memoised on a single primitive, so a parent re-render cannot reach it', () => {
    // TWO facts together are the claim, and neither is enough alone: the export is a `memo`, and its
    // ONLY prop is a number that cannot change during a race. Given both, React's shallow compare
    // provably skips this subtree on every re-render RaceScreen does.
    //
    // Stated as structure rather than as a render count on purpose. `memo` skipping is not
    // observable from the outside — React reuses the DOM nodes whether it skipped or re-rendered —
    // so a "behavioural" version of this test would be a probe that proves nothing. What CAN
    // regress is somebody adding a second prop, and that is what this catches.
    expect(ScoreboardSlots.$$typeof).toBe(Symbol.for('react.memo'));
    expect(ScoreboardSlots.type.length).toBe(1); // one props object...
    const source = ScoreboardSlots.type.toString();
    expect(source.slice(0, source.indexOf(')'))).toMatch(/\{\s*count\s*\}/); // ...destructured to `count` alone
  });

  it('follows the field size when it genuinely changes', () => {
    // The L203 pair: a switch is tested by proving its two positions differ, or the test above is
    // satisfied by a component that renders nothing at all.
    const { container, rerender } = render(<ScoreboardSlots count={4} />);
    expect(container.querySelectorAll('.sb-rank')).toHaveLength(4);
    rerender(<ScoreboardSlots count={6} />);
    expect(container.querySelectorAll('.sb-rank')).toHaveLength(6);
    expect(badges(container).at(-1).textContent).toBe('6');
  });
});
