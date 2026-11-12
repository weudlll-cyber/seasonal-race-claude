// ============================================================
// File:        deletedRacers.js
// Path:        client/src/modules/deletedRacers.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 6
// Created:     2026-11-11
// Description: "Deleted player" in past races (the owner's decision of 2026-11-11, OWNER-3). The
//              display-time mask only: the stored race, its names, coats, colours and replay are
//              untouched — a name is physics (raceBehavior.js stablePairBit) — and only the TEXT a
//              screen shows for a deleted website member is replaced.
//
//              WHO ASKS. The result screen and the race history, for the races they show, through
//              `useDeletedRacers`. WEBSITE MODE ONLY: in standalone the hook sends nothing, ever,
//              and returns no mask (SITE_MODE, the runtime marker every website feature reads).
//              It asks at once and again every DELETED_RACERS_POLL_MS while the screen is open, so
//              a deletion the account feed brings in (piece 3b) shows without a reload. Without an
//              answer — offline, or a failed request — the last answer stays, which before the
//              first one is none: the stored name is shown until the answer comes.
// ============================================================

import { useEffect, useState } from 'react';
import { SITE_MODE } from './runtimeMarker.js';
import { fetchDeletedRacers } from '../services/racesApi.js';

/** What a deleted website member is shown as. */
export const DELETED_PLAYER_LABEL = 'Deleted player';

/** How often an open screen asks again — the feed's own fastest interval (ENVIRONMENT.md). */
export const DELETED_RACERS_POLL_MS = 15_000;

/**
 * The racer indexes to mask, per client race id, for the races named. `{}` in standalone, before
 * the first answer, and for an empty list.
 *
 * @param {string[]} clientRaceIds
 * @returns {Record<string, number[]>}
 */
export function useDeletedRacers(clientRaceIds) {
  const key = SITE_MODE === 'website' ? clientRaceIds.filter(Boolean).join(',') : '';
  const [deleted, setDeleted] = useState({});

  useEffect(() => {
    if (!key) return undefined;
    let live = true;
    const ask = () =>
      fetchDeletedRacers(key.split(','))
        .then((answer) => {
          if (live) setDeleted(answer);
        })
        .catch(() => {
          // Offline or refused: the last answer stays, and the next ask may work. Nothing to show.
        });
    ask();
    const timer = setInterval(ask, DELETED_RACERS_POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [key]);

  return key ? deleted : {};
}

/**
 * The name to show for racer `index`: the label when that racer's member was deleted.
 *
 * @param {string} name
 * @param {number} index  the racer's index in the race (its place in the roster)
 * @param {number[]|undefined} maskedIndexes
 */
export function shownName(name, index, maskedIndexes) {
  return maskedIndexes?.includes(index) ? DELETED_PLAYER_LABEL : name;
}

/**
 * A list of names (a race's winners) with every deleted member's replaced. Names are unique within
 * a race (shared/playerNames.mjs, the owner's rule of 2026-10-04), so the name finds the index.
 *
 * @param {string[]} names       the names to show
 * @param {string[]} roster      the race's roster, in order
 * @param {number[]|undefined} maskedIndexes
 */
export function shownNames(names, roster, maskedIndexes) {
  if (!maskedIndexes?.length || !Array.isArray(roster)) return names;
  return names.map((n) => shownName(n, roster.indexOf(n), maskedIndexes));
}
