// ============================================================
// File:        races.js
// Path:        server/src/routes/races.js
// Project:     RaceArena — RACE-SAVE-3
// Created:     2026-09-06
// Description: /api/races — a finished race is written to the server, and a team reads its own.
//
//              POST /            store one finished race
//              GET  /            one PAGE of this team's races, newest first
//              GET  /:shortKey   one race by the short name it can be read aloud by
//
// ── RETRYABILITY IS CARRIED BY THE STATUS CODE, AND ONLY BY IT ─────────────────────────────────
// The client has to tell two failures apart: one worth sending again (the server is down, the
// database is locked) and one that never will be (this race is malformed, so the same bytes will
// fail the same way forever). That distinction is what HTTP status codes are: 400 means do not
// repeat this request, 5xx means the fault is here and later may work. A `retryable` field in the
// body beside the status would be a second home for one fact, and the two would eventually
// disagree — so there is no such field, and `racesApi.js` reads the status.
//
// ── THIS ROUTE IS A SECOND STORE, NEVER A GATEKEEPER ────────────────────────────────────────────
// The owner's rule of 2026-09-06: the race is written locally FIRST, always. By the time anything
// reaches this file the race has already run, the result is already on screen, and the entry is
// already in the player's local history. Nothing here can prevent a race, end one, or change what
// the player saw — the worst this route can do is fail, and a failure means the client keeps the
// race marked pending and sends it again later.
//
// That is why there is no validation here that could REJECT a race for being unusual. The store's
// own required fields are the whole of it, and a rejection is reported with its code so the client
// can record it against the entry and show a person, never as a silent drop.
//
// ── THE TEAM COMES FROM THE SESSION, AND THE CLIENT CANNOT CHOOSE ONE ───────────────────────────
// `req.authUser.team` is stamped by `requireAuth` from the user's own record (TEAMS-1), per
// request, from the database. A `team` in the request body is IGNORED — not rejected, ignored,
// because rejecting it would tell a caller that the field is read, and it never is. A race is
// visible to the team its author belongs to and to no other, and that is decided on this side of
// the wire where the client cannot reach it.
//
// ── WHY IT IS OPERATOR+ AND NOT ADMIN ──────────────────────────────────────────────────────────
// Every operator runs races and every operator's races must be kept. This route is authenticated —
// it is not on PUBLIC_PATHS, so the global `requireAuth` covers it — and it is deliberately NOT in
// `ROUTE_POLICY`, which is what leaves it at the operator+ default. `routePolicyDrift.test.js`
// carries the matching entry so that decision is written down in the place that checks it.
// ============================================================

import express from 'express';
import { createRaceStore } from '../races/raceStore.js';

/** One store per process, opened lazily so importing this module opens no file. */
let defaultStore = null;
function getDefaultStore() {
  defaultStore ??= createRaceStore();
  return defaultStore;
}

export function createRacesRouter({ store } = {}) {
  const router = express.Router();
  const resolveStore = () => store ?? getDefaultStore();

  // POST / — store one finished race.
  //
  // 201 the race was stored · 200 it was already stored (a retry, and that is not an error)
  router.post('/', (req, res) => {
    const body = req.body ?? {};

    // A race with no team cannot be filed. This is a SERVER-side failure, not a client one: the
    // team is read from the session, so its absence means the signed-in user predates the backfill
    // (TEAMS-1's scripts/migrate-teams.mjs). The client is told to keep the race and try later,
    // because that is exactly what it should do — running the migration makes the next attempt work.
    const team = req.authUser?.team;
    if (!team) {
      console.error(
        `[races] refusing to store a race for ${req.authUser?.username}: the user has no team. ` +
          'Run scripts/migrate-teams.mjs. The race is safe on the client and will be sent again.'
      );
      return res.status(503).json({
        error: 'This account has no team yet, so the race cannot be filed. It stays on this device.',
      });
    }

    try {
      const existing = resolveStore().getRaceByClientId(body.clientRaceId);
      if (existing) {
        // Recognised and accepted quietly — the second arrival of a race is a retry that worked,
        // not a fault. The stored id comes back so the client can mark it sent either way.
        return res.status(200).json({ id: existing.id, shortKey: existing.shortKey, alreadyStored: true });
      }

      const result = resolveStore().storeRace({ ...body, team });
      // The key travels back on the store, so the client can show it beside the race the moment it
      // lands rather than fetching the list again to learn its own race's name.
      return res
        .status(201)
        .json({ id: result.id, shortKey: result.shortKey, alreadyStored: !result.stored.race });
    } catch (err) {
      // A malformed race is 400 because sending the same bytes again will fail the same way. The
      // code travels with it so the client can record WHY that race never went up, against the
      // entry, where a person will see it.
      if (['INVALID_RACE', 'INVALID_ROSTER', 'INVALID_RESULTS', 'INVALID_TEAM'].includes(err.code)) {
        console.warn(`[races] rejected a race from ${req.authUser?.username}: ${err.code} ${err.message}`);
        return res.status(400).json({ error: err.message, code: err.code });
      }
      // Anything else — a locked database, a disk error — is the server's problem and will very
      // likely work on the next attempt.
      console.error('[races] storeRace failed:', err.code ?? err.message);
      return res.status(500).json({ error: 'internal error' });
    }
  });

  // GET / — one page of THIS TEAM's races, newest first.
  //
  // ★ PAGINATED FROM THE FIRST VERSION. `limit` is clamped in the store, so a caller asking for
  // everything gets a page and is told there is more, rather than the server deciding to build a
  // season's worth of rows because it was asked nicely.
  router.get('/', (req, res) => {
    const team = req.authUser?.team;
    // No team, no races — an empty page rather than an error. This user simply has no history yet,
    // and a screen that shows nothing is the honest rendering of that.
    if (!team) return res.json({ races: [], hasMore: false, offset: 0, limit: 0, team: null });

    const page = resolveStore().listRacesPage(team, {
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({ ...page, team });
  });

  // GET /:shortKey — one race, by the name a person can read aloud.
  //
  // ★ A KEY FROM ANOTHER TEAM IS **NOT FOUND**, and so is a key that was never issued. The two are
  // deliberately the same answer: "forbidden" would confirm that the race exists, which is exactly
  // what somebody holding a key they were not given should not learn. The store enforces this by
  // taking the team as a required argument rather than as a filter this route could forget.
  router.get('/:shortKey', (req, res) => {
    const team = req.authUser?.team;
    const race = team ? resolveStore().getRaceByShortKey(req.params.shortKey, team) : null;
    if (!race) {
      return res.status(404).json({ error: 'No race with that key.' });
    }
    return res.json(race);
  });

  return router;
}

export default createRacesRouter();
