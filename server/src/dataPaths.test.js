// ============================================================
// File:        dataPaths.test.js
// Path:        server/src/dataPaths.test.js
// Project:     RaceArena
// Description: Unit tests for resolveDataRoot — pure function, no imports to worry about.
//              L126: without the resolver consumers ignore RA_DATA_DIR (stays hardcoded).
//              With the resolver: env override and module-relative default both work.
// ============================================================

import { describe, it, expect } from 'vitest';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveDataRoot, DATA_ROOT } from './dataPaths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPECTED_DEFAULT = resolve(__dirname, '../data');

describe('resolveDataRoot', () => {
  it('returns path.resolve of RA_DATA_DIR when set', () => {
    expect(resolveDataRoot({ RA_DATA_DIR: '/tmp/x' })).toBe(resolve('/tmp/x'));
  });

  it('returns the module-relative server/data path when RA_DATA_DIR is absent', () => {
    expect(resolveDataRoot({})).toBe(EXPECTED_DEFAULT);
  });

  it('returns the module-relative server/data path when RA_DATA_DIR is undefined', () => {
    expect(resolveDataRoot({ RA_DATA_DIR: undefined })).toBe(EXPECTED_DEFAULT);
  });

  it('DATA_ROOT equals resolveDataRoot() at import time', () => {
    // DATA_ROOT is fixed when dataPaths.js is first imported (env-setup sets RA_DATA_DIR
    // to a temp dir before any module loads, so DATA_ROOT = resolve(RA_DATA_DIR)).
    expect(DATA_ROOT).toBe(resolveDataRoot(process.env));
  });
});
