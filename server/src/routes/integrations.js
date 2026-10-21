// ============================================================
// File:        integrations.js
// Path:        server/src/routes/integrations.js
// Project:     RaceArena — REGISTRATION-1
// Created:     2026-10-21
// Description: /api/integrations — the documented interface through which an EXTERNAL site with
//              its own signed-in players may use this installation (docs/INTEGRATIONS.md). Today one
//              route: add a player to an open registration.
//
//              POST /registrations/:code/entries     { name, externalId }
//                   Authorization: Bearer <RA_INTEGRATION_KEY>
//
// ── ★ THE STANDING PRINCIPLE IT SERVES (the owner's decision of 2026-10-20) ────────────────────
// The game is always installable and fully functional on its own. An external site may use it
// through documented interfaces; no feature may require one. So this route is OFF unless the
// operator sets `RA_INTEGRATION_KEY`, and while it is off it answers 404 — the same answer, body and
// all, as a path that does not exist (staticClient.js `mountApiNotFound`).
//
// ── WHY IT IS MOUNTED BEFORE THE SESSION AND THE GUARDS (app.js) ───────────────────────────────
// The caller is a server, not a browser: it has no session and sends no Origin. Behind the sign-in
// guard it would need a PUBLIC_PATHS entry, and behind the CSRF guard it would be refused in strict
// mode for sending no Origin — two exemptions in two security components for a route that does
// not use either mechanism. Mounted ahead of both, it answers every request itself: 404 when off,
// 401 without the right key, and only then the route. CSRF does not apply to it: a browser cannot
// attach an `Authorization` header to a cross-site request without a CORS preflight, and CORS
// admits no origin that is not configured.
//
// ── THE KEY ────────────────────────────────────────────────────────────────────────────────────
// Read from the environment on every request (so a test can switch it), never logged, compared in
// constant time: both sides are hashed to 32 bytes first, so `timingSafeEqual` sees equal lengths
// and the comparison's time says nothing about the key's length or its first wrong character.
// ============================================================

import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { getDefaultRegistrationStore } from './registrations.js';
import { unknownFields, unknownFieldsMessage } from '../../utils/recordFields.js';

const ENTRY_FIELDS = new Set(['name', 'externalId']);

const REFUSAL_STATUS = {
  NOT_FOUND: 404,
  CLOSED: 409,
  FULL: 409,
  DUPLICATE_NAME: 409,
  DUPLICATE_EXTERNAL_ID: 409,
  INVALID_NAME: 400,
  INVALID_ENTRY: 400,
};

const digest = (s) => createHash('sha256').update(String(s), 'utf8').digest();

/** Does the request carry `Authorization: Bearer <key>` with exactly this key? */
export function hasIntegrationKey(req, key) {
  const header = String(req.get('authorization') ?? '');
  const match = /^Bearer (.+)$/.exec(header);
  return timingSafeEqual(digest(match ? match[1] : ''), digest(key)) && match !== null;
}

export function createIntegrationsRouter({ store, env = process.env } = {}) {
  const router = express.Router();
  const resolveStore = () => store ?? getDefaultRegistrationStore();

  // Off, or not the right key: answered here, before any route below runs.
  router.use((req, res, next) => {
    const key = env.RA_INTEGRATION_KEY;
    if (!key) {
      return res.status(404).json({ error: `no such API route: ${req.method} ${req.originalUrl}` });
    }
    if (!hasIntegrationKey(req, key)) {
      return res.status(401).json({ error: 'not authenticated' });
    }
    next();
  });

  // POST /registrations/:code/entries — the same rules as the public link (capacity, deadline, the
  // name rules, a doubled name), plus: an external id is required and may register only once.
  router.post('/registrations/:code/entries', (req, res) => {
    const unknown = unknownFields(req.body, ENTRY_FIELDS);
    if (unknown.length) {
      return res.status(400).json({ error: unknownFieldsMessage(unknown, 'An entry') });
    }
    try {
      const added = resolveStore().addEntry(req.params.code, {
        name: req.body.name,
        source: 'integration',
        externalId: req.body.externalId,
      });
      return res.status(201).json({
        entry: { id: added.entry.id, name: added.entry.name, externalId: req.body.externalId },
        number: added.number,
        capacity: added.capacity,
        // So the external site can say "You're in, number N of M" and how many places are left.
        placesLeft: added.placesLeft,
      });
    } catch (err) {
      const status = REFUSAL_STATUS[err.code];
      if (!status) throw err;
      return res.status(status).json({ error: err.message, code: err.code });
    }
  });

  // Any other path under /api/integrations, with the right key: not a route.
  router.use((req, res) =>
    res.status(404).json({ error: `no such API route: ${req.method} ${req.originalUrl}` })
  );

  return router;
}

export default createIntegrationsRouter();
