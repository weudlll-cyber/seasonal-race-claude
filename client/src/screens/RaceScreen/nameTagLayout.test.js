// ============================================================
// nameTagLayout.test.js — CAMERA-TAGS-1
//
// Three things are load-bearing here and each carries a failure proof:
//   1. THE UNIT. The label is a fraction of the frame — a taller canvas gets a proportionally
//      bigger label, and no zoom changes it. The rule this replaced did neither.
//   2. DECLUTTERING. A label is drawn only if it does not land on one already there, so the count
//      is an OUTPUT. The rule this replaced drew a fixed 10 and never looked.
//   3. THE START-FORMATION EXCEPTION. Every name, no decluttering, because the owner needs a
//      spectator to be able to find their racer once.
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeTagLayout, tagFontScreenPx } from './nameTagLayout.js';

const CW = 1280;
const CH = 720;
const FONT = tagFontScreenPx(0.022, CH); // 15.84 px, the shipped default
// A ruler, not a canvas: bold sans is ~0.55em per character.
const measure = (s) => 0.55 * FONT * s.length;

/** Racers laid out directly in SCREEN coordinates: effX/effY 1 and no offset. */
const at = (index, sx, sy, name = 'Turbo', t = 1 - index * 0.01) => ({
  index,
  x: sx,
  y: sy,
  name,
  t,
});
const layout = (racers, extra = {}) =>
  computeTagLayout({
    racers,
    effX: 1,
    effY: 1,
    offsetX: 0,
    offsetY: 0,
    canvasW: CW,
    canvasH: CH,
    fontPx: FONT,
    measureText: measure,
    ...extra,
  });

describe('1. THE UNIT — a fraction of the frame, and nothing else', () => {
  it('a taller canvas gets a proportionally bigger label', () => {
    expect(tagFontScreenPx(0.022, 720)).toBeCloseTo(15.84, 6);
    expect(tagFontScreenPx(0.022, 1440)).toBeCloseTo(31.68, 6);
    expect(tagFontScreenPx(0.022, 1440) / tagFontScreenPx(0.022, 720)).toBeCloseTo(2, 9);
  });

  it('it does not depend on the zoom at all — that is what makes it UI', () => {
    // The size takes no zoom argument. The renderer divides by the zoom when it draws, so the
    // label lands at exactly this many screen pixels whatever the camera is doing.
    expect(tagFontScreenPx.length).toBe(2); // (frameFrac, canvasH) — no effZoom, by construction
  });

  it('degenerate inputs give 0 rather than NaN', () => {
    for (const [f, h] of [
      [0, 720],
      [-1, 720],
      [0.02, 0],
      [undefined, 720],
    ])
      expect(tagFontScreenPx(f, h)).toBe(0);
  });

  // FAILURE PROOF — the rule this replaced, computed from the same inputs. `11 * inv` is right, but
  // `round()` collapses it at high zoom and the `max(8, …)` added to catch that then CLAMPS, so
  // above effZoom 1.375 the label starts GROWING on screen instead of holding still.
  it('FAILURE PROOF: the old rule produced a 2.3x size spread across the shipped zooms', () => {
    const oldScreenPx = (effZoom) => Math.max(8, Math.round(11 / effZoom)) * effZoom;
    expect(oldScreenPx(1.0)).toBeCloseTo(11, 6); // as intended
    expect(oldScreenPx(1.6)).toBeCloseTo(12.8, 6); // OVERVIEW: already drifting
    expect(oldScreenPx(3.2)).toBeCloseTo(25.6, 6); // LEADER: twice the size, same setting
    expect(oldScreenPx(3.2) / oldScreenPx(1.0)).toBeGreaterThan(2.3);
    // the new unit does not move at all
    expect(tagFontScreenPx(0.022, CH)).toBe(tagFontScreenPx(0.022, CH));
  });
});

