// ============================================================
// boardPortraitFit.test.js — BOARD-PORTRAIT-FIT-1
//
// SABOTAGE — the defect was a caller believing `displaySizeScale` sizes a portrait. It sizes ONE
//   axis, the body's NARROW one; the other follows the sprite's proportions and every shipped type
//   lays it ACROSS the screen (baseRotationOffset = 90°). The board's own comment claimed the drawn
//   portrait was "~26.3 px", and 26.3 px was only ever its height — 13 of 20 types overflowed their
//   column into the number chip beside them, the worst by 17.9 px.
//   What breaks if I delete this: the board can go back to `portraitPx / displaySize`, and the only
//   symptom is a picture nobody is looking at until a race starts.
//
// IT ASSERTS THE RULE OVER EVERY SHIPPED TYPE, not over the beetle. The beetle is where it was
// found and it is SEVENTH worst; a test that pinned the beetle would have pinned the instance and
// left the class. That is the distinction this fortnight has been about.
// ============================================================

import { describe, it, expect } from 'vitest';
import { RACER_TYPES } from '../../../modules/racer-types/index.js';
import { drawStartBoard } from './startBoardRendering.js';

// The board's own geometry, at scale 1 (startBoardRendering.js).
const SPRITE_BOX = 28;
const PORTRAIT_FRAC = 0.94;
const CELL_H = 30;
const NUMBER_BOX = 46;
const BOX_W = SPRITE_BOX * PORTRAIT_FRAC;
const BOX_H = CELL_H * PORTRAIT_FRAC;

// The portrait's centre sits at x + NUMBER_BOX + SPRITE_BOX/2; the number chip ends at
// x + 2 + (NUMBER_BOX - 8). So the portrait may spread this far left before it touches the chip.
const GAP_TO_CHIP = SPRITE_BOX / 2 + 6;

const types = Object.entries(RACER_TYPES);

