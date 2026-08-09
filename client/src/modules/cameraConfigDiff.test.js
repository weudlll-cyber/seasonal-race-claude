// ============================================================
// File:        cameraConfigDiff.test.js
// Project:     RaceArena — CONFIG-DIFF-1
//
// WHAT BREAKS IF THIS IS DELETED: his board goes back to sitting at 3000/80 after 6000/120 ships,
// and nobody notices for days.
//
// THESE ARE CONSEQUENCE TESTS, and the distinction is the whole reason they exist. A test of the
// WRITER alone — "saveCameraConfig omits keys equal to the default" — passes while the bug is live,
// because the bug is not in one function: it is in what the round trip DOES TO HIM. So every test
// below goes storage -> load -> (a default changes) -> load, and asserts what he ends up with.
//
// The default is perturbed by editing a COPY of DEFAULT_CAMERA_CONFIG and re-resolving through the
// same loader logic, rather than by mutating the real defaults — a test that writes to the shipped
// defaults object would leak into every other test file in the run.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadCameraConfig,
  saveCameraConfig,
  diffFromDefaults,
  pruneStoredCameraConfig,
  valuesEqual,
} from './cameraConfig.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';
import { KEYS, storageGet, storageSet } from './storage/storage.js';

/** A key he really tunes, and one he never touches — both real, both with known defaults. */
const TUNED = 'minRacersVisible'; // he sets this
const UNTOUCHED = 'startBoardFloorMs'; // the 3000 -> 6000 key from the incident

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

/** Resolve exactly as loadCameraConfig does, but against a perturbed default set. */
function resolveAgainst(defaults) {
  const stored = storageGet(KEYS.CAMERA_CONFIG) ?? {};
  const out = {};
  for (const key of Object.keys(defaults)) {
    out[key] = Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : defaults[key];
  }
  return out;
}

