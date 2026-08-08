// ============================================================
// File:        startBoardRendering.js
// Path:        client/src/screens/RaceScreen/drawing/startBoardRendering.js
// Project:     RaceArena — START-BOARD-1
//
// THE RUNNERS' BOARD: every racer's NAME, its NUMBER, and the racer itself, shown once during the
// push in — the beat where the camera travels from the venue shot down to the formation.
//
// WHAT IT IS FOR: a viewer arrives knowing a name and has to leave the board knowing a NUMBER and a
// COAT, because those are the two things they can follow once the race starts. The number is drawn
// on the track (RACE-NUMBERS-1) and the coat is derived from the player's name, so it is the same in
// every race — this is the one place the pairing is stated.
//
// WHY A BLOCK IN COLUMNS AND NOT A ROLL. It is meant to be SCANNED, not read: a viewer looks for one
// name among up to a hundred. A list that scrolls or reveals one entry at a time makes finding your
// own name a matter of luck about when you looked. Everything is on screen at once, alphabetical,
// reading DOWN each column and then across — the order a start list has always used.
//
// ── THE SPRITE IS THE SHIPPED DRAWING FUNCTION, AND THE STILL POSE IS FREE ───────────────────────
// It calls `racerType.drawRacer` — the same function the race uses — rather than a copy. The one
// thing a portrait needs that a race does not is a POSE: the racer is not moving, so "which frame of
// the walk cycle" has no natural answer.
//
// It needed no change to the drawing function, and it is worth writing down why rather than leaving
// the next reader to re-derive it. `SpriteRacerType._getFrameIndex(frame, speed)` is
// `floor(((frame % period) / period) * frameCount)`, so **`frame = 0` selects sheet frame 0 for any
// speed and any racer type**. Passing 0 is therefore a neutral, deterministic portrait pose, and no
// racer type had to learn what "standing still" means. The board also asks for `isLeader = false`
// and `isComeback = false`, so neither ring is drawn: on the board nobody is leading yet.
//
// ── SCREEN SPACE ────────────────────────────────────────────────────────────────────────────────
// Drawn with NO camera transform, so one unit is one screen pixel. `drawRacer` sizes its sprite as
// `displaySize × displaySizeScale` in the units of the current transform, so the caller passes a
// scale computed from the portrait height it wants — not the race's scale, which is a world number.
// ============================================================

import { raceNumberLabel } from '../../../modules/raceNumbers.js';

// ── THE CELL, and the block it tiles ────────────────────────────────────────────────────────────
// One row of the board. The three parts are laid out left to right and never overlap, because the
// name is CLIPPED to what is left rather than allowed to run into the next column.
const CELL_W = 236;
const CELL_H = 26;
const SPRITE_BOX = 26; // the portrait's own column within the cell
const NUMBER_BOX = 34; // right-aligned gutter for "#12"
const NAME_PAD = 6;

// The block's shape. MAX_COLS × MAX_ROWS is 100 entries at full size, which is the field size the
// owner asked it to hold; beyond that `fit` shrinks rather than clips (see `startBoardLayout`).
const MAX_COLS = 5;
const MAX_ROWS = 20;
// A small field must not become a one-row strip across the whole screen. Six is the shortest column
// that still reads as a list rather than as a caption.
const MIN_ROWS = 6;

const HEADING_H = 30;
const MARGIN_X = 40;
const MARGIN_Y = 44;

/**
 * Where every entry goes, for a given field size and canvas.
 *
 * PURE, and separated from the drawing on purpose: "does the board overlap or clip at 100 racers"
 * is a question about arithmetic, and a test that has to rasterise a canvas to answer it would be
 * measuring the wrong thing.
 *
 * @param {number} count  number of racers
 * @param {number} canvasW
 * @param {number} canvasH
 * @returns {{cols, rows, cellW, cellH, scale, originX, originY, blockW, blockH, cellAt}}
 *   `cellAt(i)` gives the top-left of the i-th entry in COLUMN-MAJOR order.
 */
export function startBoardLayout(count, canvasW, canvasH) {
  const n = Math.max(0, count | 0);
  // Rows first, columns from rows: it is the row count that decides whether the block reads as a
  // list, and the column count that follows from how many there are.
  let rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.ceil(n / MAX_COLS)));
  rows = Math.max(1, Math.min(rows, n || 1));
  const cols = Math.max(1, Math.ceil(n / rows));

  // FIT RATHER THAN CLIP. Past 100 racers the block would run off the canvas; everything is scaled
  // by the limiting ratio instead, so "no overlap, no clipping" holds for any field size rather
  // than for the ones that were tried.
  const availW = canvasW - MARGIN_X * 2;
  const availH = canvasH - MARGIN_Y * 2 - HEADING_H;
  const rawW = cols * CELL_W;
  const rawH = rows * CELL_H;
  const scale = Math.min(1, availW / rawW, availH / rawH);

  const cellW = CELL_W * scale;
  const cellH = CELL_H * scale;
  const blockW = cols * cellW;
  const blockH = rows * cellH;
  const originX = (canvasW - blockW) / 2;
  const originY = (canvasH - blockH) / 2 + HEADING_H * scale * 0.5;

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
    headingY: originY - HEADING_H * scale * 0.9,
    // COLUMN-MAJOR: entry i sits at column floor(i/rows), row i%rows — so an alphabetical list
    // reads DOWN a column and then across, which is how a start list is read.
    cellAt(i) {
      const col = Math.floor(i / rows);
      const row = i % rows;
      return { x: originX + col * cellW, y: originY + row * cellH };
    },
  };
}

