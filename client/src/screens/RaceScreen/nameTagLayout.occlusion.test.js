// ============================================================
// File:        nameTagLayout.occlusion.test.js
// Path:        client/src/screens/RaceScreen/nameTagLayout.occlusion.test.js
// Project:     RaceArena — LABEL-OCCLUSION-1
//
// WHAT THIS GUARDS: the owner's rule — a label shows the NAME when it covers neither another label
// nor a racer, and the NUMBER otherwise — and the hold that stops it flickering between the two.
//
// IT REPLACES nameTagLayout.degrade.test.js. That file guarded "does the name FIT", and its FLICKER
// group asserted the wide form's own tenure and asymmetric yield — machinery this block deleted. The
// tests here that look familiar (cascade, priority order, the start formation, the degenerate forms)
// are the ones whose subject survived the rule change; they are not copies of assertions about
// something that no longer exists.
//
// THE HOLD IS TESTED WITH A HAND-STEPPED CLOCK, not a real one: `labelFormHold` takes `nowMs` as an
// argument for exactly this reason, so "does it switch at 399 ms" is a question a unit test can ask
// in a microsecond.
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeTagLayout, labelOffsetAbove } from './nameTagLayout.js';
import { createLabelFormHold, advanceLabelForms, LABEL_FORM_HOLD_MS } from './labelFormHold.js';

const CW = 1280;
const CH = 720;
const FONT = 16;
/** The drawn racer box the criterion tests against — square, so the arithmetic in comments is easy. */
const RACER_PX = 20;

/** One screen px per character per font px/2 — a ruler, so a name is predictably wider. */
const measureText = (txt) => String(txt ?? '').length * FONT * 0.5;

