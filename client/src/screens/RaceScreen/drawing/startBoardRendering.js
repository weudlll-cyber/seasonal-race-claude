// ============================================================
// File:        startBoardRendering.js
// Path:        client/src/screens/RaceScreen/drawing/startBoardRendering.js
// Project:     RaceArena — START-BOARD-1, rebuilt by START-BOARD-2 after the owner's eye test
//
// THE RUNNERS' BOARD: every racer's NUMBER, the racer itself, and its NAME, shown once during the
// start ceremony so a viewer can find their name and carry its number into the race.
//
// ── WHAT THE EYE TEST CHANGED ───────────────────────────────────────────────────────────────────
// Three of his four findings are here (the fourth, TIME, is in startCeremony.js — the board now has
// its own duration and the countdown follows it):
//
//   PAIRING. *"The little symbols are hard to attribute to the right racer, they sit far from the
//   name."* The entry was SPRITE · NUMBER · NAME, so the number sat between a racer and its own
//   name. It is now **NUMBER · SPRITE · NAME with nothing between the sprite and the name**: the
//   number is the row's left anchor, and the two things that must read as one thing are adjacent.
//
//   GROUPING BY START ROW. His idea, and a good one: *"first all racers of start row 1, then row 2
//   — then the viewers already know which row their racer is in."* The board is now one block per
//   start row, in row order, alphabetical WITHIN each row so a name is still findable. It turns one
//   hundred-name search into a heading jump plus a short scan, which is also what makes the
//   80 ms-per-name budget in defaults.js defensible.
//
//   PORTRAIT SIZE. He said the symbols are hard to attribute and named the distance; part of it is
//   SIZE. Moving the number out of the middle freed its whole gutter, so the portrait grew from
//   ~21 px to ~30 px — a 1.4x in each direction, about double the area — inside a cell that is
//   otherwise unchanged. It cost nothing, so it was taken.
//
// ── EVERY RACER THAT STARTS APPEARS, NAMED OR NOT ───────────────────────────────────────────────
// A racer with no name gets its number, its portrait and an explicit `— no name —` placeholder. A
// blank row is indistinguishable from a bug, and this board's whole promise is that the field on
// screen is the field in the race. (Today no racer reaches it unnamed — see the block's report for
// what actually causes a short field — but the board must not be the thing that hides it if one
// ever does.)
//
// ── THE SPRITE IS THE SHIPPED DRAWING FUNCTION, AND THE STILL POSE IS FREE ───────────────────────
// It calls `racerType.drawRacer` — the same function the race uses — rather than a copy.
// `SpriteRacerType._getFrameIndex(frame, speed)` is `floor(((frame % period) / period) *
// frameCount)`, so **`frame = 0` selects sheet frame 0 for any speed and any racer type**. Passing 0
// is a neutral, deterministic portrait pose, and no racer type had to learn what standing still
// means. `isLeader` and `isComeback` are false: nobody is leading before the gun.
//
// ── SCREEN SPACE ────────────────────────────────────────────────────────────────────────────────
// Drawn with NO camera transform, so one unit is one screen pixel. `drawRacer` sizes its sprite as
// `displaySize × displaySizeScale` in the units of the current transform, so the caller passes a
// scale computed from the portrait height it wants — not the race's scale, which is a world number.
// ============================================================

import { raceNumberLabel } from '../../../modules/raceNumbers.js';

// ── THE CELL, and the block it tiles ────────────────────────────────────────────────────────────
// One row of the board: NUMBER · SPRITE · NAME, left to right, never overlapping, because the name
// is CLIPPED to what is left rather than allowed to run into the next column.
// CELL_W 200 IS SET BY THE WORST CASE, NOT BY TASTE. Grouping costs a heading slot per start row,
// so a hundred racers in ten rows is 110 slots, not 100 — and the previous 236 px cell could only
// fit 100 at full size, so 100 racers came out at scale 0.73. The owner's rule is that he would
// rather lengthen a beat than shrink the type, so the cell narrows instead: 6 x 200 px is exactly
// the width available, and 6 x 20 rows holds 120 slots at scale 1.0.
//
// WHAT 200 COSTS: the name gets 129 px, about 19 characters at 13 px. The shipped roster's longest
// name is 8 characters and the two long rosters reach 23, so the long ones clip their last few
// characters at the very worst case. A clipped tail on one name beats a shrunken board for all of
// them — and the ROW GROUPING means a viewer is scanning ~10 names, not 100, so a partial name is
// still identifiable.
const CELL_W = 200;
const CELL_H = 30;
const NUMBER_BOX = 34; // right-aligned gutter for "#12" — the row's left anchor
const SPRITE_BOX = 32; // the portrait, immediately left of the name
const NAME_PAD = 5;