/** A canvas context that records nothing and refuses nothing — the board only needs it to not throw. */
function fakeCtx() {
  const noop = () => {};
  return {
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    clip: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    rect: noop,
    ellipse: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    drawImage: noop,
    fillText: noop,
    strokeText: noop,
    setTransform: noop,
    measureText: (t) => ({ width: String(t).length * 6 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    set font(_v) {},
    get font() {
      return '10px sans-serif';
    },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowBlur: 0,
    shadowColor: '',
  };
}

describe('BOARD-PORTRAIT-FIT-1 — a portrait fits its column', () => {
  it('there are types to measure at all — a pass over an empty list is not a pass', () => {
    expect(types.length).toBeGreaterThan(10);
  });

  it('★ EVERY shipped type fits the portrait box on BOTH axes', () => {
    const over = [];
    for (const [id, t] of types) {
      const box = t.getBodyBox(t.getPortraitFitScale(BOX_W, BOX_H));
      if (box.w > BOX_W + 0.01 || box.h > BOX_H + 0.01)
        over.push(`${id} ${box.w.toFixed(1)}x${box.h.toFixed(1)}`);
    }
    expect(over, `types spilling out of ${BOX_W.toFixed(1)}x${BOX_H.toFixed(1)}`).toEqual([]);
  });

  it('★ and therefore NONE of them reaches the number chip', () => {
    const hits = [];
    for (const [id, t] of types) {
      const half = t.getBodyBox(t.getPortraitFitScale(BOX_W, BOX_H)).w / 2;
      if (half > GAP_TO_CHIP + 0.01) hits.push(`${id} by ${(half - GAP_TO_CHIP).toFixed(1)}px`);
    }
    expect(hits).toEqual([]);
  });

  it('★ the OLD rule really did overflow, and on many types — the fault was never one sprite', () => {
    // Pinned so that "13 of 20" cannot quietly become "1 of 20" in a later reading of the history.
    // If this ever fails, the sprites changed, not the board.
    const old = [];
    for (const [id, t] of types) {
      const legacyScale = BOX_W / t.config.displaySize; // what the board used to pass
      if (t.getBodyBox(legacyScale).w / 2 > GAP_TO_CHIP) old.push(id);
    }
    expect(old.length).toBeGreaterThanOrEqual(10);
    expect(old).toContain('beetle');
    expect(old, 'the horse is worse than the beetle and is the default on most tracks').toContain(
      'horse'
    );
  });

  it('the beetle is NOT the biggest — it is mid-table, which is why the fix is not about it', () => {
    const ranked = types
      .map(([id, t]) => ({ id, w: t.getBodyBox(BOX_W / t.config.displaySize).w }))
      .sort((a, b) => b.w - a.w);
    const beetleRank = ranked.findIndex((r) => r.id === 'beetle');
    expect(beetleRank).toBeGreaterThan(3);
    expect(ranked[0].id).not.toBe('beetle');
  });

  it('a type whose body is square is unchanged — the fix costs nothing where nothing was wrong', () => {
    // The duck's body fills its frame evenly, so width was never the binding constraint and the new
    // scale must equal the old one. A "fix" that shrank every portrait would be a different defect.
    const duck = RACER_TYPES.duck;
    const legacy = BOX_W / duck.config.displaySize;
    expect(duck.getPortraitFitScale(BOX_W, BOX_H)).toBeCloseTo(legacy, 6);
  });

  it('getBodyBox scales linearly, which is what lets one measurement answer the fit', () => {
    const horse = RACER_TYPES.horse;
    const a = horse.getBodyBox(1);
    const b = horse.getBodyBox(2);
    expect(b.w).toBeCloseTo(a.w * 2, 6);
    expect(b.h).toBeCloseTo(a.h * 2, 6);
  });

  it('★ the RACE is not touched — the fit helper is UI-only and the narrow-axis contract stands', () => {
    // `displaySizeScale` must still mean "the visible narrow body is displaySize x scale", because
    // body fill feeds row layout and contact braking. A racer that shrank to fit a box on the track
    // would change who wins.
    for (const [, t] of types) {
      const cfg = t.config;
      const box = t.getBodyBox(1);
      const narrow = Math.min(box.w, box.h);
      expect(narrow).toBeCloseTo(cfg.displaySize * cfg.silhouetteScale, 4);
    }
  });
  // ── THE WIRING, which the tests above do NOT cover and a sabotage proved they do not ──────────
  //
  // Everything above measures `getPortraitFitScale`'s arithmetic. Reverting the BOARD to
  // `portraitPx / displaySize` left all of them green, because none of them ever asked what the
  // board passes. A rule the caller does not use is a rule that is not in force, and a test that
  // cannot tell the difference is worse than none — it reports a fix that is not there.

  it('★ the BOARD asks the type for a fit, and draws at exactly the scale it got back', () => {
    const horse = RACER_TYPES.horse;
    let asked = null;
    let drawnScale = null;
    const spyType = {
      config: horse.config,
      getPortraitFitScale(w, h) {
        asked = { w, h };
        return horse.getPortraitFitScale(w, h);
      },
      drawRacer(_ctx, _x, _y, _angle, _r, _lead, _frame, displaySizeScale) {
        drawnScale = displaySizeScale;
      },
    };

    drawStartBoard(fakeCtx(), {
      racers: [{ index: 0, name: 'Ann', raceNumber: 1 }],
      racerType: spyType,
      displaySize: horse.config.displaySize,
      alpha: 1,
      canvasW: 1280,
      canvasH: 720,
    });

    expect(asked, 'the board must ASK the type, not compute a scale of its own').not.toBeNull();
    expect(asked.w).toBeGreaterThan(0);
    expect(asked.h).toBeGreaterThan(0);
    expect(drawnScale).toBeCloseTo(horse.getPortraitFitScale(asked.w, asked.h), 9);
    // And the scale it used is NOT the one the old rule would have given.
    expect(drawnScale).not.toBeCloseTo(asked.w / horse.config.displaySize, 6);
  });

  it('a type WITHOUT the helper still gets drawn — the board degrades, it does not vanish', () => {
    let drawnScale = null;
    drawStartBoard(fakeCtx(), {
      racers: [{ index: 0, name: 'Ann', raceNumber: 1 }],
      racerType: {
        config: RACER_TYPES.duck.config,
        drawRacer(_c, _x, _y, _a, _r, _l, _f, s) {
          drawnScale = s;
        },
      },
      displaySize: 40,
      alpha: 1,
      canvasW: 1280,
      canvasH: 720,
    });
    expect(drawnScale).toBeCloseTo(BOX_W / 40, 6);
  });
});
