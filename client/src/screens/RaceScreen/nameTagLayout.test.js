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

  // MODIFIED by START-SEQUENCE-1, because the OWNER changed this contract rather than because the
  // test was wrong. It used to assert that showAll labels everyone in one frame. On a clump of 40
  // that is 40 unreadable overlapping labels, so the roll call now spreads them over waves: every
  // name still appears, at full size, but across the countdown instead of all at once. What is
  // asserted here is the part that did NOT change — the promise that nobody is left out.
  it('showAll spreads a clump over waves, and still names every racer', () => {
    const r = layout(clump(), { showAll: true });
    expect(r.waveCount).toBeGreaterThan(1);
    // this frame shows one wave...
    expect(r.shown.size).toBeLessThan(40);
    expect(r.shown.size).toBe(r.placed);
    // ...and walking the waves names all 40, which is the promise.
    const named = new Set();
    for (let w = 0; w < r.waveCount; w++) {
      for (const i of layout(clump(), { showAll: true, waveIndex: w }).shown) named.add(i);
    }
    expect(named.size).toBe(40);
  });

  it('showAll with room to spare is ONE wave and still labels everyone at once', () => {
    // The untouched case: no overlaps, so the roll call cannot engage and the picture is as before.
    const spread = Array.from({ length: 6 }, (_, i) => at(i, 120 + i * 190, 300));
    const r = layout(spread, { showAll: true });
    expect(r.waveCount).toBe(1);
    expect(r.shown.size).toBe(6);
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