/**
 * The board's entries, in the order they are shown.
 *
 * ALPHABETICAL BY NAME, case-insensitively, tie-broken by the racer's index. `localeCompare` is
 * deliberately NOT used: its result depends on the host's ICU data, and this ordering is drawn into
 * a frame the render fingerprint hashes — an ordering that can differ between two machines would
 * make that instrument report a difference that is not a change.
 *
 * @param {Array} racers
 * @returns {Array} the same racer objects, sorted; never a copy of their contents
 */
export function startBoardEntries(racers) {
  if (!Array.isArray(racers)) return [];
  return [...racers].sort((a, b) => {
    const an = String(a?.name ?? '').toLowerCase();
    const bn = String(b?.name ?? '').toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return (a?.index ?? 0) - (b?.index ?? 0);
  });
}

/**
 * How visible the board is at a moment of the ceremony, 0..1.
 *
 * IT LIVES IN THE PUSH AND NOWHERE ELSE. `progress` is the push beat's own 0..1, which
 * `startCeremony.ceremonyAt` already computes for the camera — the board asks the same function the
 * same question rather than owning a second schedule. It fades in as the camera leaves the venue
 * shot and is GONE before the push ends, so the settled beat holds the formation clean and the gun
 * fires on a picture with nothing over it.
 *
 * @param {string} beat  CEREMONY_BEAT value
 * @param {number} progress  0..1 within that beat
 * @returns {number} alpha
 */
export function startBoardAlpha(beat, progress) {
  if (beat !== 'push') return 0;
  const p = Math.min(1, Math.max(0, progress));
  const FADE_IN = 0.12;
  const FADE_OUT = 0.15; // gone at p = 1 - FADE_OUT + FADE_OUT = 1, i.e. before the settled beat
  if (p < FADE_IN) return p / FADE_IN;
  if (p > 1 - FADE_OUT) return Math.max(0, (1 - p) / FADE_OUT);
  return 1;
}

/**
 * Draw the board.
 *
 * @param {CanvasRenderingContext2D} ctx  screen space; no camera transform is applied here
 * @param {object} p
 * @param {Array} p.racers  every racer in the race
 * @param {object} p.racerType  the race's racer type — its `drawRacer` is called, not a copy of it
 * @param {number} p.displaySize  the racer type's own displaySize, to size the portrait
 * @param {number} p.alpha  0..1 from `startBoardAlpha`
 * @param {number} p.canvasW
 * @param {number} p.canvasH
 */
export function drawStartBoard(ctx, { racers, racerType, displaySize, alpha, canvasW, canvasH }) {
  if (!(alpha > 0) || !Array.isArray(racers) || racers.length === 0) return;
  const entries = startBoardEntries(racers);
  const L = startBoardLayout(entries.length, canvasW, canvasH);

  ctx.save();
  ctx.globalAlpha = alpha;

  // The scrim. It is what makes a name readable over a moving track; without it the board would be
  // legible on the venue shot and illegible by the end of the push.
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(17 * L.scale)}px sans-serif`;
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`STARTERS · ${entries.length}`, canvasW / 2, L.headingY);

  const spriteBox = SPRITE_BOX * L.scale;
  const numberBox = NUMBER_BOX * L.scale;
  const namePad = NAME_PAD * L.scale;
  const nameFont = Math.round(13 * L.scale);
  const numFont = Math.round(12 * L.scale);
  // `drawRacer` sizes the sprite as displaySize × scale in CURRENT units, and current units are
  // screen pixels here — so the scale is "the portrait height I want" over "the type's own size".
  const portraitPx = spriteBox * 0.82;
  const spriteScale = displaySize > 0 ? portraitPx / displaySize : 1;

  for (let i = 0; i < entries.length; i++) {
    const r = entries[i];
    const { x, y } = L.cellAt(i);
    const midY = y + L.cellH / 2;

    // The portrait, through the shipped drawing function. frame = 0 is the neutral pose (header).
    if (racerType?.drawRacer) {
      ctx.save();
      ctx.globalAlpha = alpha;
      racerType.drawRacer(
        ctx,
        x + spriteBox / 2,
        midY,
        0, // angle: facing along the row, the way the type's own baseRotationOffset intends
        r,
        false, // no leader ring — nobody is leading before the gun
        0, // THE NEUTRAL POSE: sheet frame 0, for any speed and any racer type
        spriteScale,
        false // no comeback ring either
      );
      ctx.restore();
    }

    ctx.textAlign = 'right';
    ctx.font = `bold ${numFont}px sans-serif`;
    ctx.fillStyle = '#9fe8ff';
    if (r?.raceNumber != null) {
      ctx.fillText(raceNumberLabel(r.raceNumber), x + spriteBox + numberBox, midY);
    }

    // The name is CLIPPED to its own cell, so a long name can never run into the next column. The
    // alternative — letting it overflow — turns one long name into two unreadable entries.
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      x + spriteBox + numberBox + namePad,
      y,
      L.cellW - spriteBox - numberBox - namePad,
      L.cellH
    );
    ctx.clip();
    ctx.textAlign = 'left';
    ctx.font = `${nameFont}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(r?.name ?? ''), x + spriteBox + numberBox + namePad, midY);
    ctx.restore();
  }

  ctx.restore();
}
