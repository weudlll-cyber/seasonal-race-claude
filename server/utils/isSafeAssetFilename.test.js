// ============================================================
// File:        isSafeAssetFilename.test.js
// Path:        server/utils/isSafeAssetFilename.test.js
// Project:     RaceArena
// Description: Unit tests for isSafeAssetFilename.
//              L126: without the guard a traversal name flows into join() and
//              may resolve outside the asset dir; with the guard it is rejected.
// ============================================================

import { describe, it, expect } from 'vitest';
import { isSafeAssetFilename } from './isSafeAssetFilename.js';

describe('isSafeAssetFilename', () => {
  // ── Valid filenames ───────────────────────────────────────────────────────────

  it.each([
    'dirt-oval.png',
    'brand-id.jpg',
    'seasonal-entertainment.jpg',
    'space-sprint.jpg',
    'my-file.webp',
    'a.png',
  ])('accepts valid filename: %s', (name) => {
    expect(isSafeAssetFilename(name)).toBe(true);
  });

  // ── Rejected: traversal and special characters ────────────────────────────────

  it('rejects empty string', () => {
    expect(isSafeAssetFilename('')).toBe(false);
  });

  it('rejects "."', () => {
    expect(isSafeAssetFilename('.')).toBe(false);
  });

  it('rejects ".."', () => {
    expect(isSafeAssetFilename('..')).toBe(false);
  });

  it('rejects path traversal with forward slash: ../../etc/passwd', () => {
    expect(isSafeAssetFilename('../../etc/passwd')).toBe(false);
  });

  it('rejects path with forward slash: a/b.png', () => {
    expect(isSafeAssetFilename('a/b.png')).toBe(false);
  });

  it('rejects path with backslash: a\\b.png', () => {
    expect(isSafeAssetFilename('a\\b.png')).toBe(false);
  });

  it('rejects NUL byte: x\\0.png', () => {
    expect(isSafeAssetFilename('x\0.png')).toBe(false);
  });

  it('rejects Windows drive prefix: C:evil', () => {
    expect(isSafeAssetFilename('C:evil')).toBe(false);
  });

  it('rejects non-string (null)', () => {
    expect(isSafeAssetFilename(null)).toBe(false);
  });

  it('rejects non-string (number)', () => {
    expect(isSafeAssetFilename(42)).toBe(false);
  });

  it('rejects non-string (undefined)', () => {
    expect(isSafeAssetFilename(undefined)).toBe(false);
  });
});
