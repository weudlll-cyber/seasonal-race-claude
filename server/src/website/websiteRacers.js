// ============================================================
// File:        websiteRacers.js
// Path:        server/src/website/websiteRacers.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 6
// Created:     2026-11-11
// Description: "Deleted player" in past races (the owner's decision of 2026-11-11, OWNER-3), the
//              two rules the races route applies in website mode:
//
//              1. WHAT IS ACCEPTED beside an uploaded race: `websiteRacers`, a list of
//                 { index, websiteUserId } for the racers taken from a registration as website
//                 members. It travels BESIDE the race in the POST body and never enters the stored
//                 race: storeRace builds its row from named fields only (raceStore.js), so the
//                 record and its content id are the same with or without it. An entry is kept only
//                 when its index is a racer of this race and its id is a member the race has met
//                 (identityStore: every member who joined signed in first). Anything else is
//                 dropped, never a reason to refuse the race — the route is a second store, never
//                 a gatekeeper (routes/races.js header).
//              2. WHAT IS MASKED: the racer indexes, per client race id, whose member the account
//                 feed marked deleted (identityStore.deletedIds, piece 3b). The stored name is
//                 untouched; the client shows "Deleted player" in its place.
// ============================================================

/** Longest website id kept — the identity store's ids are short; anything longer is not one. */
const MAX_ID_LENGTH = 200;

/**
 * The `websiteRacers` of an upload that may be stored, or [] for none.
 *
 * @param {unknown} list         the body's `websiteRacers`
 * @param {number} rosterSize    how many racers the race had
 * @param {{get: (id: string) => object|null}} identities
 * @returns {{index: number, websiteUserId: string}[]}
 */
export function acceptedWebsiteRacers(list, rosterSize, identities) {
  if (!Array.isArray(list)) return [];
  const byIndex = new Map();
  for (const item of list) {
    const index = item?.index;
    const id = item?.websiteUserId;
    if (!Number.isInteger(index) || index < 0 || index >= rosterSize) continue;
    if (typeof id !== 'string' || id.length === 0 || id.length > MAX_ID_LENGTH) continue;
    if (byIndex.has(index) || !identities.get(id)) continue;
    byIndex.set(index, { index, websiteUserId: id });
  }
  return [...byIndex.values()];
}

/**
 * The racer indexes to show as "Deleted player", per client race id; a race with none is absent.
 *
 * @param {{clientRaceId: string, index: number, websiteUserId: string}[]} rows
 * @param {string[]} deletedIds
 * @returns {Record<string, number[]>}
 */
export function deletedRacersByRace(rows, deletedIds) {
  const deleted = new Set(deletedIds);
  const out = {};
  for (const row of rows) {
    if (!deleted.has(row.websiteUserId)) continue;
    (out[row.clientRaceId] ??= []).push(row.index);
  }
  for (const indexes of Object.values(out)) indexes.sort((a, b) => a - b);
  return out;
}
