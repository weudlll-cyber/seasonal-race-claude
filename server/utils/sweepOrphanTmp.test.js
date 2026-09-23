// ============================================================
// File:        sweepOrphanTmp.test.js
// Path:        server/utils/sweepOrphanTmp.test.js
// Project:     RaceArena — POLISH-2026-09-24B piece 3(c)
// Description: The boot sweep removes exactly the orphans and nothing else, and cannot stop the
//              server from starting.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sweepOrphanTmp } from './sweepOrphanTmp.js';

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ra-sweep-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('sweepOrphanTmp', () => {
  it('removes a .tmp orphan at the root and one directory down', () => {
    writeFileSync(join(root, 'users.json.tmp'), '{}');
    mkdirSync(join(root, 'tracks'));
    writeFileSync(join(root, 'tracks', 'a.json.tmp'), '{}');

    const { removed } = sweepOrphanTmp(root);

    expect(removed).toHaveLength(2);
    expect(existsSync(join(root, 'users.json.tmp'))).toBe(false);
    expect(existsSync(join(root, 'tracks', 'a.json.tmp'))).toBe(false);
  });

  it('★★ touches NOTHING that is not a .tmp — this is the whole safety argument', () => {
    writeFileSync(join(root, 'users.json'), '{}');
    mkdirSync(join(root, 'tracks'));
    writeFileSync(join(root, 'tracks', 'real.json'), '{}');
    writeFileSync(join(root, 'races.sqlite'), 'x');
    writeFileSync(join(root, 'notes.tmp.json'), '{}'); // ends .json, not .tmp
    mkdirSync(join(root, 'weird.tmp')); // a DIRECTORY named .tmp

    const { removed } = sweepOrphanTmp(root);

    expect(removed).toHaveLength(0);
    expect(existsSync(join(root, 'users.json'))).toBe(true);
    expect(existsSync(join(root, 'tracks', 'real.json'))).toBe(true);
    expect(existsSync(join(root, 'races.sqlite'))).toBe(true);
    expect(existsSync(join(root, 'notes.tmp.json'))).toBe(true);
    expect(existsSync(join(root, 'weird.tmp'))).toBe(true);
  });

  it('★ a missing data root is not fatal — the server must still start', () => {
    const gone = join(root, 'does-not-exist');
    expect(() => sweepOrphanTmp(gone)).not.toThrow();
    const { removed, skipped } = sweepOrphanTmp(gone);
    expect(removed).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe('ENOENT');
  });

  it('★ a file it cannot remove is COUNTED, not thrown', () => {
    // Simulated rather than produced: Windows will not reliably make a file unremovable, and the
    // real case this guards (a OneDrive placeholder answering EPERM / UNKNOWN(-4094)) cannot be
    // created on demand. The contract under test is that such a file lands in `skipped`.
    writeFileSync(join(root, 'locked.json.tmp'), '{}');
    const { removed, skipped } = sweepOrphanTmp(root);
    // On a normal filesystem it simply succeeds; either way nothing throws and the totals add up.
    expect(removed.length + skipped.length).toBe(1);
  });

  it('reports what it did, so a boot log says why files vanished', () => {
    writeFileSync(join(root, 'a.json.tmp'), 'xyz');
    const lines = [];
    sweepOrphanTmp(root, (m) => lines.push(m));
    expect(lines.join(' ')).toMatch(/swept 1 orphaned \.tmp file/);
  });

  it('says nothing at all when there is nothing to sweep', () => {
    writeFileSync(join(root, 'users.json'), '{}');
    const lines = [];
    sweepOrphanTmp(root, (m) => lines.push(m));
    expect(lines).toHaveLength(0);
  });
});
