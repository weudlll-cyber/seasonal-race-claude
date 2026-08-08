// ============================================================
// File:        startBoardRendering.test.js
// Path:        client/src/screens/RaceScreen/drawing/startBoardRendering.test.js
// Project:     RaceArena — START-BOARD-1
//
// WHAT THIS GUARDS: that the board a viewer scans is COMPLETE and READABLE. Those are the only two
// things it has to be. Complete means every racer is on it, exactly once, with no name silently
// dropped because the block ran out of room. Readable means no entry lands on top of another and
// none falls off the canvas — at the 40-racer field the owner runs and at the 100 he asked it to
// hold.
//
// The layout is a PURE function for exactly this reason: "do two entries overlap at n = 100" is a
// question about arithmetic, and a test that rasterised a canvas to answer it would be measuring
// the rasteriser.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import {
  startBoardLayout,
  startBoardEntries,
  startBoardAlpha,
  drawStartBoard,
} from './startBoardRendering.js';

const CW = 1280;
const CH = 720;

const field = (n, names = null) =>
  Array.from({ length: n }, (_, i) => ({
    index: i,
    name: names ? names[i] : `Racer ${String(i).padStart(3, '0')}`,
    raceNumber: i + 1,
    coatId: 'cream',
    patternId: 'solid',
    speed: 0,
  }));

/** A ctx that records what was drawn, so completeness can be asserted on the OUTPUT. */
function makeRecordingCtx() {
  const texts = [];
  return {
    texts,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn((t) => texts.push(String(t))),
    measureText: vi.fn().mockReturnValue({ width: 40 }),
    translate: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
    font: '',
    fillStyle: '',
  };
}

describe('the runners’ board is COMPLETE', () => {
  // WHAT BREAKS IF DELETED: the board's only real promise. A viewer who cannot find their name has
  // no way to tell "not on the board" from "I missed it", so a silently dropped racer is invisible.
  // WHAT GOES UNNOTICED WITHOUT IT: a layout that runs out of cells and clips the tail of the
  // alphabet — which is exactly what a fixed 5×20 grid does at 101 racers.
  it('every racer appears exactly once, at 40 and at 100', () => {
    for (const n of [40, 100]) {
      const ctx = makeRecordingCtx();
      drawStartBoard(ctx, {
        racers: field(n),
        racerType: null,
        displaySize: 40,
        alpha: 1,
        canvasW: CW,
        canvasH: CH,
      });
      for (const r of field(n)) {
        const hits = ctx.texts.filter((t) => t === r.name);
        expect(hits.length, `${r.name} at n=${n}`).toBe(1);
      }
    }
  });

  // WHAT BREAKS IF DELETED: nothing catches a layout that has FEWER cells than racers. The test
  // above would still pass if the board drew 100 names into 100 cells that were all the same cell.
  // WHAT GOES UNNOTICED: every racer present and unreadable.
  it('the layout has a distinct cell for every racer', () => {
    for (const n of [1, 7, 40, 100]) {
      const L = startBoardLayout(n, CW, CH);
      expect(L.cols * L.rows).toBeGreaterThanOrEqual(n);
      const seen = new Set();
      for (let i = 0; i < n; i++) {
        const { x, y } = L.cellAt(i);
        seen.add(`${Math.round(x)},${Math.round(y)}`);
      }
      expect(seen.size, `distinct cells at n=${n}`).toBe(n);
    }
  });

  // WHAT BREAKS IF DELETED: the order the owner asked for. Alphabetical is what makes a name
  // findable without reading every entry.
  // WHAT GOES UNNOTICED: an order that looks alphabetical on one machine and is not on another —
  // `localeCompare` depends on host ICU data, and this ordering is hashed by the render fingerprint.
  it('is alphabetical by name, case-insensitively, and deterministic', () => {
    const names = ['zoe', 'Adam', 'bea', 'ADAM', 'Céline'];
    const sorted = startBoardEntries(field(5, names)).map((r) => r.name);
    expect(sorted).toEqual(['Adam', 'ADAM', 'bea', 'Céline', 'zoe']);
    // Equal names keep the racer index order, so the sort is total rather than merely non-crashing.
    expect(startBoardEntries(field(5, names))[0].index).toBe(1);
    expect(startBoardEntries(field(5, names))[1].index).toBe(3);
  });
});