describe('CONFIG-DIFF-1 — store what he chose, not what happened to be true', () => {
  it('1. a config written the OLD way still yields his chosen values after the upgrade', () => {
    // The old writer stored the WHOLE resolved object. That is what is in his browser right now.
    const old = { ...DEFAULT_CAMERA_CONFIG, [TUNED]: 4, minDrawnFrameFrac: 0.04 };
    storageSet(KEYS.CAMERA_CONFIG, old);

    const cfg = loadCameraConfig(); // upgrades (prunes) on the way through
    expect(cfg[TUNED]).toBe(4);
    expect(cfg.minDrawnFrameFrac).toBe(0.04);
  });

  it('2. THE POINT: a key he never touched follows a CHANGED default across the upgrade', () => {
    // His browser, written the old way: every key frozen, including startBoardFloorMs at its
    // then-default. This is the incident, reconstructed.
    const oldDefault = DEFAULT_CAMERA_CONFIG[UNTOUCHED];
    storageSet(KEYS.CAMERA_CONFIG, {
      ...DEFAULT_CAMERA_CONFIG,
      [UNTOUCHED]: oldDefault,
      [TUNED]: 4,
    });

    loadCameraConfig(); // the prune drops the untouched key, keeps the tuned one

    // Now ship a new default for the key he never touched.
    const shipped = { ...DEFAULT_CAMERA_CONFIG, [UNTOUCHED]: oldDefault * 2 };
    const after = resolveAgainst(shipped);

    expect(after[UNTOUCHED]).toBe(oldDefault * 2); // it REACHES him
    expect(after[TUNED]).toBe(4); // and his deviation is untouched
  });

  it('2b. …and BEFORE the fix that same config froze him — the failure this replaces', () => {
    // The same stored object, resolved WITHOUT pruning. This is what he actually experienced.
    const oldDefault = DEFAULT_CAMERA_CONFIG[UNTOUCHED];
    storageSet(KEYS.CAMERA_CONFIG, { ...DEFAULT_CAMERA_CONFIG, [UNTOUCHED]: oldDefault });
    const shipped = { ...DEFAULT_CAMERA_CONFIG, [UNTOUCHED]: oldDefault * 2 };
    expect(resolveAgainst(shipped)[UNTOUCHED]).toBe(oldDefault); // frozen — the bug
  });

  it('3. a NEW key still arrives at its default', () => {
    // The half that already worked and must keep working: a stored config can only override a key
    // that already exists in the defaults.
    storageSet(KEYS.CAMERA_CONFIG, { [TUNED]: 4 });
    const shipped = { ...DEFAULT_CAMERA_CONFIG, brandNewKnob: 42 };
    expect(resolveAgainst(shipped).brandNewKnob).toBe(42);
    expect(resolveAgainst(shipped)[TUNED]).toBe(4);
  });

  it('4. a value equal to the default is NOT written', () => {
    saveCameraConfig({ ...DEFAULT_CAMERA_CONFIG });
    expect(storageGet(KEYS.CAMERA_CONFIG)).toEqual({});

    saveCameraConfig({ ...DEFAULT_CAMERA_CONFIG, [TUNED]: 4 });
    expect(storageGet(KEYS.CAMERA_CONFIG)).toEqual({ [TUNED]: 4 });
  });

  it('5. the prune keeps a genuine deviation and drops a coincidental match', () => {
    const coincidental = DEFAULT_CAMERA_CONFIG[UNTOUCHED]; // equals the default
    storageSet(KEYS.CAMERA_CONFIG, { [TUNED]: 4, [UNTOUCHED]: coincidental });

    const { changed, dropped } = pruneStoredCameraConfig();

    expect(changed).toBe(true);
    expect(dropped).toEqual([UNTOUCHED]);
    expect(storageGet(KEYS.CAMERA_CONFIG)).toEqual({ [TUNED]: 4 });
  });

  it('the prune is idempotent and writes nothing on an already-clean config', () => {
    // No marker key guards this, so it MUST be safe to run on every load — which it is asked to do.
    storageSet(KEYS.CAMERA_CONFIG, { [TUNED]: 4 });
    expect(pruneStoredCameraConfig()).toEqual({ changed: false, dropped: [] });
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    pruneStoredCameraConfig();
    expect(spy).not.toHaveBeenCalled();
  });

  it('state profiles are diffed per FIELD, not stored whole', () => {
    const def = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
    const state = Object.keys(def)[0];
    const field = Object.keys(def[state])[0];
    saveCameraConfig({
      ...DEFAULT_CAMERA_CONFIG,
      cameraStateProfiles: {
        ...def,
        [state]: { ...def[state], [field]: def[state][field] + 0.25 },
      },
    });
    const written = storageGet(KEYS.CAMERA_CONFIG);
    // Only the one changed field of the one changed state survives.
    expect(Object.keys(written)).toEqual(['cameraStateProfiles']);
    expect(written.cameraStateProfiles).toEqual({
      [state]: { [field]: def[state][field] + 0.25 },
    });
  });

  it('THE EDGE, asserted so it is a known property and not a surprise', () => {
    // A value he DELIBERATELY set to today's default is indistinguishable from one he never
    // touched, so it follows a future change of that default. Documented in the module header;
    // pinned here so nobody "fixes" it by accident and reintroduces the freeze.
    saveCameraConfig({ ...DEFAULT_CAMERA_CONFIG, [TUNED]: DEFAULT_CAMERA_CONFIG[TUNED] });
    expect(storageGet(KEYS.CAMERA_CONFIG)).toEqual({});
    const shipped = { ...DEFAULT_CAMERA_CONFIG, [TUNED]: DEFAULT_CAMERA_CONFIG[TUNED] + 2 };
    expect(resolveAgainst(shipped)[TUNED]).toBe(DEFAULT_CAMERA_CONFIG[TUNED] + 2);
  });

  it('valuesEqual compares arrays and objects structurally, not by reference', () => {
    // Without this, every array-valued setting would look like a deviation and be stored — the same
    // freeze, just narrower.
    expect(valuesEqual([1, 2], [1, 2])).toBe(true);
    expect(valuesEqual([1, 2], [2, 1])).toBe(false);
    expect(valuesEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(valuesEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('diffFromDefaults drops keys the defaults no longer have', () => {
    expect(diffFromDefaults({ retiredKnob: 9, [TUNED]: 4 })).toEqual({ [TUNED]: 4 });
  });
});
