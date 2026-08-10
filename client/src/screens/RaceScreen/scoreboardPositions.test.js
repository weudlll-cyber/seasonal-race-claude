// ============================================================
// File:        scoreboardPositions.test.js
// Path:        client/src/screens/RaceScreen/scoreboardPositions.test.js
// Project:     RaceArena — SCOREBOARD-SLOT-LAYER
//
// WHAT THIS GUARDS: the one failure this shape can produce, and it is silent.
//
// The ranking left React so that a card whose place moved would not be re-rendered. The price is
// that nothing in React's model now guarantees the list is updated at all: if `applyRanks` stops
// being called, or writes to a node it no longer holds, every card keeps the last place it was
// given, the race runs on, and NOTHING THROWS. A screenshot of the first frame is perfect. Only a
// race shows it — which is exactly the failure `ScoreboardRow.test.jsx` was written for one block
// ago, in its old form, when the danger was a rank hidden on a memoised identity object.
//
// So both directions are asserted: a card whose place changed MUST move, and a card whose place did
// not change must NOT be written to (or the block bought nothing and the "no style writes" claim is
// false).
//
// R7 — what breaks if this file is deleted: the standings silently freeze, in a way no other test in
// the repo can see, because every other test now looks at a card that has no place on it.
// ============================================================

import { describe, it, expect } from 'vitest';
import { createScoreboardPositions } from './scoreboardPositions.js';
import { ROW_PITCH_PX, RANK_PALETTE, CARD_TEXT_FALLBACK } from './scoreboardLayout.js';

// REAL elements, in jsdom, on purpose. A stub `{ style: {} }` would be enough to check the
// arithmetic and would have missed the defect this file actually caught: a browser normalises
// `#ddd` to `rgb(221, 221, 221)` on the way in, so any "have I already written this colour?" guard
// that reads the element back is always false and repaints every card that moves.
const node = () => document.createElement('div');
const ranksOf = (obj) => new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));

/** A positioner with `n` cards attached, indexed 0..n-1, all unranked until told. */
function withCards(n) {
  const p = createScoreboardPositions();
  const els = new Map();
  for (let i = 0; i < n; i++) {
    const el = node();
    els.set(i, el);
    p.attach(i, el);
  }
  return { p, els };
}

describe('the ranking reaches the DOM — the freeze this file exists for', () => {
  it('moves a card by exactly one pitch per place', () => {
    const { p, els } = withCards(3);
    p.applyRanks(ranksOf({ 0: 3, 1: 1, 2: 2 }));
    expect(els.get(1).style.transform).toBe('translateY(0px)');
    expect(els.get(2).style.transform).toBe(`translateY(${ROW_PITCH_PX}px)`);
    expect(els.get(0).style.transform).toBe(`translateY(${2 * ROW_PITCH_PX}px)`);
  });

  it('an overtake moves BOTH cards, on the tick it happens', () => {
    const { p, els } = withCards(2);
    p.applyRanks(ranksOf({ 0: 1, 1: 2 }));
    const before = [els.get(0).style.transform, els.get(1).style.transform];
    const r = p.applyRanks(ranksOf({ 0: 2, 1: 1 }));
    expect(r.moved).toBe(2);
    expect(els.get(0).style.transform).toBe(before[1]);
    expect(els.get(1).style.transform).toBe(before[0]);
  });

  it('writes NOTHING for a card whose place did not change — the other half of the claim', () => {
    // If this fails, every tick writes a hundred transforms and the block has bought nothing.
    const { p } = withCards(40);
    const ranks = ranksOf(Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i, i + 1])));
    expect(p.applyRanks(ranks).moved).toBe(40); // first application: everything is new
    expect(p.applyRanks(ranks).moved).toBe(0); // nothing moved: nothing written
    // ...and one racer swapping with the next writes exactly two.
    const swapped = new Map(ranks);
    swapped.set(7, 9);
    swapped.set(8, 8);
    expect(p.applyRanks(swapped).moved).toBe(2);
  });
});

describe('the colour is PLACE-bound, and it is the only style a rank change can touch', () => {
  it('gives the top three the palette and everyone else the fallback', () => {
    const { p, els } = withCards(4);
    p.applyRanks(ranksOf({ 0: 1, 1: 2, 2: 3, 3: 4 }));
    expect(els.get(0).style.color).toBe('rgb(255, 215, 0)'); // gold
    expect(els.get(1).style.color).toBe('rgb(192, 192, 192)'); // silver
    expect(els.get(2).style.color).toBe('rgb(205, 127, 50)'); // bronze
    expect(els.get(3).style.color).toBe('rgb(221, 221, 221)'); // #ddd — the CARD's fallback,
    // which is the NAME's old `?? '#ddd'`, not the badge's `?? '#888'`. The badge keeps its own.
  });

  it('recolours ONLY the cards that crossed the top-three boundary', () => {
    // The honest bound on what a rank change still costs. Everything below third is one colour, so a
    // reshuffle in the midfield writes transforms and no colours at all.
    const { p } = withCards(20);
    const base = ranksOf(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i, i + 1])));
    p.applyRanks(base);
    // A swap deep in the field: two moves, zero colour writes.
    const midfield = new Map(base);
    midfield.set(11, 13);
    midfield.set(12, 12);
    expect(p.applyRanks(midfield)).toEqual({ moved: 2, recoloured: 0 });
    // A swap across the podium edge: two moves, two colour writes.
    const podium = new Map(midfield);
    podium.set(2, 4);
    podium.set(3, 3);
    expect(p.applyRanks(podium)).toEqual({ moved: 2, recoloured: 2 });
  });
});

describe('cards that arrive late, and cards that leave', () => {
  it('positions a card the moment it attaches, from the ranking already held', () => {
    // RaceScreen seeds the ranking BEFORE React mounts the cards. Without this a fresh card would
    // sit at the top of the list until the next cadence tick — visible, and only on the first frames
    // of a race, which is exactly where nobody looks.
    const p = createScoreboardPositions();
    p.applyRanks(ranksOf({ 5: 4 }));
    const el = node();
    p.attach(5, el);
    expect(el.style.transform).toBe(`translateY(${3 * ROW_PITCH_PX}px)`);
    expect(el.style.color).toBe('rgb(221, 221, 221)');
  });

  it('stops writing to a detached node, and repositions its replacement', () => {
    // React hands the ref `null` and then the new element when a card re-renders into a new node.
    const p = createScoreboardPositions();
    const first = node();
    p.attach(1, first);
    p.applyRanks(ranksOf({ 1: 2 }));
    p.attach(1, null);
    p.applyRanks(ranksOf({ 1: 5 }));
    expect(first.style.transform).toBe(`translateY(${ROW_PITCH_PX}px)`); // untouched since detach
    const second = node();
    p.attach(1, second);
    expect(second.style.transform).toBe(`translateY(${4 * ROW_PITCH_PX}px)`); // the CURRENT place
  });
});

describe('the palette this writes is the shipped one', () => {
  it('is gold / silver / bronze and a light fallback', () => {
    expect(RANK_PALETTE).toEqual(['#ffd700', '#c0c0c0', '#cd7f32']);
    expect(CARD_TEXT_FALLBACK).toBe('#ddd');
  });
});
