// ============================================================
// File:        racesApi.js
// Path:        client/src/services/racesApi.js
// Project:     RaceArena — RACE-SAVE-3
// Description: POST a finished race to the server. The race is already safe on this device before
//              this is called, so this function's job is to report what happened, not to succeed.
//
//              WHY IT RETURNS A RESULT INSTEAD OF THROWING. The caller has to tell two failures
//              apart: one worth retrying (the server is down, the database is locked) and one that
//              never will be (this race is malformed). A thrown error flattens them into "it did
//              not work", and the client would then either retry forever or drop a race. The server
//              answers with `retryable`, and this hands that answer on unchanged.
// ============================================================

import { API_BASE_URL } from './api.js';
import { apiCall } from './apiClient.js';

const BASE_URL = `${API_BASE_URL}/api/races`;

/**
 * @param {object} payload from `toServerPayload(entry)` — carries no team; the server reads it
 *                 from the session.
 * @returns {Promise<{ok: true, id: string, alreadyStored: boolean}
 *                 | {ok: false, retryable: boolean, error: string}>}
 * @throws only on a transport failure, which the caller treats as retryable.
 */
export async function postRace(payload) {
  let res;
  try {
    res = await apiCall(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // The result screen is not waiting on this and no UI reacts to a 401 here — a race that
      // arrives while the session has expired is kept and sent after the next sign-in.
      _skipAuthRedirect: true,
    });
  } catch (err) {
    // apiCall throws for a non-2xx as well as for a transport failure. A status means the server
    // answered, so its own verdict is used; no status means it never did, and that is retryable.
    if (err?.status) {
      // The STATUS is the verdict, and it is the only place that verdict lives (see races.js).
      // 400 is "these bytes are wrong" — sending them again cannot help. 401 is not retryable
      // either in the sense that matters here: retrying immediately would fail identically, and the
      // race is kept pending so it goes up after the next sign-in, which is a successful contact.
      // Everything else — 5xx, a proxy's 502, a rate limit — is worth another attempt, because
      // keeping a race costs a few kilobytes and losing one cannot be undone.
      return {
        ok: false,
        retryable: err.status !== 400,
        error: err.message ?? `the server answered ${err.status}`,
      };
    }
    throw err;
  }

  const body = await res.json();
  return { ok: true, id: body.id, alreadyStored: !!body.alreadyStored };
}

/**
 * One page of THIS TEAM's races, newest first. The team is read from the session server-side; there
 * is no team parameter here and there must not be one.
 *
 * @returns {Promise<{races: object[], hasMore: boolean, offset: number, limit: number, team: string|null}>}
 */
export async function fetchRacesPage({ limit = 20, offset = 0 } = {}) {
  const res = await apiCall(`${BASE_URL}?limit=${limit}&offset=${offset}`, {
    _skipAuthRedirect: true,
  });
  return res.json();
}

/**
 * One race by the short key a person typed.
 *
 * Returns `null` for "no race with that key" — which the server answers for a key that was never
 * issued AND for one belonging to another team, deliberately indistinguishably. Every other failure
 * throws, because "the server is down" and "that race does not exist" must not look the same to the
 * person who typed it.
 *
 * @param {string} shortKey
 * @returns {Promise<object|null>}
 */
export async function fetchRaceByShortKey(shortKey) {
  try {
    const res = await apiCall(`${BASE_URL}/${encodeURIComponent(shortKey)}`, {
      _skipAuthRedirect: true,
    });
    return await res.json();
  } catch (err) {
    if (err?.status === 404) return null;
    throw err;
  }
}