// The block's shape. Rows are chosen first and columns follow: it is the row count that decides
// whether a block reads as a list, and a rule that picks columns first turns a small field into a
// strip across the screen.
const MAX_COLS = 6;
const MAX_ROWS = 20;
const MIN_ROWS = 6;

const HEADING_H = 26; // the "ROW 1" heading above each group
const TITLE_H = 26; // the board's own title
const MARGIN_X = 34;
const MARGIN_Y = 34;

/** The placeholder for a racer that reached the start line without a name. */
export const NO_NAME_LABEL = '— no name —';

/**
 * Group the field by START ROW, in row order, alphabetical within each row.
 *
 * ALPHABETICAL BY LOWERCASED NAME, NOT `localeCompare`: its result depends on the host's ICU data,
 * and this ordering is drawn into a frame the render fingerprint hashes — an order that differs
 * between two machines would make that instrument report a difference that is not a change. Ties
 * break on racer index, so the sort is total. Unnamed racers sort last within their row, because a
 * placeholder is not a name and should not sit among the As.
 *
 * @param {Array} racers
 * @param {Map|null} assignmentByRacer  racer.index → { rowIndex }; absent means one group
 * @returns {Array<{row:number, label:string, racers:Array}>} groups in row order
 */
export function startBoardGroups(racers, assignmentByRacer = null) {
  if (!Array.isArray(racers) || racers.length === 0) return [];
  const rowOf = (r) => {
    const a = assignmentByRacer?.get?.(r?.index);
    const row = a?.rowIndex;
    return Number.isFinite(row) ? row : 0;
  };
  const byRow = new Map();
  for (const r of racers) {
    const row = rowOf(r);
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(r);
  }
  const sortKey = (r) => String(r?.name ?? '').toLowerCase();
  return [...byRow.keys()]
    .sort((a, b) => a - b)
    .map((row) => ({
      row,
      label: `ROW ${row + 1}`,
      racers: byRow.get(row).sort((a, b) => {
        const an = sortKey(a);
        const bn = sortKey(b);
        // An unnamed racer sorts after every named one, then by index so it is still deterministic.
        if (!an !== !bn) return an ? -1 : 1;
        if (an < bn) return -1;
        if (an > bn) return 1;
        return (a?.index ?? 0) - (b?.index ?? 0);
      }),
    }));
}

/**
 * Where every entry goes.
 *
 * PURE, and separated from the drawing on purpose: "does the board overlap or clip at 100 racers"
 * is a question about arithmetic, and a test that had to rasterise a canvas to answer it would be
 * measuring the rasteriser.
 *
 * THE GROUPS ARE LAID OUT AS ONE CONTINUOUS COLUMN-MAJOR RUN with a heading slot before each group,
 * rather than a fresh block per row. A block per row would leave ragged half-empty columns whenever
 * a row's size did not divide the column height — at 40 racers in 5 rows of 8 that is five stubs
 * across the screen. Treating headings as entries that happen to be wide keeps the block dense and
 * keeps every promise the flat version made.
 *
 * @param {Array<{racers:Array}>} groups  from `startBoardGroups`
 * @param {number} canvasW
 * @param {number} canvasH
 * @returns {object} geometry plus `slots`, one per heading and per racer, in draw order
 */
export function startBoardLayout(groups, canvasW, canvasH) {
  // Every group costs one heading slot plus one slot per racer.
  const slotCount = groups.reduce((n, g) => n + 1 + g.racers.length, 0);

  let rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.ceil(slotCount / MAX_COLS)));
  rows = Math.max(1, Math.min(rows, slotCount || 1));
  const cols = Math.max(1, Math.ceil(slotCount / rows));

  // FIT RATHER THAN CLIP. Past the size the grid was built for, everything is scaled by the
  // limiting ratio instead, so "no overlap, no clipping" holds for any field rather than for the
  // ones that were tried.
  const availW = canvasW - MARGIN_X * 2;
  const availH = canvasH - MARGIN_Y * 2 - TITLE_H;
  const scale = Math.min(1, availW / (cols * CELL_W), availH / (rows * CELL_H));

  const cellW = CELL_W * scale;
  const cellH = CELL_H * scale;
  const blockW = cols * cellW;
  const blockH = rows * cellH;
  const originX = (canvasW - blockW) / 2;
  const originY = (canvasH - blockH) / 2 + TITLE_H * scale * 0.5;

  const at = (i) => ({
    x: originX + Math.floor(i / rows) * cellW,
    y: originY + (i % rows) * cellH,
  });

  const slots = [];
  let i = 0;
  for (const g of groups) {
    slots.push({ kind: 'heading', label: g.label, ...at(i++) });
    for (const r of g.racers) slots.push({ kind: 'racer', racer: r, ...at(i++) });
  }

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
    slotCount,
    titleY: originY - TITLE_H * scale * 0.85,
    slots,
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
 * @param {Map|null} p.assignmentByRacer  racer.index → { rowIndex }, for the grouping
 * @param {number} p.alpha  0..1 from `boardAlphaAt`
 * @param {number} p.canvasW
 * @param {number} p.canvasH
 */
