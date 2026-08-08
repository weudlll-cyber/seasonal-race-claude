// ============================================================
// File:        startBoardRendering.js
// Path:        client/src/screens/RaceScreen/drawing/startBoardRendering.js
// Project:     RaceArena — START-BOARD-1, rebuilt by -2, corrected by -3 and -4 after two eye tests
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
//   their racer starts — is a small `R7` on the line itself, so name, number and row are read
//   together. START-BOARD-5 moved it from the cell's right edge to immediately BEFORE the name; see
//   §THE CELL for why, and for what keeps it from being read as a second race number.
//
//   THE NUMBER READS AS A NUMBER. His report was that the board had no numbers at all. It did — the
//   diagnosis is in reports/night/START-BOARD-3.md and the draw was never missing — but at 12 px in
//   pale blue, alone at the far left of the cell with a bold gold `ROW n` heading recurring in the
//   same strip, it read as column furniture rather than as this racer's number. It moved onto its own
//   chip, which is what makes it a badge instead of a stray digit. The chip's width is PINNED by a
//   test, so a future narrowing cannot swallow it silently.
//
// ── WHAT THE THIRD EYE TEST CHANGED (START-BOARD-4) ─────────────────────────────────────────────
//
//   Mountainstreet, 100 starters, over a moving track. Three findings, all about READING the board
//   rather than about what is on it:
//
//   THE BOARD HAS ITS OWN BACKDROP NOW. One flat scrim across the whole canvas cannot be right for
//   both jobs at once: dark enough behind a hundred names is darker than the venue shot wants to be
//   everywhere. So the scrim stays a moderate dim of the FRAME, and the board sits on its own panel
//   — the entries, the title and the padding around them — which is deepened separately. See
//   §THE BACKDROP.
//
//   THE NUMBER IS BIGGER THAN THE NAME, NOT EQUAL TO IT. START-BOARD-3 matched it to the name at
//   13 px on a 16 % tint, and over a bright track that still read as faint. The number is one of the
//   two things a viewer must carry away, so it now outranks the name rather than tying with it:
//   larger, white, on a chip with real opacity. Its column grew with it, and the room came from the
//   NAME — never from the sprite, which is the other thing he has to carry away.
//
//   A CUT NAME LOOKS CUT. Several names ended mid-word at the clip rect with nothing to say anything
//   had been removed. This project rejects an over-long name at the INPUT rather than trimming it
//   quietly, and the same principle applies to a frame: the clip is still there as a backstop, but a
//   name that does not fit is now measured and ends in an ellipsis.
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
// NUMBER · PORTRAIT · ROW · NAME, left to right (START-BOARD-5). The first three are fixed columns
// and the name takes what is left, so every name in a column starts at the same x — which is what
// makes an alphabetical list scannable.
//
// THE ROW MOVED IN FRONT OF THE NAME, and it is the owner's correction. It was right-aligned at the
// cell's far edge, and with a short name there is a gap of empty pixels between the name and its
// marker — he could not tell which name the marker belonged to. Immediately before the name, there
// is nothing to mistake.
//
// IT MUST NOT COME TO SIT BESIDE THE RACE NUMBER: two numbers side by side is the confusion
// START-BOARD-4's badge was built to remove. It stays BEHIND the portrait, which is what keeps them
// apart, and it keeps every other separation it had — smaller than the name, dimmer than white, and
// an `R` prefix.
//
// CELL_W IS BACK TO 236 (START-BOARD-3). START-BOARD-2 narrowed it to 200 for one reason: grouping
// cost a heading slot per start row, so a hundred racers needed 110 slots and 236 px could only fit
// 100 at full size. The headings are gone, so 100 racers is 100 slots again and 5 × 20 × 236 px fits
// exactly. The 36 px went to the name, which is what a long roster needs most — and START-BOARD-4
// gave 8 of them back to the number, which needs them more (see NUMBER_BOX).
const CELL_W = 236;
const CELL_H = 30;
// THE NUMBER'S COLUMN IS PINNED, and `startBoardNumberBox` exists so a test can assert it rather
// than a comment claiming it. This is the column that quietly stopped reading as a number when the
// cell narrowed; the guard is that it does not depend on CELL_W at all.
//
// 38 → 46 IN START-BOARD-4, and the room came from the NAME. The number went from 13 px to 16 px
// bold, and a three-character label at that size measures about 29 px — which would have left barely
// 3 px of chip around it. The sprite was deliberately NOT the donor: the portrait and the number are
// the two things a viewer must carry away, and shrinking one to enlarge the other trades a defect
// for a defect.
const NUMBER_BOX = 46;
// THE PORTRAIT'S COLUMN, 32 → 28 in START-BOARD-5 at the owner's word that it "may be a little
// smaller". The drawn portrait is 94 % of it, so it goes from ~30.1 px to ~26.3 px — down an eighth,
// still well above the ~21 px the first board used, and the colours and pattern are what has to stay
// readable because they are the whole reason a portrait is on the board at all.
//
// THE COLUMN SHRANK, NOT ONLY THE DRAWING. Lowering the 94 % alone would have made the racer smaller
// and left the freed pixels as padding; the name is what needs them.
const SPRITE_BOX = 28;
const PORTRAIT_FRAC = 0.94; // how much of its column the portrait actually fills
const NAME_PAD = 5;
// The row marker's column, between the portrait and the name. `R12` at 12 px is about 24 px, and the
// marker is left-aligned in it so the NAME always starts at the same x.
//
// 26 → 30 IN START-BOARD-6, because the marker itself grew. His words on the 10 px version, with a
// screenshot: legible only if you already know it is there. The 4 px come from the NAME, which is
// the only column that can give them — the number and the portrait are the two things he has to
// carry away from the board.
const ROW_BOX = 30;

