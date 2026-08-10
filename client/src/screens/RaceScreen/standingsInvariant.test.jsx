// ============================================================
// File:        standingsInvariant.test.jsx
// Path:        client/src/screens/RaceScreen/standingsInvariant.test.jsx
// Project:     RaceArena — STANDINGS-RULE
//
// THE MEASURED HALF OF THE TWO-LAYER RULE. The rule is in docs/STANDINGS-ARCHITECTURE.md and this
// file does not restate it: **a rank change moves a card and must change NO text and NO structure
// anywhere.** That sentence is a NUMBER, and this is where the number is taken.
//
// ── WHY A MutationObserver AND NOT AN ASSERTION ABOUT THE DOM ───────────────────────────────────
//
// The end state of a correct list and the end state of a list that was torn down and rebuilt are
// IDENTICAL. Only the record of what the browser was asked to do tells them apart, and that record
// is what costs the frame. So the instrument is the browser's own: every childList, characterData
// and attribute change over the whole standings subtree, while the ranking churns.
//
// It is the same instrument the SCOREBOARD-SLOT-LAYER report measured with in a real browser (833
// mutations, all `scoreboard-card:style`); what this file adds is that it now runs on every verify
// instead of once, by hand, in a session nobody can repeat.
//
// ── WHY IT MOUNTS Scoreboard.jsx ────────────────────────────────────────────────────────────────
//
// Because the arrangement is part of what is being guarded. A test that built its own list of cards
// and slots would be measuring its own copy, and the copy cannot notice the real one changing. That
// is why the panel's composition was extracted — see Scoreboard.jsx's header.
//
// ── THE POSITIVE CONTROL, and it is not optional ────────────────────────────────────────────────
//
// Zero mutations is also what a FROZEN list produces. Every assertion below is therefore paired with
// a check that the cards genuinely moved — that after each ranking the set of translateY values is
// the full set of slot offsets, permuted. Without it this file would pass on a list that had stopped
// updating, which is the exact failure `scoreboardPositions.js` warns about in its own header.
//
// R7 — what breaks if this file is deleted: the place creeps back onto the card, or the list starts
// re-sorting itself, and nothing says so until somebody re-runs a browser bench by hand.
// ============================================================

import { describe, it, expect } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';
import Scoreboard from './Scoreboard.jsx';
import { createScoreboardPositions } from './scoreboardPositions.js';
import { ROW_PITCH_PX, RANK_PALETTE, slotOffsetPx } from './scoreboardLayout.js';

const FIELD = 24;

/** The cards RaceScreen builds once per race: stable identities, in RACER order. */
const buildCards = () =>
  Array.from({ length: FIELD }, (_, i) => ({
    index: i,
    identity: { index: i, icon: '🏇', name: `Racer ${i + 1}`, raceNumber: i + 1 },
    finished: false,
    finishTimeMs: null,
  }));

/**
 * A deterministic ranking sequence. NOT a real race — the question here is the MECHANISM, and which
 * racer belongs at which place is `scripts/scoreboard-parity.test.mjs`'s question, over a real race.
 * What this needs is churn: every place changing, including across the top-three boundary, many
 * times over.
 */
function rankingsFor(step) {
  const ranks = new Map();
  for (let i = 0; i < FIELD; i++) {
    // A rotation by a step that is coprime with the field size visits every arrangement offset, so
    // no card sits still across the whole run and first/second/third change hands every step.
    ranks.set(i, ((i + step * 7) % FIELD) + 1);
  }
  return ranks;
}

let positions;

/** Mount the real panel and hand back the rows container the observer watches. */
function mount(cards = buildCards()) {
  cleanup();
  positions = createScoreboardPositions();
  const { container } = render(
    <Scoreboard cards={cards} rosterIcon="🏇" attach={(i, el) => positions.attach(i, el)} />
  );
  const rows = container.querySelector('.scoreboard-rows');
  expect(rows, 'the standings did not mount — nothing below measures anything').toBeTruthy();
  return rows;
}

/** jsdom reads a written colour back as `rgb(...)`, so the palette is compared in its terms. */
const rgb = (hex) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

/** The y each card is currently translated to, in DOM order. */
const translateYs = (rows) =>
  [...rows.querySelectorAll('.scoreboard-card')].map((el) =>
    Number(/translateY\(([-\d.]+)px\)/.exec(el.style.transform)?.[1])
  );

/** Every mutation the observer has queued, taken synchronously. */
const drain = (obs) => obs.takeRecords();