export function drawStartBoard(
  ctx,
  { racers, racerType, displaySize, assignmentByRacer = null, alpha, canvasW, canvasH }
) {
  if (!(alpha > 0) || !Array.isArray(racers) || racers.length === 0) return;
  const groups = startBoardGroups(racers, assignmentByRacer);
  const L = startBoardLayout(groups, canvasW, canvasH);

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
  ctx.fillText(`STARTERS · ${racers.length}`, canvasW / 2, L.titleY);

  const numberBox = NUMBER_BOX * L.scale;
  const spriteBox = SPRITE_BOX * L.scale;
  const namePad = NAME_PAD * L.scale;
  const nameFont = Math.round(13 * L.scale);
  const numFont = Math.round(12 * L.scale);
  const headFont = Math.round(12 * L.scale);
  // `drawRacer` sizes the sprite as displaySize × scale in CURRENT units, and current units are
  // screen pixels here — so the scale is "the portrait height I want" over "the type's own size".
  const portraitPx = spriteBox * 0.94;
  const spriteScale = displaySize > 0 ? portraitPx / displaySize : 1;

  for (const slot of L.slots) {
    const midY = slot.y + L.cellH / 2;

    if (slot.kind === 'heading') {
      ctx.textAlign = 'left';
      ctx.font = `bold ${headFont}px sans-serif`;
      ctx.fillStyle = '#ffd700';
      ctx.fillText(slot.label, slot.x + 2 * L.scale, midY);
      // A rule under the heading, so a group reads as a group rather than as a bold entry.
      ctx.strokeStyle = 'rgba(255,215,0,0.45)';
      ctx.lineWidth = Math.max(1, 1 * L.scale);
      ctx.beginPath();
      ctx.moveTo(slot.x + 2 * L.scale, midY + L.cellH * 0.34);
      ctx.lineTo(slot.x + L.cellW - 8 * L.scale, midY + L.cellH * 0.34);
      ctx.stroke();
      continue;
    }

    const r = slot.racer;

    // 1. THE NUMBER — the row's left anchor, right-aligned in its gutter so every number in a
    //    column lines up whatever its width.
    ctx.textAlign = 'right';
    ctx.font = `bold ${numFont}px sans-serif`;
    ctx.fillStyle = '#9fe8ff';
    if (r?.raceNumber != null) {
      ctx.fillText(raceNumberLabel(r.raceNumber), slot.x + numberBox, midY);
    }

    // 2. THE PORTRAIT, through the shipped drawing function. frame = 0 is the neutral pose.
    if (racerType?.drawRacer) {
      ctx.save();
      ctx.globalAlpha = alpha;
      racerType.drawRacer(
        ctx,
        slot.x + numberBox + spriteBox / 2,
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

    // 3. THE NAME, immediately after the portrait with NOTHING between them, and CLIPPED to its own
    //    cell so a long name can never run into the next column. Clipping loses the tail of one
    //    name; overflow loses two whole rows.
    const nameX = slot.x + numberBox + spriteBox + namePad;
    ctx.save();
    ctx.beginPath();
    ctx.rect(nameX, slot.y, L.cellW - numberBox - spriteBox - namePad, L.cellH);
    ctx.clip();
    ctx.textAlign = 'left';
    const named = r?.name != null && String(r.name).length > 0;
    ctx.font = named ? `${nameFont}px sans-serif` : `italic ${nameFont}px sans-serif`;
    ctx.fillStyle = named ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.fillText(named ? String(r.name) : NO_NAME_LABEL, nameX, midY);
    ctx.restore();
  }

  ctx.restore();
}