describe('the runners’ board is READABLE', () => {
  /** Every cell rectangle, for overlap and containment checks. */
  const cells = (n) => {
    const L = startBoardLayout(n, CW, CH);
    return Array.from({ length: n }, (_, i) => {
      const { x, y } = L.cellAt(i);
      return { x, y, w: L.cellW, h: L.cellH };
    });
  };
  const overlaps = (a, b) =>
    a.x < b.x + b.w - 1e-6 &&
    b.x < a.x + a.w - 1e-6 &&
    a.y < b.y + b.h - 1e-6 &&
    b.y < a.y + a.h - 1e-6;

  // WHAT BREAKS IF DELETED: the second of the board's two promises. Overlapping entries are worse
  // than a missing one — they look like data.
  // WHAT GOES UNNOTICED: a column count that grows without the block being re-measured.
  it('no two entries overlap, at 40 and at 100', () => {
    for (const n of [40, 100]) {
      const cs = cells(n);
      for (let i = 0; i < cs.length; i++)
        for (let j = i + 1; j < cs.length; j++)
          expect(overlaps(cs[i], cs[j]), `entries ${i} and ${j} overlap at n=${n}`).toBe(false);
    }
  });

  // WHAT BREAKS IF DELETED: clipping. An entry drawn off-canvas is a racer with no board presence,
  // and it is the failure a fixed grid produces first.
  // WHAT GOES UNNOTICED: it only appears at the largest field, which is the one nobody tests by eye.
  it('every entry is inside the canvas, at 40 and at 100 — and beyond', () => {
    for (const n of [1, 40, 100, 140]) {
      for (const c of cells(n)) {
        expect(c.x, `left edge at n=${n}`).toBeGreaterThanOrEqual(0);
        expect(c.y, `top edge at n=${n}`).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w, `right edge at n=${n}`).toBeLessThanOrEqual(CW);
        expect(c.y + c.h, `bottom edge at n=${n}`).toBeLessThanOrEqual(CH);
      }
    }
  });

  // WHAT BREAKS IF DELETED: the small-field case the owner explicitly asked to see. A block that
  // is always five columns wide makes eight racers look like a spreadsheet.
  // WHAT GOES UNNOTICED: nothing by eye — but only because he would have to run a small race to
  // notice, and the default field is large.
  it('a small field gets a small block, not a strip across the screen', () => {
    const small = startBoardLayout(8, CW, CH);
    const big = startBoardLayout(100, CW, CH);
    expect(small.cols).toBeLessThan(big.cols);
    expect(small.blockW).toBeLessThan(big.blockW * 0.6);
    // …and it is still centred, so it does not sit in a corner.
    expect(small.originX + small.blockW / 2).toBeCloseTo(CW / 2, 6);
  });

  // WHAT BREAKS IF DELETED: the type size at large fields. `fit` may shrink the block, and a shrink
  // that goes too far trades clipping for illegibility, which is not a repair.
  // WHAT GOES UNNOTICED: the owner would rather lengthen a beat than shrink the type — so a silent
  // shrink is a decision taken away from him.
  it('does not shrink at the field sizes that matter — 100 fits at full size', () => {
    expect(startBoardLayout(40, CW, CH).scale).toBe(1);
    expect(startBoardLayout(100, CW, CH).scale).toBe(1);
    // Past that it shrinks rather than clipping, which the containment test above already proves.
    expect(startBoardLayout(140, CW, CH).scale).toBeLessThan(1);
  });
});

describe('the board lives in the push and nowhere else', () => {
  // WHAT BREAKS IF DELETED: "(c) it ends before the gun". A board still up at the start would cover
  // the one moment the whole ceremony exists to deliver.
  // WHAT GOES UNNOTICED: it would be visible for a fraction of a second and read as a flicker.
  it('is invisible during the venue and settled beats, and gone by the end of the push', () => {
    expect(startBoardAlpha('venue', 0.5)).toBe(0);
    expect(startBoardAlpha('settled', 1)).toBe(0);
    expect(startBoardAlpha('push', 1)).toBe(0);
    expect(startBoardAlpha('push', 0)).toBe(0);
  });

  it('is fully visible through the middle of the push', () => {
    expect(startBoardAlpha('push', 0.5)).toBe(1);
    expect(startBoardAlpha('push', 0.3)).toBe(1);
    expect(startBoardAlpha('push', 0.8)).toBe(1);
  });

  // WHAT BREAKS IF DELETED: the guard against an alpha outside 0..1, which paints nothing or paints
  // over everything.
  // WHAT GOES UNNOTICED: a progress value slightly outside its beat at a frame boundary.
  it('clamps, so a progress outside its beat cannot produce a nonsense alpha', () => {
    for (const p of [-1, 0, 0.5, 1, 2, NaN]) {
      const a = startBoardAlpha('push', p);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  // WHAT BREAKS IF DELETED: the cheap exits. drawStartBoard is called every countdown frame,
  // including the ~2400 frames where it must draw nothing at all.
  // WHAT GOES UNNOTICED: a scrim painted at alpha 0 still costs a full-screen fill every frame.
  it('draws nothing at all when it is not visible', () => {
    const ctx = makeRecordingCtx();
    drawStartBoard(ctx, {
      racers: field(40),
      racerType: null,
      displaySize: 40,
      alpha: 0,
      canvasW: CW,
      canvasH: CH,
    });
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.texts.length).toBe(0);
  });
});

describe('the portrait is the shipped drawing function, in its neutral pose', () => {
  // WHAT BREAKS IF DELETED: the requirement that the board show the racer as it will ACTUALLY look.
  // A copy of the drawing code would drift from the game the first time a coat changed.
  // WHAT GOES UNNOTICED: a portrait that is right today and wrong after the next sprite change.
  it('calls racerType.drawRacer once per racer, with frame 0 and no rings', () => {
    const ctx = makeRecordingCtx();
    const drawRacer = vi.fn();
    drawStartBoard(ctx, {
      racers: field(12),
      racerType: { drawRacer },
      displaySize: 40,
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    expect(drawRacer).toHaveBeenCalledTimes(12);
    for (const call of drawRacer.mock.calls) {
      const [, , , angle, racer, isLeader, frame, , isComeback] = call;
      expect(angle).toBe(0);
      expect(isLeader).toBe(false);
      expect(isComeback).toBe(false);
      // THE NEUTRAL POSE. `_getFrameIndex` is floor(((frame % period)/period) × frameCount), so 0
      // selects sheet frame 0 for any speed and any racer type — a still portrait for free.
      expect(frame).toBe(0);
      // It is handed the REAL racer, so the coat and pattern it draws are the ones the race uses.
      expect(racer.coatId).toBe('cream');
    }
  });

  it('survives a racer type that cannot draw yet, rather than taking the frame down', () => {
    const ctx = makeRecordingCtx();
    expect(() =>
      drawStartBoard(ctx, {
        racers: field(5),
        racerType: undefined,
        displaySize: 40,
        alpha: 1,
        canvasW: CW,
        canvasH: CH,
      })
    ).not.toThrow();
    // The names still went up — the board degrades to a list rather than to nothing.
    expect(ctx.texts).toContain('Racer 000');
  });
});