describe('the standings two-layer rule, measured', () => {
  it('a rank change writes ONLY `style` on cards — zero text, zero structure', () => {
    const rows = mount();
    const obs = new MutationObserver(() => {});
    obs.observe(rows, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true,
      characterDataOldValue: true,
    });

    const records = [];
    const seenOrders = new Set();
    for (let step = 1; step <= 40; step++) {
      act(() => positions.applyRanks(rankingsFor(step)));
      records.push(...drain(obs));
      // POSITIVE CONTROL: the cards really moved, and they occupy every slot exactly once.
      const ys = translateYs(rows);
      expect([...ys].sort((a, b) => a - b)).toEqual(
        Array.from({ length: FIELD }, (_, i) => slotOffsetPx(i + 1))
      );
      seenOrders.add(ys.join(','));
    }
    obs.disconnect();

    // The rotation's period is the field size, so 40 steps produce FIELD distinct arrangements —
    // every card has stood in every slot. Fewer than that means the writes are not landing.
    expect(
      seenOrders.size,
      'the ranking never actually changed — the churn is not churning'
    ).toBeGreaterThanOrEqual(FIELD);
    expect(records.length, 'nothing was written at all — the list is frozen').toBeGreaterThan(0);

    const structural = records.filter((r) => r.type === 'childList');
    const textual = records.filter((r) => r.type === 'characterData');
    const attrs = records.filter((r) => r.type === 'attributes');

    expect(
      structural.map((r) => r.target.className),
      'a node was inserted, removed or reordered — the list is re-sorting itself'
    ).toEqual([]);
    expect(
      textual.map((r) => r.oldValue),
      'text was rewritten during a rank change — the place has moved back onto the card'
    ).toEqual([]);
    // Everything that WAS written: `style`, on a card, and nowhere else.
    expect([...new Set(attrs.map((r) => r.attributeName))]).toEqual(['style']);
    expect([...new Set(attrs.map((r) => r.target.className.replace(/ .*/, '')))]).toEqual([
      'scoreboard-card',
    ]);
  });

  it('the SLOT layer is drawn once and never touched again', () => {
    const rows = mount();
    const layer = rows.querySelector('.scoreboard-slot-layer');
    expect(layer, 'the slot layer is gone — the places are back on the cards').toBeTruthy();
    const before = layer.innerHTML;

    const obs = new MutationObserver(() => {});
    obs.observe(layer, { childList: true, characterData: true, attributes: true, subtree: true });
    for (let step = 1; step <= 20; step++) act(() => positions.applyRanks(rankingsFor(step)));
    const records = drain(obs);
    obs.disconnect();

    expect(
      records.map((r) => `${r.type}:${r.target.className ?? r.target.nodeName}`),
      'the place column was written during a race — it is meant to be static for the whole race'
    ).toEqual([]);
    expect(layer.innerHTML).toBe(before);
  });

  it('the CARDS say the same thing before and after — their text is racer-bound, not place-bound', () => {
    const rows = mount();
    const textOf = () => [...rows.querySelectorAll('.scoreboard-card')].map((el) => el.textContent);
    const before = textOf();
    for (let step = 1; step <= 20; step++) act(() => positions.applyRanks(rankingsFor(step)));
    expect(
      textOf(),
      'a card said something different after an overtake — nothing on a card may be derived from its place'
    ).toEqual(before);
    // And it is not vacuously true because the cards are empty.
    expect(before.every((t) => t.length > 0)).toBe(true);
  });

  it('the colour of a place is written on the CARD, and only when the top three change hands', () => {
    const rows = mount();
    // The gold / silver / bronze belong to the PLACE. Whoever stands in slot 1 is gold.
    const cardAt = (rank) =>
      [...rows.querySelectorAll('.scoreboard-card')].find(
        (el) =>
          Number(/translateY\(([-\d.]+)px\)/.exec(el.style.transform)?.[1]) === slotOffsetPx(rank)
      );
    for (let step = 1; step <= 5; step++) {
      act(() => positions.applyRanks(rankingsFor(step)));
      for (let rank = 1; rank <= 3; rank++) {
        expect(cardAt(rank).style.color, `slot ${rank} lost its medal colour`).toBe(
          rgb(RANK_PALETTE[rank - 1])
        );
      }
    }
    // AND THE WRITE IS RARE, stated as the PROPERTY rather than as a ratio: a move that stays below
    // the podium writes no colour at all. The ratio a real race produces is not this file's
    // question — `scripts/scoreboard-parity.test.mjs` measures it over a real one, and a second
    // number here would be a second home for it.
    const p = createScoreboardPositions();
    const el = { style: {} };
    p.attach(0, el);
    p.applyRanks(new Map([[0, 9]]));
    // 9 -> 17 -> 12: three different places, none of them a medal, so one colour write in total.
    expect(p.applyRanks(new Map([[0, 17]])).recoloured, 'a move below the podium repainted').toBe(
      0
    );
    expect(p.applyRanks(new Map([[0, 12]])).recoloured, 'a move below the podium repainted').toBe(
      0
    );
    // Crossing the boundary is what writes one, in both directions.
    expect(p.applyRanks(new Map([[0, 3]])).recoloured, 'entering the podium did not recolour').toBe(
      1
    );
    expect(p.applyRanks(new Map([[0, 20]])).recoloured, 'leaving the podium did not recolour').toBe(
      1
    );
  });

  it('SABOTAGE — a text change during the churn IS seen, so the zero is not vacuous', () => {
    // A guard that cannot fail is not a guard. This drives the same instrument over the same subtree
    // and writes exactly what the rule forbids: one character of text inside a card.
    const rows = mount();
    const obs = new MutationObserver(() => {});
    obs.observe(rows, { childList: true, characterData: true, attributes: true, subtree: true });
    act(() => positions.applyRanks(rankingsFor(1)));
    // The NAME's own text node — the card's last child inside `.sb-name`, after the race number.
    rows.querySelector('.scoreboard-card .sb-name').lastChild.textContent = '2';
    const records = drain(obs);
    obs.disconnect();
    expect(records.some((r) => r.type === 'characterData')).toBe(true);
  });

  it('the pitch the cards are placed on is the one both layers use', () => {
    // One truth: the slot layer positions itself with `slotOffsetPx` and the positioner with
    // ROW_PITCH_PX. If those two ever stop agreeing, the badges and the names come apart on screen
    // and nothing else here would notice — jsdom does no layout.
    for (let rank = 1; rank <= FIELD; rank++) {
      expect(slotOffsetPx(rank)).toBe((rank - 1) * ROW_PITCH_PX);
    }
  });
});