// The block's shape. Rows are chosen first and columns follow: it is the row count that decides
// whether a block reads as a list, and a rule that picks columns first turns a small field into a
// strip across the screen.
const MAX_COLS = 5;
const MAX_ROWS = 20;
const MIN_ROWS = 6;

const TITLE_H = 26;
const MARGIN_X = 34;
const MARGIN_Y = 34;

// ── THE BACKDROP ────────────────────────────────────────────────────────────────────────────────
// TWO LAYERS, BECAUSE ONE CANNOT DO BOTH JOBS. The scrim dims the FRAME so the board is not read
// against a moving track; the panel darkens only what the board occupies, so a name never has to
// compete with a racer's own bright number showing through behind it. That is the exact spot the
// owner struggled with at 100 starters on mountainstreet: the scrim was uniform, and the bright
// pixels behind the list were brighter than a flat 0.66 dim could hide.
//
// The numbers are chosen so the panel is near-opaque without the frame going black: 0.72 over the
// frame, then 0.86 over the panel, which composites to 1 − 0.28 × 0.14 ≈ 0.96. Behind the board that
// is effectively black; outside it the venue is still visible, which is what the ceremony is for.
const SCRIM_ALPHA = 0.72;
const PANEL_ALPHA = 0.86;
// The panel's own padding around the block. It has to cover the TITLE too, which sits above the
// block, so the top pad is measured from the title's line rather than from the first row.
const PANEL_PAD_X = 26;
const PANEL_PAD_Y = 18;

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
 * The two backdrop opacities, EXPORTED SO A TEST CAN ASSERT THE RELATION rather than the values.
 *
 * What must hold is that the board's own area is measurably darker than the rest of the frame — a
 * flat single scrim is what made a name compete with the bright racer behind it. The numbers
 * themselves are a judgement call and the owner's eye is the authority on them; the ORDERING is not,
 * and that is what the test pins.
 */
export function startBoardBackdrop() {
  return { scrimAlpha: SCRIM_ALPHA, panelAlpha: PANEL_ALPHA };
}

/**
 * Shorten `text` until it fits `maxW`, ending in an ellipsis when anything was removed.
 *
 * A CUT NAME MUST LOOK CUT. The clip rect below is a backstop that guarantees a name cannot bleed
 * into the row marker or the next column, but a clip is silent: it ends a word mid-letter and the
 * frame gives no sign that a name was longer than the board could show. This project's rule for
 * names is to reject at the input rather than trim quietly, and the drawn frame owes the same
 * honesty.
 *
 * Binary search on the character count, so the cost is log(n) measurements per over-long name rather
 * than one per character. Returns the ellipsis alone when not even one character fits, and the text
 * unchanged when the context cannot measure — a board with no ellipsis is a smaller failure than a
 * board that throws.
 *
 * @param {CanvasRenderingContext2D} ctx  its CURRENT font is what gets measured
 * @param {string} text
 * @param {number} maxW  available width in screen px
 * @returns {string} the string to draw
 */
