// ============================================================
// File:        startBoardRendering.test.js
// Path:        client/src/screens/RaceScreen/drawing/startBoardRendering.test.js
// Project:     RaceArena — START-BOARD-1, extended by START-BOARD-2
//
// WHAT THIS GUARDS: that the board a viewer scans is COMPLETE and READABLE. Those are the only two
// things it has to be. Complete means every racer is on it, exactly once, with no name silently
// dropped. Readable means no entry lands on top of another and none falls off the canvas — at the
// 40-racer field the owner runs and at the 100 he asked it to hold.
//
// START-BOARD-2 added a third thing to guard and it is why several of these got harder: the board is
// GROUPED BY START ROW now, so the layout carries heading slots as well as racers and "every racer
// exactly once" has to survive a structure that is no longer a flat list.
//
// The layout is a PURE function for exactly this reason: "do two entries overlap at n = 100" is a
// question about arithmetic, and a test that rasterised a canvas to answer it would be measuring the
// rasteriser.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import {
  startBoardLayout,
  startBoardGroups,
  drawStartBoard,
  NO_NAME_LABEL,
} from './startBoardRendering.js';

const CW = 1280;
const CH = 720;

/** A field of `n`, laid out `perRow` to a start row — the shape rowLayout actually produces. */
const field = (n, perRow = 8, names = null) =>
  Array.from({ length: n }, (_, i) => ({
    index: i,
    name: names ? names[i] : `Racer ${String(i).padStart(3, '0')}`,
    raceNumber: i + 1,
    coatId: 'cream',
    patternId: 'solid',
    speed: 0,
  }));

const rows = (n, perRow = 8) =>
  new Map(Array.from({ length: n }, (_, i) => [i, { rowIndex: Math.floor(i / perRow) }]));

const layoutFor = (n, perRow = 8) =>
  startBoardLayout(startBoardGroups(field(n, perRow), rows(n, perRow)), CW, CH);

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
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn((t) => texts.push(String(t))),
    measureText: vi.fn().mockReturnValue({ width: 40 }),
    translate: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '',
    textAlign: '',
    textBaseline: '',
    font: '',
    fillStyle: '',
  };
}

const draw = (n, perRow = 8, extra = {}) => {
  const ctx = makeRecordingCtx();
  drawStartBoard(ctx, {
    racers: field(n, perRow),
    racerType: null,
    displaySize: 40,
    assignmentByRacer: rows(n, perRow),
    alpha: 1,
    canvasW: CW,
    canvasH: CH,
    ...extra,
  });
  return ctx;
};

