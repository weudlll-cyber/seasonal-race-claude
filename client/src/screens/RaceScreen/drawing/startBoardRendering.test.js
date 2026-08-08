// ============================================================
// File:        startBoardRendering.test.js
// Path:        client/src/screens/RaceScreen/drawing/startBoardRendering.test.js
// Project:     RaceArena — START-BOARD-1, extended by -2, corrected by -3
//
// WHAT THIS GUARDS: that the board a viewer scans is COMPLETE and READABLE, and that every entry
// carries the three things it exists to pair — a number, a racer and a name — plus the row.
//
// START-BOARD-3 added the number test that was missing, and it is the one that matters most: the
// owner reported a board with no numbers on it. The draw was never removed, so no existing test
// could have caught the regression — none of them looked at whether a number was emitted at all.
// The board's whole job is to pair a name with a number; an entry missing one is the feature not
// working, and that is now an assertion rather than an assumption.
//
// The layout is a PURE function for exactly this reason: "do two entries overlap at n = 100" is a
// question about arithmetic, and a test that rasterised a canvas to answer it would be measuring the
// rasteriser.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import {
  startBoardLayout,
  startBoardEntries,
  startBoardNumberBox,
  startRowOf,
  drawStartBoard,
  NO_NAME_LABEL,
} from './startBoardRendering.js';
import { raceNumberLabel } from '../../../modules/raceNumbers.js';

const CW = 1280;
const CH = 720;

/** A field of `n`, laid out `perRow` to a start row — the shape rowLayout actually produces. */
const field = (n, names = null) =>
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

