#!/usr/bin/env node
// ============================================================
// File:        recover-admin.mjs
// Path:        scripts/recover-admin.mjs
// Project:     RaceArena
// Description: Local admin-recovery CLI (AUTH.md §9a).
//              Host-only — no HTTP, no ports. Acts directly on
//              server/data/users.json via the shared usersStore.
//
//  Usage:
//    node scripts/recover-admin.mjs promote <username>
//        Promote (or create) <username> as admin with a new password.
//        Password: set RA_RECOVERY_PASSWORD env var, or enter at prompt.
//
//    node scripts/recover-admin.mjs rearm-setup
//        Remove the setup-complete marker so /setup can run again.
//        Only effective when NO users exist — warns clearly otherwise.
//
//  Security note: password is NEVER passed as a CLI argument (avoids
//  shell-history and process-listing leaks). Use the env var for
//  non-interactive / scripted use.
//
//  Operational note: run with the server stopped, or at minimum with
//  no concurrent user writes, to avoid lost-update races (the
//  in-process store lock only covers within a single process).
// ============================================================

import { createInterface } from 'node:readline';
import { promoteOrCreate, rearmSetup } from '../server/src/auth/recoverAdmin.js';

// ── Argument parsing ──────────────────────────────────────────────────────────

const ACTION = process.argv[2];
const USERNAME = process.argv[3];

const VALID_ACTIONS = ['promote', 'rearm-setup'];

if (!VALID_ACTIONS.includes(ACTION)) {
  process.stderr.write(`
[recover-admin] ERROR: unknown action "${ACTION ?? '(none provided)'}"

Usage:
  node scripts/recover-admin.mjs promote <username>
  node scripts/recover-admin.mjs rearm-setup

`);
  process.exit(1);
}

if (ACTION === 'promote' && !USERNAME) {
  process.stderr.write(`
[recover-admin] ERROR: "promote" requires a <username> argument.

  Usage: node scripts/recover-admin.mjs promote <username>

`);
  process.exit(1);
}

// ── Password reader ───────────────────────────────────────────────────────────

// Reads a password from stdin without echoing typed characters to the terminal.
// Requires stdin to be a TTY; falls back to a visible readline prompt if not
// (e.g. piped input or automated test environments) — documented best-effort.
async function readPassword() {
  const fromEnv = process.env.RA_RECOVERY_PASSWORD;
  if (fromEnv) {
    process.stderr.write('[recover-admin] Using password from RA_RECOVERY_PASSWORD env var.\n');
    return fromEnv;
  }

  if (process.stdin.isTTY) {
    // TTY path: suppress terminal echo while reading, then restore it.
    return new Promise((resolve, reject) => {
      process.stderr.write('New password (not a CLI arg — not in shell history): ');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      let buf = '';
      process.stdin.on('data', function onData(ch) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stderr.write('\n');
          resolve(buf);
        } else if (ch === '') {
          // Ctrl-C
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stderr.write('\n[recover-admin] Aborted.\n');
          reject(new Error('Aborted by user'));
        } else if (ch === '' || ch === '\b') {
          // Backspace
          buf = buf.slice(0, -1);
        } else {
          buf += ch;
        }
      });

      process.stdin.on('error', reject);
    });
  }

  // Non-TTY fallback (piped/scripted): visible readline prompt.
  // Use RA_RECOVERY_PASSWORD env var for fully non-echoed scripted use.
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.question('New password (not a CLI arg — not in shell history): ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  process.stderr.write('\n[recover-admin] RaceArena local admin-recovery CLI (AUTH.md §9a)\n');
  process.stderr.write('[recover-admin] WARNING: Prefer running with the server stopped.\n\n');

  if (ACTION === 'promote') {
    const newPassword = await readPassword();
    if (!newPassword || !newPassword.trim()) {
      process.stderr.write('[recover-admin] ERROR: Password must not be empty.\n');
      process.exit(1);
    }

    process.stderr.write(`[recover-admin] Promoting/creating "${USERNAME}" as admin…\n`);
    const { action, user } = await promoteOrCreate(USERNAME, newPassword);

    process.stdout.write(`
[recover-admin] SUCCESS
  Action   : ${action}
  Username : ${user.username}
  Role     : ${user.role}
  Note     : Old sessions for this user are now invalid (sessionEpoch bumped).
  Next     : Log in at /login with the new password.

`);
    return;
  }

  if (ACTION === 'rearm-setup') {
    process.stderr.write('[recover-admin] Removing setup-complete marker…\n');
    const result = rearmSetup();

    process.stdout.write(`
[recover-admin] Marker: ${result.outcome}
  Users in store : ${result.userCount}
`);

    if (!result.setupWillWork) {
      process.stdout.write(`
  *** WARNING — /setup WILL NOT WORK ***
  ${result.userCount} user(s) exist. The POST /setup endpoint refuses when
  countUsers() > 0, even without the marker file.

  If you are locked out and users exist, use "promote" instead:

    node scripts/recover-admin.mjs promote <username>

`);
    } else {
      process.stdout.write(`
  No users exist. /setup will accept a new first admin.
  Open the app and complete initial setup, or POST /api/auth/setup directly.

`);
    }
  }
}

main().catch((err) => {
  process.stderr.write(`\n[recover-admin] FATAL: ${err.message}\n`);
  process.exit(1);
});
