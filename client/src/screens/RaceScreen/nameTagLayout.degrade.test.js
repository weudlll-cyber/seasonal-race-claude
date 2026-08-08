// ============================================================
// File:        nameTagLayout.degrade.test.js
// Path:        client/src/screens/RaceScreen/nameTagLayout.degrade.test.js
// Project:     RaceArena — LABEL-DEGRADE-1
//
// WHAT THIS GUARDS: the label showing a NAME when the name fits and a NUMBER when it does not, and
// the two risks the owner named about it — FLICKER (a label that flips between the forms) and
// CASCADE (widening one label displaces a neighbour, which frees room, which lets the first widen
// again).
//
// FLICKER IS TESTED AS HYSTERESIS, NOT AS A RATE. A rate is a measurement and it belongs in
// `scripts/label-degrade-truth.mjs`, which drives real races and reports switches per label per
// race. What a test can pin is the PROPERTY the rate depends on: that gaining a name and keeping a
// name are governed by different thresholds. If that asymmetry is ever removed the rate goes up and
// no unit test would notice — so it is asserted directly.
//
// The layout is pure and takes its text measurement as a function, so these drive the real decision
// path with a ruler instead of a canvas — the same call `renderRaceFrame` makes.
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeTagLayout } from './nameTagLayout.js';

const CW = 1280;
const CH = 720;
const FONT = 16;

/** One screen px per character per font px/2 — a ruler, so a name is predictably wider. */
const measureText = (txt) => String(txt ?? '').length * FONT * 0.5;

/** Racers at chosen SCREEN positions, with effX/effY = 1 and no offset, so world px are screen px. */
const at = (positions) =>
  positions.map(([x, y], i) => ({
    index: i,
    x,
    y,
    t: (positions.length - i) / positions.length, // earlier entries lead
    name: `Racer${String(i).padStart(2, '0')}`, // 7 chars — 56 px + padding
    raceNumber: i + 1,
  }));

const layout = (racers, opts = {}) =>
  computeTagLayout({
    racers,
    effX: 1,
    effY: 1,
    offsetX: 0,
    offsetY: 0,
    canvasW: CW,
    canvasH: CH,
    fontPx: FONT,
    racerScreenH: 20,
    labelMarginPx: 4,
    measureText,
    labelOf: (r) => String(r.raceNumber),
    wideLabelOf: (r) => r.name,
    ...opts,
  });

describe('the label shows the NAME when it fits and the NUMBER when it does not', () => {
  // WHAT BREAKS IF DELETED: the feature. Nothing else asserts that a name is ever chosen.
  // WHAT GOES UNNOTICED: a wired-up toggle that never actually widens anything — which would look
  // exactly like "the names never fit" and would be indistinguishable from a working feature that
  // is simply conservative.
  it('a lone racer with room gets its NAME', () => {
    const out = layout(at([[640, 360]]));
    expect(out.shown.has(0)).toBe(true);
    expect(out.wide.has(0)).toBe(true);
  });

  // WHAT BREAKS IF DELETED: the other half. A rule that always widens is not "when there is room".
  // WHAT GOES UNNOTICED: names overlapping each other — the exact thing RACE-NUMBERS-1 replaced.
  it('two racers too close for two names fall back — the second keeps its NUMBER', () => {
    // 40 px apart: two 7-character names (~64 px boxes) cannot both fit, two numbers can.
    const out = layout(
      at([
        [600, 360],
        [640, 360],
      ])
    );
    expect(out.shown.size).toBe(2); // both still labelled
    expect(out.wide.size).toBe(1); // but only one got a name
    expect(out.wide.has(0)).toBe(true); // and it is the higher-priority one
  });

  // WHAT BREAKS IF DELETED: the toggle's meaning. `wideLabelOf: null` must reproduce the old
  // behaviour byte-for-byte, or "off" is a second code path rather than the absence of a feature.
  // WHAT GOES UNNOTICED: the OFF state drifting from what shipped, which would make the owner's
  // A/B comparison meaningless.
  it('with no wide form on offer, the layout is exactly what it was', () => {
    const racers = at([
      [600, 360],
      [640, 360],
      [700, 360],
    ]);
    const off = layout(racers, { wideLabelOf: null });
    expect(off.wide.size).toBe(0);
    // …and the same racers are labelled as when names are available but do not fit.
    expect([...off.shown].sort()).toEqual([0, 1, 2]);
  });

  it('a racer with no name never gets a wide form', () => {
    const racers = at([[640, 360]]);
    delete racers[0].name;
    const out = layout(racers);
    expect(out.shown.has(0)).toBe(true);
    expect(out.wide.has(0)).toBe(false);
  });

  it('a name NARROWER than the number is not treated as a widening', () => {
    // The wide form is only a candidate when it is genuinely wider; otherwise the two boxes are
    // the same decision and the feature would be claiming credit for nothing.
    const racers = at([[640, 360]]);
    racers[0].name = 'A';
    racers[0].raceNumber = 100;
    const out = layout(racers);
    expect(out.wide.has(0)).toBe(false);
  });
});

