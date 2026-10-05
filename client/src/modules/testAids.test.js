// @vitest-environment node
// ============================================================
// File:        testAids.test.js
// Path:        client/src/modules/testAids.test.js
// Project:     RaceArena — TEST-AIDS-1
// Description: The one place the client reads the test-aids switch. OFF until the server says ON,
//              OFF on any doubt, and what OFF does to a config and to an address-bar flag.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchTestAids = vi.fn();
const saveTestAids = vi.fn();
vi.mock('../services/settingsApi.js', () => ({
  fetchTestAids: (...a) => fetchTestAids(...a),
  saveTestAids: (...a) => saveTestAids(...a),
}));

const {
  testAidsOn,
  testAidsState,
  refreshTestAids,
  clearTestAids,
  storeTestAids,
  withTestAids,
  testAidUrlFlag,
  TEST_AID_CAMERA_KEYS,
  TEST_AID_DYNAMICS_KEYS,
  _setTestAidsForTests,
} = await import('./testAids.js');

beforeEach(() => {
  fetchTestAids.mockReset();
  saveTestAids.mockReset();
  _setTestAidsForTests('unknown');
});

describe('the switch is OFF until the server says ON', () => {
  it('starts unknown, which every gate reads as OFF', () => {
    expect(testAidsState()).toBe('unknown');
    expect(testAidsOn()).toBe(false);
  });

  it('a clear { enabled: true } turns it ON; { enabled: false } keeps it OFF', async () => {
    fetchTestAids.mockResolvedValueOnce({ enabled: true });
    await refreshTestAids();
    expect(testAidsOn()).toBe(true);
    fetchTestAids.mockResolvedValueOnce({ enabled: false });
    await refreshTestAids();
    expect(testAidsState()).toBe('off');
  });

  it('no answer, or anything but a clear true, is OFF', async () => {
    for (const answer of [Promise.reject(new Error('timeout')), { enabled: 'true' }, {}, null]) {
      _setTestAidsForTests(true);
      fetchTestAids.mockImplementationOnce(() => answer);
      await refreshTestAids();
      expect(testAidsOn()).toBe(false);
    }
  });

  it('signing out forgets it — the next user starts unknown', () => {
    _setTestAidsForTests(true);
    clearTestAids();
    expect(testAidsState()).toBe('unknown');
  });

  it('an admin change follows what the server stored', async () => {
    saveTestAids.mockResolvedValueOnce({ enabled: true });
    await storeTestAids(true);
    expect(saveTestAids).toHaveBeenCalledWith(true);
    expect(testAidsOn()).toBe(true);
  });
});

describe('what OFF does', () => {
  it('forces every diagnostic camera key off, whatever is stored (items 4, 13–24)', () => {
    const stored = Object.fromEntries(TEST_AID_CAMERA_KEYS.map((k) => [k, true]));
    stored.zoomSmoothing = 0.3;
    _setTestAidsForTests(false);
    const off = withTestAids(stored, TEST_AID_CAMERA_KEYS);
    for (const k of TEST_AID_CAMERA_KEYS) expect(off[k]).toBe(false);
    expect(off.zoomSmoothing).toBe(0.3);
    expect(stored.showCameraDiagnostics).toBe(true); // the stored config itself is untouched
  });

  it('ON hands the config back exactly as stored', () => {
    const stored = { showBattleDiag: true, highlightHeroes: true };
    _setTestAidsForTests(true);
    expect(withTestAids(stored, TEST_AID_CAMERA_KEYS)).toBe(stored);
  });

  it('the gap re-roll marker is on the list (item 25)', () => {
    _setTestAidsForTests(false);
    expect(withTestAids({ gapRerollDevMarker: true }, TEST_AID_DYNAMICS_KEYS)).toEqual({
      gapRerollDevMarker: false,
    });
  });

  it('?constSpeed=1 is ignored while OFF and honoured while ON (item 26)', () => {
    _setTestAidsForTests(false);
    expect(testAidUrlFlag('constSpeed', '?constSpeed=1')).toBe(false);
    _setTestAidsForTests(true);
    expect(testAidUrlFlag('constSpeed', '?constSpeed=1')).toBe(true);
    expect(testAidUrlFlag('constSpeed', '?constSpeed=0')).toBe(false);
  });
});
