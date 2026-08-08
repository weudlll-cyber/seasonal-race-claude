// ============================================================
// File:        startBoardRendering.js
// Path:        client/src/screens/RaceScreen/drawing/startBoardRendering.js
// Project:     RaceArena — START-BOARD-1, rebuilt by -2, corrected by -3 after the owner's eye test
//
// THE RUNNERS' BOARD: every racer's NUMBER, the racer itself, its NAME and its START ROW, shown once
// during the start ceremony so a viewer can find their name and carry its number into the race.
//
// ── WHAT THE SECOND EYE TEST CHANGED (START-BOARD-3) ────────────────────────────────────────────
//
//   ONE ALPHABETICAL LIST AGAIN. START-BOARD-2 grouped the board by start row — the owner's own
//   idea, which he then withdrew after seeing it: *"now it is very hard to find your name again,
//   because you have to search each start row. That slipped past me when I thought of it."* He is
//   right, and the reason is worth keeping: an alphabetical list lets you jump; ten alphabetical
//   lists make you scan all ten, because you do not know which row you are in — which is the very
//   thing you came to the board to learn.
//
//   THE ROW SURVIVES AS A MARKER PER ENTRY. What the grouping was FOR — telling a viewer where
//   their racer starts — is now a small `R7` at the right end of the line, so name, number and row
//   are read in one line. It is deliberately UNLIKE the number: smaller, dimmer, prefixed, and at
//   the opposite end of the cell. See §THE ROW MARKER below.
//
//   THE NUMBER READS AS A NUMBER. His report was that the board had no numbers at all. It did — the
//   diagnosis is in reports/night/START-BOARD-3.md and the draw was never missing — but at 12 px in
//   pale blue, alone at the far left of the cell with a bold gold `ROW n` heading recurring in the
//   same strip, it read as column furniture rather than as this racer's number. It is now the same
//   size as the name and sits on its own chip, which is what makes it a badge instead of a stray
//   digit. The chip's width is PINNED by a test, so a future narrowing cannot swallow it silently.
//
// ── THE SPRITE IS THE SHIPPED DRAWING FUNCTION, AND THE STILL POSE IS FREE ───────────────────────
// It calls `racerType.drawRacer` — the same function the race uses — rather than a copy.
// `SpriteRacerType._getFrameIndex(frame, speed)` is `floor(((frame % period) / period) *
// frameCount)`, so **`frame = 0` selects sheet frame 0 for any speed and any racer type**. Passing 0
// is a neutral, deterministic portrait pose. `isLeader` and `isComeback` are false: nobody leads yet.
//
// ── EVERY RACER THAT STARTS APPEARS, NAMED OR NOT ───────────────────────────────────────────────
// A racer with no name gets its number, its portrait and an explicit `— no name —` placeholder. A
// blank row is indistinguishable from a bug, and this board's whole promise is that the field on
// screen is the field in the race.
//
// ── SCREEN SPACE ────────────────────────────────────────────────────────────────────────────────
// Drawn with NO camera transform, so one unit is one screen pixel. `drawRacer` sizes its sprite as
// `displaySize × displaySizeScale` in the units of the current transform, so the caller passes a
// scale computed from the portrait height it wants — not the race's scale, which is a world number.
// ============================================================

import { raceNumberLabel } from '../../../modules/raceNumbers.js';

// ── THE CELL ────────────────────────────────────────────────────────────────────────────────────
// NUMBER · SPRITE · NAME · ROW, left to right. The number and the sprite are fixed columns; the name
// takes what is left; the row marker is right-aligned inside the cell's own right edge.
//
// CELL_W IS BACK TO 236 (START-BOARD-3). START-BOARD-2 narrowed it to 200 for one reason: grouping
// cost a heading slot per start row, so a hundred racers needed 110 slots and 236 px could only fit
// 100 at full size. The headings are gone, so 100 racers is 100 slots again and 5 × 20 × 236 px fits
// exactly. The 36 px goes to the name, which is what a long roster needs most.
const CELL_W = 236;
const CELL_H = 30;
// THE NUMBER'S COLUMN IS PINNED, and `startBoardNumberBox` exists so a test can assert it rather
// than a comment claiming it. This is the column that quietly stopped reading as a number when the
// cell narrowed; the guard is that it does not depend on CELL_W at all.
const NUMBER_BOX = 38;
const SPRITE_BOX = 32; // the portrait, immediately left of the name
const NAME_PAD = 5;
// The row marker's column at the cell's right end. Small — `R12` at 10 px is about 20 px.
const ROW_BOX = 26;

