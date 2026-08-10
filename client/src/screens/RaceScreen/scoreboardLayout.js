// ============================================================
// File:        scoreboardLayout.js
// Path:        client/src/screens/RaceScreen/scoreboardLayout.js
// Project:     RaceArena — SCOREBOARD-SLOT-LAYER
//
// THE STANDINGS' GEOMETRY AND ITS COLOURS, in a plain module so that everything which needs them
// reads the same copy: the two layer components, the container that sizes itself from them, the
// component tests, and the node-side parity test — which cannot import a `.jsx` file at all.
//
// EVERY NUMBER BELOW WAS MEASURED IN A REAL BROWSER, never chosen. Neither node nor jsdom does
// layout, so nothing in the test suite can re-derive them; what the tests can do — and do — is pin
// the CSS inputs each one depends on, so a change to the padding or the font fails and asks for a
// re-measurement rather than silently overlapping the list.
// ============================================================

/**
 * THE VERTICAL DISTANCE FROM ONE ROW'S TOP TO THE NEXT, in CSS pixels — the shipped spacing of the
 * standings, and the one number both layers place themselves with.
 *
 * IT IS THE SHIPPED VALUE, KEPT DELIBERATELY, and this block re-measured what it actually describes
 * rather than repeating the claim it inherited. A rendered row is **31.333 px tall on the owner's
 * 1.5x display and 32.000 on a 1:1 one** — the browser snaps the badge's border box to whole device
 * pixels and the badge is the tallest thing in the row — so the row height is not a constant at all
 * and 35.333 is not "height plus the 4 px margin" on either display. It is simply the spacing the
 * list ships with and the one the owner has looked at, which is why it does not move here.
 *
 * The `margin-bottom: 4px` on the card is INERT and has been since the rows left the flow: an
 * absolutely positioned box with `top` set and no `bottom` is unaffected by its bottom margin. It is
 * kept only because removing it is a visible-surface change with no benefit; the pitch is this
 * number and nothing else.
 *
 * Row height is not needed as a constant anywhere: the card reserves the badge's column with a
 * spacer that carries the badge's own box metrics, so both layers DERIVE the same height from one
 * CSS rule, on any display. See `.sb-rank, .sb-badge-spacer` in RaceScreen.css.
 */
export const ROW_PITCH_PX = 35.333;

/** Gold / silver / bronze. PLACE-bound, not racer-bound: first, second and third are coloured, and
 *  the racer standing there is whoever is standing there. Confirmed against the shipped list. */
export const RANK_PALETTE = ['#ffd700', '#c0c0c0', '#cd7f32'];

/** The fallbacks the old row spelled inline as `?? '#888'`, `?? '#444'` and `?? '#ddd'`. */
export const RANK_TEXT_FALLBACK = '#888';
export const RANK_BORDER_FALLBACK = '#444';
export const CARD_TEXT_FALLBACK = '#ddd';

/** The badge's text colour for a 1-based place. */
export const rankTextColor = (rank) => RANK_PALETTE[rank - 1] ?? RANK_TEXT_FALLBACK;
/** The badge's border colour for a 1-based place. */
export const rankBorderColor = (rank) => RANK_PALETTE[rank - 1] ?? RANK_BORDER_FALLBACK;
/** The CARD's text colour for a 1-based place — the name and, by inheritance, the race number. */
export const cardTextColor = (rank) => RANK_PALETTE[rank - 1] ?? CARD_TEXT_FALLBACK;
/** What the badge for a 1-based place reads. First place is crowned rather than numbered. */
export const rankLabel = (rank) => (rank === 1 ? '👑' : `#${rank}`);
/** Where a 1-based place sits, in CSS pixels from the top of the rows container. */
export const slotOffsetPx = (rank) => (rank - 1) * ROW_PITCH_PX;

/**
 * THE BADGE COLUMN'S WIDTH, chosen ONCE from the field size — never per row.
 *
 * THE DEFECT IT FIXES, which is the owner's: the column was a hard 28 px, sized for two digits, and
 * `#100` needs 37.2. His screenshot shows the text spilling out of its rounded box. It is not only a
 * hundred-racer problem — measured, a two-digit `#99` needs 31.4 and already overflows by about
 * 1.7 px a side today, which is small enough to read as kerning and is why it was never reported.
 *
 * MEASURED max-content widths of a real `.sb-rank` (700 12px Inter, 1 px border, 3 px side padding),
 * using the WIDEST digit so the entry is an upper bound for every place of that length:
 *   `#9` 23.594 · `#99` 31.375 · `#999` 39.172 · `#9999` 46.969  (crown 24.484, never the widest)
 *
 * ONE WIDTH FOR THE WHOLE COLUMN, and it must be: the badge column is a separate LAYER from the
 * cards, and the two only line up if every slot and every card reserve the same first column. A
 * badge that grew per row would put the icons of the top nine rows in a different place from the
 * rest.
 *
 * THE 28 px FLOOR is today's column, kept as a floor on purpose: a field of nine or fewer is then
 * pixel-for-pixel what it always was, and only fields that actually need more get more.
 *
 * @param {number} fieldSize  how many racers are in this race — the widest place it can produce
 * @returns {number} the column width in CSS pixels
 */
export const BADGE_MIN_WIDTH_PX = 28;
const BADGE_MAX_CONTENT_PX = [23.594, 31.375, 39.172, 46.969];
export function badgeWidthPx(fieldSize) {
  const n = Math.max(1, Math.floor(Number(fieldSize) || 1));
  const digits = Math.min(String(n).length, BADGE_MAX_CONTENT_PX.length);
  return Math.max(BADGE_MIN_WIDTH_PX, Math.ceil(BADGE_MAX_CONTENT_PX[digits - 1]));
}