/** Racers at chosen SCREEN positions, with effX/effY = 1 and no offset, so world px are screen px. */
const at = (positions) =>
  positions.map(([x, y], i) => ({
    index: i,
    x,
    y,
    t: (positions.length - i) / positions.length, // earlier entries lead
    name: `Racer${String(i).padStart(2, '0')}`, // 7 chars — 56 px + 8 padding = 64 px wide
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
    racerScreenH: RACER_PX,
    racerScreenW: RACER_PX,
    labelMarginPx: 4,
    measureText,
    labelOf: (r) => String(r.raceNumber),
    wideLabelOf: (r) => r.name,
    ...opts,
  });

describe('THE CRITERION — the name only when it covers nothing', () => {
  // The geometry these tests stand on, stated once so a failure is readable:
  //   offsetAbove = RACER_PX/2 + margin = 10 + 4 = 14
  //   box height   = FONT × 1.18 = 18.88
  //   so a label for a racer at (x, y) occupies y-32.88 .. y-14, and x-32 .. x+32 for a 7-char name.
  //   a racer's own drawn box is x-10..x+10, y-10..y+10.
  // A racer placed 25 px ABOVE another therefore sits inside that other's name box.

  // WHAT BREAKS IF DELETED: the whole block. The owner's rule is about racers, and every other test
  // in this file could pass with the racer half of the criterion deleted.
  // WHAT GOES UNNOTICED: a name sitting squarely on another racer — the defect he reported.
  it('a name that would sit on ANOTHER RACER gets the number instead', () => {
    const racers = at([
      [400, 400],
      [400, 375], // inside racer 0's name box (367.12 .. 386)
    ]);
    const out = layout(racers);
    expect(out.wideClear.has(0)).toBe(false);
  });

  // WHAT BREAKS IF DELETED: the other half of the same claim. A criterion that refuses every name is
  // trivially free of overlaps and worthless.
  // WHAT GOES UNNOTICED: the feature silently never firing.
  it('the same name gets drawn once that racer is moved away', () => {
    const racers = at([
      [400, 400],
      [900, 375], // same y, far away in x
    ]);
    const out = layout(racers);
    expect(out.wideClear.has(0)).toBe(true);
  });

  // WHAT BREAKS IF DELETED: the label half of the criterion, which is what LABEL-DEGRADE-1 had.
  // WHAT GOES UNNOTICED: two names overlapping each other, which is unreadable rather than merely
  // untidy.
  it('a name that would cover another LABEL gets the number instead', () => {
    // 40 px apart horizontally: two 64 px names cannot both sit there, and neither racer is inside
    // the other's name box vertically.
    const out = layout(
      at([
        [600, 360],
        [640, 360],
      ])
    );
    expect(out.wideClear.has(0)).toBe(true); // the leader is decided first, on free pixels
    expect(out.wideClear.has(1)).toBe(false); // …and takes the pixels the second one wanted
  });

  // WHAT BREAKS IF DELETED: the exclusion that makes the rule usable at all.
  // WHAT GOES UNNOTICED: nothing today — the offset puts the label's bottom edge EXACTLY at its own
  // racer's top edge, so the case is a boundary rather than an overlap. That is precisely why the
  // boundary is pinned: stage 3's below-the-racer slot would make it reachable on its first day.
  it("a label's own racer never counts against it, and the seam is exact", () => {
    expect(labelOffsetAbove(RACER_PX, 0)).toBe(RACER_PX / 2);
    // A lone racer is clear of everything, including itself.
    expect(layout(at([[640, 360]])).wideClear.has(0)).toBe(true);
  });

  // WHAT BREAKS IF DELETED: "any overlap counts". A tolerance would be invisible in every other test
  // here, because they all use overlaps of tens of pixels.
  // WHAT GOES UNNOTICED: a criterion quietly loosened to raise the name share — the exact change the
  // spec says must be reported rather than made.
  it('ANY overlap counts — a one-pixel intrusion is enough', () => {
    // Racer 1's box top is y1-10. Placing it so that top lands 1 px INSIDE racer 0's name bottom
    // (386) means y1 = 395; at y1 = 397 its top is 387 and the boxes only touch at nothing.
    const inside = layout(
      at([
        [400, 400],
        [420, 395],
      ])
    );
    const clearOf = layout(
      at([
        [400, 400],
        [420, 397],
      ])
    );
    expect(inside.wideClear.has(0)).toBe(false);
    expect(clearOf.wideClear.has(0)).toBe(true);
  });

  // WHAT BREAKS IF DELETED: the reservation. Two neighbours would each be judged clear against the
  // other's NARROW box, both promote when their holds expire, and land on top of each other.
  // WHAT GOES UNNOTICED: an overlap that only appears ~400 ms after the geometry that caused it, so
  // nothing in a single frame explains it.
  it('a granted name reserves its FULL width even before the hold has promoted it', () => {
    // Nobody is in the name form yet (wideForms empty), so both labels are DRAWN narrow.
    const out = layout(
      at([
        [600, 360],
        [640, 360],
      ]),
      { wideForms: new Set() }
    );
    expect(out.wide.size).toBe(0); // …drawn narrow, as the hold says
    expect(out.wideClear.has(0)).toBe(true);
    expect(out.wideClear.has(1)).toBe(false); // …but racer 0's name still blocks racer 1's
  });
});

describe('THE HOLD — switch only once the new state is stable', () => {
  // EVERY TIME HERE IS A MULTIPLE OF THE WINDOW, never a literal. The window is a measured number
  // and it has already moved once (400 -> 2000, see labelFormHold.js); a test written in literals
  // would go red on the next measurement and say nothing about the behaviour.
  const H = LABEL_FORM_HOLD_MS;
  const step = (state, clear, nowMs, opts = {}) =>
    advanceLabelForms(state, {
      shown: new Set([0]),
      clear: new Set(clear),
      nowMs,
      holdMs: LABEL_FORM_HOLD_MS,
      ...opts,
    });

  // WHAT BREAKS IF DELETED: the owner's decision about stability. Without it a label changes form on
  // the first frame its neighbour moves, which is a strobe at 60 Hz.
  // WHAT GOES UNNOTICED: flicker, which only shows up in a measurement nobody re-runs.
  it('does not switch inside the window, and does switch after it', () => {
    const state = createLabelFormHold();
    expect(step(state, [0], 0).has(0)).toBe(false); // starts on the NUMBER
    expect(step(state, [0], LABEL_FORM_HOLD_MS - 1).has(0)).toBe(false);
    expect(step(state, [0], LABEL_FORM_HOLD_MS).has(0)).toBe(true);
  });

  // WHAT BREAKS IF DELETED: "continuously". A window that counted total time rather than unbroken
  // time would let a label that is clear every other frame promote anyway.
  // WHAT GOES UNNOTICED: exactly the jostling case the hold exists for.
  it('the window restarts the moment the condition breaks', () => {
    const state = createLabelFormHold();
    step(state, [0], 0);
    step(state, [0], H * 0.75); // three quarters of the window, clear…
    step(state, [], H * 0.8); // …broken by one frame
    const restart = H * 0.9;
    step(state, [0], restart);
    expect(step(state, [0], H).has(0)).toBe(false); // a full window after the START does nothing
    expect(step(state, [0], restart + H - 1).has(0)).toBe(false);
    expect(step(state, [0], restart + H).has(0)).toBe(true); // a full window after the RESTART does
  });

  // WHAT BREAKS IF DELETED: the demote half, which is what keeps a name off a racer that arrives
  // under it.
  // WHAT GOES UNNOTICED: a name that is stuck on once granted.
  it('a name goes back to the number after the window, and not before', () => {
    const state = createLabelFormHold();
    step(state, [0], 0);
    step(state, [0], LABEL_FORM_HOLD_MS); // now WIDE
    // The demote window opens at 401 ms, so it closes at 801 — not at 800.
    expect(step(state, [], LABEL_FORM_HOLD_MS + 1).has(0)).toBe(true);
    expect(step(state, [], LABEL_FORM_HOLD_MS * 2).has(0)).toBe(true);
    expect(step(state, [], LABEL_FORM_HOLD_MS * 2 + 1).has(0)).toBe(false);
  });

  // WHAT BREAKS IF DELETED: the subtle part the block turns on. A label showing the number would
  // never discover that its name fits again, because the number is narrow and almost always clear.
  // WHAT GOES UNNOTICED: the feature working for one second and then never again.
  it('a label on the NUMBER recovers its name once the frame clears', () => {
    const state = createLabelFormHold();
    step(state, [0], 0);
    step(state, [0], H); // wide
    step(state, [], H * 2); // the name stops being clear — the demote window opens
    expect(step(state, [], H * 3).has(0)).toBe(false); // …and closes: back to the number
    // NOW THE POINT: it is still being TESTED while it shows the number, so it can come back.
    step(state, [0], H * 4);
    expect(step(state, [0], H * 5 - 1).has(0)).toBe(false);
    expect(step(state, [0], H * 5).has(0)).toBe(true);
  });

  it('a label that leaves the screen comes back on the NUMBER', () => {
    const state = createLabelFormHold();
    step(state, [0], 0);
    expect(step(state, [0], H).has(0)).toBe(true);
    advanceLabelForms(state, {
      shown: new Set(),
      clear: new Set([0]),
      nowMs: H + 1,
      holdMs: H,
    });
    expect(step(state, [0], H + 2).has(0)).toBe(false);
  });

  it('demoteHoldMs = 0 makes the demote immediate, and does not touch the promote', () => {
    const state = createLabelFormHold();
    step(state, [0], 0, { demoteHoldMs: 0 });
    expect(step(state, [0], H - 1, { demoteHoldMs: 0 }).has(0)).toBe(false); // promote still waits
    expect(step(state, [0], H, { demoteHoldMs: 0 }).has(0)).toBe(true);
    expect(step(state, [], H + 1, { demoteHoldMs: 0 }).has(0)).toBe(false); // the demote does not
  });
});

describe('THE TWO TOGETHER — the layout draws the form the hold settled on', () => {
  it('a clear name is drawn only after the hold has run, and then it is drawn', () => {
    const racers = at([[640, 360]]);
    const state = createLabelFormHold();
    let forms = null;
    let out = null;
    const H = LABEL_FORM_HOLD_MS;
    for (const ts of [0, H * 0.25, H * 0.5, H * 0.75]) {
      out = layout(racers, { wideForms: forms });
      forms = advanceLabelForms(state, {
        shown: out.shown,
        clear: out.wideClear,
        nowMs: ts,
        holdMs: LABEL_FORM_HOLD_MS,
      });
      expect(out.wide.has(0), `drawn wide at ${ts} ms`).toBe(false);
    }
    // …and once the window has passed, the very next frame draws the name.
    forms = advanceLabelForms(state, {
      shown: out.shown,
      clear: out.wideClear,
      nowMs: H,
      holdMs: LABEL_FORM_HOLD_MS,
    });
    expect(layout(racers, { wideForms: forms }).wide.has(0)).toBe(true);
  });

  it('an entitled name that can no longer be placed shows the number rather than nothing', () => {
    // 40 px apart: the two NUMBERS (16 px boxes) clear each other easily, the two NAMES (64 px) do
    // not. Both are entitled, but the pixels are gone for the second one — and it must keep a label
    // rather than lose one, because a crowded racer is when a viewer most wants to know who it is.
    const racers = at([
      [600, 360],
      [640, 360],
    ]);
    const out = layout(racers, { wideForms: new Set([0, 1]) });
    expect(out.wide.has(0)).toBe(true);
    expect(out.wide.has(1)).toBe(false);
    expect(out.shown.has(1)).toBe(true); // …and it did not lose its label
  });

  // WHAT BREAKS IF DELETED: LABEL-OCCLUSION-2 entirely. Nothing else in this file distinguishes
  // "entitled" from "drawn", so the symmetric behaviour would come back silently and the only thing
  // that would notice is the harness — after the fact, on a branch nobody re-measures.
  // WHAT GOES UNNOTICED: a name sitting on a racer for up to two seconds after that racer arrives
  // underneath it. That is the defect the whole feature exists to remove, and it looks like the
  // feature working.
  it('a name that was clear when granted and is covered a frame later is NOT drawn', () => {
    // Frame 1: racer 0 alone, its name clear. It earns the entitlement.
    const alone = at([[400, 400]]);
    const state = createLabelFormHold();
    let forms = null;
    for (const ts of [0, LABEL_FORM_HOLD_MS]) {
      const out = layout(alone, { wideForms: forms });
      forms = advanceLabelForms(state, {
        shown: out.shown,
        clear: out.wideClear,
        nowMs: ts,
        holdMs: LABEL_FORM_HOLD_MS,
      });
    }
    expect(forms.has(0), 'entitled after the window').toBe(true);
    expect(layout(alone, { wideForms: forms }).wide.has(0)).toBe(true);

    // Frame 2, ONE frame later: a racer arrives inside racer 0's name box. The entitlement has not
    // expired and cannot have — a window is 2000 ms and this is 16 ms.
    const covered = at([
      [400, 400],
      [400, 375],
    ]);
    const out = layout(covered, { wideForms: forms });
    expect(out.wideClear.has(0), 'the criterion says it is covered').toBe(false);
    expect(out.wide.has(0), 'and it is NOT drawn as a name').toBe(false);
    expect(out.shown.has(0), 'but it keeps its label, as a number').toBe(true);

    // …and the entitlement itself is still standing, so the name returns the moment it is clear
    // again — without paying the two seconds over.
    expect(forms.has(0)).toBe(true);
    expect(layout(alone, { wideForms: forms }).wide.has(0)).toBe(true);
  });
});

describe('CASCADE — one decision per label per cycle, in a fixed order', () => {
  // WHAT BREAKS IF DELETED: the owner's second risk from LABEL-DEGRADE-1, which the new criterion
  // inherits: granting A's name displaces B, which frees room, which would let A widen again.
  // WHAT GOES UNNOTICED: an unstable layout that looks like flicker but is caused inside one frame,
  // so a longer hold would not fix it.
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
    expect([...a.wideClear].sort()).toEqual([...b.wideClear].sort());
    expect([...a.shown].sort()).toEqual([...b.shown].sort());
  });

  it('the fixed order is priority order: the leader gets the contested name', () => {
    const out = layout(
      at([
        [600, 360],
        [640, 360],
      ])
    );
    expect(out.wideClear.has(0)).toBe(true);
    expect(out.wideClear.has(1)).toBe(false);
  });
});

