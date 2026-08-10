// ============================================================
// File:        scoreboardPositions.js
// Path:        client/src/screens/RaceScreen/scoreboardPositions.js
// Project:     RaceArena — SCOREBOARD-SLOT-LAYER
//
// WHERE EACH RACER'S CARD IS, AND NOTHING ELSE.
//
// THE OWNER'S DESIGN, which is what this file implements: "if I have a list where the place is
// always at the front, I only need to draw that list ONCE — from then on I only need to move the
// racer's name onto the row where he belongs." The places are a STATIC layer (ScoreboardSlots); the
// racers are CARDS whose content never changes during a race. A rank change is then a `translateY`
// and nothing else — no text is rewritten anywhere, in either layer.
//
// ── WHY THIS IS DELIBERATELY NOT REACT STATE ────────────────────────────────────────────────────
//
// It was, until this block, and that is what it cost: the rank travelled as a prop, so every racer
// whose place moved re-rendered its row — a hundred of them in the packed early phase, four times a
// second — and the owner's own measurement is the case for changing it. At that phase, slowing the
// cadence from 250 ms to 1000 ms moved his total p50 from 33.2 ms to 16.7 and `rafLate` p50 from 6.5
// to 1.1. The list's own update was costing him half his frames.
//
// A card whose props never change is a card React never re-renders. So the rank stops being a prop:
// the ranking is applied here, by writing ONE `transform` on each card that moved. React owns what
// the card SAYS; this owns where it IS.
//
// ── THE TRAP THIS SHAPE CREATES, and how it is held ─────────────────────────────────────────────
//
// The failure is silent by construction: if nothing ever calls `applyRanks`, every card sits at
// translateY(0), or — worse — keeps the last ranking it was given while the race runs on. Nothing
// throws and a screenshot of the first frame looks correct. `scoreboardPositions.test.js` asserts
// the positive direction (a changed rank MOVES the card) and the negative one (an unchanged rank
// writes nothing), and `scripts/scoreboard-parity.test.mjs` drives a real race through this module
// and compares the resulting y of every card against the list the old code would have drawn.
//
// ── WHY A NODE REGISTRY AND NOT A REF ARRAY ─────────────────────────────────────────────────────
//
// Cards attach in racer order and never move in the document, but they attach at a moment React
// chooses. `attach` therefore positions the node IMMEDIATELY from the ranking the registry is
// already holding, so a card that mounts after a tick is not left at the top of the list until the
// next one. That is why the ranking is stored here rather than passed straight through.
// ============================================================

import { ROW_PITCH_PX, cardTextColor } from './scoreboardLayout.js';

/**
 * @typedef {object} ScoreboardPositions
 * @property {(index:number, el:HTMLElement|null)=>void} attach  ref callback for one card
 * @property {(ranks:Map<number,number>)=>{moved:number,recoloured:number}} applyRanks
 * @property {Map<number,number>} ranks  the ranking currently held (read-only; for tests)
 */

/**
 * Create the positioner for one race.
 *
 * @returns {ScoreboardPositions}
 */
export function createScoreboardPositions() {
  /** @type {Map<number, HTMLElement>} racer index → its card element */
  const nodes = new Map();
  /** @type {Map<number, number>} racer index → the place it is currently standing in */
  const ranks = new Map();
  /** @type {Map<number, number>} racer index → the place last WRITTEN to its node */
  const written = new Map();

  /**
   * Write one card's place onto its element.
   *
   * TWO PROPERTIES, and both are place-bound rather than racer-bound:
   *   `transform` — the whole ranking, every tick, for every card that moved;
   *   `color`     — gold / silver / bronze, and it changes ONLY when a card enters or leaves the top
   *                 three. It is set on the CARD, not on the name, so one write covers the name and
   *                 the race number (which inherits it, exactly as it did when both sat inside one
   *                 row). The finish time keeps its own colour and is untouched.
   *
   * WHETHER THE COLOUR NEEDS WRITING IS DECIDED FROM THE PLACES, NEVER BY READING THE ELEMENT BACK.
   * That is not a preference: `el.style.color = '#ddd'` reads back as `rgb(221, 221, 221)`, so a
   * comparison against what we are about to write is ALWAYS unequal and every move would repaint the
   * card — the exact cost this block exists to remove, reintroduced by a line that looks like a
   * guard. It was written that way first and `scoreboardPositions.test.js` caught it, which is why
   * that test runs in jsdom rather than against a stub `{ style: {} }`.
   *
   * @param {number|undefined} prevRank  the place last written to this element, if any
   * @returns {boolean} whether the colour was written
   */
  function write(el, rank, prevRank) {
    el.style.transform = `translateY(${(rank - 1) * ROW_PITCH_PX}px)`;
    const color = cardTextColor(rank);
    if (prevRank != null && cardTextColor(prevRank) === color) return false;
    el.style.color = color;
    return true;
  }

  return {
    ranks,

    attach(index, el) {
      if (el) {
        nodes.set(index, el);
        // Position it NOW from what we already know, rather than leaving it at the top of the list
        // until the next cadence tick. `written` is not consulted: this is a fresh element.
        const rank = ranks.get(index);
        if (rank != null) {
          write(el, rank, undefined); // a fresh element carries nothing: write both properties
          written.set(index, rank);
        }
      } else {
        nodes.delete(index);
        written.delete(index);
      }
    },

    /**
     * Move every card whose place changed. Called once per cadence tick.
     *
     * @param {Map<number, number>} next  racer index → 1-based place
     * @returns {{moved:number, recoloured:number}} how much was actually written — the numbers the
     *   tests assert on, because "it did nothing" and "it did the right thing" look identical from
     *   the outside otherwise.
     */
    applyRanks(next) {
      let moved = 0;
      let recoloured = 0;
      for (const [index, rank] of next) {
        ranks.set(index, rank);
        const prev = written.get(index);
        if (prev === rank) continue;
        written.set(index, rank);
        const el = nodes.get(index);
        if (!el) continue;
        moved++;
        if (write(el, rank, prev)) recoloured++;
      }
      return { moved, recoloured };
    },
  };
}
