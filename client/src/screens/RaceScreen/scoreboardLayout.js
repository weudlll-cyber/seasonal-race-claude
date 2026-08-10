// ============================================================
// File:        scoreboardLayout.js
// Path:        client/src/screens/RaceScreen/scoreboardLayout.js
// Project:     RaceArena — SCOREBOARD-TRANSFORM-ROWS
//
// THE ONE NUMBER THE STANDINGS' GEOMETRY DEPENDS ON, in a plain module so that everything which
// needs it can read the same copy: the component, the container that sizes itself from it, the
// component's own test, and the node-side parity test — which cannot import a `.jsx` file at all.
// ============================================================

/**
 * SCOREBOARD-TRANSFORM-ROWS: the vertical distance from one row's top to the next, in CSS pixels.
 *
 * MEASURED, not chosen: a rendered `.scoreboard-row` is 31.333 px tall and carries a 4 px
 * `margin-bottom`, so the pitch is 35.333. Every row shape was checked before relying on this —
 * crown, `#5`, `#100`, with and without a race number, finished with and without a time, and a name
 * long enough to ellipsise — and all seven render at exactly 31.333 px, because `.sb-name` is
 * `white-space: nowrap` and can never wrap to a second line.
 *
 * IT IS A DUPLICATE OF THE CSS AND THERE IS NO WAY AROUND THAT — the transform needs a number in JS
 * and the layout needs one in CSS. So it is guarded instead: `ScoreboardRow.test.jsx` renders a real
 * row and fails if the measured pitch stops matching this constant, which is what turns "someone
 * changed the padding and the list silently overlaps" into a failing test.
 */
export const ROW_PITCH_PX = 35.333;
