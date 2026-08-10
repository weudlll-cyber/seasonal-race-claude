// ============================================================
// File:        Scoreboard.jsx
// Path:        client/src/screens/RaceScreen/Scoreboard.jsx
// Project:     RaceArena — STANDINGS-RULE
//
// THE LIVE STANDINGS PANEL: the header, the scrolling viewport, and the TWO LAYERS inside it.
//
// The architecture and the rule it must obey are in docs/STANDINGS-ARCHITECTURE.md, which is their
// one home — two layers, the place belongs to the SLOT, and a rank change moves a card and rewrites
// no text and no structure anywhere. This file is the composition; the two layers are
// ScoreboardSlots.jsx (the places, drawn once) and ScoreboardCard.jsx (the racers, only moved).
//
// ── WHY IT IS ITS OWN COMPONENT, and it is not tidiness ─────────────────────────────────────────
//
// It was ~35 lines of JSX inside RaceScreen's 1700-line render, and the guard that holds the rule
// has to mount THE REAL COMPOSITION. Mounting RaceScreen is not an option — it builds a race, takes
// a canvas and starts a frame loop — so the only alternative was for the guard to re-declare this
// structure itself, which is a SECOND home for the thing being guarded. A guard that measures its
// own copy of the arrangement cannot notice the arrangement changing. So the composition moved here,
// where both the screen and the guard read the same one.
//
// NOTHING ABOUT WHAT IS DRAWN CHANGED IN THE MOVE. The elements, the classes, the order (cards
// first, slot layer after, so the badges paint over them) and the two container styles are the same
// ones RaceScreen carried.
// ============================================================

import { ScoreboardCard } from './ScoreboardCard.jsx';
import { ScoreboardSlots } from './ScoreboardSlots.jsx';
import ScoreboardViewport from './ScoreboardViewport.jsx';
import { ROW_PITCH_PX, badgeWidthPx } from './scoreboardLayout.js';

/**
 * @param {object} p
 * @param {{index:number, identity:object, finished:boolean, finishTimeMs:number|null}[]} p.cards
 *   One entry per racer, in RACER order and never re-sorted — the ranking is the transform each
 *   card carries, not this array's order.
 * @param {string|null} p.rosterIcon
 *   The racer type's glyph, said ONCE in the header rather than a hundred times in the rows. Every
 *   racer in a race is the same type (PROJECT-PRINCIPLES pillar 1), so it is race-constant.
 * @param {(index:number, el:HTMLElement|null)=>void} p.attach
 *   The positioner's ref callback. Must be stable for the race, or every render re-runs it.
 */
export default function Scoreboard({ cards, rosterIcon, attach }) {
  return (
    <div className="scoreboard">
      {/* SHIP-THE-STANDINGS: the racer type is said ONCE here rather than on all hundred rows. */}
      <div className="scoreboard-header">
        {rosterIcon && <span className="sb-header-icon">{rosterIcon}</span>}
        <span>Live Standings</span>
      </div>
      {/* SCOREBOARD-SLOT-LAYER: the scrolling viewport. The rows canvas below keeps its true
          height, so the last row is fully drawn and reachable however large the field is,
          instead of running off the bottom of the window.
          SHIP-THE-STANDINGS: its scrollbar OVERLAYS the list instead of taking a column from
          it — see ScoreboardViewport.jsx for why that had to be hand-built. */}
      <ScoreboardViewport contentHeightPx={cards.length * ROW_PITCH_PX}>
        {/* SCOREBOARD-TRANSFORM-ROWS: the cards are absolutely positioned, so they contribute
            no height and this container must state it. The list is in racer order and never
            re-sorted — the ranking is the transform on each card.
            SCOREBOARD-SLOT-LAYER: `--sb-badge-w` is the ONE badge-column width, chosen from the
            field size so the widest place fits its box, and read from here by BOTH layers —
            which is what keeps the static places aligned with the moving cards. */}
        <div
          className="scoreboard-rows"
          style={{
            height: `${cards.length * ROW_PITCH_PX}px`,
            '--sb-badge-w': `${badgeWidthPx(cards.length)}px`,
          }}
        >
          {cards.map((card) => (
            <ScoreboardCard
              key={card.index}
              identity={card.identity}
              finished={card.finished}
              finishTimeMs={card.finishTimeMs}
              attach={attach}
            />
          ))}
          {/* Drawn once per race, and after the cards so the badges paint over them. */}
          <ScoreboardSlots count={cards.length} />
        </div>
      </ScoreboardViewport>
    </div>
  );
}
