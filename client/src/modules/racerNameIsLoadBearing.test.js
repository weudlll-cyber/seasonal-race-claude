// ============================================================
// File:        racerNameIsLoadBearing.test.js
// Path:        client/src/modules/racerNameIsLoadBearing.test.js
// Project:     RaceArena
//
// SIM-NAMES-1 — A RACER'S NAME IS NOT A LABEL. IT IS PHYSICS.
//
// `raceBehavior.js` breaks symmetry between two racers that are neck-and-neck in the same lane by
// hashing their identities (`stablePairBit` → `pairTieDir`), and the identity it hashes is
// `r.name ?? r.id ?? r.index`. So renaming a racer changes which way it dodges, and that propagates:
// measured over 24 races (3 tracks × 8 seeds, everything else identical), the owner's roster names
// versus the simulator's `r{i}` names changed the finishing ORDER in 24/24 and the WINNER in 14/24.
//
// This file exists so nobody has to find that out again by accident. If you are here because one of
// these tests went red, read it as: **you changed what a racer is called, and that changed the race.**
//   • Giving a headless harness the browser's names is not a cosmetic fix — it re-rolls every result
//     that harness has ever produced.
//   • Making the name cosmetic (hashing a stable id instead) is a real, deliberate engine change with
//     a fingerprint and the full ship ceremony behind it — not a tidy-up.
// Either way the answer is a decision, not an edit. See reports/evolution/SIM-NAMES-1.md.
// ============================================================

import { describe, it, expect } from 'vitest';
import { initRacerBehavior, applyRacerBehavior } from './raceBehavior.js';
import { DEFAULT_RACE_BEHAVIOR_CONFIG } from './storage/defaults.js';

// Two racers, same lane, overlapping — the near-coincident tie the symmetry break exists for.
// Everything except the pair's identities is held fixed.
function makePair(nameA, nameB) {
  const base = (index, t, name) => {
    const r = {
      index,
      t,
      x: 640 + index,
      y: 360,
      angle: 0,
      finished: false,
      frameSizePx: 40,
      trackWidthPx: 140,
      pathLengthPx: 1200,
      drawnBodyWidthPx: 28,
      drawnBodyLengthPx: 31,
    };
    initRacerBehavior(r);
    r.physicalY = 0; // dead centreline tie: |rel| = 0, so the tie-break decides the side
    if (name !== undefined) r.name = name;
    return r;
  };
  return [base(0, 0.5, nameA), base(1, 0.502, nameB)];
}

// Run the lateral model a few frames and report which side each racer committed to.
function sidesAfter(nameA, nameB, frames = 12) {
  const racers = makePair(nameA, nameB);
  const cfg = { ...DEFAULT_RACE_BEHAVIOR_CONFIG, isOpen: false };
  for (let f = 0; f < frames; f++) applyRacerBehavior(racers, cfg, { currentTs: f * 16 });
  return racers.map((r) => Math.sign(+r.physicalY.toFixed(9)));
}

describe('a racer name reaches the avoidance physics (SIM-NAMES-1)', () => {
  it('the same pair, renamed, does not always dodge the same way', () => {
    // Several name pairs against one baseline. The claim is NOT "every rename flips it" — the hash
    // gives one bit, so about half of any set collides with the baseline. The claim is that the
    // outcome is a function of the names at all, which one differing pair proves.
    const baseline = sidesAfter('Bolt', 'Arrow');
    const others = [
      sidesAfter('r0', 'r1'),
      sidesAfter('R1', 'R2'),
      sidesAfter('Storm', 'Zephyr'),
      sidesAfter('Turbo', 'Blaze'),
      sidesAfter('James', 'Olivia'),
    ];
    expect(others.some((s) => s.join() !== baseline.join())).toBe(true);
  });

  it('is deterministic for one set of names — the coupling is a hash, not noise', () => {
    expect(sidesAfter('Bolt', 'Arrow')).toEqual(sidesAfter('Bolt', 'Arrow'));
    expect(sidesAfter('r0', 'r1')).toEqual(sidesAfter('r0', 'r1'));
  });

  it('the two members of a tied pair commit to OPPOSITE sides, whatever they are called', () => {
    // This is the property the symmetry break is FOR, and it must survive any renaming.
    for (const [a, b] of [
      ['Bolt', 'Arrow'],
      ['r0', 'r1'],
      ['James', 'Olivia'],
    ]) {
      const [sa, sb] = sidesAfter(a, b);
      expect(sa).not.toBe(0);
      expect(sa).toBe(-sb);
    }
  });

  it('falls back name → id → index, so an unnamed roster is its own third naming scheme', () => {
    // `runRaceHeadless` sets no name at all, so it races the index strings "0","1" — a roster that
    // is neither the browser's nor the simulator's `r{i}`. Three schemes, three races.
    const named = sidesAfter('r0', 'r1');
    const unnamed = sidesAfter(undefined, undefined); // → String(index)
    expect(named).toHaveLength(2);
    expect(unnamed).toHaveLength(2);
    // Both are valid, opposite-side outcomes; the point is that they are separately determined.
    expect(unnamed[0]).toBe(-unnamed[1]);
  });
});
