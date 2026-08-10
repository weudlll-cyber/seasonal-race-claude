// ============================================================
// File:        ScoreboardSlots.jsx
// Path:        client/src/screens/RaceScreen/ScoreboardSlots.jsx
// Project:     RaceArena — SCOREBOARD-SLOT-LAYER
//
// THE PLACES. Drawn once per race, then never touched again.
//
// The owner's design in his own words: "if I have a list where the place is always at the front, I
// only need to draw that list ONCE — from then on I only need to move the racer's name onto the row
// where he belongs." This is that list: the crown at slot 1, then `#2`, `#3` … to the field size,
// with their colours.
//
// BOTH HIGHLIGHTS ARE PLACE-BOUND, which is what makes this layer possible at all — gold at first,
// SILVER AT SECOND, bronze at third. Whoever is standing in third is coloured bronze because the
// SLOT is bronze, not because anything about that racer changed. So a rank change rewrites no text
// and no style here; it moves a card in the layer above.
//
// WHY IT IS ITS OWN COMPONENT AND MEMOISED ON `count`: this is what "drawn once" is made of. The
// field size cannot change during a race, so `memo` skips this subtree on every re-render RaceScreen
// ever does, and the hundred badges are built exactly once.
//
// `aria-hidden` because this layer is decoration in the accessibility tree's terms — the reading
// order a screen reader needs is the CARD's, and a card carries no place text of its own. That is a
// REAL LOSS and it is named rather than hidden: the place is no longer announced with the racer.
// The standings were never keyboard-reachable or labelled, so nothing that worked stops working, but
// this is the block that made the two separable and it should be the block that says so.
// ============================================================

import { memo } from 'react';
import { rankBorderColor, rankLabel, rankTextColor, slotOffsetPx } from './scoreboardLayout.js';

function ScoreboardSlotsInner({ count }) {
  const slots = [];
  for (let rank = 1; rank <= count; rank++) {
    slots.push(
      <div
        key={rank}
        className="scoreboard-slot"
        style={{ transform: `translateY(${slotOffsetPx(rank)}px)` }}
      >
        <span
          className="sb-rank"
          style={{ color: rankTextColor(rank), borderColor: rankBorderColor(rank) }}
        >
          {rankLabel(rank)}
        </span>
      </div>
    );
  }
  return (
    <div className="scoreboard-slot-layer" aria-hidden="true">
      {slots}
    </div>
  );
}

// The field size is fixed for the race, so this compares equal on every re-render and the subtree is
// built once. That is not an optimisation detail — it is the whole claim of this block.
export const ScoreboardSlots = memo(ScoreboardSlotsInner);
