// ============================================================
// File:        seedRuntime.test.js
// Path:        server/src/seedRuntime.test.js
// Project:     RaceArena
// Description: Unit/integration tests for seedTypeFromSnapshot.
//              L126: without the snapshot copy a fresh DATA_ROOT has no defaults
//              (no geometry, no bytes) — that is the failing baseline.
//              With the snapshot copy all asserts are met.
// ============================================================

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, existsSync, statSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'path';
import os from 'node:os';
import { seedTypeFromSnapshot } from './seedRuntime.js';

function makeTempRoot() {
  return mkdtempSync(join(os.tmpdir(), 'ra-seed-test-'));
}

describe('seedTypeFromSnapshot — fresh DATA_ROOT', () => {
  const roots = [];
  afterEach(() => {
    for (const r of roots.splice(0)) {
      try {
        rmSync(r, { recursive: true, force: true });
      } catch {
        // Test teardown on a directory that may never have been created.
      }
    }
  });

  it('copies a rich track (dirt-oval) with real geometry and backgroundImageFile', () => {
    const root = makeTempRoot();
    roots.push(root);
    seedTypeFromSnapshot('tracks', root);
    const trackPath = join(root, 'tracks', 'dirt-oval.json');
    expect(existsSync(trackPath)).toBe(true);
    const track = JSON.parse(readFileSync(trackPath, 'utf8'));
    expect(track.geometryId).toBeTruthy();
    expect(Array.isArray(track.innerPoints) && track.innerPoints.length > 0).toBe(true);
    expect(track.backgroundImageFile).toBeTruthy();
  });

  it('copies the background image file with non-zero bytes', () => {
    const root = makeTempRoot();
    roots.push(root);
    // Need both types seeded to get the bg file
    seedTypeFromSnapshot('tracks', root);
    const track = JSON.parse(readFileSync(join(root, 'tracks', 'dirt-oval.json'), 'utf8'));
    seedTypeFromSnapshot('backgrounds', root);
    const bgPath = join(root, 'backgrounds', track.backgroundImageFile);
    expect(existsSync(bgPath)).toBe(true);
    expect(statSync(bgPath).size).toBeGreaterThan(0);
  });

  it('copies the default brand JSON', () => {
    const root = makeTempRoot();
    roots.push(root);
    seedTypeFromSnapshot('brands', root);
    const brandPath = join(root, 'brands', 'seasonal-entertainment.json');
    expect(existsSync(brandPath)).toBe(true);
    const brand = JSON.parse(readFileSync(brandPath, 'utf8'));
    expect(brand.id).toBe('seasonal-entertainment');
    expect(brand.isDefault).toBe(true);
  });

  it('copies the brand logo binary with non-zero bytes', () => {
    const root = makeTempRoot();
    roots.push(root);
    seedTypeFromSnapshot('brand-logos', root);
    const logoPath = join(root, 'brand-logos', 'seasonal-entertainment.jpg');
    expect(existsSync(logoPath)).toBe(true);
    expect(statSync(logoPath).size).toBeGreaterThan(0);
  });

  it('copies the default player group', () => {
    const root = makeTempRoot();
    roots.push(root);
    seedTypeFromSnapshot('player-groups', root);
    const groupPath = join(root, 'player-groups', 'default-example-group.json');
    expect(existsSync(groupPath)).toBe(true);
    const group = JSON.parse(readFileSync(groupPath, 'utf8'));
    expect(group.id).toBe('default-example-group');
    expect(group.isDefault).toBe(true);
  });

  it('is idempotent — does not overwrite an existing destination file', () => {
    const root = makeTempRoot();
    roots.push(root);
    seedTypeFromSnapshot('player-groups', root);
    const groupPath = join(root, 'player-groups', 'default-example-group.json');
    // Overwrite the file with custom content
    const sentinel = JSON.stringify({ id: 'default-example-group', custom: true });
    writeFileSync(groupPath, sentinel, 'utf8');
    // Second run must not overwrite
    seedTypeFromSnapshot('player-groups', root);
    expect(readFileSync(groupPath, 'utf8')).toBe(sentinel);
  });
});
