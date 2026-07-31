// ============================================================
// check-index.test.mjs — proof-of-live for the check-index guard (Lesson 187).
//
// Run: node --test scripts/check-index.test.mjs
//
// A guard nobody has ever seen fail is indistinguishable from a guard that cannot fail. These
// tests feed the guard a synthetic reports dir with a KNOWN unindexed report and assert it exits
// non-zero and names the offender, a clean dir asserting exit zero, and an empty dir asserting the
// loud-failure rule (zero reports must FAIL, never silently pass).
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, 'check-index.mjs');

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-index-'));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

const runGuard = (dir) => spawnSync(process.execPath, [GUARD, `--dir=${dir}`], { encoding: 'utf8' });

test('check-index FAILS and names the offender when a report is unindexed', () => {
  const dir = fixture({
    'INDEX.md': '# Index\n- [R1.md](R1.md) — indexed\n',
    'R1.md': '# R1',
    'R2.md': '# R2 — deliberately NOT linked',
  });
  const r = runGuard(dir);
  assert.notEqual(r.status, 0, 'guard must exit non-zero on an unindexed report');
  assert.match(r.stderr, /R2\.md/, 'guard must name the unindexed report');
  assert.doesNotMatch(r.stderr, /^R1\.md$/m, 'the indexed report must NOT be flagged');
});

test('check-index PASSES when every report is indexed', () => {
  const dir = fixture({
    'INDEX.md': '# Index\n- [R1.md](R1.md)\n- [R2.md](R2.md)\n',
    'R1.md': '# R1',
    'R2.md': '# R2',
  });
  const r = runGuard(dir);
  assert.equal(r.status, 0, `guard must exit zero when all indexed; stderr: ${r.stderr}`);
  assert.match(r.stdout, /0 unindexed/);
});

test('check-index FAILS LOUDLY on an empty reports dir (no silent no-op, Lesson 187)', () => {
  const dir = fixture({ 'INDEX.md': '# Index (nothing to point at)\n' });
  const r = runGuard(dir);
  assert.notEqual(r.status, 0, 'zero reports must FAIL, never silently pass');
  assert.match(r.stderr, /zero reports/i);
});
