// ============================================================
// File:        recoverAdmin.js
// Path:        server/src/auth/recoverAdmin.js
// Project:     RaceArena
// Description: Core logic for the local admin-recovery CLI (AUTH.md §9a).
//              NO HTTP — filesystem + usersStore only. Imported by
//              scripts/recover-admin.mjs (the CLI wrapper) and its test suite.
//
//              Cross-process warning: the in-process store lock only guards
//              within one process. Run with the server stopped (or no
//              concurrent user writes) to avoid lost-update races.
// ============================================================

import { existsSync, unlinkSync, appendFileSync } from 'node:fs';
import { join } from 'path';
import defaultStore from './usersStore.js';
import { SETUP_MARKER_PATH } from './paths.js';
import { DATA_ROOT } from '../dataPaths.js';
import { FOUNDING_TEAM } from './teams.js';

const DEFAULT_AUDIT_LOG_PATH = join(DATA_ROOT, 'recover-admin-audit.log');

function writeAuditLine(auditLogPath, record) {
  // NEVER include password or passwordHash in audit output.
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n';
  appendFileSync(auditLogPath, line, 'utf8');
}

/**
 * Promote an existing user to admin (resetting their password), or create a
 * new admin if the username doesn't exist. Delegates entirely to store methods
 * — inherits serialization, 0o600 permissions, and bcrypt hashing.
 *
 * @param {string} username
 * @param {string} newPassword  — must NOT arrive as a CLI argument (caller responsibility)
 * @param {{ store?, auditLogPath? }} [opts]
 * @returns {{ action: 'PROMOTE_RESET'|'CREATE_ADMIN', user: object }}
 */
export async function promoteOrCreate(username, newPassword, {
  store = defaultStore,
  auditLogPath = DEFAULT_AUDIT_LOG_PATH,
} = {}) {
  if (!username || !String(username).trim()) {
    const err = new Error('Username is required');
    err.code = 'MISSING_USERNAME';
    throw err;
  }

  const existing = store.findAuthRecordByUsername(username);
  let result;
  let action;

  if (existing) {
    // Single serialized write: set role:'admin' AND reset password together.
    // updateUser's last-admin guard only blocks demotion — promotion never fires it.
    // Password reset bumps sessionEpoch, invalidating any existing sessions (desired).
    result = await store.updateUser(existing.id, { role: 'admin', password: newPassword });
    action = 'PROMOTE_RESET';
  } else {
    // THE TEAM ON THE RECOVERY PATH. This branch runs when the named user does not exist — the
    // "I have locked myself out and there is no account" case — so it must work against a store
    // that is empty and has no team to pick from. It founds the same team a fresh install founds
    // (teams.js), explicitly. The PROMOTE branch above deliberately passes no team at all: an
    // existing user keeps whichever team they are already in, because recovering an account is not
    // an occasion to move somebody between teams.
    result = await store.createUser({
      username,
      password: newPassword,
      role: 'admin',
      team: FOUNDING_TEAM,
      allowNewTeam: true,
      createdBy: 'recover-admin-cli',
    });
    action = 'CREATE_ADMIN';
  }

  writeAuditLine(auditLogPath, { action, username: result.username, outcome: 'success' });
  return { action, user: result };
}

/**
 * Remove the setup-complete marker so the /setup endpoint can be triggered
 * again. Only useful when users.json is empty; warns clearly otherwise since
 * POST /setup rejects if countUsers() > 0.
 *
 * @param {{ markerPath?, store?, auditLogPath? }} [opts]
 * @returns {{ action, outcome, userCount, setupWillWork: boolean }}
 */
export function rearmSetup({
  markerPath = SETUP_MARKER_PATH,
  store = defaultStore,
  auditLogPath = DEFAULT_AUDIT_LOG_PATH,
} = {}) {
  const userCount = store.countUsers();
  const markerPresent = existsSync(markerPath);

  if (markerPresent) {
    unlinkSync(markerPath);
    writeAuditLine(auditLogPath, { action: 'REARM_SETUP', username: '-', outcome: 'marker-removed' });
  }

  return {
    action: 'REARM_SETUP',
    outcome: markerPresent ? 'marker-removed' : 'marker-already-absent',
    userCount,
    // POST /setup guards on countUsers() > 0 regardless of the marker.
    // setupWillWork is false whenever users exist — caller must surface this.
    setupWillWork: userCount === 0,
  };
}