/** A ctx that records what was drawn, so completeness can be asserted on the OUTPUT. */
function makeRecordingCtx() {
  const texts = [];
  const textCalls = [];
  return {
    texts,
    textCalls,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn((t, x, y) => {
      texts.push(String(t));
      textCalls.push({ t: String(t), x, y });
    }),
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

const draw = (n, extra = {}) => {
  const ctx = makeRecordingCtx();
  drawStartBoard(ctx, {
    racers: field(n),
    racerType: null,
    displaySize: 40,
    assignmentByRacer: rows(n),
    alpha: 1,
    canvasW: CW,
    canvasH: CH,
    ...extra,
  });
  return ctx;
};

describe('EVERY ENTRY CARRIES ITS NUMBER (START-BOARD-3)', () => {
  // WHAT BREAKS IF DELETED: the owner's reported defect, with nothing left to catch it. The board's
  // whole job is to pair a name with a number, and no other test in this file looks at whether a
  // number is drawn at all — which is precisely why the regression reached his eye.
  // WHAT GOES UNNOTICED WITHOUT IT: a board that lists a hundred names nobody can act on. It reads
  // as a working feature; it is the feature not working.
  it('draws one number per racer, at 40 and at 100', () => {
    for (const n of [40, 100]) {
      const ctx = draw(n);
      for (const r of field(n)) {
        const label = raceNumberLabel(r.raceNumber);
        const hits = ctx.texts.filter((t) => t === label);
        expect(hits.length, `number ${label} at n=${n}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  // WHAT BREAKS IF DELETED: the pairing itself. Numbers could all be drawn in one place, or on the
  // wrong line, and the test above would still pass.
  // WHAT GOES UNNOTICED: a number that belongs to the entry above it — worse than none, because a
  // viewer would carry the wrong number into the race.
  it('the number sits on its OWN line, inside its own column', () => {
    const ctx = draw(40);
    const L = startBoardLayout(40, CW, CH);
    const entries = startBoardEntries(field(40));
    for (let i = 0; i < entries.length; i++) {
      const { x, y } = L.cellAt(i);
      const midY = y + L.cellH / 2;
      const label = raceNumberLabel(entries[i].raceNumber);
      const call = ctx.textCalls.find((c) => c.t === label && Math.abs(c.y - midY) < 0.5);
      expect(call, `number ${label} on its own line`).toBeTruthy();
      // …and inside the number column, never drifting into the sprite or the name.
      expect(call.x).toBeGreaterThanOrEqual(x);
      expect(call.x).toBeLessThanOrEqual(x + startBoardNumberBox() * L.scale);
    }
  });

  // WHAT BREAKS IF DELETED: the pin. START-BOARD-2 narrowed the cell from 236 to 200 and the number
  // became unreadable; a future narrowing could squeeze the column to nothing and every other test
  // here would still pass.
  // WHAT GOES UNNOTICED: exactly the regression that happened once already.
  it('the number column is pinned and does not depend on the cell width', () => {
    // Wide enough for the widest label `raceNumberLabel` can return (three characters).
    expect(startBoardNumberBox()).toBeGreaterThanOrEqual(30);
    // And it is the same at every field size, i.e. it is not a share of the cell.
    const at = (n) => startBoardNumberBox() * startBoardLayout(n, CW, CH).scale;
    expect(at(8)).toBe(at(100));
    // Below full scale it shrinks WITH everything else, which is the fit-not-clip rule, not a
    // column that collapsed on its own.
    expect(at(140)).toBeLessThan(at(100));
  });

  it('a racer with no number still gets its line, and does not draw an empty one', () => {
    const racers = field(4);
    racers[2].raceNumber = null;
    const ctx = makeRecordingCtx();
    drawStartBoard(ctx, {
      racers,
      racerType: null,
      displaySize: 40,
      assignmentByRacer: rows(4, 4),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    expect(ctx.texts).toContain(racers[2].name); // the line is still there
    expect(ctx.texts).not.toContain(''); // and no empty string was painted
  });
});

describe('ONE ALPHABETICAL LIST, and the row rides along (START-BOARD-3)', () => {
  // WHAT BREAKS IF DELETED: the correction the owner asked for. Grouping was his idea and he
  // withdrew it — "you have to search each start row" — and nothing else asserts the list is whole.
  // WHAT GOES UNNOTICED: a board that looks orderly and cannot be scanned, which is what he saw.
  it('is ONE globally alphabetical list, not one list per start row', () => {
    // Names deliberately interleaved across rows: a per-row grouping would order them 0,1,2 then
    // 3,4,5; one global list orders them alphabetically across the whole field.
    const names = ['zoe', 'mia', 'bea', 'yan', 'cara', 'ada'];
    const sorted = startBoardEntries(field(6, names)).map((r) => r.name);
    expect(sorted).toEqual(['ada', 'bea', 'cara', 'mia', 'yan', 'zoe']);
  });

  // WHAT BREAKS IF DELETED: determinism of the order, which the render fingerprint hashes.
  // WHAT GOES UNNOTICED: `localeCompare` reads host ICU data, so the same code could order two
  // machines differently and the instrument would report a difference that is not a change.
  it('the ordering is case-insensitive and total — equal names fall back to the index', () => {
    expect(startBoardEntries(field(3, ['ADAM', 'adam', 'Adam'])).map((r) => r.index)).toEqual([
      0, 1, 2,
    ]);
  });

  // WHAT BREAKS IF DELETED: what the grouping was FOR. Dropping the grouping without the marker
  // would lose the information rather than relocate it.
  // WHAT GOES UNNOTICED: a viewer who finds their name and still cannot tell where they start.
  it('every entry carries its START ROW as a marker', () => {
    const ctx = draw(40);
    // 40 racers, 8 per row → rows R1..R5, and every entry has one.
    const markers = ctx.texts.filter((t) => /^R\d+$/.test(t));
    expect(markers.length).toBe(40);
    expect(new Set(markers)).toEqual(new Set(['R1', 'R2', 'R3', 'R4', 'R5']));
  });

  // WHAT BREAKS IF DELETED: requirement 2(b) — the marker must not be confused with the number.
  // WHAT GOES UNNOTICED: two numbers on one line, and a viewer carrying the wrong one to the race.
  it('the row marker is at the OPPOSITE end of the line from the number, and is prefixed', () => {
    const ctx = draw(40);
    const L = startBoardLayout(40, CW, CH);
    const entries = startBoardEntries(field(40));
    const { x, y } = L.cellAt(0);
    const midY = y + L.cellH / 2;
    const numCall = ctx.textCalls.find(
      (c) => c.t === raceNumberLabel(entries[0].raceNumber) && Math.abs(c.y - midY) < 0.5
    );
    const rowCall = ctx.textCalls.find((c) => /^R\d+$/.test(c.t) && Math.abs(c.y - midY) < 0.5);
    expect(numCall.x).toBeLessThan(x + L.cellW * 0.3); // the number is at the left
    expect(rowCall.x).toBeGreaterThan(x + L.cellW * 0.8); // the marker is at the right
    expect(rowCall.t.startsWith('R')).toBe(true); // …and it is not a bare digit
  });

  it('no start-row assignment means no marker, rather than a wrong one', () => {
    const ctx = draw(6, { assignmentByRacer: null });
    expect(ctx.texts.filter((t) => /^R\d+$/.test(t)).length).toBe(0);
    expect(startRowOf({ index: 0 }, null)).toBeNull();
  });

  it('the row marker is 1-based, because a viewer counts rows from one', () => {
    expect(startRowOf({ index: 0 }, new Map([[0, { rowIndex: 0 }]]))).toBe(1);
    expect(startRowOf({ index: 0 }, new Map([[0, { rowIndex: 6 }]]))).toBe(7);
  });
});

describe('the runners’ board is COMPLETE', () => {
  // WHAT BREAKS IF DELETED: the board's oldest promise. A viewer who cannot find their name has no
  // way to tell "not on the board" from "I missed it".
  // WHAT GOES UNNOTICED: a dropped racer — the shape of the defect he reported as "100 runners,
  // only 70 shown".
  it('every racer appears exactly once, at 40 and at 100', () => {
    for (const n of [40, 100]) {
      const ctx = draw(n);
      for (const r of field(n)) {
        expect(ctx.texts.filter((t) => t === r.name).length, `${r.name} at n=${n}`).toBe(1);
      }
    }
  });

  it('the layout has a distinct cell for every racer', () => {
    for (const n of [1, 7, 40, 100]) {
      const L = startBoardLayout(n, CW, CH);
      expect(L.cols * L.rows).toBeGreaterThanOrEqual(n);
      const seen = new Set(
        Array.from({ length: n }, (_, i) => {
          const c = L.cellAt(i);
          return `${Math.round(c.x)},${Math.round(c.y)}`;
        })
      );
      expect(seen.size, `distinct cells at n=${n}`).toBe(n);
    }
  });

  it('a racer with NO NAME still gets its number, its portrait and an explicit placeholder', () => {
    const racers = field(4);
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
    expect(ctx.texts).toContain('3');
    expect(drawRacer).toHaveBeenCalledTimes(4);
  });

  it('an unnamed racer sorts after the named ones rather than among the As', () => {
    const racers = field(3, ['bea', 'adam', 'cara']);
    delete racers[1].name;
    expect(startBoardEntries(racers).map((r) => r.index)).toEqual([0, 2, 1]);
  });
});

describe('the runners’ board is READABLE', () => {
  const cells = (n) => {
    const L = startBoardLayout(n, CW, CH);
    return Array.from({ length: n }, (_, i) => {
      const c = L.cellAt(i);
      return { x: c.x, y: c.y, w: L.cellW, h: L.cellH };
    });
  };
  const overlaps = (a, b) =>
    a.x < b.x + b.w - 1e-6 &&
    b.x < a.x + a.w - 1e-6 &&
    a.y < b.y + b.h - 1e-6 &&
    b.y < a.y + a.h - 1e-6;

  it('no two entries overlap, at 40 and at 100', () => {
    for (const n of [40, 100]) {
      const cs = cells(n);
      for (let i = 0; i < cs.length; i++)
        for (let j = i + 1; j < cs.length; j++)
          expect(overlaps(cs[i], cs[j]), `entries ${i} and ${j} overlap at n=${n}`).toBe(false);
    }
  });

  it('every entry is inside the canvas — at 40, at 100, and beyond', () => {
    for (const n of [1, 40, 100, 140]) {
      for (const c of cells(n)) {
        expect(c.x, `left at n=${n}`).toBeGreaterThanOrEqual(0);
        expect(c.y, `top at n=${n}`).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w, `right at n=${n}`).toBeLessThanOrEqual(CW);
        expect(c.y + c.h, `bottom at n=${n}`).toBeLessThanOrEqual(CH);
      }
    }
  });

  it('a small field gets a small block, not a strip across the screen', () => {
    const small = startBoardLayout(8, CW, CH);
    const big = startBoardLayout(100, CW, CH);
    expect(small.cols).toBeLessThan(big.cols);
    expect(small.blockW).toBeLessThan(big.blockW * 0.6);
    expect(small.originX + small.blockW / 2).toBeCloseTo(CW / 2, 6);
  });

  // WHAT BREAKS IF DELETED: the type size at the sizes that matter. The owner's rule is that he
  // would rather lengthen a beat than shrink the type.
  // WHAT GOES UNNOTICED: dropping the headings gave 10 slots back at n=100, which is what let the
  // cell widen from 200 to 236 — a later change that re-added slots would silently shrink it again.
  it('does not shrink at the sizes that matter — 100 fits at full size in the WIDER cell', () => {
    expect(startBoardLayout(8, CW, CH).scale).toBe(1);
    expect(startBoardLayout(40, CW, CH).scale).toBe(1);
    expect(startBoardLayout(100, CW, CH).scale).toBe(1);
    expect(startBoardLayout(140, CW, CH).scale).toBeLessThan(1);
  });
});

describe('the portrait is the shipped drawing function, in its neutral pose', () => {
  it('calls racerType.drawRacer once per racer, with frame 0 and no rings', () => {
    const drawRacer = vi.fn();
    drawStartBoard(makeRecordingCtx(), {
      racers: field(12),
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
      expect(frame).toBe(0);
      expect(racer.coatId).toBe('cream');
    }
  });

  it('the portrait is drawn LARGER than the ~21 px the first version used', () => {
    const drawRacer = vi.fn();
    drawStartBoard(makeRecordingCtx(), {
      racers: field(4),
      racerType: { drawRacer },
      displaySize: 40,
      assignmentByRacer: rows(4, 4),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    expect(drawRacer.mock.calls[0][7] * 40).toBeGreaterThan(25);
  });

  it('nothing is drawn between the sprite and the name', () => {
    const drawRacer = vi.fn();
    const ctx = makeRecordingCtx();
    const racers = field(1);
    drawStartBoard(ctx, {
      racers,
      racerType: { drawRacer },
      displaySize: 40,
      assignmentByRacer: rows(1, 1),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    const spriteX = drawRacer.mock.calls[0][1];
    const nameCall = ctx.textCalls.find((c) => c.t === racers[0].name);
    const numCall = ctx.textCalls.find((c) => c.t === '1');
    expect(numCall.x).toBeLessThan(spriteX);
    expect(spriteX).toBeLessThan(nameCall.x);
  });

  it('survives a racer type that cannot draw yet, rather than taking the frame down', () => {
    expect(() => draw(5, { racerType: undefined })).not.toThrow();
    expect(draw(5, { racerType: undefined }).texts).toContain('Racer 000');
  });

  it('draws nothing at all when it is not visible', () => {
    const ctx = draw(40, { alpha: 0 });
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.texts.length).toBe(0);
  });
});
