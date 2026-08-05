// ============================================================
// File:        cameraConfigSurvival.test.js
// Project:     RaceArena — BUILD-TRUTH-1 §3
//
// WHAT THIS PROTECTS: the owner's saved settings surviving a build switch. The standing rule is
// defaults below, stored values above, unknown keys ignored, no schema and no migration — and the
// rule works by iterating the DEFAULT keys. That is its strength and its one failure mode: a key
// RENAMED OR REMOVED from the defaults makes the stored value silently disappear. No error, no
// warning, just his number quietly replaced by ours.
//
// These are his REAL eleven settings, used here as a FIXTURE — the thing being verified. They are
// deliberately not written into any default, any config file, or any storage the app reads; a test
// that asserts his values survive must not be the reason they exist.
//
// If one of these ever fails, the finding is "we removed a key he had set", and it outranks whatever
// block is running.
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadCameraConfig } from './cameraConfig.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';
import { KEYS, storageSet } from './storage/storage.js';

/** The owner's settings as of 2026-08-04. A fixture, not a default. */
const HIS = {
  topLevel: {
    minRacersVisible: 5,
    minDrawnFrameFrac: 0.04,
    battleWeight: 0.05,
    overviewWeight: 0.5,
    overviewTargetCount: 3,
  },
  corridors: {
    LEADER_ZOOM: 1.0,
    OVERVIEW: 2.0,
    BATTLE_ZOOM: 1.2,
    COMEBACK_ZOOM: 1.25,
    LEAD_CHANGE: 1.0,
    PHOTO_FINISH: 0.35,
  },
};

describe('the owner’s settings survive this build', () => {
  let saved;

  beforeEach(() => {
    saved = localStorage.getItem(KEYS.CAMERA_CONFIG);
    const profiles = {};
    for (const [state, v] of Object.entries(HIS.corridors)) {
      profiles[state] = { visibleCorridors: v };
    }
    storageSet(KEYS.CAMERA_CONFIG, { ...HIS.topLevel, cameraStateProfiles: profiles });
  });

  afterEach(() => {
    if (saved === null) localStorage.removeItem(KEYS.CAMERA_CONFIG);
    else localStorage.setItem(KEYS.CAMERA_CONFIG, saved);
  });

  it('every key he has set still EXISTS in the defaults — the silent-drop precondition', () => {
    for (const key of Object.keys(HIS.topLevel)) {
      expect(
        DEFAULT_CAMERA_CONFIG,
        `top-level key "${key}" was removed from the defaults`
      ).toHaveProperty(key);
    }
    for (const state of Object.keys(HIS.corridors)) {
      expect(
        DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
        `state "${state}" was removed from the defaults`
      ).toHaveProperty(state);
      expect(
        DEFAULT_CAMERA_CONFIG.cameraStateProfiles[state],
        `"${state}.visibleCorridors" was removed from the defaults`
      ).toHaveProperty('visibleCorridors');
    }
  });

  it('his five top-level values come back with the SAME values, not the defaults', () => {
    const cfg = loadCameraConfig();
    for (const [key, value] of Object.entries(HIS.topLevel)) {
      expect(cfg[key], `${key} was replaced`).toBe(value);
    }
  });

  it('his six per-state zoom settings come back with the SAME values', () => {
    const cfg = loadCameraConfig();
    for (const [state, value] of Object.entries(HIS.corridors)) {
      expect(cfg.cameraStateProfiles[state].visibleCorridors, `${state} was replaced`).toBe(value);
    }
  });

  it('a setting he did NOT store still arrives from the defaults, including one this branch changed', () => {
    // He never stored trackingTC. CAMERA-ANCHOR-TRUTH-1 §4c changed OVERVIEW's from 1.5 to 0.25, so
    // he gets the new value — which is the rule working, not a loss.
    const cfg = loadCameraConfig();
    expect(cfg.cameraStateProfiles.OVERVIEW.trackingTC).toBe(
      DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW.trackingTC
    );
    expect(cfg.cameraStateProfiles.OVERVIEW.trackingTC).toBe(0.25);
  });

  it('a stored value WINS over a default this branch changed, if he ever sets one', () => {
    const profiles = {};
    for (const [state, v] of Object.entries(HIS.corridors))
      profiles[state] = { visibleCorridors: v };
    profiles.OVERVIEW.trackingTC = 1.5;
    storageSet(KEYS.CAMERA_CONFIG, { ...HIS.topLevel, cameraStateProfiles: profiles });
    expect(loadCameraConfig().cameraStateProfiles.OVERVIEW.trackingTC).toBe(1.5);
  });

  it('a retired key sitting in his storage is ignored rather than resurrected', () => {
    const profiles = {};
    for (const [state, v] of Object.entries(HIS.corridors))
      profiles[state] = { visibleCorridors: v };
    storageSet(KEYS.CAMERA_CONFIG, {
      ...HIS.topLevel,
      cameraStateProfiles: profiles,
      someRetiredKeyFrom2026: 999,
    });
    expect(loadCameraConfig()).not.toHaveProperty('someRetiredKeyFrom2026');
  });
});
