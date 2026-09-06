// ============================================================
// File:        migrateTeams.js
// Path:        server/src/auth/migrateTeams.js
// Project:     RaceArena
// Created:     2026-09-06
// Description: THE BACKFILL, run once: every user who predates teams joins the founding team.
//              NO HTTP — usersStore only. Imported by scripts/migrate-teams.mjs and its tests,
//              the same split recoverAdmin.js uses.
//
//              Cross-process warning, inherited from recoverAdmin.js and true for the same
//              reason: the store's lock only serialises within ONE process. Run this with the
//              server stopped, or at least with nobody editing users.
//
// ── WHY IT GOES THROUGH updateUser AND NOT STRAIGHT AT THE FILE ─────────────────────────────────
// Writing users.json here directly would be a SECOND write path for the users store, and it would
// have to re-implement three things the store already does: the serialising lock, the atomic
// write, and the 0o600 permission repair. Any of the three drifting would be a security defect in
// the least-exercised code in the repository. So the migration owns no writing of its own; it
// decides WHICH users to change and lets the store change them.
//
// ── WHY IT DOES NOT LOG ANYBODY OUT ─────────────────────────────────────────────────────────────
// `updateUser` bumps `sessionEpoch` only when a PASSWORD changes. This passes a team and no
// password, so every live session survives the migration. That is not incidental — the owner has
// one admin account, and a backfill that ended his session would be indistinguishable, from where
// he is sitting, from a backfill that broke his login.
//
// ── IDEMPOTENT, SO "ONCE" IS A PROPERTY AND NOT AN INSTRUCTION ──────────────────────────────────
// A user who already has a team is skipped and reported as such. Running it twice changes nothing
// the second time, and running it after new users have been created on purpose does not drag them
// into the founding team. There is no marker file and no version counter, because the users
// themselves already record whether the work is done.
// ============================================================

import defaultStore from './usersStore.js';
import { FOUNDING_TEAM, isWellFormedTeam } from './teams.js';

/**
 * Put every teamless user into the founding team.
 *
 * @param {{ store?, team?, dryRun?: boolean }} [opts]
 *        `team` exists so the tests can prove the mechanism without asserting on the constant;
 *        production callers pass nothing and get FOUNDING_TEAM.
 * @returns {Promise<{changed: number, skipped: number, total: number, team: string,
 *                    changedUsernames: string[], dryRun: boolean}>}
 */
export async function migrateTeams({
  store = defaultStore,
  team = FOUNDING_TEAM,
  dryRun = false,
} = {}) {
  const users = store.readUsers();
  const needing = users.filter((u) => !isWellFormedTeam(u.team));

  const changedUsernames = [];
  for (const user of needing) {
    if (!dryRun) {
      // allowNewTeam: the founding team does not exist yet on the FIRST user this touches, and
      // must not be refused for that. From the second user on it matches and is adopted, so every
      // migrated user ends on one identical spelling.
      await store.updateUser(user.id, { team, allowNewTeam: true });
    }
    changedUsernames.push(user.username);
  }

  return {
    changed: changedUsernames.length,
    skipped: users.length - needing.length,
    total: users.length,
    team,
    changedUsernames,
    dryRun,
  };
}