// The block's shape. Rows are chosen first and columns follow: it is the row count that decides
// whether a block reads as a list, and a rule that picks columns first turns a small field into a
// strip across the screen.
const MAX_COLS = 5;
const MAX_ROWS = 20;
const MIN_ROWS = 6;

const TITLE_H = 26;
const MARGIN_X = 34;
const MARGIN_Y = 34;

/** The placeholder for a racer that reached the start line without a name. */
export const NO_NAME_LABEL = '— no name —';

/**
 * The number column's width in screen px, at scale 1.
 *
 * EXPORTED SO A TEST CAN PIN IT. The owner's report was that the board had no numbers; the column
 * was never actually removed, but a narrowing that squeezed it would produce exactly that symptom
 * and nothing would have failed. A test asserts both that this is wide enough for the widest label
 * `raceNumberLabel` can return and that every entry draws one.
 */
export function startBoardNumberBox() {
  return NUMBER_BOX;
}

/**
 * The board's entries, in the order they are shown: ONE GLOBALLY ALPHABETICAL LIST.
 *
 * ALPHABETICAL BY LOWERCASED NAME, NOT `localeCompare`: its result depends on the host's ICU data,
 * and this ordering is drawn into a frame the render fingerprint hashes — an order that differs
 * between two machines would make that instrument report a difference that is not a change. Ties
 * break on racer index, so the sort is total. Unnamed racers sort LAST, because a placeholder is not
 * a name and should not sit among the As.
 *
 * @param {Array} racers
 * @returns {Array} the same racer objects, sorted; never a copy of their contents
 */
export function startBoardEntries(racers) {
  if (!Array.isArray(racers)) return [];
  const key = (r) => String(r?.name ?? '').toLowerCase();
  return [...racers].sort((a, b) => {
    const an = key(a);
    const bn = key(b);
    if (!an !== !bn) return an ? -1 : 1;
    if (an < bn) return -1;
    if (an > bn) return 1;
    return (a?.index ?? 0) - (b?.index ?? 0);
  });
}

/** A racer's start row, 1-based for display, or null when no assignment is available. */
export function startRowOf(racer, assignmentByRacer) {
  const row = assignmentByRacer?.get?.(racer?.index)?.rowIndex;
  return Number.isFinite(row) ? row + 1 : null;
}

/**
 * Where every entry goes.
 *
 * PURE, and separated from the drawing on purpose: "does the board overlap or clip at 100 racers"
 * is a question about arithmetic, and a test that had to rasterise a canvas to answer it would be
 * measuring the rasteriser.
 *
 * @param {number} count  number of entries
 * @param {number} canvasW
 * @param {number} canvasH
 * @returns {object} geometry plus `cellAt(i)`, the top-left of the i-th entry in COLUMN-MAJOR order
 */
export function startBoardLayout(count, canvasW, canvasH) {
  const n = Math.max(0, count | 0);

  let rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.ceil(n / MAX_COLS)));
  rows = Math.max(1, Math.min(rows, n || 1));
  const cols = Math.max(1, Math.ceil(n / rows));

  // FIT RATHER THAN CLIP. Past the size the grid was built for, everything is scaled by the limiting
  // ratio instead, so "no overlap, no clipping" holds for any field rather than for the ones tried.
  const availW = canvasW - MARGIN_X * 2;
  const availH = canvasH - MARGIN_Y * 2 - TITLE_H;
  const scale = Math.min(1, availW / (cols * CELL_W), availH / (rows * CELL_H));

  const cellW = CELL_W * scale;
  const cellH = CELL_H * scale;
  const blockW = cols * cellW;
  const blockH = rows * cellH;
  const originX = (canvasW - blockW) / 2;
  const originY = (canvasH - blockH) / 2 + TITLE_H * scale * 0.5;

  return {
    cols,
    rows,
    cellW,
    cellH,
    scale,
    originX,
    originY,
    blockW,
    blockH,
    titleY: originY - TITLE_H * scale * 0.85,
    // COLUMN-MAJOR: entry i sits at column floor(i/rows), row i%rows — so an alphabetical list reads
    // DOWN a column and then across, which is how a start list is read.
    cellAt(i) {
      return {
        x: originX + Math.floor(i / rows) * cellW,
        y: originY + (i % rows) * cellH,
      };
    },
  };
}

/**
 * Draw the board.
 *
 * @param {CanvasRenderingContext2D} ctx  screen space; no camera transform is applied here
 * @param {object} p
 * @param {Array} p.racers  every racer in the race
 * @param {object} p.racerType  the race's racer type — its `drawRacer` is called, not a copy
 * @param {number} p.displaySize  the racer type's own displaySize, to size the portrait
 * @param {Map|null} p.assignmentByRacer  racer.index → { rowIndex }, for the row marker
 * @param {number} p.alpha  0..1 from `boardAlphaAt`
 * @param {number} p.canvasW
 * @param {number} p.canvasH
 */
