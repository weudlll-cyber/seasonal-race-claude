#!/usr/bin/env node
// ============================================================
// File:        migrate-teams.mjs
// Path:        scripts/migrate-teams.mjs
// Project:     RaceArena
// Description: The teams backfill, run once (TEAMS-1). Host-only — no HTTP, no ports. Acts on
//              DATA_ROOT/users.json (default: server/data) through the shared usersStore.
//
//  Usage:
//    node scripts/migrate-teams.mjs --dry-run    Report what WOULD change; write nothing.
//    node scripts/migrate-teams.mjs              Put every teamless user in the founding team.
//
//  Idempotent: a user who already has a team is skipped. See server/src/auth/migrateTeams.js for
//  why it writes through the store and why it logs nobody out.
//
//  Operational note: run with the server stopped, or at minimum with no concurrent user writes —
//  the store's lock only covers a single process.
// ============================================================

import { migrateTeams } from '../server/src/auth/migrateTeams.js';

const dryRun = process.argv.includes('--dry-run');

try {
  const result = await migrateTeams({ dryRun });

  const verb = dryRun ? 'would join' : 'joined';
  console.log(`[migrate-teams] ${result.total} user(s) in the store.`);
  console.log(`[migrate-teams] ${result.changed} ${verb} "${result.team}"; ${result.skipped} already had a team.`);
  for (const name of result.changedUsernames) console.log(`[migrate-teams]   - ${name}`);
  if (dryRun) console.log('[migrate-teams] DRY RUN — nothing was written.');

  process.exit(0);
} catch (err) {
  console.error(`[migrate-teams] FAILED: ${err.code ?? ''} ${err.message}`);
  process.exit(1);
}
