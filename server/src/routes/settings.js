// ============================================================
// File:        settings.js
// Path:        server/src/routes/settings.js
// Project:     RaceArena — TEST-AIDS-1
// Description: Installation-wide settings — today one: the test-aids switch (`settings/testAids.js`).
//
//   GET /api/settings/test-aids  → { enabled }   every signed-in user (the client gates on it)
//   PUT /api/settings/test-aids  ← { enabled }   ADMIN-ONLY, by `ROUTE_POLICY` in `auth/guards.js`
//
// The same shape as the period evaluation's points rule (`routes/races.js`): read by everyone,
// written by admins, the role enforced by the guard and not repeated here.
// ============================================================

import { Router } from 'express';
import { createTestAidsStore, validateTestAids } from '../settings/testAids.js';

/** @param {{ testAids?: ReturnType<typeof createTestAidsStore> }} [deps] — tests pass a store */
export function createSettingsRouter({ testAids } = {}) {
  const router = Router();
  let defaultTestAids = null;
  const resolveTestAids = () => testAids ?? (defaultTestAids ??= createTestAidsStore());

  router.get('/test-aids', (_req, res) => res.json(resolveTestAids().get()));

  router.put('/test-aids', (req, res) => {
    const { value, error } = validateTestAids(req.body);
    if (error) return res.status(400).json({ error });
    return res.json(resolveTestAids().set(value));
  });

  return router;
}

export default createSettingsRouter();
