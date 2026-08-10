// ============================================================
// File:        ScoreboardCard.jsx
// Path:        client/src/screens/RaceScreen/ScoreboardCard.jsx
// Project:     RaceArena — SCOREBOARD-SLOT-LAYER
//
// ONE RACER, DRAWN ONCE AND THEREAFTER ONLY MOVED.
//
// THE LINE OF WORK THIS SITS AT THE END OF, because each step was forced by the measurement of the
// one before it:
//
//   SCOREBOARD-STABLE-ROWS   `setScoreboard` handed React a hundred brand-new objects every tick, so
//                            React rebuilt a hundred rows. Splitting the per-racer constants into
//                            one `identity` object cut its work by 64 %.
//   SCOREBOARD-TRANSFORM-ROWS the rows still MOVED in the document, so a re-order re-laid-out the
//                            whole list. Taking them out of flow and ranking them by `translateY`
//                            flattened the browser's drift — the "staircase" — to zero.
//   SCOREBOARD-SLOT-LAYER    what remained was the row's own TEXT. `#5` became `#4`, and the top
//                            three carried inline colours, so a rank change repainted every row that
//                            moved. The owner's measurement priced that residue on his machine: at
//                            the packed early phase, slowing the cadence from 250 ms to 1000 ms moved
//                            total p50 from 33.2 ms to 16.7 and `rafLate` p50 from 6.5 to 1.1.
//
// SO THE PLACE LEFT THIS FILE. The badge is now a STATIC layer behind the cards (ScoreboardSlots) —
// the crown at slot 1, `#2`, `#3` … each with its colour, built once per race. What is left here is
// the racer: icon, start number, name, and the finish time. NONE OF IT CHANGES DURING A RACE except
// the finish time, so this component's props are stable and `memo` skips it on every re-render.
//
// ── THE RANK IS NOT A PROP, AND THAT IS THE CHANGE ──────────────────────────────────────────────
//
// Its predecessor's header said the opposite, and was right at the time: while the row DISPLAYED the
// rank, the rank had to be a prop compared by value, or `memo` would skip a row whose place had
// changed and the standings would silently freeze. This card displays no rank. Keeping it as a prop
// would now re-render a hundred cards a tick to produce one changed `transform` each — the exact cost
// this block exists to remove.
//
// So the place is applied imperatively by `scoreboardPositions.js`, through the `attach` ref below.
// The trap moves with it rather than disappearing: a positioner that is never called leaves the list
// frozen, silently. That is held by `scoreboardPositions.test.js` and by the node-side parity test,
// which drives a real race through the positioner and compares the y of every card against the list
// the old code would have drawn.
//
// WHY REACT DOES NOT FIGHT THE IMPERATIVE WRITES: `transform` and `color` are never named in this
// element's `style` prop. React only clears a style property it set on a previous render, so the
// re-render a racer's finish causes rewrites the class and adds the time cell, and leaves the
// position and the colour exactly where the positioner put them.
//
// WHAT IS UNCHANGED: the markup below, the class names, the number-before-name order
// (RACE-NUMBERS-1), the ellipsis on a long name, the finished tint and the finish-time cell. The
// grid still reserves the badge column as its first track — the badge is simply drawn in the layer
// behind rather than inside this element, which is what lets the two layers line up.
// ============================================================

import { memo } from 'react';
import { formatRaceTime } from '../../utils/formatRaceTime.js';
import { raceNumberLabel } from '../../modules/raceNumbers.js';

/**
 * @param {object}  p
 * @param {{index:number, icon:string, name:string, raceNumber:number|null}} p.identity
 *   The per-racer constants, created once per race and never mutated. Its REFERENCE is what makes
 *   `memo` cheap; mutating it would make `memo` wrong.
 * @param {boolean} p.finished
 * @param {number|null} p.finishTimeMs
 *   THE ONE THING THAT STILL CHANGES A CARD, and it is priced rather than removed: one card, once,
 *   at the moment that racer crosses the line. A hundred cards per tick was the problem; a card an
 *   occasional second is not.
 * @param {(index:number, el:HTMLElement|null)=>void} p.attach
 *   The positioner's ref callback. Stable for the race — a changing one would re-run on every
 *   render and defeat the point.
 */
function ScoreboardCardInner({ identity, finished, finishTimeMs, attach }) {
  return (
    <div
      ref={(el) => attach(identity.index, el)}
      className={`scoreboard-card${finished ? ' scoreboard-card--finished' : ''}`}
    >
      {/* The badge column, reserved and empty: the badge itself lives in the static layer behind
          this one. Without the spacer the icon and the name would sit where the badge is drawn. */}
      <span className="sb-badge-spacer" />
      <span className="sb-icon">{identity.icon}</span>
      <span className="sb-name">
        {/* RACE-NUMBERS-1: the number comes BEFORE the name. The track shows only the
            number, so the list is where a viewer reads the two together. */}
        {identity.raceNumber != null && (
          <span className="sb-number">{raceNumberLabel(identity.raceNumber)}</span>
        )}
        {identity.name}
      </span>
      {finished && finishTimeMs != null && (
        <span className="sb-finish-time">{formatRaceTime(finishTimeMs)}</span>
      )}
    </div>
  );
}

// Default shallow compare, and now it skips ALWAYS during a race: `identity` and `attach` are stable
// references and `finished`/`finishTimeMs` change once per racer, at that racer's finish.
export const ScoreboardCard = memo(ScoreboardCardInner);