export function fitTextToWidth(ctx, text, maxW) {
  const s = String(text ?? '');
  if (typeof ctx?.measureText !== 'function') return s;
  if (!(maxW > 0)) return '';
  if (ctx.measureText(s).width <= maxW) return s;
  const ELLIPSIS = '…';
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(s.slice(0, mid) + ELLIPSIS).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo) + ELLIPSIS;
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
  const titleY = originY - TITLE_H * scale * 0.85;

  // THE PANEL COVERS WHAT THE BOARD OCCUPIES — every cell, the title above them, and the padding
  // around both. Clamped to the canvas so the promise "nothing the board draws leaves the frame"
  // holds for the backdrop too, not only for the entries.
  const panelTop = titleY - TITLE_H * scale * 0.5 - PANEL_PAD_Y * scale;
  const panelBottom = originY + blockH + PANEL_PAD_Y * scale;
  const panelLeft = originX - PANEL_PAD_X * scale;
  const panelRight = originX + blockW + PANEL_PAD_X * scale;
  const panel = {
    x: Math.max(0, panelLeft),
    y: Math.max(0, panelTop),
    w: Math.min(canvasW, panelRight) - Math.max(0, panelLeft),
    h: Math.min(canvasH, panelBottom) - Math.max(0, panelTop),
  };

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
    titleY,
    panel,
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

  // 1. THE SCRIM over the whole frame, and 2. THE PANEL under the board itself. Two layers, because
  //    a single flat dim cannot be right for both: it was 0.66 everywhere, and at 100 starters on
  //    mountainstreet the racers' own bright numbers showed through it exactly where the list is.
  //    The panel composites on top of the scrim, so the board's area ends up near-opaque while the
  //    venue outside it stays visible.
  ctx.fillStyle = `rgba(0,0,0,${SCRIM_ALPHA})`;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = `rgba(0,0,0,${PANEL_ALPHA})`;
  ctx.fillRect(L.panel.x, L.panel.y, L.panel.w, L.panel.h);

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
  // THE NUMBER OUTRANKS THE NAME. START-BOARD-3 matched the two at 13 px on the reasoning that they
  // are equally important; over a bright track that was still reported as barely readable. They are
  // not in fact equal — a viewer can find their name by scanning, but the NUMBER is the thing they
  // have to memorise and carry into the race, and it has three characters to the name's twenty to
  // make its case with. 16 px bold, white, on a chip with real opacity.
  const numFont = Math.round(16 * L.scale);
  // THE MARKER READS AS A MARKER (START-BOARD-6). 10 px at 42 % white was a watermark: his report,
  // with a screenshot, was that it is legible only if you already know it is there. 12 px at 72 %.
  //
  // IT IS STILL BELOW THE NAME IN WEIGHT, which is the constraint that keeps it from becoming a
  // second number: 12 px against the name's 13 and the number's 16 bold, 72 % against the name's
  // solid white and the number's white-on-a-chip. Bigger and brighter than it was, smaller and
  // dimmer than both things it must not be confused with — and the portrait still stands between it
  // and the number chip.
  const rowFont = Math.round(12 * L.scale);
  const portraitPx = spriteBox * PORTRAIT_FRAC;
  const spriteScale = displaySize > 0 ? portraitPx / displaySize : 1;

  for (let i = 0; i < entries.length; i++) {
    const r = entries[i];
    const { x, y } = L.cellAt(i);
    const midY = y + L.cellH / 2;

    // 1. THE NUMBER, ON ITS OWN CHIP. The chip is what makes it read as a badge rather than as a
    //    stray digit in the column gutter — the regression the owner reported. It is drawn FIRST so
    //    nothing else can be mistaken for it, and its column never depends on the cell's width.
    //    THE CHIP CARRIES REAL OPACITY, not a tint. At 16 % of a pale blue over a near-black panel a
    //    chip is barely a chip; the number then had to do all the work alone. A solid deep blue reads
    //    as a badge at a glance and gives white text about 6:1 against it, which is what makes the
    //    digits legible over a track rather than only over a still.
    const chipH = L.cellH * 0.72;
    const chipW = numberBox - 8 * L.scale;
    ctx.fillStyle = 'rgba(23,92,128,0.92)';
    ctx.fillRect(x + 2 * L.scale, midY - chipH / 2, chipW, chipH);
    ctx.textAlign = 'center';
    ctx.font = `bold ${numFont}px sans-serif`;
    ctx.fillStyle = '#ffffff';
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

    // 3. THE ROW MARKER, immediately before the name it belongs to (START-BOARD-5).
    //
    //    LEFT-ALIGNED IN ITS OWN COLUMN rather than butted against the name, so the NAME always
    //    starts at the same x whether the marker reads `R1` or `R12`. A name column that jiggled by
    //    a character's width would undo what the alphabetical list is for.
    //
    //    IT IS STILL UNLIKE THE NUMBER, and three of the four separations survive the move: SMALLER
    //    (12 px against 16), DIMMER with no chip against the number's white on deep blue, and an
    //    `R` PREFIX. The fourth was position, and the portrait now does that job — the marker never
    //    comes to sit beside the race number, which is the confusion the badge removed.
    const row = startRowOf(r, assignmentByRacer);
    const rowX = x + numberBox + spriteBox;
    if (row != null) {
      ctx.textAlign = 'left';
      ctx.font = `${rowFont}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText(`R${row}`, rowX, midY);
    }

    // 4. THE NAME, ELLIPSISED when it does not fit and still CLIPPED as a backstop. The clip alone
    //    was silent — a name ended mid-word at the rect and the frame said nothing had been removed.
    //    The measurement happens AFTER the font is set, because that is what `measureText` answers
    //    about.
    const nameX = rowX + rowBox + namePad;
    const nameW = L.cellW - numberBox - spriteBox - rowBox - namePad;
    ctx.save();
    ctx.beginPath();
    ctx.rect(nameX, y, nameW, L.cellH);
    ctx.clip();
    ctx.textAlign = 'left';
    const named = r?.name != null && String(r.name).length > 0;
    ctx.font = named ? `${nameFont}px sans-serif` : `italic ${nameFont}px sans-serif`;
    ctx.fillStyle = named ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.fillText(fitTextToWidth(ctx, named ? String(r.name) : NO_NAME_LABEL, nameW), nameX, midY);
    ctx.restore();
  }

  ctx.restore();
}