describe('the runners’ board is COMPLETE', () => {
  // WHAT BREAKS IF DELETED: the board's only real promise. A viewer who cannot find their name has
  // no way to tell "not on the board" from "I missed it", so a silently dropped racer is invisible.
  // WHAT GOES UNNOTICED WITHOUT IT: grouping made this harder, not easier — a group whose racers
  // were built and then not emitted would look like a shorter board, which is exactly the shape of
  // the defect the owner reported ("100 runners, only 70 shown").
  it('every racer appears exactly once, at 40 and at 100', () => {
    for (const n of [40, 100]) {
      const ctx = draw(n);
      for (const r of field(n)) {
        expect(ctx.texts.filter((t) => t === r.name).length, `${r.name} at n=${n}`).toBe(1);
      }
    }
  });

  // WHAT BREAKS IF DELETED: nothing catches a layout with FEWER cells than slots. The test above
  // would still pass if every entry were drawn into the same cell.
  // WHAT GOES UNNOTICED: every racer present and unreadable.
  it('the layout has a distinct cell for every slot — racers AND headings', () => {
    for (const n of [1, 7, 40, 100]) {
      const L = layoutFor(n);
      expect(L.cols * L.rows).toBeGreaterThanOrEqual(L.slotCount);
      const seen = new Set(L.slots.map((s) => `${Math.round(s.x)},${Math.round(s.y)}`));
      expect(seen.size, `distinct cells at n=${n}`).toBe(L.slotCount);
    }
  });

  // WHAT BREAKS IF DELETED: the count that ties the structure to the field. A group that lost a
  // racer would still lay out cleanly.
  // WHAT GOES UNNOTICED: a grouping bug that drops one row of the grid entirely.
  it('the groups partition the field — no racer lost, none duplicated, none invented', () => {
    for (const [n, perRow] of [
      [8, 5],
      [40, 8],
      [100, 10],
    ]) {
      const g = startBoardGroups(field(n, perRow), rows(n, perRow));
      const all = g.flatMap((x) => x.racers.map((r) => r.index));
      expect(all.length).toBe(n);
      expect(new Set(all).size).toBe(n);
      expect(g.length).toBe(Math.ceil(n / perRow));
    }
  });

  // WHAT BREAKS IF DELETED: finding 4 — the owner's own idea. Row order is what lets a viewer use
  // the board to learn WHERE they start, not just which number they are.
  // WHAT GOES UNNOTICED: groups in hash order, which looks alphabetical-ish and is not row order.
  it('is grouped by START ROW in row order, alphabetical WITHIN each row', () => {
    const names = ['zoe', 'Adam', 'bea', 'yan', 'Cara', 'dan'];
    const racers = field(6, 3, names);
    const g = startBoardGroups(racers, rows(6, 3));
    expect(g.map((x) => x.row)).toEqual([0, 1]);
    expect(g.map((x) => x.label)).toEqual(['ROW 1', 'ROW 2']);
    expect(g[0].racers.map((r) => r.name)).toEqual(['Adam', 'bea', 'zoe']);
    expect(g[1].racers.map((r) => r.name)).toEqual(['Cara', 'dan', 'yan']);
  });

  // WHAT BREAKS IF DELETED: determinism of the order, which the render fingerprint hashes.
  // WHAT GOES UNNOTICED: `localeCompare` reads host ICU data, so the same code could order two
  // machines differently and the instrument would report a difference that is not a change.
  it('the ordering is case-insensitive and total — equal names fall back to the index', () => {
    const racers = field(3, 3, ['ADAM', 'adam', 'Adam']);
    const g = startBoardGroups(racers, rows(3, 3));
    expect(g[0].racers.map((r) => r.index)).toEqual([0, 1, 2]);
  });

  // WHAT BREAKS IF DELETED: requirement 3(c). A blank row is indistinguishable from a bug, which is
  // precisely the confusion the owner hit when a field came up short.
  // WHAT GOES UNNOTICED: a racer that starts and has no line on the board at all.
  it('a racer with NO NAME still gets its number, its portrait and an explicit placeholder', () => {
    const racers = field(4, 4);
    delete racers[2].name;
    const drawRacer = vi.fn();
    const ctx = makeRecordingCtx();
    drawStartBoard(ctx, {
      racers,
      racerType: { drawRacer },
      displaySize: 40,
      assignmentByRacer: rows(4, 4),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    expect(ctx.texts).toContain(NO_NAME_LABEL);
    expect(ctx.texts).toContain('3'); // its number is still there
    expect(drawRacer).toHaveBeenCalledTimes(4); // and so is its portrait
    // …and the placeholder is not silently empty, which is the whole point.
    expect(NO_NAME_LABEL.trim().length).toBeGreaterThan(0);
  });

  it('an unnamed racer sorts after the named ones rather than among the As', () => {
    const racers = field(3, 3, ['bea', 'adam', 'cara']);
    delete racers[1].name;
    const g = startBoardGroups(racers, rows(3, 3));
    expect(g[0].racers.map((r) => r.index)).toEqual([0, 2, 1]);
  });
});

describe('the runners’ board is READABLE', () => {
  const cells = (n, perRow = 8) => {
    const L = layoutFor(n, perRow);
    return L.slots.map((s) => ({ x: s.x, y: s.y, w: L.cellW, h: L.cellH }));
  };
  const overlaps = (a, b) =>
    a.x < b.x + b.w - 1e-6 &&
    b.x < a.x + a.w - 1e-6 &&
    a.y < b.y + b.h - 1e-6 &&
    b.y < a.y + a.h - 1e-6;

  // WHAT BREAKS IF DELETED: the second promise. Overlapping entries are worse than a missing one —
  // they look like data.
  // WHAT GOES UNNOTICED: heading slots collide with racer slots, which only happens at some field
  // sizes and would read as a rendering glitch rather than a layout bug.
  it('no two slots overlap, at 40 and at 100', () => {
    for (const n of [40, 100]) {
      const cs = cells(n);
      for (let i = 0; i < cs.length; i++)
        for (let j = i + 1; j < cs.length; j++)
          expect(overlaps(cs[i], cs[j]), `slots ${i} and ${j} overlap at n=${n}`).toBe(false);
    }
  });

  // WHAT BREAKS IF DELETED: clipping. An entry drawn off-canvas is a racer with no board presence.
  // WHAT GOES UNNOTICED: it appears first at the largest field, the one nobody eye-tests.
  it('every slot is inside the canvas — at 40, at 100, and beyond', () => {
    for (const [n, perRow] of [
      [1, 8],
      [40, 8],
      [100, 10],
      [100, 8],
      [140, 10],
    ]) {
      for (const c of cells(n, perRow)) {
        expect(c.x, `left at n=${n}`).toBeGreaterThanOrEqual(0);
        expect(c.y, `top at n=${n}`).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w, `right at n=${n}`).toBeLessThanOrEqual(CW);
        expect(c.y + c.h, `bottom at n=${n}`).toBeLessThanOrEqual(CH);
      }
    }
  });

  // WHAT BREAKS IF DELETED: the case he explicitly asked to see.
  // WHAT GOES UNNOTICED: eight racers laid out like a spreadsheet.
  it('a small field gets a small block, not a strip across the screen', () => {
    const small = layoutFor(8, 5);
    const big = layoutFor(100, 10);
    expect(small.cols).toBeLessThan(big.cols);
    expect(small.blockW).toBeLessThan(big.blockW * 0.6);
    expect(small.originX + small.blockW / 2).toBeCloseTo(CW / 2, 6);
  });

  // WHAT BREAKS IF DELETED: the type size at the field sizes that matter. The owner's rule is that
  // he would rather lengthen a beat than shrink the type — a silent shrink takes that from him.
  // WHAT GOES UNNOTICED: grouping ADDED slots (one heading per start row), so a cell size that fit
  // 100 racers no longer fits 100 racers plus 10 headings. That is what forced the narrower cell.
  it('does not shrink at the sizes that matter — 100 racers AND their headings fit at full size', () => {
    expect(layoutFor(8, 5).scale).toBe(1);
    expect(layoutFor(40, 8).scale).toBe(1);
    expect(layoutFor(100, 10).scale).toBe(1);
    expect(layoutFor(100, 8).scale).toBe(1); // 13 groups, the denser row layout
    // Past that it shrinks rather than clipping, which the containment test above proves.
    expect(layoutFor(140, 10).scale).toBeLessThan(1);
  });
});

describe('the entry reads as one thing: NUMBER · SPRITE · NAME', () => {
  // WHAT BREAKS IF DELETED: finding 2, in the owner's words — "the little symbols are hard to
  // attribute to the right racer, they sit far from the name".
  // WHAT GOES UNNOTICED: a refactor putting the number back between the sprite and the name, which
  // looks tidy in code and is the exact thing he complained about.
  it('nothing is drawn between the sprite and the name', () => {
    const drawRacer = vi.fn();
    const ctx = makeRecordingCtx();
    const racers = field(1, 1);
    drawStartBoard(ctx, {
      racers,
      racerType: { drawRacer },
      displaySize: 40,
      assignmentByRacer: rows(1, 1),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    const L = layoutFor(1, 1);
    const slot = L.slots.find((s) => s.kind === 'racer');
    const spriteX = drawRacer.mock.calls[0][1];
    // The name's x is the last fillText's x — recorded via the mock's call args.
    const nameCall = ctx.fillText.mock.calls.find((c) => c[0] === racers[0].name);
    const numberCall = ctx.fillText.mock.calls.find((c) => c[0] === '1');
    expect(numberCall[1]).toBeLessThan(spriteX); // number is the LEFT anchor
    expect(spriteX).toBeLessThan(nameCall[1]); // sprite sits immediately before the name
    // and the gap between the sprite's centre and the name's start is a hair, not a gutter
    expect(nameCall[1] - spriteX).toBeLessThan(L.cellW * 0.15);
    expect(slot).toBeTruthy();
  });

  // WHAT BREAKS IF DELETED: the requirement that the portrait be the real thing, drawn by the
  // shipped function rather than a copy that drifts.
  // WHAT GOES UNNOTICED: a portrait right today and wrong after the next sprite change.
  it('calls racerType.drawRacer once per racer, with frame 0 and no rings', () => {
    const drawRacer = vi.fn();
    const ctx = makeRecordingCtx();
    drawStartBoard(ctx, {
      racers: field(12, 4),
      racerType: { drawRacer },
      displaySize: 40,
      assignmentByRacer: rows(12, 4),
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
      expect(racer.coatId).toBe('cream');
    }
  });

  // WHAT BREAKS IF DELETED: finding 5. The portrait grew because moving the number out of the
  // middle freed its gutter; a later tidy-up could take that back without anyone noticing.
  // WHAT GOES UNNOTICED: the symbols going back to being hard to attribute — which he would have
  // to re-report from an eye test rather than a test catching it.
  it('the portrait is drawn LARGER than the ~21 px the first version used', () => {
    const drawRacer = vi.fn();
    drawStartBoard(makeRecordingCtx(), {
      racers: field(4, 4),
      racerType: { drawRacer },
      displaySize: 40,
      assignmentByRacer: rows(4, 4),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    // arg 7 is displaySizeScale; displaySize × scale is the drawn size in screen px here.
    const drawnPx = drawRacer.mock.calls[0][7] * 40;
    expect(drawnPx).toBeGreaterThan(25);
  });

  it('survives a racer type that cannot draw yet, rather than taking the frame down', () => {
    const ctx = makeRecordingCtx();
    expect(() => draw(5, 5, { racerType: undefined })).not.toThrow();
    expect(ctx).toBeTruthy();
    expect(draw(5, 5, { racerType: undefined }).texts).toContain('Racer 000');
  });

  // WHAT BREAKS IF DELETED: the cheap exit. drawStartBoard is called on every countdown frame,
  // including the ones where it must draw nothing at all.
  // WHAT GOES UNNOTICED: a full-screen fill every frame of a ten-second countdown.
  it('draws nothing at all when it is not visible', () => {
    const ctx = draw(40, 8, { alpha: 0 });
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.texts.length).toBe(0);
  });

  it('falls back to one group when no start-row assignment is available', () => {
    const g = startBoardGroups(field(6, 6), null);
    expect(g.length).toBe(1);
    expect(g[0].racers.length).toBe(6);
  });
});
