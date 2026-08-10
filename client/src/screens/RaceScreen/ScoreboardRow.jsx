// ============================================================
// File:        ScoreboardRow.jsx
// Path:        client/src/screens/RaceScreen/ScoreboardRow.jsx
// Project:     RaceArena — SCOREBOARD-STABLE-ROWS
//
// ONE ROW OF THE LIVE STANDINGS, BUILT ONCE AND THEREAFTER ONLY MOVED.
//
// THE OWNER'S DIAGNOSIS, which is what this file implements: "the racer object with its start number
// and name should be generated once and then only moved to its place — it does not all have to be
// regenerated every time." Until now `setScoreboard` handed React
// `[...st.racers].sort(...).map((r, i) => ({ ...r, rank: i + 1 }))` — a hundred brand-new objects
// every tick — so React saw a hundred changed rows and rebuilt all of them, four times a second, and
// FRAME-GAP-3 measured that as the cause of the dropped frames.
//
// THE SPLIT. Of the six things a row shows, FOUR NEVER CHANGE during a race: the racer's index, its
// icon, its name and its race number. Those live in one `identity` object per racer, created once at
// race start and never re-created and NEVER MUTATED. The two that do change — `finished` and
// `finishTimeMs`, each once, at the moment that racer crosses — and the one that changes constantly,
// `rank`, are passed as PRIMITIVES.
//
// ── WHY A CHANGED RANK CANNOT BE SKIPPED, which is the trap this shape exists to avoid ──────────
//
// `rank` is a PRIMITIVE PROP, never a field on the shared identity object — so a racer moving from
// 5th to 4th changes a value `memo`'s shallow comparison actually compares, and the row must
// re-render. Had the rank been written onto the identity instead, memo would have seen the same
// object reference, skipped the row, and the standings would have silently frozen while every other
// part of the screen kept moving: invisible in a screenshot, glaring in a race.
// `ScoreboardRow.test.jsx` holds that in both directions — same rank re-render is skipped, changed
// rank is not.
//
// WHAT IS UNCHANGED: the markup, the class names, the colours, the crown on first place, the
// number-before-name order (RACE-NUMBERS-1) and the finish-time cell. This is the same row; only who
// decides to re-render it has changed.
// ============================================================

import { memo } from 'react';
import { formatRaceTime } from '../../utils/formatRaceTime.js';
import { raceNumberLabel } from '../../modules/raceNumbers.js';

/** Gold / silver / bronze for the first three places; everything below takes the fallbacks.
 *  Module-private: this file is now its only reader, and exporting a non-component from a component
 *  file costs fast refresh for nothing. */
const RANK_PALETTE = ['#ffd700', '#c0c0c0', '#cd7f32'];

/**
 * @param {object}  p
 * @param {{index:number, icon:string, name:string, raceNumber:number|null}} p.identity
 *   The per-racer constants, created once per race and never mutated. Its REFERENCE is what makes
 *   `memo` cheap; mutating it would make `memo` wrong.
 * @param {number}  p.rank            1-based finishing position as displayed. Primitive on purpose.
 * @param {boolean} p.finished
 * @param {number|null} p.finishTimeMs
 */
function ScoreboardRowInner({ identity, rank, finished, finishTimeMs }) {
  // `rank - 1` is the palette index the old code spelled as the map's `i`. Same three colours, same
  // fallbacks, same crown — the row's appearance is unchanged by this block.
  const paletteIdx = rank - 1;
  return (
    <div className={`scoreboard-row${finished ? ' scoreboard-row--finished' : ''}`}>
      <span
        className="sb-rank"
        style={{
          color: RANK_PALETTE[paletteIdx] ?? '#888',
          borderColor: RANK_PALETTE[paletteIdx] ?? '#444',
        }}
      >
        {rank === 1 ? '👑' : `#${rank}`}
      </span>
      <span className="sb-icon">{identity.icon}</span>
      <span className="sb-name" style={{ color: RANK_PALETTE[paletteIdx] ?? '#ddd' }}>
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

// Default shallow compare is exactly right here and is the whole point: `identity` is compared by
// reference (stable for the race) and the other three by value, so a row re-renders when and only
// when something it displays has changed.
export const ScoreboardRow = memo(ScoreboardRowInner);
