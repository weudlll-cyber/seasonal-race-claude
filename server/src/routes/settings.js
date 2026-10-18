// ============================================================
// File:        settings.js
// Path:        server/src/routes/settings.js
// Project:     RaceArena — TEST-AIDS-1, LEGAL-PAGES-1
// Description: Installation-wide settings — the test-aids switch (`settings/testAids.js`) and the
//              operator's legal pages (`settings/legalPages.js`).
//
//   GET /api/settings/test-aids    → { enabled }   every signed-in user (the client gates on it)
//   PUT /api/settings/test-aids    ← { enabled }   ADMIN-ONLY, by `ROUTE_POLICY` in `auth/guards.js`
//   GET /api/settings/legal-pages  → { legalNotice, privacyPolicy, maxChars, sourceUrl }
//                                    PUBLIC, on `PUBLIC_PATHS`: the start screen's footer and the two
//                                    legal pages are read before anyone signs in
//   PUT /api/settings/legal-pages  ← { legalNotice?, privacyPolicy? }   ADMIN-ONLY, by `ROUTE_POLICY`
//
// The same shape as the period evaluation's points rule (`routes/races.js`): read by everyone,
// written by admins, the role enforced by the guard and not repeated here. `sourceUrl` is the
// operator's `RA_SOURCE_URL` (`sourceUrl.js`), or null — the client then links to its own build.
// ============================================================

import { Router } from 'express';
import { createTestAidsStore, validateTestAids } from '../settings/testAids.js';
import {
  createLegalPagesStore,
  validateLegalPages,
  LEGAL_TEXT_MAX_CHARS,
} from '../settings/legalPages.js';
import { resolveSourceUrl } from '../sourceUrl.js';

/**
 * @param {{
 *   testAids?: ReturnType<typeof createTestAidsStore>,
 *   legalPages?: ReturnType<typeof createLegalPagesStore>,
 *   env?: Record<string, string|undefined>,
 * }} [deps] — tests pass stores and an environment
 */
export function createSettingsRouter({ testAids, legalPages, env = process.env } = {}) {
  const router = Router();
  // Created on first use, so importing this module touches no file under the data root.
  let defaultTestAids = null;
  let defaultLegalPages = null;
  const resolveTestAids = () => testAids ?? (defaultTestAids ??= createTestAidsStore());
  const resolveLegalPages = () => legalPages ?? (defaultLegalPages ??= createLegalPagesStore());

  router.get('/test-aids', (_req, res) => res.json(resolveTestAids().get()));

  router.put('/test-aids', (req, res) => {
    const { value, error } = validateTestAids(req.body);
    if (error) return res.status(400).json({ error });
    return res.json(resolveTestAids().set(value));
  });

  const legalAnswer = (texts) => ({
    ...texts,
    maxChars: LEGAL_TEXT_MAX_CHARS,
    sourceUrl: resolveSourceUrl(env),
  });

  router.get('/legal-pages', (_req, res) => res.json(legalAnswer(resolveLegalPages().get())));

  router.put('/legal-pages', (req, res) => {
    const { value, error } = validateLegalPages(req.body);
    if (error) return res.status(400).json({ error });
    return res.json(legalAnswer(resolveLegalPages().update(value)));
  });

  return router;
}

export default createSettingsRouter();