export function drawStartBoard(
  ctx,
  { racers, racerType, displaySize, assignmentByRacer = null, alpha, canvasW, canvasH }
) {
  if (!(alpha > 0) || !Array.isArray(racers) || racers.length === 0) return;
  const entries = startBoardEntries(racers);
  const L = startBoardLayout(entries.length, canvasW, canvasH);

  ctx.save();
  ctx.globalAlpha = alpha;

  // The scrim. It is what makes a name readable over a moving track; without it the board would be
  // legible on the venue shot and illegible by the end of the push.
  ctx.fillStyle = 'rgba(0,0,0,0.66)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(17 * L.scale)}px sans-serif`;
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`STARTERS · ${entries.length}`, canvasW / 2, L.titleY);

  const numberBox = NUMBER_BOX * L.scale;
  const spriteBox = SPRITE_BOX * L.scale;
  const namePad = NAME_PAD * L.scale;
  const rowBox = ROW_BOX * L.scale;
  const nameFont = Math.round(13 * L.scale);
  // THE NUMBER IS THE SAME SIZE AS THE NAME. At 12 px against a 13 px name it read as a subscript;
  // the two things a viewer has to carry away should look equally important.
  const numFont = Math.round(13 * L.scale);
  const rowFont = Math.round(10 * L.scale);
  const portraitPx = spriteBox * 0.94;
  const spriteScale = displaySize > 0 ? portraitPx / displaySize : 1;

  for (let i = 0; i < entries.length; i++) {
    const r = entries[i];
    const { x, y } = L.cellAt(i);
    const midY = y + L.cellH / 2;

    // 1. THE NUMBER, ON ITS OWN CHIP. The chip is what makes it read as a badge rather than as a
    //    stray digit in the column gutter — the regression the owner reported. It is drawn FIRST so
    //    nothing else can be mistaken for it, and its column never depends on the cell's width.
    const chipH = L.cellH * 0.66;
    const chipW = numberBox - 6 * L.scale;
    ctx.fillStyle = 'rgba(159,232,255,0.16)';
    ctx.fillRect(x + 2 * L.scale, midY - chipH / 2, chipW, chipH);
    ctx.textAlign = 'center';
    ctx.font = `bold ${numFont}px sans-serif`;
    ctx.fillStyle = '#bdf0ff';
    if (r?.raceNumber != null) {
      ctx.fillText(raceNumberLabel(r.raceNumber), x + 2 * L.scale + chipW / 2, midY);
    }

    // 2. THE PORTRAIT, through the shipped drawing function. frame = 0 is the neutral pose.
    if (racerType?.drawRacer) {
      ctx.save();
      ctx.globalAlpha = alpha;
      racerType.drawRacer(
        ctx,
        x + numberBox + spriteBox / 2,
        midY,
        0,
        r,
        false, // no leader ring — nobody is leading before the gun
        0, // THE NEUTRAL POSE: sheet frame 0, for any speed and any racer type
        spriteScale,
        false
      );
      ctx.restore();
    }

    // 3. THE NAME, immediately after the portrait with NOTHING between them, and CLIPPED to the room
    //    left after the row marker so a long name can never run into it or into the next column.
    const nameX = x + numberBox + spriteBox + namePad;
    const nameW = L.cellW - numberBox - spriteBox - namePad - rowBox;
    ctx.save();
    ctx.beginPath();
    ctx.rect(nameX, y, nameW, L.cellH);
    ctx.clip();
    ctx.textAlign = 'left';
    const named = r?.name != null && String(r.name).length > 0;
    ctx.font = named ? `${nameFont}px sans-serif` : `italic ${nameFont}px sans-serif`;
    ctx.fillStyle = named ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.fillText(named ? String(r.name) : NO_NAME_LABEL, nameX, midY);
    ctx.restore();

    // 4. THE ROW MARKER — what the grouping was for, per entry.
    //
    //    IT MUST NOT BE MISTAKEN FOR THE NUMBER, and four things separate them rather than one: it
    //    is at the OPPOSITE END of the cell, it is SMALLER (10 px against 13), it is DIM GREY
    //    against the number's bright blue, and it carries an `R` PREFIX. Any one of those alone
    //    would be a weak distinction at a glance across a hundred entries; together they are not.
    const row = startRowOf(r, assignmentByRacer);
    if (row != null) {
      ctx.textAlign = 'right';
      ctx.font = `${rowFont}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillText(`R${row}`, x + L.cellW - 4 * L.scale, midY);
    }
  }

  ctx.restore();
}
