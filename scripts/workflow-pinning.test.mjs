// ============================================================
// File:        workflow-pinning.test.mjs
// Path:        scripts/workflow-pinning.test.mjs
// Project:     RaceArena — AUDIT-1 A5 (CI workflows, 2026-10-09)
// Description: Every third-party action a live workflow runs is pinned to a full commit SHA.
//
// A tag such as `@v4` is a pointer its publisher can move: whoever controls the action's repository
// can make the next run of this CI execute different code with this repository's checkout and token,
// and nothing here would change to show it. A 40-character commit SHA cannot be moved. The release
// it was taken from is kept in a trailing comment (`# v4.4.0`) so an update stays readable.
//
// Scope: the live workflows (`*.yml` / `*.yaml`). `deploy.yml.disabled` is not run by GitHub and is
// left as written. A local action (`uses: ./…`) and a `docker://` reference are not tags and are
// allowed through.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');
const LIVE = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f));

test('the live workflows exist — a check that reads nothing proves nothing', () => {
  assert.ok(LIVE.length >= 3, `expected the three live workflows, found ${LIVE.join(', ')}`);
});

test('every `uses:` names a 40-character commit SHA', () => {
  const unpinned = [];
  for (const file of LIVE) {
    readFileSync(join(DIR, file), 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        const m = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/.exec(line);
        if (!m || m[1].startsWith('./') || m[1].startsWith('docker://')) return;
        if (!/@[0-9a-f]{40}$/.test(m[1])) unpinned.push(`${file}:${i + 1} ${m[1]}`);
      });
  }
  assert.deepEqual(unpinned, [], `actions not pinned to a commit SHA:\n  ${unpinned.join('\n  ')}`);
});
