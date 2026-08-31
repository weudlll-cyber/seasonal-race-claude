// ============================================================
// File:        seedNotices.js
// Path:        server/src/routes/seedNotices.js
// Project:     RaceArena — SEED-REDELIVERY-1
// Description: The two routes the redelivery warning needs, and no more.
//
//                GET  /api/seed-notices          — what this install is still owed a warning for
//                POST /api/seed-notices/dismiss  — the operator has seen it; clear them all
//
//              BOTH REQUIRE AUTH, by the app's deny-by-default rule (neither is in PUBLIC_PATHS),
//              and both are operator+ — every operator is owed the warning, and admin-gating it
//              would mean an operator-only install never sees one.
//
//              WHY DISMISSAL IS A SERVER CALL and not a click remembered in the browser: the
//              thing that was overwritten is the install, so the install has to be what forgets.
//              A localStorage flag would re-warn on the next machine and go silent forever after
//              one cache clear on this one.
//
//              WHY IT IS BEHIND AUTH RATHER THAN ON THE SIGN-IN SCREEN: an anonymous visitor
//              could otherwise dismiss a warning the operator never saw, which is the failure the
//              requirement exists to prevent — and the record names would be readable by anyone
//              who can reach the port. Full argument in reports/evolution/SEED-REDELIVERY-1.md.
// ============================================================

import express from 'express';
import { readNotices, dismissNotices } from '../seedNotices.js';

const router = express.Router();

// GET /api/seed-notices
router.get('/', (_req, res) => {
  res.json({ notices: readNotices() });
});

// POST /api/seed-notices/dismiss
router.post('/dismiss', (_req, res) => {
  const cleared = dismissNotices();
  res.json({ cleared, notices: [] });
});

export default router;
