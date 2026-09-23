// ============================================================
// File:        worktree-stubs.test.mjs
// Path:        scripts/worktree-stubs.test.mjs
// Project:     RaceArena — POLISH-2026-09-24B piece 4(a)
// Description: The stub reader tells live from dead, and the remover only ever touches `.git/`.
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { readStubs, removeStub } = await import(pathToFileURL(join(HERE, 'worktree-stubs.mjs')).href);

/** Build a `.git/worktrees`-shaped directory with the stubs asked for. */
function fixture(spec) {
  const root = mkdtempSync(join(tmpdir(), 'ra-wt-'));
  const wt = join(root, 'worktrees');
  mkdirSync(wt, { recursive: true });
  for (const [name, kind] of Object.entries(spec)) {
    const dir = join(wt, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'HEAD'), 'ref: refs/heads/x\n');
    if (kind === 'no-pointer') continue;
    const checkout = join(root, 'checkouts', name);
    if (kind === 'live') mkdirSync(checkout, { recursive: true });
    // the pointer names the checkout's own `.git` FILE; the checkout is its parent
    writeFileSync(join(dir, 'gitdir'), join(checkout, '.git') + '\n');
  }
  return { root, wt };
}

test('a stub whose checkout still exists is LIVE', () => {
  const { root, wt } = fixture({ alive: 'live' });
  try {
    const [s] = readStubs(wt);
    assert.equal(s.name, 'alive');
    assert.equal(s.alive, true);
    assert.equal(s.reason, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a stub whose checkout is gone is DEAD, and says why', () => {
  const { root, wt } = fixture({ gone: 'dangling' });
  try {
    const [s] = readStubs(wt);
    assert.equal(s.alive, false);
    assert.equal(s.reason, 'checkout is gone');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('★ a stub with no gitdir pointer is dead by definition, not skipped', () => {
  // This is the shape all 18 real stubs in this repository were in on 2026-09-24 — the most
  // orphaned kind there is, and the one a reader is most likely to assume is unhandled.
  const { root, wt } = fixture({ orphan: 'no-pointer' });
  try {
    const [s] = readStubs(wt);
    assert.equal(s.alive, false);
    assert.equal(s.reason, 'no gitdir pointer');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('★★ removing a stub deletes the REGISTRATION and never the checkout', () => {
  // The whole safety argument. A scratch worktree's node_modules is a junction to the real one, and
  // deleting a checkout would follow it. Nothing outside the registration may be touched.
  const { root, wt } = fixture({ alive: 'live' });
  try {
    const [s] = readStubs(wt);
    assert.equal(existsSync(s.checkout), true);
    const r = removeStub(s);
    assert.equal(r.ok, true);
    assert.equal(existsSync(s.dir), false, 'the registration is gone');
    assert.equal(existsSync(s.checkout), true, 'THE CHECKOUT IS UNTOUCHED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a missing worktrees directory reads as nothing registered', () => {
  assert.deepEqual(readStubs(join(tmpdir(), 'ra-wt-does-not-exist-9912')), []);
});

test('live and dead are separated correctly in a mixed directory', () => {
  const { root, wt } = fixture({ a: 'live', b: 'dangling', c: 'no-pointer', d: 'live' });
  try {
    const stubs = readStubs(wt);
    assert.equal(stubs.length, 4);
    assert.equal(stubs.filter((s) => s.alive).length, 2);
    assert.equal(stubs.filter((s) => !s.alive).length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
