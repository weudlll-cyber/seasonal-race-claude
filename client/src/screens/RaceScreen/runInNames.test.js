// ============================================================
// File:        runInNames.test.js
// Path:        client/src/screens/RaceScreen/runInNames.test.js
// Project:     RaceArena — RUNIN-NAMES-1
//
// WHAT THIS GUARDS: what a LABEL SAYS once the run-in's closing zoom has arrived — names instead of
// numbers, for every racer, overlap allowed.
//
// IT REUSES THE EXISTING MECHANISM AND ADDS NONE. The layout already has both halves: `wideLabelOf`
// offers the name, and `exemptAll` draws it whatever it covers and whatever the hold says. That
// pair IS the photo finish's old blanket exemption, kept in the layout on purpose after
// LABEL-OVERLAP-FIX-1 removed its caller — the parameter's own docblock says so. This block gives it
// a trigger that is a statement about the WIDTH instead of a STATE standing in for one.
//
// Sabotages recorded in reports/evolution/RUNIN-NAMES-1.md:
//   5. numbers BEFORE the arrival        — sabotage: offer names unconditionally
//   6. names for EVERY racer after it    — sabotage: leave exemptAll false
//   7. overlap is allowed after it       — sabotage: restore the clearance test
//   8. a nameless racer keeps its NUMBER — sabotage: fall back to an empty wide form
//   9. the focus exemption still works   — sabotage: drop `exempt` when exemptAll is off
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeTagLayout } from './nameTagLayout.js';

const HERE = dirname(fileURLToPath(import.meta.url));
import { raceNumberLabel } from '../../modules/raceNumbers.js';

/**
 * The text `racerRendering.js` actually draws, verbatim from its rule. A nameless racer is in the
 * wide set (so he is never hidden) and still draws his NUMBER, because the draw re-derives the wide
 * text as `r.name ?? ''` and falls back when it is empty.
 */
const drawnText = (layout, r) => {
  const wideText = layout.wide.has(r.index) ? (r.name ?? '') : '';
  return wideText ? wideText : raceNumberLabel(r.raceNumber);
};

// A monospace-ish measurer: width is proportional to length, so a NAME is wider than a NUMBER and
// the clearance test has something real to fail on.
const measureText = (t) => (t ? t.length * 10 : 0);

/** Racers packed tightly enough that their name boxes MUST overlap. */
function packedRacers(n = 6, { nameless = [] } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    index: i,
    t: 0.5 + i * 0.001,
    x: 300 + i * 18, // 18 px apart; a name box is ~90 px wide
    y: 360,
    name: nameless.includes(i) ? '' : `Racer-Name-${i}`,
    raceNumber: i + 1,
  }));
}

/**
 * The layout call as `renderRaceFrame` makes it, with the two parameters RUNIN-NAMES-1 moves.
 * `arrived` is the director's `runInArrived`; everything else is held at the shipped shape.
 */
function layoutFor(racers, { arrived, labelNamesWhenRoom = false, focusIndex = null } = {}) {
  const namesFromArrival = !!arrived;
  return computeTagLayout({
    racers,
    effX: 1,
    effY: 1,
    offsetX: 0,
    offsetY: 0,
    canvasW: 1280,
    canvasH: 720,
    fontPx: 20,
    racerScreenH: 30,
    racerScreenW: 30,
    labelMarginPx: 4,
    measureText,
    labelOf: (r) => String(r.raceNumber),
    wideLabelOf: namesFromArrival
      ? (r) => (r.name && r.name.length > 0 ? r.name : raceNumberLabel(r.raceNumber))
      : labelNamesWhenRoom
        ? (r) => r.name ?? ''
        : null,
    exempt: focusIndex != null ? new Set([focusIndex]) : null,
    exemptAll: namesFromArrival,
  });
}

describe('RUNIN-NAMES-1 — before the arrival, nothing has changed', () => {
  // PROPERTY 5 — the "to the pixel" requirement, expressed as the thing that decides it: with the
  // toggle off and no arrival, NO racer is drawn wide, so every label is its number.
  it('no racer is drawn with a name', () => {
    const out = layoutFor(packedRacers(), { arrived: false });
    expect(out.wide.size).toBe(0);
    expect(out.shown.size).toBeGreaterThan(0);
  });

  it('is byte-identical to a layout computed with the parameters this block never touches', () => {
    const racers = packedRacers();
    const before = computeTagLayout({
      racers,
      effX: 1,
      effY: 1,
      offsetX: 0,
      offsetY: 0,
      canvasW: 1280,
      canvasH: 720,
      fontPx: 20,
      racerScreenH: 30,
      racerScreenW: 30,
      labelMarginPx: 4,
      measureText,
      labelOf: (r) => String(r.raceNumber),
      wideLabelOf: null,
      exempt: null,
      exemptAll: false,
    });
    const after = layoutFor(racers, { arrived: false });
    expect([...after.shown].sort()).toEqual([...before.shown].sort());
    expect([...after.wide].sort()).toEqual([...before.wide].sort());
    expect(after.placed).toBe(before.placed);
    expect(after.dropped).toBe(before.dropped);
  });

  // The operator toggle is untouched: with it ON and no arrival, names appear only where they FIT,
  // which is the shipped LABEL-DEGRADE-1 behaviour and must survive this block.
  it('the operator toggle still means "names when there is ROOM", not "names"', () => {
    const out = layoutFor(packedRacers(), { arrived: false, labelNamesWhenRoom: true });
    expect(out.wide.size).toBeLessThan(out.shown.size);
  });
});