describe('2. DECLUTTERING — the count is an output', () => {
  it('a spread field keeps every label', () => {
    const racers = [at(0, 100, 200), at(1, 500, 200), at(2, 900, 200), at(3, 300, 600)];
    const r = layout(racers);
    expect(r.shown.size).toBe(4);
    expect(r.dropped).toBe(0);
  });

  it('a clump keeps ONE — and it is the one with the better claim', () => {
    // Four racers within a few pixels: their boxes are on top of each other.
    const racers = [
      at(0, 400, 300, 'Turbo', 0.9),
      at(1, 404, 302, 'Blaze', 0.8),
      at(2, 398, 299, 'Rocket', 0.7),
      at(3, 402, 301, 'Flash', 0.6),
    ];
    const r = layout(racers);
    expect(r.shown.size).toBe(1);
    expect(r.shown.has(0)).toBe(true); // highest t wins
    expect(r.dropped).toBe(3);
  });

  it('a bigger label collides sooner, so fewer fit — the trade is visible, not hidden', () => {
    const racers = [at(0, 400, 300), at(1, 480, 300), at(2, 560, 300)];
    const small = computeTagLayout({
      racers,
      effX: 1,
      effY: 1,
      offsetX: 0,
      offsetY: 0,
      canvasW: CW,
      canvasH: CH,
      fontPx: tagFontScreenPx(0.014, CH),
      measureText: (s) => 0.55 * tagFontScreenPx(0.014, CH) * s.length,
    });
    const big = computeTagLayout({
      racers,
      effX: 1,
      effY: 1,
      offsetX: 0,
      offsetY: 0,
      canvasW: CW,
      canvasH: CH,
      fontPx: tagFontScreenPx(0.04, CH),
      measureText: (s) => 0.55 * tagFontScreenPx(0.04, CH) * s.length,
    });
    expect(small.shown.size).toBeGreaterThan(big.shown.size);
  });

  it('ELIGIBILITY is "on canvas", not "top N by position"', () => {
    // A leader off the left edge gets nothing; a back-marker in shot gets a name. Under the old
    // rule this was exactly backwards.
    const racers = [at(0, -500, 300, 'Turbo', 0.99), at(1, 640, 300, 'Gale', 0.1)];
    const r = layout(racers);
    expect(r.shown.has(0)).toBe(false);
    expect(r.shown.has(1)).toBe(true);
  });

  it('every label that survives is readable — no two overlap, by construction', () => {
    const racers = [];
    for (let i = 0; i < 40; i++)
      racers.push(at(i, 100 + (i % 8) * 30, 150 + Math.floor(i / 8) * 25));
    const r = layout(racers);
    const boxes = [];
    for (const rc of racers) {
      if (!r.shown.has(rc.index)) continue;
      const w = measure(rc.name) + 8;
      boxes.push({
        left: rc.x - w / 2,
        right: rc.x + w / 2,
        top: rc.y - FONT * 2 - FONT * 1.18,
        bottom: rc.y - FONT * 2,
      });
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        const overlaps =
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        expect(overlaps, `${i} vs ${j}`).toBe(false);
      }
  });

  // FAILURE PROOF — what the old rule did with the same clump: it drew all ten, on top of each
  // other. Ten labels that cannot be read AND cover more racers than one would.
  it('FAILURE PROOF: the old top-N rule drew ten labels on a clump and never looked', () => {
    const racers = [];
    for (let i = 0; i < 12; i++) racers.push(at(i, 400 + i, 300 + i, 'Racer' + i, 1 - i * 0.001));
    const oldRule = [...racers].sort((a, b) => b.t - a.t).slice(0, 10);
    expect(oldRule.length).toBe(10); // ten drawn, all within 12 px of each other
    expect(layout(racers).shown.size).toBeLessThan(3); // the new rule keeps only what can be read
  });
});

describe('3. THE START-FORMATION EXCEPTION — every name, so a spectator can find their racer', () => {
  const clump = () => {
    const racers = [];
    for (let i = 0; i < 40; i++) racers.push(at(i, 300 + i * 2, 400, 'Racer' + i));
    return racers;
  };

  it('showAll labels everyone on canvas, with no decluttering at all', () => {
    const r = layout(clump(), { showAll: true });
    expect(r.shown.size).toBe(40);
    expect(r.dropped).toBe(0);
  });

  it('and the same field without it keeps only what is readable', () => {
    expect(layout(clump()).shown.size).toBeLessThan(10);
  });

  it('showAll still respects the canvas — an off-screen racer has no name to find', () => {
    const racers = [at(0, 640, 300), at(1, -200, 300), at(2, 640, 2000)];
    const r = layout(racers, { showAll: true });
    expect(r.shown.size).toBe(1);
    expect(r.shown.has(0)).toBe(true);
  });
});

