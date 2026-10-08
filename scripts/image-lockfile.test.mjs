// ============================================================
// File:        image-lockfile.test.mjs
// Path:        scripts/image-lockfile.test.mjs
// Project:     RaceArena — AUDIT-1 A5M-19 (2026-10-09)
// Description: The server image installs EXACTLY the dependency tree its lockfile records.
//
// The runtime stage copied `server/package.json` alone and ran `npm install --omit=dev`, so every
// build resolved the tree afresh within the semver ranges: the tree that was audited and tested
// was not the tree that shipped. Three facts have to hold together for the image to be
// reproducible, and losing any one of them silently undoes it — so all three are pinned here:
//   1. `.dockerignore` (an allow-list) lets the lockfile into the build context;
//   2. the runtime stage COPYs it;
//   3. the runtime stage installs with `npm ci`, which honours it and refuses a disagreeing one.
// It reads the files as text: the proof that the lockfile is IN SYNC is a real `docker build`,
// recorded in reports/release/AUDIT-1.md, because only npm can answer that.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** The Dockerfile's LAST stage — the image that ships; earlier stages are thrown away. */
function runtimeStage(dockerfile) {
  const stages = dockerfile.split(/^FROM\s/m);
  return stages[stages.length - 1];
}

test('the build context admits the server lockfile', () => {
  const lines = read('.dockerignore').split(/\r?\n/).map((l) => l.trim());
  assert.ok(lines.includes('!server/package-lock.json'), '.dockerignore must re-include server/package-lock.json');
});

test('the runtime stage copies the lockfile and installs with npm ci', () => {
  const stage = runtimeStage(read('server/Dockerfile'));
  const copy = stage.split(/\r?\n/).find((l) => /^COPY\s/.test(l) && l.includes('server/package.json'));
  assert.ok(copy, 'the runtime stage must COPY server/package.json');
  assert.match(copy, /server\/package-lock\.json/, 'the same COPY must bring server/package-lock.json');
  // `assert.ok`, not `assert.match`: a failure should name the rule, not print the whole stage.
  assert.ok(/^RUN npm ci --omit=dev\b/m.test(stage), 'the runtime stage must install with `npm ci --omit=dev`');
  assert.ok(!/^RUN npm install\b/m.test(stage), 'no `npm install` may resolve the tree afresh');
});
