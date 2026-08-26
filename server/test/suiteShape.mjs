// ============================================================
// File:        server/test/suiteShape.mjs
// Project:     RaceArena — GATE-SERIAL-BCRYPT-1
//
// THE ONE PLACE THAT ANSWERS "HOW DOES THE SERVER SUITE RUN".
//
// ── WHY IT EXISTS ──────────────────────────────────────────────────────────────────────────────
//
// It exists because the same fact had three owners and the two that stopped being true were the two
// being read. `20868394` dropped `--no-file-parallelism` from `server/package.json` on 2026-08-18;
// `scripts/verify.mjs` and `.github/workflows/ci.yml` both went on asserting it was there, and
// verify SCHEDULED on that belief — it ran the server suite beside the fingerprint jobs because it
// believed the suite was single-worker. GATE-RED-1 has the account.
//
// So the shape is DERIVED here, once, and every reader imports it:
//   - `server/vitest.config.js` builds its projects from it,
//   - `scripts/verify.mjs` decides the suite's scheduling from it.
// **There is no sentence anywhere that can disagree with the code, because there is no sentence.**
//
// ── NO VITEST DEPENDENCY, DELIBERATELY ─────────────────────────────────────────────────────────
//
// This module imports node builtins only. `verify.mjs` runs from the repository root, where
// `vitest/config` does not resolve — a shared module that needed it could not be read by the very
// caller whose stale belief caused the defect.
// ============================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** `server/`, whatever the caller's cwd is. */
export const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * THE TWO DOORS TO BCRYPT.
 *
 * `auth/usersStore.js` owns `BCRYPT_COST` and is the only module in the tree that calls bcrypt.
 * `test/authAgent.js` is the only helper that drives it on every call — it mints a user (one hash)
 * and logs in (one compare).
 *
 * MEASURED, NOT ASSUMED. Every server test file was run alone with `bcrypt.hash` and
 * `bcrypt.compare` instrumented; this rule agrees with that measurement on 24 of 24 files. The
 * obvious rule — "the bcrypt files are the ones under `src/auth/`" — is WRONG in both directions:
 * five route tests reach bcrypt through the agent, and `csrf`/`guards` never touch it.
 */
export const BCRYPT_DOORS = [
  /from\s+['"][^'"]*test\/authAgent\.js['"]/,
  /from\s+['"][^'"]*usersStore\.js['"]/,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'data') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.test.js')) out.push(relative(SERVER_ROOT, full).split('\\').join('/'));
  }
  return out;
}

/**
 * How the server suite runs, computed from the test files themselves.
 *
 * @returns {{all: string[], bounded: string[], parallel: string[], unbounded: boolean}}
 *   `bounded` spends bcrypt time and runs under a worker cap (`server/vitest.config.js` sets the
 *   number); `parallel` keeps full parallelism. `unbounded` is true only if NOTHING is capped —
 *   which is what a scheduler needs to know, and is the exact fact that went stale for eight days.
 */
export function suiteShape() {
  const all = walk(SERVER_ROOT).sort();
  // ── LOUD RATHER THAN SILENT (Lesson 187) ─────────────────────────────────────────────────────
  // A derivation that finds nothing must not hand the suite back to full parallelism on an
  // unverified assumption — that is this very defect arriving by a different route.
  if (all.length === 0) throw new Error('suiteShape: found no server test files at all');
  const bounded = all.filter((f) =>
    BCRYPT_DOORS.some((re) => re.test(readFileSync(join(SERVER_ROOT, f), 'utf8')))
  );
  if (bounded.length === 0)
    throw new Error(
      'suiteShape: no test file imports a bcrypt door. Either the doors were renamed (update ' +
        'BCRYPT_DOORS) or the suite stopped using bcrypt. Refusing to declare the suite unbounded ' +
        'on an unverified assumption.'
    );
  const boundedSet = new Set(bounded);
  return {
    all,
    bounded,
    parallel: all.filter((f) => !boundedSet.has(f)),
    unbounded: false,
  };
}