describe('4. STABILITY — Lesson 190, as geometry rather than a timer', () => {
  it('INCUMBENCY: a label already on screen is offered its pixels first', () => {
    // Two racers whose boxes collide. Without incumbency the higher t wins; with it, whoever holds
    // the slot keeps it — so the picture does not swap names as they drift past each other.
    const racers = [at(0, 400, 300, 'Turbo', 0.5), at(1, 406, 300, 'Blaze', 0.9)];
    expect(layout(racers).shown.has(1)).toBe(true); // higher t
    const held = layout(racers, { incumbents: new Set([0]) });
    expect(held.shown.has(0)).toBe(true);
    expect(held.shown.has(1)).toBe(false);
  });

  it('EDGE HYSTERESIS: a racer must be comfortably inside to gain a label, and comfortably outside to lose it', () => {
    const onTheLine = [at(0, 5, 300)];
    expect(layout(onTheLine, { edgeMarginFrac: 0.02 }).shown.size).toBe(0); // not yet
    expect(layout(onTheLine, { edgeMarginFrac: 0.02, incumbents: new Set([0]) }).shown.size).toBe(
      1
    ); // already there, so it stays
  });

  it('a newcomer NEVER displaces an incumbent, however good its claim', () => {
    // Incumbents are offered their pixels first, so this is decided by the ordering, not by the
    // threshold. It is what stops the picture swapping a name as two racers drift past each other.
    const hit = [at(0, 400, 300, 'Turbo', 0.1), at(1, 402, 300, 'Blaze', 0.9)];
    const r = layout(hit, { incumbents: new Set([0]), yieldOverlapFrac: 0.35 });
    expect(r.shown.has(0)).toBe(true);
    expect(r.shown.has(1)).toBe(false);
  });

  it('YIELD THRESHOLD: between two INCUMBENTS, only a decisive intrusion drops one', () => {
    // Both already on screen, so both are offered their slots; the better claim goes first and the
    // other keeps its name unless the intrusion exceeds its budget.
    const both = new Set([0, 1]);
    // ~22% of the box — not decisive, both names stay.
    const nudge = [at(0, 400, 300, 'Turbo', 0.5), at(1, 440, 300, 'Blaze', 0.9)];
    const kept = layout(nudge, { incumbents: both, yieldOverlapFrac: 0.35 });
    expect(kept.shown.size).toBe(2);
    // ~96% of the box — decisive, so the weaker claim gives way.
    const hit = [at(0, 400, 300, 'Turbo', 0.5), at(1, 402, 300, 'Blaze', 0.9)];
    const yielded = layout(hit, { incumbents: both, yieldOverlapFrac: 0.35 });
    expect(yielded.shown.has(1)).toBe(true); // higher t placed first
    expect(yielded.shown.has(0)).toBe(false);
  });

  it('a challenger never gets a partial slot — only an incumbent has a budget', () => {
    const racers = [at(0, 400, 300, 'Turbo', 0.9), at(1, 440, 300, 'Blaze', 0.5)];
    const r = layout(racers, { yieldOverlapFrac: 0.35 }); // no incumbents
    expect(r.shown.has(0)).toBe(true);
    expect(r.shown.has(1)).toBe(false); // any overlap at all keeps a newcomer out
  });
});

describe('degenerate inputs', () => {
  it('an empty or broken field asks for nothing', () => {
    for (const racers of [[], null, undefined])
      expect(
        computeTagLayout({
          racers,
          effX: 1,
          effY: 1,
          offsetX: 0,
          offsetY: 0,
          canvasW: CW,
          canvasH: CH,
          fontPx: FONT,
          measureText: measure,
        }).shown.size
      ).toBe(0);
  });

  it('a zero font size draws nothing rather than dividing by it', () => {
    expect(layout([at(0, 400, 300)], { fontPx: 0 }).shown.size).toBe(0);
  });

  it('racers with no index are skipped rather than crashing', () => {
    const r = layout([{ x: 400, y: 300, name: 'X', t: 1 }, at(1, 800, 300)]);
    expect(r.shown.size).toBe(1);
    expect(r.shown.has(1)).toBe(true);
  });
});

