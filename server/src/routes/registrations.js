// ============================================================
// File:        registrations.js
// Path:        server/src/routes/registrations.js
// Project:     RaceArena — REGISTRATION-1
// Created:     2026-10-21
// Description: /api/registrations — the director's side of player registration (the owner's
//              decisions of 2026-10-20). A director opens a registration for a track; players add
//              their own names through the public link (REGISTRATION-1 piece 2) until the deadline; the
//              director watches, removes names, closes early or extends, and then starts the race
//              with the names from the Setup screen — nothing here starts a race.
//
//              POST   /                          open a registration
//              GET    /                          this team's registrations, newest first
//              GET    /:id                       one, with its names
//              POST   /:id/close                 close it now
//              POST   /:id/extend                move the deadline later  { closesAt }
//              POST   /:id/raced                 a race was started with its players (first time kept)
//              DELETE /:id/entries/:entryId      remove one name
//              DELETE /:id                       delete it and every name in it
//
// ── SIGNED IN, OPERATOR+, AND SCOPED TO THE TEAM, EXACTLY AS /api/races IS ─────────────────────
// Not on PUBLIC_PATHS, so the global `requireAuth` covers every route here; not in ROUTE_POLICY, so
// every operator may use it (`routePolicyDrift.test.js` carries the matching entries). The team
// comes from `req.authUser.team` (TEAMS-1), never from the body, and the store takes it as a
// required argument: another team's registration is NOT FOUND, the same answer an unknown id gets,
// so an id from another team confirms nothing (the reasoning of races.js `GET /:shortKey`).
// ============================================================

import express from 'express';
import { createRegistrationStore, EVENT_NAME_MAX } from '../registrations/registrationStore.js';
import { readInstallTracks } from './races.js';
import { unknownFields, unknownFieldsMessage, checkString } from '../../utils/recordFields.js';

/** One store per process, opened lazily so importing this module opens no file. */
let defaultStore = null;
export function getDefaultRegistrationStore() {
  defaultStore ??= createRegistrationStore();
  return defaultStore;
}

// The field allow-lists (the record pattern of AUDIT-1 A5M-13, server/utils/recordFields.js): an
// unknown field is refused, not ignored. `team` is NOT on the list: a body that names a team is
// refused like any other unknown field, because the team is the session's.
const CREATE_FIELDS = new Set(['trackId', 'capacity', 'eventName', 'closesAt']);
const EXTEND_FIELDS = new Set(['closesAt']);

const NOT_FOUND = { error: 'No registration with that id.' };

/** The store's refusals that are the caller's to fix, as a 400 or 409; anything else is rethrown. */
function answerRefusal(res, err) {
  if (['INVALID_REGISTRATION', 'INVALID_TEAM'].includes(err.code)) {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  if (err.code === 'CLOSED') return res.status(409).json({ error: err.message, code: err.code });
  throw err;
}

export function createRegistrationsRouter({ store, tracks } = {}) {
  const router = express.Router();
  const resolveStore = () => store ?? getDefaultRegistrationStore();
  // Tests pass their track records; the server reads its own data directory.
  const resolveTracks = () => tracks ?? readInstallTracks();

  // A user without a team cannot own a registration; the same 503 a race upload answers, for the
  // same reason (races.js POST /): the migration is missing, not the request wrong.
  function teamOf(req, res) {
    const team = req.authUser?.team;
    if (!team) {
      res.status(503).json({
        error: 'This account has no team yet, so it cannot open or read registrations.',
      });
      return null;
    }
    return team;
  }

  // POST / — open a registration. The capacity is the track's player limit as the Players tab
  // computes it, sent by the client; the store bounds it and fixes it for good.
  router.post('/', (req, res) => {
    const team = teamOf(req, res);
    if (!team) return;
    const body = req.body;
    const unknown = unknownFields(body, CREATE_FIELDS);
    if (unknown.length) {
      return res.status(400).json({ error: unknownFieldsMessage(unknown, 'A registration') });
    }
    const nameError = checkString(body, 'eventName', { max: EVENT_NAME_MAX, nullable: true });
    if (nameError) return res.status(400).json({ error: nameError });
    const track = resolveTracks().find((t) => t.id === body.trackId);
    if (!track) return res.status(400).json({ error: 'trackId must name an existing track.' });
    try {
      const created = resolveStore().create({
        team,
        createdBy: req.authUser.username,
        trackId: track.id,
        trackName: typeof track.name === 'string' && track.name ? track.name : track.id,
        capacity: body.capacity,
        eventName: body.eventName ?? null,
        closesAt: body.closesAt,
      });
      return res.status(201).json(created);
    } catch (err) {
      return answerRefusal(res, err);
    }
  });

  // GET / — this team's registrations, newest first, without their names.
  router.get('/', (req, res) => {
    const team = teamOf(req, res);
    if (!team) return;
    return res.json({ registrations: resolveStore().list(team) });
  });

  // GET /:id — one registration with its names, in the order they arrived. The director's page
  // asks for this every few seconds while a registration is open (no other transport).
  router.get('/:id', (req, res) => {
    const team = teamOf(req, res);
    if (!team) return;
    const found = resolveStore().get(req.params.id, team);
    return found ? res.json(found) : res.status(404).json(NOT_FOUND);
  });

  // POST /:id/close — close it now; closing a closed one is not an error.
  router.post('/:id/close', (req, res) => {
    const team = teamOf(req, res);
    if (!team) return;
    const closed = resolveStore().close(req.params.id, team);
    return closed ? res.json(closed) : res.status(404).json(NOT_FOUND);
  });

  // POST /:id/extend — a later deadline, at most 30 days from creation, only while open.
  router.post('/:id/extend', (req, res) => {
    const team = teamOf(req, res);
    if (!team) return;
    const unknown = unknownFields(req.body, EXTEND_FIELDS);
    if (unknown.length) {
      return res.status(400).json({ error: unknownFieldsMessage(unknown, 'An extension') });
    }
    try {
      const extended = resolveStore().extend(req.params.id, team, req.body.closesAt);
      return extended ? res.json(extended) : res.status(404).json(NOT_FOUND);
    } catch (err) {
      return answerRefusal(res, err);
    }
  });

  // POST /:id/raced — the Setup screen started a race with this registration's players
  // (follow-up 2, the owner's decision of 2026-10-22). The store keeps the FIRST time; open or
  // closed alike; another team's id is not found, like every route here. No body.
  router.post('/:id/raced', (req, res) => {
    const team = teamOf(req, res);
    if (!team) return;
    const marked = resolveStore().markRaced(req.params.id, team);
    return marked ? res.json(marked) : res.status(404).json(NOT_FOUND);
  });

  // DELETE /:id/entries/:entryId — remove one name; its place is free again.
  router.delete('/:id/entries/:entryId', (req, res) => {
    const team = teamOf(req, res);
    if (!team) return;
    const after = resolveStore().removeEntry(req.params.id, team, req.params.entryId);
    return after
      ? res.json(after)
      : res.status(404).json({ error: 'No such name in this registration.' });
  });

  // DELETE /:id — delete the registration and every name in it. Names are kept until this happens
  // (the owner's decision of 2026-10-20, docs/PRIVACY-FACTS.md).
  router.delete('/:id', (req, res) => {
    const team = teamOf(req, res);
    if (!team) return;
    return resolveStore().remove(req.params.id, team)
      ? res.status(204).end()
      : res.status(404).json(NOT_FOUND);
  });

  return router;
}

export default createRegistrationsRouter();
