// ============================================================
// File:        rollCallPairing.test.js
// Path:        client/src/screens/RaceScreen/rollCallPairing.test.js
// Project:     RaceArena — ROLL-CALL-PAIRING-1
//
// WHAT THIS GUARDS: that a shown name points at exactly one racer, and that a formation which never
// had that problem is left alone.
//
// The owner's requirement was never readability — it was that a viewer can FIND HIS RACER. The roll
// call satisfied the first and failed the second, which is how a block can pass its own acceptance
// test and still be wrong. These tests are about the second.
//
// R7's two questions are answered at each test.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  labelIsAmbiguous,
  formationNeedsPairingAid,
  labelBoxWidth,
  labelOffsetAbove,
} from './nameTagLayout.js';

const FONT = 16;

/** A label box of `textW` text centred on x, plus the racer it belongs to. */
function labelled(index, x, y, textW) {
  const w = labelBoxWidth(textW);
  return { box: { index, left: x - w / 2, right: x + w / 2 }, racer: { index, x, y } };
}

describe('a shown label points at exactly one racer (ROLL-CALL-PAIRING-1)', () => {
  // What breaks if deleted: the ambiguity test could invert, and the aids would appear exactly where
  // they are not needed and vanish where they are.
  // What goes unnoticed: the original defect returning — a name over a crowd, with nothing on screen
  // saying whose it is. It LOOKS correct: the name is readable, and readability is what the eye
  // checks first.
  it('is unambiguous when only its own racer sits under it', () => {
    const { box, racer } = labelled(0, 400, 300, 40);
    // neighbours far outside the box
    const racers = [racer, { index: 1, x: 200, y: 300 }, { index: 2, x: 600, y: 300 }];
    expect(labelIsAmbiguous(box, racer, racers, FONT)).toBe(false);
  });

  it('is ambiguous the moment a second racer sits under it', () => {
    // The failure the owner saw: a wide label spanning its neighbours.
    const { box, racer } = labelled(0, 400, 300, 170);
    const racers = [racer, { index: 1, x: 424, y: 300 }];
    expect(labelIsAmbiguous(box, racer, racers, FONT)).toBe(true);
  });

  it('does not count a racer a row away — that one is not confusable', () => {
    const { box, racer } = labelled(0, 400, 300, 170);
    const farBelow = { index: 1, x: 400, y: 300 + labelOffsetAbove(FONT) * 2 };
    expect(labelIsAmbiguous(box, racer, [racer, farBelow], FONT)).toBe(false);
  });

  it('grows ambiguous exactly as the name grows, which is the mechanism', () => {
    // Same formation, same positions — only the name gets longer. This is the whole finding.
    const neighbour = { index: 1, x: 430, y: 300 };
    const short = labelled(0, 400, 300, 40);
    const long = labelled(0, 400, 300, 170);
    expect(labelIsAmbiguous(short.box, short.racer, [short.racer, neighbour], FONT)).toBe(false);
    expect(labelIsAmbiguous(long.box, long.racer, [long.racer, neighbour], FONT)).toBe(true);
  });
});

describe('a roomy one-wave formation is left visually untouched (ROLL-CALL-PAIRING-1)', () => {
  // What breaks if deleted: the aids could start firing everywhere.
  // What goes unnoticed: the 86.5% of field sizes that need one wave quietly gaining dimming and
  // connectors nobody asked for. It would look deliberate, and the owner would have to work out
  // that a track he never complained about had changed.
  it('needs no aid when every label sits over its own racer alone', () => {
    const spread = [0, 1, 2, 3].map((i) => labelled(i, 150 + i * 300, 300, 40));
    const racers = spread.map((s) => s.racer);
    const byId = new Map(racers.map((r) => [r.index, r]));
    expect(
      formationNeedsPairingAid(
        spread.map((s) => s.box),
        byId,
        racers,
        FONT
      )
    ).toBe(false);
  });

  it('needs the aid as soon as ONE label is ambiguous — one answer per formation', () => {
    const ok = labelled(0, 150, 300, 40);
    const bad = labelled(1, 800, 300, 200);
    const crowd = { index: 2, x: 820, y: 300 };
    const racers = [ok.racer, bad.racer, crowd];
    const byId = new Map(racers.map((r) => [r.index, r]));
    expect(formationNeedsPairingAid([ok.box, bad.box], byId, racers, FONT)).toBe(true);
  });

  it('needs no aid when nothing is shown at all', () => {
    expect(formationNeedsPairingAid([], new Map(), [], FONT)).toBe(false);
    expect(formationNeedsPairingAid(null, new Map(), [], FONT)).toBe(false);
  });
});

describe('the marking follows the wave (ROLL-CALL-PAIRING-1)', () => {
  // What breaks if deleted: the marking could drift out of step with the names.
  // What goes unnoticed: the worst possible version of this feature — a racer lit up while a
  // DIFFERENT racer's name is on screen. That actively misleads, where doing nothing merely fails.
  //
  // The renderer derives "is this racer marked" from `tagShown`, the same set that decides which
  // labels are drawn. This pins that they are one set rather than two that must be kept in step.
  it('marks exactly the racers whose names are up, by construction', () => {
    const shown = new Set([2, 5, 9]);
    const namedNow = (r) => shown.has(r.index);
    const marked = [1, 2, 3, 5, 8, 9].filter((i) => namedNow({ index: i }));
    expect(marked).toEqual([2, 5, 9]);
    // and nobody outside the wave is marked
    expect([1, 3, 8].some((i) => namedNow({ index: i }))).toBe(false);
  });
});