describe('the degenerate forms, and the start formation', () => {
  it('with no wide form on offer, nothing is ever clear and nothing is ever wide', () => {
    const racers = at([
      [600, 360],
      [640, 360],
      [700, 360],
    ]);
    const off = layout(racers, { wideLabelOf: null });
    expect(off.wide.size).toBe(0);
    expect(off.wideClear.size).toBe(0);
    expect([...off.shown].sort()).toEqual([0, 1, 2]);
  });

  it('a racer with no name never gets a wide form', () => {
    const racers = at([[640, 360]]);
    delete racers[0].name;
    const out = layout(racers, { wideForms: new Set([0]) });
    expect(out.shown.has(0)).toBe(true);
    expect(out.wide.has(0)).toBe(false);
    expect(out.wideClear.has(0)).toBe(false);
  });

  it('a name NARROWER than the number is not treated as a widening', () => {
    const racers = at([[640, 360]]);
    racers[0].name = 'A';
    racers[0].raceNumber = 100;
    expect(layout(racers).wideClear.has(0)).toBe(false);
  });

  it('without a racer box the criterion falls back to labels only, rather than to nonsense', () => {
    // A caller that cannot supply the drawn size gets the weaker rule, not a wrong one.
    const racers = at([
      [400, 400],
      [400, 375],
    ]);
    expect(layout(racers, { racerScreenW: 0 }).wideClear.has(0)).toBe(true);
    expect(layout(racers).wideClear.has(0)).toBe(false);
  });

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
    expect(out.wideClear.size).toBe(0);
  });
});