describe('FLICKER — the switch is governed by the same asymmetry as the label itself', () => {
  // WHAT BREAKS IF DELETED: the owner's stated main risk. Without the asymmetry a label flips form
  // every time a neighbour drifts a pixel, and the measurement script would be the only thing that
  // could tell — after the fact, on a branch nobody re-measures.
  // WHAT GOES UNNOTICED: a rule that reads as correct and looks like a strobe on the track.
  it('a name already shown SURVIVES an intrusion that would have prevented it', () => {
    // Two racers close enough that the second name intrudes on the first.
    const racers = at([
      [600, 360],
      [656, 360],
    ]);

    // Cold: the newcomer must be COMPLETELY clear, so only the leader gets a name.
    const cold = layout(racers);
    expect(cold.wide.has(0)).toBe(true);

    // With BOTH holding tenure, the incumbent's budget lets a decisive-but-small intrusion pass,
    // so the second one keeps its name where it could never have gained it.
    const warm = layout(racers, {
      incumbents: new Set([0, 1]),
      wideIncumbents: new Set([0, 1]),
      yieldOverlapFrac: 0.9, // a generous budget makes the asymmetry unambiguous in the assertion
    });
    expect(warm.wide.has(1)).toBe(true);
    // …and the cold run did NOT give it one, which is what makes this a statement about tenure.
    expect(cold.wide.has(1)).toBe(false);
  });

  // WHAT BREAKS IF DELETED: the separation of the two tenures. A racer can hold its LABEL while
  // losing the room for its NAME, and conflating them would let label tenure buy name tenure.
  // WHAT GOES UNNOTICED: a name that persists because its number was on screen, which is a
  // different claim on a different box.
  it('label tenure alone does NOT buy name tenure', () => {
    const racers = at([
      [600, 360],
      [656, 360],
    ]);
    const out = layout(racers, {
      incumbents: new Set([0, 1]), // both held their LABEL
      wideIncumbents: null, // …but neither held a NAME
      yieldOverlapFrac: 0.9,
    });
    expect(out.wide.has(1)).toBe(false);
  });
});

describe('CASCADE — one decision per label per cycle, in a fixed order', () => {
  // WHAT BREAKS IF DELETED: the owner's second risk. A pass that revisited a label after a
  // neighbour changed width could oscillate within a single frame, and the output would be
  // order-dependent in a way no measurement would attribute correctly.
  // WHAT GOES UNNOTICED: an unstable layout that looks like flicker but is caused inside one frame,
  // so slowing the cadence would not fix it.
  it('the result is a function of the input, not of how many times it is computed', () => {
    const racers = at([
      [400, 360],
      [456, 360],
      [512, 360],
      [568, 360],
      [624, 360],
    ]);
    const a = layout(racers);
    const b = layout(racers);
    expect([...a.wide].sort()).toEqual([...b.wide].sort());
    expect([...a.shown].sort()).toEqual([...b.shown].sort());
  });

  // WHAT BREAKS IF DELETED: the ORDER. It is the existing priority — incumbents first, then race
  // position — and it is what makes the pass a single sweep rather than a negotiation.
  // WHAT GOES UNNOTICED: a reordering that quietly hands names to the back of the field.
  it('the fixed order is priority order: the leader gets the contested name', () => {
    // index 0 has the highest t (see `at`), so it is first and takes the contested pixels.
    const out = layout(
      at([
        [600, 360],
        [640, 360],
      ])
    );
    expect(out.wide.has(0)).toBe(true);
    expect(out.wide.has(1)).toBe(false);
  });

  it('a widened label displaces its neighbour, and the neighbour does NOT re-widen', () => {
    // Three in a row, 40 px apart, names ~64 px wide. This is the cascade the owner named, and the
    // single sweep is what resolves it:
    //   0 takes its name (highest priority, free pixels)
    //   1 cannot fit a name beside 0's, so it falls back to its NUMBER — a much narrower box
    //   2 now has room, BECAUSE 1 went narrow, and takes its name
    // The point of the test is what does NOT happen next: 1 is never reconsidered. A pass that
    // revisited it would see the room 2 left and could widen it again, displacing 2, and the frame
    // would have no fixed point.
    const racers = at([
      [600, 360],
      [640, 360],
      [680, 360],
    ]);
    const out = layout(racers);
    expect([...out.wide].sort()).toEqual([0, 2]);
    expect(out.shown.size).toBe(3); // and all three are still labelled
    // Re-running the identical input reproduces the identical assignment — one decision each.
    expect([...layout(racers).wide].sort()).toEqual([0, 2]);
  });
});

describe('the start formation is untouched by any of this', () => {
  // WHAT BREAKS IF DELETED: the roll call. `showAll` bypasses decluttering entirely, and the wide
  // decision lives inside the decluttering — so the formation must be unaffected either way.
  // WHAT GOES UNNOTICED: the runners' board and the on-track roll call disagreeing about what a
  // label is, during the one moment the owner asked for every name.
  it('showAll labels everyone and chooses no wide form', () => {
    const out = layout(
      at([
        [600, 360],
        [610, 360],
        [620, 360],
      ]),
      { showAll: true }
    );
    expect(out.shown.size).toBe(3);
    expect(out.wide.size).toBe(0);
  });
});
