// ============================================================
// File:        removeStoredAsset.test.js
// Path:        server/utils/removeStoredAsset.test.js
// Project:     RaceArena — AUDIT-1 A5M-09 (2026-10-09)
// Description: A stored asset name is unlinked only when it is a plain filename; anything that
//              could escape the asset directory is refused, logged and left in place.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { removeStoredAsset } from './removeStoredAsset.js';

let root;
let dir;
beforeEach(() => {
  root = mkdtempSync(join(os.tmpdir(), 'ra-asset-'));
  dir = join(root, 'logos');
  mkdirSync(dir);
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe('removeStoredAsset', () => {
  it('refuses a name that escapes the directory: the bystander survives, the operator is told', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bystander = join(root, 'users.json');
    writeFileSync(bystander, '[]');
    expect(removeStoredAsset(dir, '../users.json', 'brands', 'logo for "x"')).toBe(false);
    expect(existsSync(bystander), 'a file outside the asset directory was deleted').toBe(true);
    expect(warn.mock.calls.join(' ')).toMatch(/\[brands\] refusing to delete logo for "x"/);
  });

  it('removes an ordinary stored file — the check must not break deletion', () => {
    const legit = join(dir, 'acme.png');
    writeFileSync(legit, 'png');
    expect(removeStoredAsset(dir, 'acme.png', 'brands', 'logo')).toBe(true);
    expect(existsSync(legit)).toBe(false);
  });

  it('does nothing for an empty name or a file that is already gone', () => {
    expect(removeStoredAsset(dir, null, 'brands', 'logo')).toBe(true);
    expect(removeStoredAsset(dir, '', 'brands', 'logo')).toBe(true);
    expect(removeStoredAsset(dir, 'gone.png', 'brands', 'logo')).toBe(true);
  });
});
