// ============================================================
// check-tags.test.mjs — proof-of-live for the check-tags guard (Lesson 187).
//
// Run: node --test scripts/check-tags.test.mjs
//
// Feeds the guard a synthetic `git ls-remote --tags` payload (via --tags-file, so no network) and a
// synthetic TAGS.md: a fixture with a KNOWN unregistered tag asserts non-zero exit naming the tag +
// commit; a clean fixture asserts exit zero (and that dereferenced "^{}" lines are ignored); an
// empty tag list asserts the loud-failure rule (a checkout without tags must FAIL, never bless).
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, 'check-tags.mjs');

// Synthetic `git ls-remote --tags origin` output; the "^{}" line is a dereferenced annotated tag
// the guard must skip (so this is TWO tags, not three).
const LS_REMOTE =
  [
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\trefs/tags/pre/alpha',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\trefs/tags/pre/beta',
    'cccccccccccccccccccccccccccccccccccccccc\trefs/tags/pre/beta^{}',
  ].join('\n') + '\n';

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-tags-'));
  const paths = {};
  for (const [name, content] of Object.entries(files)) {
    const p = join(dir, name);
    writeFileSync(p, content);
    paths[name] = p;
  }
  return paths;
}

const runGuard = (tagsFile, tagsMd) =>
  spawnSync(process.execPath, [GUARD, `--tags-file=${tagsFile}`, `--tags-md=${tagsMd}`], {
    encoding: 'utf8',
  });

test('check-tags FAILS and names the tag + commit when a tag is unregistered', () => {
  const p = fixture({
    'ls-remote.txt': LS_REMOTE,
    'TAGS.md': '# Tags\n- `pre/alpha` registered\n', // pre/beta deliberately missing
  });
  const r = runGuard(p['ls-remote.txt'], p['TAGS.md']);
  assert.notEqual(r.status, 0, 'guard must exit non-zero on an unregistered tag');
  assert.match(r.stderr, /pre\/beta -> bbbbbbb/, 'guard must name the tag and its short commit');
  assert.doesNotMatch(r.stderr, /pre\/alpha ->/, 'the registered tag must NOT be flagged');
});

test('check-tags PASSES when every origin tag is registered (^{} lines ignored)', () => {
  const p = fixture({
    'ls-remote.txt': LS_REMOTE,
    'TAGS.md': '# Tags\n- `pre/alpha`\n- `pre/beta`\n',
  });
  const r = runGuard(p['ls-remote.txt'], p['TAGS.md']);
  assert.equal(r.status, 0, `guard must exit zero when all registered; stderr: ${r.stderr}`);
  assert.match(r.stdout, /2 origin tags checked, 0 unregistered/);
});

test('check-tags requires an EXACT token — a longer tag in the register does not satisfy a shorter one', () => {
  // Origin has `pre/motion`; the register names only `pre/motion-2`. Substring matching would wrongly
  // pass; whole-token matching must FAIL and name pre/motion.
  const p = fixture({
    'ls-remote.txt':
      'dddddddddddddddddddddddddddddddddddddddd\trefs/tags/pre/motion\n',
    'TAGS.md': '# Tags\n- `pre/motion-2` (a different, longer tag)\n',
  });
  const r = runGuard(p['ls-remote.txt'], p['TAGS.md']);
  assert.notEqual(r.status, 0, 'a longer tag must not satisfy the shorter one');
  assert.match(r.stderr, /pre\/motion -> ddddddd/, 'the shorter tag must be reported unregistered');
});

test('check-tags FAILS LOUDLY when the tag list is empty (a checkout without tags, Lesson 187)', () => {
  const p = fixture({ 'empty.txt': '', 'TAGS.md': '# Tags\n' });
  const r = runGuard(p['empty.txt'], p['TAGS.md']);
  assert.notEqual(r.status, 0, 'empty tag list must FAIL, never bless');
  assert.match(r.stderr, /EMPTY/i);
});