// ── 5. AN ADMITTED LABEL IS NOT OVERRUN AFTERWARDS (LABEL-OVERLAP-FIX-1) ────────────────────────
//
// HOW THESE MEASURE, stated because LABEL-OVERLAP-3 was caused by an audit that did not.
// The verdict below is NOT computed by calling anything the layout calls. Each racer is given an
// EXACT stipulated width through `measureText` — a lookup table, not a ruler — so every box's
// coordinates are known by construction, and the assertion is plain rectangle arithmetic written
// out here. If the layout's own idea of a width were wrong, these tests would still be right; the
// audit that reported "0 overlaps" on the owner's frame shared the layout's estimate and therefore
// could only ever agree with it.
describe('5. AN ADMITTED NAME IS NOT OVERRUN — LABEL-OVERLAP-FIX-1', () => {
  // Exact widths, stipulated per string. Nothing here approximates anything.
  const W = { LongName: 120, Other: 60, 7: 20 };
  const exactly = (s) => W[s] ?? 10;
  // labelBoxWidth's padding. It is a GEOMETRY constant, not a text measurement, and it is mirrored
  // rather than imported so this file states the box it is asserting about. If it ever disagrees
  // with the module the `overlaps(...)` guard below fails loudly — which is exactly how the first
  // draft of this test, written with 10, was caught.
  const BOX_PAD_X = 8;
  const boxOf = (sx, sy, textW, fontPx, racerScreenH, marginPx) => {
    const w = textW + BOX_PAD_X;
    const h = Math.round(fontPx * 1.35); // labelBoxHeight; only its POSITIVE height matters below
    const offset = racerScreenH / 2 + marginPx;
    return { left: sx - w / 2, right: sx + w / 2, top: sy - offset - h, bottom: sy - offset };
  };
  const overlaps = (a, b) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

  /**
   * Two racers side by side. The first shows its NAME (earned, and clear when it is judged); the
   * second is a tenured incumbent showing a two-character NUMBER whose box lands ON the first's.
   * The gap is chosen so the intrusion is well under 35 % of the number's own area — i.e. exactly
   * the budget `fits` used to grant.
   */
  const twoRacers = (gapPx) => [
    { index: 0, x: 400, y: 400, name: 'LongName', t: 0.9 },
    { index: 1, x: 400 + gapPx, y: 400, name: 'Other', t: 0.8 },
  ];
  const run = (gapPx, extra = {}) =>
    computeTagLayout({
      racers: twoRacers(gapPx),
      effX: 1,
      effY: 1,
      offsetX: 0,
      offsetY: 0,
      canvasW: CW,
      canvasH: CH,
      fontPx: FONT,
      racerScreenH: 20,
      racerScreenW: 20,
      labelMarginPx: 6,
      measureText: exactly,
      labelOf: () => '7', // the NARROW form is the race number, for both
      wideLabelOf: (r) => (r.index === 0 ? 'LongName' : 'Other'),
      wideForms: new Set([0]), // only racer 0 has EARNED its name
      // BOTH have tenure, and that is what makes this the defect rather than a near miss.
      // `eligible` sorts incumbents first and then by race position, so racer 0 (higher `t`) is
      // judged FIRST and its name is admitted against an empty picture; racer 1 is judged after and
      // is the one holding a budget. That is the exact order in which a name gets overrun. With
      // only racer 1 tenured it would be placed first and the NAME would simply be refused — no
      // overlap either way, and the test would prove nothing.
      incumbents: new Set([0, 1]),
      ...extra,
    });

  it('a tenured NUMBER may not land on an admitted NAME', () => {
    // DELETE THIS and the defect returns exactly as it was: the name is admitted with zero
    // tolerance, the number spends its 35 % budget on top of it, and nothing re-checks. That is the
    // 7-of-12 the owner photographed, and no other test in this file looks at it.
    // 72 px: the number's 28 px box (458..486) laps the name's 128 px box (336..464) by 6 px, and
    // racer 1's BODY sits well below the label band — so `nameClear` is genuinely true when racer 0
    // is judged, and the only thing that can put the two together is the incumbent's budget.
    const gap = 72;
    const out = run(gap);
    const nameBox = boxOf(400, 400, W.LongName, FONT, 20, 6);
    const numBox = boxOf(400 + gap, 400, W['7'], FONT, 20, 6);
    // The geometry must genuinely collide, or this test proves nothing.
    expect(overlaps(nameBox, numBox)).toBe(true);
    // …and the intrusion must be INSIDE the old budget, or it would have been refused anyway.
    const ox = Math.min(nameBox.right, numBox.right) - Math.max(nameBox.left, numBox.left);
    const oy = Math.min(nameBox.bottom, numBox.bottom) - Math.max(numBox.top, nameBox.top);
    const numArea = (numBox.right - numBox.left) * (numBox.bottom - numBox.top);
    expect(ox * oy).toBeLessThan(0.35 * numArea);
    // The rule: racer 0 keeps its name, and racer 1 is not drawn on top of it.
    expect(out.wide.has(0)).toBe(true);
    expect(out.shown.has(1)).toBe(false);
  });

  it('two NUMBERS still yield to each other — the budget is not deleted', () => {
    // DELETE THIS and the fix could be "lower YIELD_OVERLAP_FRAC to 0", which would fix the owner's
    // frame and reintroduce the churn the budget was measured into existence to stop. The asymmetry
    // between numbers is the part that was working.
    const out = computeTagLayout({
      racers: twoRacers(70),
      effX: 1,
      effY: 1,
      offsetX: 0,
      offsetY: 0,
      canvasW: CW,
      canvasH: CH,
      fontPx: FONT,
      racerScreenH: 20,
      racerScreenW: 20,
      labelMarginPx: 6,
      measureText: exactly,
      labelOf: () => '7',
      wideLabelOf: null, // no names on offer at all — numbers only
      incumbents: new Set([1]),
    });
    expect(out.shown.has(0)).toBe(true);
    expect(out.shown.has(1)).toBe(true); // the incumbent still spends its budget
    expect(out.wide.size).toBe(0);
  });

  it('with room, the name and the number are both drawn and do not touch', () => {
    // DELETE THIS and the fix could be "never draw a number near a name", which would empty the
    // picture. The control: the same two racers far enough apart must both keep their labels.
    const out = run(300);
    expect(out.wide.has(0)).toBe(true);
    expect(out.shown.has(1)).toBe(true);
    const nameBox = boxOf(400, 400, W.LongName, FONT, 20, 6);
    const numBox = boxOf(700, 400, W['7'], FONT, 20, 6);
    expect(overlaps(nameBox, numBox)).toBe(false);
  });
});

