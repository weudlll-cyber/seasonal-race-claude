// ============================================================
// File:        health.js
// Path:        server/src/health.js
// Project:     RaceArena — AUDIT-1 DECISIONS (A10-05)
// Created:     2026-10-12
// Description: The `GET /api/health` handler. It names the build (BUILD-FROM-OUTSIDE-1) and, since
//              the owner's decision of 2026-10-12, reports NOT OK when the account store cannot be
//              read — the one damaged file that leaves the server up while nobody can sign in.
//
// ── ★ THE HEALTHY ANSWER IS BYTE FOR BYTE WHAT IT WAS ──────────────────────────────────────────
// 200 `{ status: 'ok', timestamp, build }`, the same keys in the same order. The Docker
// HEALTHCHECK reads `r.ok`, `npm run status` and `check-image-starts` read `body.status === 'ok'`,
// and the VPS update and rollback read it too; none of them may see a difference while all is well.
//
// ── THE NOT-OK ANSWER ──────────────────────────────────────────────────────────────────────────
// 503 `{ status: 'error', timestamp, build, problems: [{ store: 'users', code, message }] }`. 503,
// not 200, so every reader above fails on it without being taught a new field. The message is a
// fixed sentence and `code` the error's code: this route is PUBLIC, so a file-system path from an
// error message must never reach it, and nothing is logged here because Docker asks every 30 s.
//
// AUDIT-1 measured the case (A10-05): `users.json` damaged → the server starts, health said ok,
// every sign-in answered 500. A damaged race store (A10-06) is deliberately NOT a health failure:
// the server keeps serving everything but races, which the audit judged contained.
// ============================================================

import defaultUsersStore from './auth/usersStore.js';
import { buildIdentity } from './buildIdentity.js';

/**
 * The problems that make this install unhealthy, empty when there are none.
 *
 * @param {{ countUsers: () => number }} usersStore
 * @returns {{ store: string, code: string, message: string }[]}
 */
export function healthProblems(usersStore) {
  try {
    usersStore.countUsers(); // reads and parses users.json; a missing file is a fresh install, fine
    return [];
  } catch (err) {
    return [
      {
        store: 'users',
        code: String(err?.code ?? 'UNREADABLE'),
        message: 'the account store (users.json) cannot be read, so nobody can sign in',
      },
    ];
  }
}

/** The route handler. `usersStore` is injectable for tests; production uses the default store. */
export function createHealthHandler({ usersStore = defaultUsersStore } = {}) {
  return (_req, res) => {
    const problems = healthProblems(usersStore);
    if (problems.length === 0) {
      res.json({ status: 'ok', timestamp: new Date().toISOString(), build: buildIdentity() });
      return;
    }
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      build: buildIdentity(),
      problems,
    });
  };
}
