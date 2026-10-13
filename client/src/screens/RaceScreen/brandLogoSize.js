// ============================================================
// File:        brandLogoSize.js
// Path:        client/src/screens/RaceScreen/brandLogoSize.js
// Project:     RaceArena — BRAND-LOGO-SCALE-1
// Created:     2026-10-13
// Description: How tall the in-race corner brand logo is drawn, from the size of the race picture.
//
// WHY THIS EXISTS. The logo is a DOM `<img>` over the race canvas (`BrandLogoOverlay.jsx`), and its
// height used to be the profile's `logoMaxHeight` in CSS pixels at every picture size. The canvas
// underneath scales with the window, the logo did not — so on a phone, where the picture is about
// 370x208 CSS px, a 90 px logo covered more than 40% of the picture's height. The owner saw it in
// Chrome's device mode on 2026-10-13 and found it far too large.
//
// THE RULE. The logo's height is a proportion of the picture's SHORTER side, capped at
// `logoMaxHeight` — today's size, which stays the profile's setting and gains no new control. The
// proportion is `logoMaxHeight / FULL_SIZE_SHORT_SIDE_CSS_PX`: the logo is at full size on any
// picture whose shorter side is at least that many CSS px, and below it shrinks in step with the
// picture, keeping the share of the picture it has on a picture of exactly that size (one sixth of
// the height for the default 90 px).
//
// WHY 540. It is a 960x540 picture — half of full HD in each direction — and it is chosen so that
// every desktop window keeps today's logo to the pixel: at a 1280 px wide window the race picture is
// about 1036x583 CSS px (the standings column takes the rest), and even a vertical scrollbar leaves
// it above 1020x574. 540 sits well under both, so the cap holds there with room to spare, and a
// phone (a picture about 207 px tall) gets a logo of about 34 px instead of 90.
//
// THE CORNER AND MARGIN are not computed here: `BrandLogoOverlay.jsx` anchors them in percentages
// of the picture (the wrapper's ONE-COORDINATE RULE, see `RaceScreen.css`), so they are already
// proportional at every size.
// ============================================================

/** The profile's logo height when it carries none — the same fallback the profile editor uses. */
export const DEFAULT_LOGO_MAX_HEIGHT = 90;

/** The picture's shorter side, in CSS px, at and above which the logo is drawn at full size. */
export const FULL_SIZE_SHORT_SIDE_CSS_PX = 540;

/**
 * The CSS max-height of the corner logo for a race picture of the given CSS size.
 *
 * @param {number|undefined|null} logoMaxHeight the profile's `logoMaxHeight` — the cap
 * @param {number|undefined|null} pictureCssW   the race picture's width in CSS px (unknown → cap)
 * @param {number|undefined|null} pictureCssH   the race picture's height in CSS px (unknown → cap)
 * @returns {number} the logo's max-height in CSS px
 */
export function brandLogoMaxHeightPx(logoMaxHeight, pictureCssW, pictureCssH) {
  const cap = logoMaxHeight ?? DEFAULT_LOGO_MAX_HEIGHT;
  const shortSide = Math.min(pictureCssW || 0, pictureCssH || 0);
  // Not measured yet (first render, or a test environment with no layout): today's size.
  if (!(shortSide > 0)) return cap;
  return Math.min(cap, (cap * shortSide) / FULL_SIZE_SHORT_SIDE_CSS_PX);
}