// ── 6. THE PHOTO-FINISH BLANKET EXEMPTION (LABEL-OVERLAP-FIX-1) ─────────────────────────────────
describe('6. exemptAll draws names regardless of room — which is why the caller stopped setting it', () => {
  const W = { Alpha: 140, Bravo: 140 };
  const exactly = (s) => W[s] ?? 12;
  const packed = [
    { index: 0, x: 400, y: 400, name: 'Alpha', t: 0.9 },
    { index: 1, x: 430, y: 400, name: 'Bravo', t: 0.8 },
  ];
  const run = (extra) =>
    computeTagLayout({
      racers: packed,
      effX: 1,
      effY: 1,
      offsetX: 0,
      offsetY: 0,
      canvasW: CW,
      canvasH: CH,
      fontPx: FONT,
      racerScreenH: 20,
      racerScreenW: 20,
      labelMarginPx: 6,
      measureText: exactly,
      labelOf: (r) => String(r.index),
      wideLabelOf: (r) => r.name,
      wideForms: new Set([0, 1]),
      ...extra,
    });

  it('exemptAll:true puts BOTH names on 30 px of space — the behaviour that was measured at 40 of 41', () => {
    // DELETE THIS and nothing records what the flag does, so a later reader cannot tell whether the
    // caller's `false` is a decision or an accident.
    expect(run({ exemptAll: true }).wide.size).toBe(2);
  });

  it('exemptAll:false — the shipped call — admits only what fits', () => {
    // DELETE THIS and the repair is unpinned: the flag could go back to true and only the ten-track
    // harness would notice.
    expect(run({ exemptAll: false }).wide.size).toBeLessThan(2);
  });
});
