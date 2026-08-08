// ============================================================
// File:        startBoardRendering.test.js
// Path:        client/src/screens/RaceScreen/drawing/startBoardRendering.test.js
// Project:     RaceArena — START-BOARD-1, extended by -2, corrected by -3 and -4
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
  startBoardBackdrop,
  fitTextToWidth,
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

/**
 * A ctx that records what was drawn, so completeness can be asserted on the OUTPUT.
 *
 * It records the FILL STYLE AND FONT IN FORCE at each call, not only the geometry: START-BOARD-4 is
 * about whether the board can be READ, and every one of its three findings is a question about a
 * style rather than about a position.
 *
 * `measure` is injectable because the default — a constant 40 px for any string — can never make a
 * name too long, so it could not exercise the ellipsis at all.
 */
function makeRecordingCtx(measure = () => 40) {
  const texts = [];
  const textCalls = [];
  const rects = [];
  const ctx = {
    texts,
    textCalls,
    rects,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn((t) => ({ width: measure(String(t)) })),
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
  ctx.fillRect = vi.fn((x, y, w, h) => rects.push({ x, y, w, h, style: ctx.fillStyle }));
  ctx.fillText = vi.fn((t, x, y) => {
    texts.push(String(t));
    textCalls.push({ t: String(t), x, y, font: ctx.font, style: ctx.fillStyle });
  });
  return ctx;
}

/** The alpha of an `rgba(0,0,0,a)` fill, so the two backdrop layers can be compared as numbers. */
const alphaOf = (style) =>
  Number(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/.exec(style)?.[1] ?? NaN);

/** The px size out of a `bold 16px sans-serif` font string. */
const fontPx = (f) => Number(/(\d+(?:\.\d+)?)px/.exec(f)?.[1] ?? NaN);

const draw = (n, extra = {}, measure = undefined) => {
  const ctx = makeRecordingCtx(measure);
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

describe('THE BOARD IS READ OVER A MOVING TRACK (START-BOARD-4)', () => {
  // WHAT BREAKS IF DELETED: finding A. One flat scrim was the whole backdrop, and at 100 starters on
  // mountainstreet the racers' own bright numbers came through it exactly where the list is.
  // WHAT GOES UNNOTICED: a later simplification that drops the panel as redundant — the board would
  // still draw correctly and still be hard to read, which is the failure this file exists to catch.
  it('the board sits on its own backdrop, deeper than the scrim over the rest of the frame', () => {
    const ctx = draw(100);
    const scrim = ctx.rects.find((r) => r.x === 0 && r.y === 0 && r.w === CW && r.h === CH);
    const panel = ctx.rects.find((r) => r !== scrim && r.w > CW * 0.5);
    expect(scrim, 'the frame is still dimmed as a whole').toBeTruthy();
    expect(panel, 'the board has a backdrop of its own').toBeTruthy();
    expect(alphaOf(panel.style)).toBeGreaterThan(alphaOf(scrim.style));
    // …and the two together are near-opaque, which is what "nothing competes with a name" means.
    const composite = 1 - (1 - alphaOf(scrim.style)) * (1 - alphaOf(panel.style));
    expect(composite).toBeGreaterThan(0.9);
    // The relation is pinned at the source too, so it survives a change to how the fill is written.
    const { scrimAlpha, panelAlpha } = startBoardBackdrop();
    expect(panelAlpha).toBeGreaterThan(scrimAlpha);
  });

  // WHAT BREAKS IF DELETED: the backdrop covering only PART of what it must cover.
  // WHAT GOES UNNOTICED: a panel sized to the cells alone. The title would then sit on the thin
  // scrim, and the first row would have a bright edge running along it.
  it('the backdrop covers every entry, the title and padding around both — and stays in frame', () => {
    for (const n of [8, 40, 100, 140]) {
      const L = startBoardLayout(n, CW, CH);
      const p = L.panel;
      expect(p.x, `panel left at n=${n}`).toBeGreaterThanOrEqual(0);
      expect(p.y, `panel top at n=${n}`).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w, `panel right at n=${n}`).toBeLessThanOrEqual(CW);
      expect(p.y + p.h, `panel bottom at n=${n}`).toBeLessThanOrEqual(CH);
      // the title's line is inside it, with room above
      expect(L.titleY, `title inside the panel at n=${n}`).toBeGreaterThan(p.y);
      // every cell is inside it, with padding on all four sides
      for (let i = 0; i < n; i++) {
        const c = L.cellAt(i);
        expect(c.x, `cell ${i} left at n=${n}`).toBeGreaterThan(p.x);
        expect(c.y, `cell ${i} top at n=${n}`).toBeGreaterThan(p.y);
        expect(c.x + L.cellW, `cell ${i} right at n=${n}`).toBeLessThan(p.x + p.w);
        expect(c.y + L.cellH, `cell ${i} bottom at n=${n}`).toBeLessThan(p.y + p.h);
      }
    }
  });

  // WHAT BREAKS IF DELETED: finding B. "Barely readable, too small and too dark" was his report on a
  // number matched to the name at 13 px on a 16 % tint.
  // WHAT GOES UNNOTICED: a later tidy-up that unifies the two font sizes "for consistency" — the
  // board would look tidier and lose the one thing a viewer has to memorise.
  it('the number is drawn LARGER than the name, in white, on a chip with real opacity', () => {
    const ctx = draw(40);
    const numCall = ctx.textCalls.find((c) => c.t === '1');
    const nameCall = ctx.textCalls.find((c) => c.t === 'Racer 000');
    expect(fontPx(numCall.font)).toBeGreaterThan(fontPx(nameCall.font));
    expect(numCall.font).toMatch(/bold/);
    expect(numCall.style).toBe('#ffffff');
    // The chip behind it is opaque enough to BE a chip, not a 16 % tint.
    const L = startBoardLayout(40, CW, CH);
    const chip = ctx.rects.find((r) => Math.abs(r.x - (L.cellAt(0).x + 2 * L.scale)) < 0.5);
    expect(chip, 'the number sits on a chip').toBeTruthy();
    expect(alphaOf(chip.style)).toBeGreaterThan(0.5);
  });

  // WHAT BREAKS IF DELETED: the constraint the spec attached to the bigger number — that the room
  // comes from the NAME and never from the sprite.
  // WHAT GOES UNNOTICED: a portrait quietly shrinking every time the number grows.
  it('the wider number column took its room from the name, not from the portrait', () => {
    const drawRacer = vi.fn();
    const ctx = makeRecordingCtx();
    drawStartBoard(ctx, {
      racers: field(40),
      racerType: { drawRacer },
      displaySize: 40,
      assignmentByRacer: rows(40),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    // The portrait was NOT the donor. START-BOARD-5 later shrank it deliberately at the owner's
    // word (~30.1 → ~26.3), so the floor here is what this test is about: the number's column may
    // never take its room from the racer, and ~21 px is what "too small to recognise" looked like.
    expect(drawRacer.mock.calls[0][7] * 40).toBeGreaterThan(24);
    // …and the name now begins further right, i.e. it is the name's room that was spent.
    const L = startBoardLayout(40, CW, CH);
    const nameCall = ctx.textCalls.find((c) => c.t === 'Racer 000');
    expect(nameCall.x - L.cellAt(0).x).toBeGreaterThanOrEqual(startBoardNumberBox() * L.scale);
  });
});

describe('A CUT NAME LOOKS CUT (START-BOARD-4)', () => {
  // WHAT BREAKS IF DELETED: finding C. The clip rect is still there and would still stop a name
  // bleeding into the next column — silently, mid-word, which is exactly what he saw.
  // WHAT GOES UNNOTICED: the board claiming to show a name it only showed part of. This project
  // rejects an over-long name at the input rather than trimming it quietly; a frame owes the same.
  it('a name too long for its column is ellipsised, and one that fits is not', () => {
    // 9 px per character: 'Racer 000' (9 chars) fits the ~127 px column, a 40-character name does not.
    const wide = (t) => t.length * 9;
    const names = Array.from({ length: 4 }, (_, i) => (i === 1 ? 'W'.repeat(40) : `Racer ${i}`));
    const ctx = makeRecordingCtx(wide);
    drawStartBoard(ctx, {
      racers: field(4, names),
      racerType: null,
      displaySize: 40,
      assignmentByRacer: rows(4, 4),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    expect(ctx.texts, 'the long name was not drawn whole').not.toContain(names[1]);
    const cut = ctx.texts.find((t) => t.endsWith('…'));
    expect(cut, 'it ends in an ellipsis instead').toBeTruthy();
    expect(names[1].startsWith(cut.slice(0, -1))).toBe(true);
    expect(ctx.texts, 'a name that fits is left alone').toContain('Racer 0');
  });

  it('measures against the width it actually has, and degrades rather than throwing', () => {
    const ctx = makeRecordingCtx((t) => t.length * 10);
    expect(fitTextToWidth(ctx, 'abcdefgh', 1000)).toBe('abcdefgh');
    expect(fitTextToWidth(ctx, 'abcdefgh', 45)).toBe('abc…');
    expect(fitTextToWidth(ctx, 'abcdefgh', 5)).toBe('…');
    expect(fitTextToWidth(ctx, 'abcdefgh', 0)).toBe('');
    // A context that cannot measure gets the name whole rather than an exception.
    expect(fitTextToWidth({}, 'abcdefgh', 10)).toBe('abcdefgh');
  });
});

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
  // START-BOARD-5 moved the marker from the cell's right edge to immediately before the name — the
  // owner could not tell which name a far-right marker belonged to. What must NOT change is that it
  // is never mistaken for the race number, so the assertion is about the PORTRAIT standing between
  // them rather than about the cell's edges.
  it('the row marker sits behind the portrait and before the name, and is prefixed', () => {
    const drawRacer = vi.fn();
    const ctx = makeRecordingCtx();
    drawStartBoard(ctx, {
      racers: field(40),
      racerType: { drawRacer },
      displaySize: 40,
      assignmentByRacer: rows(40),
      alpha: 1,
      canvasW: CW,
      canvasH: CH,
    });
    const L = startBoardLayout(40, CW, CH);
    const entries = startBoardEntries(field(40));
    const { x, y } = L.cellAt(0);
    const midY = y + L.cellH / 2;
    const numCall = ctx.textCalls.find(
      (c) => c.t === raceNumberLabel(entries[0].raceNumber) && Math.abs(c.y - midY) < 0.5
    );
    const rowCall = ctx.textCalls.find((c) => /^R\d+$/.test(c.t) && Math.abs(c.y - midY) < 0.5);
    const nameCall = ctx.textCalls.find((c) => c.t === entries[0].name);
    const spriteX = drawRacer.mock.calls[0][1];
    expect(numCall.x).toBeLessThan(spriteX); // the number is still first…
    expect(rowCall.x).toBeGreaterThan(spriteX); // …the PORTRAIT stands between it and the marker…
    expect(rowCall.x).toBeLessThan(nameCall.x); // …and the marker leads its own name
    expect(rowCall.t.startsWith('R')).toBe(true); // …and it is not a bare digit
    // The marker is left-aligned in its own column, so the NAME starts at the same x on every line.
    const xs = new Set(
      entries.map((e) => ctx.textCalls.find((c) => c.t === e.name)?.x).map((v) => Math.round(v))
    );
    expect(xs.size, 'every name in the block starts at one of the column origins').toBe(L.cols);
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

  // START-BOARD-5 brought it DOWN from ~30.1 px to ~26.3 px at the owner's word. The floor here is
  // what the assertion is really about: it must stay clearly above the ~21 px of the first board,
  // because the colours and pattern are the whole reason a portrait is shown at all.
  it('the portrait is smaller than it was, and still clearly larger than the first version', () => {
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
    const px = drawRacer.mock.calls[0][7] * 40;
    expect(px).toBeGreaterThan(24); // still well above the first board's ~21
    expect(px).toBeLessThan(29); // …and smaller than START-BOARD-4's ~30.1
  });

  it('the ROW marker is the only thing between the sprite and the name', () => {
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
    const rowCall = ctx.textCalls.find((c) => /^R\d+$/.test(c.t));
    expect(numCall.x).toBeLessThan(spriteX);
    expect(spriteX).toBeLessThan(rowCall.x);
    expect(rowCall.x).toBeLessThan(nameCall.x);
    // …and there is nothing ELSE between them: the four texts on the line are number, row, name,
    // and nothing further.
    const online = ctx.textCalls.filter((c) => Math.abs(c.y - nameCall.y) < 0.5).map((c) => c.t);
    expect(online.sort()).toEqual(['1', 'R1', racers[0].name].sort());
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