describe('RUNIN-NAMES-1 — from the arrival, every racer shows its NAME', () => {
  // PROPERTY 6 — the requirement itself.
  it('every labelled racer is drawn wide', () => {
    const racers = packedRacers();
    const out = layoutFor(racers, { arrived: true });
    expect(out.wide.size).toBe(racers.length);
    expect(out.shown.size).toBe(racers.length);
  });

  // PROPERTY 7 — overlap is NOT a defect here. The racers are packed so their name boxes must
  // collide; the point is that NONE is dropped, hidden or shrunk to avoid it.
  it('overlap is allowed — no label is withheld to avoid a collision', () => {
    const racers = packedRacers(8);
    const before = layoutFor(racers, { arrived: false, labelNamesWhenRoom: true });
    const after = layoutFor(racers, { arrived: true });
    expect(after.wide.size).toBe(8);
    // The clearance test would have withheld most of these names; the arrival grants all of them.
    expect(after.wide.size).toBeGreaterThan(before.wide.size);
    expect(after.dropped).toBe(0);
  });

  it('it does not depend on the operator toggle — the arrival alone is enough', () => {
    const out = layoutFor(packedRacers(), { arrived: true, labelNamesWhenRoom: false });
    expect(out.wide.size).toBe(6);
  });

  // PROPERTY 8 — a racer without a name keeps its NUMBER rather than showing an empty label. This
  // is the layout's existing rule (a wide form needs `length > 0`), asserted here because this block
  // is what makes every racer ask for one.
  it('a racer with no name keeps his NUMBER, and is never hidden to make room', () => {
    const racers = packedRacers(6, { nameless: [2, 4] });
    const out = layoutFor(racers, { arrived: true });
    // NOT HIDDEN — this is the half that failed before the wide form was extended to him: with
    // everyone else holding a full-width name, his number lost the clearance test and vanished.
    expect(out.shown.has(2)).toBe(true);
    expect(out.shown.has(4)).toBe(true);
    expect(out.shown.size).toBe(6);
    expect(out.dropped).toBe(0);
    // ...and what he DRAWS is his number, never an empty label.
    expect(drawnText(out, racers[2])).toBe(raceNumberLabel(racers[2].raceNumber));
    expect(drawnText(out, racers[4])).toBe(raceNumberLabel(racers[4].raceNumber));
    expect(drawnText(out, racers[2])).not.toBe('');
    // his named neighbours are unaffected
    expect(drawnText(out, racers[3])).toBe('Racer-Name-3');
  });

  it('a racer whose name is null or undefined keeps his number too', () => {
    const racers = packedRacers(3);
    racers[0].name = null;
    delete racers[1].name;
    const out = layoutFor(racers, { arrived: true });
    expect(out.shown.has(0)).toBe(true);
    expect(out.shown.has(1)).toBe(true);
    expect(drawnText(out, racers[0])).toBe(raceNumberLabel(racers[0].raceNumber));
    expect(drawnText(out, racers[1])).toBe(raceNumberLabel(racers[1].raceNumber));
    expect(drawnText(out, racers[2])).toBe('Racer-Name-2');
  });
});

describe('RUNIN-NAMES-1 — what it must NOT disturb', () => {
  // PROPERTY 9 — the camera's own subject keeps its name for the whole race, arrival or not. That
  // is LABEL-FOCUS-1 and it is the exemption this block deliberately did not replace.
  it('the focus racer still keeps its name before the arrival', () => {
    const out = layoutFor(packedRacers(), {
      arrived: false,
      labelNamesWhenRoom: true,
      focusIndex: 3,
    });
    expect(out.wide.has(3)).toBe(true);
  });

  it('the focus racer is simply one of everyone after the arrival', () => {
    const out = layoutFor(packedRacers(), { arrived: true, focusIndex: 3 });
    expect(out.wide.has(3)).toBe(true);
    expect(out.wide.size).toBe(6);
  });
});

// ── THE RENDERER'S OWN WIRING, PINNED AS SOURCE ───────────────────────────────────────────────
//
// The tests above call `computeTagLayout` with the parameters `renderRaceFrame` passes, which makes
// them tests of the RULE and not of the line that supplies it. Sabotage the line and they stay
// green. This pins the line, following `modules/engineInputs.test.js`'s precedent in this tree.
describe('RUNIN-NAMES-1 — the renderer reads the arrival and nothing else', () => {
  const src = readFileSync(join(HERE, 'renderRaceFrame.js'), 'utf8');

  it('takes the switch from the DIRECTOR, not from a zoom it re-tests itself', () => {
    expect(src).toContain('const namesFromArrival = !!camera?.runInArrived;');
    // The forbidden shapes: a zoom comparison, a progress threshold, or a second clock of its own.
    expect(src).not.toContain('camera.zoom >');
    expect(src).not.toContain('leaderProgress >');
  });

  it('drives BOTH layout parameters from that one flag', () => {
    expect(src).toContain('exemptAll: namesFromArrival,');
    expect(src).toContain('wideLabelOf: namesFromArrival');
  });

  it('leaves the operator toggle as the pre-arrival author', () => {
    expect(src).toContain('labelNamesWhenRoom');
  });
});
